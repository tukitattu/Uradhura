// ============================================================
// GATEWAY MODULE — WebSocket infrastructure
// ============================================================

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GameGateway } from './game.gateway';
import { LiveGateway } from './live.gateway';
import { ChatGateway } from './chat.gateway';
import { GamesModule } from '../games/games.module';
import { LiveModule } from '../live/live.module';
import { ChatModule } from '../chat/chat.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
        signOptions: { expiresIn: '15m' },
      }),
      inject: [ConfigService],
    }),
    GamesModule,
    LiveModule,
    ChatModule,
    AuthModule,
  ],
  providers: [GameGateway, LiveGateway, ChatGateway],
  exports: [GameGateway, LiveGateway, ChatGateway],
})
export class GatewayModule {}
