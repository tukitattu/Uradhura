import { io, Socket } from 'socket.io-client';
import { storage } from './storage';
import {
  BalanceUpdateEvent,
  BetPlacedEvent,
  BetResultEvent,
  RoundClosedEvent,
  RoundResultEvent,
  RoundStartedEvent,
  RoundUpdateEvent,
  SeedRotatedEvent,
  SeedState,
  SocketErrorEvent,
} from './types';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4002';
// axios talks to <base>/api/v1/... but Socket.IO namespaces are mounted at the
// server ROOT (/game, /live, /chat, /teen-patti) — never under /api/v1. Derive
// the origin so one env var works for both REST and realtime.
const SOCKET_BASE = new URL(API_BASE_URL).origin || API_BASE_URL;

export type Namespace = '/game' | '/live' | '/chat';

export function createSocket(namespace: Namespace): Socket {
  const socket = io(`${SOCKET_BASE}${namespace}`, {
    transports: ['websocket'],
    autoConnect: false,
    auth: async (cb) => {
      const token = await storage.getAccessToken();
      cb({ token });
    },
  });

  return socket;
}

export async function getAuthToken(): Promise<string | null> {
  return storage.getAccessToken();
}

// ----------------------------------------------------------
// Typed /game socket
// ----------------------------------------------------------

export interface GameServerToClientEvents {
  round_update: (payload: RoundUpdateEvent) => void;
  round_started: (payload: RoundStartedEvent) => void;
  round_closed: (payload: RoundClosedEvent) => void;
  round_result: (payload: RoundResultEvent) => void;
  bet_placed: (payload: BetPlacedEvent) => void;
  bet_result: (payload: BetResultEvent) => void;
  balance_update: (payload: BalanceUpdateEvent) => void;
  seed_state: (payload: SeedState | null) => void;
  seed_rotated: (payload: SeedRotatedEvent) => void;
  error: (payload: SocketErrorEvent) => void;
}

export interface GameClientToServerEvents {
  join_game: (payload: { gameId: string }) => void;
  leave_game: (payload: { gameId: string }) => void;
  place_bet: (payload: { gameId: string; optionId: string; amount: number; idempotencyKey?: string }) => void;
  get_seed_state: () => void;
  rotate_seed: (payload: { clientSeed?: string }) => void;
}

export interface GameSocket extends Socket<GameServerToClientEvents, GameClientToServerEvents> {}

export function joinGame(socket: GameSocket, gameId: string): void {
  socket.emit('join_game', { gameId });
}

export function leaveGame(socket: GameSocket, gameId: string): void {
  socket.emit('leave_game', { gameId });
}

export function placeBet(socket: GameSocket, gameId: string, optionId: string, amount: number, idempotencyKey?: string): void {
  socket.emit('place_bet', { gameId, optionId, amount, idempotencyKey });
}

export function requestSeedState(socket: GameSocket): void {
  socket.emit('get_seed_state');
}

export function rotateSeed(socket: GameSocket, clientSeed?: string): void {
  socket.emit('rotate_seed', { clientSeed });
}
