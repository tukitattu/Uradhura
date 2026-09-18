import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useLiveGame } from '../../contexts/GameSocketContext';
import { GameRendererProps } from '../../components/game/renderers/types';
import WheelRenderer from '../../components/game/renderers/WheelRenderer';
import CardGameRenderer from '../../components/game/renderers/CardGameRenderer';
import SlotRenderer from '../../components/game/renderers/SlotRenderer';
import GenericFallbackRenderer from '../../components/game/renderers/GenericFallbackRenderer';
import CountdownRing from '../../components/game/CountdownRing';
import BetChipPanel from '../../components/game/BetChipPanel';
import ResultOverlay from '../../components/game/ResultOverlay';
import FairnessModal from '../../components/game/FairnessModal';
import HistoryStrip from '../../components/game/HistoryStrip';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import { GameInternalCode, RoundStatus } from '../../lib/types';
import { formatCoins } from '../../lib/game';

type RouteParams = {
  params: {
    gameId: string;
  };
};

const RENDERERS: Record<string, React.ComponentType<GameRendererProps>> = {
  greedy_monkey: WheelRenderer,
  greedy_lion: WheelRenderer,
  food_wheel: WheelRenderer,
  teen_patti: CardGameRenderer,
  three_card: CardGameRenderer,
  slot: SlotRenderer,
};

function roundStatusLabel(status: RoundStatus | undefined): string {
  switch (status) {
    case 'upcoming':
      return 'Next round starting…';
    case 'betting_open':
      return 'Betting open';
    case 'betting_closed':
      return 'Betting closed';
    case 'result_processing':
      return 'Revealing result…';
    case 'settled':
      return 'Round settled';
    case 'closed':
      return 'Round closed';
    default:
      return 'Waiting for round…';
  }
}

function statusAccent(status: RoundStatus | undefined): string {
  if (status === 'betting_open') return '#4ecca3';
  if (status === 'betting_closed' || status === 'result_processing') return '#f5a623';
  return '#888';
}

