"use client";

import { useState } from "react";
import { useAdmins, useUpdateAdminStatus, useAddAdminRole, useRemoveAdminRole } from "@/hooks/use-super-admin";
import { SuperAdminGate } from "@/components/super-admin-gate";
import { DataTable, type Column } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Shield, ShieldOff, UserPlus, X } from "lucide-react";
import type { AdminRecord } from "@/lib/types";

type Row = Record<string, unknown>;

const KNOWN_ROLES = ["viewer", "support", "moderator", "game_operator", "finance", "admin", "super_admin"];

const ROLE_STYLES: Record<string, string> = {
  super_admin: "bg-purple-500/15 text-purple-500",
  admin: "bg-blue-500/15 text-blue-500",
  game_operator: "bg-emerald-500/15 text-emerald-500",
  finance: "bg-amber-500/15 text-amber-500",
  moderator: "bg-orange-500/15 text-orange-500",
  support: "bg-cyan-500/15 text-cyan-500",
  viewer: "bg-slate-500/15 text-slate-400",
};

function AdminDetail({ admin, onClose }: { admin: AdminRecord | null; onClose: () => void }) {
  const [roleName, setRoleName] = useState("viewer");
  const addRole = useAddAdminRole();
  const removeRole = useRemoveAdminRole();

  return (
    <Dialog open={!!admin} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-primary/20 text-primary text-xs">
                {(admin?.username || "A").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p>{admin?.username}</p>
              <p className="text-sm font-normal text-muted-foreground">{admin?.email}</p>
            </div>
          </DialogTitle>
          <DialogDescription>
            Manage roles and activation. super_admin members are protected from demotion.
          </DialogDescription>
        </DialogHeader>

        {admin && (
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Roles</p>
              <div className="flex flex-wrap gap-2">
                {admin.roles?.map((r) => (
                  <Badge key={r.id} className={ROLE_STYLES[r.name] ?? ""}>
                    {r.name}
                    {r.name !== "super_admin" && (
                      <button
                        className="ml-1.5"
                        onClick={() => removeRole.mutate({ id: admin.id, roleId: r.id })}
                        aria-label={`Remove ${r.name}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </Badge>
                ))}
                {(!admin.roles || admin.roles.length === 0) && (
                  <p className="text-xs text-muted-foreground">No roles assigned</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                className="flex h-9 w-full rounded-md border bg-background px-3 text-sm"
              >
                {KNOWN_ROLES.filter((r) => !admin.roles?.some((ur) => ur.name === r)).map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <Button
                onClick={() => {
                  addRole.mutate({ id: admin.id, roleName });
                  setRoleName("viewer");
                }}
                disabled={addRole.isPending}
              >
                {addRole.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                Grant
              </Button>
            </div>

            <div className="rounded-md border p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{admin.isActive ? "Active" : "Suspended"}</p>
                  <p className="text-xs text-muted-foreground">
                    {admin.isActive ? "Account is active and can sign in" : "Account is suspended and cannot sign in"}
                  </p>
                </div>
                <ToggleActiveButton admin={admin} />
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ToggleActiveButton({ admin }: { admin: AdminRecord }) {
  const toggle = useUpdateAdminStatus();
  return (
    <Button
      variant={admin.isActive ? "destructive" : "default"}
      size="sm"
      disabled={toggle.isPending}
      onClick={() => toggle.mutate({ id: admin.id, isActive: !admin.isActive })}
    >
      {admin.isActive ? <ShieldOff className="mr-1 h-4 w-4" /> : <Shield className="mr-1 h-4 w-4" />}
      {admin.isActive ? "Suspend" : "Activate"}
    </Button>
  );
}

export default function AdminManagementPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<AdminRecord | null>(null);

  const { data, isLoading } = useAdmins({ page, search });

  const toAdmin = (r: Row) => r as unknown as AdminRecord;

  const columns: Column<Row>[] = [
    {
      key: "username",
      header: "Admin",
      render: (r) => {
        const a = toAdmin(r);
        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary/20 text-primary text-xs">{(a.username || "A").slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{a.username}</p>
              <p className="text-xs text-muted-foreground">{a.email}</p>
            </div>
          </div>
        );
      },
    },
    {
      key: "roles",
      header: "Roles",
      render: (r) => {
        const a = toAdmin(r);
        return (
          <div className="flex flex-wrap gap-1">
            {(a.roles ?? []).map((role) => (
              <Badge key={role.id} className={ROLE_STYLES[role.name] ?? ""}>
                {role.name}
              </Badge>
            ))}
            {(!a.roles || a.roles.length === 0) && <span className="text-xs text-muted-foreground">no roles</span>}
          </div>
        );
      },
    },
    {
      key: "isActive",
      header: "Status",
      render: (r) => {
        const a = toAdmin(r);
        return (
          <Badge className={a.isActive ? "bg-emerald-500/15 text-emerald-500" : "bg-red-500/15 text-red-500"}>
            {a.isActive ? "active" : "suspended"}
          </Badge>
        );
      },
    },
    {
      key: "lastLoginAt",
      header: "Last Login",
      render: (r) => {
        const a = toAdmin(r);
        return (
          <span className="text-sm text-muted-foreground">
            {a.lastLoginAt ? new Date(a.lastLoginAt).toLocaleString() : "never"}
          </span>
        );
      },
    },
    {
      key: "createdAt",
      header: "Created",
      render: (r) => {
        const a = toAdmin(r);
        return <span className="text-sm text-muted-foreground">{new Date(a.createdAt).toLocaleDateString()}</span>;
      },
    },
  ];

  return (
    <SuperAdminGate>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Admin Management</h1>
          <p className="text-sm text-muted-foreground">
            Manage admin accounts, role grants, and activation. All changes are audited.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Admins</CardTitle>
            <CardDescription>
              Click a row to manage roles and activation. New admins are provisioned via the Authorization workflow or the create
              endpoint.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={columns}
              data={(data?.data ?? []).map((a) => a as unknown as Row)}
              isLoading={isLoading}
              searchPlaceholder="Search by username / email"
              searchKey="username"
              onSearch={(q) => {
                setSearch(q);
                setPage(1);
              }}
              page={page}
              totalPages={data?.meta.totalPages ?? 1}
              onPageChange={setPage}
              onRowClick={(r) => {
                const a = toAdmin(r);
                queryClient.invalidateQueries({ queryKey: ["admin", a.id] });
                setSelected(a);
              }}
              emptyMessage="No admins found"
            />
          </CardContent>
        </Card>

        <AdminDetail admin={selected} onClose={() => setSelected(null)} />
      </div>
    </SuperAdminGate>
  );
}