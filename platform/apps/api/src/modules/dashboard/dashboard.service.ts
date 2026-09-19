// ============================================================
// DASHBOARD SERVICE — Real KPIs from live data
// ignores demo/fake data; returns empty states when none exists
// ============================================================

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [
      totalPlayers,
      totalGames,
      activeGames,
      liveRounds,
      totalWallets,
      totalBets,
      pendingReports,
      roundAgg,
      playersToday,
    ] = await Promise.all([
      this.prisma.player.count(),
      this.prisma.game.count(),
      this.prisma.game.count({ where: { status: 'active' } }),
      this.prisma.gameRound.count({ where: { status: 'betting_open' } }),
      this.prisma.walletAccount.count(),
      this.prisma.gameBet.count(),
      this.prisma.report.count({ where: { status: 'pending' } }),
      this.prisma.gameRound.aggregate({
        _sum: { totalBetAmount: true, totalPayout: true },
        _count: true,
      }),
      this.prisma.player.count({ where: { createdAt: { gte: dayAgo } } }),
    ]);

    const totalWager = roundAgg._sum.totalBetAmount
      ? roundAgg._sum.totalBetAmount.toNumber()
      : 0;
    const totalPayout = roundAgg._sum.totalPayout
      ? roundAgg._sum.totalPayout.toNumber()
      : 0;

    return {
      totalPlayers,
      totalGames,
      activeGames,
      liveRounds,
      totalWallets,
      totalBets: roundAgg._count,
      pendingReports,
      totalWager,
      totalPayout,
      playersToday,
    };
  }

  private dayKey(d: Date): string {
    return d.toISOString().slice(0, 10);
  }

  private lastNDays(n: number): string[] {
    const keys: string[] = [];
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      keys.push(this.dayKey(d));
    }
    return keys;
  }

  async getRevenueChart(days = 14) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const settled = await this.prisma.gameRound.findMany({
      where: { status: 'settled', settledAt: { gte: since } },
      select: { settledAt: true, createdAt: true, totalBetAmount: true, totalPayout: true },
    });

    const byDay = new Map<string, { wager: number; payout: number }>();
    for (const r of settled) {
      const key = r.settledAt ? this.dayKey(r.settledAt) : this.dayKey(r.createdAt);
      const entry = byDay.get(key) || { wager: 0, payout: 0 };
      entry.wager += r.totalBetAmount ? r.totalBetAmount.toNumber() : 0;
      entry.payout += r.totalPayout ? r.totalPayout.toNumber() : 0;
      byDay.set(key, entry);
    }

    return this.lastNDays(days).map((key) => ({
      date: key,
      wager: byDay.get(key)?.wager ?? 0,
      payout: byDay.get(key)?.payout ?? 0,
    }));
  }

  async getPlayerChart(days = 14) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const players = await this.prisma.player.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true },
    });

    const byDay = new Map<string, number>();
    for (const p of players) {
      const key = this.dayKey(p.createdAt);
      byDay.set(key, (byDay.get(key) || 0) + 1);
    }

    return this.lastNDays(days).map((key) => ({
      date: key,
      registrations: byDay.get(key) ?? 0,
    }));
  }

  async getTopGames(limit = 6) {
    const rows = await this.prisma.gameRound.groupBy({
      by: ['gameId'],
      _sum: { totalBetAmount: true, totalPayout: true },
      _count: true,
    });

    const totals = rows
      .map((r) => ({
        gameId: r.gameId,
        wager: r._sum.totalBetAmount ? r._sum.totalBetAmount.toNumber() : 0,
        payout: r._sum.totalPayout ? r._sum.totalPayout.toNumber() : 0,
        rounds: r._count,
      }))
      .sort((a, b) => b.wager - a.wager)
      .slice(0, limit);

    if (totals.length === 0) return [];

    const games = await this.prisma.game.findMany({
      where: { id: { in: totals.map((t) => t.gameId) } },
      select: { id: true, name: true, displayName: true, icon: true },
    });

    const byId = new Map(games.map((g) => [g.id, g]));
    return totals.map((t) => {
      const g = byId.get(t.gameId);
      return {
        gameId: t.gameId,
        name: g?.displayName || g?.name || t.gameId,
        icon: g?.icon ?? null,
        wager: t.wager,
        payout: t.payout,
        rounds: t.rounds,
      };
    });
  }
}