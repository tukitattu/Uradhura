// ============================================================
// NOTIFICATIONS CONTROLLER
// ============================================================

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  UseGuards,
  Request,
  Body,
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
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get notifications (paginated)' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default 20)' })
  @ApiQuery({ name: 'unreadOnly', required: false, type: Boolean, description: 'Filter unread only' })
  @ApiResponse({ status: 200, description: 'Notifications returned' })
  async getNotifications(
    @Request() req: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('unreadOnly') unreadOnly?: boolean,
  ) {
    return this.notificationsService.getNotifications(
      req.user.sub,
      page || 1,
      limit || 20,
      unreadOnly,
    );
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  @ApiResponse({ status: 200, description: 'Unread count returned' })
  async getUnreadCount(@Request() req: any) {
    return this.notificationsService.getUnreadCount(req.user.sub);
  }

  @Patch(':notificationId/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiParam({ name: 'notificationId', description: 'Notification UUID' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async markAsRead(@Param('notificationId', ParseUUIDPipe) notificationId: string) {
    return this.notificationsService.markAsRead(notificationId);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  async markAllAsRead(@Request() req: any) {
    return this.notificationsService.markAllAsRead(req.user.sub);
  }

  @Delete(':notificationId')
  @ApiOperation({ summary: 'Delete a notification' })
  @ApiParam({ name: 'notificationId', description: 'Notification UUID' })
  @ApiResponse({ status: 200, description: 'Notification deleted' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async deleteNotification(@Param('notificationId', ParseUUIDPipe) notificationId: string) {
    return this.notificationsService.deleteNotification(notificationId);
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Send bulk notifications to multiple players' })
  @ApiBody({
    schema: {
      properties: {
        playerIds: { type: 'array', items: { type: 'string' }, description: 'Array of player UUIDs' },
        type: { type: 'string', enum: ['system', 'game', 'social', 'reward', 'alert'] },
        title: { type: 'string', example: 'Maintenance Notice' },
        content: { type: 'string', example: 'Scheduled maintenance at 2AM UTC' },
        data: { type: 'object', description: 'Optional metadata' },
      },
      required: ['playerIds', 'type', 'title', 'content'],
    },
  })
  @ApiResponse({ status: 201, description: 'Bulk notifications sent' })
  async bulkCreate(
    @Body() body: {
      playerIds: string[];
      type: string;
      title: string;
      content: string;
      data?: Record<string, unknown>;
    },
  ) {
    return this.notificationsService.bulkCreate(body.playerIds, {
      type: body.type,
      title: body.title,
      content: body.content,
      data: body.data,
    });
  }

  @Delete('cleanup/:days')
  @ApiOperation({ summary: 'Delete read notifications older than N days' })
  @ApiParam({ name: 'days', description: 'Number of days' })
  @ApiResponse({ status: 200, description: 'Old notifications cleaned up' })
  async cleanup(@Param('days') days: string) {
    return this.notificationsService.deleteOlderThan(parseInt(days, 10));
  }
}
