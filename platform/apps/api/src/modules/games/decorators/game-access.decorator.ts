// ============================================================
// GAME ACCESS DECORATOR
// Enforces per-assignment (AdminGame) access on a game route.
// 'edit' requires AdminGame.canEdit; 'view' requires canView.
// super_admin/admin bypass via the guard.
// ============================================================

import { SetMetadata } from '@nestjs/common';

export const GAME_ACCESS_KEY = 'gameAccess';
export type GameAccessMode = 'view' | 'edit';

export const RequireGameAccess = (mode: GameAccessMode) =>
  SetMetadata(GAME_ACCESS_KEY, mode);