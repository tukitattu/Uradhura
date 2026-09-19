// ============================================================
// ADMIN AUTHORIZATION DTOs
// ============================================================

import { IsString, IsArray, IsOptional, MinLength, MaxLength, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const PROMOTABLE_ROLES = [
  'admin',
  'game_operator',
  'finance',
  'moderator',
  'support',
  'viewer',
];

export class CreateAuthorizationRequestDto {
  @ApiPropertyOptional({
    example: 'admin',
    enum: ['admin', 'game_operator', 'finance', 'moderator', 'support', 'viewer'],
  })
  @IsString()
  @IsOptional()
  @IsIn(PROMOTABLE_ROLES)
  requestedRole?: string;

  @ApiPropertyOptional({
    example: ['games', 'players', 'reports', 'profit-risk'],
    description: 'Requested "resource:action" permissions',
  })
  @IsArray()
  @IsOptional()
  requestedPermissions?: string[];

  @ApiPropertyOptional({ example: 'Operations support for live games' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  notes?: string;
}

export class ReviewAuthorizationRequestDto {
  @ApiPropertyOptional({ example: 'Approved for operations dashboard' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  notes?: string;
}