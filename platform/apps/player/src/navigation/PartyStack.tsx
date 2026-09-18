import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import PartyScreen from '../screens/party/PartyScreen';

const Stack = createNativeStackNavigator();

export default function PartyStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#16213e' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Stack.Screen name="Party" component={PartyScreen} options={{ title: 'Party' }} />
    </Stack.Navigator>
  );
}