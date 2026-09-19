import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image, Alert } from 'react-native';
import { useAssets } from '../../lib/assets/AssetProvider';
import { useWallet } from '../../hooks/useWallet';
import { useAuth } from '../../contexts/AuthContext';
import { loadDress } from '../../lib/assets/avatarConfig';
import { BrandScreen } from '../../components/ui/BrandScreen';
import { BrandAsset } from '../../lib/assets/BrandAsset';
import { imageFor } from '../../lib/assets/uraliveImages';
import LoadingSpinner from '../../components/LoadingSpinner';
import { colors, radius, spacing, backgroundKeys } from '../../theme';

export default function MyItemsScreen({ navigation }: any) {
  const { manifest } = useAssets();
  const { data: wallet, isLoading: walletLoading } = useWallet();
  const { user } = useAuth();
  const [dress, setDress] = useState<{ frame: string | null; parts: string[] } | null>(null);

  React.useEffect(() => {
    loadDress().then(setDress);
  }, []);

  if (!dress || walletLoading) return <LoadingSpinner />;

  const ownedBundled = (manifest?.assets ?? []).filter(
    (a) => a.category.startsWith('gifts.') && a.isBundled
  );
  const gifts = (wallet?.transactions ?? []).filter((t) => t.type === 'gift');

  const equippedFrame = dress.frame ? imageFor(dress.frame) : null;

  return (
    <BrandScreen background={backgroundKeys.ranking} title="My Items" icon="icons.profile.items" scroll={false}>
      <FlatList
        data={ownedBundled}
        keyExtractor={(item) => item.key}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.equippedCard}>
              <View style={styles.avatarWrap}>
                {user?.avatar ? (
                  <Image source={{ uri: user.avatar }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarFallback]}>
                    <BrandAsset assetKey="logo.uradhura-emblem" size={36} />
                  </View>
                )}
                {equippedFrame && (
                  <Image source={equippedFrame} style={styles.frame} resizeMode="contain" />
                )}
              </View>
              <View style={styles.equippedInfo}>
                <Text style={styles.equippedTitle}>Equipped look</Text>
                <Text style={styles.equippedSubtitle}>
                  {dress.frame ?? 'Default'} + {dress.parts.length} parts
                </Text>
              </View>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => navigation.navigate('AvatarStudio')}
              >
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
            </View>

            {gifts.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Gift record</Text>
                {gifts.slice(-5).reverse().map((g) => (
                  <View key={g.id} style={styles.giftRow}>
                    <Text style={styles.giftDesc} numberOfLines={1}>{g.description}</Text>
                    <Text style={styles.giftAmount}>{g.amount} {g.currency}</Text>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Owned gifts</Text>
              <Text style={styles.sectionHint}>Bundled with your APK — shown in the gift tray.</Text>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.itemCard}
            activeOpacity={0.8}
            onPress={() => Alert.alert(item.name, 'This gift is in your tray — send it in any room.')}
          >
            <BrandAsset assetKey={item.key} size={44} />
            <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
          </TouchableOpacity>
        )}
      />
    </BrandScreen>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.lg, paddingBottom: 40 },
  header: { gap: spacing.xl, marginBottom: spacing.xl },
  equippedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.glass,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.xl,
    padding: spacing.lg,
  },
  avatarWrap: { width: 96, height: 96, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 78, height: 78, borderRadius: 39 },
  avatarFallback: {
    backgroundColor: colors.violet,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: { position: 'absolute', width: 96, height: 96 },
  equippedInfo: { flex: 1 },
  equippedTitle: { fontSize: 16, fontWeight: '800', color: colors.textSoft, marginBottom: 4 },
  equippedSubtitle: { fontSize: 12, color: colors.textSecondary },
  editButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  editButtonText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  section: { gap: spacing.md },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: colors.textSoft },
  sectionHint: { fontSize: 12, color: colors.textMuted },
  giftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.glass,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  giftDesc: { flex: 1, color: colors.textSecondary, fontSize: 13 },
  giftAmount: { color: colors.gold, fontSize: 13, fontWeight: '700' },
  row: { justifyContent: 'space-between' },
  itemCard: {
    width: '48%',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.glass,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    marginBottom: spacing.md,
  },
  itemName: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
});