import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandBackground } from './BrandBackground';
import { colors, spacing } from '../../theme';
import { BrandAsset } from '../../lib/assets/BrandAsset';

interface Props {
  background: string;
  title?: string;
  icon?: string;
  overlay?: number;
  scroll?: boolean;
  keyboardAvoid?: boolean;
  refreshControl?: React.ComponentProps<typeof ScrollView>['refreshControl'];
  headerRight?: React.ReactNode;
  contentStyle?: object;
  contentContainerStyle?: object;
  children: React.ReactNode;
}

/** Branded screen shell: full-bleed background, header and scrolled content. */
export function BrandScreen({
  background,
  title,
  icon,
  overlay,
  scroll = true,
  keyboardAvoid = false,
  refreshControl,
  headerRight,
  contentStyle,
  contentContainerStyle,
  children,
}: Props) {
  const content = scroll ? (
    <ScrollView
      style={[styles.content, contentStyle]}
      contentContainerStyle={[styles.contentContainer, contentContainerStyle]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      refreshControl={refreshControl}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, styles.contentFixed, contentStyle]}>{children}</View>
  );

  return (
    <BrandBackground assetKey={background} overlay={overlay}>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          enabled={keyboardAvoid}
        >
          {(title || headerRight) && (
            <View style={styles.header}>
              {icon && <BrandAsset assetKey={icon} size={22} />}
              {title && <Text style={styles.headerTitle}>{title}</Text>}
              <View style={styles.headerSpacer} />
              {headerRight}
            </View>
          )}
          {content}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </BrandBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  headerTitle: {
    color: colors.textSoft,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  headerSpacer: { flex: 1 },
  content: { flex: 1 },
  contentFixed: { flex: 1 },
  contentContainer: { paddingBottom: 40, paddingHorizontal: spacing.xl },
});