import { TPCard } from './cards';

export interface TPHandRank {
  label: string;
  rank: number;
  values: [number, number, number];
}

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

export function evaluateHand(cards: TPCard[]): TPHandRank {
  const asc = valuesAsc(cards);
  const suits = new Set(cards.map((c) => c.s));
  const isFlush = suits.size === 1;

  if (asc[0] === asc[1] && asc[1] === asc[2]) {
    return { label: 'Trail', rank: 6, values: [asc[2], asc[1], asc[0]] };
  }

  if (isSequence(asc) && isFlush) {
    const v = sequenceHigh(asc);
    return { label: 'Pure Sequence', rank: 5, values: v };
  }

  if (isSequence(asc)) {
    const v = sequenceHigh(asc);
    return { label: 'Sequence', rank: 4, values: v };
  }

  if (isFlush) {
    return { label: 'Color', rank: 3, values: [asc[2], asc[1], asc[0]] };
  }

  if (isPair(asc)) {
    const v = pairValues(asc);
    return { label: 'Pair', rank: 2, values: v };
  }

  return {
    label: 'High Card',
    rank: 1,
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