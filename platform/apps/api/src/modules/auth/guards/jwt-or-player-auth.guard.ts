// ============================================================
// JWT OR PLAYER JWT GUARD — accepts EITHER an admin jwt OR a
// player-jwt token. Used for routes shared by the admin and
// player apps (e.g. GET /players/:id).
// ============================================================

import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtOrPlayerAuthGuard extends AuthGuard(['jwt', 'player-jwt']) {}