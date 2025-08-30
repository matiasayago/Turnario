import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { NotificationProvider } from '../contexts/NotificationContext';
import { AppointmentProvider } from '../contexts/AppointmentContext';
import { NotificationSettingsProvider } from '../contexts/NotificationSettingsContext';
import { ReviewProvider } from '../contexts/ReviewContext';
import { NewAppointmentProvider } from '../contexts/NewAppointmentContext';
import { ReservaConSenaProvider } from '../contexts/ReservaConSenaContext';

function RootLayoutContent() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  if (!loaded) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <AppointmentProvider>
          <NotificationSettingsProvider>
            <ReviewProvider>
                          <NewAppointmentProvider>
              <ReservaConSenaProvider>
                <RootLayoutContent />
              </ReservaConSenaProvider>
            </NewAppointmentProvider>
            </ReviewProvider>
          </NotificationSettingsProvider>
        </AppointmentProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}
