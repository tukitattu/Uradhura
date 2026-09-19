"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  collapsed?: boolean;
}

const Sidebar = React.forwardRef<HTMLDivElement, SidebarProps>(
  ({ className, collapsed = false, ...props }, ref) => (
    <aside
      ref={ref}
      className={cn(
        "flex h-screen flex-col border-r bg-card transition-all duration-300",
        collapsed ? "w-16" : "w-64",
        className
      )}
      {...props}
    />
  )
);
Sidebar.displayName = "Sidebar";

const SidebarHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex h-14 items-center border-b px-4", className)} {...props} />
  )
);
SidebarHeader.displayName = "SidebarHeader";

const SidebarContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex-1 overflow-auto", className)} {...props} />
  )
);
SidebarContent.displayName = "SidebarContent";

const SidebarFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("border-t p-4", className)} {...props} />
  )
);
SidebarFooter.displayName = "SidebarFooter";

const SidebarMenu = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <nav ref={ref} className={cn("flex flex-col gap-1 p-2", className)} {...props} />
  )
);
SidebarMenu.displayName = "SidebarMenu";

const SidebarMenuItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("", className)} {...props} />
  )
);
SidebarMenuItem.displayName = "SidebarMenuItem";

const SidebarMenuButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> &
    React.RefAttributes<HTMLButtonElement> & { active?: boolean; collapsed?: boolean; asChild?: boolean }
>(({ className, active, collapsed, asChild = false, ...props }, ref) => {
  const Comp: React.ElementType = asChild ? Slot : "button";
  return (
    <Comp
      ref={ref}
      className={cn(
        "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted",
        active && "bg-primary/10 text-primary",
        collapsed && "justify-center px-2",
        className
      )}
      type={asChild ? undefined : "button"}
      {...props}
    />
  );
});
SidebarMenuButton.displayName = "SidebarMenuButton";

const SidebarMenuLabel = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement> & { collapsed?: boolean }
>(({ className, collapsed, ...props }, ref) => {
  if (collapsed) return null;
  return <span ref={ref} className={cn("flex-1 truncate", className)} {...props} />;
});
SidebarMenuLabel.displayName = "SidebarMenuLabel";

const SidebarMenuIcon = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
  ({ className, ...props }, ref) => (
    <span ref={ref} className={cn("flex h-5 w-5 shrink-0 items-center justify-center", className)} {...props} />
  )
);
SidebarMenuIcon.displayName = "SidebarMenuIcon";

export {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuLabel,
  SidebarMenuIcon,
};
