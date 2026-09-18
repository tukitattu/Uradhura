// ============================================================
// TEEN PATTI GATEWAY (realtime push + join rooms)
// ============================================================

import { Logger, OnModuleInit } from '@nestjs/common';
import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { OnEvent } from '@nestjs/event-emitter';
import { SubscribeMessage, WebSocketGateway, WebSocketServer, ConnectedSocket, MessageBody } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { BaseGateway } from '../gateway/base.gateway';
import { TeenPattiService, TEEN_PATTI_EVENTS } from './teen-patti.service';

@WebSocketGateway({
  namespace: '/teen-patti',
  cors: { origin: '*' },
})
export class TeenPattiGateway extends BaseGateway implements OnModuleInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly tpLogger = new Logger(TeenPattiGateway.name);
  private readonly playerTables = new Map<string, string>();
  private readonly lastActionAt = new Map<string, number>();

  private static readonly ACTION_MIN_INTERVAL_MS = 350;

  constructor(
    jwtService: JwtService,
    private readonly teenPattiService: TeenPattiService,
  ) {
    super(jwtService, TeenPattiGateway.name);
  }

  onModuleInit(): void {
    // Realtime push is event-driven; the service emits on the bus.
  }

  async handleConnection(client: Socket): Promise<void> {
    await super.handleConnection(client);
  }

  handleDisconnect(client: Socket): void {
    const tableId = this.playerTables.get(client.id);
    if (tableId) {
      this.leaveRoom(client, this.roomOf(tableId));
      this.playerTables.delete(client.id);
    }
    this.lastActionAt.delete(client.id);
    super.handleDisconnect(client);
  }

  private roomOf(tableId: string): string {
    return `tp:${tableId}`;
  }

  @SubscribeMessage('join_table')
  async handleJoin(@ConnectedSocket() client: Socket, @MessageBody() payload: { tableId?: string }): Promise<void> {
    const user = this.getUserInfo(client);
    if (!user) {
      client.emit('error', { message: 'Not authenticated', code: 'UNAUTHENTICATED' });
      return;
    }
    if (!payload?.tableId) {
      client.emit('error', { message: 'tableId is required', code: 'BAD_PAYLOAD' });
      return;
    }

    const previous = this.playerTables.get(client.id);
    if (previous) {
      this.leaveRoom(client, this.roomOf(previous));
      this.playerTables.delete(client.id);
    }

    this.joinRoom(client, this.roomOf(payload.tableId));
    this.playerTables.set(client.id, payload.tableId);

    try {
      const state = await this.teenPattiService.getTable(payload.tableId, user.userId);
      const privates = await this.teenPattiService.getPrivates(payload.tableId, user.userId);
      client.emit('tp_state', { tableId: payload.tableId, state, privates, serverTime: Date.now() });
    } catch (err) {
      this.tpLogger.error(`Failed to load table state: ${err.message}`);
      client.emit('error', { message: 'Failed to load table state', code: 'STATE_ERROR' });
    }
  }

  @SubscribeMessage('leave_table')
  handleLeave(@ConnectedSocket() client: Socket, @MessageBody() payload: { tableId?: string }): void {
    const user = this.getUserInfo(client);
    if (user && payload?.tableId) {
      this.leaveRoom(client, this.roomOf(payload.tableId));
      this.playerTables.delete(client.id);
    }
  }

  @SubscribeMessage('tp_action')
  async handleAction(@ConnectedSocket() client: Socket, @MessageBody() payload: { tableId?: string; kind?: string }): Promise<void> {
    const user = this.getUserInfo(client);
    if (!user) {
      client.emit('error', { message: 'Not authenticated', code: 'UNAUTHENTICATED' });
      return;
    }
    if (!payload?.tableId || !payload.kind) {
      client.emit('error', { message: 'tableId and kind are required', code: 'BAD_PAYLOAD' });
      return;
    }

    // Throttle bursts: one action per socket per interval.
    const now = Date.now();
    const last = this.lastActionAt.get(client.id) ?? 0;
    if (now - last < TeenPattiGateway.ACTION_MIN_INTERVAL_MS) {
      client.emit('tp_error', { tableId: payload.tableId, message: 'Action too fast, slow down', code: 'RATE_LIMITED' });
      return;
    }
    this.lastActionAt.set(client.id, now);

    const result = await this.teenPattiService.performAction(payload.tableId, user.userId, payload.kind as never);
    if (!result.ok) {
      client.emit('tp_error', { tableId: payload.tableId, message: result.reason ?? 'Illegal action' });
      return;
    }
    const privates = await this.teenPattiService.getPrivates(payload.tableId, user.userId);
    client.emit('tp_private', { tableId: payload.tableId, privates });
  }

  @OnEvent(TEEN_PATTI_EVENTS.state)
  handleState(payload: { tableId: string; state: unknown }): void {
    this.broadcastToRoom(this.roomOf(payload.tableId), 'tp_state', {
      tableId: payload.tableId,
      state: payload.state,
      serverTime: Date.now(),
    });
  }

  @OnEvent(TEEN_PATTI_EVENTS.action)
  handleActionBroadcast(payload: { tableId: string; events: unknown[]; handNo: number }): void {
    this.broadcastToRoom(this.roomOf(payload.tableId), 'tp_event', {
      tableId: payload.tableId,
      events: payload.events,
      handNo: payload.handNo,
      serverTime: Date.now(),
    });
  }

  @OnEvent(TEEN_PATTI_EVENTS.result)
  handleResult(payload: { tableId: string; handNo: number; settle: unknown; seedCommitHash: string | null; seedClientSeed: string; seedServerSeed: string }): void {
    this.broadcastToRoom(this.roomOf(payload.tableId), 'tp_result', {
      tableId: payload.tableId,
      handNo: payload.handNo,
      display: payload.settle,
      proof: {
        commitHash: payload.seedCommitHash,
        clientSeed: payload.seedClientSeed,
        serverSeed: payload.seedServerSeed,
      },
      serverTime: Date.now(),
    });
  }
}