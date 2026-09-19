import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { GameRendererProps } from './types';
import { CardGameResultData, GameCardData } from '../../../lib/types';
import { bundledSvg } from '../../../lib/assets/registry';
import { BrandAsset } from '../../../lib/assets/BrandAsset';
import { formatCoins, formatMultiplier } from '../../../lib/game';
import { colors, radius } from '../../../theme';

const SEAT_ASSETS = ['games.teen-patti.seats.p1', 'games.teen-patti.seats.p2', 'games.teen-patti.seats.p3'];
const CHIP_ASSETS = [
  'games.teen-patti.chips.blue',
  'games.teen-patti.chips.gold',
  'games.teen-patti.chips.violet',
  'games.teen-patti.chips.cyan',
];

export default function CardGameRenderer({ game, round, options, betTotals, lastResult }: GameRendererProps) {
  const resultData = useMemo(
    () => (lastResult?.result?.resultData as CardGameResultData | undefined) ?? null,
    [lastResult]
  );
  const isTeenPatti = game?.internalCode !== 'three_card';
  const cardsPerSeat = isTeenPatti ? 3 : 1;
  const tableBg = bundledSvg('games.teen-patti.table.bg');

  const seats = useMemo(() => {
    if (resultData?.seats?.length) {
      return resultData.seats.map((seat, index) => {
        const seatOption = options.find((o) => o.id === seat.seatId) ?? options[index];
        return {
          seatId: seat.seatId,
          seatName: seat.seatName,
          multiplier: seat.multiplier,
          icon: SEAT_ASSETS[index % SEAT_ASSETS.length],
          chip: CHIP_ASSETS[index % CHIP_ASSETS.length],
          color: seatOption?.colorHex || null,
          cards: seat.cards?.length ? seat.cards.map(toSymbol) : seat.card ? [toSymbol(seat.card)] : [],
          isWinner:
            seat.isWinner === true ||
            resultData.winningSeatId === seat.seatId ||
            resultData.winningIndex === index,
        };
      });
    }
    return options.map((option, index) => ({
      seatId: option.id,
      seatName: option.name || option.label,
      multiplier: option.multiplier,
      icon: SEAT_ASSETS[index % SEAT_ASSETS.length],
      chip: CHIP_ASSETS[index % CHIP_ASSETS.length],
      color: option.colorHex || null,
      cards: [] as string[],
      isWinner: false,
    }));
  }, [options, resultData]);

  const faceUp = lastResult != null;

  if (seats.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Seats are being prepared for this table.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {tableBg && <SvgXml xml={tableBg} width="100%" height="100%" style={StyleSheet.absoluteFill} />}

      <View style={styles.table}>
        {seats.map((seat, index) => {
          const total = betTotals[seat.seatId];
          return (
            <View key={seat.seatId} style={styles.seatWrap}>
              <View
                style={[
                  styles.seat,
                  { borderColor: seat.isWinner && faceUp ? colors.gold : colors.border },
                  seat.isWinner && faceUp && styles.seatWinner,
                ]}
              >
                {seat.isWinner && faceUp && (
                  <BrandAsset
                    assetKey="games.teen-patti.effects.winner-glow"
                    size={96}
                    style={styles.winnerGlow}
                  />
                )}

                <BrandAsset assetKey={seat.icon} size={44} />
                <Text style={styles.name} numberOfLines={1}>
                  {seat.seatName}
                </Text>
                <Text style={[styles.multiplier, seat.color ? { color: seat.color } : null]}>
                  {formatMultiplier(seat.multiplier)}
                </Text>

                <View style={styles.cards}>
                  {Array.from({ length: cardsPerSeat }).map((_, i) =>
                    faceUp && seat.cards[i] ? (
                      <View key={i} style={styles.cardSlot}>
                        <BrandAsset assetKey="games.teen-patti.cards.face" size={26} />
                        <Text style={styles.cardSymbol}>{seat.cards[i]}</Text>
                      </View>
                    ) : (
                      <View key={i} style={styles.cardSlot}>
                        <BrandAsset assetKey="games.teen-patti.cards.back" size={26} />
                      </View>
                    )
                  )}
                </View>

                <View style={styles.footer}>
                  {seat.isWinner && faceUp && <Text style={styles.winBadge}>WIN</Text>}
                  <View style={styles.betRow}>
                    <BrandAsset assetKey={seat.chip} size={16} />
                    <Text style={styles.meta}>
                      {total && total.count > 0
                        ? `${total.count} bet${total.count === 1 ? '' : 's'} · ${formatCoins(total.total)}`
                        : 'No bets'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          );
        })}
      </View>

      {round?.status === 'betting_closed' && !faceUp && (
        <Text style={styles.pendingNote}>Dealing cards…</Text>
      )}
      {resultData && (
        <Text style={styles.handNote}>
          Winning hand:{' '}
          {resultData.seats.find((s) => s.seatId === resultData.winningSeatId)?.handRank ??
            lastResult?.result.winningLabel}
        </Text>
      )}
    </View>
  );
}

function toSymbol(card: GameCardData): string {
  const suitMap: Record<string, string> = { S: '♠', H: '♥', D: '♦', C: '♣' };
  return `${suitMap[card.suit] ?? card.suit}${card.rank}`;
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 16,
    marginHorizontal: 8,
    minHeight: 250,
  },
  table: {
    position: 'relative',
    zIndex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'stretch',
    gap: 8,
  },
  seatWrap: { flex: 1, minWidth: 104, maxWidth: 150 },
  seat: {
    borderWidth: 1.5,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(13,17,30,0.72)',
    padding: 10,
    alignItems: 'center',
    gap: 4,
  },
  seatWinner: {
    shadowColor: colors.gold,
    shadowOpacity: 0.6,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  winnerGlow: { position: 'absolute', top: -26, zIndex: -1 },
  name: { fontSize: 13, fontWeight: '700', color: colors.textSoft },
  multiplier: { fontSize: 12, fontWeight: '700', color: colors.goldSoft },
  cards: {
    flexDirection: 'row',
    gap: 3,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardSlot: { alignItems: 'center', position: 'relative' },
  cardSymbol: {
    position: 'absolute',
    fontSize: 12,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  footer: { alignItems: 'center', gap: 2, marginTop: 4 },
  betRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  winBadge: { color: colors.gold, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  meta: { fontSize: 10, color: colors.textSecondary, textAlign: 'center' },
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { color: colors.textSecondary, fontSize: 14 },
  pendingNote: { marginTop: 14, color: colors.textSecondary, fontSize: 13 },
  handNote: { marginTop: 14, color: colors.green, fontSize: 13, fontWeight: '700' },
});