// ============================================================
// GAME ACCESS GUARD
// Restricts a targeted game route to the admins actually assigned
// to that game (AdminGame). Requires RequireGameAccess metadata
// on the handler; with no metadata the guard passes (role-level
// auth still applies). Resolves the game id from the route params
// (:id UUID or :internalCode).
// ============================================================

import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GAME_ACCESS_KEY, GameAccessMode } from '../decorators/game-access.decorator';
import { PrismaService } from '../../../prisma/prisma.service';

const GLOBAL_ROLES = ['super_admin', 'admin'];

@Injectable()
export class GameAccessGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const mode = this.reflector.getAllAndOverride<GameAccessMode>(GAME_ACCESS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!mode) return true;

    const req = context.switchToHttp().getRequest();
    const user = req.user;
    if (!user || !user.sub) throw new UnauthorizedException('Not authenticated');

    const roles: string[] = user.roles ?? [];
    if (roles.some((r) => GLOBAL_ROLES.includes(r))) return true;

    // Resolve the targeted game id.
    let gameId = req.params?.id as string | undefined;
    if (!gameId && req.params?.internalCode) {
      const game = await this.prisma.game.findUnique({
        where: { internalCode: req.params.internalCode },
        select: { id: true },
      });
      gameId = game?.id;
    }
    if (!gameId) return true; // not a game-targeted route

    const assignment = await this.prisma.adminGame.findUnique({
      where: { adminId_gameId: { adminId: user.sub, gameId } },
    });
    if (!assignment) {
      throw new ForbiddenException('No access to this game');
    }

    if (mode === 'edit' && !assignment.canEdit) {
      throw new ForbiddenException('Read-only access to this game');
    }
    if (!assignment.canView) {
      throw new ForbiddenException('No access to this game');
    }
    return true;
  }
}