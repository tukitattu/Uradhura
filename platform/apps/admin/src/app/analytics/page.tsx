"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { TrendingUp, Users, Gamepad2, DollarSign } from "lucide-react";
import type { AnalyticsData, ChartDataPoint } from "@/lib/types";

const COLORS = ["#b44aff", "#00d4ff", "#00ff88", "#ff0080", "#ffcc00", "#ff6b35"];

export default function AnalyticsPage() {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ["analytics"],
    queryFn: async () => {
      const { data } = await api.get<{ data: AnalyticsData }>("/admin/analytics");
      return data.data;
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[300px]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Analytics</h1>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-400" />
              Revenue Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={analytics?.revenue || []}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00ff88" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#00ff88" stopOpacity={0} />
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
                <Area type="monotone" dataKey="value" stroke="#00ff88" fill="url(#revenueGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-cyan-400" />
              Player Growth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={analytics?.playerGrowth || []}>
                <defs>
                  <linearGradient id="playerGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
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
                <Area type="monotone" dataKey="value" stroke="#00d4ff" fill="url(#playerGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gamepad2 className="h-5 w-5 text-purple-400" />
              Game Popularity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics?.gamePopularity || []}>
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
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {(analytics?.gamePopularity || []).map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-pink-400" />
              Bet Volume
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={analytics?.betVolume || []}>
                <defs>
                  <linearGradient id="betGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ff0080" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ff0080" stopOpacity={0} />
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
                <Area type="monotone" dataKey="value" stroke="#ff0080" fill="url(#betGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
