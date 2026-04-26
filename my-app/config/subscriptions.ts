import Constants from 'expo-constants';

const DEFAULT_SKU = 'turnario_pro_monthly';

/** SKU de suscripción en Google Play Console (Monetización → Suscripciones). */
export function getGooglePlaySubscriptionSkus(): string[] {
  const extra = Constants.expoConfig?.extra as Record<string, unknown> | undefined;
  const fromExtra = extra?.googlePlaySubscriptionSku;
  if (typeof fromExtra === 'string' && fromExtra.trim()) {
    return [fromExtra.trim()];
  }
  const env = process.env.EXPO_PUBLIC_GOOGLE_PLAY_SUBSCRIPTION_SKU;
  if (typeof env === 'string' && env.trim()) {
    return env
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [DEFAULT_SKU];
}

export function getAndroidApplicationId(): string {
  return Constants.expoConfig?.android?.package || 'com.turnario.app';
}
