// ============================================================
// AUTH MODULE
// ============================================================

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PlayerAuthService } from './player-auth.service';
import { PlayerAuthController } from './player-auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { PlayerJwtStrategy } from './strategies/player-jwt.strategy';
import { PlayersModule } from '../players/players.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    PlayersModule,
    AuditModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: { expiresIn: '15m' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController, PlayerAuthController],
  providers: [AuthService, JwtStrategy, PlayerAuthService, PlayerJwtStrategy],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
