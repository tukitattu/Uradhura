// ============================================================
// PLAYERS CONTROLLER
// ============================================================

import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseUUIDPipe,
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
import { PlayersService } from './players.service';
import { WalletService } from '../wallet/wallet.service';
import { GameEngineService } from '../games/game-engine.service';
import { CreatePlayerDto, UpdatePlayerDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtOrPlayerAuthGuard } from '../auth/guards/jwt-or-player-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Players')
@ApiBearerAuth()
@Controller('players')
export class PlayersController {
  constructor(
    private readonly playersService: PlayersService,
    private readonly walletService: WalletService,
    private readonly gameEngineService: GameEngineService,
  ) {}

  // ============================================================
  // PLAYER MANAGEMENT (admin)
  // ============================================================

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin', 'admin', 'game_operator', 'finance', 'viewer')
  @ApiOperation({ summary: 'List all players (paginated)' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default 20)' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search by username, email, or display name' })
  @ApiResponse({ status: 200, description: 'Players list returned' })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    return this.playersService.findAll(page || 1, limit || 20, search);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Get player statistics (admin)' })
  @ApiResponse({ status: 200, description: 'Player stats returned' })
  async getStats() {
    return this.playersService.getStats();
  }

  @Get(':id')
  @UseGuards(JwtOrPlayerAuthGuard)
  @ApiOperation({ summary: 'Get player profile (admin or player view)' })
  @ApiParam({ name: 'id', description: 'Player UUID' })
  @ApiResponse({ status: 200, description: 'Player profile returned' })
  @ApiResponse({ status: 404, description: 'Player not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    if (req.user?.type === 'player') {
      return { data: await this.playersService.getPlayerProfile(req.user.sub, id) };
    }
    return { data: await this.playersService.findOne(id) };
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Update player profile' })
  @ApiParam({ name: 'id', description: 'Player UUID' })
  @ApiBody({ type: UpdatePlayerDto })
  @ApiResponse({ status: 200, description: 'Player updated' })
  @ApiResponse({ status: 404, description: 'Player not found' })
  @ApiResponse({ status: 409, description: 'Username or email already exists' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePlayerDto,
  ) {
    return this.playersService.update(id, dto);
  }

  // ============================================================
  // BAN / UNBAN
  // ============================================================

  @Post(':id/ban')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin', 'admin', 'moderator')
  @ApiOperation({ summary: 'Ban a player (moderator+)' })
  @ApiParam({ name: 'id', description: 'Player UUID' })
  @ApiBody({ schema: { properties: { reason: { type: 'string', example: 'Violation of terms' } }, required: ['reason'] } })
  @ApiResponse({ status: 200, description: 'Player banned' })
  @ApiResponse({ status: 404, description: 'Player not found' })
  async ban(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
  ) {
    return this.playersService.ban(id, reason);
  }

  @Post(':id/unban')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin', 'admin', 'moderator')
  @ApiOperation({ summary: 'Unban a player (moderator+)' })
  @ApiParam({ name: 'id', description: 'Player UUID' })
  @ApiResponse({ status: 200, description: 'Player unbanned' })
  @ApiResponse({ status: 404, description: 'Player not found' })
  async unban(@Param('id', ParseUUIDPipe) id: string) {
    return this.playersService.unban(id);
  }

  // ============================================================
  // PLAYER WALLET & BETS
  // ============================================================

  @Get(':id/wallet')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin', 'admin', 'finance')
  @ApiOperation({ summary: 'Get player wallet balance' })
  @ApiParam({ name: 'id', description: 'Player UUID' })
  @ApiResponse({ status: 200, description: 'Wallet balance returned' })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
  async getPlayerWallet(@Param('id', ParseUUIDPipe) id: string) {
    return this.walletService.getBalance(id);
  }

  @Get(':id/bets')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin', 'admin', 'game_operator', 'finance')
  @ApiOperation({ summary: 'Get player bet history' })
  @ApiParam({ name: 'id', description: 'Player UUID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'gameId', required: false, type: String, description: 'Filter by game ID' })
  @ApiResponse({ status: 200, description: 'Player bets returned' })
  async getPlayerBets(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('gameId') gameId?: string,
  ) {
    return this.gameEngineService.getPlayerBets(id, gameId || '', page || 1, limit || 20);
  }
}
