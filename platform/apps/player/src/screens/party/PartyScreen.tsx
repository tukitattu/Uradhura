import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BrandScreen } from '../../components/ui/BrandScreen';
import { BrandAsset } from '../../lib/assets/BrandAsset';
import { useAssets } from '../../lib/assets/AssetProvider';
import { colors, radius, spacing, backgroundKeys } from '../../theme';

const SEATS = [
  { icon: 'icons.audio-seat.host', label: 'Host', tone: colors.goldSoft },
  { icon: 'icons.audio-seat.co-host', label: 'Co-host', tone: colors.cyan },
  { icon: 'icons.audio-seat.user', label: '1', tone: colors.violetSoft },
  { icon: 'icons.audio-seat.user', label: '2', tone: colors.violetSoft },
  { icon: 'icons.audio-seat.user', label: '3', tone: colors.violetSoft },
  { icon: 'icons.audio-seat.user', label: '4', tone: colors.violetSoft },
] as const;

export default function PartyScreen() {
  const { manifest } = useAssets();
  const roomBgs = manifest?.assets.filter((a) => a.category === 'bg.party').length ?? 0;

  return (
    <BrandScreen background={backgroundKeys.party} title="Party" icon="icons.navigation.party">
      <View style={styles.content}>
        <View style={styles.hero}>
          <BrandAsset assetKey="logo.uradhura-emblem" size={64} />
          <Text style={styles.title}>Audio rooms &amp; clubs</Text>
          <Text style={styles.subtitle}>
            Voice seats, mic control and party challenges in your community
          </Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Powered by the live-room engine · V2</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Room seats</Text>
          <View style={styles.seatGrid}>
            {SEATS.map((seat) => (
              <View key={`${seat.label}-${seat.icon}`} style={styles.seatCard}>
                <View style={[styles.seatIcon, { borderColor: seat.tone }]}>
                  <BrandAsset assetKey={seat.icon} size={40} />
                </View>
                <Text style={styles.seatLabel}>{seat.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <BrandAsset assetKey="icons.audio-seat.host" size={22} />
            <Text style={styles.cardTitle}>What ships in V2</Text>
          </View>
          <Text style={styles.cardText}>
            Host an audio room with seats, mic control and emotes. Party challenges and club
            hangouts open here once the room stack goes live.
          </Text>
          <Text style={styles.cardMeta}>
            Room artwork is registered today ({roomBgs} backgrounds) so Super Admin can preview it.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <BrandAsset assetKey="icons.home.live-now" size={22} />
            <Text style={styles.cardTitle}>Today in V1</Text>
          </View>
          <Text style={styles.cardText}>
            Live viewing (join &amp; watch) is already live under the Live tab. Go Live begins in V2.
          </Text>
        </View>
      </View>
    </BrandScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.sm, gap: spacing.xl },
  hero: { alignItems: 'center', paddingVertical: spacing.lg, gap: spacing.sm },
  title: { fontSize: 26, fontWeight: '800', color: colors.textSoft },
  subtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: spacing.lg },
  badge: {
    marginTop: spacing.sm,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(124,58,237,0.16)',
    borderColor: 'rgba(124,58,237,0.4)',
    borderWidth: 1,
  },
  badgeText: { color: colors.violetSoft, fontSize: 12, fontWeight: '600' },
  section: { gap: spacing.md },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: colors.textSoft },
  seatGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  seatCard: {
    width: '30%',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.glass,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
  },
  seatIcon: {
    borderWidth: 1,
    borderRadius: radius.xl,
    padding: spacing.md,
    backgroundColor: colors.glass,
  },
  seatLabel: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
  card: {
    backgroundColor: colors.glass,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cardTitle: { fontSize: 16, fontWeight: '800', color: colors.textSoft },
  cardText: { color: colors.textSecondary, fontSize: 14, lineHeight: 21 },
  cardMeta: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
});