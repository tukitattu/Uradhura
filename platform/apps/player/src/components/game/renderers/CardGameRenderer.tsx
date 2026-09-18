import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GameRendererProps } from './types';
import SeatCard, { SeatCardView } from '../SeatCard';
import { optionEmoji } from '../../../lib/game';
import { CardGameResultData, GameCardData } from '../../../lib/types';

const PALETTE = ['#e94560', '#4ecca3', '#f5a623', '#7b61ff'];

function toView(card: GameCardData): SeatCardView {
  return { rank: card.rank, suit: card.suit };
}

export default function CardGameRenderer({ game, round, options, betTotals, lastResult }: GameRendererProps) {
  const resultData = useMemo(
    () => (lastResult?.result?.resultData as CardGameResultData | undefined) ?? null,
    [lastResult]
  );
  const isTeenPatti = game?.internalCode !== 'three_card';
  const cardsPerSeat = isTeenPatti ? 3 : 1;

  const seats = useMemo(() => {
    if (resultData?.seats?.length) {
      return resultData.seats.map((seat, index) => {
        const seatOption = options.find((o) => o.id === seat.seatId) ?? options[index];
        return {
          seatId: seat.seatId,
          seatName: seat.seatName,
          multiplier: seat.multiplier,
          icon: seatOption ? optionEmoji(seatOption) : seat.seatName.slice(0, 1),
          color: seatOption?.colorHex || PALETTE[index % PALETTE.length],
          cards: seat.cards?.length ? seat.cards.map(toView) : seat.card ? [toView(seat.card)] : [],
          isWinner:
            seat.isWinner === true ||
            resultData.winningSeatId === seat.seatId ||
            resultData.winningIndex === index,
        };
      });
    }
    return options.map((option, index) => ({
      seatId: option.id,
      seatName: option.name || option.label,
      multiplier: option.multiplier,
      icon: optionEmoji(option),
      color: option.colorHex || PALETTE[index % PALETTE.length],
      cards: [],
      isWinner: false,
    }));
  }, [options, resultData]);

  const placeholderCards: SeatCardView[] = useMemo(
    () => Array.from({ length: cardsPerSeat }, () => ({ rank: '?', suit: '♠' })),
    [cardsPerSeat]
  );

  const faceUp = lastResult != null;

  if (seats.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Seats are being prepared for this table.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.table}>
        {seats.map((seat, index) => {
          const total = betTotals[seat.seatId];
          return (
            <SeatCard
              key={seat.seatId}
              seatName={seat.seatName}
              icon={seat.icon}
              color={seat.color}
              multiplier={seat.multiplier}
              cards={faceUp && seat.cards.length ? seat.cards : placeholderCards}
              faceUp={faceUp && seat.cards.length > 0}
              isWinner={faceUp && seat.isWinner}
              totalBets={total?.count ?? 0}
              totalAmount={total?.total ?? '0'}
              dealt={faceUp && seat.cards.length > 0}
              baseDelay={index * 160}
            />
          );
        })}
      </View>
      {round?.status === 'betting_closed' && !faceUp && (
        <Text style={styles.pendingNote}>Dealing cards…</Text>
      )}
      {resultData && (
        <Text style={styles.handNote}>
          Winning hand: {resultData.seats.find((s) => s.seatId === resultData.winningSeatId)?.handRank ?? lastResult?.result.winningLabel}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  table: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'stretch',
    gap: 8,
    paddingHorizontal: 8,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#888',
    fontSize: 14,
  },
  pendingNote: {
    marginTop: 14,
    color: '#aaa',
    fontSize: 13,
  },
  handNote: {
    marginTop: 14,
    color: '#4ecca3',
    fontSize: 13,
    fontWeight: '600',
  },
});