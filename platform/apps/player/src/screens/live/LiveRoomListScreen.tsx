import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image, RefreshControl } from 'react-native';
import { api } from '../../lib/api';
import { LiveRoom } from '../../lib/types';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import { BrandScreen } from '../../components/ui/BrandScreen';
import { BrandAsset } from '../../lib/assets/BrandAsset';
import { colors, radius, spacing, backgroundKeys } from '../../theme';

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
    <BrandScreen background={backgroundKeys.live} scroll={false}>
      <View style={styles.inner}>
        <View style={styles.onlineStrip}>
          <View style={styles.liveChip}>
            <View style={styles.liveDot} />
            <Text style={styles.liveChipText}>NOW LIVE</Text>
          </View>
          <Text style={styles.onlineHint}>Join the room, chat and send gifts</Text>
        </View>

        <FlatList
          data={rooms}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.cyan} />
          }
          ListEmptyComponent={
            <EmptyState
              icon="icons.home.live-now"
              message="No live rooms right now"
              detail="Hosts start a stream from V2 Go Live — tune in as soon as one opens."
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.roomCard}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('LiveRoom', { roomId: item.id })}
            >
              {item.thumbnail ? (
                <Image source={{ uri: item.thumbnail }} style={styles.thumbnail} />
              ) : (
                <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
                  <BrandAsset assetKey="logo.uradhura-emblem" size={40} />
                </View>
              )}
              <View style={styles.liveIndicator}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE</Text>
              </View>
              <View style={styles.roomInfo}>
                <Text style={styles.roomTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.hostName} numberOfLines={1}>@{item.host.username}</Text>
                <View style={styles.viewerRow}>
                  <Text style={styles.viewerCount}>{item.viewerCount} watching</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      </View>
    </BrandScreen>
  );
}

const styles = StyleSheet.create({
  inner: { flex: 1 },
  onlineStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  liveChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(225,29,72,0.22)',
    borderColor: 'rgba(225,29,72,0.6)',
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.rose,
  },
  liveChipText: { color: colors.rose, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  onlineHint: { color: colors.textSecondary, fontSize: 12, flex: 1 },
  list: { padding: spacing.lg, paddingTop: 0 },
  row: { justifyContent: 'space-between' },
  roomCard: {
    width: '48%',
    backgroundColor: colors.glass,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  thumbnail: { width: '100%', height: 120 },
  thumbnailPlaceholder: {
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveIndicator: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e11d48',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
    gap: 4,
  },
  liveText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  roomInfo: { padding: 10 },
  roomTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 4 },
  hostName: { fontSize: 12, color: colors.textSecondary, marginBottom: 2 },
  viewerRow: { flexDirection: 'row', alignItems: 'center' },
  viewerCount: { fontSize: 11, color: colors.gold, fontWeight: '600' },
});