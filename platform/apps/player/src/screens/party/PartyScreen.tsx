import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandAsset } from '../../lib/assets/BrandAsset';
import { useAssets } from '../../lib/assets/AssetProvider';

export default function PartyScreen() {
  const { manifest } = useAssets();
  const roomsLive = manifest?.assets.filter((a) => a.category === 'bg.party').length ?? 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <BrandAsset assetKey="logo.uradhura-emblem" size={72} />
          <Text style={styles.title}>Party</Text>
          <Text style={styles.subtitle}>Audio rooms, co-op challenges and group hangouts</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Arriving in the live-room engine · V2</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>What is coming</Text>
          <Text style={styles.cardText}>
            Hosted audio rooms with seats, mic control and emotes — same engine that powers live streams. Party
            challenges and club hangouts open here once the room stack is live.
          </Text>
          <Text style={styles.cardMeta}>
            Room backdrop assets are already registered ({roomsLive} active) and can be previewed by Super Admin.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>V1 status</Text>
          <Text style={styles.cardText}>
            Live viewing (join &amp; watch) is available under the Live tab today. Go live is scheduled for V2.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0a1220' },
  content: { padding: 20, gap: 16 },
  hero: { alignItems: 'center', paddingVertical: 28, gap: 8 },
  title: { fontSize: 30, fontWeight: '800', color: '#eef2ff' },
  subtitle: { fontSize: 14, color: '#8fa3c8', textAlign: 'center' },
  badge: {
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(124,58,237,0.16)',
    borderColor: 'rgba(124,58,237,0.4)',
    borderWidth: 1,
  },
  badgeText: { color: '#c4b5fd', fontSize: 12, fontWeight: '600' },
  card: {
    backgroundColor: '#16213e',
    borderRadius: 14,
    padding: 16,
    gap: 8,
  },
  cardTitle: { color: '#eef2ff', fontSize: 16, fontWeight: '700' },
  cardText: { color: '#8fa3c8', fontSize: 14, lineHeight: 22 },
  cardMeta: { color: '#64748b', fontSize: 12, lineHeight: 18 },
});