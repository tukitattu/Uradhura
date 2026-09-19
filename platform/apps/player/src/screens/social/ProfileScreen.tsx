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
import { useRoute, RouteProp, useNavigation, useFocusEffect } from '@react-navigation/native';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { PlayerProfile, Post } from '../../lib/types';
import PostCard from '../../components/PostCard';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import { BrandBackground } from '../../components/ui/BrandBackground';
import { BrandAsset } from '../../lib/assets/BrandAsset';
import { imageFor } from '../../lib/assets/uraliveImages';
import { loadDress } from '../../lib/assets/avatarConfig';
import { colors, radius, spacing, backgroundKeys } from '../../theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { AvatarDress } from '../../lib/storage';

type RouteParams = {
  params: {
    playerId: string;
  };
};

const CENTER_TILES = [
  { route: 'LiveCenter', icon: 'icons.profile.live-center', label: 'Live Center' },
  { route: 'Agency', icon: 'icons.profile.stats', label: 'My Agency' },
  { route: 'MyItems', icon: 'icons.profile.items', label: 'My Items' },
  { route: 'Store', icon: 'icons.profile.store', label: 'Store' },
  { route: 'Invite', icon: 'invite.menu', label: 'Invite' },
  { route: 'Settings', icon: 'icons.navigation.profile', label: 'Settings' },
] as const;

export default function ProfileScreen() {
  const route = useRoute<RouteProp<RouteParams, 'params'>>();
  const navigation = useNavigation() as any;
  const { playerId } = route.params;
  const { user } = useAuth();

  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dress, setDress] = useState<AvatarDress | null>(null);

  useEffect(() => {
    loadProfile();
  }, [playerId]);

  useFocusEffect(
    React.useCallback(() => {
      loadDress().then(setDress).catch(() => undefined);
    }, [])
  );

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

  const isOwnProfile = user?.id === playerId;
  const frameSource = dress?.frame && imageFor(dress.frame) ? imageFor(dress.frame) : null;

  const header = (
    <View style={styles.header}>
      <View style={styles.avatarWrap}>
        {frameSource ? (
          <Image source={frameSource} style={styles.avatarFrame} resizeMode="contain" />
        ) : (
          <BrandAsset assetKey="frame.avatar.top1" size={132} style={styles.avatarFrame} />
        )}
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

      <View style={styles.levelBar}>
        <BrandAsset assetKey="badges.level-star" size={18} />
        <Text style={styles.levelBarText}>Level {profile.level}</Text>
        <View style={styles.levelTrack}>
          <View style={[styles.levelFill, { width: `${Math.min(100, (profile.stats.gamesPlayed || 0) % 100)}%` }]} />
        </View>
        <Text style={styles.levelNext}>{profile.xp ?? 0} XP</Text>
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

      <View style={styles.centerGrid}>
        {CENTER_TILES.map((tile) => (
          <TouchableOpacity
            key={tile.route}
            style={styles.centerTile}
            activeOpacity={0.8}
            onPress={() => navigation.navigate(tile.route)}
          >
            <View style={styles.centerIcon}>
              <BrandAsset assetKey={tile.icon} size={26} />
            </View>
            <Text style={styles.centerLabel}>{tile.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

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
          ListFooterComponent={
            <View style={styles.inviteCard}>
              <Image source={imageFor('invite.banner')} style={styles.inviteBanner} resizeMode="cover" />
              <View style={styles.inviteBody}>
                <Text style={styles.inviteTitle}>Invite friends &amp; earn rewards</Text>
                <Image source={imageFor('invite.code')} style={styles.inviteCode} resizeMode="contain" />
                <View style={styles.inviteSocials}>
                  {['invite.link', 'invite.wp', 'invite.fb', 'invite.insta', 'invite.x'].map((k) => (
                    <View key={k} style={styles.inviteSocial}>
                      <BrandAsset assetKey={k} size={22} />
                    </View>
                  ))}
                </View>
              </View>
            </View>
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
  avatarFrame: { position: 'absolute', top: -8, width: 132, height: 132 },
  levelBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    width: '100%',
    backgroundColor: colors.glass,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  levelBarText: { fontSize: 13, fontWeight: '800', color: colors.goldSoft },
  levelTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surfaceLight,
    overflow: 'hidden',
  },
  levelFill: { height: '100%', borderRadius: 3, backgroundColor: colors.gold },
  levelNext: { fontSize: 11, color: colors.textMuted },

  centerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.xl,
    width: '100%',
  },
  centerTile: { width: '30%', alignItems: 'center', gap: spacing.sm },
  centerIcon: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.glass,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.xl,
  },
  centerLabel: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },

  inviteCard: {
    marginHorizontal: spacing.xl,
    marginTop: spacing.xl,
    backgroundColor: colors.glass,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  inviteBanner: { width: '100%', height: 150 },
  inviteBody: { padding: spacing.lg, gap: spacing.md, alignItems: 'center' },
  inviteTitle: { fontSize: 17, fontWeight: '800', color: colors.goldSoft },
  inviteRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  inviteCode: { width: 120, height: 150, resizeMode: 'contain' },
  inviteSocials: { flexDirection: 'row', gap: spacing.md },
  inviteSocial: {
    width: 40,
    height: 40,
    backgroundColor: colors.glassStrong,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
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