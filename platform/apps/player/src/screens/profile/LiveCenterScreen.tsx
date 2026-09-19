import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  Alert,
  RefreshControl,
} from 'react-native';
import { api } from '../../lib/api';
import { LiveRoom } from '../../lib/types';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import { BrandScreen } from '../../components/ui/BrandScreen';
import { BrandAsset } from '../../lib/assets/BrandAsset';
import { imageFor } from '../../lib/assets/uraliveImages';
import { colors, radius, spacing, backgroundKeys } from '../../theme';

type Nav = { navigate: (name: string, params?: object) => void; getParent: () => any };

export default function LiveCenterScreen({ navigation }: { navigation: Nav }) {
  const [rooms, setRooms] = useState<LiveRoom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadRooms();
  }, []);

  const loadRooms = useCallback(async () => {
    try {
      const { data } = await api.get<{ data: LiveRoom[] }>('/live/rooms');
      setRooms(data.data);
    } catch {
      /** rooms may be empty until hosts go live */
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  const goLive = () =>
    Alert.alert(
      'GO LIVE',
      'Streaming with camera + mic unlocks in V2 (Agora RTC). Join a live room now to watch and chat.',
      [{ text: 'OK' }]
    );

  const openRoom = (roomId: string) =>
    navigation.getParent()?.getParent()?.navigate('Live', { screen: 'LiveRoom', params: { roomId } });

  if (isLoading) return <LoadingSpinner />;

  return (
    <BrandScreen background={backgroundKeys.live} scroll={false}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.goLiveCard} activeOpacity={0.9} onPress={goLive}>
          <Image source={imageFor('bg.live.go')} style={styles.goLiveBg} resizeMode="cover" />
          <View style={styles.goLiveTint} />
          <View style={styles.goLiveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.goLiveBadgeText}>GO LIVE</Text>
          </View>
          <Text style={styles.goLiveTitle}>Start a stream</Text>
          <Text style={styles.goLiveSubtitle}>Camera + mic · Agora streaming · V2</Text>
        </TouchableOpacity>

        <View style={styles.sectionHead}>
          <BrandAsset assetKey="icons.home.live-now" size={20} />
          <Text style={styles.sectionTitle}>Live rooms</Text>
        </View>

        <FlatList
          data={rooms}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          scrollEnabled={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={loadRooms} tintColor={colors.cyan} />
          }
          ListEmptyComponent={
            <EmptyState
              icon="icons.home.live-now"
              message="No live rooms right now"
              detail="Hosts go live from V2 — rooms you host or watch show up here."
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.roomCard}
              activeOpacity={0.85}
              onPress={() => openRoom(item.id)}
            >
              {item.thumbnail ? (
                <Image source={{ uri: item.thumbnail }} style={styles.thumbnail} />
              ) : (
                <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
                  <BrandAsset assetKey="logo.uradhura-emblem" size={40} />
                </View>
              )}
              <View style={styles.liveIndicator}>
                <View style={styles.liveDotSmall} />
                <Text style={styles.liveText}>LIVE</Text>
              </View>
              <View style={styles.roomInfo}>
                <Text style={styles.roomTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.roomMeta} numberOfLines={1}>{item.viewerCount} watching · @{item.host.username}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      </ScrollView>
    </BrandScreen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: 40, gap: spacing.xl },
  goLiveCard: {
    height: 170,
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderColor: colors.border,
    borderWidth: 1,
    justifyContent: 'flex-end',
    padding: spacing.lg,
  },
  goLiveBg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  goLiveTint: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(10,18,32,0.5)',
  },
  goLiveBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#e11d48',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    marginBottom: spacing.sm,
  },
  goLiveBadgeText: { color: '#fff', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  goLiveTitle: { fontSize: 22, fontWeight: '800', color: colors.textSoft },
  goLiveSubtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#fff' },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: colors.textSoft },
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
  thumbnail: { width: '100%', height: 110 },
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
  liveDotSmall: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#fff' },
  liveText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  roomInfo: { padding: 10, gap: 2 },
  roomTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  roomMeta: { fontSize: 11, color: colors.textSecondary },
});