"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Report, PaginatedResponse } from "@/lib/types";

export function useReports(params?: { page?: number; pageSize?: number; status?: string; severity?: string }) {
  return useQuery({
    queryKey: ["reports", params],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Report>>("/moderation/reports", {
        params: {
          page: params?.page,
          limit: params?.pageSize,
          ...(params?.status && { status: params.status }),
        },
      });
      return data;
    },
  });
}

export function useReport(id: string) {
  return useQuery({
    queryKey: ["report", id],
    queryFn: async () => {
      const { data } = await api.get<{ data: Report }>(`/moderation/reports/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useAssignReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, assignedTo }: { id: string; assignedTo: string }) => {
      const { data } = await api.patch(`/moderation/reports/${id}`, {
        status: "reviewing",
        assignedTo,
      });
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      queryClient.invalidateQueries({ queryKey: ["report", variables.id] });
    },
  });
}

export function useResolveReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, resolution }: { id: string; resolution: string }) => {
      const { data } = await api.patch(`/moderation/reports/${id}`, {
        status: "resolved",
        resolution,
      });
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      queryClient.invalidateQueries({ queryKey: ["report", variables.id] });
    },
  });
}

export function useDismissReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch(`/moderation/reports/${id}`, { status: "dismissed" });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });
}