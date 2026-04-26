/**
 * Extiende app.json y registra el plugin de Google Sign-In (URL scheme iOS)
 * cuando EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID está definido en el entorno de prebuild.
 *
 * Los plugins base se leen desde app.json: en la evaluación de app.config.js
 * `config.expo.plugins` puede venir vacío y no debemos perder expo-router, etc.
 */
const fs = require('fs');
const path = require('path');

function readAppJsonExpo() {
  const raw = fs.readFileSync(path.join(__dirname, 'app.json'), 'utf8');
  return JSON.parse(raw).expo ?? {};
}

module.exports = ({ config }) => {
  const staticExpo = readAppJsonExpo();
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim() ?? '';
  const iosLooksReal =
    /\.apps\.googleusercontent\.com$/i.test(iosClientId) && !/tu_google_/i.test(iosClientId);
  const iosUrlSchemeMatch = iosLooksReal
    ? /^([\w-]+)\.apps\.googleusercontent\.com$/i.exec(iosClientId)
    : null;
  const iosUrlScheme = iosUrlSchemeMatch
    ? `com.googleusercontent.apps.${iosUrlSchemeMatch[1]}`
    : null;

  const basePlugins = [...(staticExpo.plugins ?? [])];
  const plugins = iosUrlScheme
    ? [...basePlugins, ['@react-native-google-signin/google-signin', { iosUrlScheme }]]
    : basePlugins;

  const mergedExpo = {
    ...staticExpo,
    ...config.expo,
    plugins,
  };

  // Make backend URL available at runtime through Constants.expoConfig.extra
  // for APK/AAB builds where process.env may not be present as expected.
  const backendBaseUrl = process.env.EXPO_PUBLIC_BACKEND_URL?.trim();
  mergedExpo.extra = {
    ...(mergedExpo.extra || {}),
    ...(backendBaseUrl ? { backendBaseUrl } : {}),
  };

  /** Producción (EAS profile `production` o variable explícita): sin HTTP cleartext en Android. */
  const easProfile = process.env.EAS_BUILD_PROFILE || '';
  const prodLike =
    easProfile === 'production' ||
    String(process.env.EXPO_PUBLIC_APP_ENVIRONMENT || '').toLowerCase() ===
      'production';
  const androidCleartext = !prodLike;

  mergedExpo.android = {
    ...(mergedExpo.android || {}),
    usesCleartextTraffic: androidCleartext,
  };

  mergedExpo.plugins = (mergedExpo.plugins || []).map((p) => {
    if (Array.isArray(p) && p[0] === 'expo-build-properties' && p[1] && typeof p[1] === 'object') {
      return [
        'expo-build-properties',
        {
          ...p[1],
          android: {
            ...(p[1].android || {}),
            usesCleartextTraffic: androidCleartext,
          },
        },
      ];
    }
    return p;
  });

  // Sin EAS Update activo: evita peticiones a u.expo.dev (error "Failed to download remote update").
  // Cuando habilites OTA, poné "updates.enabled": true y ejecutá `eas update:configure`.
  if (mergedExpo.updates?.enabled !== true) {
    mergedExpo.updates = {
      enabled: false,
      checkAutomatically: 'NEVER',
    };
  }

  return {
    ...config,
    expo: mergedExpo,
  };
};
