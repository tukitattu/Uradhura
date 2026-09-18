// ============================================================
// MODERATION CONTROLLER
// ============================================================

import {
  Controller,
  Get,
  Post,
  Patch,
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
import { ModerationService } from './moderation.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Moderation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('moderation')
export class ModerationController {
  constructor(private readonly moderationService: ModerationService) {}

  // ============================================================
  // REPORTS
  // ============================================================

  @Post('reports')
  @ApiOperation({ summary: 'Create a report' })
  @ApiBody({
    schema: {
      properties: {
        targetType: { type: 'string', enum: ['player', 'live_room', 'post', 'message', 'game'] },
        targetId: { type: 'string', description: 'UUID of the reported entity' },
        reason: { type: 'string', example: 'Inappropriate content' },
        category: { type: 'string', example: 'spam' },
        description: { type: 'string', example: 'Detailed description of the issue' },
        roomId: { type: 'string', description: 'Optional room UUID' },
      },
      required: ['targetType', 'targetId', 'reason'],
    },
  })
  @ApiResponse({ status: 201, description: 'Report created' })
  @ApiResponse({ status: 409, description: 'Duplicate report within 24h' })
  async createReport(
    @Request() req: any,
    @Body() body: {
      targetType: string;
      targetId: string;
      reason: string;
      category?: string;
      description?: string;
      roomId?: string;
    },
  ) {
    return this.moderationService.createReport(req.user.sub, body);
  }

  @Get('reports')
  @Roles('super_admin', 'admin', 'moderator')
  @ApiOperation({ summary: 'Get all reports (moderator+)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: ['pending', 'reviewing', 'resolved', 'dismissed'] })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiQuery({ name: 'targetType', required: false, enum: ['player', 'live_room', 'post', 'message', 'game'] })
  @ApiQuery({ name: 'assignedTo', required: false, type: String, description: 'Admin UUID' })
  @ApiResponse({ status: 200, description: 'Reports returned with pagination' })
  async getReports(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('targetType') targetType?: string,
    @Query('assignedTo') assignedTo?: string,
  ) {
    return this.moderationService.getReports(page || 1, limit || 20, {
      status,
      category,
      targetType,
      assignedTo,
    });
  }

  @Patch('reports/:reportId')
  @Roles('super_admin', 'admin', 'moderator')
  @ApiOperation({ summary: 'Update report status' })
  @ApiParam({ name: 'reportId', description: 'Report UUID' })
  @ApiBody({
    schema: {
      properties: {
        status: { type: 'string', enum: ['pending', 'reviewing', 'resolved', 'dismissed'] },
        assignedTo: { type: 'string', description: 'Admin UUID to assign' },
        resolution: { type: 'string', description: 'Resolution text (required when resolving)' },
      },
      required: ['status'],
    },
  })
  @ApiResponse({ status: 200, description: 'Report updated' })
  @ApiResponse({ status: 404, description: 'Report not found' })
  async updateReportStatus(
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Body() body: { status: string; assignedTo?: string; resolution?: string },
  ) {
    return this.moderationService.updateReportStatus(
      reportId,
      body.status,
      body.assignedTo,
      body.resolution,
    );
  }

  // ============================================================
  // MODERATION ACTIONS
  // ============================================================

  @Post('moderate')
  @Roles('super_admin', 'admin', 'moderator')
  @ApiOperation({ summary: 'Execute a moderation action' })
  @ApiBody({
    schema: {
      properties: {
        targetType: { type: 'string', enum: ['player', 'room', 'post', 'message'] },
        targetId: { type: 'string', description: 'UUID of the target entity' },
        action: { type: 'string', enum: ['warn', 'mute', 'ban', 'unban', 'delete', 'restrict'] },
        reason: { type: 'string', example: 'Repeated violations' },
        duration: { type: 'number', description: 'Duration in hours (for mute/restrict)' },
      },
      required: ['targetType', 'targetId', 'action', 'reason'],
    },
  })
  @ApiResponse({ status: 201, description: 'Moderation action executed' })
  @ApiResponse({ status: 400, description: 'Invalid action or parameters' })
  async moderate(
    @Request() req: any,
    @Body() body: {
      targetType: string;
      targetId: string;
      action: string;
      reason: string;
      duration?: number;
    },
  ) {
    return this.moderationService.moderatePlayer(req.user.sub, body);
  }

  @Get('history/:targetType/:targetId')
  @Roles('super_admin', 'admin', 'moderator')
  @ApiOperation({ summary: 'Get moderation history for an entity' })
  @ApiParam({ name: 'targetType', enum: ['player', 'room', 'post', 'message'] })
  @ApiParam({ name: 'targetId', description: 'UUID of the target entity' })
  @ApiResponse({ status: 200, description: 'Moderation history returned' })
  async getHistory(
    @Param('targetType') targetType: string,
    @Param('targetId') targetId: string,
  ) {
    return this.moderationService.getModerationHistory(targetType, targetId);
  }

  @Get('admin/:adminId/actions')
  @Roles('super_admin', 'admin', 'moderator')
  @ApiOperation({ summary: "Get an admin's moderation action history" })
  @ApiParam({ name: 'adminId', description: 'Admin UUID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Admin actions returned with pagination' })
  async getAdminActions(
    @Param('adminId', ParseUUIDPipe) adminId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.moderationService.getAdminActions(adminId, page || 1, limit || 50);
  }

  // ============================================================
  // STATS
  // ============================================================

  @Get('stats')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Get moderation statistics (admin)' })
  @ApiResponse({ status: 200, description: 'Moderation stats returned' })
  async getStats() {
    return this.moderationService.getModerationStats();
  }
}
