import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LiveRoomListScreen from '../screens/live/LiveRoomListScreen';
import LiveRoomScreen from '../screens/live/LiveRoomScreen';
import { translucentHeader } from '../theme';

const Stack = createNativeStackNavigator();

export default function LiveStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        ...translucentHeader(),
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Stack.Screen name="LiveRoomList" component={LiveRoomListScreen} options={{ headerShown: false }} />
      <Stack.Screen name="LiveRoom" component={LiveRoomScreen} options={{ title: 'Live' }} />
    </Stack.Navigator>
  );
}