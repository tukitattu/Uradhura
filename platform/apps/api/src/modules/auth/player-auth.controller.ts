// ============================================================
// PLAYER AUTH CONTROLLER — /auth/player/*
// ============================================================

import { Controller, Post, Get, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PlayerAuthService } from './player-auth.service';
import { PlayerRegisterDto, PlayerLoginDto, PlayerRefreshDto } from './dto/player-auth.dto';
import { PlayerAuthGuard } from './guards/player-auth.guard';
import { CurrentPlayer, CurrentPlayerData } from './decorators/current-player.decorator';

@ApiTags('Player Auth')
@Controller('auth/player')
export class PlayerAuthController {
  constructor(private readonly playerAuth: PlayerAuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new player' })
  @ApiResponse({ status: 201, description: 'Player registered' })
  async register(@Body() dto: PlayerRegisterDto) {
    return this.playerAuth.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Player login with username/email and password' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  async login(@Body() dto: PlayerLoginDto) {
    return this.playerAuth.login(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh player access token' })
  async refresh(@Body() dto: PlayerRefreshDto) {
    return this.playerAuth.refresh(dto.refreshToken);
  }

  @Post('logout')
  @ApiOperation({ summary: 'Player logout' })
  async logout(@Body() dto: PlayerRefreshDto) {
    await this.playerAuth.logout(dto.refreshToken);
    return { message: 'Logged out' };
  }

  @Get('profile')
  @UseGuards(PlayerAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current player profile' })
  async profile(@CurrentPlayer() player: CurrentPlayerData) {
    return this.playerAuth.getProfile(player.sub);
  }

  @Get('me')
  @UseGuards(PlayerAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current player profile' })
  async me(@CurrentPlayer() player: CurrentPlayerData) {
    return this.playerAuth.getProfile(player.sub);
  }
}