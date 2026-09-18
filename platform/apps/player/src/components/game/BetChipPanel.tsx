import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { GameOption, GameRound, GameBetConfig, BetTotals } from '../../lib/types';
import { betConfigBounds, formatCoins, formatMultiplier, optionEmoji, parseBetDenominations } from '../../lib/game';

interface BetChipPanelProps {
  round: GameRound;
  options: GameOption[];
  betConfig: GameBetConfig | null;
  betTotals: BetTotals;
  submitting: boolean;
  serverError: string | null;
  balance: number | null;
  onPlaceBet: (optionId: string, amount: number) => void;
}

export default function BetChipPanel({
  round,
  options,
  betConfig,
  betTotals,
  submitting,
  serverError,
  balance,
  onPlaceBet,
}: BetChipPanelProps) {
  const bettingOpen = round.status === 'betting_open';
  const { min, max } = useMemo(() => betConfigBounds(betConfig), [betConfig]);
  const denominations = useMemo(() => parseBetDenominations(betConfig), [betConfig]);
  const allowCustom = betConfig?.allowCustomBet ?? false;

  const [selected, setSelected] = useState<Set<string>>(() => new Set(options.length === 1 ? [options[0].id] : []));
  const [amount, setAmount] = useState<string>(String(denominations.find((d) => d >= min) ?? min));

  const numericAmount = Number(amount);
  const validAmount = Number.isFinite(numericAmount) && numericAmount >= min && numericAmount <= max;
  const allowedDenomination = allowCustom || denominations.includes(numericAmount);

  const isTappable = selected.size === 0 && options.length === 1;
  const canPlace =
    bettingOpen && selected.size > 0 && validAmount && allowedDenomination && !submitting;

  const toggleOption = (optionId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (betConfig?.allowMultipleSelections) {
        if (next.has(optionId)) next.delete(optionId);
        else next.add(optionId);
      } else {
        next.clear();
        next.add(optionId);
      }
      return next;
    });
  };

  const handlePlace = () => {
    if (!canPlace) return;
    selected.forEach((optionId) => onPlaceBet(optionId, numericAmount));
  };

  const statusText = !bettingOpen
    ? round.status === 'betting_closed' || round.status === 'result_processing'
      ? 'Results are being revealed. Next round opens soon.'
      : 'Betting is closed for this round.'
    : null;

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>Place Your Bet</Text>
        {balance !== null && (
          <Text style={styles.balance}>Balance: {formatCoins(Math.round(balance))}</Text>
        )}
      </View>

      <View style={styles.optionsWrap}>
        {options.map((option) => {
          const total = betTotals[option.id];
          const active = selected.has(option.id);
          const totalBets = total ? total.count : 0;
          return (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.optionChip,
                { borderColor: option.colorHex || '#0f3460' },
                active && styles.optionChipActive,
                !bettingOpen && styles.optionChipDisabled,
              ]}
              onPress={() => toggleOption(option.id)}
              disabled={!bettingOpen}
            >
              {isTappable && active && <Text style={styles.selectedBadge}>●</Text>}
              <Text style={styles.optionIcon}>{optionEmoji(option)}</Text>
              <Text style={styles.optionName} numberOfLines={1}>
                {option.label}
              </Text>
              <Text style={[styles.optionMultiplier, { color: option.colorHex || '#fff' }]}>
                {formatMultiplier(option.multiplier)}
              </Text>
              <Text style={styles.optionMeta}>
                {totalBets > 0 ? `${totalBets} bet${totalBets === 1 ? '' : 's'} · ${formatCoins(total?.total)}` : 'No bets yet'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {!bettingOpen && statusText ? <Text style={styles.closedNote}>{statusText}</Text> : null}

      <View style={styles.amountSection}>
        <Text style={styles.sectionLabel}>
          Amount ({formatCoins(min)} – {formatCoins(max)})
        </Text>
        <View style={styles.chipRow}>
          {denominations.slice(0, 6).map((d) => (
            <TouchableOpacity
              key={d}
              style={[styles.amountChip, numericAmount === d && styles.amountChipActive]}
              onPress={() => setAmount(String(d))}
              disabled={!bettingOpen}
            >
              <Text style={[styles.amountChipText, numericAmount === d && styles.amountChipTextActive]}>
                {formatCoins(d)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {allowCustom && (
          <TextInput
            style={styles.amountInput}
            value={amount}
            onChangeText={setAmount}
            keyboardType="number-pad"
            placeholder={`Min ${formatCoins(min)}`}
            placeholderTextColor="#666"
            editable={bettingOpen}
          />
        )}
        {!validAmount || !allowedDenomination ? (
          <Text style={styles.validation}>
            {!validAmount
              ? `Amount must be between ${formatCoins(min)} and ${formatCoins(max)}`
              : `Amount must be one of ${denominations.map(formatCoins).join(', ')}`}
          </Text>
        ) : null}
      </View>

      {serverError ? <Text style={styles.serverError}>{serverError}</Text> : null}

      <TouchableOpacity
        style={[styles.placeButton, !canPlace && styles.placeButtonDisabled]}
        onPress={handlePlace}
        disabled={!canPlace}
      >
        <Text style={styles.placeButtonText}>
          {submitting
            ? 'Placing...'
            : `Place ${formatCoins(numericAmount)}${selected.size > 1 ? ` on ${selected.size} selections` : ''}`}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    margin: 16,
    padding: 16,
    backgroundColor: '#16213e',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#0f3460',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  balance: {
    fontSize: 13,
    color: '#aaa',
  },
  optionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  optionChip: {
    flexGrow: 1,
    flexBasis: '45%',
    minWidth: 120,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#1a1a2e',
    borderWidth: 1,
    alignItems: 'center',
  },
  optionChipActive: {
    backgroundColor: '#e9456030',
  },
  optionChipDisabled: {
    opacity: 0.55,
  },
  selectedBadge: {
    position: 'absolute',
    top: 6,
    right: 8,
    fontSize: 10,
    color: '#e94560',
  },
  optionIcon: {
    fontSize: 26,
    marginBottom: 2,
  },
  optionName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  optionMultiplier: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  optionMeta: {
    fontSize: 10,
    color: '#888',
    marginTop: 3,
    textAlign: 'center',
  },
  closedNote: {
    fontSize: 13,
    color: '#e94560',
    textAlign: 'center',
    marginBottom: 12,
  },
  amountSection: {
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 12,
    color: '#aaa',
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  amountChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#1a1a2e',
    borderWidth: 1,
    borderColor: '#0f3460',
  },
  amountChipActive: {
    borderColor: '#e94560',
    backgroundColor: '#e9456020',
  },
  amountChipText: {
    fontSize: 12,
    color: '#aaa',
    fontWeight: '600',
  },
  amountChipTextActive: {
    color: '#fff',
  },
  amountInput: {
    backgroundColor: '#1a1a2e',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#0f3460',
  },
  validation: {
    fontSize: 12,
    color: '#e94560',
    marginTop: 8,
  },
  serverError: {
    fontSize: 13,
    color: '#e94560',
    textAlign: 'center',
    marginBottom: 10,
  },
  placeButton: {
    backgroundColor: '#e94560',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  placeButtonDisabled: {
    opacity: 0.5,
  },
  placeButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});