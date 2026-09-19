import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius } from '../theme';

interface Props {
  coins: number;
  diamonds: number;
  large?: boolean;
}

export default function BalanceBar({ coins, diamonds, large }: Props) {
  return (
    <View style={[styles.container, large && styles.containerLarge]}>
      <View style={styles.chip}>
        <Text style={styles.coinIcon}>●</Text>
        <Text style={[styles.chipValue, large && styles.chipValueLarge]}>{coins.toLocaleString()}</Text>
      </View>
      <View style={styles.chip}>
        <Text style={styles.diamondIcon}>◆</Text>
        <Text style={[styles.chipValue, large && styles.chipValueLarge]}>{diamonds.toLocaleString()}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', gap: 12 },
  containerLarge: { gap: 20 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.glass,
    borderColor: colors.border,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    gap: 6,
  },
  coinIcon: { fontSize: 14, color: colors.gold },
  diamondIcon: { fontSize: 14, color: colors.cyan },
  chipValue: { fontSize: 14, fontWeight: '700', color: colors.text },
  chipValueLarge: { fontSize: 18 },
});