import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/contexts/AuthContext';
import { SocketProvider } from './src/contexts/SocketContext';
import { GameSocketProvider } from './src/contexts/GameSocketContext';
import { AssetProvider } from './src/lib/assets/AssetProvider';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30000,
    },
  },
});

export default function App() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AssetProvider>
            <SocketProvider>
              <GameSocketProvider>
                <NavigationContainer>
                  <AppNavigator />
                </NavigationContainer>
              </GameSocketProvider>
            </SocketProvider>
          </AssetProvider>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}