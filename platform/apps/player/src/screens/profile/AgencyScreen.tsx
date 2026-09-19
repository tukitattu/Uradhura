import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { BrandScreen } from '../../components/ui/BrandScreen';
import { BrandAsset } from '../../lib/assets/BrandAsset';
import { colors, radius, spacing, backgroundKeys } from '../../theme';

interface WithdrawalMe {
  id: string;
  amount: string;
  status: string;
  createdAt: string;
}

export default function AgencyScreen() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<WithdrawalMe[]>([]);

  useEffect(() => {
    api
      .get<{ data: WithdrawalMe[] }>('/withdrawals/me')
      .then(({ data }) => setRequests(data.data))
      .catch(() => setRequests([]));
  }, []);

  const stats = [
    { label: 'Coins', value: `${user?.coins ?? 0}` },
    { label: 'Diamonds', value: `${user?.diamonds ?? 0}` },
    { label: 'Withdrawals', value: `${requests.length}` },
  ];

  return (
    <BrandScreen background={backgroundKeys.ranking} title="My Agency" icon="icons.profile.store" scroll>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <BrandAsset assetKey="frame.ranking.podium" size={56} />
          <Text style={styles.title}>My Agency</Text>
          <Text style={styles.subtitle}>
            Build your team, earn commission on their play and withdrawals.
          </Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Team tree · commissions · V2</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          {stats.map((s) => (
            <View key={s.label} style={styles.statItem}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {requests.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <BrandAsset assetKey="icons.profile.level" size={20} />
              <Text style={styles.cardTitle}>Recent withdrawals</Text>
            </View>
            {requests.map((r) => (
              <View key={r.id} style={styles.row}>
                <Text style={styles.rowLabel}>{r.amount}</Text>
                <Text style={[styles.rowStatus, { color: r.status === 'completed' ? colors.green : colors.gold }]}>
                  {r.status}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </BrandScreen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: 40, gap: spacing.xl },
  hero: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  title: { fontSize: 24, fontWeight: '800', color: colors.textSoft },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  badge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(124,58,237,0.16)',
    borderColor: 'rgba(124,58,237,0.4)',
    borderWidth: 1,
  },
  badgeText: { color: colors.violetSoft, fontSize: 12, fontWeight: '600' },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.glass,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
  },
  statItem: { alignItems: 'center', gap: 4 },
  statValue: { fontSize: 18, fontWeight: '800', color: colors.textSoft },
  statLabel: { fontSize: 12, color: colors.textSecondary },
  card: {
    backgroundColor: colors.glass,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cardTitle: { fontSize: 16, fontWeight: '800', color: colors.textSoft },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLabel: { fontSize: 14, color: colors.text, fontWeight: '600' },
  rowStatus: { fontSize: 13, fontWeight: '700' },
});