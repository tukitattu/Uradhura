// ============================================================
// GLOBAL PASSPORT MODULE
// Registers @nestjs/passport once and exposes it globally so guards
// that extend AuthGuard(...) (PlayerAuthGuard, JwtAuthGuard) resolve
// their AuthModuleOptions dependency in ANY module that uses them.
// Both guards name their strategy explicitly, so defaultStrategy here
// is only a fallback and does not need to match.
// ============================================================

import { Global, Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';

@Global()
@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  exports: [PassportModule],
})
export class PassportGlobalModule {}