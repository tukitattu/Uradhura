// ============================================================
// AUTH DTOs
// ============================================================

import { IsString, IsEmail, MinLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'admin123' })
  @IsString()
  @MinLength(3)
  username: string;

  @ApiProperty({ example: 'admin@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Password123!' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({ example: 'John' })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe' })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional({
    example: 'game_operator',
    description: 'Role to assign. Defaults to viewer. super_admin cannot be created here.',
  })
  @IsString()
  @IsOptional()
  roleName?: string;
}

export class LoginDto {
  @ApiProperty({ example: 'admin@example.com' })
  @IsString()
  email: string;

  @ApiProperty({ example: 'Password123!' })
  @IsString()
  password: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  refreshToken: string;
}
