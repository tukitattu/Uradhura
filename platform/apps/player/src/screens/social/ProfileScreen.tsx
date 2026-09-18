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

  return (
    <FlatList
      data={profile.recentPosts}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            {profile.avatar ? (
              <Image source={{ uri: profile.avatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{profile.displayName.charAt(0)}</Text>
              </View>
            )}
          </View>

          <Text style={styles.displayName}>{profile.displayName}</Text>
          <Text style={styles.username}>@{profile.username}</Text>
          {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile.stats.gamesPlayed}</Text>
              <Text style={styles.statLabel}>Games</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile.stats.gamesWon}</Text>
              <Text style={styles.statLabel}>Wins</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile.followersCount}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile.followingCount}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </View>
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
      }
      renderItem={({ item }: { item: Post }) => <PostCard post={item} />}
      contentContainerStyle={styles.content}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  content: {
    paddingBottom: 20,
  },
  header: {
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#0f3460',
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#e94560',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#fff',
  },
  displayName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  username: {
    fontSize: 14,
    color: '#aaa',
    marginBottom: 8,
  },
  bio: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    color: '#aaa',
  },
  followButton: {
    backgroundColor: '#e94560',
    paddingHorizontal: 32,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 16,
  },
  followingButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#e94560',
  },
  followButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  followingButtonText: {
    color: '#e94560',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    alignSelf: 'flex-start',
  },
});
