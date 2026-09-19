"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Player, GameBet, PaginatedResponse } from "@/lib/types";

export function usePlayers(params?: { page?: number; pageSize?: number; status?: string; search?: string }) {
  return useQuery({
    queryKey: ["players", params],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Player>>("/players", { params });
      return data;
    },
  });
}

export function usePlayer(id: string) {
  return useQuery({
    queryKey: ["player", id],
    queryFn: async () => {
      const { data } = await api.get<{ data: Player }>(`/players/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

export function usePlayerBets(playerId: string, params?: { page?: number; pageSize?: number }) {
  return useQuery({
    queryKey: ["playerBets", playerId, params],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<GameBet>>(`/players/${playerId}/bets`, { params });
      return data;
    },
    enabled: !!playerId,
  });
}

export function useBanPlayer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { data } = await api.post(`/players/${id}/ban`, { reason });
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["players"] });
      queryClient.invalidateQueries({ queryKey: ["player", variables.id] });
    },
  });
}

export function useUnbanPlayer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/players/${id}/unban`);
      return data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["players"] });
      queryClient.invalidateQueries({ queryKey: ["player", id] });
    },
  });
}

export function useAdjustPlayerWallet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ playerId, amount, reason }: { playerId: string; amount: number; reason: string }) => {
      const { data } = await api.post(`/players/${playerId}/wallet/adjust`, { amount, reason });
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["player", variables.playerId] });
    },
  });
}
