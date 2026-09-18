// ============================================================
// ADMIN MANAGEMENT CONTROLLER — super_admin only
// ============================================================

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AdminManagementService } from './admin-management.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('admin-management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super_admin')
@Controller('admin-management')
export class AdminManagementController {
  constructor(private readonly service: AdminManagementService) {}

  // ----------------------------------------------------------
  // Admins
  // ----------------------------------------------------------

  @Get('admins')
  @ApiOperation({ summary: 'List all admin accounts' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  listAdmins(@Query() query: { page?: number; limit?: number; search?: string }) {
    return this.service.listAdmins(query);
  }

  @Get('admins/:id')
  @ApiOperation({ summary: 'Admin detail with roles, games, subscription, commissions' })
  getAdmin(@Param('id') id: string) {
    return this.service.getAdmin(id);
  }

  @Patch('admins/:id')
  @ApiOperation({ summary: 'Update admin profile / activate / suspend' })
  updateAdmin(@Param('id') id: string, @Request() req: any, @Body() body: any) {
    return this.service.updateAdmin(id, req.user.sub, body);
  }

  // ----------------------------------------------------------
  // Roles
  // ----------------------------------------------------------

  @Post('admins/:id/roles')
  @ApiOperation({ summary: 'Grant a role to an admin' })
  assignRole(@Param('id') id: string, @Request() req: any, @Body() body: { roleName: string }) {
    return this.service.assignRole(id, body.roleName, req.user.sub);
  }

  @Delete('admins/:id/roles/:roleId')
  @ApiOperation({ summary: 'Revoke a role from an admin (super_admin is protected)' })
  revokeRole(@Param('id') id: string, @Param('roleId') roleId: string, @Request() req: any) {
    return this.service.revokeRole(id, roleId, req.user.sub);
  }

  // ----------------------------------------------------------
  // Game assignments
  // ----------------------------------------------------------

  @Post('admins/:id/games')
  @ApiOperation({ summary: 'Assign games to an admin' })
  assignGames(
    @Param('id') id: string,
    @Request() req: any,
    @Body() body: { assignments: { gameId: string; canView?: boolean; canEdit?: boolean }[] },
  ) {
    return this.service.assignGames(id, body.assignments, req.user.sub);
  }

  @Delete('admins/:id/games/:gameId')
  @ApiOperation({ summary: 'Revoke a game assignment' })
  revokeGame(@Param('id') id: string, @Param('gameId') gameId: string, @Request() req: any) {
    return this.service.revokeGame(id, gameId, req.user.sub);
  }

  // ----------------------------------------------------------
  // Plans
  // ----------------------------------------------------------

  @Get('plans')
  @ApiOperation({ summary: 'List subscription plans' })
  listPlans() {
    return this.service.listPlans();
  }

  @Post('plans')
  @ApiOperation({ summary: 'Create a subscription plan' })
  createPlan(@Request() req: any, @Body() body: any) {
    return this.service.createPlan(body, req.user.sub);
  }

  @Patch('plans/:id')
  @ApiOperation({ summary: 'Update a subscription plan' })
  updatePlan(@Param('id') id: string, @Request() req: any, @Body() body: any) {
    return this.service.updatePlan(id, body, req.user.sub);
  }

  // ----------------------------------------------------------
  // Subscriptions
  // ----------------------------------------------------------

  @Get('admins/:id/subscription')
  @ApiOperation({ summary: 'Admin subscription with plan and invoices' })
  getSubscription(@Param('id') id: string) {
    return this.service.getSubscription(id);
  }

  @Post('admins/:id/subscription')
  @ApiOperation({ summary: 'Subscribe an admin to a plan' })
  subscribe(
    @Param('id') id: string,
    @Request() req: any,
    @Body() body: { planId: string; notes?: string },
  ) {
    return this.service.subscribeAdmin(id, body.planId, req.user.sub, { notes: body.notes });
  }

  @Post('subscriptions/:id/pay')
  @ApiOperation({ summary: 'Mark a subscription as paid' })
  markPaid(@Param('id') id: string, @Request() req: any) {
    return this.service.markSubscriptionPaid(id, req.user.sub);
  }

  // ----------------------------------------------------------
  // Commissions
  // ----------------------------------------------------------

  @Get('commissions')
  @ApiOperation({ summary: 'List admin commissions' })
  @ApiQuery({ name: 'status', required: false, type: String })
  listCommissions(@Query() query: { page?: number; limit?: number; status?: string }) {
    return this.service.listCommissions(query);
  }

  @Post('commissions/:id/approve')
  @ApiOperation({ summary: 'Approve a pending commission' })
  approveCommission(@Param('id') id: string, @Request() req: any) {
    return this.service.approveCommission(id, req.user.sub);
  }
}