"use client";

import { useAuth } from "@/lib/auth";
import { ShieldAlert } from "lucide-react";

export function SuperAdminGate({ children }: { children: React.ReactNode }) {
  const { isSuperAdmin, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (!isSuperAdmin) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-3 text-center">
        <ShieldAlert className="h-10 w-10 text-muted-foreground" />
        <div>
          <p className="text-lg font-semibold">Insufficient permissions</p>
          <p className="text-sm text-muted-foreground">
            This section is restricted to super administrators.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}