import React from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useGames } from '../../hooks/useGames';
import { useWallet } from '../../hooks/useWallet';
import GameCard from '../../components/GameCard';
import BalanceBar from '../../components/BalanceBar';
import LoadingSpinner from '../../components/LoadingSpinner';
import { Game } from '../../lib/types';

export default function HomeScreen({ navigation }: any) {
  const { user } = useAuth();
  const { data: games, isLoading: gamesLoading, refetch: refetchGames } = useGames();
  const { data: wallet, isLoading: walletLoading } = useWallet();
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchGames(), wallet ? Promise.resolve() : Promise.resolve()]);
    setRefreshing(false);
  };

  const featuredGames = games?.filter((g: Game) => g.status === 'active').slice(0, 5) || [];
  const allGames = games || [];

  if (gamesLoading || walletLoading) {
    return <LoadingSpinner />;
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#e94560" />}
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>Hello, {user?.displayName}!</Text>
        <BalanceBar coins={wallet?.coins || 0} diamonds={wallet?.diamonds || 0} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Featured Games</Text>
        <FlatList
          data={featuredGames}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.featuredCard}
              onPress={() => navigation.navigate('GamePlay', { gameId: item.id })}
            >
              <GameCard game={item} featured />
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.featuredList}
        />
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>All Games</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Games')}>
            <Text style={styles.seeAll}>See All</Text>
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  header: {
    padding: 20,
    paddingTop: 10,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  seeAll: {
    fontSize: 14,
    color: '#e94560',
  },
  featuredList: {
    paddingLeft: 20,
    gap: 12,
  },
  featuredCard: {
    width: 280,
  },
  gameGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
  },
  gameGridItem: {
    width: '47%',
  },
});
