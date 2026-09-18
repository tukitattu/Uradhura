import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeStack from './HomeStack';
import LiveStack from './LiveStack';
import PartyStack from './PartyStack';
import GameStack from './GameStack';
import WalletStack from './WalletStack';
import MessagesStack from './MessagesStack';
import ProfileStack from './ProfileStack';
import { BrandAsset } from '../lib/assets/BrandAsset';

const Tab = createBottomTabNavigator();

const TABS = [
  { name: 'Home', key: 'home' },
  { name: 'Live', key: 'live' },
  { name: 'Party', key: 'party' },
  { name: 'Games', key: 'games' },
  { name: 'Wallet', key: 'wallet' },
  { name: 'Messages', key: 'messages' },
  { name: 'Profile', key: 'profile' },
] as const;

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused }) => {
          const tab = TABS.find((t) => t.name === route.name);
          if (!tab) return null;
          const key = focused
            ? `icons.navigation.${tab.key}.selected`
            : `icons.navigation.${tab.key}`;
          return <BrandAsset assetKey={key} size={22} />;
        },
        tabBarActiveTintColor: '#22d3ee',
        tabBarInactiveTintColor: '#8fa3c8',
        tabBarStyle: {
          backgroundColor: '#16213e',
          borderTopColor: '#0f3460',
          paddingBottom: 8,
          paddingTop: 8,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeStack} />
      <Tab.Screen name="Live" component={LiveStack} />
      <Tab.Screen name="Party" component={PartyStack} />
      <Tab.Screen name="Games" component={GameStack} />
      <Tab.Screen name="Wallet" component={WalletStack} />
      <Tab.Screen name="Messages" component={MessagesStack} />
      <Tab.Screen name="Profile" component={ProfileStack} />
    </Tab.Navigator>
  );
}