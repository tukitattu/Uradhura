import { GameBetConfig, GameResultData, GameRound, GameOption } from './types';

export function toNumber(value: string | number | null | undefined, fallback = 0): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback;
  }
  if (typeof value !== 'string' || value.trim() === '') {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function parseBetDenominations(betConfig: GameBetConfig | null): number[] {
  if (!betConfig) return [100, 500, 1000, 5000, 10000];
  try {
    const raw = typeof betConfig.denominations === 'string' ? JSON.parse(betConfig.denominations) : betConfig.denominations;
    if (Array.isArray(raw)) {
      return raw
        .map((d) => toNumber(d)) 
        .filter((d) => d > 0)
        .sort((a, b) => a - b);
    }
  } catch {
    // ignored: fall through to defaults
  }
  return [100, 500, 1000, 5000, 10000];
}

export function betConfigBounds(betConfig: GameBetConfig | null): { min: number; max: number } {
  return {
    min: toNumber(betConfig?.minBet, 100),
    max: toNumber(betConfig?.maxBet, 1000000),
  };
}

export function parseRoundResultData(round: GameRound | null | undefined): GameResultData | null {
  if (!round?.resultData) return null;
  try {
    return JSON.parse(round.resultData) as GameResultData;
  } catch {
    return null;
  }
}

export function optionEmoji(option: GameOption): string {
  const icon = (option.icon || '').trim();
  return icon.length > 0 && icon.length <= 4 ? icon : (option.name || option.label || '•').slice(0, 1);
}

export function formatMultiplier(value: string | number | null | undefined): string {
  const n = toNumber(value, 0);
  return `${n.toFixed(2)}x`;
}

export function formatCoins(value: string | number | null | undefined): string {
  return Math.round(toNumber(value, 0)).toLocaleString('en-US');
}

export function truncateHex(hash: string | null | undefined, keep = 12): string {
  if (!hash) return '-';
  return hash.length <= keep * 2 ? hash : `${hash.slice(0, keep)}…${hash.slice(-6)}`;
}