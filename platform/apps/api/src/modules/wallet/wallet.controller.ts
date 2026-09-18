// ============================================================
// WALLET CONTROLLER
// ============================================================

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseUUIDPipe,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Wallet')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('wallet')
export class WalletController {
  constructor(
    private readonly walletService: WalletService,
    private readonly prisma: PrismaService,
  ) {}

  // ============================================================
  // PLAYER WALLET (self)
  // ============================================================

  @Get('balance')
  @ApiOperation({ summary: 'Get own wallet balance' })
  @ApiResponse({ status: 200, description: 'Balance retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
  async getBalance(@Request() req: any) {
    return this.walletService.getBalance(req.user.sub);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Get own transaction history' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default 20)' })
  @ApiQuery({ name: 'currency', required: false, enum: ['coins', 'diamonds'], description: 'Filter by currency' })
  @ApiQuery({ name: 'type', required: false, type: String, description: 'Filter by transaction type' })
  @ApiResponse({ status: 200, description: 'Transactions returned' })
  async getTransactions(
    @Request() req: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('currency') currency?: 'coins' | 'diamonds',
    @Query('type') type?: string,
  ) {
    return this.walletService.getTransactionHistory(req.user.sub, page || 1, limit || 20, {
      currency,
      type,
    });
  }

  // ============================================================
  // ADMIN WALLET OPERATIONS
  // ============================================================

  @Get('player/:playerId')
  @Roles('super_admin', 'admin', 'finance')
  @ApiOperation({ summary: 'Get player wallet balance (admin)' })
  @ApiParam({ name: 'playerId', description: 'Target player UUID' })
  @ApiResponse({ status: 200, description: 'Player balance returned' })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
  async getPlayerWallet(@Param('playerId', ParseUUIDPipe) playerId: string) {
    return this.walletService.getBalance(playerId);
  }

  @Get('player/:playerId/transactions')
  @Roles('super_admin', 'admin', 'finance')
  @ApiOperation({ summary: 'Get player transaction history (admin)' })
  @ApiParam({ name: 'playerId', description: 'Target player UUID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'currency', required: false, enum: ['coins', 'diamonds'] })
  @ApiQuery({ name: 'type', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Player transactions returned' })
  async getPlayerTransactions(
    @Param('playerId', ParseUUIDPipe) playerId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('currency') currency?: 'coins' | 'diamonds',
    @Query('type') type?: string,
  ) {
    return this.walletService.getTransactionHistory(playerId, page || 1, limit || 20, {
      currency,
      type,
    });
  }

  @Post('adjust/:playerId')
  @Roles('super_admin', 'admin', 'finance')
  @ApiOperation({ summary: 'Admin manual wallet adjustment' })
  @ApiParam({ name: 'playerId', description: 'Target player UUID' })
  @ApiBody({
    schema: {
      properties: {
        currency: { type: 'string', enum: ['coins', 'diamonds'] },
        amount: { type: 'number', description: 'Positive to credit, negative to debit' },
        reason: { type: 'string', description: 'Reason for the adjustment' },
      },
      required: ['currency', 'amount', 'reason'],
    },
  })
  @ApiResponse({ status: 201, description: 'Adjustment recorded' })
  @ApiResponse({ status: 400, description: 'Invalid adjustment amount or missing reason' })
  async adjustWallet(
    @Param('playerId', ParseUUIDPipe) playerId: string,
    @Body() body: { currency: 'coins' | 'diamonds'; amount: number; reason: string; idempotencyKey?: string },
    @Request() req: any,
  ) {
    const exists = await this.prisma.player.findUnique({
      where: { id: playerId },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException(`Player ${playerId} not found`);
    return this.walletService.adminAdjustment(
      playerId,
      body.currency,
      body.amount,
      req.user.sub,
      body.reason,
      body.idempotencyKey,
    );
  }

  @Get('stats')
  @Roles('super_admin', 'admin', 'finance')
  @ApiOperation({ summary: 'Get wallet statistics (admin)' })
  @ApiResponse({ status: 200, description: 'Wallet stats returned' })
  async getStats() {
    return this.walletService.getStats();
  }
}
