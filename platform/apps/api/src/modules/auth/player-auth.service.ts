// ============================================================
// PLAYER AUTH SERVICE
// Player-facing registration, login, refresh, profile.
// Separate from AdminUser auth: tokens carry type: 'player'.
// ============================================================

import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { PlayerRegisterDto, PlayerLoginDto } from './dto/player-auth.dto';
import { toPlayerDto } from '../players/player.mapper';

@Injectable()
export class PlayerAuthService {
  private readonly logger = new Logger(PlayerAuthService.name);
  private readonly SALT_ROUNDS = 12;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: PlayerRegisterDto) {
    const existingUsername = await this.prisma.player.findUnique({ where: { username: dto.username } });
    if (existingUsername) throw new ConflictException('Username already taken');

    const existingEmail = await this.prisma.player.findUnique({ where: { email: dto.email } });
    if (existingEmail) throw new ConflictException('Email already registered');

    if (dto.phone) {
      const existingPhone = await this.prisma.player.findUnique({ where: { phone: dto.phone } });
      if (existingPhone) throw new ConflictException('Phone number already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, this.SALT_ROUNDS);

    const player = await this.prisma.$transaction(async (tx) => {
      const created = await tx.player.create({
        data: {
          username: dto.username,
          email: dto.email,
          phone: dto.phone ?? null,
          displayName: dto.displayName ?? dto.username,
          passwordHash,
        },
      });
      await tx.walletAccount.create({ data: { playerId: created.id } });
      return created;
    });

    return this.issueTokens(player);
  }

  async login(dto: PlayerLoginDto) {
    const player = await this.prisma.player.findFirst({
      where: {
        OR: [{ username: dto.identifier }, { email: dto.identifier }],
      },
    });

    if (!player) throw new UnauthorizedException('Invalid credentials');
    if (player.isBanned) throw new UnauthorizedException('Account is banned');
    if (!player.isActive) throw new UnauthorizedException('Account is inactive');

    const valid = await bcrypt.compare(dto.password, player.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    await this.prisma.player.update({
      where: { id: player.id },
      data: { lastLoginAt: new Date() },
    });

    return this.issueTokens(player);
  }

  async refresh(rawToken: string) {
    const record = await this.prisma.playerRefreshToken.findUnique({ where: { token: rawToken } });
    if (!record || record.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const player = await this.prisma.player.findUnique({ where: { id: record.playerId } });
    if (!player || !player.isActive || player.isBanned) {
      throw new UnauthorizedException('Player not found or inactive');
    }

    await this.prisma.playerRefreshToken.delete({ where: { id: record.id } });
    return this.issueTokens(player);
  }

  async logout(rawToken: string) {
    await this.prisma.playerRefreshToken.deleteMany({ where: { token: rawToken } });
  }

  async getProfile(playerId: string) {
    const player = await this.prisma.player.findUnique({
      where: { id: playerId },
      include: {
        wallet: { select: { coinBalance: true, diamondBalance: true } },
        level: true,
        _count: {
          select: {
            posts: true,
            followers: true,
            following: true,
          },
        },
      },
    });
    if (!player) throw new NotFoundException('Player not found');
    return toPlayerDto(player);
  }

  private async issueTokens(player: { id: string; username: string; email: string | null; avatar: string | null; displayName: string | null }) {
    const payload = {
      sub: player.id,
      username: player.username,
      email: player.email ?? '',
      type: 'player' as const,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: this.configService.get('JWT_ACCESS_EXPIRY', '15m'),
    });

    const refreshTokenValue = `${randomUUID()}.${randomUUID()}`;
    const refreshExpiryDays = Number(this.configService.get('JWT_REFRESH_EXPIRY_DAYS', 30));

    await this.prisma.playerRefreshToken.create({
      data: {
        playerId: player.id,
        token: refreshTokenValue,
        expiresAt: new Date(Date.now() + refreshExpiryDays * 24 * 60 * 60 * 1000),
      },
    });

    return {
      user: await this.getProfile(player.id),
      accessToken,
      refreshToken: refreshTokenValue,
    };
  }
}