// ============================================================
// WITHDRAWAL CONTROLLER — player-facing
// Rules enforced server-side; this surface is read/reflect only.
// ============================================================

import { Controller, Get, Post, Body, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody, ApiParam, ApiQuery } from '@nestjs/swagger';
import { WithdrawalService } from './withdrawal.service';
import { PlayerAuthGuard } from '../auth/guards/player-auth.guard';
import { CurrentPlayer, CurrentPlayerData } from '../auth/decorators/current-player.decorator';

@ApiTags('Withdrawals')
@ApiBearerAuth()
@UseGuards(PlayerAuthGuard)
@Controller('withdrawals')
export class WithdrawalController {
  constructor(private readonly withdrawals: WithdrawalService) {}

  @Get('status')
  @ApiOperation({ summary: 'Your withdrawal eligibility: rate, monthly remaining, cooldown, methods' })
  @ApiResponse({ status: 200, description: 'Eligibility returned' })
  async status(@CurrentPlayer() player: CurrentPlayerData) {
    return this.withdrawals.evaluateForPlayer(player.sub);
  }

  @Get('me')
  @ApiOperation({ summary: 'Your withdrawal requests' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async my(@CurrentPlayer() player: CurrentPlayerData, @Query('page') page?: number, @Query('limit') limit?: number) {
    const result = await this.withdrawals.myRequests(player.sub, page || 1, limit || 20);
    return {
      data: result.rows.map((r) => ({
        id: r.id,
        amount: String(r.amountCoins),
        status: r.status,
        createdAt: r.createdAt.toISOString(),
      })),
      meta: { total: result.total, page: result.page, limit: result.limit },
    };
  }

  @Post('request')
  @ApiOperation({ summary: 'Request a withdrawal (hold placed on wallet, ledger-immutable)' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['amount', 'methodCode', 'accountHandle'],
      properties: {
        amount: { type: 'number', description: 'Coins to withdraw' },
        methodCode: { type: 'string', example: 'bkash' },
        accountHandle: { type: 'string', example: '01XXXXXXXXX' },
        accountName: { type: 'string' },
        idempotencyKey: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Withdrawal accepted' })
  async request(@CurrentPlayer() player: CurrentPlayerData, @Body() body: { amount: number; methodCode: string; accountHandle: string; accountName?: string; idempotencyKey?: string }) {
    return this.withdrawals.request(player.sub, body);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a pending withdrawal (funds returned)' })
  @ApiParam({ name: 'id', description: 'Withdrawal request UUID' })
  async cancel(@CurrentPlayer() player: CurrentPlayerData, @Param('id', ParseUUIDPipe) id: string) {
    return this.withdrawals.cancel(player.sub, id);
  }
}