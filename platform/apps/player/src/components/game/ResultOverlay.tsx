import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { RoundResultEvent, BetResultEvent, GameOption } from '../../lib/types';
import { formatCoins, optionEmoji } from '../../lib/game';

interface ResultOverlayProps {
  result: RoundResultEvent;
  personalResult: BetResultEvent | null;
  options: GameOption[];
  onDismiss: () => void;
}

function isSlotResult(result: RoundResultEvent): boolean {
  const data = result.result.resultData;
  return typeof data === 'object' && data !== null && Array.isArray((data as { reels?: unknown }).reels) && result.result.winningOptionId == null;
}

export default function ResultOverlay({ result, personalResult, options, onDismiss }: ResultOverlayProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 320, useNativeDriver: false }),
      Animated.timing(translateY, { toValue: 0, duration: 320, useNativeDriver: false }),
    ]).start();
  }, [opacity, translateY]);

  const winningOption = options.find((o) => o.id === result.result.winningOptionId) ?? null;
  const icon = winningOption
    ? optionEmoji(winningOption)
    : isSlotResult(result)
    ? ((result.result.resultData as { emoji?: string }).emoji ?? result.result.winningLabel)
    : result.result.winningLabel.slice(0, 1);
  const winningColor = winningOption?.colorHex ?? '#4ecca3';
  const won = personalResult?.status === 'won';
  const lost = personalResult?.status === 'lost';

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.wrap, { opacity, transform: [{ translateY }] }]}
    >
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={[styles.winIcon, { borderColor: winningColor }]}>
            <Text style={styles.winIconText}>{icon}</Text>
          </View>
          <View style={styles.info}>
            <Text style={styles.eyebrow}>Round #{result.roundNumber} result</Text>
            <Text style={[styles.winLabel, { color: winningColor }]} numberOfLines={2}>
              {result.result.winningLabel}
            </Text>
            <Text style={styles.meta}>
              {result.result.totalWinners > 0
                ? `${result.result.totalWinners} winner${result.result.totalWinners === 1 ? '' : 's'} · ${formatCoins(result.result.totalPayout)} paid out`
                : 'No winners this round'}
            </Text>
          </View>
        </View>

        {won && personalResult ? (
          <View style={[styles.personal, styles.personalWon]}>
            <Text style={styles.personalText}>
              You won {formatCoins(personalResult.payout)} coins!
            </Text>
          </View>
        ) : lost && personalResult ? (
          <View style={[styles.personal, styles.personalLost]}>
            <Text style={[styles.personalText, { color: '#e94560' }]}>
              You lost {formatCoins(personalResult.amount)} coins this round.
            </Text>
          </View>
        ) : null}

        <TouchableOpacity style={styles.dismissButton} onPress={onDismiss}>
          <Text style={styles.dismissText}>Get it</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 8,
    zIndex: 20,
  },
  card: {
    backgroundColor: '#16213e',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#4ecca3',
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  winIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  winIconText: {
    fontSize: 28,
  },
  info: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 11,
    color: '#888',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  winLabel: {
    fontSize: 18,
    fontWeight: '700',
  },
  meta: {
    fontSize: 12,
    color: '#aaa',
    marginTop: 2,
  },
  personal: {
    marginTop: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  personalWon: {
    backgroundColor: '#4ecca322',
  },
  personalLost: {
    backgroundColor: '#e9456022',
  },
  personalText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4ecca3',
  },
  dismissButton: {
    marginTop: 10,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#0f3460',
  },
  dismissText: {
    color: '#aaa',
    fontSize: 12,
    fontWeight: '600',
  },
});