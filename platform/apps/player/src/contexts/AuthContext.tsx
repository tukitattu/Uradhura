import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { storage } from '../lib/storage';
import { Player } from '../lib/types';

interface AuthState {
  user: Player | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

interface RegisterData {
  username: string;
  email: string;
  password: string;
  displayName: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  const refreshUser = useCallback(async () => {
    try {
      const { data } = await api.get<{ data: Player }>('/auth/me');
      setState((prev) => ({ ...prev, user: data.data, isAuthenticated: true }));
    } catch {
      setState((prev) => ({ ...prev, user: null, isAuthenticated: false }));
    }
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      const token = await storage.getAccessToken();
      if (token) {
        await refreshUser();
      }
      setState((prev) => ({ ...prev, isLoading: false }));
    };
    initAuth();
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    const { data } = await api.post<{ data: { player: Player; accessToken: string; refreshToken: string } }>(
      '/auth/login',
      { email, password }
    );
    await storage.setTokens(data.data.accessToken, data.data.refreshToken);
    setState({ user: data.data.player, isAuthenticated: true, isLoading: false });
  };

  const register = async (registerData: RegisterData) => {
    const { data } = await api.post<{ data: { player: Player; accessToken: string; refreshToken: string } }>(
      '/auth/register',
      registerData
    );
    await storage.setTokens(data.data.accessToken, data.data.refreshToken);
    setState({ user: data.data.player, isAuthenticated: true, isLoading: false });
  };

  const logout = async () => {
    await storage.clearTokens();
    setState({ user: null, isAuthenticated: false, isLoading: false });
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
