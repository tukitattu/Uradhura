import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, radius } from '../../theme';

interface Props {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'gold' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: object;
}

const PALETTE = {
  primary: { bg: colors.primary, border: colors.cyan, text: '#ffffff' },
  gold: { bg: colors.goldDeep, border: colors.goldSoft, text: '#1a1205' },
  ghost: { bg: 'rgba(255,255,255,0.08)', border: colors.border, text: colors.text },
} as const;

export function BrandButton({ label, onPress, variant = 'primary', disabled, loading, icon, style }: Props) {
  const palette = PALETTE[variant];
  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor: palette.bg, borderColor: palette.border },
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
    >
      {loading ? (
        <ActivityIndicator color={palette.text} />
      ) : (
        <View style={styles.row}>
          {icon}
          <Text style={[styles.label, { color: palette.text }]}>{label}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: radius.lg,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { fontSize: 16, fontWeight: '700' },
  disabled: { opacity: 0.55 },
});