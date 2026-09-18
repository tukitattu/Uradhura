import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LiveRoomListScreen from '../screens/live/LiveRoomListScreen';
import LiveRoomScreen from '../screens/live/LiveRoomScreen';

const Stack = createNativeStackNavigator();

export default function LiveStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#16213e' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Stack.Screen name="LiveRoomList" component={LiveRoomListScreen} options={{ title: 'Live' }} />
      <Stack.Screen name="LiveRoom" component={LiveRoomScreen} options={{ title: 'Live' }} />
    </Stack.Navigator>
  );
}