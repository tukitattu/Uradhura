// ============================================================
// LIVE CONTROLLER
// ============================================================

import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LiveService } from './live.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('live')
@Controller('live')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LiveController {
  constructor(private readonly liveService: LiveService) {}

  @Post('rooms')
  @ApiOperation({ summary: 'Create a live room' })
  async createRoom(@Request() req, @Body() body: any) {
    return this.liveService.createRoom(req.user.sub, body);
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
  async joinRoom(@Request() req, @Param('roomId') roomId: string) {
    return this.liveService.joinRoom(req.user.sub, roomId);
  }

  @Delete('rooms/:roomId/leave')
  @ApiOperation({ summary: 'Leave a live room' })
  async leaveRoom(@Request() req, @Param('roomId') roomId: string) {
    return this.liveService.leaveRoom(req.user.sub, roomId);
  }

  @Post('rooms/:roomId/end')
  @ApiOperation({ summary: 'End a live room (host only)' })
  async endRoom(@Request() req, @Param('roomId') roomId: string) {
    return this.liveService.endRoom(req.user.sub, roomId);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get live room statistics' })
  async getStats() {
    return this.liveService.getRoomStats();
  }
}
