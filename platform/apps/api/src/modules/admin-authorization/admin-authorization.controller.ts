// ============================================================
// ADMIN AUTHORIZATION CONTROLLERS
// - Player: submit a request, view own requests
// - Super admin: review queue + approve / reject (two-step)
// ============================================================

import { Controller, Get, Post, Body, Param, Query, UseGuards, ParseUUIDPipe, Request } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { AdminAuthorizationService } from './admin-authorization.service';
import { CreateAuthorizationRequestDto, ReviewAuthorizationRequestDto } from './admin-authorization.dto';
import { PlayerAuthGuard } from '../auth/guards/player-auth.guard';
import { CurrentPlayer, CurrentPlayerData } from '../auth/decorators/current-player.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Admin Authorization (player)')
@Controller('admin-authorization')
export class PlayerAdminAuthorizationController {
  constructor(private readonly service: AdminAuthorizationService) {}

  @Post('request')
  @UseGuards(PlayerAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit an admin authorization request (player)' })
  @ApiBody({ type: CreateAuthorizationRequestDto })
  async request(@CurrentPlayer() player: CurrentPlayerData, @Body() dto: CreateAuthorizationRequestDto) {
    return this.service.submit(dto, player.sub);
  }

  @Get('my-requests')
  @UseGuards(PlayerAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Own admin authorization requests (player)' })
  async myRequests(@CurrentPlayer() player: CurrentPlayerData) {
    return this.service.myRequests(player.sub);
  }
}

@ApiTags('Admin Authorization (super admin)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super_admin')
@Controller('admin-authorization')
export class AdminAuthorizationController {
  constructor(private readonly service: AdminAuthorizationService) {}

  @Get('requests')
  @ApiOperation({ summary: 'List admin authorization requests (super_admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, description: 'pending | approved | rejected' })
  @ApiQuery({ name: 'search', required: false, description: 'Match player username / email' })
  async list(@Query() query: { page?: number; limit?: number; status?: string; search?: string }) {
    return this.service.list(query);
  }

  @Post(':requestId/approve')
  @ApiOperation({ summary: 'Approve a request and provision the admin account (two-step)' })
  @ApiParam({ name: 'requestId', type: String })
  @ApiBody({ type: ReviewAuthorizationRequestDto })
  async approve(
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @Body() dto: ReviewAuthorizationRequestDto,
    @Request() req: any,
  ) {
    return this.service.approve(requestId, req.user.sub, dto.notes);
  }

  @Post(':requestId/reject')
  @ApiOperation({ summary: 'Reject a request (immutable, audited)' })
  @ApiParam({ name: 'requestId', type: String })
  @ApiBody({ type: ReviewAuthorizationRequestDto })
  async reject(
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @Body() dto: ReviewAuthorizationRequestDto,
    @Request() req: any,
  ) {
    return this.service.reject(requestId, req.user.sub, dto.notes);
  }
}