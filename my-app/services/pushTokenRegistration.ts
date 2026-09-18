import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { getBackendBaseUrl } from '../config/backend';
import simpleAuthService from './simpleAuthService';

const FALLBACK_EAS_PROJECT_ID = 'fbdd4729-9a04-4c1c-97f1-bc09efddc59a';
let lastSentToken: string | null = null;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function reportPushDebug(event: string, details: string, userId?: string): Promise<void> {
  try {
    await fetch(`${getBackendBaseUrl()}/api/v1/push-debug`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event,
        userId: userId || '',
        details,
        executionEnvironment: String(Constants.executionEnvironment || ''),
      }),
    });
  } catch {
    // no-op: endpoint es solo diagnóstico
  }
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

async function waitForJwt(maxAttempts = 6): Promise<string | null> {
  for (let i = 0; i < maxAttempts; i++) {
    const jwt = await simpleAuthService.getToken();
    if (jwt) return jwt;
    await sleep(i === 0 ? 50 : 200 * i);
  }
  return null;
}

export async function registerExpoPushTokenNow(): Promise<boolean> {
  const currentUser = await simpleAuthService.getUser().catch(() => null);
  const currentUserId = String(currentUser?._id || currentUser?.id || '');
  try {
    if (Platform.OS === 'web') return false;
    if (!Device.isDevice) return false;
    if (Constants.executionEnvironment === 'storeClient') {
      console.warn(
        '[Turnario push] executionEnvironment=storeClient; se intentará igualmente registrar token.'
      );
      void reportPushDebug('store_client', 'executionEnvironment=storeClient', currentUserId);
    }

    const Notifications = await import('expo-notifications');

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Turnario',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#667eea',
      });
    }

    const { status: existing } = await Notifications.getPermissionsAsync();
    let final = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      final = status;
    }
    if (final !== 'granted') {
      console.warn('[Turnario push] Permiso denegado al registrar desde AuthContext');
      void reportPushDebug('permission_denied', `status=${final}`, currentUserId);
      return false;
    }

    const projectId = resolveProjectId();
    const tokenRes = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId: String(projectId) } : undefined
    );
    const expoPushToken = tokenRes.data;
    if (!expoPushToken) {
      void reportPushDebug('token_empty', `projectId=${projectId}`, currentUserId);
      return false;
    }
    if (lastSentToken === expoPushToken) return true;

    const jwt = await waitForJwt();
    if (!jwt) {
      console.warn('[Turnario push] JWT no disponible para registrar token');
      void reportPushDebug('jwt_missing', 'no_jwt_available', currentUserId);
      return false;
    }

    const url = `${getBackendBaseUrl()}/api/users/push-token`;
    for (let i = 0; i < 3; i++) {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${jwt}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ expoPushToken }),
      }).catch(() => null);

      if (res?.ok) {
        lastSentToken = expoPushToken;
        console.log('[Turnario push] Token registrado desde AuthContext');
        void reportPushDebug('registered_ok', `tokenPrefix=${expoPushToken.slice(0, 20)}`, currentUserId);
        return true;
      }
      if (res) {
        const responseText = await res.text().catch(() => '');
        void reportPushDebug(
          'register_rejected',
          `status=${res.status} body=${responseText.slice(0, 200)}`,
          currentUserId
        );
      }
      await sleep(300 * (i + 1));
    }

    console.warn('[Turnario push] No se pudo registrar token desde AuthContext');
    void reportPushDebug('register_failed', 'fetch_failed_or_non_ok', currentUserId);
    return false;
  } catch (e) {
    console.warn('[Turnario push] Error registrando token desde AuthContext:', e);
    void reportPushDebug(
      'register_exception',
      e instanceof Error ? e.message : String(e),
      currentUserId
    );
    return false;
  }
}

