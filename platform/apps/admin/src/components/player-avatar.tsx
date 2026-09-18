"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn, getStatusColor } from "@/lib/utils";
import type { Player } from "@/lib/types";

interface PlayerAvatarProps {
  player: Player;
  showStatus?: boolean;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-lg",
};

export function PlayerAvatar({ player, showStatus = false, size = "md" }: PlayerAvatarProps) {
  const initials = player.username.slice(0, 2).toUpperCase();

  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <Avatar className={cn(sizeClasses[size])}>
          <AvatarImage src={player.avatar} alt={player.username} />
          <AvatarFallback className="bg-primary/20 text-primary">{initials}</AvatarFallback>
        </Avatar>
        {showStatus && (
          <span
            className={cn(
              "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background",
              player.status === "active" && "bg-green-500",
              player.status === "banned" && "bg-red-500",
              player.status === "suspended" && "bg-yellow-500"
            )}
          />
        )}
      </div>
      <div className="flex flex-col">
        <span className="font-medium">{player.username}</span>
        {showStatus && (
          <Badge variant="outline" className={cn("w-fit text-[10px]", getStatusColor(player.status))}>
            {player.status}
          </Badge>
        )}
      </div>
    </div>
  );
}
