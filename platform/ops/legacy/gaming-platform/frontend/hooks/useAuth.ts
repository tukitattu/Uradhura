'use client';
import { useState, useEffect, useCallback } from 'react';
import { authApi, setToken, clearToken, type Player } from '@/lib/api';

export function useAuth() {
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('player');
    if (stored) {
      try {
        setPlayer(JSON.parse(stored));
      } catch {
        clearToken();
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await authApi.login(email, password);
    setToken(data.token);
    localStorage.setItem('player', JSON.stringify(data.player));
    setPlayer(data.player);
    return data.player;
  }, []);

  const register = useCallback(async (username: string, email: string, password: string) => {
    const data = await authApi.register(username, email, password);
    setToken(data.token);
    localStorage.setItem('player', JSON.stringify(data.player));
    setPlayer(data.player);
    return data.player;
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setPlayer(null);
  }, []);

  const refreshBalance = useCallback(async () => {
    try {
      const me = await authApi.me();
      setPlayer(prev => prev ? { ...prev, balance: me.balance } : me);
      localStorage.setItem('player', JSON.stringify(me));
      return me.balance;
    } catch {
      return null;
    }
  }, []);

  return { player, loading, login, register, logout, refreshBalance };
}
