import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GameRendererProps } from './types';
import { formatCoins, formatMultiplier, optionEmoji } from '../../../lib/game';

export default function GenericFallbackRenderer({ game, round, options, betTotals, lastResult }: GameRendererProps) {
  const winningOptionId = lastResult?.result?.winningOptionId ?? null;

  return (
    <View style={styles.container}>
      <View style={styles.board}>
        {options.length === 0 ? (
          <Text style={styles.emptyText}>This game has no active options configured.</Text>
        ) : (
          options.map((option, index) => {
            const total = betTotals[option.id];
            const isWinner = winningOptionId != null && option.id === winningOptionId;
            return (
              <View
                key={option.id}
                style={[
                  styles.optionRow,
                  { borderColor: isWinner ? '#ffd700' : option.colorHex || '#24395f' },
                  isWinner && styles.optionRowWinner,
                ]}
              >
                <Text style={styles.optionIndex}>{index + 1}</Text>
                <Text style={styles.optionIcon}>{optionEmoji(option)}</Text>
                <View style={styles.optionInfo}>
                  <Text style={styles.optionName}>{option.label}</Text>
                  <Text style={styles.optionMeta}>
                    {total?.count ? `${total.count} bets · ${formatCoins(total.total)}` : 'No bets yet'}
                  </Text>
                </View>
                <Text style={[styles.optionMultiplier, { color: option.colorHex || '#4ecca3' }]}>
                  {formatMultiplier(option.multiplier)}
                </Text>
              </View>
            );
          })
        )}
      </View>

      {lastResult && (
        <Text style={styles.resultNote}>
          Round #{lastResult.roundNumber}: {lastResult.result.winningLabel}
        </Text>
      )}
      {!lastResult && round?.status === 'betting_closed' && (
        <Text style={styles.pendingNote}>Calculating the result…</Text>
      )}
      {game?.rules ? <Text style={styles.rules}>{game.rules}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
  },
  board: {
    paddingHorizontal: 16,
    gap: 8,
  },
  emptyText: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 30,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#16243f',
    borderRadius: 10,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  optionRowWinner: {
    backgroundColor: '#3a3214',
  },
  optionIndex: {
    color: '#666',
    fontSize: 12,
    width: 16,
  },
  optionIcon: {
    fontSize: 22,
  },
  optionInfo: {
    flex: 1,
  },
  optionName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  optionMeta: {
    color: '#888',
    fontSize: 11,
    marginTop: 2,
  },
  optionMultiplier: {
    fontSize: 14,
    fontWeight: '700',
  },
  resultNote: {
    marginTop: 14,
    color: '#4ecca3',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  pendingNote: {
    marginTop: 14,
    color: '#aaa',
    fontSize: 13,
    textAlign: 'center',
  },
  rules: {
    marginTop: 16,
    paddingHorizontal: 18,
    color: '#777',
    fontSize: 12,
    lineHeight: 18,
  },
});