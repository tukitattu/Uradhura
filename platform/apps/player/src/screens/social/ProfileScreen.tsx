import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { PlayerProfile, Post } from '../../lib/types';
import PostCard from '../../components/PostCard';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import { BrandBackground } from '../../components/ui/BrandBackground';
import { BrandAsset } from '../../lib/assets/BrandAsset';
import { colors, radius, spacing, backgroundKeys } from '../../theme';
import { SafeAreaView } from 'react-native-safe-area-context';

type RouteParams = {
  params: {
    playerId: string;
  };
};

export default function ProfileScreen() {
  const route = useRoute<RouteProp<RouteParams, 'params'>>();
  const { playerId } = route.params;
  const { user } = useAuth();

  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isOwnProfile = user?.id === playerId;

  useEffect(() => {
    loadProfile();
  }, [playerId]);

  const loadProfile = async () => {
    try {
      const { data } = await api.get<{ data: PlayerProfile }>(`/players/${playerId}`);
      setProfile(data.data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFollow = async () => {
    if (!profile) return;
    try {
      await api.post(`/players/${playerId}/follow`);
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              isFollowing: !prev.isFollowing,
              followersCount: prev.isFollowing
                ? prev.followersCount - 1
                : prev.followersCount + 1,
            }
          : null
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to follow player');
    }
  };

  if (isLoading || !profile) {
    return <LoadingSpinner />;
  }

  const header = (
    <View style={styles.header}>
      <View style={styles.avatarWrap}>
        <BrandAsset assetKey="frame.avatar.default" size={116} style={styles.avatarFrame} />
        {profile.avatar ? (
          <Image source={{ uri: profile.avatar }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>{profile.displayName.charAt(0)}</Text>
          </View>
        )}
        <BrandAsset assetKey="badges.verified" size={26} style={styles.verifiedBadge} />
      </View>

      <Text style={styles.displayName}>{profile.displayName}</Text>
      <Text style={styles.username}>@{profile.username}</Text>

      <View style={styles.metaRow}>
        <View style={styles.metaChip}>
          <BrandAsset assetKey="icons.profile.level" size={16} />
          <Text style={styles.metaChipText}>Level {profile.level}</Text>
        </View>
        <View style={styles.metaChip}>
          <BrandAsset assetKey="frame.vip.badge" size={16} />
          <Text style={styles.metaChipText}>VIP</Text>
        </View>
      </View>

      {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}

      <View style={styles.statsRow}>
        {[
          { v: profile.stats.gamesPlayed, l: 'Games', k: 'icons.profile.stats' },
          { v: profile.stats.gamesWon, l: 'Wins', k: 'frame.ranking.podium' },
          { v: profile.followersCount, l: 'Followers', k: 'icons.invite.share' },
          { v: profile.followingCount, l: 'Following', k: 'icons.invite.link' },
        ].map((s) => (
          <View key={s.l} style={styles.statItem}>
            <BrandAsset assetKey={s.k} size={18} />
            <Text style={styles.statValue}>{s.v}</Text>
            <Text style={styles.statLabel}>{s.l}</Text>
          </View>
        ))}
      </View>

      {!isOwnProfile && (
        <TouchableOpacity
          style={[styles.followButton, profile.isFollowing && styles.followingButton]}
          onPress={handleFollow}
        >
          <Text style={[styles.followButtonText, profile.isFollowing && styles.followingButtonText]}>
            {profile.isFollowing ? 'Following' : 'Follow'}
          </Text>
        </TouchableOpacity>
      )}

      <Text style={styles.sectionTitle}>Posts</Text>
    </View>
  );

  return (
    <BrandBackground assetKey={backgroundKeys.ranking} overlay={0.62}>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <FlatList
          data={profile.recentPosts}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={header}
          contentContainerStyle={styles.content}
          ListEmptyComponent={
            <EmptyState
              icon="icons.profile.items"
              message="No posts yet"
              detail={isOwnProfile ? 'Share your moments with the community.' : undefined}
            />
          }
          renderItem={({ item }: { item: Post }) => <PostCard post={item} />}
        />
      </SafeAreaView>
    </BrandBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingBottom: 40 },
  header: {
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  avatarWrap: { position: 'relative', alignItems: 'center', marginBottom: spacing.md },
  avatarFrame: { position: 'absolute', top: -4 },
  avatar: { width: 100, height: 100, borderRadius: 50 },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.violet,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 40, fontWeight: '800', color: '#fff' },
  verifiedBadge: { position: 'absolute', bottom: 4, right: 12 },
  displayName: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textSoft,
  },
  username: { fontSize: 14, color: colors.textSecondary, marginBottom: spacing.sm },
  metaRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.glass,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  metaChipText: { fontSize: 12, fontWeight: '700', color: colors.goldSoft },
  bio: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 24,
    marginBottom: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    backgroundColor: colors.glass,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    marginBottom: spacing.lg,
  },
  statItem: { alignItems: 'center', gap: 2, flex: 1 },
  statValue: { fontSize: 16, fontWeight: '800', color: colors.text, marginTop: 4 },
  statLabel: { fontSize: 11, color: colors.textSecondary },
  followButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 10,
    borderRadius: radius.pill,
    marginBottom: spacing.lg,
  },
  followingButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  followButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  followingButtonText: { color: colors.cyan },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textSoft,
    alignSelf: 'flex-start',
    paddingLeft: spacing.xl,
    marginBottom: spacing.sm,
  },
});