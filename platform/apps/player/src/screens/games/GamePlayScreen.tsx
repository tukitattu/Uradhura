import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { api } from '../../lib/api';
import { useSocketContext } from '../../contexts/SocketContext';
import { Game, GameRound, RoundStatus } from '../../lib/types';
import BetPanel from '../../components/BetPanel';
import RoundTimer from '../../components/RoundTimer';
import LoadingSpinner from '../../components/LoadingSpinner';

type RouteParams = {
  params: {
    gameId: string;
  };
};

export default function GamePlayScreen() {
  const route = useRoute<RouteProp<RouteParams, 'params'>>();
  const { gameId } = route.params;
  const { game: gameSocket } = useSocketContext();

  const [game, setGame] = useState<Game | null>(null);
  const [currentRound, setCurrentRound] = useState<GameRound | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadGame();
  }, [gameId]);

  useEffect(() => {
    if (!gameSocket) return;

    gameSocket.emit('join:game', { gameId });

    gameSocket.on('round:update', (round: GameRound) => {
      setCurrentRound(round);
    });

    gameSocket.on('round:result', (data: { round: GameRound; result: Record<string, unknown> }) => {
      setCurrentRound({ ...data.round, result: data.result, status: 'completed' });
    });

    return () => {
      gameSocket.emit('leave:game', { gameId });
      gameSocket.off('round:update');
      gameSocket.off('round:result');
    };
  }, [gameSocket, gameId]);

  const loadGame = async () => {
    try {
      const { data } = await api.get<{ data: Game }>(`/games/${gameId}`);
      setGame(data.data);

      const roundRes = await api.get<{ data: GameRound }>(`/games/${gameId}/current-round`);
      setCurrentRound(roundRes.data.data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load game');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !game) {
    return <LoadingSpinner />;
  }

  const getRoundStatusText = (status: RoundStatus): string => {
    switch (status) {
      case 'waiting':
        return 'Waiting for next round...';
      case 'betting':
        return 'Place your bets!';
      case 'locked':
        return 'Bets locked. Drawing...';
      case 'playing':
        return 'Round in progress...';
      case 'completed':
        return 'Round completed!';
      case 'cancelled':
        return 'Round cancelled';
      default:
        return '';
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.gameName}>{game.name}</Text>
        <Text style={styles.gameDescription}>{game.description}</Text>
      </View>

      {currentRound && (
        <View style={styles.roundInfo}>
          <Text style={styles.roundNumber}>Round #{currentRound.roundNumber}</Text>
          <Text style={[styles.roundStatus, currentRound.status === 'betting' && styles.roundStatusActive]}>
            {getRoundStatusText(currentRound.status)}
          </Text>
          {(currentRound.status === 'betting' || currentRound.status === 'waiting') && (
            <RoundTimer
              deadline={currentRound.bettingDeadline}
              onComplete={() => setCurrentRound((prev) => prev ? { ...prev, status: 'locked' } : null)}
            />
          )}
          <Text style={styles.totalPool}>Total Pool: {currentRound.totalPool.toLocaleString()} coins</Text>
        </View>
      )}

      {currentRound?.status === 'betting' && (
        <BetPanel
          gameId={gameId}
          roundId={currentRound.id}
          minBet={game.minBet}
          maxBet={game.maxBet}
          onBetPlaced={() => {}}
        />
      )}

      {currentRound?.status === 'completed' && currentRound.result && (
        <View style={styles.resultContainer}>
          <Text style={styles.resultTitle}>Result</Text>
          <Text style={styles.resultText}>{JSON.stringify(currentRound.result)}</Text>
        </View>
      )}

      <View style={styles.rulesContainer}>
        <Text style={styles.rulesTitle}>How to Play</Text>
        <Text style={styles.rulesText}>{game.rules}</Text>
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
    borderBottomWidth: 1,
    borderBottomColor: '#0f3460',
  },
  gameName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  gameDescription: {
    fontSize: 14,
    color: '#aaa',
    lineHeight: 20,
  },
  roundInfo: {
    padding: 20,
    backgroundColor: '#16213e',
    margin: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#0f3460',
  },
  roundNumber: {
    fontSize: 16,
    color: '#aaa',
    marginBottom: 4,
  },
  roundStatus: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  roundStatusActive: {
    color: '#e94560',
  },
  totalPool: {
    fontSize: 16,
    color: '#4ecca3',
    fontWeight: '600',
    marginTop: 8,
  },
  resultContainer: {
    margin: 16,
    padding: 20,
    backgroundColor: '#16213e',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4ecca3',
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4ecca3',
    marginBottom: 8,
  },
  resultText: {
    fontSize: 16,
    color: '#fff',
  },
  rulesContainer: {
    margin: 16,
    padding: 20,
    backgroundColor: '#16213e',
    borderRadius: 12,
  },
  rulesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  rulesText: {
    fontSize: 14,
    color: '#aaa',
    lineHeight: 22,
  },
});
