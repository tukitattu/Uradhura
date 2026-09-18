"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuLabel,
  SidebarMenuIcon,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth";
import {
  LayoutDashboard,
  Gamepad2,
  Users,
  Wallet,
  Flag,
  Shield,
  Settings,
  BarChart3,
  LogOut,
  Image as ImageIcon,
} from "lucide-react";

const navigation = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/assets", label: "Assets", icon: ImageIcon },
  { href: "/games", label: "Games", icon: Gamepad2 },
  { href: "/players", label: "Players", icon: Users },
  { href: "/wallet", label: "Wallet", icon: Wallet },
  { href: "/reports", label: "Reports", icon: Flag },
  { href: "/moderation", label: "Moderation", icon: Shield },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <Sidebar>
      <SidebarHeader>
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Gamepad2 className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold">Uradhura</span>
        </Link>
      </SidebarHeader>

      <Separator />

      <SidebarContent>
        <SidebarMenu>
          {navigation.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton asChild active={pathname === item.href || pathname.startsWith(item.href + "/")}>
                <Link href={item.href}>
                  <SidebarMenuIcon>
                    <item.icon className="h-4 w-4" />
                  </SidebarMenuIcon>
                  <SidebarMenuLabel>{item.label}</SidebarMenuLabel>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter>
        <Separator className="mb-4" />
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary/20 text-primary text-xs">
              {user?.name?.slice(0, 2).toUpperCase() || "AD"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium truncate">{user?.name || "Admin"}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.role || "admin"}</p>
          </div>
          <button
            onClick={logout}
            className="rounded-md p-1.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
