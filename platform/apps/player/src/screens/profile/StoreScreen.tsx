import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image, SectionList } from 'react-native';
import { useAssets } from '../../lib/assets/AssetProvider';
import { ManifestAsset } from '../../lib/assets/types';
import { BrandScreen } from '../../components/ui/BrandScreen';
import { BrandAsset } from '../../lib/assets/BrandAsset';
import { imageFor } from '../../lib/assets/uraliveImages';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useAuth } from '../../contexts/AuthContext';
import { colors, radius, spacing, backgroundKeys } from '../../theme';

type Nav = { navigate: (name: string, params?: object) => void; getParent: () => any };

const STORE_SECTIONS: { title: string; categories: string[]; hint: string }[] = [
  { title: 'Avatars & frames', categories: ['avatars.default', 'avatars.frames', 'frame.avatar'], hint: 'Equip in the avatar studio.' },
  { title: 'Gifts', categories: ['gifts.basic', 'gifts.premium', 'gifts.luxury'], hint: 'Bundled items are already yours.' },
  { title: 'VIP & badges', categories: ['vip', 'badges', 'frame.vip', 'frame.level'], hint: 'Earned by level and VIP tier.' },
];

function AssetCard({ asset, onAction }: { asset: ManifestAsset; onAction: () => void }) {
  if (asset.isBundled && imageFor(asset.key)) {
    return (
      <TouchableOpacity style={styles.itemCard} activeOpacity={0.8} onPress={onAction}>
        <BrandAsset assetKey={asset.key} size={44} />
        <Text style={styles.itemName} numberOfLines={1}>{asset.name}</Text>
        <Text style={styles.itemTag}>{asset.category.startsWith('gifts.') ? 'In tray' : 'Equip'}</Text>
      </TouchableOpacity>
    );
  }
  if (asset.thumbnailUrl || asset.url) {
    return (
      <TouchableOpacity style={styles.itemCard} activeOpacity={0.8} onPress={onAction}>
        <Image source={{ uri: asset.thumbnailUrl || asset.url }} style={styles.remoteThumb} resizeMode="cover" />
        <Text style={styles.itemName} numberOfLines={1}>{asset.name}</Text>
        <Text style={styles.itemNew}>New</Text>
      </TouchableOpacity>
    );
  }
  return (
    <View style={styles.itemCard}>
      <BrandAsset assetKey={asset.key} size={44} />
      <Text style={styles.itemName} numberOfLines={1}>{asset.name}</Text>
      <Text style={styles.itemTag}>Coming</Text>
    </View>
  );
}

export default function StoreScreen({ navigation }: { navigation: Nav }) {
  const { manifest } = useAssets();
  const { user } = useAuth();

  const sections = STORE_SECTIONS.map((s) => ({
    title: s.title,
    hint: s.hint,
    data: (manifest?.assets ?? []).filter((a) => s.categories.some((c) => a.category === c || a.category.startsWith(`${c}.`))),
  })).filter((s) => s.data.length > 0);

  if (!manifest) return <LoadingSpinner />;

  const openTopUp = () =>
    navigation.getParent()?.getParent()?.navigate('Wallet', { screen: 'Deposit' });

  return (
    <BrandScreen background={backgroundKeys.ranking} title="Store" icon="icons.profile.store" scroll={false}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.key}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.balanceCard}>
            <View style={styles.balanceRow}>
              <Text style={styles.balanceLabel}>Coins</Text>
              <Text style={styles.balanceValue}>{user?.coins ?? 0}</Text>
            </View>
            <View style={styles.balanceRow}>
              <Text style={styles.balanceLabel}>Diamonds</Text>
              <Text style={styles.balanceValue}>{user?.diamonds ?? 0}</Text>
            </View>
            <TouchableOpacity style={styles.topUpButton} onPress={openTopUp}>
              <Text style={styles.topUpText}>Top up</Text>
            </TouchableOpacity>
          </View>
        }
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionHint}>{section.hint}</Text>
          </View>
        )}
        renderSectionFooter={() => <View style={styles.sectionGap} />}
        renderItem={({ item }) => (
          <AssetCard asset={item} onAction={() => item.isBundled ? undefined : openTopUp()} />
        )}
      />
    </BrandScreen>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.lg, paddingBottom: 40 },
  balanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    backgroundColor: colors.glass,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  balanceRow: { alignItems: 'center', gap: 2 },
  balanceLabel: { fontSize: 11, color: colors.textMuted },
  balanceValue: { fontSize: 16, fontWeight: '800', color: colors.textSoft },
  topUpButton: {
    marginLeft: 'auto',
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: radius.pill,
  },
  topUpText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  sectionHead: { marginBottom: spacing.md, gap: 2 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: colors.textSoft },
  sectionHint: { fontSize: 12, color: colors.textMuted },
  sectionGap: { height: spacing.lg },
  itemCard: {
    backgroundColor: colors.glass,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  itemName: { fontSize: 14, fontWeight: '700', color: colors.text, marginTop: spacing.sm },
  itemTag: { fontSize: 11, color: colors.gold, marginTop: 2, fontWeight: '600' },
  itemNew: { fontSize: 11, color: colors.cyan, marginTop: 2, fontWeight: '600' },
  remoteThumb: { width: 44, height: 44, borderRadius: radius.sm },
});