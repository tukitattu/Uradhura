// ============================================================
// GAME GATEWAY — Real-time game events
// Namespace: /game
// Server-authoritative: all bets validated via GameEngineService
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
import { GameEngineService } from '../games/game-engine.service';
import { Decimal } from '@prisma/client/runtime/library';
import { randomUUID } from 'crypto';

// ----------------------------------------------------------
// DTOs for incoming events
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
export class GameGateway extends BaseGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly gameLogger = new Logger(GameGateway.name);

  // Track which socket IDs are in which game rooms
  private readonly playerGames = new Map<string, string>();

  constructor(
    jwtService: JwtService,
    private readonly gameEngine: GameEngineService,
  ) {
    super(jwtService, GameGateway.name);
  }

  // ----------------------------------------------------------
  // Connection lifecycle
  // ----------------------------------------------------------

  async handleConnection(client: Socket): Promise<void> {
    await super.handleConnection(client);
  }

  handleDisconnect(client: Socket): void {
    // Auto-leave any game room the player was in
    const gameId = this.playerGames.get(client.id);
    if (gameId) {
      this.handleLeaveGame(client, { gameId });
    }
    super.handleDisconnect(client);
  }

  // ----------------------------------------------------------
  // Event handlers
  // ----------------------------------------------------------

  @SubscribeMessage('join_game')
  async handleJoinGame(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinGamePayload,
  ): Promise<void> {
    const user = this.getUserInfo(client);
    if (!user) {
      client.emit('error', { message: 'Not authenticated' });
      return;
    }

    if (!payload.gameId) {
      client.emit('error', { message: 'gameId is required' });
      return;
    }

    // Leave previous game if already in one
    const previousGameId = this.playerGames.get(client.id);
    if (previousGameId) {
      this.leaveRoom(client, `game:${previousGameId}`);
      this.playerGames.delete(client.id);
    }

    const room = `game:${payload.gameId}`;
    this.joinRoom(client, room);
    this.playerGames.set(client.id, payload.gameId);

    // Fetch current game state for the joining player
    try {
      const gameState = await this.gameEngine.getGameState(payload.gameId);
      client.emit('round_update', {
        gameId: payload.gameId,
        round: gameState.currentRound,
        options: gameState.options,
        config: gameState.config,
        betConfig: gameState.betConfig,
        playerCount: this.getRoomMemberCount(room),
      });
    } catch (err) {
      this.gameLogger.error(`Failed to fetch game state: ${err.message}`);
      client.emit('error', { message: 'Failed to load game state' });
      return;
    }

    // Notify the room about the new player count
    this.broadcastToRoom(room, 'round_update', {
      gameId: payload.gameId,
      event: 'player_joined',
      playerCount: this.getRoomMemberCount(room),
    });

    this.gameLogger.log(`Player ${user.username} joined game ${payload.gameId}`);
  }

  @SubscribeMessage('leave_game')
  handleLeaveGame(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: LeaveGamePayload,
  ): void {
    const user = this.getUserInfo(client);
    if (!user) {
      client.emit('error', { message: 'Not authenticated' });
      return;
    }

    if (!payload.gameId) {
      client.emit('error', { message: 'gameId is required' });
      return;
    }

    const room = `game:${payload.gameId}`;
    this.leaveRoom(client, room);
    this.playerGames.delete(client.id);

    // Notify remaining players
    this.broadcastToRoom(room, 'round_update', {
      gameId: payload.gameId,
      event: 'player_left',
      playerCount: this.getRoomMemberCount(room),
    });

    this.gameLogger.log(`Player ${user.username} left game ${payload.gameId}`);
  }

  @SubscribeMessage('place_bet')
  async handlePlaceBet(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: PlaceBetPayload,
  ): Promise<void> {
    const user = this.getUserInfo(client);
    if (!user) {
      client.emit('error', { message: 'Not authenticated' });
      return;
    }

    // Validate payload
    if (!payload.gameId || !payload.optionId || payload.amount === undefined) {
      client.emit('error', { message: 'gameId, optionId, and amount are required' });
      return;
    }

    if (typeof payload.amount !== 'number' || payload.amount <= 0) {
      client.emit('error', { message: 'Bet amount must be a positive number' });
      return;
    }

    // Generate idempotency key if not provided (server-side, CSPRNG)
    const idempotencyKey = payload.idempotencyKey ?? `${user.userId}-${payload.gameId}-${randomUUID()}`;

    try {
      // Server-authoritative: validate and process the bet
      const result = await this.gameEngine.placeBet(
        user.userId,
        payload.gameId,
        payload.optionId,
        new Decimal(payload.amount),
        idempotencyKey,
      );

      // Send confirmation to the bettor
      client.emit('bet_placed', {
        bet: result.bet,
        balanceAfter: result.balanceAfter,
      });

      // Send updated balance
      client.emit('balance_update', {
        balance: result.balanceAfter,
      });

      // Broadcast round update to all players in the game room
      const room = `game:${payload.gameId}`;
      this.broadcastToRoom(room, 'round_update', {
        gameId: payload.gameId,
        round: result.round,
        event: 'new_bet',
        totalBetAmount: result.round.totalBetAmount,
        playerCount: this.getRoomMemberCount(room),
      });

      this.gameLogger.log(
        `Bet placed: player=${user.username} game=${payload.gameId} option=${payload.optionId} amount=${payload.amount}`,
      );
    } catch (err) {
      this.gameLogger.error(`Bet failed for ${user.username}: ${err.message}`);
      client.emit('error', {
        message: err.message || 'Failed to place bet',
        code: 'BET_FAILED',
      });
    }
  }

  // ----------------------------------------------------------
  // Server-initiated events (called by cron / admin)
  // ----------------------------------------------------------

  /**
   * Broadcasts a round result to all players in a game room.
   * Called externally after round processing completes.
   */
  broadcastRoundResult(
    gameId: string,
    roundId: string,
    result: {
      winningOptionId: string;
      winningLabel: string;
      totalPayout: number;
      totalWinners: number;
    },
  ): void {
    const room = `game:${gameId}`;
    this.broadcastToRoom(room, 'round_result', {
      gameId,
      roundId,
      result,
    });
  }

  /**
   * Broadcasts a bet result (win/loss) to a specific player.
   */
  broadcastBetResult(
    socketId: string,
    betId: string,
    result: {
      status: 'won' | 'lost';
      payout: number;
    },
  ): void {
    this.sendToUser(socketId, 'bet_result', {
      betId,
      ...result,
    });
  }
}
