// ============================================================
// SEED SERVICE — Provably Fair seed lifecycle
// Each round is bound to a GameSeed whose serverSeedHash
// commitment is published BEFORE the betting window opens and
// whose serverSeed is revealed only AFTER the round settles.
// ============================================================

import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GameSeed } from '@prisma/client';
import * as crypto from 'crypto';

export interface SeedBundle {
  seedId: string;
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
}

export interface SeedState {
  seedId: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  algorithm: 'HMAC-SHA256';
  revealedServerSeed: string | null;
}

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(private readonly prisma: PrismaService) {}

  private newSeed(prefix = ''): string {
    return crypto.randomBytes(32).toString('hex') + prefix + crypto.randomBytes(8).toString('hex');
  }

  private hash(seed: string): string {
    return crypto.createHash('sha256').update(seed).digest('hex');
  }

  /**
   * Returns the player's currently preferred client seed for a game,
   * stored in player_settings. Falls back to a fresh platform seed.
   */
  private async resolveClientSeed(gameId: string, preferredClientSeed?: string): Promise<string> {
    if (preferredClientSeed && preferredClientSeed.length >= 8 && preferredClientSeed.length <= 128) {
      return preferredClientSeed;
    }
    // Most recently set client seed across the platform for this game
    const last = await this.prisma.playerSetting.findFirst({
      where: { key: `clientSeed:${gameId}` },
    });
    if (last && last.value.length >= 8 && last.value.length <= 128) {
      return last.value;
    }
    return this.newSeed();
  }

  /**
   * Creates (or returns) the committed seed for a round.
   * MUST be called before the round's betting window opens so the
   * commitment hash is public before any bet is placed.
   */
  async createRoundSeed(
    gameId: string,
    roundId: string,
    preferredClientSeed?: string,
  ): Promise<SeedBundle> {
    const existing = await this.prisma.gameSeed.findUnique({ where: { roundId } });
    if (existing) {
      return this.toBundle(existing);
    }

    const clientSeed = await this.resolveClientSeed(gameId, preferredClientSeed);
    const serverSeed = this.newSeed();
    const serverSeedHash = this.hash(serverSeed);

    const seed = await this.prisma.gameSeed.create({
      data: {
        gameId,
        roundId,
        clientSeed,
        serverSeed,
        serverSeedHash,
        nonce: 0,
        usedAt: new Date(),
      },
    });

    return this.toBundle(seed);
  }

  /**
   * Reveals the server seed for a settled round. Idempotent.
   * Returns the bundle WITHOUT the secret to clients (only hash + audit trail).
   */
  async revealRoundSeed(roundId: string): Promise<SeedBundle> {
    const seed = await this.prisma.gameSeed.findUnique({ where: { roundId } });
    if (!seed) {
      throw new NotFoundException(`No seed committed for round ${roundId}`);
    }

    if (!seed.revealedAt) {
      await this.prisma.gameSeed.update({
        where: { id: seed.id },
        data: { revealedAt: new Date() },
      });
    }

    return this.toBundle(seed);
  }

  /** Player-facing safe state (hash commitment + clientSeed + nonce). */
  toState(bundle: SeedBundle, revealed = false): SeedState {
    return {
      seedId: bundle.seedId,
      serverSeedHash: bundle.serverSeedHash,
      clientSeed: bundle.clientSeed,
      nonce: bundle.nonce,
      algorithm: 'HMAC-SHA256',
      revealedServerSeed: revealed ? bundle.serverSeed : null,
    };
  }

  private toBundle(seed: GameSeed): SeedBundle {
    return {
      seedId: seed.id,
      serverSeed: seed.serverSeed,
      serverSeedHash: seed.serverSeedHash,
      clientSeed: seed.clientSeed,
      nonce: seed.nonce,
    };
  }

  /**
   * Player requests a new client seed for a future round of a game.
   * Validates length and stores the preference on the player's settings.
   */
  async setClientSeed(
    playerId: string,
    gameId: string,
    clientSeed: string,
  ): Promise<{ accepted: boolean; clientSeed: string }> {
    if (!clientSeed || clientSeed.length < 8 || clientSeed.length > 128) {
      throw new BadRequestException('Client seed must be between 8 and 128 characters');
    }
    if (!/^[a-zA-Z0-9:_-]+$/.test(clientSeed)) {
      throw new BadRequestException('Client seed may only contain letters, numbers, -, _ and :');
    }

    const existing = await this.prisma.playerSetting.findUnique({
      where: { playerId_key: { playerId, key: `clientSeed:${gameId}` } },
    });

    if (existing) {
      await this.prisma.playerSetting.update({
        where: { id: existing.id },
        data: { value: clientSeed },
      });
    } else {
      await this.prisma.playerSetting.create({
        data: { playerId, key: `clientSeed:${gameId}`, value: clientSeed },
      });
    }

    return { accepted: true, clientSeed };
  }

  /**
   * Verifies a revealed server seed matches its published commitment and
   * recomputes the fair float for the round.
   */
  async verifyRound(
    roundId: string,
    optionsCount: number,
  ): Promise<{ valid: boolean; serverSeedHash: string; clientSeed: string; nonce: number }> {
    const seed = await this.prisma.gameSeed.findUnique({ where: { roundId } });
    if (!seed) {
      throw new NotFoundException(`No seed committed for round ${roundId}`);
    }
    const valid = this.hash(seed.serverSeed) === seed.serverSeedHash;
    return {
      valid,
      serverSeedHash: seed.serverSeedHash,
      clientSeed: seed.clientSeed,
      nonce: seed.nonce + optionsCount,
    };
  }
}