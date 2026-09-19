"use client";

import { useEffect, useState } from "react";
import { useWithdrawalRules, useUpdateWithdrawalRules } from "@/hooks/use-super-admin";
import { SuperAdminGate } from "@/components/super-admin-gate";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Save, RotateCcw, Coins } from "lucide-react";

export default function WithdrawalsPage() {
  const { data: rules, isLoading } = useWithdrawalRules();
  const update = useUpdateWithdrawalRules();
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (rules) setDraft(JSON.stringify(rules, null, 2));
  }, [rules]);

  const handleSave = () => {
    try {
      update.mutate(JSON.parse(draft));
    } catch {
      alert("Invalid JSON. Please fix the rules before saving.");
    }
  };

  return (
    <SuperAdminGate>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Withdrawals</h1>
          <p className="text-sm text-muted-foreground">
            Withdrawal rules, limits, and methods. Super-admin overrides are available in the wallet module.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5" />
              Withdrawal Rules
            </CardTitle>
            <CardDescription>Global limits, cooldowns, and approval policy shared across methods.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <Skeleton className="h-64" />
            ) : (
              <>
                <pre className="overflow-auto rounded-md bg-muted/50 p-4 text-xs text-muted-foreground">
                  <code>{JSON.stringify(rules, null, 2)}</code>
                </pre>
                <div>
                  <p className="mb-1 text-sm font-medium">Edit (raw JSON)</p>
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    className="h-64 w-full rounded-md border bg-background p-3 font-mono text-xs"
                    spellCheck={false}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSave} disabled={update.isPending}>
                    {update.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Rules
                  </Button>
                  <Button variant="outline" onClick={() => setDraft(JSON.stringify(rules, null, 2))}>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Reset
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </SuperAdminGate>
  );
}