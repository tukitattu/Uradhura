"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, formatCurrency, getStatusColor } from "@/lib/utils";
import { Gamepad2, Users, TrendingUp } from "lucide-react";
import type { Game } from "@/lib/types";

interface GameCardProps {
  game: Game;
  onClick?: () => void;
}

export function GameCard({ game, onClick }: GameCardProps) {
  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5",
        onClick && "hover:scale-[1.02]"
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Gamepad2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">{game.name}</CardTitle>
              <p className="text-xs text-muted-foreground">{game.provider}</p>
            </div>
          </div>
          <Badge className={cn(getStatusColor(game.status))}>{game.status}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div>
            <p className="text-muted-foreground">RTP</p>
            <p className="font-medium">{game.rtp}%</p>
          </div>
          <div>
            <p className="text-muted-foreground">Min Bet</p>
            <p className="font-medium">{formatCurrency(game.minBet)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Max Bet</p>
            <p className="font-medium">{formatCurrency(game.maxBet)}</p>
          </div>
        </div>
        <div className="flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            <span>{game.totalRounds} rounds</span>
          </div>
          <div className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            <span>{formatCurrency(game.totalRevenue)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
