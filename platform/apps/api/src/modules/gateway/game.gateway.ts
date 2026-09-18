// ============================================================
// GAME GATEWAY — Real-time game events
// Namespace: /game
// Server-authoritative: all bets validated via GameEngineService,
// all round state broadcast from GameSchedulerService.
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
import { Logger, OnModuleInit } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { BaseGateway } from './base.gateway';
import { GameEngineService } from '../games/game-engine.service';
import { GAME_EVENTS } from '../games/game-scheduler.service';
import { SeedService } from '../games/seed.service';
import { Decimal } from '@prisma/client/runtime/library';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { OnEvent } from '@nestjs/event-emitter';

// ----------------------------------------------------------
// Payload contracts
// ----------------------------------------------------------

interface JoinGamePayload {
  gameId: string;
}
interface LeaveGamePayload {
  gameId: string;
}
interface PlaceBetPayload {
  gameId: string;
  optionId: string;
  amount: number;
  idempotencyKey?: string;
}

// ----------------------------------------------------------
// Gateway
// ----------------------------------------------------------

@WebSocketGateway({
  namespace: '/game',
  cors: { origin: '*' },
})
export class GameGateway extends BaseGateway implements OnModuleInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly gameLogger = new Logger(GameGateway.name);
  private readonly playerGames = new Map<string, string>();

  constructor(
    jwtService: JwtService,
    private readonly gameEngine: GameEngineService,
    private readonly prisma: PrismaService,
    private readonly seedService: SeedService,
  ) {
    super(jwtService, GameGateway.name);
  }

  onModuleInit(): void {
    // Gateway is a listener; the scheduler emits on the bus. This ordering
    // matters only for broadcast and is intentionally event-driven.
  }

  async handleConnection(client: Socket): Promise<void> {
    await super.handleConnection(client);
  }

  handleDisconnect(client: Socket): void {
    const gameId = this.playerGames.get(client.id);
    if (gameId) {
      this.handleLeaveGame(client, { gameId });
    }
    super.handleDisconnect(client);
  }

  // ----------------------------------------------------------
  // Client actions
  // ----------------------------------------------------------

  @SubscribeMessage('join_game')
  async handleJoinGame(@ConnectedSocket() client: Socket, @MessageBody() payload: JoinGamePayload): Promise<void> {
    const user = this.getUserInfo(client);
    if (!user) {
      client.emit('error', { message: 'Not authenticated', code: 'UNAUTHENTICATED' });
      return;
    }
    if (!payload?.gameId) {
      client.emit('error', { message: 'gameId is required', code: 'BAD_PAYLOAD' });
      return;
    }

    const previousGameId = this.playerGames.get(client.id);
    if (previousGameId) {
      this.leaveRoom(client, `game:${previousGameId}`);
      this.playerGames.delete(client.id);
    }

    const room = `game:${payload.gameId}`;
    this.joinRoom(client, room);
    this.playerGames.set(client.id, payload.gameId);

    try {
      const state = await this.gameEngine.getGameState(payload.gameId);
      const totals = await this.getBetTotals(payload.gameId);
      client.emit('round_update', {
        gameId: payload.gameId,
        round: state.currentRound,
        options: state.options,
        config: state.config,
        betConfig: state.betConfig,
        seed: state.seedState,
        betTotals: totals,
        playerCount: this.getRoomMemberCount(room),
        serverTime: Date.now(),
      });

      this.broadcastToRoom(room, 'round_update', {
        gameId: payload.gameId,
        event: 'player_joined',
        playerCount: this.getRoomMemberCount(room),
      });
    } catch (err) {
      this.gameLogger.error(`Failed to load game state: ${err.message}`);
      client.emit('error', { message: 'Failed to load game state', code: 'STATE_ERROR' });
    }
  }

  @SubscribeMessage('leave_game')
  handleLeaveGame(@ConnectedSocket() client: Socket, @MessageBody() payload: LeaveGamePayload): void {
    const user = this.getUserInfo(client);
    if (user && payload?.gameId) {
      this.leaveRoom(client, `game:${payload.gameId}`);
      this.playerGames.delete(client.id);
      this.broadcastToRoom(`game:${payload.gameId}`, 'round_update', {
        gameId: payload.gameId,
        event: 'player_left',
        playerCount: this.getRoomMemberCount(`game:${payload.gameId}`),
      });
    }
  }

  @SubscribeMessage('place_bet')
  async handlePlaceBet(@ConnectedSocket() client: Socket, @MessageBody() payload: PlaceBetPayload): Promise<void> {
    const user = this.getUserInfo(client);
    if (!user) {
      client.emit('error', { message: 'Not authenticated', code: 'UNAUTHENTICATED' });
      return;
    }

    if (!payload?.gameId || !payload?.optionId || payload.amount === undefined) {
      client.emit('error', { message: 'gameId, optionId, and amount are required', code: 'BAD_PAYLOAD' });
      return;
    }
    if (typeof payload.amount !== 'number' || payload.amount <= 0) {
      client.emit('error', { message: 'Bet amount must be a positive number', code: 'BAD_AMOUNT' });
      return;
    }

    const idempotencyKey = payload.idempotencyKey ?? `${user.userId}-${payload.gameId}-${randomUUID()}`;

    try {
      // Server-authoritative: validate + debit + record atomically.
      const result = await this.gameEngine.placeBet(
        user.userId,
        payload.gameId,
        payload.optionId,
        new Decimal(payload.amount),
        idempotencyKey,
      );

      const totals = await this.getBetTotals(payload.gameId);
      const room = `game:${payload.gameId}`;

      client.emit('bet_placed', { bet: result.bet, balanceAfter: result.balanceAfter });
      client.emit('balance_update', { balance: result.balanceAfter });

      this.broadcastToRoom(room, 'round_update', {
        gameId: payload.gameId,
        round: result.round,
        event: 'new_bet',
        totalBetAmount: result.round.totalBetAmount,
        betTotals: totals,
        playerCount: this.getRoomMemberCount(room),
        serverTime: Date.now(),
      });

      // Personal result (win/loss) is delivered together with the round result.
      this.gameLogger.log(`Bet placed: player=${user.username} game=${payload.gameId} amount=${payload.amount}`);
    } catch (err) {
      this.gameLogger.error(`Bet failed for ${user.username}: ${err.message}`);
      client.emit('error', { message: err.message || 'Failed to place bet', code: 'BET_FAILED' });
    }
  }

  @SubscribeMessage('get_seed_state')
  async handleGetSeed(@ConnectedSocket() client: Socket): Promise<void> {
    const user = this.getUserInfo(client);
    if (!user) return;
    const gameId = this.playerGames.get(client.id);
    if (!gameId) {
      client.emit('error', { message: 'Join a game first', code: 'NOT_IN_GAME' });
      return;
    }
    // Send the UNREVEALED commitment only — serverSeed stays secret until settle.
    const state = await this.gameEngine.getGameState(gameId);
    client.emit('seed_state', state.seedState
      ? { ...state.seedState, algorithm: 'HMAC-SHA256', revealedServerSeed: null }
      : null);
  }

  @SubscribeMessage('rotate_seed')
  async handleRotateSeed(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { clientSeed?: string },
  ): Promise<void> {
    const user = this.getUserInfo(client);
    if (!user) return;
    const gameId = this.playerGames.get(client.id);
    if (!gameId) {
      client.emit('error', { message: 'Join a game first', code: 'NOT_IN_GAME' });
      return;
    }
    try {
      const result = await this.seedService.setClientSeed(user.userId, gameId, payload?.clientSeed ?? '');
      client.emit('seed_rotated', result);
    } catch (err) {
      client.emit('error', { message: err.message, code: 'SEED_REJECTED' });
    }
  }

  // ----------------------------------------------------------
  // Server-initiated broadcasts (from the scheduler bus)
  // ----------------------------------------------------------

  @OnEvent(GAME_EVENTS.round_started)
  async onRoundStarted(payload: {
    gameId: string;
    round: { id: string; roundNumber: number; status: string };
    seedState?: { serverSeedHash: string; clientSeed: string; nonce: number };
  }): Promise<void> {
    const room = `game:${payload.gameId}`;
    const totals = await this.getBetTotals(payload.gameId);
    this.broadcastToRoom(room, 'round_started', {
      gameId: payload.gameId,
      round: payload.round,
      seed: payload.seedState ?? null,
      betTotals: totals,
      serverTime: Date.now(),
    });
  }

  @OnEvent(GAME_EVENTS.round_closed)
  async onRoundClosed(payload: { gameId: string; round: { id: string; status: string } }): Promise<void> {
    const room = `game:${payload.gameId}`;
    const totals = await this.getBetTotals(payload.gameId);
    this.broadcastToRoom(room, 'round_closed', {
      gameId: payload.gameId,
      round: payload.round,
      betTotals: totals,
      serverTime: Date.now(),
    });
  }

  @OnEvent(GAME_EVENTS.round_result)
  onRoundResult(payload: {
    gameId: string;
    roundId: string;
    roundNumber: number;
    winningOptionId: string | null;
    winningLabel: string;
    resultData: Record<string, unknown>;
    serverSeedHash: string;
    clientSeed: string;
    nonce: number;
    revealedServerSeed: string;
    totalPayout: string;
    totalWinners: number;
  }): void {
    const room = `game:${payload.gameId}`;
    this.broadcastToRoom(room, 'round_result', {
      gameId: payload.gameId,
      roundId: payload.roundId,
      roundNumber: payload.roundNumber,
      result: {
        winningOptionId: payload.winningOptionId,
        winningLabel: payload.winningLabel,
        resultData: payload.resultData,
        totalPayout: payload.totalPayout,
        totalWinners: payload.totalWinners,
      },
      fairPlay: {
        serverSeedHash: payload.serverSeedHash,
        clientSeed: payload.clientSeed,
        nonce: payload.nonce,
        revealedServerSeed: payload.revealedServerSeed,
        url: `${process.env.API_BASE_URL ?? ''}/api/v1/games/verify`,
      },
      serverTime: Date.now(),
    });

    // Send personal settlement to each player who bet in this round.
    void this.sendPersonalSettlements(payload.gameId, payload.roundId, payload.resultData);
  }

  private async sendPersonalSettlements(
    gameId: string,
    roundId: string,
    resultData: Record<string, unknown>,
  ): Promise<void> {
    try {
      const bets = await this.prisma.gameBet.findMany({
        where: { roundId },
        include: { player: true, option: true },
      });
      const room = `game:${gameId}`;
      const members = this.rooms.get(room) ?? new Set<string>();
      for (const bet of bets) {
        for (const [socketId, info] of this.connectedUsers.entries()) {
          if (info.userId !== bet.playerId || !members.has(socketId)) continue;
          const won = bet.status === 'won';
          this.server.to(socketId).emit('bet_result', {
            betId: bet.id,
            roundId,
            gameId,
            optionId: bet.optionId,
            status: won ? 'won' : 'lost',
            amount: bet.amount.toString(),
            payout: bet.payout ? bet.payout.toString() : null,
          });
        }
      }
    } catch (err) {
      this.gameLogger.error(`sendPersonalSettlements failed: ${err.message}`);
    }
  }

  // ----------------------------------------------------------
  // Helpers
  // ----------------------------------------------------------

  private async getBetTotals(gameId: string): Promise<Record<string, { count: number; total: string }>> {
    try {
      const current = await this.prisma.gameRound.findFirst({
        where: { gameId, status: { notIn: ['settled', 'closed'] } },
        orderBy: { roundNumber: 'desc' },
      });
      if (!current) return {};
      const bets = await this.prisma.gameBet.findMany({
        where: { roundId: current.id },
        select: { optionId: true, amount: true },
      });
      const totals: Record<string, { count: number; total: string }> = {};
      for (const bet of bets) {
        const entry = totals[bet.optionId] ?? { count: 0, total: '0' };
        entry.count += 1;
        entry.total = new Decimal(entry.total).add(new Decimal(bet.amount)).toString();
        totals[bet.optionId] = entry;
      }
      return totals;
    } catch {
      return {};
    }
  }
}