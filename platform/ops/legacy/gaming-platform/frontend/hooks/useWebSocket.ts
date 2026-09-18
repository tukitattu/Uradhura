'use client';
import { useEffect, useRef, useCallback, useState } from 'react';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4000';

export interface WSEvent {
  type: string;
  gameId: string;
  roundId: string;
  data: any;
  timestamp: number;
}

export function useWebSocket(token: string | null) {
  const wsRef = useRef<any>(null);
  const [connected, setConnected] = useState(false);
  const listenersRef = useRef<Map<string, Set<(event: WSEvent) => void>>>(new Map());

  useEffect(() => {
    if (!token || typeof window === 'undefined') return;

    let mounted = true;

    async function connect() {
      try {
        const { io } = await import('socket.io-client');
        if (!mounted) return;

        const socket = io(WS_URL, {
          auth: { token },
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionAttempts: 10,
          reconnectionDelay: 1000,
        });

        socket.on('connect', () => {
          if (mounted) setConnected(true);
        });

        socket.on('disconnect', () => {
          if (mounted) setConnected(false);
        });

        // Forward all game events to registered listeners
        const gameEvents = [
          'round:created', 'round:betting_closed', 'round:result_set',
          'round:settled', 'bet:placed', 'wallet:updated',
        ];
        gameEvents.forEach((event) => {
          socket.on(event, (data: WSEvent) => {
            listenersRef.current.get(event)?.forEach((cb) => cb(data));
            listenersRef.current.get('*')?.forEach((cb) => cb(data));
          });
        });

        wsRef.current = socket;
      } catch (err) {
        console.error('[WS] Connection failed:', err);
      }
    }

    connect();

    return () => {
      mounted = false;
      wsRef.current?.disconnect();
      wsRef.current = null;
      setConnected(false);
    };
  }, [token]);

  const joinGame = useCallback((gameId: string) => {
    wsRef.current?.emit('join:game', gameId);
  }, []);

  const leaveGame = useCallback((gameId: string) => {
    wsRef.current?.emit('leave:game', gameId);
  }, []);

  const on = useCallback((event: string, callback: (event: WSEvent) => void) => {
    if (!listenersRef.current.has(event)) {
      listenersRef.current.set(event, new Set());
    }
    listenersRef.current.get(event)!.add(callback);
    return () => { listenersRef.current.get(event)?.delete(callback); };
  }, []);

  return { connected, joinGame, leaveGame, on };
}
