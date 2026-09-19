// ============================================================
// ADMIN MANAGEMENT MODULE
// ============================================================

import { Module } from '@nestjs/common';
import { AdminManagementService } from './admin-management.service';
import { AdminManagementController } from './admin-management.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [AdminManagementController],
  providers: [AdminManagementService],
  exports: [AdminManagementService],
})
export class AdminManagementModule {}