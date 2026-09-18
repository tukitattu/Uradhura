// ============================================================
// PLAYER GAMES CONTROLLER — public + player-authenticated reads
// ============================================================

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { GameEngineService } from './game-engine.service';
import { SeedService } from './seed.service';
import { WalletIntegrationService } from './wallet-integration.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PlayerAuthGuard } from '../auth/guards/player-auth.guard';
import { CurrentPlayer, CurrentPlayerData } from '../auth/decorators/current-player.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Decimal } from '@prisma/client/runtime/library';
import { createHash } from 'crypto';

@ApiTags('Player Games')
@Controller('games')
export class PlayerGamesController {
  constructor(
    private readonly engine: GameEngineService,
    private readonly seedService: SeedService,
    private readonly walletService: WalletIntegrationService,
    private readonly prisma: PrismaService,
  ) {}

  @Get(':id/current-round')
  @Public()
  @ApiOperation({ summary: 'Get the current live round for a game (public)' })
  async currentRound(@Param('id', ParseUUIDPipe) id: string) {
    const state = await this.engine.getGameState(id);
    const totals = await this.getBetTotals(state.currentRound?.id);
    return {
      round: state.currentRound,
      options: state.options,
      config: state.config,
      betConfig: state.betConfig,
      seed: state.seedState,
      betTotals: totals,
      serverTime: Date.now(),
    };
  }

  @Get(':id/history')
  @Public()
  @ApiOperation({ summary: 'Recent settled rounds (public history strip)' })
  async history(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('limit') limit?: string,
  ) {
    const take = Math.min(Number(limit) || 20, 50);
    const rounds = await this.prisma.gameRound.findMany({
      where: { gameId: id, status: 'settled' },
      orderBy: { roundNumber: 'desc' },
      take,
      select: {
        id: true,
        roundNumber: true,
        winnerId: true,
        winnerLabel: true,
        resultData: true,
        totalBetAmount: true,
        totalPayout: true,
        settledAt: true,
      },
    });
    return rounds.map((r) => ({
      roundId: r.id,
      roundNumber: r.roundNumber,
      winningOptionId: r.winnerId,
      winningLabel: r.winnerLabel,
      resultData: r.resultData ? JSON.parse(r.resultData) : null,
      totalBetAmount: r.totalBetAmount.toString(),
      totalPayout: r.totalPayout.toString(),
      settledAt: r.settledAt,
    }));
  }

  @Get(':id/state')
  @UseGuards(PlayerAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Full state for the logged-in player' })
  async playerState(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentPlayer() player: CurrentPlayerData,
  ) {
    const state = await this.engine.getGameState(id);
    const totals = await this.getBetTotals(state.currentRound?.id);
    const balance = await this.walletService.getBalance(player.sub);
    const myBets = state.currentRound
      ? await this.prisma.gameBet.findMany({
          where: { roundId: state.currentRound.id, playerId: player.sub },
          select: { id: true, optionId: true, amount: true, status: true, payout: true },
        })
      : [];

    return {
      round: state.currentRound,
      options: state.options,
      config: state.config,
      betConfig: state.betConfig,
      game: state.game,
      seed: state.seedState,
      betTotals: totals,
      myBets,
      balance: {
        coins: balance.coinBalance.toString(),
        diamonds: balance.diamondBalance.toString(),
      },
      serverTime: Date.now(),
    };
  }

  @Get(':id/seed')
  @Public()
  @ApiOperation({ summary: 'Current round seed commitment (public)' })
  async seed(@Param('id', ParseUUIDPipe) id: string) {
    const state = await this.engine.getGameState(id);
    return state.seedState;
  }

  @Post(':id/seed')
  @UseGuards(PlayerAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Set your client seed for future rounds' })
  async rotateSeed(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentPlayer() player: CurrentPlayerData,
    @Body() body: { clientSeed: string },
  ) {
    if (!body?.clientSeed) throw new BadRequestException('clientSeed is required');
    return this.seedService.setClientSeed(player.sub, id, body.clientSeed);
  }

  @Post('verify')
  @Public()
  @ApiOperation({ summary: 'Verify a settled round is provably fair (public)' })
  async verify(@Body() body: { roundId: string }) {
    if (!body?.roundId) throw new BadRequestException('roundId is required');

    const seed = await this.prisma.gameSeed.findUnique({ where: { roundId: body.roundId } });
    if (!seed) throw new BadRequestException('No seed found for this round');
    if (!seed.revealedAt) {
      throw new BadRequestException('Seed not revealed yet — round has not settled');
    }

    const serverSeedHash = createHash('sha256').update(seed.serverSeed).digest('hex');
    const valid = serverSeedHash === seed.serverSeedHash;

    return {
      roundId: body.roundId,
      algorithm: 'HMAC-SHA256',
      serverSeedHash: seed.serverSeedHash,
      clientSeed: seed.clientSeed,
      nonce: seed.nonce,
      revealedServerSeed: seed.serverSeed,
      hashMatchesCommitment: valid,
      valid,
    };
  }

  private async getBetTotals(roundId?: string): Promise<Record<string, { count: number; total: string }>> {
    if (!roundId) return {};
    const bets = await this.prisma.gameBet.findMany({
      where: { roundId },
      select: { optionId: true, amount: true },
    });
    const totals: Record<string, { count: number; total: string }> = {};
    for (const bet of bets) {
      const entry = totals[bet.optionId] ?? { count: 0, total: '0' };
      entry.count += 1;
      entry.total = new Decimal(entry.total).add(new Decimal(bet.amount)).toString();
      totals[bet.optionId] = entry;
    }
    return totals;
  }
}