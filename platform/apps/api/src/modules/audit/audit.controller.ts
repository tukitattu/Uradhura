// ============================================================
// AUDIT CONTROLLER
// ============================================================

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('audit')
@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('logs')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Get audit logs' })
  async getLogs(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('actorId') actorId?: string,
    @Query('action') action?: string,
    @Query('entityType') entityType?: string,
  ) {
    return this.auditService.getLogs(page || 1, limit || 50, {
      actorId,
      action,
      entityType,
    });
  }

  @Get('stats')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Get audit stats' })
  async getStats() {
    return this.auditService.getStats();
  }
}
