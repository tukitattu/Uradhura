// ============================================================
// WITHDRAWAL MODULE
// ============================================================

import { Module, OnModuleInit } from '@nestjs/common';
import { WithdrawalService } from './withdrawal.service';
import { WithdrawalController } from './withdrawal.controller';
import { AdminWithdrawalController, SuperAdminWithdrawalController } from './admin-withdrawal.controller';
import { WalletModule } from '../wallet/wallet.module';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [WalletModule, AuditModule, NotificationsModule],
  controllers: [WithdrawalController, AdminWithdrawalController, SuperAdminWithdrawalController],
  providers: [WithdrawalService],
  exports: [WithdrawalService],
})
export class WithdrawalsModule implements OnModuleInit {
  constructor(private readonly withdrawals: WithdrawalService) {}

  onModuleInit(): void {
    void this.withdrawals.seedDefaultMethods();
  }
}