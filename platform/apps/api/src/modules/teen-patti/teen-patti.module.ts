// ============================================================
// TEEN PATTI MODULE
// ============================================================

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TeenPattiService } from './teen-patti.service';
import { TeenPattiController } from './teen-patti.controller';
import { TeenPattiGateway } from './teen-patti.gateway';
import { TeenPattiConfigService } from './teen-patti-config.service';
import { AdminTeenPattiController } from './admin-teen-patti.controller';
import { WalletModule } from '../wallet/wallet.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    WalletModule,
    AuditModule,
    PassportModule.register({ defaultStrategy: 'player-jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
        signOptions: { expiresIn: '15m' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [TeenPattiController, AdminTeenPattiController],
  providers: [TeenPattiService, TeenPattiGateway, TeenPattiConfigService],
  exports: [TeenPattiService, TeenPattiConfigService],
})
export class TeenPattiModule {}