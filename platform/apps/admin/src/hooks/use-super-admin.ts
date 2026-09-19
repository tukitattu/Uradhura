"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type {
  AdminAuthorizationRequest,
  AdminRecord,
  AuditLog,
  DesignToken,
  GameBranding,
  PaginationMeta,
  SystemSetting,
  TeenPattiConfig,
} from "@/lib/types";

// ----------------------------------------------------------
// Admin Authorization (two-step promotion workflow)
// ----------------------------------------------------------

export function useAuthorizationRequests(params?: { page?: number; limit?: number; status?: string; search?: string }) {
  return useQuery({
    queryKey: ["authorization", params],
    queryFn: async () => {
      const { data } = await api.get<{ data: AdminAuthorizationRequest[]; meta: PaginationMeta }>(
        "/admin-authorization/requests",
        { params },
      );
      return data;
    },
  });
}

export function useApproveAuthorizationRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const { data } = await api.post(`/admin-authorization/${id}/approve`, { notes });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["authorization"] });
    },
  });
}

export function useRejectAuthorizationRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const { data } = await api.post(`/admin-authorization/${id}/reject`, { notes });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["authorization"] });
    },
  });
}

// ----------------------------------------------------------
// Admin Management
// ----------------------------------------------------------

export function useAdmins(params?: { page?: number; limit?: number; search?: string }) {
  return useQuery({
    queryKey: ["admins", params],
    queryFn: async () => {
      const { data } = await api.get<{ data: AdminRecord[]; meta: PaginationMeta }>(
        "/admin-management/admins",
        { params },
      );
      return data;
    },
  });
}

export function useAdmin(id: string) {
  return useQuery({
    queryKey: ["admin", id],
    queryFn: async () => {
      const { data } = await api.get<{ data: AdminRecord }>(`/admin-management/admins/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useUpdateAdminStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { data } = await api.patch(`/admin-management/admins/${id}`, { isActive });
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admins"] });
      queryClient.invalidateQueries({ queryKey: ["admin", variables.id] });
    },
  });
}

export function useAddAdminRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, roleName }: { id: string; roleName: string }) => {
      const { data } = await api.post(`/admin-management/admins/${id}/roles`, { roleName });
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admins"] });
      queryClient.invalidateQueries({ queryKey: ["admin", variables.id] });
    },
  });
}

export function useRemoveAdminRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, roleId }: { id: string; roleId: string }) => {
      const { data } = await api.delete(`/admin-management/admins/${id}/roles/${roleId}`);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admins"] });
      queryClient.invalidateQueries({ queryKey: ["admin", variables.id] });
    },
  });
}

// ----------------------------------------------------------
// Audit
// ----------------------------------------------------------

export function useAuditLogs(params?: { page?: number; limit?: number; action?: string; actorType?: string; entityType?: string }) {
  return useQuery({
    queryKey: ["audit", "logs", params],
    queryFn: async () => {
      const { data } = await api.get<{ data: AuditLog[]; meta: PaginationMeta }>("/audit/logs", { params });
      return data;
    },
  });
}

export function useAuditStats() {
  return useQuery({
    queryKey: ["audit", "stats"],
    queryFn: async () => {
      const { data } = await api.get<{
        totalLogs: number;
        todayLogs: number;
        weekLogs: number;
        monthLogs: number;
        topActions: { action: string; _count: { id: number } }[];
        topEntityTypes: { entityType: string; _count: { id: number } }[];
      }>("/audit/stats");
      return data;
    },
  });
}

// ----------------------------------------------------------
// Teen Patti
// ----------------------------------------------------------

export function useTeenPattiConfig() {
  return useQuery({
    queryKey: ["teen-patti", "config"],
    queryFn: async () => {
      const { data } = await api.get<{ data: TeenPattiConfig }>("/admin/teen-patti/config");
      return data.data;
    },
  });
}

export function useUpdateTeenPattiConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (value: Record<string, unknown>) => {
      const { data } = await api.put("/admin/teen-patti/config", { value });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teen-patti", "config"] });
    },
  });
}

export function useTeenPattiTables() {
  return useQuery({
    queryKey: ["teen-patti", "tables"],
    queryFn: async () => {
      const { data } = await api.get<{ data: unknown[] }>("/admin/teen-patti/tables");
      return data.data;
    },
  });
}

export function useUpdateTeenPattiTable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Record<string, any> & { id: string }) => {
      const { data } = await api.put(`/admin/teen-patti/tables/${id}`, updates);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teen-patti", "tables"] });
    },
  });
}

// ----------------------------------------------------------
// Withdrawals
// ----------------------------------------------------------

export function useWithdrawalRules() {
  return useQuery({
    queryKey: ["withdrawals", "rules"],
    queryFn: async () => {
      const { data } = await api.get<{ data: any }>("/admin/withdrawals/rules");
      return data.data;
    },
  });
}

export function useUpdateWithdrawalRules() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (rules: any) => {
      const { data } = await api.put("/admin/withdrawals/rules", rules);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["withdrawals", "rules"] });
    },
  });
}

// ----------------------------------------------------------
// Branding (design tokens + game branding)
// ----------------------------------------------------------

export function useDesignTokens() {
  return useQuery({
    queryKey: ["design-tokens"],
    queryFn: async () => {
      const { data } = await api.get<DesignToken[]>(`/settings/design-tokens`);
      return data;
    },
  });
}

export function useSetDesignToken() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: { scope: string; key: string; value: string; label?: string }) => {
      const { data } = await api.put("/settings/design-tokens", body);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["design-tokens"] });
    },
  });
}

export function useGameBrandings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data } = await api.get<SystemSetting[]>("/settings");
      return data;
    },
  });
}

export function useGameBranding(slug: string) {
  return useQuery({
    queryKey: ["game-branding", slug],
    queryFn: async () => {
      const { data } = await api.get<GameBranding>(`/settings/game-branding/${slug}`);
      return data;
    },
    enabled: !!slug,
  });
}

export function useSetGameBranding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ slug, ...body }: { slug: string } & Partial<GameBranding>) => {
      const { data } = await api.put(`/settings/game-branding/${slug}`, body);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["game-branding", variables.slug] });
    },
  });
}