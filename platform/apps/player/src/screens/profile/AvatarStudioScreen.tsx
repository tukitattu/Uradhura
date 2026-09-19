import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useAssets } from '../../lib/assets/AssetProvider';
import { useAuth } from '../../contexts/AuthContext';
import { AVATAR_FRAME_KEYS, loadDress, saveDress } from '../../lib/assets/avatarConfig';
import { imageFor } from '../../lib/assets/uraliveImages';
import { BrandScreen } from '../../components/ui/BrandScreen';
import { BrandAsset } from '../../lib/assets/BrandAsset';
import { colors, radius, spacing, backgroundKeys } from '../../theme';

export default function AvatarStudioScreen({ navigation }: any) {
  const { manifest } = useAssets();
  const { user } = useAuth();
  const [frame, setFrame] = useState<string | null>('frame.avatar.top1');
  const [parts, setParts] = useState<string[]>([]);

  useEffect(() => {
    loadDress().then((d) => {
      setFrame(d.frame);
      setParts(d.parts);
    });
  }, []);

  const serverFrames = (manifest?.assets ?? [])
    .filter((a) => a.category === 'avatars.frames' || a.category === 'frame.avatar')
    .map((a) => a.key);

  const frameKeys = [...new Set([...AVATAR_FRAME_KEYS, ...serverFrames])];

  const partAssets = (manifest?.assets ?? []).filter((a) => a.category === 'avatars.default');

  const togglePart = (key: string) =>
    setParts((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  const equipped = frame ? imageFor(frame) : null;
  const currentDress = { frame, parts };

  const onSave = async () => {
    await saveDress(currentDress.frame, currentDress.parts);
    Alert.alert('Look saved', 'Your equipped avatar shows across your profile and the live room.', [
      { text: 'Done', onPress: () => navigation.goBack() },
    ]);
  };

  return (
    <BrandScreen background={backgroundKeys.ranking} title="Avatar Studio" icon="icons.profile.items" scroll={false}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.preview}>
          <View style={styles.avatarBox}>
            {user?.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <BrandAsset assetKey="logo.uradhura-emblem" size={48} />
              </View>
            )}
            {equipped && <Image source={equipped} style={styles.frame} resizeMode="contain" />}
            {parts.length > 0 && (
              <View style={styles.partsChip}>
                <Text style={styles.partsChipText}>{parts.length} parts</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frames</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.framesRow}>
            {frameKeys.map((key) => {
              const img = imageFor(key);
              const active = frame === key;
              return (
                <TouchableOpacity
                  key={key}
                  style={[styles.frameCard, active && styles.frameCardActive]}
                  onPress={() => setFrame(key)}
                >
                  {img ? (
                    <Image source={img} style={styles.frameThumb} resizeMode="contain" />
                  ) : (
                    <BrandAsset assetKey={key} size={44} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {partAssets.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Accessories</Text>
            <View style={styles.partsGrid}>
              {partAssets.map((a) => {
                const active = parts.includes(a.key);
                const bundled = imageFor(a.key);
                return (
                  <TouchableOpacity
                    key={a.key}
                    style={[styles.partCard, active && styles.partCardActive]}
                    onPress={() => togglePart(a.key)}
                  >
                    {bundled ? (
                      <BrandAsset assetKey={a.key} size={40} />
                    ) : a.thumbnailUrl || a.url ? (
                      <Image
                        source={{ uri: a.thumbnailUrl || a.url }}
                        style={styles.partRemote}
                        resizeMode="cover"
                      />
                    ) : (
                      <Text style={styles.partEmoji}>✧</Text>
                    )}
                    <Text style={styles.partName} numberOfLines={1}>{a.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        <TouchableOpacity style={styles.saveButton} onPress={onSave}>
          <Text style={styles.saveText}>Save look</Text>
        </TouchableOpacity>
      </ScrollView>
    </BrandScreen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: 40, gap: spacing.xl },
  preview: { alignItems: 'center' },
  avatarBox: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.glass,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.xl,
  },
  avatar: { width: 104, height: 104, borderRadius: 52 },
  avatarFallback: {
    backgroundColor: colors.violet,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: { position: 'absolute', width: 150, height: 150 },
  partsChip: {
    position: 'absolute',
    bottom: 16,
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  partsChipText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  section: { gap: spacing.md },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: colors.textSoft },
  framesRow: { gap: spacing.md },
  frameCard: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 72,
    height: 72,
    backgroundColor: colors.glass,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
  },
  frameCardActive: { borderColor: colors.cyan, backgroundColor: 'rgba(34,211,238,0.12)' },
  frameThumb: { width: 56, height: 56 },
  partsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  partCard: {
    width: '30%',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.glass,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
  },
  partCardActive: { borderColor: colors.cyan, backgroundColor: 'rgba(34,211,238,0.12)' },
  partRemote: { width: 40, height: 40, borderRadius: radius.sm },
  partEmoji: { fontSize: 24, color: colors.gold },
  partName: { fontSize: 11, color: colors.textSecondary, fontWeight: '600' },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});