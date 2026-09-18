import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { GameOption, HistoryItem } from '../../lib/types';

interface HistoryStripProps {
  gameId: string;
  options: GameOption[];
  limit?: number;
}

function historyLabel(item: HistoryItem, options: GameOption[]): { icon: string; color: string } {
  const option = item.winningOptionId ? options.find((o) => o.id === item.winningOptionId) : undefined;
  if (option) {
    const icon = (option.icon || '').trim();
    return {
      icon: icon && icon.length <= 4 ? icon : option.label.slice(0, 1),
      color: option.colorHex || '#4ecca3',
    };
  }
  const data = item.resultData as { symbol?: string; emoji?: string } | null;
  const icon = data?.emoji ?? data?.symbol ?? item.winningLabel?.slice(0, 1) ?? '?';
  return { icon, color: '#4ecca3' };
}

export default function HistoryStrip({ gameId, options, limit = 12 }: HistoryStripProps) {
  const { data, isLoading } = useQuery<HistoryItem[]>({
    queryKey: ['game-history', gameId],
    queryFn: async () => {
      const { data: items } = await api.get<HistoryItem[]>(`/games/${gameId}/history?limit=${limit}`);
      return Array.isArray(items) ? items : [];
    },
    staleTime: 30_000,
  });

  if (isLoading || !data || data.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No results yet — results appear here after rounds settle.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Recent results</Text>
      <FlatList
        horizontal
        data={data}
        keyExtractor={(item) => item.roundId}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
        renderItem={({ item, index }) => {
          const { icon, color } = historyLabel(item, options);
          return (
            <View style={[styles.chip, { borderColor: color }]}>
              <Text style={[styles.chipRound, { color }]}>R{item.roundNumber}</Text>
              <Text style={styles.chipIcon}>{icon}</Text>
              <Text style={styles.chipMeta}>{index === 0 ? 'latest' : '#'}</Text>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 4,
  },
  label: {
    fontSize: 11,
    color: '#888',
    letterSpacing: 1,
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  list: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    width: 62,
    alignItems: 'center',
    backgroundColor: '#16213e',
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 8,
  },
  chipRound: {
    fontSize: 10,
    fontWeight: '700',
  },
  chipIcon: {
    fontSize: 18,
    marginVertical: 2,
  },
  chipMeta: {
    fontSize: 8,
    color: '#666',
  },
  empty: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  emptyText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
});