"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatNumber, formatCurrency } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  format?: "number" | "currency" | "percent" | "text";
  className?: string;
}

export function StatsCard({
  title,
  value,
  icon: Icon,
  trend,
  format = "number",
  className,
}: StatsCardProps) {
  const formatValue = (val: number | string): string => {
    if (typeof val === "string") return val;
    switch (format) {
      case "currency":
        return formatCurrency(val);
      case "percent":
        return `${val.toFixed(1)}%`;
      case "number":
        return formatNumber(val);
      default:
        return String(val);
    }
  };

  return (
    <Card className={cn("relative overflow-hidden", className)}>
      <div className="absolute right-0 top-0 h-24 w-24 opacity-5">
        <Icon className="h-full w-full text-primary" />
      </div>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatValue(value)}</div>
        {trend && (
          <div className="mt-1 flex items-center text-xs">
            {trend.isPositive ? (
              <TrendingUp className="mr-1 h-3 w-3 text-green-400" />
            ) : (
              <TrendingDown className="mr-1 h-3 w-3 text-red-400" />
            )}
            <span className={trend.isPositive ? "text-green-400" : "text-red-400"}>
              {trend.value > 0 ? "+" : ""}
              {trend.value}%
            </span>
            <span className="ml-1 text-muted-foreground">from last period</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