export default function GamePlayScreen({ navigation }: { navigation?: { setOptions: (o: { title: string }) => void } }) {
  const route = useRoute<RouteProp<RouteParams, 'params'>>();
  const { gameId } = route.params;

  const live = useLiveGame(gameId);
  const {
    loaded,
    loadError,
    socketError,
    isConnected,
    internalCode,
    game,
    round,
    options,
    config,
    betConfig,
    seed,
    betTotals,
    balance,
    playerCount,
    lastEvent,
    lastResult,
    personalResult,
    serverTimeOffset,
    placeBet,
    requestSeedState,
    rotateSeed,
    dismissResult,
    retryLoad,
  } = live;

  const [submitting, setSubmitting] = useState(false);
  const [fairnessVisible, setFairnessVisible] = useState(false);

  useEffect(() => {
    if (navigation && game) {
      navigation.setOptions({ title: game.displayName || game.name });
    }
  }, [navigation, game]);

  useEffect(() => {
    if (lastEvent === 'new_bet' || socketError || balance !== null) {
      setSubmitting(false);
    }
  }, [lastEvent, socketError, balance]);

  useEffect(() => {
    if (!submitting) return undefined;
    const timer = setTimeout(() => setSubmitting(false), 8000);
    return () => clearTimeout(timer);
  }, [submitting]);

  const handlePlaceBet = useCallback(
    (optionId: string, amount: number) => {
      setSubmitting(true);
      placeBet(optionId, amount);
    },
    [placeBet]
  );

  if (!loaded) {
    if (loadError) {
      return (
        <View style={styles.centered}>
          <EmptyState icon="⚠️" message={loadError} />
          <TouchableOpacity style={styles.retryButton} onPress={retryLoad}>
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return <LoadingSpinner />;
  }

  const Renderer = (internalCode && RENDERERS[internalCode as GameInternalCode]) || GenericFallbackRenderer;
  const totalBetAmount = round?.totalBetAmount ?? '0';
  const countdownTotal =
    round?.bettingEndsAt && round?.bettingOpensAt
      ? new Date(round.bettingEndsAt).getTime() - new Date(round.bettingOpensAt).getTime()
      : config
      ? config.bettingDurationSeconds * 1000
      : undefined;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.gameName} numberOfLines={1}>
              {game?.displayName || game?.name || 'Game'}
            </Text>
            <Text style={[styles.roundStatus, { color: statusAccent(round?.status) }]}>
              {round ? `Round #${round.roundNumber} · ${roundStatusLabel(round.status)}` : roundStatusLabel(undefined)}
            </Text>
          </View>
          <View style={styles.connectionBadge}>
            <View style={[styles.connectionDot, { backgroundColor: isConnected ? '#4ecca3' : '#f5a623' }]} />
            <Text style={styles.connectionText}>{isConnected ? 'LIVE' : 'RECONNECTING'}</Text>
          </View>
        </View>

        {socketError ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{socketError.message}</Text>
          </View>
        ) : null}

        <View style={styles.stage}>
          {options.length === 0 ? (
            <EmptyState icon="🎲" message="This game has no active betting options yet." />
          ) : (
            <Renderer
              game={game}
              round={round}
              options={options}
              config={config}
              seed={seed}
              betTotals={betTotals}
              lastResult={lastResult}
              serverTimeOffset={serverTimeOffset}
              isConnected={isConnected}
            />
          )}
          {lastResult !== null && options.length > 0 ? (
            <ResultOverlay
              result={lastResult}
              personalResult={personalResult}
              options={options}
              onDismiss={dismissResult}
            />
          ) : null}
        </View>

        <View style={styles.roundBar}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{formatCoins(totalBetAmount)}</Text>
            <Text style={styles.statLabel}>Total pool</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{playerCount}</Text>
            <Text style={styles.statLabel}>Players</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{options.length}</Text>
            <Text style={styles.statLabel}>Selections</Text>
          </View>
        </View>

        {round?.status === 'betting_open' && round.bettingEndsAt ? (
          <CountdownRing
            deadline={round.bettingEndsAt}
            serverTimeOffset={serverTimeOffset}
            totalMs={countdownTotal}
          />
        ) : null}

        {round ? (
          <BetChipPanel
            round={round}
            options={options}
            betConfig={betConfig}
            betTotals={betTotals}
            submitting={submitting}
            serverError={socketError?.message ?? null}
            balance={balance}
            onPlaceBet={handlePlaceBet}
          />
        ) : (
          <View style={styles.noRound}>
            <Text style={styles.noRoundText}>Waiting for the next round to open…</Text>
          </View>
        )}

        <HistoryStrip gameId={gameId} options={options} />

        <TouchableOpacity
          style={styles.fairnessButton}
          onPress={() => {
            requestSeedState();
            setFairnessVisible(true);
          }}
        >
          <Text style={styles.fairnessButtonText}>Provably fair · verify this game</Text>
        </TouchableOpacity>

        {game?.rules ? (
          <View style={styles.rulesContainer}>
            <Text style={styles.rulesTitle}>How to Play</Text>
            <Text style={styles.rulesText}>{game.rules}</Text>
          </View>
        ) : null}
      </ScrollView>

      <FairnessModal
        visible={fairnessVisible}
        onClose={() => setFairnessVisible(false)}
        seed={seed}
        result={lastResult}
        onRotateSeed={rotateSeed}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  scrollContent: {
    paddingBottom: 32,
  },
  centered: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButton: {
    backgroundColor: '#e94560',
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerLeft: {
    flex: 1,
    paddingRight: 12,
  },
  gameName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  roundStatus: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 3,
  },
  connectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#16213e',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  connectionDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  connectionText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    color: '#aaa',
  },
  errorBanner: {
    marginHorizontal: 16,
    marginBottom: 6,
    padding: 10,
    backgroundColor: '#e9456020',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e94560',
  },
  errorBannerText: {
    color: '#e94560',
    fontSize: 12,
    textAlign: 'center',
  },
  stage: {
    position: 'relative',
    minHeight: 300,
  },
  roundBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginHorizontal: 16,
    marginTop: 4,
    paddingVertical: 12,
    backgroundColor: '#16213e',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#0f3460',
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  statLabel: {
    color: '#888',
    fontSize: 10,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  noRound: {
    margin: 16,
    padding: 20,
    backgroundColor: '#16213e',
    borderRadius: 12,
    alignItems: 'center',
  },
  noRoundText: {
    color: '#aaa',
    fontSize: 14,
  },
  fairnessButton: {
    marginTop: 18,
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#4ecca3',
    backgroundColor: '#4ecca315',
  },
  fairnessButtonText: {
    color: '#4ecca3',
    fontSize: 13,
    fontWeight: '600',
  },
  rulesContainer: {
    margin: 16,
    padding: 18,
    backgroundColor: '#16213e',
    borderRadius: 12,
  },
  rulesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  rulesText: {
    fontSize: 13,
    color: '#aaa',
    lineHeight: 20,
  },
});