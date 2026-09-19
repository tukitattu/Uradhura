// ============================================================
// PLAYER SOCIAL CONTROLLERS
// /posts — feed + like routes used by the RN player app.
// /players/:playerId/follow — follow toggle used by the RN app
// (distinct route from the admin PlayersController management).
// ============================================================

import { Controller, Get, Post, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { SocialService } from './social.service';
import { PlayerAuthGuard } from '../auth/guards/player-auth.guard';
import { CurrentPlayer, CurrentPlayerData } from '../auth/decorators/current-player.decorator';

@ApiTags('Player Social')
@ApiBearerAuth()
@UseGuards(PlayerAuthGuard)
@Controller('posts')
export class PlayerPostsController {
  constructor(private readonly socialService: SocialService) {}

  @Get('feed')
  @ApiOperation({ summary: 'Get paginated feed of posts (viewer-aware isLiked)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Feed posts returned' })
  async feed(
    @CurrentPlayer() player: CurrentPlayerData,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const result = await this.socialService.getFeedForPlayer(player.sub, page || 1, limit || 20);
    return {
      data: result.data,
      meta: { total: result.total, page: result.page, limit: result.limit },
    };
  }

  @Post(':postId/like')
  @ApiOperation({ summary: 'Like/unlike a post (toggle)' })
  @ApiParam({ name: 'postId', description: 'Post UUID' })
  @ApiResponse({ status: 200, description: 'Like toggled' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  async like(
    @CurrentPlayer() player: CurrentPlayerData,
    @Param('postId', ParseUUIDPipe) postId: string,
  ) {
    return this.socialService.likePost(player.sub, postId);
  }
}

@ApiTags('Player Social')
@ApiBearerAuth()
@UseGuards(PlayerAuthGuard)
@Controller('players')
export class PlayerFollowController {
  constructor(private readonly socialService: SocialService) {}

  @Post(':playerId/follow')
  @ApiOperation({ summary: 'Follow or unfollow a player (toggle)' })
  @ApiParam({ name: 'playerId', description: 'Player UUID to follow' })
  @ApiResponse({ status: 200, description: 'Follow toggled' })
  async follow(
    @CurrentPlayer() player: CurrentPlayerData,
    @Param('playerId', ParseUUIDPipe) playerId: string,
  ) {
    return this.socialService.follow(player.sub, playerId);
  }
}