import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { api } from '../../lib/api';
import { CoinPackage, DiamondPackage } from '../../lib/types';
import { BrandScreen } from '../../components/ui/BrandScreen';
import { BrandAsset } from '../../lib/assets/BrandAsset';
import { colors, radius, spacing, backgroundKeys } from '../../theme';

type Tab = 'coins' | 'diamonds';

const CRYPTO = [
  { key: 'crypto.btc', label: 'BTC' },
  { key: 'crypto.eth', label: 'ETH' },
  { key: 'crypto.usdt', label: 'USDT' },
] as const;

export default function DepositScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('coins');
  const [coinPackages, setCoinPackages] = useState<CoinPackage[]>([]);
  const [diamondPackages, setDiamondPackages] = useState<DiamondPackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);

  useEffect(() => {
    loadPackages();
  }, []);

  const loadPackages = async () => {
    try {
      const [coinsRes, diamondsRes] = await Promise.all([
        api.get<{ data: CoinPackage[] }>('/packages/coins'),
        api.get<{ data: DiamondPackage[] }>('/packages/diamonds'),
      ]);
      setCoinPackages(coinsRes.data.data);
      setDiamondPackages(diamondsRes.data.data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load packages');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!selectedPackage) return;

    setIsPurchasing(true);
    try {
      await api.post('/purchases', {
        packageId: selectedPackage,
        type: activeTab,
      });
      Alert.alert('Success', 'Purchase completed!');
      setSelectedPackage(null);
    } catch (error: any) {
      Alert.alert('Purchase Failed', error.response?.data?.message || 'Try again');
    } finally {
      setIsPurchasing(false);
    }
  };

  const packages: (CoinPackage | DiamondPackage)[] = activeTab === 'coins' ? coinPackages : diamondPackages;

  const header = (
    <View style={styles.head}>
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'coins' && styles.tabActive]}
          onPress={() => setActiveTab('coins')}
        >
          <Text style={[styles.tabText, activeTab === 'coins' && styles.tabTextActive]}>Coins</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'diamonds' && styles.tabActive]}
          onPress={() => setActiveTab('diamonds')}
        >
          <Text style={[styles.tabText, activeTab === 'diamonds' && styles.tabTextActive]}>
            Diamonds
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.cryptoStrip}>
        {CRYPTO.map((c) => (
          <View key={c.label} style={styles.cryptoItem}>
            <BrandAsset assetKey={c.key} size={36} />
            <Text style={styles.cryptoLabel}>{c.label}</Text>
          </View>
        ))}
        <View style={styles.soonPill}>
          <BrandAsset assetKey="crypto.coming-soon" size={18} />
          <Text style={styles.soonText}>Crypto top-ups · COMING SOON</Text>
        </View>
      </View>
    </View>
  );

  return (
    <BrandScreen background={backgroundKeys.wallet} title="Top Up" icon="icons.navigation.wallet" scroll={false}>
      <FlatList
        data={packages}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        ListHeaderComponent={header}
        ListFooterComponent={
          selectedPackage ? (
            <View style={styles.footer}>
              <TouchableOpacity
                style={[styles.purchaseButton, isPurchasing && styles.purchaseButtonDisabled]}
                onPress={handlePurchase}
                disabled={isPurchasing}
              >
                {isPurchasing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.purchaseButtonText}>Purchase</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const isSelected = selectedPackage === item.id;
          return (
            <TouchableOpacity
              style={[styles.packageCard, isSelected && styles.packageCardSelected]}
              activeOpacity={0.85}
              onPress={() => setSelectedPackage(item.id)}
            >
              {'isPopular' in item && item.isPopular && (
                <View style={styles.popularBadge}>
                  <Text style={styles.popularText}>Popular</Text>
                </View>
              )}
              <BrandAsset
                assetKey={activeTab === 'coins' ? 'games.teen-patti.chips.gold' : 'crypto.eth'}
                size={40}
              />
              <Text style={styles.packageAmount}>
                {activeTab === 'coins'
                  ? `${(item as CoinPackage).coins.toLocaleString()}`
                  : `${(item as DiamondPackage).diamonds}`}
              </Text>
              <Text style={styles.packageLabel}>{activeTab === 'coins' ? 'Coins' : 'Diamonds'}</Text>
              {'bonus' in item && item.bonus > 0 && (
                <Text style={styles.bonusText}>+{item.bonus} bonus</Text>
              )}
              <Text style={styles.packagePrice}>${item.price}</Text>
            </TouchableOpacity>
          );
        }}
      />
    </BrandScreen>
  );
}

const styles = StyleSheet.create({
  head: { marginBottom: spacing.lg },
  tabBar: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.lg,
    backgroundColor: colors.glass,
    borderColor: colors.border,
    borderWidth: 1,
    alignItems: 'center',
  },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.cyan },
  tabText: { fontSize: 16, fontWeight: '700', color: colors.textSecondary },
  tabTextActive: { color: '#fff' },
  cryptoStrip: { marginBottom: spacing.xl, gap: spacing.md },
  cryptoItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  cryptoLabel: { fontSize: 13, color: colors.textSecondary, fontWeight: '700' },
  soonPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.sm,
    backgroundColor: 'rgba(124,58,237,0.14)',
    borderColor: 'rgba(124,58,237,0.45)',
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  soonText: { color: colors.violetSoft, fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  list: { paddingBottom: 40 },
  row: { justifyContent: 'space-between' },
  packageCard: {
    width: '48%',
    backgroundColor: colors.glass,
    borderRadius: radius.lg,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  packageCardSelected: {
    borderColor: colors.gold,
    backgroundColor: 'rgba(255,194,77,0.10)',
  },
  popularBadge: {
    backgroundColor: colors.goldDeep,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
    marginBottom: 8,
  },
  popularText: { color: '#1a1205', fontSize: 10, fontWeight: '800' },
  packageAmount: { fontSize: 28, fontWeight: '800', color: colors.text, marginTop: 8 },
  packageLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  bonusText: { fontSize: 12, color: colors.green, marginTop: 8, fontWeight: '700' },
  packagePrice: { fontSize: 18, fontWeight: '700', color: colors.gold, marginTop: 12 },
  footer: { marginTop: spacing.sm },
  purchaseButton: {
    backgroundColor: colors.goldDeep,
    borderRadius: radius.lg,
    padding: 16,
    alignItems: 'center',
  },
  purchaseButtonDisabled: { opacity: 0.6 },
  purchaseButtonText: { color: '#1a1205', fontSize: 18, fontWeight: '800' },
});