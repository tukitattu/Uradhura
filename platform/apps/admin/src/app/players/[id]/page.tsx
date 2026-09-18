"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { usePlayer, usePlayerBets, useBanPlayer, useUnbanPlayer, useAdjustPlayerWallet } from "@/hooks/use-players";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Ban, CheckCircle, DollarSign, Loader2, Users } from "lucide-react";
import { cn, formatCurrency, formatDate, getStatusColor } from "@/lib/utils";

export default function PlayerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const playerId = params.id as string;

  const { data: player, isLoading: playerLoading } = usePlayer(playerId);
  const { data: betsData, isLoading: betsLoading } = usePlayerBets(playerId);
  const banPlayer = useBanPlayer();
  const unbanPlayer = useUnbanPlayer();
  const adjustWallet = useAdjustPlayerWallet();

  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [banReason, setBanReason] = useState("");

  if (playerLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[100px]" />
          ))}
        </div>
        <Skeleton className="h-[300px]" />
      </div>
    );
  }

  if (!player) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Users className="mb-4 h-12 w-12 opacity-50" />
        <p>Player not found</p>
      </div>
    );
  }

  const handleBan = async () => {
    await banPlayer.mutateAsync({ id: playerId, reason: banReason || "Admin action" });
    setBanReason("");
  };

  const handleUnban = async () => {
    await unbanPlayer.mutateAsync(playerId);
  };

  const handleAdjust = async () => {
    const amount = parseFloat(adjustAmount);
    if (isNaN(amount)) return;
    await adjustWallet.mutateAsync({ playerId, amount, reason: adjustReason || "Admin adjustment" });
    setAdjustAmount("");
    setAdjustReason("");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20 text-lg font-bold text-primary">
            {player.username.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{player.username}</h1>
            <p className="text-sm text-muted-foreground">{player.email}</p>
          </div>
        </div>
        <Badge className={cn("ml-auto", getStatusColor(player.status))}>{player.status}</Badge>
        <div className="flex gap-2">
          {player.status === "active" ? (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="destructive">
                  <Ban className="mr-2 h-4 w-4" />
                  Ban
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Ban Player</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to ban {player.username}? This action can be undone.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-2">
                  <Label>Reason</Label>
                  <Input value={banReason} onChange={(e) => setBanReason(e.target.value)} placeholder="Enter ban reason..." />
                </div>
                <DialogFooter>
                  <Button variant="destructive" onClick={handleBan} disabled={banPlayer.isPending}>
                    {banPlayer.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Ban Player
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : (
            <Button variant="outline" onClick={handleUnban} disabled={unbanPlayer.isPending}>
              {unbanPlayer.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
              Unban
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Wallet Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(player.walletBalance)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Bets</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(player.totalBets)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Win Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {player.totalBets > 0 ? ((player.totalWins / player.totalBets) * 100).toFixed(1) : 0}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Level</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{player.level}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="bets">
        <TabsList>
          <TabsTrigger value="bets">Bet History</TabsTrigger>
          <TabsTrigger value="wallet">Wallet</TabsTrigger>
        </TabsList>

        <TabsContent value="bets">
          <Card>
            <CardHeader>
              <CardTitle>Bet History</CardTitle>
            </CardHeader>
            <CardContent>
              {betsLoading ? (
                <Skeleton className="h-[200px]" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Game</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Option</TableHead>
                      <TableHead>Result</TableHead>
                      <TableHead>Payout</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {betsData?.data.map((bet) => (
                      <TableRow key={bet.id}>
                        <TableCell>{bet.gameName}</TableCell>
                        <TableCell>{formatCurrency(bet.amount)}</TableCell>
                        <TableCell>{bet.option}</TableCell>
                        <TableCell>
                          <Badge variant={bet.result === "win" ? "success" : bet.result === "loss" ? "destructive" : "outline"}>
                            {bet.result}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatCurrency(bet.payout)}</TableCell>
                        <TableCell>{formatDate(bet.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                    {betsData?.data.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                          No bets found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="wallet">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Wallet Adjustment</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Amount (positive to credit, negative to debit)</Label>
                  <Input
                    type="number"
                    value={adjustAmount}
                    onChange={(e) => setAdjustAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Reason</Label>
                  <Input
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    placeholder="Adjustment reason..."
                  />
                </div>
              </div>
              <Button onClick={handleAdjust} disabled={adjustWallet.isPending}>
                {adjustWallet.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <DollarSign className="mr-2 h-4 w-4" />}
                Apply Adjustment
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
