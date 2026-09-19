import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { AssetManifest } from './types';
import {
  fetchAssetManifest,
  loadCachedManifest,
  manifestIsStale,
  saveCachedManifest,
} from './manifest';

interface AssetContextValue {
  manifest: AssetManifest | null;
  refreshing: boolean;
  /** Force a manifest refresh now. */
  refresh: () => Promise<void>;
}

const AssetContext = createContext<AssetContextValue>({
  manifest: null,
  refreshing: false,
  refresh: async () => {},
});

/**
 * Loads the asset manifest once at startup:
 *  - cached copy first (instant UI, works offline),
 *  - then a background refresh when the cached copy is older than the
 *    refresh window.
 * Super Admin publishes bump the manifest version; the next refresh makes
 * gifts/frames/badges/promos change without an APK release.
 */
export function AssetProvider({ children }: { children: React.ReactNode }) {
  const [manifest, setManifest] = useState<AssetManifest | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const cached = await loadCachedManifest();
      if (!cancelled && cached) setManifest(cached);

      try {
        if (await manifestIsStale()) {
          const remote = await fetchAssetManifest();
          if (cancelled) return;
          setManifest(remote);
          await saveCachedManifest(remote);
        }
      } catch {
        // Offline or API down — keep the cached/bundled assets.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const remote = await fetchAssetManifest();
      setManifest(remote);
      await saveCachedManifest(remote);
    } finally {
      setRefreshing(false);
    }
  }, []);

  return (
    <AssetContext.Provider value={{ manifest, refreshing, refresh }}>
      {children}
    </AssetContext.Provider>
  );
}

export function useAssets() {
  return useContext(AssetContext);
}