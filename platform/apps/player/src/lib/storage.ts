import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  ACCESS_TOKEN: '@uradhura/access_token',
  REFRESH_TOKEN: '@uradhura/refresh_token',
  LANGUAGE: '@uradhura/language',
  THEME: '@uradhura/theme',
} as const;

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
};
