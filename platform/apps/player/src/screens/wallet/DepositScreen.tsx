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

type Tab = 'coins' | 'diamonds';

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

  return (
    <View style={styles.container}>
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
          <Text style={[styles.tabText, activeTab === 'diamonds' && styles.tabTextActive]}>Diamonds</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={packages}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const isSelected = selectedPackage === item.id;
          return (
            <TouchableOpacity
              style={[styles.packageCard, isSelected && styles.packageCardSelected]}
              onPress={() => setSelectedPackage(item.id)}
            >
              {'isPopular' in item && item.isPopular && (
                <View style={styles.popularBadge}>
                  <Text style={styles.popularText}>Popular</Text>
                </View>
              )}
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

      {selectedPackage && (
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
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  tabBar: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#16213e',
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#e94560',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#aaa',
  },
  tabTextActive: {
    color: '#fff',
  },
  list: {
    padding: 16,
  },
  row: {
    justifyContent: 'space-between',
  },
  packageCard: {
    width: '48%',
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  packageCardSelected: {
    borderColor: '#e94560',
  },
  popularBadge: {
    backgroundColor: '#e94560',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginBottom: 8,
  },
  popularText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  packageAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  packageLabel: {
    fontSize: 12,
    color: '#aaa',
    marginTop: 4,
  },
  bonusText: {
    fontSize: 12,
    color: '#4ecca3',
    marginTop: 8,
    fontWeight: '600',
  },
  packagePrice: {
    fontSize: 18,
    fontWeight: '600',
    color: '#e94560',
    marginTop: 12,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#0f3460',
  },
  purchaseButton: {
    backgroundColor: '#e94560',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  purchaseButtonDisabled: {
    opacity: 0.6,
  },
  purchaseButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
