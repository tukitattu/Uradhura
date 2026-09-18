// ============================================================
// GAMES MODULE
// ============================================================

import { Module } from '@nestjs/common';
import { GamesService } from './games.service';
import { GamesController } from './games.controller';
import { GameConfigService } from './game-config.service';
import { GameOptionService } from './game-option.service';
import { RngService } from './rng.service';
import { RoundLifecycleService } from './round-lifecycle.service';
import { GameEngineService } from './game-engine.service';
import { WalletIntegrationService } from './wallet-integration.service';

@Module({
  controllers: [GamesController],
  providers: [
    GamesService,
    GameConfigService,
    GameOptionService,
    RngService,
    RoundLifecycleService,
    WalletIntegrationService,
    GameEngineService,
  ],
  exports: [
    GamesService,
    GameConfigService,
    GameOptionService,
    RngService,
    RoundLifecycleService,
    WalletIntegrationService,
    GameEngineService,
  ],
})
export class GamesModule {}
