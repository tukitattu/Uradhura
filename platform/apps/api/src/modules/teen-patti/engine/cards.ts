export interface TPCard {
  r: number;
  s: number;
}

export const TPCardRanks: Record<number, string> = {
  2: '2',
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  7: '7',
  8: '8',
  9: '9',
  10: '10',
  11: 'J',
  12: 'Q',
  13: 'K',
  14: 'A',
};

export const TPCardSuits: Record<number, string> = {
  0: '♠',
  1: '♥',
  2: '♦',
  3: '♣',
};

export function cardLabel(card: TPCard): string {
  return `${TPCardRanks[card.r]}${TPCardSuits[card.s]}`;
}

export function buildDeck(): TPCard[] {
  const deck: TPCard[] = [];
  for (let s = 0; s < 4; s++) {
    for (let r = 2; r <= 14; r++) {
      deck.push({ r, s });
    }
  }
  return deck;
}