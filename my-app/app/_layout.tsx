import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import * as SystemUI from 'expo-system-ui';
import React, { useEffect } from 'react';
import { Platform, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import { Providers } from '../contexts/Providers';
import { useAuth } from '../contexts/AuthContext';

/** Fondo detrás de la barra de estado (Android edge-to-edge + contraste con iconos oscuros). */
const STATUS_BAR_SCRIM = '#E4E6ED';

/** Abre pantalla de nueva contraseña al tocar el push de recuperación (datos desde Expo). */
function PasswordResetPushBridge() {
  useEffect(() => {
    const go = (data: Record<string, unknown> | undefined) => {
      if (!data || typeof data !== 'object') return;
      const type = String(data.type || '');
      const token = String(data.passwordResetToken || '').trim();
      if (type === 'password_reset' && token) {
        router.push({
          pathname: '/reset-password' as never,
          params: { token },
        });
      }
    };

    let sub: Notifications.EventSubscription | undefined;
    (async () => {
      try {
        const last = await Notifications.getLastNotificationResponseAsync();
        const payload = last?.notification?.request?.content?.data as
          | Record<string, unknown>
          | undefined;
        go(payload);
      } catch {
        // no-op
      }
    })();

    try {
      sub = Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data as Record<string, unknown> | undefined;
        go(data);
      });
    } catch {
      // no-op
    }

    return () => {
      sub?.remove();
    };
  }, []);

  return null;
}

function RootLayoutContent() {
  const { markUserActivity } = useAuth();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(STATUS_BAR_SCRIM).catch(() => {});
  }, []);

  if (!loaded) {
    return null;
  }

  return (
    <View style={{ flex: 1, backgroundColor: STATUS_BAR_SCRIM }} onTouchStart={markUserActivity}>
      <SafeAreaView
        style={{ flex: 1, backgroundColor: '#ffffff' }}
        edges={['top', 'left', 'right']}
      >
        <ThemeProvider value={DefaultTheme}>
          <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen name="login-simple" options={{ headerShown: false }} />
            <Stack.Screen name="register" options={{ headerShown: false }} />
            <Stack.Screen name="reset-password" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="medical-history" options={{ headerShown: false }} />
            <Stack.Screen name="availability-settings" options={{ headerShown: false }} />
            <Stack.Screen name="user-profile" options={{ headerShown: false }} />
            <Stack.Screen name="calendar" options={{ headerShown: false }} />
            <Stack.Screen name="date-schedule-test" options={{ headerShown: false }} />
            <Stack.Screen name="payment-result" options={{ headerShown: false, title: 'Pago' }} />
            <Stack.Screen name="subscribe" options={{ title: 'Turnario Pro', headerShown: true }} />
            <Stack.Screen name="+not-found" />
          </Stack>
          <StatusBar
            style="dark"
            {...(Platform.OS === 'android'
              ? { backgroundColor: STATUS_BAR_SCRIM, translucent: false }
              : {})}
          />
        </ThemeProvider>
      </SafeAreaView>
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <PasswordResetPushBridge />
      <Providers>
        <RootLayoutContent />
      </Providers>
    </SafeAreaProvider>
  );
}