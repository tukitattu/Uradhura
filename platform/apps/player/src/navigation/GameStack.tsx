import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import GameListScreen from '../screens/games/GameListScreen';
import GamePlayScreen from '../screens/games/GamePlayScreen';

const Stack = createNativeStackNavigator();

export default function GameStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#16213e' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Stack.Screen name="GameList" component={GameListScreen} options={{ title: 'Games' }} />
      <Stack.Screen name="GamePlay" component={GamePlayScreen} options={{ title: 'Play' }} />
    </Stack.Navigator>
  );
}
