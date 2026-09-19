"use client";

import { useEffect, useState } from "react";
import { useTeenPattiConfig, useUpdateTeenPattiConfig, useTeenPattiTables } from "@/hooks/use-super-admin";
import { SuperAdminGate } from "@/components/super-admin-gate";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Save, RotateCcw, Table2 } from "lucide-react";

export default function TeenPattiPage() {
  const { data: config, isLoading } = useTeenPattiConfig();
  const update = useUpdateTeenPattiConfig();
  const { data: tables } = useTeenPattiTables();
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (config) setDraft(JSON.stringify(config.value ?? {}, null, 2));
  }, [config]);

  const handleSave = () => {
    try {
      const parsed = JSON.parse(draft);
      update.mutate(parsed);
    } catch {
      // invalid JSON — surface error by not saving
      alert("Invalid JSON. Please fix the config before saving.");
    }
  };

  return (
    <SuperAdminGate>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Teen Patti</h1>
          <p className="text-sm text-muted-foreground">Game configuration, table management, and rake overview.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Engine Config</CardTitle>
              <CardDescription>
                Live game engine parameters. Changes apply to new rounds; use "apply to tables" for running tables.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <Skeleton className="h-64" />
              ) : (
                <>
                  <Textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    className="h-72 font-mono text-xs"
                    spellCheck={false}
                  />
                  <div className="flex gap-2">
                    <Button onClick={handleSave} disabled={update.isPending}>
                      {update.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      Save Config
                    </Button>
                    <Button variant="outline" onClick={() => setDraft(JSON.stringify(config?.value ?? {}, null, 2))}>
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Reset
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Table2 className="h-5 w-5" />
                Tables
              </CardTitle>
              <CardDescription>Active teen-patti tables and their live configuration.</CardDescription>
            </CardHeader>
            <CardContent>
              {!tables ? (
                <Skeleton className="h-32" />
              ) : (
                <div className="space-y-3">
                  {(tables as Array<Record<string, any>>).length === 0 && (
                    <p className="text-sm text-muted-foreground">No active tables</p>
                  )}
                  {(tables as Array<Record<string, any>>).map((t) => (
                    <div key={t.id ?? t.code} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="text-sm font-medium">{t.code || t.name || t.id}</p>
                        <p className="text-xs text-muted-foreground">
                          {t.gameType || "classic"} • min {t.minBuyIn ?? t.minBet} • max {t.maxBuyIn ?? t.maxBet}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          className={
                            (t.isActive ?? t.status === "active")
                              ? "bg-emerald-500/15 text-emerald-500"
                              : "bg-slate-500/15 text-slate-400"
                          }
                        >
                          {(t.isActive ?? t.status) === "active" || t.isActive ? "active" : "closed"}
                        </Badge>
                        <p className="text-xs text-muted-foreground">{t.seatCount ?? t.totalSeats} seats</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </SuperAdminGate>
  );
}