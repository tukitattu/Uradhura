"use client";

import { useState, useEffect } from "react";
import { Bell, Menu, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth";
import { formatRelativeTime } from "@/lib/utils";
import type { Notification } from "@/lib/types";
import api from "@/lib/api";

interface HeaderProps {
  onToggleSidebar?: () => void;
}

export function Header({ onToggleSidebar }: HeaderProps) {
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const { data } = await api.get("/notifications?limit=10");
        setNotifications(data.data || []);
        setUnreadCount(data.data?.filter((n: Notification) => !n.read).length || 0);
      } catch {
        // ignore
      }
    };
    fetchNotifications();
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // ignore
    }
  };

  return (
    <header className="flex h-14 items-center gap-4 border-b bg-card px-6">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onToggleSidebar}>
        <Menu className="h-5 w-5" />
      </Button>

      <div className="flex-1" />

      <div className="relative hidden md:block">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search..." className="w-64 pl-9" />
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <Badge className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-[10px]">
                {unreadCount}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          <DropdownMenuLabel>Notifications</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">No notifications</div>
          ) : (
            notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                onClick={() => markAsRead(notification.id)}
                className="flex flex-col items-start gap-1"
              >
                <div className="flex w-full items-center justify-between">
                  <span className="font-medium">{notification.title}</span>
                  {!notification.read && (
                    <span className="h-2 w-2 rounded-full bg-primary" />
                  )}
                </div>
                <span className="text-xs text-muted-foreground line-clamp-1">
                  {notification.message}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {formatRelativeTime(notification.createdAt)}
                </span>
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-9 w-9 rounded-full">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/20 text-sm font-medium text-primary">
              {user?.name?.slice(0, 2).toUpperCase() || "AD"}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>
            <div className="flex flex-col">
              <span>{user?.name}</span>
              <span className="text-xs text-muted-foreground">{user?.email}</span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>Profile</DropdownMenuItem>
          <DropdownMenuItem>Settings</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={logout}>Log out</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
