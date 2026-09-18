"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save, Settings } from "lucide-react";
import type { SystemSettings } from "@/lib/types";

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<SystemSettings | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data } = await api.get<{ data: SystemSettings }>("/admin/settings");
      return data.data;
    },
  });

  useEffect(() => {
    if (data) setSettings(data);
  }, [data]);

  const updateSettings = useMutation({
    mutationFn: async (updates: Partial<SystemSettings>) => {
      const { data } = await api.patch("/admin/settings", updates);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
  });

  const handleSave = () => {
    if (settings) {
      updateSettings.mutateAsync(settings);
    }
  };

  if (isLoading || !settings) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">System Settings</h1>
        <Button onClick={handleSave} disabled={updateSettings.isPending}>
          {updateSettings.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Changes
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>General</CardTitle>
            <CardDescription>Basic system configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Maintenance Mode</Label>
                <p className="text-xs text-muted-foreground">Disable public access to the platform</p>
              </div>
              <Switch
                checked={settings.maintenanceMode}
                onCheckedChange={(checked) => setSettings({ ...settings, maintenanceMode: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Registration Enabled</Label>
                <p className="text-xs text-muted-foreground">Allow new user registrations</p>
              </div>
              <Switch
                checked={settings.registrationEnabled}
                onCheckedChange={(checked) => setSettings({ ...settings, registrationEnabled: checked })}
              />
            </div>
            <div className="space-y-2">
              <Label>Support Email</Label>
              <Input
                value={settings.supportEmail}
                onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Default Currency</Label>
              <Input
                value={settings.defaultCurrency}
                onChange={(e) => setSettings({ ...settings, defaultCurrency: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Limits</CardTitle>
            <CardDescription>Configure transaction limits</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Max Players Per Round</Label>
              <Input
                type="number"
                value={settings.maxPlayersPerRound}
                onChange={(e) => setSettings({ ...settings, maxPlayersPerRound: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Min Deposit Amount</Label>
              <Input
                type="number"
                step="0.01"
                value={settings.minDepositAmount}
                onChange={(e) => setSettings({ ...settings, minDepositAmount: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Max Withdrawal Amount</Label>
              <Input
                type="number"
                step="0.01"
                value={settings.maxWithdrawalAmount}
                onChange={(e) => setSettings({ ...settings, maxWithdrawalAmount: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Feature Flags
            </CardTitle>
            <CardDescription>Toggle platform features on or off</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Object.entries(settings.featureFlags).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <Label className="text-sm">{key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())}</Label>
                  </div>
                  <Switch
                    checked={value}
                    onCheckedChange={(checked) =>
                      setSettings({
                        ...settings,
                        featureFlags: { ...settings.featureFlags, [key]: checked },
                      })
                    }
                  />
                </div>
              ))}
              {Object.keys(settings.featureFlags).length === 0 && (
                <p className="col-span-full text-center text-sm text-muted-foreground">No feature flags configured</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
