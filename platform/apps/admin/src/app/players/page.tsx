"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePlayers, useBanPlayer, useUnbanPlayer } from "@/hooks/use-players";
import { DataTable, type Column } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate, getStatusColor, formatNumber } from "@/lib/utils";
import { Ban, CheckCircle, Wallet } from "lucide-react";
import type { Player } from "@/lib/types";

export default function PlayersPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = usePlayers({ page, pageSize: 20, status: status || undefined, search: search || undefined });
  const banPlayer = useBanPlayer();
  const unbanPlayer = useUnbanPlayer();

  const columns: Column<Record<string, unknown>>[] = [
    {
      key: "username",
      header: "Player",
      sortable: true,
      render: (item) => (
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-xs font-medium text-primary">
            {(item.username as string).slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="font-medium">{item.username as string}</p>
            <p className="text-xs text-muted-foreground">{item.email as string}</p>
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (item) => (
        <Badge variant="outline" className={getStatusColor(item.status as string)}>
          {item.status as string}
        </Badge>
      ),
    },
    { key: "level", header: "Level", sortable: true },
    {
      key: "walletBalance",
      header: "Balance",
      sortable: true,
      render: (item) => formatCurrency(item.walletBalance as number),
    },
    {
      key: "totalBets",
      header: "Total Bets",
      sortable: true,
      render: (item) => formatNumber(item.totalBets as number),
    },
    {
      key: "createdAt",
      header: "Joined",
      sortable: true,
      render: (item) => formatDate(item.createdAt as string),
    },
    {
      key: "actions",
      header: "Actions",
      render: (item) => (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/players/${item.id}`);
            }}
          >
            View
          </Button>
          {(item.status as string) === "active" ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-red-400 hover:text-red-300"
              onClick={(e) => {
                e.stopPropagation();
                banPlayer.mutate({ id: item.id as string, reason: "Admin action" });
              }}
            >
              <Ban className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="text-green-400 hover:text-green-300"
              onClick={(e) => {
                e.stopPropagation();
                unbanPlayer.mutate(item.id as string);
              }}
            >
              <CheckCircle className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  const tableData = (data?.data || []).map((p) => p as unknown as Record<string, unknown>);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Players</h1>
      <DataTable
        columns={columns}
        data={tableData}
        isLoading={isLoading}
        searchKey="username"
        searchPlaceholder="Search players..."
        onSearch={(q) => { setSearch(q); setPage(1); }}
        page={page}
        totalPages={data?.totalPages || 1}
        onPageChange={setPage}
        onRowClick={(item) => router.push(`/players/${item.id}`)}
      />
    </div>
  );
}
