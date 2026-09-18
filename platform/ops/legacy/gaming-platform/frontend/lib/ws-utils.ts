// WebSocket utility functions for the gaming platform frontend
import { WSEvent } from '@/hooks/useWebSocket';

export type RoundStatus = 'UPCOMING' | 'BETTING_OPEN' | 'BETTING_CLOSED' | 'RESULT_PROCESSING' | 'SETTLED' | 'CLOSED';

export function isRoundEvent(event: WSEvent): boolean {
  return event.type.startsWith('round:');
}

export function isBetEvent(event: WSEvent): boolean {
  return event.type.startsWith('bet:');
}

export function isWalletEvent(event: WSEvent): boolean {
  return event.type.startsWith('wallet:');
}

// Merge WebSocket event data into existing round state
export function mergeRoundFromEvent<T extends { status: string; id: string; winnerId?: string | null }>(
  current: T | null,
  event: WSEvent
): T | null {
  if (!current || current.id !== event.roundId) return current;

  const merged = { ...current };

  switch (event.type) {
    case 'round:betting_closed':
      merged.status = 'BETTING_CLOSED';
      break;
    case 'round:result_set':
      merged.status = 'RESULT_PROCESSING';
      (merged as any).winnerId = event.data.winnerId;
      (merged as any).resultData = event.data.resultData;
      break;
    case 'round:settled':
      merged.status = 'SETTLED';
      (merged as any).winnerId = event.data.winnerId;
      break;
  }

  return merged;
}
