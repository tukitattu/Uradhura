// ============================================================
// PLAYERS DTOs
// ============================================================

import { IsString, IsEmail, MinLength, IsOptional, IsBoolean, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePlayerDto {
  @ApiProperty({ example: 'player123' })
  @IsString()
  @MinLength(3)
  username: string;

  @ApiPropertyOptional({ example: 'player@example.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: '+1234567890' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ example: 'Password123!' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({ example: 'Player One' })
  @IsString()
  @IsOptional()
  displayName?: string;

  @ApiPropertyOptional({ example: 'US' })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiPropertyOptional({ example: 'en' })
  @IsString()
  @IsOptional()
  @IsIn(['en', 'es', 'zh', 'hi', 'ar', 'pt', 'fr', 'de', 'ja', 'ko'])
  language?: string;
}

export class UpdatePlayerDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  username?: string;

  @ApiPropertyOptional()
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  displayName?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  avatar?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  country?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  language?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
