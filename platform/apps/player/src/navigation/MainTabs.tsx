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
import { Image } from 'react-native';
import { imageFor } from '../lib/assets/uraliveImages';

const Tab = createBottomTabNavigator();

const TABS: { name: string; key: string; image?: string }[] = [
  { name: 'Home', key: 'home' },
  { name: 'Live', key: 'live', image: 'icons.nav.live' },
  { name: 'Party', key: 'party', image: 'icons.nav.party' },
  { name: 'Games', key: 'games' },
  { name: 'Wallet', key: 'wallet' },
  { name: 'Messages', key: 'messages', image: 'icons.nav.messages' },
  { name: 'Profile', key: 'profile', image: 'icons.nav.profile' },
];

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused }) => {
          const tab = TABS.find((t) => t.name === route.name);
          if (!tab) return null;
          const size = focused ? 27 : 22;
          if (tab.image && imageFor(tab.image)) {
            return <Image source={imageFor(tab.image) as any} style={{ width: size, height: size }} resizeMode="contain" />;
          }
          const key = focused
            ? `icons.navigation.${tab.key}.selected`
            : `icons.navigation.${tab.key}`;
          return <BrandAsset assetKey={key} size={size} />;
        },
        tabBarActiveTintColor: '#22d3ee',
        tabBarInactiveTintColor: '#8fa3c8',
        tabBarStyle: {
          backgroundColor: '#16243f',
          borderTopColor: '#24395f',
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