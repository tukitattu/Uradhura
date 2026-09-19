import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import GameListScreen from '../screens/games/GameListScreen';
import GamePlayScreen from '../screens/games/GamePlayScreen';
import { translucentHeader } from '../theme';

const Stack = createNativeStackNavigator();

export default function GameStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        ...translucentHeader(),
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Stack.Screen name="GameList" component={GameListScreen} options={{ headerShown: false }} />
      <Stack.Screen name="GamePlay" component={GamePlayScreen} options={{ title: 'Play' }} />
    </Stack.Navigator>
  );
}
