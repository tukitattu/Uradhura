// ============================================================
// ADMIN / SUPER-ADMIN TEEN PATTI CONFIG

// Global dynamic game rules (get/edit/reset) and per-table shape
// overrides. Backend remains authoritative; the engine reads
// these values live — no code changes to reconfigure the game.
// ============================================================

import { Controller, Get, Put, Post, Body, Param, Query, UseGuards, Request, ParseUUIDPipe, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TeenPattiConfigService, TPConfigPatch } from './teen-patti-config.service';
import { TeenPattiService } from './teen-patti.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Teen Patti Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/teen-patti')
export class AdminTeenPattiController {
  constructor(
    private readonly config: TeenPattiConfigService,
    private readonly teenPatti: TeenPattiService,
  ) {}

  @Get('config')
  @Roles('super_admin', 'admin', 'game_operator', 'finance')
  @ApiOperation({ summary: 'Current dynamic Teen Patti rules (versioned)' })
  async get() {
    return this.config.getConfig();
  }

  @Put('config')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Update dynamic Teen Patti rules (live, no code change)' })
  async update(@Request() req: any, @Body() body: TPConfigPatch) {
    return this.config.updateConfig(body, req.user.sub);
  }

  @Post('config/reset')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Reset all Teen Patti rules to defaults' })
  async reset(@Request() req: any) {
    return this.config.resetToDefaults(req.user.sub);
  }

  @Get('tables')
  @Roles('super_admin', 'admin', 'game_operator', 'finance')
  async tables() {
    return this.teenPatti.listTables();
  }

  @Put('tables/:id')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Override shape (bootAmount / limits / seats) of one table' })
  async updateTable(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { bootAmount?: number; chaalCap?: number; minBuyIn?: number; maxBuyIn?: number; maxSeats?: number; minPlayers?: number; title?: string; botFill?: boolean },
  ) {
    if (!Object.keys(body).length) throw new BadRequestException('Nothing to update');
    return this.teenPatti.updateTable(id, body, req.user.sub);
  }

  @Post('tables')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Create a Teen Patti table (auto-assigns a unique table code)' })
  async createTable(
    @Request() req: any,
    @Body() body: { bootAmount?: number; title?: string; minBuyIn?: number; maxBuyIn?: number; botFill?: boolean; botReserve?: number },
  ) {
    return this.teenPatti.createTable(body, req.user.sub);
  }

  @Post('tables/:id/close')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Close a table and cash out every seated player' })
  async closeTable(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.teenPatti.closeTable(id, req.user.sub);
  }

  @Post('tables/:id/kick')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Remove a specific player from a table and cash them out' })
  async kickPlayer(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { playerId: string },
  ) {
    if (!body.playerId) throw new BadRequestException('playerId is required');
    return this.teenPatti.kickPlayer(id, body.playerId, req.user.sub);
  }

  @Get('tables/:id/hands')
  @Roles('super_admin', 'admin', 'game_operator', 'finance')
  @ApiOperation({ summary: 'Paged hand history for a table (with seat hands and actions)' })
  async handHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.teenPatti.handHistory(id, page ? parseInt(page, 10) : 1, limit ? parseInt(limit, 10) : 20);
  }

  @Get('rake')
  @Roles('super_admin', 'admin', 'game_operator', 'finance')
  @ApiOperation({ summary: 'Rake collected from finished Teen Patti hands, grouped by table' })
  async rakeSummary() {
    return this.teenPatti.rakeSummary();
  }

  @Post('config/apply-to-tables')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Push current global rules onto all open/playing tables' })
  async applyConfig(@Request() req: any) {
    return this.teenPatti.applyConfigToTables(req.user.sub);
  }
}