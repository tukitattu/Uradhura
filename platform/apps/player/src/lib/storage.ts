import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  ACCESS_TOKEN: '@uradhura/access_token',
  REFRESH_TOKEN: '@uradhura/refresh_token',
  LANGUAGE: '@uradhura/language',
  THEME: '@uradhura/theme',
  AVATAR_DRESS: '@uradhura/avatar_dress',
} as const;

export interface AvatarDress {
  /** Bundled frame key rendered over the avatar (e.g. 'frame.avatar.top1'). */
  frame: string | null;
  /** Front parts toggled on (outfit/accessory bundled keys). */
  parts: string[];
}

export const storage = {
  async getAccessToken(): Promise<string | null> {
    return AsyncStorage.getItem(KEYS.ACCESS_TOKEN);
  },

  async getRefreshToken(): Promise<string | null> {
    return AsyncStorage.getItem(KEYS.REFRESH_TOKEN);
  },

  async setTokens(accessToken: string, refreshToken: string): Promise<void> {
    await AsyncStorage.multiSet([
      [KEYS.ACCESS_TOKEN, accessToken],
      [KEYS.REFRESH_TOKEN, refreshToken],
    ]);
  },

  async clearTokens(): Promise<void> {
    await AsyncStorage.multiRemove([KEYS.ACCESS_TOKEN, KEYS.REFRESH_TOKEN]);
  },

  async getLanguage(): Promise<string | null> {
    return AsyncStorage.getItem(KEYS.LANGUAGE);
  },

  async setLanguage(lang: string): Promise<void> {
    await AsyncStorage.setItem(KEYS.LANGUAGE, lang);
  },

  async getTheme(): Promise<string | null> {
    return AsyncStorage.getItem(KEYS.THEME);
  },

  async setTheme(theme: string): Promise<void> {
    await AsyncStorage.setItem(KEYS.THEME, theme);
  },

  async getAvatarDress(): Promise<AvatarDress | null> {
    const raw = await AsyncStorage.getItem(KEYS.AVATAR_DRESS);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AvatarDress;
    } catch {
      return null;
    }
  },

  async setAvatarDress(dress: AvatarDress): Promise<void> {
    await AsyncStorage.setItem(KEYS.AVATAR_DRESS, JSON.stringify(dress));
  },
};

/** WebView games origin (production = lrlive-games H5 server). */
export const GAMES_BASE_URL = process.env.EXPO_PUBLIC_GAMES_BASE_URL || undefined;
