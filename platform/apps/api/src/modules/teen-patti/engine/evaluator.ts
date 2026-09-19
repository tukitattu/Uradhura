import { TPCard } from './cards';

export interface TPHandRank {
  label: string;
  rank: number;
  values: [number, number, number];
}

export interface EvaluateOptions {
  rankingOrder?: string[];
}

export const TENPATTI_RANK_ORDER_DEFAULT: string[] = ['trail', 'pure_sequence', 'sequence', 'color', 'pair', 'high_card'];

function valuesAsc(cards: TPCard[]): number[] {
  return [...cards]
    .map((c) => c.r)
    .sort((a, b) => a - b);
}

function isSequence(values: number[]): boolean {
  if (values[0] + 1 === values[1] && values[1] + 1 === values[2]) return true;
  if (values[0] === 2 && values[1] === 3 && values[2] === 14) return true;
  return false;
}

function sequenceHigh(values: number[]): [number, number, number] {
  if (values[0] === 2 && values[1] === 3 && values[2] === 14) return [1, 2, 3];
  return [values[2], values[1], values[0]] as [number, number, number];
}

function isPair(values: number[]): boolean {
  return values[0] === values[1] || values[1] === values[2];
}

function pairValues(values: number[]): [number, number, number] {
  if (values[0] === values[1]) return [values[0], values[0], values[2]];
  return [values[1], values[1], values[0]];
}

export function evaluateHand(cards: TPCard[], opts: EvaluateOptions = {}): TPHandRank {
  const order = opts.rankingOrder ?? TENPATTI_RANK_ORDER_DEFAULT;
  const rankOf = (category: string): number => {
    const idx = order.map((c) => c.toLowerCase()).indexOf(category);
    if (idx === -1) return 0;
    return order.length - idx;
  };
  const asc = valuesAsc(cards);
  const suits = new Set(cards.map((c) => c.s));
  const isFlush = suits.size === 1;

  if (asc[0] === asc[1] && asc[1] === asc[2]) {
    return { label: 'Trail', rank: rankOf('trail'), values: [asc[2], asc[1], asc[0]] };
  }

  if (isSequence(asc) && isFlush) {
    const v = sequenceHigh(asc);
    return { label: 'Pure Sequence', rank: rankOf('pure_sequence'), values: v };
  }

  if (isSequence(asc)) {
    const v = sequenceHigh(asc);
    return { label: 'Sequence', rank: rankOf('sequence'), values: v };
  }

  if (isFlush) {
    return { label: 'Color', rank: rankOf('color'), values: [asc[2], asc[1], asc[0]] };
  }

  if (isPair(asc)) {
    const v = pairValues(asc);
    return { label: 'Pair', rank: rankOf('pair'), values: v };
  }

  return {
    label: 'High Card',
    rank: rankOf('high_card'),
    values: [asc[2], asc[1], asc[0]],
  };
}

export function compareHands(a: TPHandRank, b: TPHandRank): number {
  if (a.rank !== b.rank) return a.rank - b.rank;
  for (let i = 0; i < 3; i++) {
    if (a.values[i] !== b.values[i]) return a.values[i] - b.values[i];
  }
  return 0;
}

export function handLabelShort(cards: TPCard[]): string {
  return evaluateHand(cards).label;
}