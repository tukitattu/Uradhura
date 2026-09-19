import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Game } from '../lib/types';
import { colors, radius } from '../theme';

interface Props {
  game: Game;
  featured?: boolean;
}

const BADGE_LABEL: Record<string, string> = {
  'teen-patti': 'LIVE',
};

export default function GameCard({ game, featured }: Props) {
  const badge = BADGE_LABEL[game.slug ?? game.id] ?? (game.status === 'active' ? 'OPEN' : 'SOON');

  return (
    <View style={[styles.card, featured && styles.cardFeatured]}>
      {badge && (
        <View style={[styles.badge, game.status === 'active' ? styles.badgeLive : styles.badgeSoon]}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
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
          <Text style={styles.statusText}>{game.status === 'active' ? 'Available now' : 'Coming soon'}</Text>
        </View>
        {(game.playerCount ?? 0) > 0 && (
          <Text style={styles.playerCount}>{game.playerCount} playing now</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.glass,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  cardFeatured: { width: 260 },
  badge: {
    position: 'absolute',
    top: 10,
    left: 10,
    zIndex: 2,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  badgeLive: { backgroundColor: colors.roseDeep },
  badgeSoon: { backgroundColor: 'rgba(10,18,32,0.72)', borderColor: colors.border, borderWidth: 1 },
  badgeText: { color: '#ffffff', fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  thumbnail: { width: '100%', height: 120 },
  thumbnailFeatured: { height: 150 },
  thumbnailPlaceholder: {
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: { fontSize: 32, fontWeight: '800', color: colors.cyan },
  info: { padding: 12 },
  name: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.textMuted },
  statusDotActive: { backgroundColor: colors.green },
  statusText: { fontSize: 11, color: colors.textSecondary },
  playerCount: { fontSize: 11, color: colors.textMuted, marginTop: 4 },
});