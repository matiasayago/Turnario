import * as AppleAuthentication from 'expo-apple-authentication';
import type { AuthResponse } from '../services/authService';
import {
  checkAppleAccountExists,
  exchangeAppleSignIn,
} from '../services/socialAuthService';

export type AppleSignInCredential = {
  identityToken: string;
  appleUserId: string;
  email: string | null;
  fullName: string | null;
};

/**
 * Sign in with Apple (cuenta del dispositivo / iCloud). Solo disponible donde lo soporte el SO.
 */
export function useAppleSignIn() {
  const getCredential = async (): Promise<AppleSignInCredential> => {
    const available = await AppleAuthentication.isAvailableAsync();
    if (!available) {
      throw new Error('Sign in with Apple no está disponible en este dispositivo.');
    }
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
    const identityToken = String(credential.identityToken || '').trim();
    if (!identityToken) {
      throw new Error(
        'Apple no devolvió un token válido. Probá de nuevo o revisá Sign in with Apple en Ajustes.'
      );
    }
    const appleUserId = String(credential.user || '').trim();
    const email = credential.email ?? null;
    let fullName: string | null = null;
    if (credential.fullName) {
      const g = credential.fullName.givenName || '';
      const f = credential.fullName.familyName || '';
      fullName = `${g} ${f}`.trim() || null;
    }
    return { identityToken, appleUserId, email, fullName };
  };

  const signIn = async (
    userType?: 'client' | 'professional'
  ): Promise<AuthResponse> => {
    const cred = await getCredential();
    return exchangeAppleSignIn({
      identityToken: cred.identityToken,
      appleUserId: cred.appleUserId,
      email: cred.email,
      fullName: cred.fullName,
      userType,
    });
  };

  return { signIn, getCredential, checkAppleAccountExists };
}
