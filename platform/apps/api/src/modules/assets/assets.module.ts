// ============================================================
// ASSET REGISTRY — MODULE
// ============================================================

import { Module } from '@nestjs/common';
import { AssetsService } from './assets.service';
import { AssetsController } from './assets.controller';
import { AssetStorageService } from './asset-storage.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [AssetsController],
  providers: [AssetsService, AssetStorageService],
  exports: [AssetsService, AssetStorageService],
})
export class AssetsModule {}