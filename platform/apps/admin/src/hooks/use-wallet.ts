"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { WalletTransaction, PaginatedResponse } from "@/lib/types";

export function useTransactions(params?: {
  page?: number;
  pageSize?: number;
  type?: string;
  status?: string;
  playerId?: string;
  startDate?: string;
  endDate?: string;
}) {
  return useQuery({
    queryKey: ["transactions", params],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<WalletTransaction>>("/wallet/transactions", { params });
      return data;
    },
  });
}

export function useTransaction(id: string) {
  return useQuery({
    queryKey: ["transaction", id],
    queryFn: async () => {
      const { data } = await api.get<{ data: WalletTransaction }>(`/wallet/transactions/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useExportTransactions() {
  return useMutation({
    mutationFn: async (params: {
      type?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
      format?: "csv" | "xlsx";
    }) => {
      const { data } = await api.get("/wallet/transactions/export", {
        params,
        responseType: "blob",
      });
      return data;
    },
  });
}

export function useWalletStats() {
  return useQuery({
    queryKey: ["walletStats"],
    queryFn: async () => {
      const { data } = await api.get("/wallet/stats");
      return data.data;
    },
  });
}
