// ============================================================
// LIVE MODULE
// ============================================================

import { Module } from '@nestjs/common';
import { LiveService } from './live.service';
import { LiveController } from './live.controller';
import { EconomyModule } from '../economy/economy.module';

@Module({
  imports: [EconomyModule],
  controllers: [LiveController],
  providers: [LiveService],
  exports: [LiveService],
})
export class LiveModule {}
