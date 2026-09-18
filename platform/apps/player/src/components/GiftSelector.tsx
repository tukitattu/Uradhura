import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { api } from '../lib/api';
import { LiveGift } from '../lib/types';

interface Props {
  onSelect: (giftId: string) => void;
  onClose: () => void;
}

export default function GiftSelector({ onSelect, onClose }: Props) {
  const [gifts, setGifts] = useState<LiveGift[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadGifts();
  }, []);

  const loadGifts = async () => {
    try {
      const { data } = await api.get<{ data: LiveGift[] }>('/live/gifts');
      setGifts(data.data);
    } catch (error) {
      console.error('Failed to load gifts');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Send a Gift</Text>
        <TouchableOpacity onPress={onClose}>
          <Text style={styles.closeText}>Close</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={gifts}
        keyExtractor={(item) => item.id}
        numColumns={4}
        contentContainerStyle={styles.grid}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.giftItem} onPress={() => onSelect(item.id)}>
            <Text style={styles.giftIcon}>{item.icon}</Text>
            <Text style={styles.giftName}>{item.name}</Text>
            <Text style={styles.giftPrice}>{item.price}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#16213e',
    borderTopWidth: 1,
    borderTopColor: '#0f3460',
    maxHeight: 300,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#0f3460',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  closeText: {
    fontSize: 14,
    color: '#e94560',
  },
  grid: {
    padding: 12,
  },
  giftItem: {
    width: '25%',
    alignItems: 'center',
    paddingVertical: 12,
  },
  giftIcon: {
    fontSize: 28,
    marginBottom: 4,
  },
  giftName: {
    fontSize: 10,
    color: '#aaa',
  },
  giftPrice: {
    fontSize: 10,
    color: '#e94560',
    fontWeight: '600',
  },
});
