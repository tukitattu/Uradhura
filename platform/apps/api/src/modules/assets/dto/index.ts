// ============================================================
// ASSET REGISTRY — DTOs
// ============================================================

import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsIn,
  Min,
  MaxLength,
  IsJSON,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ASSET_CATEGORIES,
  ASSET_TARGETS,
  ASSET_STATUSES,
  ASSET_VISIBILITIES,
} from '../asset.constants';

export class CreateAssetDto {
  @ApiProperty({ example: 'bg.home.default', description: 'Stable unique registry key' })
  @IsString()
  @MaxLength(160)
  key!: string;

  @ApiProperty({ example: 'Home Default Background' })
  @IsString()
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional({ example: 'Default home screen backdrop' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: ASSET_CATEGORIES, example: 'bg.home' })
  @IsIn(ASSET_CATEGORIES)
  category!: string;

  @ApiPropertyOptional({ example: 'svg' })
  @IsString()
  @IsOptional()
  format?: string;

  @ApiPropertyOptional({ example: 'global' })
  @IsString()
  @IsOptional()
  @IsIn(ASSET_TARGETS)
  target?: string;

  @ApiPropertyOptional({ example: 10, description: 'Display order within (category, target)' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ example: true, description: 'Ships inside the player APK' })
  @IsBoolean()
  @IsOptional()
  isBundled?: boolean;

  @ApiPropertyOptional({ example: 'game:{gameId}', description: 'Assignment to game / room / event' })
  @IsString()
  @IsOptional()
  scope?: string;

  @ApiPropertyOptional({ example: { en: { caption: 'Home' } }, description: 'Localization JSON map' })
  @IsString()
  @IsOptional()
  @ValidateIf((o) => typeof o.localization === 'string')
  @IsJSON()
  localization?: string;

  @ApiPropertyOptional({ enum: ASSET_VISIBILITIES, example: 'public' })
  @IsString()
  @IsOptional()
  @IsIn(ASSET_VISIBILITIES)
  visibility?: string;
}

export class UpdateAssetDto {
  @ApiPropertyOptional({ example: 'Home Default Background' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ enum: ASSET_CATEGORIES, example: 'bg.home' })
  @IsIn(ASSET_CATEGORIES)
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ example: 'global' })
  @IsIn(ASSET_TARGETS)
  @IsOptional()
  target?: string;

  @ApiPropertyOptional({ example: 10 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ enum: ASSET_STATUSES, example: 'draft' })
  @IsIn(ASSET_STATUSES)
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  isBundled?: boolean;

  @ApiPropertyOptional({ example: 'game:{gameId}' })
  @IsString()
  @IsOptional()
  scope?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @ValidateIf((o) => typeof o.localization === 'string')
  @IsJSON()
  localization?: string;

  @ApiPropertyOptional({ type: String, example: '2026-10-01T00:00:00.000Z' })
  @IsString()
  @IsOptional()
  startsAt?: string;

  @ApiPropertyOptional({ type: String, example: '2026-10-31T23:59:59.000Z' })
  @IsString()
  @IsOptional()
  endsAt?: string;

  @ApiPropertyOptional({ enum: ASSET_VISIBILITIES, example: 'public' })
  @IsIn(ASSET_VISIBILITIES)
  @IsOptional()
  visibility?: string;

  @ApiPropertyOptional({ example: 'http://localhost:4002/assets/...', description: 'External url override (rarely needed)' })
  @IsString()
  @IsOptional()
  url?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  thumbnailUrl?: string;
}

export class BulkUpdateDto {
  @ApiProperty({ type: [String], description: 'Asset ids to update together' })
  @IsString({ each: true })
  ids!: string[];

  @ApiPropertyOptional({ example: 'published', description: 'Action: publish | disable | enable | archive | restore | draft' })
  @IsIn(['publish', 'enable', 'disable', 'archive', 'restore', 'draft'])
  action!: string;
}