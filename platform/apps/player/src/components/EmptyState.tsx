import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme';
import { BrandAsset } from '../lib/assets/BrandAsset';

interface Props {
  message?: string;
  detail?: string;
  icon?: string;
}

export default function EmptyState({ message = 'Nothing here yet', detail, icon = 'events.banner-bg' }: Props) {
  return (
    <View style={styles.container}>
      <BrandAsset assetKey={icon} size={72} />
      <Text style={styles.message}>{message}</Text>
      {detail ? <Text style={styles.detail}>{detail}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
    gap: 12,
  },
  message: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  detail: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 19,
  },
});