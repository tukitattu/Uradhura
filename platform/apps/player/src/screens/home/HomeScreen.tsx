import React from 'react';
import { FlatList, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View, RefreshControl } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useGames } from '../../hooks/useGames';
import { useWallet } from '../../hooks/useWallet';
import GameCard from '../../components/GameCard';
import BalanceBar from '../../components/BalanceBar';
import LoadingSpinner from '../../components/LoadingSpinner';
import { Game } from '../../lib/types';
import { colors, radius, spacing } from '../../theme';
import { backgroundKeys } from '../../theme';
import { BrandAsset } from '../../lib/assets/BrandAsset';
import { BrandBackground } from '../../components/ui/BrandBackground';
import { imageFor } from '../../lib/assets/uraliveImages';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen({ navigation }: any) {
  const { user } = useAuth();
  const { data: games, isLoading: gamesLoading, refetch: refetchGames } = useGames();
  const { data: wallet, isLoading: walletLoading } = useWallet();
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchGames(), Promise.resolve()]);
    setRefreshing(false);
  };

  const featuredGames = games?.filter((g: Game) => g.status === 'active').slice(0, 5) || [];
  const liveGames = games?.filter((g: Game) => g.status === 'active' && g.slug === 'teen_patti') || [];
  const allGames = games || [];

  if (gamesLoading || walletLoading) {
    return <LoadingSpinner />;
  }

  return (
    <BrandBackground assetKey={backgroundKeys.home} overlay={0.38}>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.cyan} />}
        >
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <BrandAsset assetKey="logo.uradhura-emblem" size={40} />
              <View>
                <Text style={styles.greeting}>Hello, {user?.displayName}!</Text>
                <Text style={styles.tagline}>Play · Go live · Win</Text>
              </View>
            </View>
            <BalanceBar coins={wallet?.coins || 0} diamonds={wallet?.diamonds || 0} />
          </View>

          <TouchableOpacity style={styles.banner} activeOpacity={0.9}>
            <Image source={imageFor('bg.home.reward')} style={styles.bannerBg} resizeMode="cover" />
            <View style={styles.bannerTint} />
            <View style={styles.bannerLeft}>
              <BrandAsset assetKey="icons.home.banner-cta" size={48} />
              <View>
                <Text style={styles.bannerTitle}>Teen Patti is live</Text>
                <Text style={styles.bannerSubtitle}>Join the table and win big</Text>
              </View>
            </View>
            <View style={[styles.liveDot, liveGames.length > 0 && styles.liveDotActive]} />
          </TouchableOpacity>

          {featuredGames.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Hot games</Text>
              <FlatList
                data={featuredGames}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.featuredList}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.featuredCard}
                    onPress={() => navigation.navigate('GamePlay', { gameId: item.id })}
                  >
                    <GameCard game={item} featured />
                  </TouchableOpacity>
                )}
              />
            </View>
          )}

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <BrandAsset assetKey="icons.home.featured" size={20} />
                <Text style={styles.sectionTitle}>All games</Text>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate('Games')}>
                <Text style={styles.seeAll}>See all</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.gameGrid}>
              {allGames.map((game: Game) => (
                <TouchableOpacity
                  key={game.id}
                  style={styles.gameGridItem}
                  onPress={() => navigation.navigate('GamePlay', { gameId: game.id })}
                >
                  <GameCard game={game} />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.rankingCard}>
            <BrandAsset assetKey="icons.home.ranking-badge" size={34} />
            <View style={styles.rankingText}>
              <Text style={styles.rankingTitle}>Leaderboards</Text>
              <Text style={styles.rankingSubtitle}>Top hosts and agencies this week</Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </BrandBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  greeting: { fontSize: 20, fontWeight: '800', color: colors.textSoft },
  tagline: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  banner: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.xl,
    padding: spacing.lg,
  },
  bannerBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  bannerTint: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(10,18,32,0.42)',
  },
  bannerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 },
  bannerTitle: { fontSize: 17, fontWeight: '800', color: colors.goldSoft },
  bannerSubtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  liveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.textMuted,
  },
  liveDotActive: {
    backgroundColor: colors.roseDeep,
    shadowColor: colors.roseDeep,
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  section: { marginBottom: spacing.xl },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionTitle: { fontSize: 19, fontWeight: '800', color: colors.textSoft },
  seeAll: { fontSize: 13, fontWeight: '700', color: colors.cyan },
  featuredList: { paddingHorizontal: spacing.xl, gap: spacing.md },
  featuredCard: { width: 260 },
  gameGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  gameGridItem: { width: '47%' },
  rankingCard: {
    marginHorizontal: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.glass,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.xl,
    padding: spacing.lg,
  },
  rankingText: { flex: 1 },
  rankingTitle: { fontSize: 16, fontWeight: '800', color: colors.textSoft },
  rankingSubtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
});