import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  coins: number;
  diamonds: number;
  large?: boolean;
}

export default function BalanceBar({ coins, diamonds, large }: Props) {
  return (
    <View style={[styles.container, large && styles.containerLarge]}>
      <View style={styles.chip}>
        <Text style={styles.chipIcon}>●</Text>
        <Text style={[styles.chipValue, large && styles.chipValueLarge]}>{coins.toLocaleString()}</Text>
      </View>
      <View style={styles.chip}>
        <Text style={[styles.chipIcon, styles.diamondIcon]}>◆</Text>
        <Text style={[styles.chipValue, large && styles.chipValueLarge]}>{diamonds.toLocaleString()}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 12,
  },
  containerLarge: {
    gap: 20,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16213e',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  chipIcon: {
    fontSize: 14,
    color: '#FFD700',
  },
  diamondIcon: {
    color: '#E94560',
  },
  chipValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  chipValueLarge: {
    fontSize: 18,
  },
});
