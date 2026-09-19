// ============================================================
// APP MODULE — ROOT MODULE
// ============================================================

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaModule } from './prisma/prisma.module';
import { PassportGlobalModule } from './modules/auth/passport-global.module';
import { AuthModule } from './modules/auth/auth.module';
import { PlayersModule } from './modules/players/players.module';
import { GamesModule } from './modules/games/games.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { EconomyModule } from './modules/economy/economy.module';
import { SocialModule } from './modules/social/social.module';
import { LiveModule } from './modules/live/live.module';
import { ChatModule } from './modules/chat/chat.module';
import { ModerationModule } from './modules/moderation/moderation.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AuditModule } from './modules/audit/audit.module';
import { HealthModule } from './modules/health/health.module';
import { SettingsModule } from './modules/settings/settings.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { GatewayModule } from './modules/gateway/gateway.module';
import { AdminManagementModule } from './modules/admin-management/admin-management.module';
import { AdminAuthorizationModule } from './modules/admin-authorization/admin-authorization.module';
import { TeenPattiModule } from './modules/teen-patti/teen-patti.module';
import { WithdrawalsModule } from './modules/withdrawals/withdrawal.module';
import { AssetsModule } from './modules/assets/assets.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Scheduling + in-process events (game engine)
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),

    // Database
    PrismaModule,

    // Passport (global for all AuthGuard(...) guards)
    PassportGlobalModule,

    // Feature Modules
    AuthModule,
    PlayersModule,
    GamesModule,
    WalletModule,
    EconomyModule,
    SocialModule,
    LiveModule,
    ChatModule,
    ModerationModule,
    NotificationsModule,
    AuditModule,
    HealthModule,
    SettingsModule,
    DashboardModule,
    GatewayModule,
    AdminManagementModule,
    AdminAuthorizationModule,
    TeenPattiModule,
    WithdrawalsModule,
    AssetsModule,
  ],
})
export class AppModule {}
