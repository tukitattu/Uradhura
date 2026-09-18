import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

interface PlayingCardProps {
  rank: string;
  suit: string;
  faceUp: boolean;
  delayMs?: number;
  size?: number;
  highlight?: boolean;
}

function suitColor(suit: string): string {
  return suit === '♥' || suit === '♦' ? '#d32f2f' : '#1b1b2f';
}

export default function PlayingCard({ rank, suit, faceUp, delayMs = 0, size = 46, highlight }: PlayingCardProps) {
  const scaleY = useRef(new Animated.Value(1)).current;
  const [shown, setShown] = useState(faceUp);

  useEffect(() => {
    if (!faceUp) {
      setShown(false);
      scaleY.setValue(1);
      return;
    }
    if (shown) return;

    const timer = setTimeout(() => {
      Animated.sequence([
        Animated.timing(scaleY, { toValue: 0.08, duration: 100, useNativeDriver: false }),
        Animated.timing(scaleY, { toValue: 1, duration: 150, useNativeDriver: false }),
      ]).start(() => setShown(true));
    }, delayMs);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [faceUp, delayMs]);

  const height = size * 1.4;

  return (
    <Animated.View
      style={[
        styles.card,
        {
          width: size,
          height,
          transform: [{ scaleY }],
          backgroundColor: shown ? '#f7f7f7' : '#e94560',
          borderColor: highlight ? '#ffd700' : '#0f3460',
        },
      ]}
    >
      {shown ? (
        <>
          <Text style={[styles.rank, { color: suitColor(suit), fontSize: size * 0.34 }]}>{rank}</Text>
          <Text style={[styles.suit, { color: suitColor(suit), fontSize: size * 0.34 }]}>{suit}</Text>
        </>
      ) : (
        <View style={styles.backPattern}>
          <Text style={styles.backText}>◆</Text>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rank: {
    fontWeight: '800',
  },
  suit: {
    fontWeight: '700',
    marginTop: -2,
  },
  backPattern: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    color: '#ffffff',
    opacity: 0.6,
    fontSize: 16,
  },
});