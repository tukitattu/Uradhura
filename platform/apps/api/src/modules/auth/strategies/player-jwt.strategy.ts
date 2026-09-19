// ============================================================
// PLAYER JWT STRATEGY
// Validates player access tokens (payload.type === 'player').
// ============================================================

import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';

interface PlayerJwtPayload {
  sub: string;
  username: string;
  email: string;
  type?: string;
}

@Injectable()
export class PlayerJwtStrategy extends PassportStrategy(Strategy, 'player-jwt') {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET'),
    });
  }

  async validate(payload: PlayerJwtPayload) {
    if (payload.type !== 'player') {
      return false;
    }

    const player = await this.prisma.player.findUnique({
      where: { id: payload.sub },
      select: { id: true, username: true, email: true, isActive: true, isBanned: true },
    });

    if (!player || !player.isActive || player.isBanned) {
      return false;
    }

    return {
      sub: player.id,
      username: player.username,
      email: player.email,
      type: 'player' as const,
    };
  }
}