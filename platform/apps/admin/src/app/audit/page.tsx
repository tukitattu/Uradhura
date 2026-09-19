"use client";

import { useState } from "react";
import { useAuditLogs, useAuditStats } from "@/hooks/use-super-admin";
import { SuperAdminGate } from "@/components/super-admin-gate";
import { DataTable, type Column } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatsCard } from "@/components/stats-card";
import { BarChart3, FileClock, CalendarDays, CalendarClock } from "lucide-react";
import type { AuditLog } from "@/lib/types";

type Row = Record<string, unknown>;

function DiffCell({ json, label }: { json: string | null; label: string }) {
  if (!json) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <details className="group">
      <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
        {label} diff
      </summary>
      <pre className="mt-1 max-h-32 overflow-auto rounded-md bg-muted/50 p-2 text-[10px] text-muted-foreground">
        {JSON.stringify(JSON.parse(json), null, 2)}
      </pre>
    </details>
  );
}

export default function AuditPage() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState("");

  const { data, isLoading } = useAuditLogs({ page, action: action || undefined });
  const { data: stats } = useAuditStats();

  const toLog = (r: Row) => r as unknown as AuditLog;

  const columns: Column<Row>[] = [
    {
      key: "createdAt",
      header: "Timestamp",
      render: (r) => {
        const l = toLog(r);
        return (
          <div>
            <p className="text-sm">{new Date(l.createdAt).toLocaleDateString()}</p>
            <p className="text-xs text-muted-foreground">{new Date(l.createdAt).toLocaleTimeString()}</p>
          </div>
        );
      },
    },
    {
      key: "actor",
      header: "Actor",
      render: (r) => {
        const l = toLog(r);
        return (
          <div>
            <p className="text-sm font-medium">{l.actorId || "system"}</p>
            <Badge variant="secondary" className="text-[10px]">
              {l.actorType}
            </Badge>
          </div>
        );
      },
    },
    {
      key: "action",
      header: "Action",
      render: (r) => {
        const l = toLog(r);
        return <code className="rounded bg-muted/50 px-1.5 py-0.5 text-xs">{l.action}</code>;
      },
    },
    {
      key: "entity",
      header: "Entity",
      render: (r) => {
        const l = toLog(r);
        return (
          <div>
            <p className="text-sm">{l.entityType || "—"}</p>
            <p className="font-mono text-[10px] text-muted-foreground">{l.entityId || ""}</p>
          </div>
        );
      },
    },
    {
      key: "before",
      header: "Change",
      render: (r) => {
        const l = toLog(r);
        return (
          <div className="flex gap-3">
            <DiffCell json={l.before} label="before" />
            <DiffCell json={l.after} label="after" />
          </div>
        );
      },
    },
    {
      key: "ipAddress",
      header: "IP",
      render: (r) => {
        const l = toLog(r);
        return <span className="font-mono text-xs text-muted-foreground">{l.ipAddress || "—"}</span>;
      },
    },
  ];

  return (
    <SuperAdminGate>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Audit Logs</h1>
          <p className="text-sm text-muted-foreground">Immutable, append-only history of admin actions across the platform.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard title="Total Events" value={stats?.totalLogs ?? 0} icon={BarChart3} />
          <StatsCard title="Today" value={stats?.todayLogs ?? 0} icon={CalendarDays} />
          <StatsCard title="This Week" value={stats?.weekLogs ?? 0} icon={CalendarDays} />
          <StatsCard title="This Month" value={stats?.monthLogs ?? 0} icon={CalendarClock} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileClock className="h-5 w-5" />
              Logs
            </CardTitle>
            <CardDescription>Filter by action string (e.g. ADMIN_REQUEST_APPROVED, admin.registered).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <input
              value={action}
              onChange={(e) => {
                setAction(e.target.value);
                setPage(1);
              }}
              placeholder="Filter by action..."
              className="max-w-sm rounded-md border bg-background px-3 py-2 text-sm"
            />
            <DataTable
              columns={columns}
              data={(data?.data ?? []).map((l) => l as unknown as Row)}
              isLoading={isLoading}
              page={page}
              totalPages={data?.meta.totalPages ?? 1}
              onPageChange={setPage}
              emptyMessage="No audit events found"
            />
          </CardContent>
        </Card>
      </div>
    </SuperAdminGate>
  );
}