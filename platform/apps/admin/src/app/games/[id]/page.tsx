"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useGame, useGameOptions, useUpdateGame, useCreateGameOption, useUpdateGameOption, useDeleteGameOption } from "@/hooks/use-games";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { ArrowLeft, Save, Plus, Trash2, Loader2, Gamepad2 } from "lucide-react";
import { cn, formatCurrency, getStatusColor } from "@/lib/utils";

export default function GameDetailPage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.id as string;

  const { data: game, isLoading: gameLoading } = useGame(gameId);
  const { data: options = [], isLoading: optionsLoading } = useGameOptions(gameId);
  const updateGame = useUpdateGame();
  const createOption = useCreateGameOption();
  const updateOption = useUpdateGameOption();
  const deleteOption = useDeleteGameOption();

  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editMinBet, setEditMinBet] = useState("");
  const [editMaxBet, setEditMaxBet] = useState("");
  const [editRtp, setEditRtp] = useState("");
  const [editStatus, setEditStatus] = useState("");

  const [newOptionName, setNewOptionName] = useState("");
  const [newOptionValue, setNewOptionValue] = useState("");
  const [newOptionMultiplier, setNewOptionMultiplier] = useState("");
  const [newOptionProbability, setNewOptionProbability] = useState("");

  const [editOptionDialog, setEditOptionDialog] = useState<string | null>(null);
  const [editOptionMultiplier, setEditOptionMultiplier] = useState("");
  const [editOptionProbability, setEditOptionProbability] = useState("");

  if (gameLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  if (!game) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Gamepad2 className="mb-4 h-12 w-12 opacity-50" />
        <p>Game not found</p>
      </div>
    );
  }

  const handleSaveGame = async () => {
    await updateGame.mutateAsync({
      id: gameId,
      name: editName || game.name,
      description: editDescription || game.description,
      minBet: editMinBet ? parseFloat(editMinBet) : game.minBet,
      maxBet: editMaxBet ? parseFloat(editMaxBet) : game.maxBet,
      rtp: editRtp ? parseFloat(editRtp) : game.rtp,
      status: (editStatus || game.status) as "active" | "inactive" | "maintenance",
    });
  };

  const handleCreateOption = async () => {
    await createOption.mutateAsync({
      gameId,
      name: newOptionName,
      value: newOptionValue,
      multiplier: parseFloat(newOptionMultiplier),
      probability: parseFloat(newOptionProbability),
      isActive: true,
    });
    setNewOptionName("");
    setNewOptionValue("");
    setNewOptionMultiplier("");
    setNewOptionProbability("");
  };

  const handleUpdateOption = async (optionId: string) => {
    await updateOption.mutateAsync({
      gameId,
      id: optionId,
      multiplier: parseFloat(editOptionMultiplier),
      probability: parseFloat(editOptionProbability),
    });
    setEditOptionDialog(null);
  };

  const handleDeleteOption = async (optionId: string) => {
    await deleteOption.mutateAsync({ gameId, id: optionId });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{game.name}</h1>
          <p className="text-sm text-muted-foreground">{game.provider}</p>
        </div>
        <Badge className={cn("ml-auto", getStatusColor(game.status))}>{game.status}</Badge>
      </div>

      <Tabs defaultValue="config">
        <TabsList>
          <TabsTrigger value="config">Configuration</TabsTrigger>
          <TabsTrigger value="options">Game Options</TabsTrigger>
          <TabsTrigger value="stats">Statistics</TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Game Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input defaultValue={game.name} onChange={(e) => setEditName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <select
                    defaultValue={game.status}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Description</Label>
                  <textarea
                    defaultValue={game.description}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Min Bet</Label>
                  <Input
                    type="number"
                    defaultValue={game.minBet}
                    onChange={(e) => setEditMinBet(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max Bet</Label>
                  <Input
                    type="number"
                    defaultValue={game.maxBet}
                    onChange={(e) => setEditMaxBet(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>RTP (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    defaultValue={game.rtp}
                    onChange={(e) => setEditRtp(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Volatility</Label>
                  <Badge variant="outline">{game.volatility}</Badge>
                </div>
              </div>
              <Button onClick={handleSaveGame} disabled={updateGame.isPending}>
                {updateGame.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="options" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Game Options</span>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Option
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Game Option</DialogTitle>
                      <DialogDescription>Create a new option for this game.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Name</Label>
                        <Input value={newOptionName} onChange={(e) => setNewOptionName(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Value</Label>
                        <Input value={newOptionValue} onChange={(e) => setNewOptionValue(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Multiplier</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={newOptionMultiplier}
                          onChange={(e) => setNewOptionMultiplier(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Probability (%)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={newOptionProbability}
                          onChange={(e) => setNewOptionProbability(e.target.value)}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleCreateOption} disabled={createOption.isPending}>
                        {createOption.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {optionsLoading ? (
                <Skeleton className="h-[200px]" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Multiplier</TableHead>
                      <TableHead>Probability</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {options.map((opt) => (
                      <TableRow key={opt.id}>
                        <TableCell>{opt.name}</TableCell>
                        <TableCell>{opt.value}</TableCell>
                        <TableCell>{opt.multiplier}x</TableCell>
                        <TableCell>{opt.probability}%</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Dialog
                              open={editOptionDialog === opt.id}
                              onOpenChange={(open) => {
                                if (open) {
                                  setEditOptionDialog(opt.id);
                                  setEditOptionMultiplier(String(opt.multiplier));
                                  setEditOptionProbability(String(opt.probability));
                                } else {
                                  setEditOptionDialog(null);
                                }
                              }}
                            >
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm">Edit</Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Edit Option</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div className="space-y-2">
                                    <Label>Multiplier</Label>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={editOptionMultiplier}
                                      onChange={(e) => setEditOptionMultiplier(e.target.value)}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Probability (%)</Label>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={editOptionProbability}
                                      onChange={(e) => setEditOptionProbability(e.target.value)}
                                    />
                                  </div>
                                </div>
                                <DialogFooter>
                                  <Button onClick={() => handleUpdateOption(opt.id)} disabled={updateOption.isPending}>
                                    {updateOption.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Save
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteOption(opt.id)}
                              disabled={deleteOption.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {options.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                          No options configured
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Total Rounds</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{game.totalRounds.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Total Bets</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatCurrency(game.totalBets)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Total Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatCurrency(game.totalRevenue)}</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
