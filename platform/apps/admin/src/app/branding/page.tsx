"use client";

import { useState } from "react";
import {
  useDesignTokens,
  useSetDesignToken,
  useGameBranding,
  useSetGameBranding,
} from "@/hooks/use-super-admin";
import { useGames } from "@/hooks/use-games";
import { SuperAdminGate } from "@/components/super-admin-gate";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Palette, Save, Plus } from "lucide-react";

export default function BrandingPage() {
  const queryClient = useQueryClient();
  const { data: tokens, isLoading: tokensLoading } = useDesignTokens();
  const setToken = useSetDesignToken();

  const { data: gamesData } = useGames();
  const games = gamesData?.data ?? [];

  const [editing, setEditing] = useState<{ id: string; value: string } | null>(null);

  const tokenGroups = (tokens ?? []).reduce<Record<string, typeof tokens>>((acc, t) => {
    (acc[t.scope] ||= []).push(t);
    return acc;
  }, {});

  const [selectedGame, setSelectedGame] = useState<string>(games[0]?.slug ?? "");
  const { data: branding } = useGameBranding(selectedGame);
  const setBranding = useSetGameBranding();
  const [brandDraft, setBrandDraft] = useState<Record<string, any>>({});

  const currentGame = games.find((g) => g.slug === selectedGame);

  return (
    <SuperAdminGate>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Branding</h1>
          <p className="text-sm text-muted-foreground">
            Design tokens drive the client theme; game branding overrides per-game presentation.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Design Tokens
              </CardTitle>
              <CardDescription>Scoped theme tokens consumed by clients.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {tokensLoading ? (
                <Skeleton className="h-48" />
              ) : Object.keys(tokenGroups).length === 0 ? (
                <p className="text-sm text-muted-foreground">No design tokens configured.</p>
              ) : (
                Object.entries(tokenGroups).map(([scope, scopeTokens]) => (
                  <div key={scope} className="space-y-2">
                    <Badge variant="secondary">{scope}</Badge>
                    {scopeTokens!.map((t) => (
                      <div key={t.scope + ":" + t.key} className="flex items-center gap-2 rounded-lg border p-2">
                        <span className="h-6 w-6 shrink-0 rounded border" style={{ backgroundColor: /^#/.test(t.value) ? t.value : "#888" }} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{t.key}</p>
                          <p className="truncate text-xs text-muted-foreground">{t.value}{t.label ? ` — ${t.label}` : ""}</p>
                        </div>
                        {editing?.id === t.scope + ":" + t.key ? (
                          <div className="flex gap-1">
                            <Input
                              className="h-8 w-32"
                              value={editing.value}
                              onChange={(e) => setEditing({ id: editing.id, value: e.target.value })}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  setToken.mutate({ scope: t.scope, key: t.key, value: editing.value, label: t.label ?? undefined });
                                  setEditing(null);
                                }
                              }}
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setToken.mutate({ scope: t.scope, key: t.key, value: editing.value, label: t.label ?? undefined });
                                setEditing(null);
                              }}
                            >
                              <Save className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <Button size="sm" variant="ghost" onClick={() => setEditing({ id: t.scope + ":" + t.key, value: t.value })}>
                            Edit
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Game Branding</CardTitle>
              <CardDescription>Override presentation per game via /settings/game-branding/:slug.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Game</Label>
                {games.length === 0 ? (
                  <Skeleton className="h-9" />
                ) : (
                  <>
                    <select
                      value={selectedGame}
                      onChange={(e) => {
                        setSelectedGame(e.target.value);
                        setBrandDraft({});
                      }}
                      className="flex h-9 w-full rounded-md border bg-background px-3 text-sm"
                    >
                      {games.map((g) => (
                        <option key={g.id} value={g.slug}>
                          {g.name} ({g.slug})
                        </option>
                      ))}
                    </select>
                    {branding && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setBrandDraft({
                            displayName: branding.displayName ?? currentGame?.name ?? "",
                            tagline: branding.tagline ?? currentGame?.description ?? "",
                            primaryColor: branding.primaryColor ?? "",
                            logoUrl: branding.logoUrl ?? "",
                            bannerUrl: branding.bannerUrl ?? "",
                            accentColors: (branding.accentColors ?? []).join(", "),
                          })
                        }
                      >
                        Load current
                      </Button>
                    )}
                  </>
                )}
              </div>

              {currentGame && (
                <>
                  {([
                    ["displayName", "Display Name"],
                    ["tagline", "Tagline"],
                    ["primaryColor", "Primary Color"],
                    ["logoUrl", "Logo URL"],
                    ["bannerUrl", "Banner URL"],
                    ["accentColors", "Accent Colors (comma-separated)"],
                  ] as const).map(([field, label]) => (
                    <div key={field} className="space-y-1.5">
                      <Label className="text-sm">{label}</Label>
                      <Input
                        value={brandDraft[field] ?? ""}
                        onChange={(e) => setBrandDraft({ ...brandDraft, [field]: e.target.value })}
                      />
                    </div>
                  ))}

                  <Button
                    onClick={() => {
                      const payload: Record<string, any> = {};
                      (["displayName", "tagline", "primaryColor", "logoUrl", "bannerUrl"] as const).forEach((f) => {
                        if (brandDraft[f]) payload[f] = brandDraft[f];
                      });
                      if (brandDraft.accentColors) {
                        payload.accentColors = String(brandDraft.accentColors)
                          .split(",")
                          .map((s: string) => s.trim())
                          .filter(Boolean);
                      }
                      setBranding.mutate({ slug: selectedGame, ...payload });
                    }}
                    disabled={setBranding.isPending}
                  >
                    {setBranding.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Branding
                  </Button>
                </>
              )}

              <div className="flex items-center gap-2 rounded-md border border-dashed p-2">
                <Plus className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  Branding is per-game. Select a game above to edit its presentation overrides.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </SuperAdminGate>
  );
}