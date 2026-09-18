"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Game, GameOption, GameRound, PaginatedResponse } from "@/lib/types";

export function useGames(params?: { page?: number; pageSize?: number; status?: string; search?: string }) {
  return useQuery({
    queryKey: ["games", params],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Game>>("/games", {
        params: { includeInactive: true, ...params },
      });
      return data;
    },
  });
}

export function useGame(id: string) {
  return useQuery({
    queryKey: ["game", id],
    queryFn: async () => {
      const { data } = await api.get<{ data: Game }>(`/games/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useGameOptions(gameId: string) {
  return useQuery({
    queryKey: ["gameOptions", gameId],
    queryFn: async () => {
      const { data } = await api.get<{ data: GameOption[] }>(`/games/${gameId}/options`);
      return data.data;
    },
    enabled: !!gameId,
  });
}

export function useGameRounds(gameId: string, params?: { page?: number; pageSize?: number }) {
  return useQuery({
    queryKey: ["gameRounds", gameId, params],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<GameRound>>(`/games/${gameId}/rounds`, { params });
      return data;
    },
    enabled: !!gameId,
  });
}

export function useUpdateGame() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Game> & { id: string }) => {
      const { data } = await api.patch(`/games/${id}`, updates);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["games"] });
      queryClient.invalidateQueries({ queryKey: ["game", variables.id] });
    },
  });
}

export function useCreateGameOption() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ gameId, ...option }: Omit<GameOption, "id"> & { gameId: string }) => {
      const { data } = await api.post(`/games/${gameId}/options`, option);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["gameOptions", variables.gameId] });
    },
  });
}

export function useUpdateGameOption() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ gameId, id, ...option }: Partial<GameOption> & { gameId: string; id: string }) => {
      const { data } = await api.patch(`/games/${gameId}/options/${id}`, option);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["gameOptions", variables.gameId] });
    },
  });
}

export function useDeleteGameOption() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ gameId, id }: { gameId: string; id: string }) => {
      await api.delete(`/games/${gameId}/options/${id}`);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["gameOptions", variables.gameId] });
    },
  });
}
