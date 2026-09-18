// ============================================================
// GAMES CONTROLLER
// ============================================================

import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseUUIDPipe,
  ParseBoolPipe,
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
import { GamesService } from './games.service';
import { GameOptionService } from './game-option.service';
import { GameConfigService } from './game-config.service';
import { CreateGameDto, UpdateGameDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Games')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('games')
export class GamesController {
  constructor(
    private readonly gamesService: GamesService,
    private readonly optionService: GameOptionService,
    private readonly configService: GameConfigService,
  ) {}

  // ============================================================
  // GAME CRUD
  // ============================================================

  @Post()
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Create a new game' })
  @ApiBody({ type: CreateGameDto })
  @ApiResponse({ status: 201, description: 'Game created successfully' })
  @ApiResponse({ status: 409, description: 'Internal code already exists' })
  async create(@Body() dto: CreateGameDto) {
    return this.gamesService.create(dto);
  }

  @Get()
  @Roles('super_admin', 'admin', 'game_operator', 'viewer')
  @ApiOperation({ summary: 'List all games' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  async findAll(
    @Query('includeInactive', new ParseBoolPipe({ optional: true })) includeInactive?: boolean,
  ) {
    return this.gamesService.findAll(includeInactive);
  }

  @Get('stats')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Get game statistics' })
  @ApiResponse({ status: 200, description: 'Game stats returned' })
  async getStats() {
    return this.gamesService.getStats();
  }

  @Get('active')
  @Public()
  @ApiOperation({ summary: 'Get active games (public)' })
  @ApiResponse({ status: 200, description: 'Active games returned' })
  async getActiveGames() {
    return this.gamesService.getActiveGames();
  }

  @Get('code/:internalCode')
  @Public()
  @ApiOperation({ summary: 'Get game by internal code (public)' })
  @ApiParam({ name: 'internalCode', description: 'Unique game internal code' })
  @ApiResponse({ status: 200, description: 'Game found' })
  @ApiResponse({ status: 404, description: 'Game not found' })
  async findByCode(@Param('internalCode') internalCode: string) {
    return this.gamesService.findByCode(internalCode);
  }

  @Get(':id')
  @Roles('super_admin', 'admin', 'game_operator', 'viewer')
  @ApiOperation({ summary: 'Get game by ID' })
  @ApiParam({ name: 'id', description: 'Game UUID' })
  @ApiResponse({ status: 200, description: 'Game found' })
  @ApiResponse({ status: 404, description: 'Game not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.gamesService.findOne(id);
  }

  @Patch(':id')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Update game' })
  @ApiParam({ name: 'id', description: 'Game UUID' })
  @ApiBody({ type: UpdateGameDto })
  @ApiResponse({ status: 200, description: 'Game updated' })
  @ApiResponse({ status: 404, description: 'Game not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateGameDto,
  ) {
    return this.gamesService.update(id, dto);
  }

  @Patch(':id/status')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Update game status' })
  @ApiParam({ name: 'id', description: 'Game UUID' })
  @ApiBody({ schema: { properties: { status: { type: 'string', enum: ['inactive', 'active', 'maintenance'] } } } })
  @ApiResponse({ status: 200, description: 'Status updated' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: string,
  ) {
    return this.gamesService.updateStatus(id, status);
  }

  // ============================================================
  // GAME OPTIONS
  // ============================================================

  @Post(':id/options')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Add a game option' })
  @ApiParam({ name: 'id', description: 'Game UUID' })
  @ApiBody({
    schema: {
      properties: {
        name: { type: 'string', example: 'red' },
        label: { type: 'string', example: 'Red' },
        icon: { type: 'string' },
        image: { type: 'string' },
        multiplier: { type: 'number', example: 2 },
        weight: { type: 'number', example: 1 },
        colorHex: { type: 'string', example: '#ff0000' },
        positionX: { type: 'number' },
        positionY: { type: 'number' },
        isHot: { type: 'boolean' },
        isRecommended: { type: 'boolean' },
        sortOrder: { type: 'number' },
        metadata: { type: 'object' },
      },
      required: ['name', 'label', 'multiplier'],
    },
  })
  @ApiResponse({ status: 201, description: 'Option created' })
  async addOption(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: any,
  ) {
    return this.optionService.create(id, data);
  }

  @Get(':id/options')
  @Roles('super_admin', 'admin', 'game_operator', 'viewer')
  @ApiOperation({ summary: 'List game options' })
  @ApiParam({ name: 'id', description: 'Game UUID' })
  @ApiResponse({ status: 200, description: 'Options returned' })
  async listOptions(@Param('id', ParseUUIDPipe) id: string) {
    return this.optionService.findAll(id);
  }

  @Patch(':id/options/reorder')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Reorder game options' })
  @ApiParam({ name: 'id', description: 'Game UUID' })
  @ApiBody({ schema: { properties: { optionIds: { type: 'array', items: { type: 'string' } } }, required: ['optionIds'] } })
  @ApiResponse({ status: 200, description: 'Options reordered' })
  async reorderOptions(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('optionIds') optionIds: string[],
  ) {
    return this.optionService.reorder(id, optionIds);
  }

  @Delete('options/:optionId')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Delete a game option' })
  @ApiParam({ name: 'optionId', description: 'Option UUID' })
  @ApiResponse({ status: 200, description: 'Option deleted' })
  @ApiResponse({ status: 404, description: 'Option not found' })
  async deleteOption(@Param('optionId', ParseUUIDPipe) optionId: string) {
    return this.optionService.delete(optionId);
  }

  // ============================================================
  // GAME CONFIGURATION
  // ============================================================

  @Get(':id/config')
  @Roles('super_admin', 'admin', 'game_operator')
  @ApiOperation({ summary: 'Get active game configuration' })
  @ApiParam({ name: 'id', description: 'Game UUID' })
  @ApiResponse({ status: 200, description: 'Active config returned' })
  @ApiResponse({ status: 404, description: 'No active config found' })
  async getActiveConfig(@Param('id', ParseUUIDPipe) id: string) {
    return this.configService.getActiveConfig(id);
  }

  @Post(':id/config')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Create a new configuration version' })
  @ApiParam({ name: 'id', description: 'Game UUID' })
  @ApiBody({
    schema: {
      properties: {
        houseEdge: { type: 'number', example: 0.05 },
        maxPayoutPerRound: { type: 'number' },
        jackpotWeight: { type: 'number' },
        vipAdjustment: { type: 'number' },
        maxDailyLossPerPlayer: { type: 'number' },
        bettingDurationSeconds: { type: 'number', example: 30 },
        roundDurationSeconds: { type: 'number' },
        resultProcessingDelayMs: { type: 'number' },
        newRoundDelayMs: { type: 'number' },
        minPlayers: { type: 'number' },
        maxPlayers: { type: 'number' },
        configData: { type: 'object' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Config version created' })
  async createConfig(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: any,
    @Request() req: any,
  ) {
    return this.configService.createConfig(id, data, req.user.sub);
  }

  @Post(':id/config/rollback/:version')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Rollback to a previous config version' })
  @ApiParam({ name: 'id', description: 'Game UUID' })
  @ApiParam({ name: 'version', description: 'Target config version number' })
  @ApiResponse({ status: 200, description: 'Config rolled back' })
  @ApiResponse({ status: 404, description: 'Target version not found' })
  async rollbackConfig(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('version') version: string,
  ) {
    return this.configService.rollbackConfig(id, parseInt(version, 10));
  }

  // ============================================================
  // BET CONFIGURATION
  // ============================================================

  @Get(':id/bet-config')
  @Roles('super_admin', 'admin', 'game_operator')
  @ApiOperation({ summary: 'Get bet configuration for a game' })
  @ApiParam({ name: 'id', description: 'Game UUID' })
  @ApiResponse({ status: 200, description: 'Bet config returned' })
  async getBetConfig(@Param('id', ParseUUIDPipe) id: string) {
    return this.configService.getBetConfig(id);
  }

  @Put(':id/bet-config')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Update bet configuration for a game' })
  @ApiParam({ name: 'id', description: 'Game UUID' })
  @ApiBody({
    schema: {
      properties: {
        denominations: { type: 'array', items: { type: 'number' }, example: [100, 500, 1000, 5000, 10000] },
        minBet: { type: 'number', example: 100 },
        maxBet: { type: 'number', example: 1000000 },
        allowCustomBet: { type: 'boolean' },
        allowMultipleSelections: { type: 'boolean' },
        allowRepeatBet: { type: 'boolean' },
        allowAutoBet: { type: 'boolean' },
        allowAutoPlay: { type: 'boolean' },
        maxAutoBetRounds: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Bet config updated' })
  async updateBetConfig(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: any,
  ) {
    return this.configService.updateBetConfig(id, data);
  }

  // ============================================================
  // ROUNDS
  // ============================================================

  @Get(':id/rounds')
  @Roles('super_admin', 'admin', 'game_operator', 'viewer')
  @ApiOperation({ summary: 'List rounds for a game (paginated)' })
  @ApiParam({ name: 'id', description: 'Game UUID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Rounds returned' })
  async getRounds(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
  ) {
    return this.gamesService.getRounds(id, page || 1, Math.min(Number(limit) || 20, 100), status);
  }
}
