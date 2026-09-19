"use client";

import { useState } from "react";
import { useTransactions, useExportTransactions } from "@/hooks/use-wallet";
import { DataTable, type Column } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import { Download, Filter, ArrowUpDown } from "lucide-react";

export default function WalletPage() {
  const [search, setSearch] = useState("");
  const [type, setType] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [page, setPage] = useState(1);
  const exportMutation = useExportTransactions();

  const { data, isLoading } = useTransactions({
    page,
    pageSize: 20,
    type: type || undefined,
    status: status || undefined,
  });

  const handleExport = async (format: "csv" | "xlsx") => {
    try {
      const blob = await exportMutation.mutateAsync({
        type: type || undefined,
        status: status || undefined,
        format,
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `transactions.${format}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      // ignore
    }
  };

  const columns: Column<Record<string, unknown>>[] = [
    {
      key: "playerUsername",
      header: "Player",
      render: (item) => (
        <div>
          <p className="font-medium">{item.playerUsername as string}</p>
          <p className="text-xs text-muted-foreground">{item.playerId as string}</p>
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      render: (item) => {
        const typeColors: Record<string, string> = {
          deposit: "bg-green-500/20 text-green-400",
          withdrawal: "bg-red-500/20 text-red-400",
          bet: "bg-blue-500/20 text-blue-400",
          win: "bg-yellow-500/20 text-yellow-400",
          bonus: "bg-purple-500/20 text-purple-400",
          adjustment: "bg-orange-500/20 text-orange-400",
        };
        return (
          <Badge variant="outline" className={typeColors[item.type as string] || ""}>
            {item.type as string}
          </Badge>
        );
      },
    },
    {
      key: "amount",
      header: "Amount",
      sortable: true,
      render: (item) => (
        <span className={item.type === "withdrawal" || item.type === "bet" ? "text-red-400" : "text-green-400"}>
          {item.type === "withdrawal" || item.type === "bet" ? "-" : "+"}
          {formatCurrency(item.amount as number)}
        </span>
      ),
    },
    {
      key: "balanceBefore",
      header: "Before",
      render: (item) => formatCurrency(item.balanceBefore as number),
    },
    {
      key: "balanceAfter",
      header: "After",
      render: (item) => formatCurrency(item.balanceAfter as number),
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
    {
      key: "createdAt",
      header: "Date",
      sortable: true,
      render: (item) => formatDate(item.createdAt as string),
    },
  ];

  const tableData = (data?.data || []).map((t) => t as unknown as Record<string, unknown>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Wallet Transactions</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => handleExport("csv")} disabled={exportMutation.isPending}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport("xlsx")} disabled={exportMutation.isPending}>
            <Download className="mr-2 h-4 w-4" />
            Export XLSX
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {["", "deposit", "withdrawal", "bet", "win", "bonus", "adjustment"].map((t) => (
          <Button
            key={t}
            variant={type === t ? "default" : "outline"}
            size="sm"
            onClick={() => { setType(t); setPage(1); }}
          >
            {t || "All Types"}
          </Button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {["", "pending", "completed", "failed", "cancelled"].map((s) => (
          <Button
            key={s}
            variant={status === s ? "default" : "outline"}
            size="sm"
            onClick={() => { setStatus(s); setPage(1); }}
          >
            {s || "All Status"}
          </Button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={tableData}
        isLoading={isLoading}
        page={page}
        totalPages={data?.totalPages || 1}
        onPageChange={setPage}
      />
    </div>
  );
}
