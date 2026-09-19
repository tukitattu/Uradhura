// ============================================================
// PLAYER AUTH GUARD — requires a valid player access token
// ============================================================

import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class PlayerAuthGuard extends AuthGuard('player-jwt') {}