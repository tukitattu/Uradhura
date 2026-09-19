import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import WalletScreen from '../screens/wallet/WalletScreen';
import DepositScreen from '../screens/wallet/DepositScreen';
import { translucentHeader } from '../theme';

const Stack = createNativeStackNavigator();

export default function WalletStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        ...translucentHeader(),
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Stack.Screen name="WalletScreen" component={WalletScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Deposit" component={DepositScreen} options={{ title: 'Deposit' }} />
    </Stack.Navigator>
  );
}
