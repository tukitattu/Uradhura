import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { colors } from '../theme';
import { BrandAsset } from '../lib/assets/BrandAsset';

interface Props {
  size?: 'small' | 'large';
  brand?: boolean;
}

export default function LoadingSpinner({ size = 'large', brand = true }: Props) {
  return (
    <View style={styles.container}>
      {brand ? (
        <>
          <BrandAsset assetKey="logo.uradhura-emblem" size={56} />
          <ActivityIndicator size={size} color={colors.cyan} style={styles.spinner} />
        </>
      ) : (
        <ActivityIndicator size={size} color={colors.cyan} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    gap: 16,
  },
  spinner: { marginTop: 4 },
});