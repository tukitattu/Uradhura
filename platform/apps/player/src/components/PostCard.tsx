import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Post } from '../lib/types';

interface Props {
  post: Post;
  onLike?: () => void;
  onPress?: () => void;
}

export default function PostCard({ post, onLike, onPress }: Props) {
  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.header} onPress={onPress}>
        {post.player.avatar ? (
          <Image source={{ uri: post.player.avatar }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>{post.player.displayName.charAt(0)}</Text>
          </View>
        )}
        <View>
          <Text style={styles.displayName}>{post.player.displayName}</Text>
          <Text style={styles.time}>
            {new Date(post.createdAt).toLocaleDateString()}
          </Text>
        </View>
      </TouchableOpacity>

      <Text style={styles.content}>{post.content}</Text>

      {post.images.length > 0 && (
        <View style={styles.imagesContainer}>
          {post.images.slice(0, 3).map((uri, i) => (
            <Image key={i} source={{ uri }} style={styles.postImage} />
          ))}
        </View>
      )}

      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton} onPress={onLike}>
          <Text style={[styles.actionText, post.isLiked && styles.actionTextActive]}>
            {post.isLiked ? '♥' : '♡'} {post.likesCount}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionText}>💬 {post.commentsCount}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e94560',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  displayName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  time: {
    fontSize: 12,
    color: '#666',
  },
  content: {
    fontSize: 14,
    color: '#ddd',
    lineHeight: 20,
    marginBottom: 12,
  },
  imagesContainer: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 12,
  },
  postImage: {
    flex: 1,
    height: 120,
    borderRadius: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: '#0f346030',
    paddingTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionText: {
    fontSize: 14,
    color: '#aaa',
  },
  actionTextActive: {
    color: '#e94560',
  },
});
