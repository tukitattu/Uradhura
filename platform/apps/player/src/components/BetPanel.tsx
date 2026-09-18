import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { api } from '../lib/api';

interface Props {
  gameId: string;
  roundId: string;
  minBet: number;
  maxBet: number;
  onBetPlaced: () => void;
}

export default function BetPanel({ gameId, roundId, minBet, maxBet, onBetPlaced }: Props) {
  const [amount, setAmount] = useState(minBet.toString());
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isPlacing, setIsPlacing] = useState(false);

  const options = ['heads', 'tails'];
  const numericAmount = parseInt(amount, 10) || 0;

  const handlePlaceBet = async () => {
    if (!selectedOption) {
      Alert.alert('Error', 'Please select an option');
      return;
    }
    if (numericAmount < minBet || numericAmount > maxBet) {
      Alert.alert('Error', `Bet must be between ${minBet} and ${maxBet}`);
      return;
    }

    setIsPlacing(true);
    try {
      await api.post('/bets', {
        gameId,
        roundId,
        amount: numericAmount,
        currency: 'coins',
        option: selectedOption,
      });
      Alert.alert('Success', 'Bet placed!');
      onBetPlaced();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to place bet');
    } finally {
      setIsPlacing(false);
    }
  };

  const quickAmounts = [minBet, minBet * 5, minBet * 10, maxBet];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Place Your Bet</Text>

      <View style={styles.optionsRow}>
        {options.map((option) => (
          <TouchableOpacity
            key={option}
            style={[styles.optionButton, selectedOption === option && styles.optionButtonActive]}
            onPress={() => setSelectedOption(option)}
          >
            <Text style={[styles.optionText, selectedOption === option && styles.optionTextActive]}>
              {option.charAt(0).toUpperCase() + option.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TextInput
        style={styles.amountInput}
        value={amount}
        onChangeText={setAmount}
        keyboardType="numeric"
        placeholder={`Min: ${minBet}`}
        placeholderTextColor="#666"
      />

      <View style={styles.quickAmounts}>
        {quickAmounts.map((qa) => (
          <TouchableOpacity key={qa} style={styles.quickAmountChip} onPress={() => setAmount(qa.toString())}>
            <Text style={styles.quickAmountText}>{qa}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.placeButton, isPlacing && styles.placeButtonDisabled]}
        onPress={handlePlaceBet}
        disabled={isPlacing}
      >
        <Text style={styles.placeButtonText}>
          {isPlacing ? 'Placing...' : `Place ${numericAmount} Coins`}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    margin: 16,
    padding: 20,
    backgroundColor: '#16213e',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#0f3460',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  optionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#0f3460',
  },
  optionButtonActive: {
    backgroundColor: '#e94560',
    borderColor: '#e94560',
  },
  optionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#aaa',
  },
  optionTextActive: {
    color: '#fff',
  },
  amountInput: {
    backgroundColor: '#1a1a2e',
    borderRadius: 10,
    padding: 14,
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#0f3460',
    marginBottom: 12,
  },
  quickAmounts: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  quickAmountChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
  },
  quickAmountText: {
    fontSize: 12,
    color: '#aaa',
  },
  placeButton: {
    backgroundColor: '#e94560',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  placeButtonDisabled: {
    opacity: 0.6,
  },
  placeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
