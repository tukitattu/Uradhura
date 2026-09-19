// ============================================================
// DASHBOARD CONTROLLER — Admin KPIs
// ============================================================

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Platform KPIs (real data, empty states when none)' })
  async stats() {
    return { data: await this.dashboardService.getStats() };
  }

  @Get('revenue-chart')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Daily wager/payout series' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  async revenueChart(@Query('days') days?: number) {
    return { data: await this.dashboardService.getRevenueChart(Number(days) || 14) };
  }

  @Get('player-chart')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Daily player registrations' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  async playerChart(@Query('days') days?: number) {
    return { data: await this.dashboardService.getPlayerChart(Number(days) || 14) };
  }

  @Get('top-games')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Games by wagered volume' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async topGames(@Query('limit') limit?: number) {
    return { data: await this.dashboardService.getTopGames(Number(limit) || 6) };
  }
}