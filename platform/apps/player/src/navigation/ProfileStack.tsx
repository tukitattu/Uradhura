import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import ProfileScreen from '../screens/social/ProfileScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import LiveCenterScreen from '../screens/profile/LiveCenterScreen';
import AgencyScreen from '../screens/profile/AgencyScreen';
import MyItemsScreen from '../screens/profile/MyItemsScreen';
import StoreScreen from '../screens/profile/StoreScreen';
import AvatarStudioScreen from '../screens/profile/AvatarStudioScreen';
import InviteScreen from '../screens/profile/InviteScreen';
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
      <Stack.Screen name="LiveCenter" component={LiveCenterScreen} options={{ title: 'Live Center' }} />
      <Stack.Screen name="Agency" component={AgencyScreen} options={{ title: 'My Agency' }} />
      <Stack.Screen name="MyItems" component={MyItemsScreen} options={{ title: 'My Items' }} />
      <Stack.Screen name="Store" component={StoreScreen} options={{ title: 'Store' }} />
      <Stack.Screen name="AvatarStudio" component={AvatarStudioScreen} options={{ title: 'Avatar Studio' }} />
      <Stack.Screen name="Invite" component={InviteScreen} options={{ title: 'Invite' }} />
    </Stack.Navigator>
  );
}
