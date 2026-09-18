// ============================================================
// WALLET MODULE
// ============================================================

import { Module } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';
import { WalletIntegrationService } from '../games/wallet-integration.service';

@Module({
  controllers: [WalletController],
  providers: [WalletService, WalletIntegrationService],
  exports: [WalletService, WalletIntegrationService],
})
export class WalletModule {}
