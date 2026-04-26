import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useEffect, useMemo } from 'react';
import { Platform } from 'react-native';

import { exchangeGoogleIdToken } from '../services/socialAuthService';
import type { AuthResponse } from '../services/authService';

WebBrowser.maybeCompleteAuthSession();

const PLACEHOLDER_CLIENT_ID = '000000000000-placeholder.apps.googleusercontent.com';

/** Expo Go no incluye RNGoogleSignin: no se debe ejecutar `require` del paquete nunca ahí. */
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

function looksLikeClientId(v: string): boolean {
  if (!v) return false;
  if (v.includes('tu_google_')) return false;
  if (v === PLACEHOLDER_CLIENT_ID) return false;
  return /\.apps\.googleusercontent\.com$/i.test(v);
}

/** Forma mínima del módulo (sin `import('@react-native-google-signin/...')` en tipos: Metro no debe precargarlo). */
type NativeGoogleSignInModule = {
  GoogleSignin: {
    configure: (options: {
      webClientId?: string;
      iosClientId?: string;
      offlineAccess?: boolean;
      scopes?: string[];
    }) => void;
    hasPlayServices: (options: { showPlayServicesUpdateDialog: boolean }) => Promise<boolean>;
    signIn: () => Promise<{ idToken: string | null }>;
    getTokens: () => Promise<{ idToken: string }>;
  };
  statusCodes: Readonly<{
    SIGN_IN_CANCELLED: string;
    IN_PROGRESS: string;
  }>;
};

let nativeGoogleSignInModule: NativeGoogleSignInModule | null | undefined;

function getNativeGoogleSignIn(): NativeGoogleSignInModule | null {
  if (nativeGoogleSignInModule !== undefined) {
    return nativeGoogleSignInModule;
  }
  if (Platform.OS === 'web' || isExpoGo) {
    nativeGoogleSignInModule = null;
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    nativeGoogleSignInModule = require('@react-native-google-signin/google-signin') as NativeGoogleSignInModule;
  } catch {
    nativeGoogleSignInModule = null;
  }
  return nativeGoogleSignInModule;
}

export function useGoogleIdTokenLogin() {
  const useNativeAccountPicker = useMemo(
    () => Platform.OS !== 'web' && !isExpoGo && getNativeGoogleSignIn() !== null,
    []
  );

  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() ?? '';
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim() ?? '';
  const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID?.trim() ?? '';
  const webOk = looksLikeClientId(webClientId);
  const iosOk = looksLikeClientId(iosClientId);
  const androidOk = looksLikeClientId(androidClientId);

  const config = useMemo(() => {
    const web = webClientId || PLACEHOLDER_CLIENT_ID;
    const ios = iosClientId || '';
    const android = androidClientId || '';

    return {
      webClientId: web,
      iosClientId: Platform.OS === 'ios' ? ios || web : undefined,
      androidClientId: Platform.OS === 'android' ? android || web : undefined,
    };
  }, [webClientId, iosClientId, androidClientId]);

  const [request, , promptAsync] = Google.useIdTokenAuthRequest(config);

  useEffect(() => {
    const mod = getNativeGoogleSignIn();
    if (!useNativeAccountPicker || !mod || !webOk) return;
    mod.GoogleSignin.configure({
      webClientId,
      ...(Platform.OS === 'ios' && iosOk && iosClientId ? { iosClientId } : {}),
      offlineAccess: false,
      scopes: ['profile', 'email'],
    });
  }, [useNativeAccountPicker, webOk, webClientId, iosClientId, iosOk]);

  const configured = useMemo(() => {
    if (Platform.OS === 'web') return webOk;
    if (!useNativeAccountPicker) return webOk;
    if (Platform.OS === 'android') return androidOk && webOk;
    if (Platform.OS === 'ios') return iosOk && webOk;
    return webOk;
  }, [webOk, androidOk, iosOk, useNativeAccountPicker]);

  const configError = useMemo(() => {
    if (configured) return null;
    if (Platform.OS === 'web' || !useNativeAccountPicker) {
      return !webOk
        ? 'Falta EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID válido (cliente OAuth tipo Web; no uses el texto placeholder del .env).'
        : null;
    }
    if (Platform.OS === 'android') {
      if (!androidOk) {
        return 'Falta EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID válido para esta APK (mismo proyecto que el cliente Web + SHA-1 de firma en Google Cloud).';
      }
      if (!webOk) return 'Falta EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID válido.';
      return null;
    }
    if (Platform.OS === 'ios') {
      if (!iosOk) return 'Falta EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID válido para esta build de iOS.';
      if (!webOk) return 'Falta EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID válido.';
      return null;
    }
    return !webOk ? 'Falta EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID válido.' : null;
  }, [configured, useNativeAccountPicker, webOk, androidOk, iosOk]);

  const getIdTokenWithNativePicker = async (): Promise<string> => {
    const mod = getNativeGoogleSignIn();
    if (!mod) {
      throw new Error('Google Sign-In nativo no está disponible en este cliente.');
    }
    const { GoogleSignin, statusCodes } = mod;
    if (Platform.OS === 'android') {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    }
    try {
      const user = await GoogleSignin.signIn();
      let idToken = user.idToken;
      if (!idToken) {
        const tokens = await GoogleSignin.getTokens();
        idToken = tokens.idToken;
      }
      if (!idToken) {
        throw new Error(
          'Google no devolvió id_token. Revisá EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID (cliente OAuth tipo Web) y, en Android, el SHA-1 de la firma en Google Cloud Console.'
        );
      }
      return idToken;
    } catch (e: unknown) {
      const code =
        typeof e === 'object' && e !== null && 'code' in e
          ? String((e as { code: unknown }).code)
          : '';
      if (code === statusCodes.SIGN_IN_CANCELLED) {
        throw new Error('CANCELLED');
      }
      if (code === statusCodes.IN_PROGRESS) {
        throw new Error('El inicio de sesión con Google ya está en curso. Probá de nuevo.');
      }
      if (e instanceof Error) throw e;
      throw new Error('No se pudo completar el inicio de sesión con Google.');
    }
  };

  const getIdTokenWithBrowser = async (): Promise<string> => {
    const result = await promptAsync();
    if (result.type === 'cancel' || result.type === 'dismiss') {
      throw new Error('CANCELLED');
    }
    if (result.type !== 'success') {
      throw new Error('No se pudo completar el inicio de sesión con Google.');
    }
    const idToken = result.params?.id_token;
    if (typeof idToken !== 'string' || !idToken) {
      throw new Error(
        'Google no devolvió el token de identidad. Revisá los Client ID en Google Cloud Console.'
      );
    }
    return idToken;
  };

  const getIdToken = async (): Promise<string> => {
    if (!configured) {
      throw new Error('MISSING_GOOGLE_CONFIG');
    }
    if (useNativeAccountPicker) {
      return getIdTokenWithNativePicker();
    }
    return getIdTokenWithBrowser();
  };

  const signIn = async (userType?: 'client' | 'professional'): Promise<AuthResponse> => {
    const idToken = await getIdToken();
    return exchangeGoogleIdToken(idToken, userType);
  };

  const ready = useNativeAccountPicker ? configured : Boolean(request);

  return {
    signIn,
    getIdToken,
    ready,
    configured,
    configError,
    usesNativeAccountPicker: useNativeAccountPicker,
  };
}
