"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { StatsCard } from "@/components/stats-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Gamepad2, DollarSign, Flag, Activity, TrendingUp } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import type { DashboardStats, ChartDataPoint } from "@/lib/types";

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboardStats"],
    queryFn: async () => {
      const { data } = await api.get<{ data: DashboardStats }>("/admin/dashboard/stats");
      return data.data;
    },
  });

  const { data: revenueChart, isLoading: revenueLoading } = useQuery({
    queryKey: ["revenueChart"],
    queryFn: async () => {
      const { data } = await api.get<{ data: ChartDataPoint[] }>("/admin/dashboard/revenue-chart");
      return data.data;
    },
  });

  const { data: playerChart, isLoading: playerLoading } = useQuery({
    queryKey: ["playerChart"],
    queryFn: async () => {
      const { data } = await api.get<{ data: ChartDataPoint[] }>("/admin/dashboard/player-chart");
      return data.data;
    },
  });

  const { data: topGames } = useQuery({
    queryKey: ["topGames"],
    queryFn: async () => {
      const { data } = await api.get<{ data: ChartDataPoint[] }>("/admin/dashboard/top-games");
      return data.data;
    },
  });

  if (statsLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[120px]" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-[300px]" />
          <Skeleton className="h-[300px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Players"
          value={stats?.totalPlayers ?? 0}
          icon={Users}
          trend={{ value: 12, isPositive: true }}
        />
        <StatsCard
          title="Active Games"
          value={stats?.activeGames ?? 0}
          icon={Gamepad2}
          trend={{ value: 5, isPositive: true }}
        />
        <StatsCard
          title="Revenue Today"
          value={stats?.revenueToday ?? 0}
          icon={DollarSign}
          format="currency"
          trend={{ value: 8, isPositive: true }}
        />
        <StatsCard
          title="Pending Reports"
          value={stats?.pendingReports ?? 0}
          icon={Flag}
          trend={{ value: -3, isPositive: false }}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Revenue Over Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            {revenueLoading ? (
              <Skeleton className="h-[250px]" />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={revenueChart || []}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(263 70% 58%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(263 70% 58%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 4% 16%)" />
                  <XAxis dataKey="name" stroke="hsl(240 5% 65%)" fontSize={12} />
                  <YAxis stroke="hsl(240 5% 65%)" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(240 10% 6%)",
                      border: "1px solid hsl(240 4% 16%)",
                      borderRadius: "8px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="hsl(263 70% 58%)"
                    fill="url(#revenueGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Player Growth
            </CardTitle>
          </CardHeader>
          <CardContent>
            {playerLoading ? (
              <Skeleton className="h-[250px]" />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={playerChart || []}>
                  <defs>
                    <linearGradient id="playerGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(180 100% 50%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(180 100% 50%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 4% 16%)" />
                  <XAxis dataKey="name" stroke="hsl(240 5% 65%)" fontSize={12} />
                  <YAxis stroke="hsl(240 5% 65%)" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(240 10% 6%)",
                      border: "1px solid hsl(240 4% 16%)",
                      borderRadius: "8px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="hsl(180 100% 50%)"
                    fill="url(#playerGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Top Games by Revenue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topGames || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 4% 16%)" />
              <XAxis dataKey="name" stroke="hsl(240 5% 65%)" fontSize={12} />
              <YAxis stroke="hsl(240 5% 65%)" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(240 10% 6%)",
                  border: "1px solid hsl(240 4% 16%)",
                  borderRadius: "8px",
                }}
              />
              <Bar dataKey="value" fill="hsl(263 70% 58%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
