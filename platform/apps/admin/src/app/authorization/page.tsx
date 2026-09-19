"use client";

import { useState } from "react";

type Row = Record<string, unknown>;
import { useAuthorizationRequests, useApproveAuthorizationRequest, useRejectAuthorizationRequest } from "@/hooks/use-super-admin";
import { SuperAdminGate } from "@/components/super-admin-gate";
import { DataTable, type Column } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Check, X } from "lucide-react";
import type { AdminAuthorizationRequest } from "@/lib/types";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-500",
  approved: "bg-emerald-500/15 text-emerald-500",
  rejected: "bg-red-500/15 text-red-500",
};

const ROLE_STYLES: Record<string, string> = {
  super_admin: "bg-purple-500/15 text-purple-500",
  admin: "bg-blue-500/15 text-blue-500",
};

function StatusBadge({ status }: { status: string }) {
  return <Badge className={STATUS_STYLES[status] ?? ""}>{status}</Badge>;
}

function ReviewDialogs({ request }: { request: AdminAuthorizationRequest }) {
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const approve = useApproveAuthorizationRequest();
  const reject = useRejectAuthorizationRequest();

  return (
    <>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" className="text-emerald-500" onClick={() => setApproveOpen(true)}>
          <Check className="mr-1 h-4 w-4" /> Approve
        </Button>
        <Button size="sm" variant="outline" className="text-red-500" onClick={() => setRejectOpen(true)}>
          <X className="mr-1 h-4 w-4" /> Reject
        </Button>
      </div>

      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve {request.player?.username}?</DialogTitle>
            <DialogDescription>
              This provisions an admin account with role <b>{request.requestedRole}</b> and requested permissions. The action is
              recorded in the immutable audit log.
            </DialogDescription>
          </DialogHeader>
          <Textarea placeholder="Approval notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <DialogFooter>
            <Button
              disabled={approve.isPending}
              onClick={() =>
                approve.mutate(
                  { id: request.id, notes: notes || undefined },
                  { onSuccess: () => setApproveOpen(false) },
                )
              }
            >
              {approve.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject {request.player?.username}?</DialogTitle>
            <DialogDescription>The request becomes immutable with status rejected.</DialogDescription>
          </DialogHeader>
          <Textarea placeholder="Rejection notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <DialogFooter>
            <Button
              variant="destructive"
              disabled={reject.isPending}
              onClick={() => reject.mutate({ id: request.id, notes: notes || undefined }, { onSuccess: () => setRejectOpen(false) })}
            >
              {reject.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function AuthorizationPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("pending");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const { data, isLoading } = useAuthorizationRequests({ page, status, search });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["authorization"] });
  };

  const columns: Column<Row>[] = [
    {
      key: "player",
      header: "Player",
      render: (r: Row) => {
          const R = r as unknown as AdminAuthorizationRequest;
          return (
        <div>
          <p className="font-medium">{R.player?.username || R.playerId}</p>
          <p className="text-xs text-muted-foreground">{R.player?.email}</p>
        </div>
      );
      },
    },
    {
      key: "requestedRole",
      header: "Requested Role",
      render: (r: Row) => { const R = r as unknown as AdminAuthorizationRequest; return <Badge className={ROLE_STYLES[R.requestedRole] ?? ""}>{R.requestedRole}</Badge>; },
    },
    {
      key: "requestedPermissions",
      header: "Permissions",
      render: (r: Row) => {
          const R = r as unknown as AdminAuthorizationRequest;
          return (
        <div className="flex max-w-xs flex-wrap gap-1">
          {(R.requestedPermissions || []).slice(0, 4).map((p) => (
            <Badge key={p} variant="secondary" className="font-mono text-[10px]">
              {p}
            </Badge>
          ))}
          {(R.requestedPermissions || []).length > 4 && (
            <Badge variant="secondary" className="text-[10px]">
              +{(R.requestedPermissions || []).length - 4}
            </Badge>
          )}
        </div>
      );
      },
    },
    {
      key: "notes",
      header: "Notes",
      render: (r: Row) => { const R = r as unknown as AdminAuthorizationRequest; return <span className="text-sm text-muted-foreground">{R.notes || "—"}</span>; },
    },
    {
      key: "createdAt",
      header: "Requested",
      render: (r: Row) => { const R = r as unknown as AdminAuthorizationRequest; return (
        <div>
          <p className="text-sm">{new Date(R.createdAt).toLocaleDateString()}</p>
          <p className="text-xs text-muted-foreground">{new Date(R.createdAt).toLocaleTimeString()}</p>
        </div>
      ); },
    },
    {
      key: "status",
      header: "Status",
      render: (r: Row) => { const R = r as unknown as AdminAuthorizationRequest; return (
        <div className="space-y-1">
          <StatusBadge status={R.status} />
          {R.reviewedBy && (
            <p className="text-xs text-muted-foreground">
              by {R.reviewedBy.username}
              {R.provisionedAdminId ? " • admin created" : ""}
            </p>
          )}
        </div>
      ); },
    },
    {
      key: "actions",
      header: "Review",
      render: (r: Row) =>
        (r as unknown as AdminAuthorizationRequest).status === "pending" ? (
          <ReviewDialogs request={r as unknown as AdminAuthorizationRequest} />
        ) : (
          <span className="text-xs text-muted-foreground">reviewed</span>
        ),
    },
  ];

  return (
    <SuperAdminGate>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Admin Authorization</h1>
          <p className="text-sm text-muted-foreground">
            Two-step promotion: players request admin access, super admins review and provision.
          </p>
        </div>

        <Tabs value={status} onValueChange={(v) => { setStatus(v); setPage(1); invalidate(); }}>
          <TabsList>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
          </TabsList>
        </Tabs>

        <Card>
          <CardHeader>
            <CardTitle>{status.charAt(0).toUpperCase() + status.slice(1)} Requests</CardTitle>
            <CardDescription>Requests are immutable after review. Every decision is audited.</CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={columns}
              data={(data?.data ?? []).map((r) => r as unknown as Row)}
              isLoading={isLoading}
              searchPlaceholder="Search by player username / email"
              searchKey="player"
              onSearch={(q) => {
                setSearch(q);
                setPage(1);
              }}
              page={page}
              totalPages={data?.meta.totalPages ?? 1}
              onPageChange={setPage}
              emptyMessage="No requests in this state"
            />
          </CardContent>
        </Card>
      </div>
    </SuperAdminGate>
  );
}