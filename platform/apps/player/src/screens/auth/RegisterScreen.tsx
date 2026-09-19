import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
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

export default function RegisterScreen({ navigation }: Props) {
  const { register } = useAuth();
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validate = (): boolean => {
    if (!username.trim()) {
      Alert.alert('Error', 'Username is required');
      return false;
    }
    if (username.length < 3) {
      Alert.alert('Error', 'Username must be at least 3 characters');
      return false;
    }
    if (!displayName.trim()) {
      Alert.alert('Error', 'Display name is required');
      return false;
    }
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      Alert.alert('Error', 'Valid email is required');
      return false;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return false;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return false;
    }
    return true;
  };

  const handleRegister = async () => {
    if (!validate()) return;

    setIsLoading(true);
    try {
      await register({
        username: username.trim(),
        email: email.trim(),
        password,
        displayName: displayName.trim(),
      });
    } catch (error: any) {
      Alert.alert('Registration Failed', error.response?.data?.message || 'Try again');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <BrandBackground assetKey="bg.home.default" overlay={0.62} bottomScrim={false}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.brand}>
          <BrandAsset assetKey="logo.uradhura-emblem" size={72} />
          <Text style={styles.title}>Join Uradhura</Text>
          <Text style={styles.subtitle}>Create your player profile</Text>
        </View>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Username"
            placeholderTextColor={colors.textMuted}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TextInput
            style={styles.input}
            placeholder="Display Name"
            placeholderTextColor={colors.textMuted}
            value={displayName}
            onChangeText={setDisplayName}
          />
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={colors.textMuted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={colors.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <TextInput
            style={styles.input}
            placeholder="Confirm Password"
            placeholderTextColor={colors.textMuted}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />

          <BrandButton label="Sign Up" onPress={handleRegister} loading={isLoading} />

          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.linkText}>
              Already have an account? <Text style={styles.linkBold}>Log In</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </BrandBackground>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 40,
    gap: spacing.xxl,
  },
  brand: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: colors.textSoft,
    marginTop: spacing.md,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
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