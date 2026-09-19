import { buildDeck, TPCard } from './cards';
import { FairRandom, FairSeedInput } from '../../games/fair-random';

export interface DealSeat {
  seatNo: number;
  playerId: string | null;
  isBot: boolean;
  chips: number;
  isSeen: boolean;
}

export interface DealtSeat extends DealSeat {
  cards: TPCard[];
}

export interface DealOptions {
  cardsPerPlayer?: number;
  deckCount?: number;
}

export function dealHands(input: FairSeedInput, seats: DealSeat[], opts: DealOptions = {}): { seats: DealtSeat[]; deck: TPCard[] } {
  const cardsPerPlayer = opts.cardsPerPlayer ?? 3;
  const deckCount = opts.deckCount ?? 1;
  const deck = FairRandom.shuffle(buildDeck(deckCount), { ...input, instance: 0 });
  const dealt = seats.map((s, i) => ({
    ...s,
    cards: deck.slice(i * cardsPerPlayer, i * cardsPerPlayer + cardsPerPlayer),
  }));
  return { seats: dealt, deck };
}