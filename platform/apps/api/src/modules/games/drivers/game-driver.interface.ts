// ============================================================
// GAME DRIVER — Contract
// Every game type implements this interface. The engine only
// speaks to drivers; drivers know how to produce a fair,
// deterministic round outcome for their specific game.
// ============================================================

import { GameRound, GameOption, GameConfiguration } from '@prisma/client';
import { SeedBundle } from '../seed.service';

export type GameCategory = 'wheel' | 'card' | 'slot';

export interface DriverContext {
  round: GameRound;
  options: GameOption[];
  config: GameConfiguration | null;
  seed: SeedBundle;
}

export interface RoundOutcome {
  /**
   * The winning option id. Bets on this option win. May be null when the
   * game has a single bet surface (e.g. slots) — all bets settle against
   * the round payout multiplier.
   */
  winningOptionId: string | null;
  winningLabel: string;
  /** Human-readable result summary shown in result/history UI. */
  resultText: string;
  /** Raw resultData stored on GameRound + GameResult for the client. */
  resultData: Record<string, unknown>;
  /** Optional payout multiplier override (slots). Winning bets pay amount * multiplier. */
  payoutMultiplier?: number;
  /**
   * Client-facing fair-play payload: serverSeedHash commitment already
   * published at round creation, plus the revealed serverSeed after settle.
   */
  fairPlay: {
    serverSeedHash: string;
    clientSeed: string;
    nonce: number;
    serverSeed?: string; // revealed after settlement
  };
}

export interface GameDriver {
  /** internalCode this driver serves. */
  code: string;
  category: GameCategory;
  /** Generate a deterministic outcome for the round. Must NOT touch the DB. */
  generateOutcome(ctx: DriverContext): RoundOutcome;
  /** Presentational labels for the game's positions/options (extra hints). */
  describeOption(option: GameOption): { emoji: string; color: string };
}