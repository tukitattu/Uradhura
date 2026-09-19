"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import api from "./api";
import type { AdminUser } from "./types";

interface AuthContextType {
  user: AdminUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  can: (permission: string) => boolean;
  hasRole: (...roles: string[]) => boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ROLE_PRIORITY: Record<string, number> = {
  super_admin: 0,
  admin: 1,
  game_operator: 2,
  finance: 3,
  moderator: 4,
  support: 5,
  viewer: 6,
};

function normalizeUser(raw: Record<string, any> | null | undefined): AdminUser | null {
  if (!raw || !raw.id) return null;
  const roles: string[] = Array.isArray(raw.roles) ? raw.roles : raw.role ? [raw.role] : [];
  const name = [raw.firstName ?? "", raw.lastName ?? ""].filter(Boolean).join(" ") || raw.username || raw.name || "";
  const role = roles.length
    ? roles.reduce((a, b) => (ROLE_PRIORITY[a] ?? 9) <= (ROLE_PRIORITY[b] ?? 9) ? a : b)
    : "viewer";
  return {
    id: raw.id,
    email: raw.email,
    name,
    role: role as AdminUser["role"],
    avatar: raw.avatar,
    username: raw.username,
    firstName: raw.firstName ?? null,
    lastName: raw.lastName ?? null,
    roles,
    permissions: Array.isArray(raw.permissions) ? raw.permissions : [],
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        setUser(null);
        return;
      }
      const res = await api.get("/auth/me");
      const raw = (res.data as any).user ?? res.data;
      setUser(normalizeUser(raw));
    } catch {
      setUser(null);
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
    }
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      await refreshUser();
      setIsLoading(false);
    };
    initAuth();
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("accessToken", data.accessToken);
    if (data.refreshToken) {
      localStorage.setItem("refreshToken", data.refreshToken);
    }
    setUser(normalizeUser(data.user));
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // ignore
    }
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    setUser(null);
  };

  const can = (permission: string) => {
    if (!user) return false;
    if (user.roles.includes("super_admin") || user.role === "super_admin") return true;
    if (permission === "*") return false;
    return user.permissions.includes(permission) || user.permissions.includes("*");
  };

  const hasRole = (...roles: string[]) => {
    if (!user) return false;
    return (
      user.roles.includes("super_admin") ||
      user.role === "super_admin" ||
      user.roles.some((r) => roles.includes(r)) ||
      user.role === roles[0]
    );
  };

  const isSuperAdmin = !!user?.roles.includes("super_admin") || user?.role === "super_admin";
  const isAdmin = isSuperAdmin || !!user?.roles.includes("admin");

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        can,
        hasRole,
        isAdmin,
        isSuperAdmin,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export { normalizeUser };