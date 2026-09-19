import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import ProfileScreen from '../screens/social/ProfileScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import { translucentHeader } from '../theme';

const Stack = createNativeStackNavigator();

export default function ProfileStack() {
  const { user } = useAuth();

  return (
    <Stack.Navigator
      screenOptions={{
        ...translucentHeader(),
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Stack.Screen
        name="MyProfile"
        component={ProfileScreen}
        options={{ headerShown: false }}
        initialParams={{ playerId: user?.id }}
      />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
    </Stack.Navigator>
  );
}
