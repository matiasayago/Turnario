import React from 'react';
import './src/web-polyfills';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { UnifiedAppointmentProvider } from './src/context/UnifiedAppointmentContext';
import { AppNavigator } from './src/navigation/AppNavigator';

export default function App() {
  return (
      <SafeAreaProvider>
        <AuthProvider>
          <UnifiedAppointmentProvider>
            <StatusBar style="auto" />
            <AppNavigator />
          </UnifiedAppointmentProvider>
        </AuthProvider>
      </SafeAreaProvider>
  );
}
