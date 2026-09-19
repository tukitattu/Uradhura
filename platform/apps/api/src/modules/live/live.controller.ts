// ============================================================
// LIVE CONTROLLER
// ============================================================

import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LiveService } from './live.service';
import { PlayerAuthGuard } from '../auth/guards/player-auth.guard';
import { CurrentPlayer, CurrentPlayerData } from '../auth/decorators/current-player.decorator';

@ApiTags('live')
@Controller('live')
@UseGuards(PlayerAuthGuard)
@ApiBearerAuth()
export class LiveController {
  constructor(private readonly liveService: LiveService) {}

  @Post('rooms')
  @ApiOperation({ summary: 'Create a live room' })
  async createRoom(@CurrentPlayer() player: CurrentPlayerData, @Body() body: any) {
    return this.liveService.createRoom(player.sub, body);
  }

  @Get('rooms')
  @ApiOperation({ summary: 'Get live rooms' })
  async getRooms(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('roomType') roomType?: string,
    @Query('region') region?: string,
    @Query('category') category?: string,
  ) {
    return this.liveService.getRooms(page || 1, limit || 20, { roomType, region, category });
  }

  @Post('rooms/:roomId/join')
  @ApiOperation({ summary: 'Join a live room' })
  async joinRoom(@CurrentPlayer() player: CurrentPlayerData, @Param('roomId') roomId: string) {
    return this.liveService.joinRoom(player.sub, roomId);
  }

  @Delete('rooms/:roomId/leave')
  @ApiOperation({ summary: 'Leave a live room' })
  async leaveRoom(@CurrentPlayer() player: CurrentPlayerData, @Param('roomId') roomId: string) {
    return this.liveService.leaveRoom(player.sub, roomId);
  }

  @Post('rooms/:roomId/end')
  @ApiOperation({ summary: 'End a live room (host only)' })
  async endRoom(@CurrentPlayer() player: CurrentPlayerData, @Param('roomId') roomId: string) {
    return this.liveService.endRoom(player.sub, roomId);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get live room statistics' })
  async getStats() {
    return this.liveService.getRoomStats();
  }
}
