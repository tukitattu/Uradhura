import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { createSocket, Namespace } from '../lib/socket';
import { useAuth } from './AuthContext';

interface SocketState {
  game: Socket | null;
  live: Socket | null;
  chat: Socket | null;
  isConnected: boolean;
}

interface SocketContextType extends SocketState {
  connect: () => void;
  disconnect: () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [sockets, setSockets] = useState<Record<Namespace, Socket | null>>({
    '/game': null,
    '/live': null,
    '/chat': null,
  });
  const [isConnected, setIsConnected] = useState(false);

  const connect = useCallback(() => {
    const namespaces: Namespace[] = ['/game', '/live', '/chat'];
    const newSockets: Record<Namespace, Socket> = {} as Record<Namespace, Socket>;

    namespaces.forEach((ns) => {
      const socket = createSocket(ns);

      socket.on('connect', () => {
        console.log(`Connected to ${ns}`);
        setIsConnected(true);
      });

      socket.on('disconnect', () => {
        console.log(`Disconnected from ${ns}`);
      });

      socket.on('connect_error', (err) => {
        console.error(`Socket error in ${ns}:`, err.message);
      });

      socket.connect();
      newSockets[ns] = socket;
    });

    setSockets(newSockets);
  }, []);

  const disconnect = useCallback(() => {
    Object.values(sockets).forEach((socket) => {
      socket?.disconnect();
    });
    setSockets({ '/game': null, '/live': null, '/chat': null });
    setIsConnected(false);
  }, [sockets]);

  useEffect(() => {
    if (isAuthenticated) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [isAuthenticated]);

  return (
    <SocketContext.Provider
      value={{
        game: sockets['/game'],
        live: sockets['/live'],
        chat: sockets['/chat'],
        isConnected,
        connect,
        disconnect,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocketContext(): SocketContextType {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocketContext must be used within a SocketProvider');
  }
  return context;
}
