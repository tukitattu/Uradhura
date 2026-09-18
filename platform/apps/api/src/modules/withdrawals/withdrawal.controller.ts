// ============================================================
// WITHDRAWAL CONTROLLER — player-facing
// Rules enforced server-side; this surface is read/reflect only.
// ============================================================

import { Controller, Get, Post, Body, Param, Query, UseGuards, Request, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody, ApiParam, ApiQuery } from '@nestjs/swagger';
import { WithdrawalService } from './withdrawal.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@ApiTags('Withdrawals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('withdrawals')
export class WithdrawalController {
  constructor(private readonly withdrawals: WithdrawalService) {}

  @Get('status')
  @ApiOperation({ summary: 'Your withdrawal eligibility: rate, monthly remaining, cooldown, methods' })
  @ApiResponse({ status: 200, description: 'Eligibility returned' })
  async status(@Request() req: any) {
    return this.withdrawals.evaluateForPlayer(req.user.sub);
  }

  @Get('me')
  @ApiOperation({ summary: 'Your withdrawal requests' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async my(@Request() req: any, @Query('page') page?: number, @Query('limit') limit?: number) {
    return this.withdrawals.myRequests(req.user.sub, page || 1, limit || 20);
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
  async request(@Request() req: any, @Body() body: { amount: number; methodCode: string; accountHandle: string; accountName?: string; idempotencyKey?: string }) {
    return this.withdrawals.request(req.user.sub, body);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a pending withdrawal (funds returned)' })
  @ApiParam({ name: 'id', description: 'Withdrawal request UUID' })
  async cancel(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.withdrawals.cancel(req.user.sub, id);
  }
}