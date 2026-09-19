import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useWallet } from '../../hooks/useWallet';
import BalanceBar from '../../components/BalanceBar';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import { Transaction } from '../../lib/types';
import { BrandScreen } from '../../components/ui/BrandScreen';
import { BrandAsset } from '../../lib/assets/BrandAsset';
import { BrandButton } from '../../components/ui/BrandButton';
import { colors, radius, spacing, backgroundKeys } from '../../theme';

export default function WalletScreen({ navigation }: any) {
  const { data: wallet, isLoading, refetch } = useWallet();
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  if (isLoading) return <LoadingSpinner />;

  const txTone = (type: string): { icon: string; color: string } => {
    switch (type) {
      case 'deposit':
      case 'win':
      case 'reward':
        return { icon: '+', color: colors.green };
      case 'withdrawal':
      case 'bet':
        return { icon: '−', color: colors.rose };
      case 'gift':
        return { icon: '~', color: colors.violetSoft };
      default:
        return { icon: '•', color: colors.textSecondary };
    }
  };

  const header = (
    <View style={styles.head}>
      <View style={styles.balanceCard}>
        <BrandAsset assetKey="wallet.card-bg" size={320} style={styles.cardBg} />
        <View style={styles.balanceInner}>
          <Text style={styles.balanceLabel}>YOUR BALANCE</Text>
          <BalanceBar coins={wallet?.coins || 0} diamonds={wallet?.diamonds || 0} large />
          <View style={styles.balanceActions}>
            <BrandButton
              label="Deposit"
              variant="gold"
              style={styles.action}
              onPress={() => navigation.navigate('Deposit')}
            />
            <BrandButton
              label="Withdraw"
              variant="ghost"
              style={styles.action}
              onPress={() => navigation.navigate('Deposit')}
            />
          </View>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{wallet?.totalDeposited.toLocaleString() || 0}</Text>
          <Text style={styles.statLabel}>Deposited</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{wallet?.totalWithdrawn.toLocaleString() || 0}</Text>
          <Text style={styles.statLabel}>Withdrawn</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{wallet?.transactions.length || 0}</Text>
          <Text style={styles.statLabel}>Txn count</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Transaction History</Text>
    </View>
  );

  return (
    <BrandScreen background={backgroundKeys.wallet} title="Wallet" icon="icons.navigation.wallet" scroll={false}>
      <FlatList
        data={wallet?.transactions || []}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={header}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.cyan} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="gifts.basic.star"
            message="No transactions yet"
            detail="Start playing to see your ledger here."
          />
        }
        renderItem={({ item }: { item: Transaction }) => {
          const tone = txTone(item.type);
          return (
            <View style={styles.transactionItem}>
              <View style={styles.transactionLeft}>
                <View style={[styles.transactionIcon, { backgroundColor: tone.color + '22' }]}>
                  <Text style={[styles.transactionIconText, { color: tone.color }]}>{tone.icon}</Text>
                </View>
                <View>
                  <Text style={styles.transactionDesc}>{item.description}</Text>
                  <Text style={styles.transactionDate}>
                    {new Date(item.createdAt).toLocaleDateString()} · {item.currency}
                  </Text>
                </View>
              </View>
              <Text style={[styles.transactionAmount, { color: tone.color }]}>
                {tone.icon}{item.amount.toLocaleString()}
              </Text>
            </View>
          );
        }}
      />
    </BrandScreen>
  );
}

const styles = StyleSheet.create({
  head: { marginBottom: spacing.md },
  balanceCard: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.xl,
    overflow: 'hidden',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  cardBg: { position: 'absolute', top: 0 },
  balanceInner: { alignItems: 'center', gap: spacing.lg, zIndex: 1 },
  balanceLabel: { fontSize: 12, color: colors.textSecondary, letterSpacing: 1.5, fontWeight: '700' },
  balanceActions: { flexDirection: 'row', gap: spacing.md },
  action: { paddingVertical: 12, paddingHorizontal: 24 },
  statsRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.xl },
  statItem: {
    flex: 1,
    backgroundColor: colors.glass,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
  },
  statValue: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 4 },
  statLabel: { fontSize: 11, color: colors.textSecondary },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: colors.textSoft, marginBottom: spacing.md },
  list: { paddingBottom: 40 },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  transactionLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transactionIconText: { fontSize: 18, fontWeight: '800' },
  transactionDesc: { fontSize: 14, fontWeight: '600', color: colors.text },
  transactionDate: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  transactionAmount: { fontSize: 14, fontWeight: '700' },
});