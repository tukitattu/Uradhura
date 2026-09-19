"use client";

import { useState } from "react";
import { useReports, useAssignReport, useResolveReport, useDismissReport } from "@/hooks/use-reports";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatRelativeTime, getStatusColor } from "@/lib/utils";
import { Flag, Loader2, CheckCircle, XCircle, UserPlus } from "lucide-react";

export default function ReportsPage() {
  const [status, setStatus] = useState<string>("");
  const [severity, setSeverity] = useState<string>("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useReports({ page, pageSize: 10, status: status || undefined, severity: severity || undefined });
  const assignReport = useAssignReport();
  const resolveReport = useResolveReport();
  const dismissReport = useDismissReport();

  const [resolveDialog, setResolveDialog] = useState<string | null>(null);
  const [resolution, setResolution] = useState("");

  const [assignDialog, setAssignDialog] = useState<string | null>(null);
  const [assignTo, setAssignTo] = useState("");

  const severityColors: Record<string, string> = {
    low: "bg-blue-500/20 text-blue-400",
    medium: "bg-yellow-500/20 text-yellow-400",
    high: "bg-orange-500/20 text-orange-400",
    critical: "bg-red-500/20 text-red-400",
  };

  const handleResolve = async (id: string) => {
    await resolveReport.mutateAsync({ id, resolution });
    setResolveDialog(null);
    setResolution("");
  };

  const handleAssign = async (id: string) => {
    await assignReport.mutateAsync({ id, assignedTo: assignTo });
    setAssignDialog(null);
    setAssignTo("");
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Reports</h1>

      <div className="flex flex-wrap gap-2">
        {["", "open", "in_progress", "resolved", "dismissed"].map((s) => (
          <Button key={s} variant={status === s ? "default" : "outline"} size="sm" onClick={() => { setStatus(s); setPage(1); }}>
            {s || "All"}
          </Button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {["", "low", "medium", "high", "critical"].map((s) => (
          <Button key={s} variant={severity === s ? "default" : "outline"} size="sm" onClick={() => { setSeverity(s); setPage(1); }}>
            {s || "All Severity"}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-[120px]" />
          ))}
        </div>
      ) : data?.data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Flag className="mb-4 h-12 w-12 opacity-50" />
          <p>No reports found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {data?.data.map((report) => (
            <Card key={report.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{report.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Reported by {report.reportedByUsername} • {formatRelativeTime(report.createdAt)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline" className={severityColors[report.severity]}>
                      {report.severity}
                    </Badge>
                    <Badge variant="outline" className={getStatusColor(report.status)}>
                      {report.status}
                    </Badge>
                    <Badge variant="outline">{report.type}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{report.description}</p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Player: {report.playerUsername}</span>
                  {report.assignedToName && <span>Assigned to: {report.assignedToName}</span>}
                </div>
                <div className="flex gap-2">
                  {report.status === "open" && (
                    <>
                      <Dialog open={assignDialog === report.id} onOpenChange={(open) => { setAssignDialog(open ? report.id : null); setAssignTo(""); }}>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline">
                            <UserPlus className="mr-2 h-4 w-4" />
                            Assign
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Assign Report</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-2">
                            <Label>Admin ID</Label>
                            <Input value={assignTo} onChange={(e) => setAssignTo(e.target.value)} placeholder="Enter admin user ID..." />
                          </div>
                          <DialogFooter>
                            <Button onClick={() => handleAssign(report.id)} disabled={assignReport.isPending}>
                              {assignReport.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                              Assign
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>

                      <Dialog open={resolveDialog === report.id} onOpenChange={(open) => { setResolveDialog(open ? report.id : null); setResolution(""); }}>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline">
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Resolve
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Resolve Report</DialogTitle>
                            <DialogDescription>Enter resolution notes for this report.</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-2">
                            <Label>Resolution</Label>
                            <Input value={resolution} onChange={(e) => setResolution(e.target.value)} placeholder="Resolution details..." />
                          </div>
                          <DialogFooter>
                            <Button onClick={() => handleResolve(report.id)} disabled={resolveReport.isPending}>
                              {resolveReport.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                              Resolve
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>

                      <Button
                        size="sm"
                        variant="outline"
                        className="text-muted-foreground"
                        onClick={() => dismissReport.mutate(report.id)}
                        disabled={dismissReport.isPending}
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Dismiss
                      </Button>
                    </>
                  )}
                  {report.resolution && (
                    <p className="text-sm text-muted-foreground italic">Resolution: {report.resolution}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
