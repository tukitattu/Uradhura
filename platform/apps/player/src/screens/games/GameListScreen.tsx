import React, { useState, useMemo } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useGames } from '../../hooks/useGames';
import GameCard from '../../components/GameCard';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import { BrandScreen } from '../../components/ui/BrandScreen';
import { Game, GameCategory } from '../../lib/types';
import { colors, radius, spacing, backgroundKeys } from '../../theme';

const CATEGORIES: { key: GameCategory | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'card', label: 'Cards' },
  { key: 'classic', label: 'Classic' },
  { key: 'dice', label: 'Dice' },
  { key: 'wheel', label: 'Wheel' },
  { key: 'lottery', label: 'Lottery' },
  { key: 'slots', label: 'Slots' },
];

export default function GameListScreen({ navigation }: any) {
  const { data: games, isLoading, refetch } = useGames();
  const [selectedCategory, setSelectedCategory] = useState<GameCategory | 'all'>('all');
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const filteredGames = useMemo(() => {
    let result = games || [];
    if (selectedCategory !== 'all') {
      result = result.filter((g: Game) => g.category === selectedCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (g: Game) =>
          g.name.toLowerCase().includes(q) || (g.description ?? '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [games, selectedCategory, search]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  if (isLoading) return <LoadingSpinner />;

  const header = (
    <View style={styles.head}>
      <TextInput
        style={styles.searchInput}
        placeholder="Search games..."
        placeholderTextColor={colors.textMuted}
        value={search}
        onChangeText={setSearch}
      />

      <FlatList
        data={CATEGORIES}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.key}
        contentContainerStyle={styles.categoryList}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.categoryChip,
              selectedCategory === item.key && styles.categoryChipActive,
            ]}
            onPress={() => setSelectedCategory(item.key)}
          >
            <Text
              style={[
                styles.categoryText,
                selectedCategory === item.key && styles.categoryTextActive,
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );

  return (
    <BrandScreen background={backgroundKeys.games} title="Games" icon="icons.navigation.games" scroll={false}>
      <FlatList
        data={filteredGames}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        ListHeaderComponent={header}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.cyan} />
        }
        ListEmptyComponent={<EmptyState message="No games found" />}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.gameItem}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('GamePlay', { gameId: item.id })}
          >
            <GameCard game={item} />
          </TouchableOpacity>
        )}
      />
    </BrandScreen>
  );
}

const styles = StyleSheet.create({
  head: { gap: spacing.md, paddingBottom: spacing.md },
  searchInput: {
    backgroundColor: colors.glass,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: 14,
    fontSize: 16,
    color: colors.text,
  },
  categoryList: { gap: spacing.sm },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.cyan,
  },
  categoryText: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
  categoryTextActive: { color: '#fff' },
  list: { paddingBottom: 40 },
  row: { justifyContent: 'space-between', marginBottom: spacing.md },
  gameItem: { width: '48%' },
});