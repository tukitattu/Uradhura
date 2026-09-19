// ============================================================
// LIVE GATEWAY — Real-time live room events
// Namespace: /live
// Handles viewer tracking, gifts, mic/camera toggles, co-hosts
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
import { LiveService } from '../live/live.service';

// ----------------------------------------------------------
// DTOs for incoming events
// ----------------------------------------------------------

interface JoinRoomPayload {
  roomId: string;
}

interface LeaveRoomPayload {
  roomId: string;
}

interface SendGiftPayload {
  roomId: string;
  giftId: string;
  recipientId: string;
  quantity?: number;
}

interface ToggleMicPayload {
  roomId: string;
  muted: boolean;
}

interface ToggleCameraPayload {
  roomId: string;
  off: boolean;
}

// ----------------------------------------------------------
// Internal room metadata
// ----------------------------------------------------------

interface LiveRoomState {
  roomId: string;
  hostId: string;
  coHostIds: Set<string>;
  memberSockets: Set<string>;
  viewerCount: number;
}

// ----------------------------------------------------------
// Gateway
// ----------------------------------------------------------

@WebSocketGateway({
  namespace: '/live',
  cors: { origin: '*' },
  transports: ['websocket'],
  pingInterval: 25000,
  pingTimeout: 30000,
  maxHttpBufferSize: 1e6,
})
export class LiveGateway extends BaseGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly liveLogger = new Logger(LiveGateway.name);

  // Track which socket is in which live room
  private readonly socketRooms = new Map<string, string>();
  // Room state cache
  private readonly roomStates = new Map<string, LiveRoomState>();

  constructor(
    jwtService: JwtService,
    private readonly liveService: LiveService,
  ) {
    super(jwtService, LiveGateway.name);
  }

  // ----------------------------------------------------------
  // Connection lifecycle
  // ----------------------------------------------------------

  async handleConnection(client: Socket): Promise<void> {
    await super.handleConnection(client);
  }

  handleDisconnect(client: Socket): void {
    // Auto-leave any live room
    const roomId = this.socketRooms.get(client.id);
    if (roomId) {
      this.handleLeaveRoom(client, { roomId });
    }
    super.handleDisconnect(client);
  }

  // ----------------------------------------------------------
  // Room state helpers
  // ----------------------------------------------------------

  private getRoomState(roomId: string): LiveRoomState {
    if (!this.roomStates.has(roomId)) {
      this.roomStates.set(roomId, {
        roomId,
        hostId: '',
        coHostIds: new Set(),
        memberSockets: new Set(),
        viewerCount: 0,
      });
    }
    return this.roomStates.get(roomId)!;
  }

  private syncViewerCount(roomId: string): void {
    const state = this.getRoomState(roomId);
    state.viewerCount = state.memberSockets.size;
    this.broadcastToRoom(roomId, 'viewer_count', {
      roomId,
      viewerCount: state.viewerCount,
    });
  }

  // ----------------------------------------------------------
  // Event handlers
  // ----------------------------------------------------------

  @SubscribeMessage('join_room')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinRoomPayload,
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

    // Leave previous room if already in one
    const previousRoomId = this.socketRooms.get(client.id);
    if (previousRoomId) {
      this.handleLeaveRoom(client, { roomId: previousRoomId });
    }

    // Persist join via service
    try {
      await this.liveService.joinRoom(user.userId, payload.roomId);
    } catch (err) {
      this.liveLogger.error(`Failed to persist room join: ${err.message}`);
      client.emit('error', { message: err.message || 'Failed to join room' });
      return;
    }

    // Track in-memory
    this.joinRoom(client, payload.roomId);
    this.socketRooms.set(client.id, payload.roomId);

    const state = this.getRoomState(payload.roomId);
    state.memberSockets.add(client.id);
    if (!state.hostId) {
      state.hostId = user.userId;
    }

    // Sync viewer count
    this.syncViewerCount(payload.roomId);

    // Notify room about the new member
    this.broadcastToRoom(payload.roomId, 'member_joined', {
      roomId: payload.roomId,
      user: {
        id: user.userId,
        username: user.username,
      },
      viewerCount: state.viewerCount,
    });

    client.emit('room_update', {
      roomId: payload.roomId,
      hostId: state.hostId,
      coHostIds: Array.from(state.coHostIds),
      viewerCount: state.viewerCount,
    });

    this.liveLogger.log(`Player ${user.username} joined live room ${payload.roomId}`);
  }

  @SubscribeMessage('leave_room')
  handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: LeaveRoomPayload,
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

    // Persist leave via service
    this.liveService.leaveRoom(user.userId, payload.roomId).catch((err) => {
      this.liveLogger.error(`Failed to persist room leave: ${err.message}`);
    });

    // Track in-memory
    this.leaveRoom(client, payload.roomId);
    this.socketRooms.delete(client.id);

    const state = this.getRoomState(payload.roomId);
    state.memberSockets.delete(client.id);

    // If host left, assign new host or clean up
    if (state.hostId === user.userId && state.memberSockets.size > 0) {
      // Simple host transfer: pick first remaining member
      const newHostSocketId = Array.from(state.memberSockets)[0];
      const newHostInfo = this.connectedUsers.get(newHostSocketId);
      if (newHostInfo) {
        state.hostId = newHostInfo.userId;
        this.broadcastToRoom(payload.roomId, 'co_host_update', {
          roomId: payload.roomId,
          hostId: state.hostId,
          message: `${newHostInfo.username} is now the host`,
        });
      }
    }

    // Sync viewer count
    this.syncViewerCount(payload.roomId);

    // Notify room
    this.broadcastToRoom(payload.roomId, 'member_left', {
      roomId: payload.roomId,
      user: {
        id: user.userId,
        username: user.username,
      },
      viewerCount: state.viewerCount,
    });

    // Clean up empty room state
    if (state.memberSockets.size === 0) {
      this.roomStates.delete(payload.roomId);
    }

    this.liveLogger.log(`Player ${user.username} left live room ${payload.roomId}`);
  }

  @SubscribeMessage('send_gift')
  async handleSendGift(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SendGiftPayload,
  ): Promise<void> {
    const user = this.getUserInfo(client);
    if (!user) {
      client.emit('error', { message: 'Not authenticated' });
      return;
    }

    if (!payload.roomId || !payload.giftId || !payload.recipientId) {
      client.emit('error', { message: 'roomId, giftId, and recipientId are required' });
      return;
    }

    if (!this.isUserInRoom(client, payload.roomId)) {
      client.emit('error', { message: 'You are not in this room' });
      return;
    }

    const quantity = payload.quantity ?? 1;
    if (quantity < 1 || quantity > 100) {
      client.emit('error', { message: 'Quantity must be between 1 and 100' });
      return;
    }

    // Broadcast gift to the room
    this.broadcastToRoom(payload.roomId, 'gift_sent', {
      roomId: payload.roomId,
      giftId: payload.giftId,
      quantity,
      sender: {
        id: user.userId,
        username: user.username,
      },
      recipientId: payload.recipientId,
      timestamp: new Date().toISOString(),
    });

    this.liveLogger.log(
      `Gift sent: ${user.username} → room ${payload.roomId}, gift=${payload.giftId}, qty=${quantity}`,
    );
  }

  @SubscribeMessage('toggle_mic')
  handleToggleMic(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: ToggleMicPayload,
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

    if (!this.isUserInRoom(client, payload.roomId)) {
      client.emit('error', { message: 'You are not in this room' });
      return;
    }

    // Broadcast mic toggle to the room
    this.broadcastToRoom(payload.roomId, 'room_update', {
      roomId: payload.roomId,
      event: 'mic_toggled',
      userId: user.userId,
      username: user.username,
      muted: payload.muted,
    });

    this.liveLogger.debug(`${user.username} mic toggled: muted=${payload.muted}`);
  }

  @SubscribeMessage('toggle_camera')
  handleToggleCamera(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: ToggleCameraPayload,
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

    if (!this.isUserInRoom(client, payload.roomId)) {
      client.emit('error', { message: 'You are not in this room' });
      return;
    }

    // Broadcast camera toggle to the room
    this.broadcastToRoom(payload.roomId, 'room_update', {
      roomId: payload.roomId,
      event: 'camera_toggled',
      userId: user.userId,
      username: user.username,
      off: payload.off,
    });

    this.liveLogger.debug(`${user.username} camera toggled: off=${payload.off}`);
  }

  // ----------------------------------------------------------
  // Host / co-host management (called by REST endpoints)
  // ----------------------------------------------------------

  setCoHost(roomId: string, userId: string, isCoHost: boolean): void {
    const state = this.getRoomState(roomId);
    if (isCoHost) {
      state.coHostIds.add(userId);
    } else {
      state.coHostIds.delete(userId);
    }

    this.broadcastToRoom(roomId, 'co_host_update', {
      roomId,
      userId,
      isCoHost,
      coHostIds: Array.from(state.coHostIds),
    });
  }

  kickUser(roomId: string, targetUserId: string): void {
    const state = this.getRoomState(roomId);
    for (const socketId of state.memberSockets) {
      const info = this.connectedUsers.get(socketId);
      if (info?.userId === targetUserId) {
        this.sendToUser(socketId, 'room_update', {
          roomId,
          event: 'kicked',
          message: 'You have been removed from the room',
        });
        const targetClient = this.server?.sockets.sockets.get(socketId);
        if (targetClient) {
          this.leaveRoom(targetClient, roomId);
          this.socketRooms.delete(socketId);
          state.memberSockets.delete(socketId);
        }
        break;
      }
    }
    this.syncViewerCount(roomId);
  }

  endRoom(roomId: string): void {
    this.broadcastToRoom(roomId, 'room_update', {
      roomId,
      event: 'room_ended',
      message: 'The live room has ended',
    });

    // Disconnect all clients from the room
    const state = this.getRoomState(roomId);
    for (const socketId of state.memberSockets) {
      const targetClient = this.server?.sockets.sockets.get(socketId);
      if (targetClient) {
        this.leaveRoom(targetClient, roomId);
        this.socketRooms.delete(socketId);
      }
    }

    this.roomStates.delete(roomId);
  }
}
