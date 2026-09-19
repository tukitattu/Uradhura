// ============================================================
// SOCIAL MODULE
// ============================================================

import { Module } from '@nestjs/common';
import { SocialService } from './social.service';
import { SocialController } from './social.controller';
import { PlayerPostsController, PlayerFollowController } from './player-social.controller';

@Module({
  controllers: [SocialController, PlayerPostsController, PlayerFollowController],
  providers: [SocialService],
  exports: [SocialService],
})
export class SocialModule {}
