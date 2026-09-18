import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/home/HomeScreen';
import GamePlayScreen from '../screens/games/GamePlayScreen';

const Stack = createNativeStackNavigator();

export default function HomeStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#16213e' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Stack.Screen name="HomeScreen" component={HomeScreen} options={{ title: 'Uradhura' }} />
      <Stack.Screen
        name="GamePlay"
        component={GamePlayScreen}
        options={({ route }: any) => ({ title: 'Play' })}
      />
    </Stack.Navigator>
  );
}
