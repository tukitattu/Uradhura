import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import WalletScreen from '../screens/wallet/WalletScreen';
import DepositScreen from '../screens/wallet/DepositScreen';

const Stack = createNativeStackNavigator();

export default function WalletStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#16213e' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Stack.Screen name="WalletScreen" component={WalletScreen} options={{ title: 'Wallet' }} />
      <Stack.Screen name="Deposit" component={DepositScreen} options={{ title: 'Deposit' }} />
    </Stack.Navigator>
  );
}
