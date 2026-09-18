// ============================================================
// ECONOMY MODULE
// ============================================================

import { Module } from '@nestjs/common';
import { EconomyService } from './economy.service';
import { EconomyController } from './economy.controller';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [WalletModule],
  controllers: [EconomyController],
  providers: [EconomyService],
  exports: [EconomyService],
})
export class EconomyModule {}
