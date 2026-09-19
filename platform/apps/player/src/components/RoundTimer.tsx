import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  deadline: string;
  onComplete: () => void;
}

export default function RoundTimer({ deadline, onComplete }: Props) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const calculate = () => {
      const now = new Date().getTime();
      const end = new Date(deadline).getTime();
      return Math.max(0, Math.floor((end - now) / 1000));
    };

    setRemaining(calculate());

    const interval = setInterval(() => {
      const secs = calculate();
      setRemaining(secs);
      if (secs <= 0) {
        clearInterval(interval);
        onComplete();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [deadline, onComplete]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const isUrgent = remaining <= 10;

  return (
    <View style={[styles.container, isUrgent && styles.containerUrgent]}>
      <Text style={[styles.time, isUrgent && styles.timeUrgent]}>
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0a1220',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignSelf: 'center',
    marginBottom: 8,
  },
  containerUrgent: {
    backgroundColor: '#e11d4820',
  },
  time: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4ecca3',
    fontVariant: ['tabular-nums'],
  },
  timeUrgent: {
    color: '#e11d48',
  },
});
