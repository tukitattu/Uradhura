import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger';

let io: Server;

export interface JwtPayload {
  playerId: string;
  username: string;
  role: string;
}

export function initWebSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.NODE_ENV === 'development'
        ? [/^http:\/\/localhost:\d+$/, /^http:\/\/127\.0\.0\.1:\d+$/]
        : (process.env.CORS_ORIGIN || 'http://localhost:3000'),
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Auth middleware for socket connections
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token || typeof token !== 'string') {
      return next(new Error('Authentication required'));
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
      (socket as any).player = decoded;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const player = (socket as any).player as JwtPayload;
    logger.info(`[WS] Player connected: ${player.username} (${socket.id})`);

    // Auto-join a personal room for targeted events
    socket.join(`player:${player.playerId}`);

    socket.on('join:game', (gameId: string) => {
      socket.join(`game:${gameId}`);
      logger.debug(`[WS] ${player.username} joined game:${gameId}`);
    });

    socket.on('leave:game', (gameId: string) => {
      socket.leave(`game:${gameId}`);
    });

    socket.on('disconnect', () => {
      logger.info(`[WS] Player disconnected: ${player.username}`);
    });
  });

  logger.info('[WS] WebSocket server initialized');
  return io;
}

export function getIO(): Server {
  if (!io) throw new Error('WebSocket server not initialized');
  return io;
}

// ─── Emit helpers ──────────────────────────────────────────────────────────────

export function emitToGame(gameId: string, event: string, data: unknown): void {
  if (!io) return;
  io.to(`game:${gameId}`).emit(event, data);
}

export function emitToPlayer(playerId: string, event: string, data: unknown): void {
  if (!io) return;
  io.to(`player:${playerId}`).emit(event, data);
}

export function emitRoundCreated(gameId: string, data: {
  roundId: string;
  roundNumber: number;
  bettingEndsAt: string;
}): void {
  emitToGame(gameId, 'round:created', {
    type: 'round:created',
    gameId,
    roundId: data.roundId,
    data: { roundNumber: data.roundNumber, bettingEndsAt: data.bettingEndsAt },
    timestamp: Date.now(),
  });
}

export function emitBettingClosed(gameId: string, roundId: string): void {
  emitToGame(gameId, 'round:betting_closed', {
    type: 'round:betting_closed',
    gameId,
    roundId,
    data: { status: 'BETTING_CLOSED' },
    timestamp: Date.now(),
  });
}

export function emitResultSet(gameId: string, roundId: string, data: {
  winnerId: string;
  winningOptionLabel: string;
  resultData: string;
}): void {
  emitToGame(gameId, 'round:result_set', {
    type: 'round:result_set',
    gameId,
    roundId,
    data: {
      status: 'RESULT_PROCESSING',
      winnerId: data.winnerId,
      winningOptionLabel: data.winningOptionLabel,
      resultData: data.resultData,
    },
    timestamp: Date.now(),
  });
}

export function emitRoundSettled(gameId: string, roundId: string, data: {
  winnerId: string;
  totalPayout: number;
  settledBets: number;
}): void {
  emitToGame(gameId, 'round:settled', {
    type: 'round:settled',
    gameId,
    roundId,
    data: {
      status: 'SETTLED',
      winnerId: data.winnerId,
      totalPayout: data.totalPayout,
      settledBets: data.settledBets,
    },
    timestamp: Date.now(),
  });
}

export function emitBetPlaced(gameId: string, roundId: string, data: {
  betId: string;
  playerId: string;
  optionId: string;
  amount: number;
  newTotalBetAmount: number;
}): void {
  emitToGame(gameId, 'bet:placed', {
    type: 'bet:placed',
    gameId,
    roundId,
    data,
    timestamp: Date.now(),
  });
}

export function emitBalanceUpdate(playerId: string, newBalance: number): void {
  emitToPlayer(playerId, 'wallet:updated', {
    type: 'wallet:updated',
    gameId: '',
    roundId: '',
    data: { playerId, newBalance },
    timestamp: Date.now(),
  });
}
