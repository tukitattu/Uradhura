// ============================================================
// PLAYERS MODULE
// ============================================================

import { Module } from '@nestjs/common';
import { PlayersService } from './players.service';
import { PlayersController } from './players.controller';
import { WalletModule } from '../wallet/wallet.module';
import { GamesModule } from '../games/games.module';

@Module({
  imports: [WalletModule, GamesModule],
  controllers: [PlayersController],
  providers: [PlayersService],
  exports: [PlayersService],
})
export class PlayersModule {}
