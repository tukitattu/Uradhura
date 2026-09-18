import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Game } from '../lib/types';

interface Props {
  game: Game;
  featured?: boolean;
}

export default function GameCard({ game, featured }: Props) {
  return (
    <View style={[styles.card, featured && styles.cardFeatured]}>
      {game.thumbnail ? (
        <Image source={{ uri: game.thumbnail }} style={[styles.thumbnail, featured && styles.thumbnailFeatured]} />
      ) : (
        <View style={[styles.thumbnail, featured && styles.thumbnailFeatured, styles.thumbnailPlaceholder]}>
          <Text style={styles.placeholderText}>{game.name.charAt(0)}</Text>
        </View>
      )}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{game.name}</Text>
        <View style={styles.metaRow}>
          <View style={[styles.statusDot, game.status === 'active' && styles.statusDotActive]} />
          <Text style={styles.statusText}>{game.status}</Text>
        </View>
        {game.playerCount > 0 && (
          <Text style={styles.playerCount}>{game.playerCount} playing</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    overflow: 'hidden',
  },
  cardFeatured: {
    width: 260,
  },
  thumbnail: {
    width: '100%',
    height: 120,
  },
  thumbnailFeatured: {
    height: 150,
  },
  thumbnailPlaceholder: {
    backgroundColor: '#0f3460',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#e94560',
  },
  info: {
    padding: 10,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#666',
  },
  statusDotActive: {
    backgroundColor: '#4ecca3',
  },
  statusText: {
    fontSize: 11,
    color: '#aaa',
    textTransform: 'capitalize',
  },
  playerCount: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
  },
});
