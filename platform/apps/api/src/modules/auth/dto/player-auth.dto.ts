// ============================================================
// PLAYER AUTH DTOs
// ============================================================

import { IsString, IsEmail, MinLength, IsOptional, Matches, IsPhoneNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PlayerRegisterDto {
  @ApiProperty({ example: 'luckyplayer' })
  @IsString()
  @MinLength(3)
  @Matches(/^[a-zA-Z0-9_]+$/, { message: 'username may only contain letters, numbers and underscore' })
  username: string;

  @ApiProperty({ example: 'player@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Password123!' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({ example: '+8801712345678' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: 'Lucky' })
  @IsString()
  @IsOptional()
  displayName?: string;
}

export class PlayerLoginDto {
  @ApiProperty({ example: 'luckyplayer', description: 'Username or email' })
  @IsString()
  identifier: string;

  @ApiProperty({ example: 'Password123!' })
  @IsString()
  password: string;
}

export class PlayerRefreshDto {
  @ApiProperty()
  @IsString()
  refreshToken: string;
}