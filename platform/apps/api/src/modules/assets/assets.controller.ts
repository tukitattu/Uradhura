// ============================================================
// ASSET REGISTRY — CONTROLLER
// Public:  GET /assets/manifest (consumed by the player APK/web)
// Admin:   CRUD + upload/replace + lifecycle + bulk + metadata
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
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Request,
  ParseUUIDPipe,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { AssetsService } from './assets.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { CreateAssetDto, UpdateAssetDto, BulkUpdateDto } from './dto';
import {
  ASSET_CATEGORIES,
  ASSET_TARGETS,
  ASSET_STATUSES,
  ASSET_VISIBILITIES,
  ASSET_TYPE_MAP,
} from './asset.constants';

@ApiTags('assets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  // ----------------------------------------------------------
  // PUBLIC
  // ----------------------------------------------------------

  @Get('manifest')
  @Public()
  @ApiOperation({ summary: 'Public asset manifest (player APK / web) — published, enabled, in-window assets only' })
  manifest() {
    return this.assetsService.manifest();
  }

  @Get('catalog-options')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Asset registry metadata (categories, targets, statuses, formats) for admin UI' })
  catalogOptions() {
    return {
      categories: ASSET_CATEGORIES,
      targets: ASSET_TARGETS,
      statuses: ASSET_STATUSES,
      visibilities: ASSET_VISIBILITIES,
      formats: Object.keys(ASSET_TYPE_MAP),
    };
  }

  // ----------------------------------------------------------
  // ADMIN — list / read
  // ----------------------------------------------------------

  @Get()
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'List assets (paginated, filterable)' })
  list(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('category') category?: string,
    @Query('status') status?: string,
    @Query('target') target?: string,
    @Query('visibility') visibility?: string,
    @Query('search') search?: string,
  ) {
    return this.assetsService.findAll({ page, limit, category, status, target, visibility, search });
  }

  @Get(':id')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Get single asset' })
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.assetsService.findOne(id);
  }

  // ----------------------------------------------------------
  // ADMIN — create / replace / update
  // ----------------------------------------------------------

  @Post()
  @Roles('super_admin')
  @ApiOperation({ summary: 'Create an asset metadata record (draft)' })
  create(@Body() dto: CreateAssetDto, @Request() req) {
    return this.assetsService.create(dto, req.user.sub);
  }

  @Post(':id/upload')
  @Roles('super_admin')
  @HttpCode(200)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiOperation({ summary: 'Upload or replace the asset file (replace bumps version)' })
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
    @Request() req,
  ) {
    return this.assetsService.uploadFile(id, file, req.user.sub);
  }

  @Patch(':id')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Update asset metadata / status fields' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAssetDto, @Request() req) {
    return this.assetsService.update(id, dto, req.user.sub);
  }

  // ----------------------------------------------------------
  // ADMIN — lifecycle
  // ----------------------------------------------------------

  @Post(':id/publish')
  @Roles('super_admin')
  @HttpCode(200)
  @ApiOperation({ summary: 'Publish asset (requires file or bundled)' })
  publish(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.assetsService.publish(id, req.user.sub);
  }

  @Post(':id/enable')
  @Roles('super_admin')
  @HttpCode(200)
  @ApiOperation({ summary: 'Enable a published asset' })
  enable(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.assetsService.setEnabled(id, true, req.user.sub);
  }

  @Post(':id/disable')
  @Roles('super_admin')
  @HttpCode(200)
  @ApiOperation({ summary: 'Disable a published asset (keeps status+file, hides from manifest)' })
  disable(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.assetsService.setEnabled(id, false, req.user.sub);
  }

  @Post(':id/archive')
  @Roles('super_admin')
  @HttpCode(200)
  @ApiOperation({ summary: 'Archive asset' })
  archive(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.assetsService.archive(id, req.user.sub);
  }

  @Post(':id/restore')
  @Roles('super_admin')
  @HttpCode(200)
  @ApiOperation({ summary: 'Restore an archived asset back to draft' })
  restore(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.assetsService.restore(id, req.user.sub);
  }

  @Post('bulk')
  @HttpCode(200)
  @Roles('super_admin')
  @ApiOperation({ summary: 'Bulk apply a lifecycle action to multiple assets' })
  bulk(@Body() dto: BulkUpdateDto, @Request() req) {
    return this.assetsService.bulkApply(dto.action, dto.ids, req.user.sub);
  }

  @Delete(':id')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Delete an archived asset (hard delete)' })
  delete(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.assetsService.delete(id, req.user.sub);
  }
}