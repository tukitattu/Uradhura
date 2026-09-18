// ============================================================
// GAMES DTOs
// ============================================================

import { IsString, IsOptional, IsNumber, IsBoolean, IsIn, IsObject, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateGameDto {
  @ApiProperty({ example: 'greedy_monkey' })
  @IsString()
  internalCode: string;

  @ApiProperty({ example: 'Greedy Monkey' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'Greedy Monkey' })
  @IsString()
  displayName: string;

  @ApiPropertyOptional({ example: 'Spin the wheel and win big!' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 'Spin to win' })
  @IsString()
  @IsOptional()
  shortDescription?: string;

  @ApiPropertyOptional({ example: 'wheel' })
  @IsString()
  @IsOptional()
  @IsIn(['wheel', 'card', 'slot', 'package', 'other'])
  category?: string;

  @ApiPropertyOptional({ example: 'betting' })
  @IsString()
  @IsOptional()
  @IsIn(['betting', 'guessing', 'spinning', 'dealing'])
  gameType?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  thumbnail?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  banner?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  background?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  logo?: string;

  @ApiPropertyOptional({ example: 'Monkey' })
  @IsString()
  @IsOptional()
  centralCharacter?: string;

  @ApiPropertyOptional({ example: 'Monkey' })
  @IsString()
  @IsOptional()
  characterName?: string;
}

export class UpdateGameDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  displayName?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  shortDescription?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  gameType?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @IsIn(['inactive', 'active', 'maintenance'])
  status?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  version?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isHot?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isRecommended?: boolean;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  maintenanceMessage?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  thumbnail?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  banner?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  background?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  logo?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  centralCharacter?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  characterAnimation?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  characterName?: string;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  rules?: object;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  helpContent?: object;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  sounds?: object;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  music?: object;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  theme?: object;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  colorConfig?: object;
}
