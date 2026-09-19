// ============================================================
// CHAT GATEWAY — Real-time chat events
// Namespace: /chat
// Rate limiting: max 30 messages per minute per user
// ============================================================

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { BaseGateway } from './base.gateway';
import { ChatService } from '../chat/chat.service';

// ----------------------------------------------------------
// DTOs for incoming events
// ----------------------------------------------------------

interface JoinChatPayload {
  roomId: string;
}

interface LeaveChatPayload {
  roomId: string;
}

interface SendMessagePayload {
  roomId: string;
  content: string;
  type?: string;
}

// ----------------------------------------------------------
// Rate limiter
// ----------------------------------------------------------

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

class RateLimiter {
  private readonly buckets = new Map<string, RateLimitBucket>();

  constructor(
    private readonly maxMessages: number,
    private readonly windowMs: number,
  ) {}

  /**
   * Returns true if the user is allowed to send a message.
   * Returns false if rate limit exceeded.
   */
  allow(userId: string): boolean {
    const now = Date.now();
    const bucket = this.buckets.get(userId);

    if (!bucket || now >= bucket.resetAt) {
      this.buckets.set(userId, {
        count: 1,
        resetAt: now + this.windowMs,
      });
      return true;
    }

    if (bucket.count >= this.maxMessages) {
      return false;
    }

    bucket.count++;
    return true;
  }

  /**
   * Returns remaining messages in the current window.
   */
  remaining(userId: string): number {
    const now = Date.now();
    const bucket = this.buckets.get(userId);

    if (!bucket || now >= bucket.resetAt) {
      return this.maxMessages;
    }

    return Math.max(0, this.maxMessages - bucket.count);
  }

  /**
   * Returns milliseconds until the user's window resets.
   */
  resetIn(userId: string): number {
    const now = Date.now();
    const bucket = this.buckets.get(userId);

    if (!bucket || now >= bucket.resetAt) {
      return 0;
    }

    return bucket.resetAt - now;
  }

  /**
   * Cleanup expired buckets (call periodically).
   */
  cleanup(): void {
    const now = Date.now();
    for (const [userId, bucket] of this.buckets.entries()) {
      if (now >= bucket.resetAt) {
        this.buckets.delete(userId);
      }
    }
  }
}

// ----------------------------------------------------------
// Gateway
// ----------------------------------------------------------

