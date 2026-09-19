import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Linking,
  Image,
} from 'react-native';
import { useGames } from '../../hooks/useGames';
import GameCard from '../../components/GameCard';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import { BrandScreen } from '../../components/ui/BrandScreen';
import { BrandAsset } from '../../lib/assets/BrandAsset';
import { GAMES_BASE_URL } from '../../lib/storage';
import { imageFor } from '../../lib/assets/uraliveImages';
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
      <View style={styles.hallHero}>
        <Image source={imageFor('bg.home.reward')} style={styles.hallBg} resizeMode="cover" />
        <View style={styles.hallTint} />
        <View>
          <BrandAsset assetKey="icons.navigation.games" size={20} />
          <Text style={styles.hallTitle}>Game Hall</Text>
          <Text style={styles.hallSubtitle}>
            Teen Patti plays live against the house today — more titles land with the game engine.
          </Text>
        </View>
        <View style={styles.nativeBadge}>
          <View style={styles.nativeDot} />
          <Text style={styles.nativeBadgeText}>NATIVE · LIVE</Text>
        </View>
      </View>

      {GAMES_BASE_URL && (
        <TouchableOpacity
          style={styles.webCard}
          activeOpacity={0.85}
          onPress={() => GAMES_BASE_URL && Linking.openURL(GAMES_BASE_URL)}
        >
          <BrandAsset assetKey="gifts.premium.rocket" size={26} />
          <View style={styles.webText}>
            <Text style={styles.webTitle}>Web games</Text>
            <Text style={styles.webSubtitle}>
              More titles on the games server — opens in your browser (WebView in production).
            </Text>
          </View>
          <Text style={styles.webCta}>Play</Text>
        </TouchableOpacity>
      )}

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
  hallHero: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    overflow: 'hidden',
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.xl,
    padding: spacing.lg,
  },
  hallBg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  hallTint: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(10,18,32,0.46)',
  },
  hallTitle: { fontSize: 20, fontWeight: '800', color: colors.textSoft, marginTop: 4 },
  hallSubtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 2, maxWidth: 220 },
  nativeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#e11d48',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  nativeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
  nativeBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  webCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.glass,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  webText: { flex: 1 },
  webTitle: { fontSize: 15, fontWeight: '800', color: colors.textSoft },
  webSubtitle: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  webCta: { color: colors.cyan, fontSize: 14, fontWeight: '800' },
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