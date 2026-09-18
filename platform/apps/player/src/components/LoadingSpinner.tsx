import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

interface Props {
  size?: 'small' | 'large';
  color?: string;
}

export default function LoadingSpinner({ size = 'large', color = '#e94560' }: Props) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size={size} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a2e',
  },
});