@WebSocketGateway({
  namespace: '/chat',
  cors: { origin: '*' },
  transports: ['websocket'],
  pingInterval: 25000,
  pingTimeout: 30000,
  maxHttpBufferSize: 1e6,
})
export class ChatGateway extends BaseGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly chatLogger = new Logger(ChatGateway.name);

  // Rate limiter: 30 messages per 60 seconds
  private readonly rateLimiter = new RateLimiter(30, 60_000);

  // Track which socket is in which chat rooms
  private readonly socketChatRooms = new Map<string, Set<string>>();
  // Track typing state
  private readonly typingUsers = new Map<string, { userId: string; username: string; timeout: ReturnType<typeof setTimeout> }>();

  // Cleanup interval handle
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    jwtService: JwtService,
    private readonly chatService: ChatService,
  ) {
    super(jwtService, ChatGateway.name);
  }

  // ----------------------------------------------------------
  // Connection lifecycle
  // ----------------------------------------------------------

  async handleConnection(client: Socket): Promise<void> {
    await super.handleConnection(client);

    // Start periodic cleanup of rate limiter buckets
    if (!this.cleanupInterval) {
      this.cleanupInterval = setInterval(() => {
        this.rateLimiter.cleanup();
      }, 60_000);
    }
  }

  handleDisconnect(client: Socket): void {
    // Auto-leave all chat rooms
    const rooms = this.socketChatRooms.get(client.id);
    if (rooms) {
      for (const roomId of rooms) {
        this.handleLeaveChat(client, { roomId });
      }
    }

    // Clear typing state
    const user = this.getUserInfo(client);
    if (user) {
      this.clearTyping(client, user.userId);
    }

    this.socketChatRooms.delete(client.id);
    super.handleDisconnect(client);

    // Stop cleanup interval if no one connected
    if (this.connectedUsers.size === 0 && this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  // ----------------------------------------------------------
  // Typing state helpers
  // ----------------------------------------------------------

  private clearTyping(client: Socket, userId: string): void {
    // Find all rooms this user was typing in and clear
    for (const [key, state] of this.typingUsers.entries()) {
      if (state.userId === userId) {
        clearTimeout(state.timeout);
        const [, roomId] = key.split(':');
        if (roomId) {
          this.broadcastToRoom(roomId, 'typing', {
            userId,
            username: state.username,
            typing: false,
          });
        }
        this.typingUsers.delete(key);
      }
    }
  }

  // ----------------------------------------------------------
  // Event handlers
  // ----------------------------------------------------------

  @SubscribeMessage('join_chat')
  async handleJoinChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinChatPayload,
  ): Promise<void> {
    const user = this.getUserInfo(client);
    if (!user) {
      client.emit('error', { message: 'Not authenticated' });
      return;
    }

    if (!payload.roomId) {
      client.emit('error', { message: 'roomId is required' });
      return;
    }

    // Leave previous chat rooms
    const previousRooms = this.socketChatRooms.get(client.id);
    if (previousRooms && previousRooms.size > 0) {
      for (const roomId of previousRooms) {
        this.leaveRoom(client, `chat:${roomId}`);
      }
      previousRooms.clear();
    } else {
      this.socketChatRooms.set(client.id, new Set());
    }

    const room = `chat:${payload.roomId}`;
    this.joinRoom(client, room);
    this.socketChatRooms.get(client.id)!.add(payload.roomId);

    // Notify room about the new user
    this.broadcastToRoom(room, 'user_joined', {
      roomId: payload.roomId,
      user: {
        id: user.userId,
        username: user.username,
      },
      memberCount: this.getRoomMemberCount(room),
    });

    this.chatLogger.log(`Player ${user.username} joined chat room ${payload.roomId}`);
  }

  @SubscribeMessage('leave_chat')
  handleLeaveChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: LeaveChatPayload,
  ): void {
    const user = this.getUserInfo(client);
    if (!user) {
      client.emit('error', { message: 'Not authenticated' });
      return;
    }

    if (!payload.roomId) {
      client.emit('error', { message: 'roomId is required' });
      return;
    }

    const room = `chat:${payload.roomId}`;
    this.leaveRoom(client, room);

    const rooms = this.socketChatRooms.get(client.id);
    if (rooms) {
      rooms.delete(payload.roomId);
    }

    // Clear typing state for this room
    const typingKey = `${user.userId}:${payload.roomId}`;
    const typingState = this.typingUsers.get(typingKey);
    if (typingState) {
      clearTimeout(typingState.timeout);
      this.typingUsers.delete(typingKey);
      this.broadcastToRoom(room, 'typing', {
        userId: user.userId,
        username: user.username,
        typing: false,
      });
    }

    // Notify room
    this.broadcastToRoom(room, 'user_left', {
      roomId: payload.roomId,
      user: {
        id: user.userId,
        username: user.username,
      },
      memberCount: this.getRoomMemberCount(room),
    });

    this.chatLogger.log(`Player ${user.username} left chat room ${payload.roomId}`);
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SendMessagePayload,
  ): Promise<void> {
    const user = this.getUserInfo(client);
    if (!user) {
      client.emit('error', { message: 'Not authenticated' });
      return;
    }

    if (!payload.roomId || !payload.content) {
      client.emit('error', { message: 'roomId and content are required' });
      return;
    }

    // Check rate limit
    if (!this.rateLimiter.allow(user.userId)) {
      const resetMs = this.rateLimiter.resetIn(user.userId);
      client.emit('error', {
        message: 'Rate limit exceeded. Please slow down.',
        code: 'RATE_LIMITED',
        retryAfterMs: resetMs,
      });
      return;
    }

    // Validate message content
    const trimmedContent = payload.content.trim();
    if (trimmedContent.length === 0) {
      client.emit('error', { message: 'Message cannot be empty' });
      return;
    }

    if (trimmedContent.length > 2000) {
      client.emit('error', { message: 'Message too long (max 2000 characters)' });
      return;
    }

    // Check if user is in the room
    if (!this.isUserInRoom(client, `chat:${payload.roomId}`)) {
      client.emit('error', { message: 'You are not in this chat room' });
      return;
    }

    // Persist message via service
    let savedMessage: any;
    try {
      savedMessage = await this.chatService.sendMessage(user.userId, {
        roomId: payload.roomId,
        content: trimmedContent,
        type: payload.type || 'chat',
      });
    } catch (err) {
      this.chatLogger.error(`Failed to persist message: ${err.message}`);
      client.emit('error', { message: 'Failed to send message' });
      return;
    }

    // Broadcast message to the room
    const room = `chat:${payload.roomId}`;
    this.broadcastToRoom(room, 'new_message', {
      id: savedMessage.id,
      roomId: payload.roomId,
      sender: {
        id: user.userId,
        username: user.username,
      },
      content: trimmedContent,
      type: savedMessage.type,
      createdAt: savedMessage.createdAt,
      remainingRateLimit: this.rateLimiter.remaining(user.userId),
    });

    this.chatLogger.debug(
      `Message sent: ${user.username} in room ${payload.roomId}: ${trimmedContent.slice(0, 50)}...`,
    );
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { roomId: string; typing: boolean },
  ): void {
    const user = this.getUserInfo(client);
    if (!user || !payload.roomId) return;

    if (!this.isUserInRoom(client, `chat:${payload.roomId}`)) return;

    const room = `chat:${payload.roomId}`;
    const typingKey = `${user.userId}:${payload.roomId}`;

    // Clear existing timeout
    const existing = this.typingUsers.get(typingKey);
    if (existing) {
      clearTimeout(existing.timeout);
    }

    if (payload.typing) {
      // Set auto-expire after 3 seconds
      const timeout = setTimeout(() => {
        this.typingUsers.delete(typingKey);
        this.broadcastToRoom(room, 'typing', {
          userId: user.userId,
          username: user.username,
          typing: false,
        });
      }, 3_000);

      this.typingUsers.set(typingKey, {
        userId: user.userId,
        username: user.username,
        timeout,
      });
    } else {
      this.typingUsers.delete(typingKey);
    }

    // Broadcast typing indicator (excluding sender)
    this.broadcastToRoom(room, 'typing', {
      userId: user.userId,
      username: user.username,
      typing: payload.typing,
    });
  }
}
