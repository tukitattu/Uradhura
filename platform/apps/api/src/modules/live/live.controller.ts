// ============================================================
// LIVE CONTROLLER
// ============================================================

import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LiveService } from './live.service';
import { EconomyService } from '../economy/economy.service';
import { PlayerAuthGuard } from '../auth/guards/player-auth.guard';
import { CurrentPlayer, CurrentPlayerData } from '../auth/decorators/current-player.decorator';
import { toPlayerLite } from '../players/player.mapper';

function toRoomDto(room: any) {
  const tags = (() => {
    try {
      const parsed = room.tags ? JSON.parse(room.tags) : null;
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  })();
  return {
    id: room.id,
    hostId: room.hostId,
    host: toPlayerLite(room.host),
    title: room.title,
    thumbnail: room.cover,
    viewerCount: room.viewerCount ?? room._count?.members ?? 0,
    status: room.status === 'active' ? 'live' : room.status === 'ended' ? 'ended' : 'scheduled',
    startedAt: room.createdAt.toISOString(),
    tags,
  };
}

@ApiTags('live')
@Controller('live')
@UseGuards(PlayerAuthGuard)
@ApiBearerAuth()
export class LiveController {
  constructor(
    private readonly liveService: LiveService,
    private readonly economyService: EconomyService,
  ) {}

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
    const result = await this.liveService.getRooms(page || 1, limit || 20, { roomType, region, category });
    return { data: result.data.map(toRoomDto), meta: result.meta };
  }

  @Get('rooms/:roomId')
  @ApiOperation({ summary: 'Get a single live room' })
  async getRoom(@Param('roomId', ParseUUIDPipe) roomId: string) {
    const room = await this.liveService.getRoom(roomId);
    return { data: toRoomDto(room) };
  }

  @Get('gifts')
  @ApiOperation({ summary: 'Get available live gifts' })
  async getGifts() {
    const gifts = await this.economyService.getGifts();
    return {
      data: gifts.map((g) => ({
        id: g.id,
        name: g.name,
        icon: g.icon,
        price: Number(g.coinPrice),
        animation: g.animation ?? '',
        sound: '',
      })),
    };
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