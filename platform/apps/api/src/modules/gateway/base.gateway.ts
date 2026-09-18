// ============================================================
// BASE GATEWAY — Shared WebSocket logic
// Provides JWT verification, room helpers, and lifecycle hooks.
// ============================================================

import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { JwtPayload } from '../auth/interfaces';

export abstract class BaseGateway {
  protected readonly logger: Logger;
  protected server: Server;

  // Track socket → user mappings
  protected readonly connectedUsers = new Map<string, { userId: string; username: string }>();
  // Track room → Set of socket IDs
  protected readonly rooms = new Map<string, Set<string>>();

  protected jwtService: JwtService;

  constructor(jwtService: JwtService, loggerContext: string) {
    this.jwtService = jwtService;
    this.logger = new Logger(loggerContext);
  }

  // ----------------------------------------------------------
  // JWT Verification
  // ----------------------------------------------------------

  async verifyToken(token: string): Promise<JwtPayload | null> {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
      return payload;
    } catch (err) {
      this.logger.warn(`JWT verification failed: ${err.message}`);
      return null;
    }
  }

  // ----------------------------------------------------------
  // Connection lifecycle (override in subclass if needed)
  // ----------------------------------------------------------

  async handleConnection(client: Socket): Promise<void> {
    const token =
      (client.handshake.query.token as string) ||
      (client.handshake.auth?.token as string);

    if (!token) {
      this.logger.warn(`Client ${client.id} connected without token — disconnecting`);
      client.disconnect(true);
      return;
    }

    const payload = await this.verifyToken(token);
    if (!payload) {
      this.logger.warn(`Client ${client.id} sent invalid token — disconnecting`);
      client.disconnect(true);
      return;
    }

    this.connectedUsers.set(client.id, {
      userId: payload.sub,
      username: payload.username,
    });

    this.logger.log(`Client ${client.id} authenticated as ${payload.username} (${payload.sub})`);
  }

  handleDisconnect(client: Socket): void {
    const user = this.connectedUsers.get(client.id);
    if (user) {
      this.logger.log(`Client ${client.id} (${user.username}) disconnected`);
    }
    this.connectedUsers.delete(client.id);

    // Remove from all rooms
    for (const [room, members] of this.rooms.entries()) {
      if (members.has(client.id)) {
        members.delete(client.id);
        if (members.size === 0) {
          this.rooms.delete(room);
        }
      }
    }
  }

  // ----------------------------------------------------------
  // Room management
  // ----------------------------------------------------------

  joinRoom(client: Socket, room: string): void {
    client.join(room);
    if (!this.rooms.has(room)) {
      this.rooms.set(room, new Set());
    }
    this.rooms.get(room)!.add(client.id);
    this.logger.debug(`Client ${client.id} joined room ${room}`);
  }

  leaveRoom(client: Socket, room: string): void {
    client.leave(room);
    const members = this.rooms.get(room);
    if (members) {
      members.delete(client.id);
      if (members.size === 0) {
        this.rooms.delete(room);
      }
    }
    this.logger.debug(`Client ${client.id} left room ${room}`);
  }

  // ----------------------------------------------------------
  // Broadcasting helpers
  // ----------------------------------------------------------

  broadcastToRoom(room: string, event: string, data: unknown): void {
    this.server?.to(room).emit(event, data);
  }

  sendToUser(socketId: string, event: string, data: unknown): void {
    this.server?.to(socketId).emit(event, data);
  }

  // ----------------------------------------------------------
  // Utility
  // ----------------------------------------------------------

  getUserInfo(client: Socket): { userId: string; username: string } | undefined {
    return this.connectedUsers.get(client.id);
  }

  getRoomMembers(room: string): string[] {
    return Array.from(this.rooms.get(room) ?? []);
  }

  getRoomMemberCount(room: string): number {
    return this.rooms.get(room)?.size ?? 0;
  }

  isUserInRoom(client: Socket, room: string): boolean {
    return this.rooms.get(room)?.has(client.id) ?? false;
  }
}
