// ============================================================
// ADMIN AUTHORIZATION MODULE
// ============================================================

import { Module } from '@nestjs/common';
import { AdminAuthorizationService } from './admin-authorization.service';
import {
  AdminAuthorizationController,
  PlayerAdminAuthorizationController,
} from './admin-authorization.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [AdminAuthorizationController, PlayerAdminAuthorizationController],
  providers: [AdminAuthorizationService],
  exports: [AdminAuthorizationService],
})
export class AdminAuthorizationModule {}