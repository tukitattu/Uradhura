import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BrandBackground } from '../../components/ui/BrandBackground';
import { BrandAsset } from '../../lib/assets/BrandAsset';
import { BrandButton } from '../../components/ui/BrandButton';
import { colors, radius, spacing } from '../../theme';

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

export default function LoginScreen({ navigation }: Props) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validate = (): boolean => {
    if (!email.trim()) {
      Alert.alert('Error', 'Email is required');
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      Alert.alert('Error', 'Invalid email format');
      return false;
    }
    if (!password) {
      Alert.alert('Error', 'Password is required');
      return false;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return false;
    }
    return true;
  };

  const handleLogin = async () => {
    if (!validate()) return;

    setIsLoading(true);
    try {
      await login(email.trim(), password);
    } catch (error: any) {
      Alert.alert('Login Failed', error.response?.data?.message || 'Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <BrandBackground assetKey="bg.home.default" overlay={0.62} bottomScrim={false}>
      <View style={styles.content}>
        <View style={styles.brand}>
          <BrandAsset assetKey="logo.uradhura-logo" size={150} />
          <Text style={styles.subtitle}>Welcome back to the arena</Text>
        </View>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={colors.textMuted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={colors.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <BrandButton label="Log In" onPress={handleLogin} loading={isLoading} />

          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.linkText}>
              New to Uradhura? <Text style={styles.linkBold}>Create account</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </BrandBackground>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 40,
    gap: spacing.xxl,
  },
  brand: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    letterSpacing: 0.3,
    marginTop: spacing.sm,
  },
  form: {
    gap: spacing.md,
  },
  input: {
    backgroundColor: colors.glass,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: 16,
    fontSize: 16,
    color: colors.text,
  },
  linkText: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.md,
    fontSize: 14,
  },
  linkBold: {
    color: colors.cyan,
    fontWeight: '700',
  },
});