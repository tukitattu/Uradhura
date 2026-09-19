import { BUNDLED_SVG } from './bundledSVG';
import type { AssetManifest, ManifestAsset, ResolvedAsset } from './types';

/** SVG markup for a key bundled with the APK. Available offline, instantly. */
export function bundledSvg(key: string): string | undefined {
  return BUNDLED_SVG[key];
}

export function manifestAsset(manifest: AssetManifest | null, key: string): ManifestAsset | null {
  if (!manifest) return null;
  return manifest.assets.find((a) => a.key === key) ?? null;
}

/**
 * Remote URLs served by the API are already version-encoded in the path
 * (`-v2.svg`) and marked Cache-Control: immutable, so clients cache forever
 * and invalidation happens via the new URL. External override URLs are NOT
 * versioned — append a query param so a version bump picks up the change.
 */
export function cacheBustedUrl(url: string, version: number): string {
  if (/-\d+\.[a-z0-9]+(\?|$)/i.test(url)) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}v=${version}`;
}

/**
 * Resolution priority (matches the manifest semantics):
 *  1. Remote override — used when the asset is not bundled at all, or when
 *     a published copy is NEWER than the seed version bundled in this APK
 *     (Super Admin replaced it; seed bundles start at version 1, and any
 *     re-upload bumps the version). Overrides ship without an APK release.
 *  2. Bundled SVG shipped in the APK — authoritative for core UI until a
 *     remote replacement exists, so navigation is instant and offline-safe.
 * Returns null when nothing resolves.
 */
export function resolveAsset(
  manifest: AssetManifest | null,
  key: string,
): ResolvedAsset | null {
  const local = bundledSvg(key);
  const remote = manifestAsset(manifest, key);

  if (remote) {
    const superseded = !local || remote.version > 1;
    const format = (remote.format || '').toLowerCase();
    const url = cacheBustedUrl(remote.url, remote.version);
    if (superseded) {
      if (format === 'svg') {
        return { kind: 'remoteSvg', key, url, format: 'svg', version: remote.version, name: remote.name };
      }
      return { kind: 'remote', key, url, format: format || null, version: remote.version, name: remote.name };
    }
  }

  if (local) {
    return { kind: 'bundled', key, svg: local, version: 1, name: key };
  }

  return null;
}