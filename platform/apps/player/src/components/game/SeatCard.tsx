import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import PlayingCard from './PlayingCard';
import { formatCoins, formatMultiplier } from '../../lib/game';

export interface SeatCardView {
  rank: string;
  suit: string;
}

interface SeatCardProps {
  seatName: string;
  icon: string;
  color: string;
  multiplier: string;
  cards: SeatCardView[];
  faceUp: boolean;
  isWinner: boolean;
  totalBets: number;
  totalAmount: string;
  dealt: boolean;
  baseDelay?: number;
}

export default function SeatCard({
  seatName,
  icon,
  color,
  multiplier,
  cards,
  faceUp,
  isWinner,
  totalBets,
  totalAmount,
  dealt,
  baseDelay = 0,
}: SeatCardProps) {
  return (
    <View
      style={[
        styles.seat,
        { borderColor: isWinner ? '#ffd700' : color },
        isWinner && styles.seatWinner,
      ]}
    >
      <View style={styles.header}>
        <Text style={[styles.icon, { color }]}>{icon}</Text>
        <Text style={styles.name} numberOfLines={1}>
          {seatName}
        </Text>
        <Text style={[styles.multiplier, { color }]}>{formatMultiplier(multiplier)}</Text>
      </View>

      <View style={styles.cards}>
        {cards.map((card, index) => (
          <PlayingCard
            key={`${card.rank}${card.suit}-${index}`}
            rank={card.rank}
            suit={card.suit}
            faceUp={faceUp}
            delayMs={baseDelay + index * 140}
            size={36}
            highlight={isWinner}
          />
        ))}
        {!dealt && <Text style={styles.dealing}>Dealing…</Text>}
      </View>

      <View style={styles.footer}>
        {isWinner && <Text style={styles.winBadge}>WIN</Text>}
        <Text style={styles.meta}>
          {totalBets > 0 ? `${totalBets} bets · ${formatCoins(totalAmount)}` : 'No bets'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  seat: {
    flex: 1,
    minWidth: 96,
    maxWidth: 150,
    backgroundColor: '#16243f',
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 10,
    alignItems: 'center',
  },
  seatWinner: {
    backgroundColor: '#3a3214',
    shadowColor: '#ffd700',
    shadowOpacity: 0.5,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  header: {
    alignItems: 'center',
    marginBottom: 8,
  },
  icon: {
    fontSize: 22,
  },
  name: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
    marginTop: 2,
  },
  multiplier: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 1,
  },
  cards: {
    flexDirection: 'row',
    gap: 3,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dealing: {
    color: '#666',
    fontSize: 11,
  },
  footer: {
    alignItems: 'center',
    marginTop: 8,
  },
  winBadge: {
    color: '#ffd700',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 2,
  },
  meta: {
    fontSize: 10,
    color: '#888',
    textAlign: 'center',
  },
});