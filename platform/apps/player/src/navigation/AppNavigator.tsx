import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import AuthStack from './AuthStack';
import MainTabs from './MainTabs';
import { BrandAsset } from '../lib/assets/BrandAsset';
import { colors } from '../theme';

export default function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.splash}>
        <BrandAsset assetKey="logo.uradhura-splash" size={220} />
      </View>
    );
  }

  return isAuthenticated ? <MainTabs /> : <AuthStack />;
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});