// ============================================================
// HEALTH SERVICE
// ============================================================

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class HealthService {
  constructor(private prisma: PrismaService) {}

  async check() {
    const start = Date.now();

    // Check database
    let dbStatus = 'ok';
    let dbLatency = 0;
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      dbLatency = Date.now() - start;
    } catch (error) {
      dbStatus = 'error';
    }

    // Check memory
    const memUsage = process.memoryUsage();

    return {
      status: dbStatus === 'ok' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: {
        status: dbStatus,
        latencyMs: dbLatency,
      },
      memory: {
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        rss: Math.round(memUsage.rss / 1024 / 1024),
      },
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    };
  }

  async getDetailedHealth() {
    const [playerCount, gameCount, activeRounds] = await Promise.all([
      this.prisma.player.count(),
      this.prisma.game.count({ where: { status: 'active' } }),
      this.prisma.gameRound.count({ where: { status: { in: ['betting_open', 'betting_closed'] } } }),
    ]);

    return {
      ...(await this.check()),
      stats: {
        totalPlayers: playerCount,
        activeGames: gameCount,
        activeRounds,
      },
    };
  }
}
