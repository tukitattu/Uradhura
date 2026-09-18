// ============================================================
// CURRENT PLAYER DECORATOR
// ============================================================

import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface CurrentPlayerData {
  sub: string;
  username: string;
  email: string | null;
}

export const CurrentPlayer = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentPlayerData => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);