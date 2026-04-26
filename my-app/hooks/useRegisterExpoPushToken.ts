import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { getBackendBaseUrl } from '../config/backend';
import simpleAuthService from '../services/simpleAuthService';

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const FALLBACK_EAS_PROJECT_ID = 'fbdd4729-9a04-4c1c-97f1-bc09efddc59a';

async function waitForJwt(maxAttempts = 6): Promise<string | null> {
  for (let i = 0; i < maxAttempts; i++) {
    const jwt = await simpleAuthService.getToken();
    if (jwt) return jwt;
    await sleep(i === 0 ? 50 : 200 * i);
  }
  return null;
}

function resolveProjectId(): string {
  const c = Constants as {
    easConfig?: { projectId?: string };
    expoConfig?: { extra?: { eas?: { projectId?: string } } };
    manifest2?: { extra?: { expoClient?: { extra?: { eas?: { projectId?: string } } } } };
  };
  const fromExpoExtra = c.expoConfig?.extra?.eas?.projectId;
  const fromEasConfig = c.easConfig?.projectId;
  const fromManifest2 = c.manifest2?.extra?.expoClient?.extra?.eas?.projectId;
  const fromEnv = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  return String(fromExpoExtra || fromEasConfig || fromManifest2 || fromEnv || FALLBACK_EAS_PROJECT_ID);
}

/**
 * Solicita permiso de notificaciones y envía el Expo Push Token al backend (recordatorios 24h, etc.).
 */
export function useRegisterExpoPushToken(userId: string | undefined) {
  const lastSentRef = useRef<string | null>(null);

  useEffect(() => {
    if (!userId) {
      lastSentRef.current = null;
      return;
    }

    let cancelled = false;

    const tryRegister = async () => {
      try {
        if (Platform.OS === 'web') return;
        if (!Device.isDevice) return;
        if (Constants.executionEnvironment === 'storeClient') {
          console.warn(
            '[Turnario push] executionEnvironment=storeClient; se intentará igualmente registrar token.'
          );
        }
        const Notifications = await import('expo-notifications');

        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
            shouldShowBanner: true,
            shouldShowList: true,
          }),
        });

        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'Turnario',
            importance: Notifications.AndroidImportance.DEFAULT,
          });
        }

        const { status: existing } = await Notifications.getPermissionsAsync();
        let final = existing;
        if (existing !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          final = status;
        }
        if (final !== 'granted') {
          console.warn(
            '[Turnario push] Permiso de notificaciones denegado. Activá notificaciones para Turnario en Ajustes del sistema.'
          );
          return;
        }
        if (cancelled) return;

        const projectId = resolveProjectId();
        const tokenRes = await Notifications.getExpoPushTokenAsync(
          projectId ? { projectId: String(projectId) } : undefined
        );
        const expoPushToken = tokenRes.data;
        if (!expoPushToken || cancelled) return;
        if (lastSentRef.current === expoPushToken) return;

        const jwt = await waitForJwt();
        if (!jwt || cancelled) {
          console.warn(
            '[Turnario push] No hay token de sesión; no se puede registrar el push token. Cerrá sesión y volvé a entrar.'
          );
          return;
        }

        const url = `${getBackendBaseUrl()}/api/users/push-token`;
        let res: Response | null = null;
        for (let i = 0; i < 3; i++) {
          res = await fetch(url, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${jwt}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ expoPushToken }),
          }).catch(() => null);
          if (res && res.ok) break;
          await sleep(300 * (i + 1));
        }
        if (!res) {
          console.warn('[Turnario push] No se pudo contactar al backend para registrar token');
          return;
        }
        if (res.ok) {
          lastSentRef.current = expoPushToken;
          console.log('[Turnario push] Token enviado al backend correctamente');
        } else {
          const hint = await res.text().catch(() => '');
          console.warn(
            '[Turnario push] El servidor rechazó el token',
            res.status,
            hint?.slice(0, 200),
            'URL:',
            url
          );
        }
      } catch (e) {
        console.warn(
          '[Turnario push] Error al registrar:',
          e instanceof Error ? e.message : e,
          'backend:',
          getBackendBaseUrl()
        );
      }
    };

    void tryRegister();

    const onAppState = (next: AppStateStatus) => {
      if (next === 'active') void tryRegister();
    };
    const sub = AppState.addEventListener('change', onAppState);

    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [userId]);
}
