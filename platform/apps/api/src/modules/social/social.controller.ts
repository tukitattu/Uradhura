// ============================================================
// SOCIAL CONTROLLER
// ============================================================

import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
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
import { SocialService } from './social.service';
import { PlayerAuthGuard } from '../auth/guards/player-auth.guard';
import { CurrentPlayer, CurrentPlayerData } from '../auth/decorators/current-player.decorator';

@ApiTags('Social')
@ApiBearerAuth()
@UseGuards(PlayerAuthGuard)
@Controller('social')
export class SocialController {
  constructor(private readonly socialService: SocialService) {}

  // ============================================================
  // FEED
  // ============================================================

  @Get('feed')
  @ApiOperation({ summary: 'Get paginated feed (own + followed players posts)' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default 20)' })
  @ApiResponse({ status: 200, description: 'Feed posts returned' })
  async getFeed(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.socialService.getPosts(page || 1, limit || 20);
  }

  // ============================================================
  // POSTS
  // ============================================================

  @Post('posts')
  @ApiOperation({ summary: 'Create a post/moment' })
  @ApiBody({
    schema: {
      properties: {
        content: { type: 'string', example: 'Just won a big jackpot!' },
        imageUrl: { type: 'string' },
        videoUrl: { type: 'string' },
        type: { type: 'string', enum: ['moment', 'win', 'status'], default: 'moment' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Post created' })
  async createPost(
    @CurrentPlayer() player: CurrentPlayerData,
    @Body() body: { content?: string; imageUrl?: string; videoUrl?: string; type?: string },
  ) {
    return this.socialService.createPost(player.sub, body);
  }

  @Get('posts')
  @ApiOperation({ summary: 'Get public posts feed' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Posts returned' })
  async getPosts(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.socialService.getPosts(page || 1, limit || 20);
  }

  @Get('players/:playerId/posts')
  @ApiOperation({ summary: 'Get posts by a specific player' })
  @ApiParam({ name: 'playerId', description: 'Player UUID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Player posts returned' })
  async getPlayerPosts(
    @Param('playerId', ParseUUIDPipe) playerId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.socialService.getPosts(page || 1, limit || 20);
  }

  @Post('posts/:postId/like')
  @ApiOperation({ summary: 'Like/unlike a post (toggle)' })
  @ApiParam({ name: 'postId', description: 'Post UUID' })
  @ApiResponse({ status: 200, description: 'Like toggled' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  async likePost(
    @CurrentPlayer() player: CurrentPlayerData,
    @Param('postId', ParseUUIDPipe) postId: string,
  ) {
    return this.socialService.likePost(player.sub, postId);
  }

  @Post('posts/:postId/comment')
  @ApiOperation({ summary: 'Comment on a post' })
  @ApiParam({ name: 'postId', description: 'Post UUID' })
  @ApiBody({ schema: { properties: { content: { type: 'string', example: 'Nice win!' } }, required: ['content'] } })
  @ApiResponse({ status: 201, description: 'Comment created' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  async commentOnPost(
    @CurrentPlayer() player: CurrentPlayerData,
    @Param('postId', ParseUUIDPipe) postId: string,
    @Body('content') content: string,
  ) {
    return this.socialService.commentOnPost(player.sub, postId, content);
  }

  // ============================================================
  // FOLLOW / UNFOLLOW
  // ============================================================

  @Post('follow/:playerId')
  @ApiOperation({ summary: 'Follow a player' })
  @ApiParam({ name: 'playerId', description: 'Player UUID to follow' })
  @ApiResponse({ status: 200, description: 'Follow toggled' })
  async follow(
    @CurrentPlayer() player: CurrentPlayerData,
    @Param('playerId', ParseUUIDPipe) playerId: string,
  ) {
    return this.socialService.follow(player.sub, playerId);
  }

  @Delete('follow/:playerId')
  @ApiOperation({ summary: 'Unfollow a player' })
  @ApiParam({ name: 'playerId', description: 'Player UUID to unfollow' })
  @ApiResponse({ status: 200, description: 'Unfollowed' })
  async unfollow(
    @CurrentPlayer() player: CurrentPlayerData,
    @Param('playerId', ParseUUIDPipe) playerId: string,
  ) {
    return this.socialService.unfollow(player.sub, playerId);
  }

  @Get('players/:playerId/followers')
  @ApiOperation({ summary: 'Get player followers list' })
  @ApiParam({ name: 'playerId', description: 'Player UUID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Followers list returned' })
  async getFollowers(
    @Param('playerId', ParseUUIDPipe) playerId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.socialService.getFollowers(playerId, page || 1, limit || 20);
  }

  @Get('players/:playerId/following')
  @ApiOperation({ summary: 'Get player following list' })
  @ApiParam({ name: 'playerId', description: 'Player UUID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Following list returned' })
  async getFollowing(
    @Param('playerId', ParseUUIDPipe) playerId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.socialService.getFollowing(playerId, page || 1, limit || 20);
  }

  // ============================================================
  // BLOCK / UNBLOCK
  // ============================================================

  @Post('block/:playerId')
  @ApiOperation({ summary: 'Block a player' })
  @ApiParam({ name: 'playerId', description: 'Player UUID to block' })
  @ApiResponse({ status: 200, description: 'Player blocked' })
  async block(
    @CurrentPlayer() player: CurrentPlayerData,
    @Param('playerId', ParseUUIDPipe) playerId: string,
  ) {
    return this.socialService.block(player.sub, playerId);
  }

  @Delete('block/:playerId')
  @ApiOperation({ summary: 'Unblock a player' })
  @ApiParam({ name: 'playerId', description: 'Player UUID to unblock' })
  @ApiResponse({ status: 200, description: 'Player unblocked' })
  async unblock(
    @CurrentPlayer() player: CurrentPlayerData,
    @Param('playerId', ParseUUIDPipe) playerId: string,
  ) {
    return this.socialService.unblock(player.sub, playerId);
  }
}
