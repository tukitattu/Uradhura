"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import { Shield } from "lucide-react";
import type { ModerationAction, PaginatedResponse } from "@/lib/types";

export default function ModerationPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["moderationActions"],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<ModerationAction>>("/admin/moderation/actions", {
        params: { pageSize: 50 },
      });
      return data;
    },
  });

  const actionColors: Record<string, string> = {
    ban: "bg-red-500/20 text-red-400",
    unban: "bg-green-500/20 text-green-400",
    suspend: "bg-yellow-500/20 text-yellow-400",
    warn: "bg-orange-500/20 text-orange-400",
    adjust: "bg-blue-500/20 text-blue-400",
    update: "bg-purple-500/20 text-purple-400",
    delete: "bg-red-500/20 text-red-400",
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Moderation Log</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Admin Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-[40px]" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Admin</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.data.map((action) => (
                  <TableRow key={action.id}>
                    <TableCell className="font-medium">{action.adminName}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={actionColors[action.action.toLowerCase()] || ""}>
                        {action.action}
                      </Badge>
                    </TableCell>
                    <TableCell>{action.targetName}</TableCell>
                    <TableCell>{action.targetType}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground">
                      {action.reason}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(action.createdAt)}</TableCell>
                  </TableRow>
                ))}
                {data?.data.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      No moderation actions found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
