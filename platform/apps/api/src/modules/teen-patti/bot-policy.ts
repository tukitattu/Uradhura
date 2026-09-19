import { FairSeedInput, FairRandom } from '../games/fair-random';
import { TPActionKind } from './engine/teen-patti-game';

export interface BotTableContext {
  pot: number;
  stake: number;
  stakeLevel: number;
  chaalCap: number;
  countInHand: number;
}

export interface BotSeatContext {
  chips: number;
  committed: number;
  isSeen: boolean;
  handRank: number;
}

const BOT_NAMES = [
  'Raja', 'Rani', 'Billa', 'Sheru', 'Gullu', 'Motta', 'Chotu', 'Diamond',
  'Akela', 'Bhalu', 'Pagla', 'Mastikhor', 'Jokar', 'Sultan', 'Lalu', 'Bhura',
];

export function botName(index: number): string {
  return BOT_NAMES[index % BOT_NAMES.length];
}

function pick(preferred: TPActionKind[], available: TPActionKind[]): TPActionKind {
  for (const p of preferred) {
    if (available.includes(p)) return p;
  }
  return available[0];
}

export function selectBotAction(
  input: FairSeedInput,
  step: number,
  seat: BotSeatContext,
  table: BotTableContext,
  available: TPActionKind[],
): TPActionKind {
  const base = FairRandom.float({ ...input, instance: step * 40 });
  const extra = FairRandom.float({ ...input, instance: step * 40 + 1 });
  const rank = seat.isSeen ? seat.handRank : 0;

  if (available.includes('show') && rank >= 3 && extra < 0.55) {
    return 'show';
  }

  if (seat.isSeen) {
    if (rank >= 5) {
      return available.includes('raise') && base < 0.8
        ? 'raise'
        : pick(['chaal', 'allin', 'fold'], available);
    }
    if (rank === 4) {
      return available.includes('raise') && base < 0.35
        ? 'raise'
        : pick(['chaal', 'allin', 'fold'], available);
    }
    if (rank === 3) {
      return base < 0.7 ? pick(['chaal', 'allin', 'fold'], available) : 'fold';
    }
    if (rank === 2) {
      return base < 0.55 ? pick(['chaal', 'allin', 'fold'], available) : 'fold';
    }
    if (base < 0.35) return pick(['chaal', 'allin', 'fold'], available);
    if (base < 0.5 && available.includes('raise') && extra < 0.3) return 'raise';
    return 'fold';
  }

  if (available.includes('see') && base < 0.4) return 'see';
  if (available.includes('blind')) {
    if (available.includes('raise') && extra < 0.18) return 'raise';
    return 'blind';
  }
  return pick(['allin', 'fold'], available);
}

export function formatChips(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}