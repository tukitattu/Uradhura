"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Save, Settings, Flag } from "lucide-react";
import { useAuth } from "@/lib/auth";
import type { SystemSetting, FeatureFlag } from "@/lib/types";

const KEY_LABELS: Record<string, string> = {
  maintenanceMode: "Maintenance Mode",
  registrationEnabled: "Registration Enabled",
  maxPlayersPerRound: "Max Players Per Round",
  minDepositAmount: "Min Deposit Amount",
  maxWithdrawalAmount: "Max Withdrawal Amount",
  defaultCurrency: "Default Currency",
  supportEmail: "Support Email",
};

const KEY_HINTS: Record<string, string> = {
  maintenanceMode: "Disable public access to the platform",
  registrationEnabled: "Allow new user registrations",
};

function booleanValue(v: unknown): boolean {
  return v === true || v === "true" || v === 1 || v === "1";
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { isSuperAdmin } = useAuth();
  const [values, setValues] = useState<Record<string, string>>({});

  const { data: settings, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data } = await api.get<SystemSetting[]>("/settings");
      return data;
    },
  });

  const { data: flags, isLoading: flagsLoading } = useQuery({
    queryKey: ["settings", "feature-flags"],
    queryFn: async () => {
      const { data } = await api.get<FeatureFlag[]>("/settings/feature-flags");
      return data;
    },
  });

  useEffect(() => {
    if (settings) {
      const next: Record<string, string> = {};
      settings.forEach((s) => {
        next[s.key] = typeof s.value === "object" ? JSON.stringify(s.value) : String(s.value ?? "");
      });
      setValues(next);
    }
  }, [settings]);

  const saveSetting = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: unknown }) => {
      const { data } = await api.put(`/settings/${key}`, { value });
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
  });

  const toggleFlag = useMutation({
    mutationFn: async ({ key, enabled }: { key: string; enabled: boolean }) => {
      const { data } = await api.put(`/settings/feature-flags/${key}`, { enabled });
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["settings", "feature-flags"] });
    },
  });

  if (isLoading || !settings) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  const generalKeys = ["maintenanceMode", "registrationEnabled", "supportEmail", "defaultCurrency"];
  const limitKeys = ["maxPlayersPerRound", "minDepositAmount", "maxWithdrawalAmount"];

  const renderField = (key: string, input: React.ReactNode) => (
    <div key={key} className="space-y-2">
      <Label>{KEY_LABELS[key] ?? key}</Label>
      {input}
      {KEY_HINTS[key] && <p className="text-xs text-muted-foreground">{KEY_HINTS[key]}</p>}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">System Settings</h1>
      </div>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General & Limits</TabsTrigger>
          <TabsTrigger value="flags">Feature Flags</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6 pt-4">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>General</CardTitle>
                <CardDescription>Basic system configuration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {generalKeys.map((key) =>
                  renderField(
                    key,
                    booleanValue(settings.find((s) => s.key === key)?.value) ? (
                      <div className="flex h-9 items-center rounded-md border px-3 text-sm">
                        {(values[key] ?? "").toString()}
                      </div>
                    ) : (
                      <Input value={values[key] ?? ""} onChange={(e) => setValues({ ...values, [key]: e.target.value })} />
                    ),
                  ),
                )}
                <Button
                  onClick={() => generalKeys.forEach((k) => saveSetting.mutate({ key: k, value: values[k] }))}
                  disabled={saveSetting.isPending}
                  className="w-full"
                >
                  {saveSetting.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save General
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Limits</CardTitle>
                <CardDescription>Configure transaction and round limits</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {limitKeys.map((key) =>
                  renderField(
                    key,
                    <Input
                      type="number"
                      step="0.01"
                      value={values[key] ?? ""}
                      onChange={(e) => setValues({ ...values, [key]: e.target.value })}
                    />,
                  ),
                )}
                <Button
                  onClick={() => limitKeys.forEach((k) => saveSetting.mutate({ key: k, value: values[k] }))}
                  disabled={saveSetting.isPending}
                  className="w-full"
                >
                  {saveSetting.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Limits
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                All Settings
              </CardTitle>
              <CardDescription>Raw key/value pairs registered in the system</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 md:grid-cols-2">
                {settings.map((s) => (
                  <div key={s.key} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{s.key}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {typeof s.value === "object" ? JSON.stringify(s.value) : String(s.value ?? "")}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!isSuperAdmin || saveSetting.isPending}
                      onClick={() => {
                        const raw = window.prompt("New value", String(s.value ?? ""));
                        if (raw !== null) saveSetting.mutate({ key: s.key, value: raw });
                      }}
                    >
                      Edit
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="flags" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flag className="h-5 w-5" />
                Feature Flags
              </CardTitle>
              <CardDescription>Toggle platform features on or off</CardDescription>
            </CardHeader>
            <CardContent>
              {flagsLoading ? (
                <Skeleton className="h-24" />
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {flags?.map((flag) => (
                    <div key={flag.key} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <Label className="text-sm">{flag.label || flag.key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase())}</Label>
                        <p className="text-xs text-muted-foreground">{flag.key}</p>
                      </div>
                      <Switch
                        checked={flag.enabled}
                        disabled={!isSuperAdmin}
                        onCheckedChange={(checked) => toggleFlag.mutate({ key: flag.key, enabled: checked })}
                      />
                    </div>
                  ))}
                  {(!flags || flags.length === 0) && (
                    <p className="col-span-full text-center text-sm text-muted-foreground">No feature flags configured</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}