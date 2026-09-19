import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { bundledSvg } from '../../lib/assets/registry';
import { imageFor } from '../../lib/assets/uraliveImages';

interface Props {
  /** Bundled SVG background key, e.g. 'bg.home.default'. */
  assetKey: string;
  /** Dark wash over the artwork so content stays legible (0-1). */
  overlay?: number;
  bottomScrim?: boolean;
  children?: React.ReactNode;
}

/**
 * Full-bleed branded background rendered from the asset catalogue bundled
 * with the APK (real Uralive artwork when available, generated SVG otherwise).
 * Instant and offline-safe — no remote fetch at mount time.
 */
export function BrandBackground({ assetKey, overlay = 0.45, bottomScrim = true, children }: Props) {
  const image = imageFor(assetKey);
  const svg = image ? null : bundledSvg(assetKey);

  return (
    <View style={styles.container}>
      {image && <Image source={image} style={StyleSheet.absoluteFill} resizeMode="cover" />}
      {svg && <SvgXml xml={svg} width="100%" height="100%" style={StyleSheet.absoluteFill} />}
      <View style={[styles.wash, { backgroundColor: `rgba(6,11,22,${overlay})` }]} />
      {bottomScrim && <View style={styles.bottomScrim} />}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  wash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  bottomScrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '42%',
    backgroundColor: 'rgba(10,18,32,0.72)',
  },
});