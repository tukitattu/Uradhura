import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useWallet } from '../../hooks/useWallet';
import BalanceBar from '../../components/BalanceBar';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import { Transaction } from '../../lib/types';

export default function WalletScreen({ navigation }: any) {
  const { data: wallet, isLoading, refetch } = useWallet();
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  if (isLoading) return <LoadingSpinner />;

  const getTransactionIcon = (type: string): string => {
    switch (type) {
      case 'deposit': return '+';
      case 'withdrawal': return '-';
      case 'bet': return '-';
      case 'win': return '+';
      case 'gift': return '~';
      case 'reward': return '+';
      default: return '~';
    }
  };

  const getTransactionColor = (type: string): string => {
    switch (type) {
      case 'deposit':
      case 'win':
      case 'reward':
        return '#4ecca3';
      case 'withdrawal':
      case 'bet':
        return '#e94560';
      default:
        return '#aaa';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.balanceSection}>
        <Text style={styles.balanceLabel}>Your Balance</Text>
        <BalanceBar coins={wallet?.coins || 0} diamonds={wallet?.diamonds || 0} large />
        <TouchableOpacity
          style={styles.depositButton}
          onPress={() => navigation.navigate('Deposit')}
        >
          <Text style={styles.depositButtonText}>Deposit</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{wallet?.totalDeposited.toLocaleString() || 0}</Text>
          <Text style={styles.statLabel}>Total Deposited</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{wallet?.totalWithdrawn.toLocaleString() || 0}</Text>
          <Text style={styles.statLabel}>Total Withdrawn</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Transaction History</Text>
      <FlatList
        data={wallet?.transactions || []}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#e94560" />}
        ListEmptyComponent={<EmptyState message="No transactions yet" />}
        renderItem={({ item }: { item: Transaction }) => (
          <View style={styles.transactionItem}>
            <View style={styles.transactionLeft}>
              <View style={[styles.transactionIcon, { backgroundColor: getTransactionColor(item.type) + '20' }]}>
                <Text style={[styles.transactionIconText, { color: getTransactionColor(item.type) }]}>
                  {getTransactionIcon(item.type)}
                </Text>
              </View>
              <View>
                <Text style={styles.transactionDesc}>{item.description}</Text>
                <Text style={styles.transactionDate}>
                  {new Date(item.createdAt).toLocaleDateString()}
                </Text>
              </View>
            </View>
            <Text style={[styles.transactionAmount, { color: getTransactionColor(item.type) }]}>
              {getTransactionIcon(item.type)}{item.amount.toLocaleString()} {item.currency}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  balanceSection: {
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#0f3460',
  },
  balanceLabel: {
    fontSize: 14,
    color: '#aaa',
    marginBottom: 8,
  },
  depositButton: {
    backgroundColor: '#e94560',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 16,
  },
  depositButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    padding: 20,
    gap: 16,
  },
  statItem: {
    flex: 1,
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#aaa',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#0f346020',
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transactionIconText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  transactionDesc: {
    fontSize: 14,
    color: '#fff',
  },
  transactionDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
});
