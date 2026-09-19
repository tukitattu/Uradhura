// ============================================================
// SETTINGS CONTROLLER
// ============================================================

import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('settings')
@Controller('settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Get all settings' })
  async getAll(@Query('category') category?: string) {
    return this.settingsService.getAll(category);
  }

  @Get(':key')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Get setting by key' })
  async get(@Param('key') key: string) {
    return this.settingsService.get(key);
  }

  @Put(':key')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Update setting' })
  async set(@Param('key') key: string, @Body() body: { value: any; category?: string; description?: string }, @Request() req) {
    return this.settingsService.set(key, body.value, body.category, body.description, req.user.sub);
  }

  @Delete(':key')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Delete setting' })
  async delete(@Param('key') key: string) {
    return this.settingsService.delete(key);
  }

  @Get('feature-flags')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Get feature flags' })
  async getFeatureFlags() {
    return this.settingsService.getFeatureFlags();
  }

  @Put('feature-flags/:key')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Toggle feature flag' })
  async toggleFeatureFlag(@Param('key') key: string, @Body('enabled') enabled: boolean, @Request() req) {
    return this.settingsService.toggleFeatureFlag(key, enabled, req.user.sub);
  }

  @Get('design-tokens')
  @ApiOperation({ summary: 'Get design tokens' })
  async getDesignTokens(@Query('scope') scope?: string) {
    return this.settingsService.getDesignTokens(scope);
  }

  @Put('design-tokens')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Set design token' })
  async setDesignToken(@Body() body: { scope: string; key: string; value: string; label?: string }, @Request() req) {
    return this.settingsService.setDesignToken(body.scope, body.key, body.value, body.label, req.user.sub);
  }

  @Get('game-branding/:gameSlug')
  @ApiOperation({ summary: 'Get game branding' })
  async getGameBranding(@Param('gameSlug') gameSlug: string) {
    return this.settingsService.getGameBranding(gameSlug);
  }

  @Put('game-branding/:gameSlug')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Update game branding' })
  async setGameBranding(@Param('gameSlug') gameSlug: string, @Body() body: any, @Request() req) {
    return this.settingsService.setGameBranding(gameSlug, body, req.user.sub);
  }
}
