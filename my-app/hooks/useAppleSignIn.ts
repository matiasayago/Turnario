import * as AppleAuthentication from 'expo-apple-authentication';
import type { AuthResponse } from '../services/authService';
import { exchangeAppleSignIn } from '../services/socialAuthService';

/**
 * Sign in with Apple (cuenta del dispositivo / iCloud). Solo disponible donde lo soporte el SO.
 */
export function useAppleSignIn() {
  const signIn = async (): Promise<AuthResponse> => {
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
    const appleUserId = credential.user;
    const email = credential.email ?? null;
    let fullName: string | null = null;
    if (credential.fullName) {
      const g = credential.fullName.givenName || '';
      const f = credential.fullName.familyName || '';
      fullName = `${g} ${f}`.trim() || null;
    }
    return exchangeAppleSignIn({ appleUserId, email, fullName });
  };

  return { signIn };
}
