// ============================================================
// GAMES MODULE
// ============================================================

import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuditModule } from '../audit/audit.module';
import { GamesService } from './games.service';
import { GamesController } from './games.controller';
import { PlayerGamesController } from './player-games.controller';
import { GameConfigService } from './game-config.service';
import { GameOptionService } from './game-option.service';
import { RoundLifecycleService } from './round-lifecycle.service';
import { GameEngineService } from './game-engine.service';
import { WalletIntegrationService } from './wallet-integration.service';
import { SeedService } from './seed.service';
import { GameSchedulerService } from './game-scheduler.service';
import { GameDriverRegistry } from './drivers/driver.registry';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'player-jwt' }), AuditModule],
  controllers: [GamesController, PlayerGamesController],
  providers: [
    GamesService,
    GameConfigService,
    GameOptionService,
    SeedService,
    GameDriverRegistry,
    RoundLifecycleService,
    WalletIntegrationService,
    GameEngineService,
    GameSchedulerService,
  ],
  exports: [
    GamesService,
    GameConfigService,
    GameOptionService,
    SeedService,
    GameDriverRegistry,
    RoundLifecycleService,
    WalletIntegrationService,
    GameEngineService,
  ],
})
export class GamesModule {}
