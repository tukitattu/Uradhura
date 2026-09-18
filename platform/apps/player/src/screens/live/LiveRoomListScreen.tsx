import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image, RefreshControl } from 'react-native';
import { api } from '../../lib/api';
import { LiveRoom } from '../../lib/types';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';

export default function LiveRoomListScreen({ navigation }: any) {
  const [rooms, setRooms] = useState<LiveRoom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadRooms();
  }, []);

  const loadRooms = async () => {
    try {
      const { data } = await api.get<{ data: LiveRoom[] }>('/live/rooms');
      setRooms(data.data);
    } catch (error) {
      console.error('Failed to load rooms');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadRooms();
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <View style={styles.container}>
      <FlatList
        data={rooms}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#e94560" />}
        ListEmptyComponent={<EmptyState message="No live rooms right now" />}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.roomCard}
            onPress={() => navigation.navigate('LiveRoom', { roomId: item.id })}
          >
            {item.thumbnail ? (
              <Image source={{ uri: item.thumbnail }} style={styles.thumbnail} />
            ) : (
              <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
                <Text style={styles.placeholderText}>LIVE</Text>
              </View>
            )}
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
            <View style={styles.roomInfo}>
              <Text style={styles.roomTitle} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.hostName}>{item.host.displayName}</Text>
              <Text style={styles.viewerCount}>{item.viewerCount} viewers</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  list: {
    padding: 12,
  },
  row: {
    justifyContent: 'space-between',
  },
  roomCard: {
    width: '48%',
    backgroundColor: '#16213e',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  thumbnail: {
    width: '100%',
    height: 120,
  },
  thumbnailPlaceholder: {
    backgroundColor: '#0f3460',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: '#e94560',
    fontSize: 18,
    fontWeight: 'bold',
  },
  liveIndicator: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e94560',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  liveText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  roomInfo: {
    padding: 10,
  },
  roomTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  hostName: {
    fontSize: 12,
    color: '#aaa',
    marginBottom: 2,
  },
  viewerCount: {
    fontSize: 11,
    color: '#666',
  },
});
