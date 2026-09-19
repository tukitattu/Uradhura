import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

interface CountdownRingProps {
  deadline: string | null;
  serverTimeOffset: number;
  totalMs?: number;
  size?: number;
  color?: string;
  trackColor?: string;
  label?: string;
}

const SEGMENTS = 36;
const TICK_MS = 250;

function useServerNow(serverTimeOffset: number): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, []);

  return now + serverTimeOffset;
}

export default function CountdownRing({
  deadline,
  serverTimeOffset,
  totalMs,
  size = 120,
  color = '#4ecca3',
  trackColor = '#24395f',
  label = 'BETTING CLOSES',
}: CountdownRingProps) {
  const serverNow = useServerNow(serverTimeOffset);
  const pulse = useRef(new Animated.Value(0)).current;

  const targetMs = deadline ? new Date(deadline).getTime() : null;
  const remaining = targetMs == null ? 0 : Math.max(0, targetMs - serverNow);
  const total = totalMs && totalMs > 0 ? totalMs : Math.max(targetMs == null ? 1 : targetMs - serverNow + remaining, 1);
  const fraction = targetMs == null ? 0 : Math.min(1, Math.max(0, remaining / total));

  const isUrgent = remaining > 0 && remaining <= 10000;

  useEffect(() => {
    if (isUrgent) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1, duration: 450, useNativeDriver: false }),
          Animated.timing(pulse, { toValue: 0, duration: 450, useNativeDriver: false }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
    pulse.setValue(0);
    return undefined;
  }, [isUrgent, pulse]);

  const dots = useMemo(() => {
    const radius = size / 2 - 9;
    const results: { left: number; top: number; active: boolean }[] = [];
    for (let i = 0; i < SEGMENTS; i++) {
      const angle = ((i / SEGMENTS) * 360 - 90) * (Math.PI / 180);
      const active = i / SEGMENTS <= fraction;
      results.push({
        left: size / 2 + radius * Math.cos(angle) - 3,
        top: size / 2 + radius * Math.sin(angle) - 3,
        active,
      });
    }
    return results;
  }, [size, fraction]);

  const seconds = Math.ceil(remaining / 1000);
  const display = seconds > 0 ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}` : '0:00';
  const accentColor = isUrgent ? '#e11d48' : color;

  return (
    <View style={styles.container}>
      <View style={[styles.ring, { width: size, height: size }]}>
        {dots.map((dot, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              {
                left: dot.left,
                top: dot.top,
                backgroundColor: dot.active ? accentColor : trackColor,
              },
            ]}
          />
        ))}
        <View style={styles.centerArea}>
          <Animated.Text
            style={[
              styles.time,
              { color: accentColor, opacity: isUrgent ? pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.35] }) : 1 },
            ]}
          >
            {display}
          </Animated.Text>
          <Text style={styles.label}>{label}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  ring: {
    borderRadius: 999,
    position: 'relative',
  },
  dot: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  centerArea: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  time: {
    fontSize: 24,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  label: {
    fontSize: 9,
    color: '#666',
    letterSpacing: 1,
    marginTop: 2,
    textAlign: 'center',
  },
});