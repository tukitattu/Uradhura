import React, { useState } from 'react';
import { View, Text, Switch, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { storage } from '../../lib/storage';
import { BrandBackground } from '../../components/ui/BrandBackground';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius } from '../../theme';

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  const handleLanguageChange = async (lang: string) => {
    await storage.setLanguage(lang);
    Alert.alert('Language', 'Language preference saved. Restart the app to apply changes.');
  };

  return (
    <BrandBackground assetKey="bg.home.default" overlay={0.55}>
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account</Text>
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Username</Text>
              <Text style={styles.settingValue}>@{user?.username}</Text>
            </View>
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Email</Text>
              <Text style={styles.settingValue}>{user?.email}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notifications</Text>
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Push Notifications</Text>
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: '#333', true: colors.primary }}
                thumbColor="#fff"
              />
            </View>
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Sound</Text>
              <Switch
                value={soundEnabled}
                onValueChange={setSoundEnabled}
                trackColor={{ false: '#333', true: colors.primary }}
                thumbColor="#fff"
              />
            </View>
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Vibration</Text>
              <Switch
                value={vibrationEnabled}
                onValueChange={setVibrationEnabled}
                trackColor={{ false: '#333', true: colors.primary }}
                thumbColor="#fff"
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Language</Text>
            {['en', 'ar', 'fr', 'es'].map((lang) => (
              <TouchableOpacity key={lang} style={styles.languageItem} onPress={() => handleLanguageChange(lang)}>
                <Text style={styles.languageText}>{lang.toUpperCase()}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.section}>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </BrandBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1 },
  scrollContent: { paddingBottom: 30 },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    color: colors.cyan,
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: 20,
    marginBottom: 8,
    marginTop: 16,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: colors.glass,
    borderTopColor: colors.border,
    borderBottomColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  settingLabel: {
    fontSize: 16,
    color: colors.text,
  },
  settingValue: {
    fontSize: 14,
    color: colors.textMuted,
  },
  languageItem: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  languageText: {
    fontSize: 16,
    color: colors.text,
  },
  logoutButton: {
    marginHorizontal: 20,
    backgroundColor: colors.roseDeep + '20',
    borderRadius: radius.lg,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.roseDeep + '55',
  },
  logoutText: {
    color: colors.rose,
    fontSize: 16,
    fontWeight: '700',
  },
});
