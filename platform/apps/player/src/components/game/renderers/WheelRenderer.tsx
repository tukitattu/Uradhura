import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View, Dimensions } from 'react-native';
import { GameRendererProps } from './types';
import { optionEmoji, formatMultiplier } from '../../../lib/game';
import { WheelResultData } from '../../../lib/types';

const FALLBACK_PALETTE = ['#e11d48', '#f5a623', '#4ecca3', '#7b61ff', '#2ea4ff', '#ff6fb5', '#f7e05e', '#ff8a5c'];

export default function WheelRenderer({ round, options, lastResult }: GameRendererProps) {
  const width = Dimensions.get('window').width;
  const size = Math.min(320, width - 40);

  const spin = useRef(new Animated.Value(0)).current;
  const spinRef = useRef(0);
  const [settled, setSettled] = useState(false);

  const segments = useMemo(() => options.filter((o) => o.isActive !== false), [options]);
  const segmentAngle = segments.length > 0 ? 360 / segments.length : 0;

  const resultData = useMemo(
    () => (lastResult?.result?.resultData as WheelResultData | undefined) ?? null,
    [lastResult]
  );
  const landAngle = resultData?.angle ?? (resultData?.optionIndex ?? 0) * segmentAngle;
  const winningIndex = resultData?.optionIndex ?? -1;

  // Spin ONLY when the server broadcasts the result (round_result). The landing
  // point is the server-computed angle; the spins above it are presentation.
  useEffect(() => {
    if (lastResult == null || segments.length === 0) return;
    if (resultData == null) return;

    const targetMod = (360 - (landAngle % 360)) % 360;
    const currentMod = ((spinRef.current % 360) + 360) % 360;
    let delta = targetMod - currentMod;
    if (delta < 0) delta += 360;
    delta += 360 * 3;

    setSettled(false);
    Animated.timing(spin, {
      toValue: spinRef.current + delta,
      duration: 3200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        spinRef.current += delta;
        setSettled(true);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastResult && lastResult.roundId]);

  if (segments.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Wheel is being set up. No options yet.</Text>
      </View>
    );
  }

  const radius = size / 2 - 16;
  const halfBase = radius * Math.tan((segmentAngle / 2) * (Math.PI / 180));

  return (
    <View style={styles.container}>
      <View style={[styles.wheelFrame, { width: size, height: size }]}>
        <Animated.View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            overflow: 'hidden',
            transform: [{ rotate: spin.interpolate({ inputRange: [0, 360], outputRange: ['0deg', '360deg'] }) }],
            backgroundColor: '#0a1220',
          }}
        >
          {segments.map((option, index) => {
            const phi = index * segmentAngle;
            const color = option.colorHex || FALLBACK_PALETTE[index % FALLBACK_PALETTE.length];
            const isWinner = settled && index === winningIndex;
            return (
              <View
                key={option.id}
                style={{ position: 'absolute', left: 0, top: 0, width: size, height: size, transform: [{ rotate: `${phi}deg` }] }}
              >
                <View
                  style={{
                    position: 'absolute',
                    left: size / 2 - halfBase,
                    top: size / 2 - radius,
                    width: 0,
                    height: 0,
                    borderTopWidth: radius,
                    borderLeftWidth: halfBase,
                    borderRightWidth: halfBase,
                    borderTopColor: isWinner ? '#ffffff' : color,
                    borderLeftColor: 'transparent',
                    borderRightColor: 'transparent',
                  }}
                />
                <View
                  style={{
                    position: 'absolute',
                    left: size / 2 - 30,
                    top: size / 2 - radius + 12,
                    width: 60,
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={[styles.segmentIcon, { textAlign: 'center' }]}
                    numberOfLines={1}
                  >
                    {optionEmoji(option)}
                  </Text>
                </View>
              </View>
            );
          })}
        </Animated.View>

        <View pointerEvents="none" style={[styles.hub, { width: 76, height: 76, borderRadius: 38 }]}>
          <Text style={styles.hubText}>{settled && winningIndex >= 0 ? optionEmoji(segments[winningIndex]) : 'GO'}</Text>
        </View>
        <View pointerEvents="none" style={styles.pointer}>
          <Text style={styles.pointerText}>▼</Text>
        </View>
      </View>

      <View style={styles.legend}>
        {segments.map((option, index) => (
          <View key={option.id} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: option.colorHex || FALLBACK_PALETTE[index % FALLBACK_PALETTE.length] }]} />
            <Text style={styles.legendText} numberOfLines={1}>
              {option.label} {formatMultiplier(option.multiplier)}
            </Text>
          </View>
        ))}
      </View>

      {lastResult != null && !settled && (
        <Text style={styles.spinningNote}>Spinning…</Text>
      )}
      {round?.status === 'betting_closed' && lastResult == null && (
        <Text style={styles.pendingNote}>Weighing the result…</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#888',
    fontSize: 14,
  },
  wheelFrame: {
    position: 'relative',
  },
  hub: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    marginLeft: -38,
    marginTop: -38,
    backgroundColor: '#16243f',
    borderWidth: 2,
    borderColor: '#24395f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hubText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  pointer: {
    position: 'absolute',
    top: -22,
    alignSelf: 'center',
  },
  pointerText: {
    color: '#e11d48',
    fontSize: 20,
  },
  segmentIcon: {
    fontSize: 15,
    color: '#fff',
    maxWidth: 46,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginTop: 16,
    paddingHorizontal: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#16243f',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  legendDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    color: '#ddd',
    maxWidth: 130,
  },
  spinningNote: {
    marginTop: 14,
    color: '#4ecca3',
    fontSize: 13,
    fontWeight: '600',
  },
  pendingNote: {
    marginTop: 14,
    color: '#aaa',
    fontSize: 13,
  },
});