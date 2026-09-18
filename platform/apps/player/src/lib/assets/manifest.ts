import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import type { AssetManifest } from './types';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4002/api/v1';

const MANIFEST_KEY = '@uradhura/asset_manifest';
const FETCHED_AT_KEY = '@uradhura/asset_manifest_fetched_at';

/** Manifest is treated as fresh for this window; refresh happens in background. */
export const MANIFEST_REFRESH_MS = 6 * 60 * 60 * 1000; // 6 hours

/**
 * Public, unauthenticated manifest endpoint. Filtered server-side to
 * published + enabled + in-window assets only.
 */
export async function fetchAssetManifest(): Promise<AssetManifest> {
  const { data } = await axios.get<AssetManifest>(`${API_BASE_URL}/assets/manifest`, {
    timeout: 10000,
  });
  return data;
}

export async function loadCachedManifest(): Promise<AssetManifest | null> {
  const raw = await AsyncStorage.getItem(MANIFEST_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AssetManifest;
    return parsed && Array.isArray(parsed.assets) ? parsed : null;
  } catch {
    return null;
  }
}

export async function saveCachedManifest(manifest: AssetManifest): Promise<void> {
  await AsyncStorage.multiSet([
    [MANIFEST_KEY, JSON.stringify(manifest)],
    [FETCHED_AT_KEY, String(Date.now())],
  ]);
}

export async function manifestIsStale(): Promise<boolean> {
  const fetchedAt = await AsyncStorage.getItem(FETCHED_AT_KEY);
  if (!fetchedAt) return true;
  return Date.now() - Number(fetchedAt) > MANIFEST_REFRESH_MS;
}

export async function clearCachedManifest(): Promise<void> {
  await AsyncStorage.multiRemove([MANIFEST_KEY, FETCHED_AT_KEY]);
}