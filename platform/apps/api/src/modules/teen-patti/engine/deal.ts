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

export function dealHands(input: FairSeedInput, seats: DealSeat[]): { seats: DealtSeat[]; deck: TPCard[] } {
  const deck = FairRandom.shuffle(buildDeck(), { ...input, instance: 0 });
  const dealt = seats.map((s, i) => ({
    ...s,
    cards: deck.slice(i * 3, i * 3 + 3),
  }));
  return { seats: dealt, deck };
}