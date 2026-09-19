// ============================================================
// WALLET MODULE
// ============================================================

import { Module } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';
import { PlayerWalletController } from './player-wallet.controller';
import { WalletIntegrationService } from '../games/wallet-integration.service';

@Module({
  controllers: [WalletController, PlayerWalletController],
  providers: [WalletService, WalletIntegrationService],
  exports: [WalletService, WalletIntegrationService],
})
export class WalletModule {}
