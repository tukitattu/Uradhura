import { io, Socket } from 'socket.io-client';
import { storage } from './storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4002';

export type Namespace = '/game' | '/live' | '/chat';

export function createSocket(namespace: Namespace): Socket {
  const socket = io(`${API_BASE_URL}${namespace}`, {
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
