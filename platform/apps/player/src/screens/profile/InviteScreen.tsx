import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { BrandScreen } from '../../components/ui/BrandScreen';
import { BrandAsset } from '../../lib/assets/BrandAsset';
import { imageFor } from '../../lib/assets/uraliveImages';
import { colors, radius, spacing, backgroundKeys } from '../../theme';

const SOCIALS = [
  { key: 'invite.wp', label: 'WhatsApp' },
  { key: 'invite.fb', label: 'Facebook' },
  { key: 'invite.insta', label: 'Instagram' },
  { key: 'invite.x', label: 'X' },
  { key: 'invite.link', label: 'Copy link' },
] as const;

export default function InviteScreen() {
  const { user } = useAuth();
  const inviteLink = `https://uradhura.app/r/${user?.username ?? 'me'}`;

  return (
    <BrandScreen background={backgroundKeys.ranking} title="Invite" icon="icons.invite.share" scroll>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Image source={imageFor('invite.background')} style={styles.inviteBg} resizeMode="cover" />

        <Image source={imageFor('invite.text')} style={styles.inviteText} resizeMode="contain" />

        <View style={styles.codeCard}>
          <Image source={imageFor('invite.code')} style={styles.codeArt} resizeMode="contain" />
          <Text style={styles.hint}>
            Share your code and link — friends who join earn you rewards.
          </Text>
        </View>

        <View style={styles.linkCard}>
          <Text style={styles.linkLabel}>Your invite link</Text>
          <Text style={styles.linkValue} numberOfLines={1}>{inviteLink}</Text>
        </View>

        <TouchableOpacity
          style={styles.copyButton}
          onPress={() => {
            const doc = (globalThis as any).document;
            if (doc?.createElement) {
              const el = doc.createElement('textarea');
              el.value = inviteLink;
              doc.body.appendChild(el);
              el.select();
              doc.execCommand('copy');
              doc.body.removeChild(el);
            }
          }}
        >
          <BrandAsset assetKey="invite.link" size={18} />
          <Text style={styles.copyText}>Copy link</Text>
        </TouchableOpacity>

        <View style={styles.socials}>
          {SOCIALS.map((s) => (
            <View key={s.key} style={styles.social}>
              <View style={styles.socialIcon}>
                <BrandAsset assetKey={s.key} size={28} />
              </View>
              <Text style={styles.socialLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </BrandScreen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: 40, gap: spacing.xl },
  inviteBg: { width: '100%', height: 220, borderRadius: radius.xl },
  inviteText: { width: '100%', height: 80 },
  codeCard: { alignItems: 'center', gap: spacing.md, backgroundColor: colors.glass, borderColor: colors.border, borderWidth: 1, borderRadius: radius.xl, padding: spacing.lg },
  codeArt: { width: 140, height: 150 },
  hint: { fontSize: 12, color: colors.textSecondary, textAlign: 'center' },
  linkCard: { gap: 4 },
  linkLabel: { fontSize: 12, color: colors.textMuted },
  linkValue: { fontSize: 15, color: colors.cyan, fontWeight: '700' },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingVertical: 13,
  },
  copyText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  socials: { flexDirection: 'row', justifyContent: 'space-between' },
  social: { alignItems: 'center', gap: spacing.xs },
  socialIcon: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.glassStrong,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.xl,
  },
  socialLabel: { fontSize: 11, color: colors.textSecondary },
});