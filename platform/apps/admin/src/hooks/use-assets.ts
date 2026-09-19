"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Asset, CatalogOptions, PaginatedResponse } from "@/lib/types";

export interface AssetFilters {
  page?: number;
  limit?: number;
  category?: string;
  status?: string;
  target?: string;
  visibility?: string;
  search?: string;
}

export function useAssets(params?: AssetFilters) {
  return useQuery({
    queryKey: ["assets", params],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Asset>>("/assets", { params });
      return data;
    },
  });
}

export function useAssetCatalogOptions() {
  return useQuery({
    queryKey: ["assetCatalogOptions"],
    queryFn: async () => {
      const { data } = await api.get<CatalogOptions>("/assets/catalog-options");
      return data;
    },
  });
}

export function useCreateAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data } = await api.post<{ data: Asset }>("/assets", payload);
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["assets"] }),
  });
}

export function useUpdateAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Record<string, unknown> & { id: string }) => {
      const { data } = await api.patch<{ data: Asset }>(`/assets/${id}`, payload);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      queryClient.invalidateQueries({ queryKey: ["assetManifest"] });
    },
  });
}

export function useUploadAssetFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, file }: { id: string; file: File }) => {
      const form = new FormData();
      form.append("file", file);
      const { data } = await api.post<{ data: Asset }>(`/assets/${id}/upload`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      queryClient.invalidateQueries({ queryKey: ["assetManifest"] });
    },
  });
}

export type AssetAction = "publish" | "enable" | "disable" | "archive" | "restore" | "draft";

export function useAssetAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, action }: { id: string; action: AssetAction }) => {
      const { data } = await api.post<{ data: Asset }>(`/assets/${id}/${action}`);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      queryClient.invalidateQueries({ queryKey: ["assetManifest"] });
    },
  });
}

export function useBulkAssetAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids, action }: { ids: string[]; action: AssetAction }) => {
      const { data } = await api.post("/assets/bulk", { ids, action });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      queryClient.invalidateQueries({ queryKey: ["assetManifest"] });
    },
  });
}

export function useDeleteAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/assets/${id}`);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["assets"] }),
  });
}