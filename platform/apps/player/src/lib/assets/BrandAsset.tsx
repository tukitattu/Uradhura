import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { useAssets } from './AssetProvider';
import { resolveAsset } from './registry';

interface BrandAssetProps {
  /** Registry key, e.g. 'icons.navigation.home' or 'logo.uradhura-emblem'. */
  assetKey: string;
  size?: number;
  color?: string;
  style?: object;
}

/**
 * Resolves a branded asset with fallback priority
 * (remote override -> bundled SVG), mirroring the registry.
 */
export function BrandAsset({ assetKey, size = 24, style }: BrandAssetProps) {
  const { manifest } = useAssets();
  const resolved = resolveAsset(manifest, assetKey);

  if (!resolved) {
    return <View style={[styles.missing, { width: size, height: size }]} />;
  }

  if (resolved.kind === 'bundled' && resolved.svg) {
    return <SvgXml xml={resolved.svg} width={size} height={size} style={style} />;
  }

  if (resolved.kind === 'remoteSvg' && resolved.url) {
    return <RemoteSvg url={resolved.url} size={size} style={style} />;
  }

  if (resolved.kind === 'remote' && resolved.url) {
    return (
      <Image
        source={{ uri: resolved.url }}
        style={[{ width: size, height: size }, style]}
        resizeMode="contain"
      />
    );
  }

  return <View style={[styles.missing, { width: size, height: size }]} />;
}

function RemoteSvg({ url, size, style }: { url: string; size: number; style?: object }) {
  const [xml, setXml] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(url);
        const text = await res.text();
        if (!cancelled) setXml(text);
      } catch {
        // Fall back to nothing — next render keeps manifest resolution.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (!xml) {
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="small" color="#7c3aed" />
      </View>
    );
  }

  return <SvgXml xml={xml} width={size} height={size} style={style} />;
}

const styles = StyleSheet.create({
  missing: {
    backgroundColor: 'rgba(124,58,237,0.08)',
    borderRadius: 4,
  },
});