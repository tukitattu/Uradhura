import { useCallback } from 'react';
import { useSocketContext } from '../contexts/SocketContext';
import { Socket } from 'socket.io-client';

export function useSocket(namespace: '/game' | '/live' | '/chat') {
  const { game, live, chat, isConnected } = useSocketContext();

  const socket: Socket | null = (() => {
    switch (namespace) {
      case '/game':
        return game;
      case '/live':
        return live;
      case '/chat':
        return chat;
      default:
        return null;
    }
  })();

  const emit = useCallback(
    (event: string, data?: unknown) => {
      socket?.emit(event, data);
    },
    [socket]
  );

  const on = useCallback(
    (event: string, handler: (...args: any[]) => void) => {
      socket?.on(event, handler);
      return () => {
        socket?.off(event, handler);
      };
    },
    [socket]
  );

  return { socket, emit, on, isConnected };
}
