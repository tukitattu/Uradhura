// ============================================================
// ADMIN / SUPER-ADMIN WITHDRAWAL CONTROLLERS
// Rules editing (admin + super_admin), review queue (admin),
// overrides + blacklist (admin), super-admin accounting dashboard.
// ============================================================

import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request, ParseUUIDPipe, Res, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody, ApiParam, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { WithdrawalService, RuleUpdateInput, MethodUpdateInput } from './withdrawal.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Withdrawals Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/withdrawals')
export class AdminWithdrawalController {
  constructor(private readonly withdrawals: WithdrawalService) {}

  @Get('rules')
  @Roles('super_admin', 'admin', 'finance')
  @ApiOperation({ summary: 'Current withdrawal rules' })
  async rules() {
    const rule = await this.withdrawals.getRule();
    const methods = await this.withdrawals.getMethods();
    return { rule, methods };
  }

  @Put('rules')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Update withdrawal rules (live, no code change)' })
  async updateRules(@Request() req: any, @Body() body: RuleUpdateInput) {
    return this.withdrawals.updateRule(body, req.user.sub);
  }

  @Put('methods/:methodCode')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Create/update a withdrawal method' })
  async upsertMethod(@Request() req: any, @Param('methodCode') methodCode: string, @Body() body: MethodUpdateInput) {
    return this.withdrawals.upsertMethod(methodCode, body, req.user.sub);
  }

  @Get()
  @Roles('super_admin', 'admin', 'finance')
  @ApiOperation({ summary: 'Withdrawal queue with filters' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'playerId', required: false })
  @ApiQuery({ name: 'month', required: false, description: 'YYYY-MM' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  async list(@Query() q: { status?: string; playerId?: string; month?: string; page?: string; limit?: string }) {
    return this.withdrawals.listAdmin({
      status: q.status,
      playerId: q.playerId,
      month: q.month,
      page: q.page ? Number(q.page) : 1,
      limit: q.limit ? Number(q.limit) : 20,
    });
  }

  @Post(':id/review')
  @Roles('super_admin', 'admin', 'finance')
  @ApiOperation({ summary: 'Approve / reject / partially approve a withdrawal with reason' })
  @ApiParam({ name: 'id', description: 'Withdrawal request UUID' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['decision'],
      properties: {
        decision: { type: 'string', enum: ['approve', 'reject', 'partial'] },
        reason: { type: 'string' },
        amount: { type: 'number', description: 'Approved amount (partial only)' },
      },
    },
  })
  async review(@Request() req: any, @Param('id', ParseUUIDPipe) id: string, @Body() body: { decision: 'approve' | 'reject' | 'partial'; reason?: string; amount?: number }) {
    if (!body?.decision) throw new BadRequestException('decision is required');
    return this.withdrawals.review(id, req.user.sub, body);
  }

  @Put('players/:playerId/override')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Grant a per-player withdrawal override (custom monthly ceiling / rate)' })
  async setOverride(@Request() req: any, @Param('playerId', ParseUUIDPipe) playerId: string, @Body() body: { maxMonthlyCoins?: number; coinRateOverride?: number; note?: string }) {
    return this.withdrawals.setOverride(playerId, body, req.user.sub);
  }

  @Delete('players/:playerId/override')
  @Roles('super_admin', 'admin')
  async removeOverride(@Request() req: any, @Param('playerId', ParseUUIDPipe) playerId: string) {
    return this.withdrawals.removeOverride(playerId, req.user.sub);
  }

  @Post('blacklist')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Blacklist a player from withdrawals' })
  async blacklist(@Request() req: any, @Body() body: { playerId: string; blacklisted: boolean; reason?: string }) {
    return this.withdrawals.setBlacklist(body, req.user.sub);
  }

  @Post('whitelist')
  @Roles('super_admin', 'admin')
  async whitelist(@Request() req: any, @Body() body: { playerId: string; whitelisted: boolean; reason?: string }) {
    return this.withdrawals.setWhitelist(body, req.user.sub);
  }

  @Get('blacklist')
  @Roles('super_admin', 'admin', 'finance')
  async blacklistList() {
    return this.withdrawals.listBlacklist();
  }
}

@ApiTags('Withdrawals Super Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super_admin')
@Controller('super-admin/withdrawals')
export class SuperAdminWithdrawalController {
  constructor(private readonly withdrawals: WithdrawalService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Real per-admin withdrawal accounting from ledger data' })
  @ApiQuery({ name: 'month', required: false, description: 'YYYY-MM (default current)' })
  @ApiQuery({ name: 'periodStart', required: false })
  @ApiQuery({ name: 'periodEnd', required: false })
  @ApiQuery({ name: 'adminId', required: false })
  @ApiQuery({ name: 'playerId', required: false })
  async dashboard(@Query() q: { month?: string; periodStart?: string; periodEnd?: string; adminId?: string; playerId?: string; status?: string }) {
    return this.withdrawals.dashboard(q);
  }

  @Get('export.csv')
  @ApiOperation({ summary: 'CSV export (opens in Excel / Sheets)' })
  async export(
    @Query() q: { month?: string; periodStart?: string; periodEnd?: string; status?: string },
    @Res() res: Response,
  ) {
    const csv = await this.withdrawals.exportCsv(q);
    const name = `withdrawals-${q.month ?? 'range'}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
    res.send('\uFEFF' + csv);
  }
}