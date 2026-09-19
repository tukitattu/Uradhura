import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import PartyScreen from '../screens/party/PartyScreen';
import { translucentHeader } from '../theme';

const Stack = createNativeStackNavigator();

export default function PartyStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        ...translucentHeader(),
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Stack.Screen name="Party" component={PartyScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}