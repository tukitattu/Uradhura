import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { GameRendererProps } from './types';
import { formatMultiplier } from '../../../lib/game';
import { SlotResultData } from '../../../lib/types';

const PLACEHOLDER = ['🍒', '🍋', '🍇'];

export default function SlotRenderer({ round, lastResult }: GameRendererProps) {
  const resultData = useMemo(
    () => (lastResult?.result?.resultData as SlotResultData | undefined) ?? null,
    [lastResult]
  );

  const reveal = useRef([new Animated.Value(1), new Animated.Value(1), new Animated.Value(1)]).current;
  const spinPhase = round?.status === 'betting_closed' && lastResult == null;

  useEffect(() => {
    if (lastResult == null) return;
    reveal.forEach((value) => value.setValue(0));
    Animated.stagger(
      130,
      reveal.map((value) =>
        Animated.timing(value, {
          toValue: 1,
          duration: 420,
          easing: Easing.out(Easing.back(1.4)),
          useNativeDriver: false,
        })
      )
    ).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastResult && lastResult.roundId]);

  const reels: string[][] = resultData?.reels ?? [PLACEHOLDER, PLACEHOLDER, PLACEHOLDER];
  const winningSymbol = resultData?.symbol ?? null;

  return (
    <View style={styles.container}>
      <View style={styles.machine}>
        <View style={styles.reels}>
          {reels.map((column, reelIndex) => (
            <Animated.View
              key={reelIndex}
              style={[
                styles.reel,
                {
                  opacity: reveal[reelIndex] ?? 1,
                  transform: [
                    {
                      translateY: (reveal[reelIndex] ?? new Animated.Value(1)).interpolate({
                        inputRange: [0, 1],
                        outputRange: [-24, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              {column.map((symbol, rowIndex) => {
                const onPayline = rowIndex === 1;
                const isWinner = onPayline && winningSymbol != null && symbol === winningSymbol;
                return (
                  <View
                    key={rowIndex}
                    style={[
                      styles.cell,
                      onPayline && styles.cellPayline,
                      isWinner && styles.cellWinner,
                    ]}
                  >
                    <Text style={styles.symbol}>{symbol}</Text>
                  </View>
                );
              })}
            </Animated.View>
          ))}
        </View>

        {spinPhase && (
          <View style={styles.overlay}>
            <Text style={styles.overlayText}>Spinning…</Text>
          </View>
        )}
      </View>

      {resultData && (
        <View style={styles.resultRow}>
          <Text style={styles.resultSymbol}>{resultData.emoji || resultData.symbol}</Text>
          <Text style={styles.resultMultiplier}>{formatMultiplier(resultData.multiplier)}</Text>
        </View>
      )}
      {!resultData && (
        <Text style={styles.hint}>Match the centre row symbols to win the payline multiplier.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 18,
  },
  machine: {
    position: 'relative',
    backgroundColor: '#24395f',
    borderRadius: 16,
    padding: 12,
    borderWidth: 2,
    borderColor: '#e11d48',
  },
  reels: {
    flexDirection: 'row',
    gap: 8,
  },
  reel: {
    gap: 8,
  },
  cell: {
    width: 58,
    height: 58,
    borderRadius: 10,
    backgroundColor: '#0a1220',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#16243f',
  },
  cellPayline: {
    borderColor: '#4ecca3',
  },
  cellWinner: {
    backgroundColor: '#4ecca330',
    borderColor: '#ffd700',
  },
  symbol: {
    fontSize: 28,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15,52,96,0.55)',
    borderRadius: 16,
  },
  overlayText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
  },
  resultSymbol: {
    fontSize: 30,
  },
  resultMultiplier: {
    fontSize: 22,
    fontWeight: '800',
    color: '#4ecca3',
  },
  hint: {
    marginTop: 16,
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 30,
  },
});