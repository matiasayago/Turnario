import Constants from 'expo-constants';
import { Platform } from 'react-native';

const DEFAULT_BACKEND_PORT = '3001';

/** Host de la PC donde corre Metro (misma IP que el QR de Expo), sin puerto. */
function getExpoDevMachineHost(): string | null {
  try {
    const debuggerHost =
      Constants.expoGoConfig?.debuggerHost ??
      (Constants as { manifest2?: { extra?: { expoGo?: { debuggerHost?: string } } } }).manifest2
        ?.extra?.expoGo?.debuggerHost ??
      (Constants as { manifest?: { debuggerHost?: string } }).manifest?.debuggerHost ??
      (Constants as { expoConfig?: { hostUri?: string } }).expoConfig?.hostUri ??
      (Constants as { manifest2?: { extra?: { expoClient?: { hostUri?: string } } } }).manifest2
        ?.extra?.expoClient?.hostUri ??
      (Constants as { linkingUri?: string }).linkingUri;

    // Soporta formatos: "192.168.1.10:8081", "exp://192.168.1.10:8081", "http://192.168.1.10:8081"
    const normalized = debuggerHost
      ?.replace(/^exp:\/\//i, '')
      ?.replace(/^https?:\/\//i, '')
      ?.replace(/\/.*$/, '')
      ?.trim();
    const host = normalized?.split(':')[0]?.trim();
    if (!host || host === 'localhost' || host === '127.0.0.1') {
      return null;
    }
    return host;
  } catch {
    return null;
  }
}

function isLocalhostBackendUrl(url: string): boolean {
  const u = url.replace(/\/$/, '').toLowerCase();
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/.test(u);
}

function replaceLocalhostHostWithLan(baseUrl: string, lanHost: string): string {
  const u = baseUrl.replace(/\/$/, '');
  const portMatch = u.match(/:(\d+)$/);
  const port = portMatch ? portMatch[1] : DEFAULT_BACKEND_PORT;
  return `http://${lanHost}:${port}`;
}

function readBackendUrlFromExtraObject(extra: unknown): string | null {
  if (!extra || typeof extra !== 'object') return null;
  const rec = extra as Record<string, unknown>;
  const raw = rec.backendBaseUrl ?? rec.EXPO_PUBLIC_BACKEND_URL;
  const u = typeof raw === 'string' ? raw.trim() : '';
  return u ? u.replace(/\/$/, '') : null;
}

/**
 * `extra` de app.json en APK a veces llega por `expoConfig`, otras por `manifest` / manifest2.
 */
function getBackendBaseUrlFromExpoExtra(): string | null {
  try {
    const fromExpoConfig = readBackendUrlFromExtraObject(Constants.expoConfig?.extra);
    if (fromExpoConfig) return fromExpoConfig;

    const manifest = Constants.manifest as { extra?: unknown } | null;
    const fromManifest = readBackendUrlFromExtraObject(manifest?.extra);
    if (fromManifest) return fromManifest;

    const m2 = Constants.manifest2 as
      | { extra?: { expoClient?: { extra?: unknown } } }
      | null;
    return readBackendUrlFromExtraObject(m2?.extra?.expoClient?.extra);
  } catch {
    return null;
  }
}

function isReleaseBuild(): boolean {
  return typeof __DEV__ === 'undefined' || __DEV__ === false;
}

/** En APK, localhost en variables de entorno del build no sirve; preferí extra o LAN. */
function isUsableEnvBackendUrl(url: string): boolean {
  if (!isReleaseBuild()) return true;
  return !isLocalhostBackendUrl(url.replace(/\/$/, ''));
}

/**
 * URL base del API (sin /api/v1).
 * Prioridad: EXPO_PUBLIC_BACKEND_URL (build) → extra.backendBaseUrl en app.json (APK/release) → host Metro en __DEV__ → emulador → localhost.
 */
export function getBackendBaseUrl(): string {
  const fromEnvRaw = process.env.EXPO_PUBLIC_BACKEND_URL?.trim();
  const expoLan = getExpoDevMachineHost();

  if (fromEnvRaw && isUsableEnvBackendUrl(fromEnvRaw)) {
    let normalized = fromEnvRaw.replace(/\/$/, '');
    if (/\/api\/v1$/i.test(normalized)) {
      normalized = normalized.replace(/\/api\/v1$/i, '');
    }
    if (
      typeof __DEV__ !== 'undefined' &&
      __DEV__ &&
      expoLan &&
      isLocalhostBackendUrl(normalized)
    ) {
      return replaceLocalhostHostWithLan(normalized, expoLan);
    }
    return normalized;
  }

  /** Si solo definís EXPO_PUBLIC_API_URL (p. ej. http://IP:3001/api/v1), el resto del app debe usar el mismo host. */
  const apiOnlyRaw = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (apiOnlyRaw) {
    const u = apiOnlyRaw.replace(/\/$/, '');
    let base = u.endsWith('/api/v1') ? u.slice(0, -'/api/v1'.length) : u;
    if (!isUsableEnvBackendUrl(base)) {
      base = '';
    }
    if (base) {
      if (typeof __DEV__ !== 'undefined' && __DEV__ && expoLan && isLocalhostBackendUrl(base)) {
        base = replaceLocalhostHostWithLan(base, expoLan);
      }
      return base;
    }
  }

  const fromAppJsonExtra = getBackendBaseUrlFromExpoExtra();
  if (fromAppJsonExtra) {
    if (
      typeof __DEV__ !== 'undefined' &&
      __DEV__ &&
      expoLan &&
      isLocalhostBackendUrl(fromAppJsonExtra)
    ) {
      return replaceLocalhostHostWithLan(fromAppJsonExtra, expoLan);
    }
    return fromAppJsonExtra;
  }

  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    if (expoLan) {
      return `http://${expoLan}:${DEFAULT_BACKEND_PORT}`;
    }
    // Emulador Android (no dispositivo físico): 10.0.2.2 = máquina host
    if (Platform.OS === 'android' && Constants.isDevice === false) {
      return `http://10.0.2.2:${DEFAULT_BACKEND_PORT}`;
    }
  }

  return `http://localhost:${DEFAULT_BACKEND_PORT}`;
}

/**
 * Base de la API v1 (sin barra final).
 * Si EXPO_PUBLIC_API_URL es solo el host (p. ej. http://192.168.1.5:3001), se agrega /api/v1;
 * si ya termina en /api/v1, se deja igual. Así pagos, horarios y disponibilidad no pegan a rutas inexistentes (404).
 */
export function getBackendApiV1Url(): string {
  const override = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (override) {
    const u = override.replace(/\/$/, '');
    let baseFromOverride = /\/api\/v1$/i.test(u) ? u.slice(0, -'/api/v1'.length) : u;
    baseFromOverride = baseFromOverride.replace(/\/$/, '');
    if (isUsableEnvBackendUrl(baseFromOverride)) {
      if (/\/api\/v1$/i.test(u)) {
        return u;
      }
      return `${u}/api/v1`;
    }
  }
  return `${getBackendBaseUrl()}/api/v1`;
}

/**
 * Mensaje cuando fetch al backend falla por red (no respuesta HTTP).
 * Incluye la URL para depuración y la pista de localhost en móvil/Expo Go.
 */
export function formatBackendConnectionError(requestUrl: string, cause: string): string {
  const base = getBackendBaseUrl();
  const localhostHint =
    /localhost|127\.0\.0\.1/i.test(base)
      ? '\n\nSi usás Expo Go o un teléfono en la misma red Wi-Fi, en .env definí EXPO_PUBLIC_BACKEND_URL con la IP local de tu PC (ej. http://192.168.1.20:3001). localhost apunta al teléfono, no a tu computadora.'
      : '';
  return `No se pudo conectar con el servidor.\n\nURL: ${requestUrl}${localhostHint}\n\nComprobá que el backend esté en ejecución (puerto 3001) y que el firewall permita conexiones.\n\nDetalle: ${cause}`;
}

// Configuración del backend
export const BACKEND_CONFIG = {
  get BASE_URL() {
    return getBackendBaseUrl();
  },
  
  // Endpoints de la API
  ENDPOINTS: {
    AUTH: {
      LOGIN: '/api/v1/auth/login',
      REGISTER: '/api/v1/auth/register',
      LOGOUT: '/api/v1/auth/logout',
      REFRESH: '/api/v1/auth/refresh',
      VERIFY: '/api/v1/auth/verify',
    },
    USERS: {
      BASE: '/api/v1/users',
      PROFILE: '/api/v1/users/profile/me',
      UPDATE_PROFILE: '/api/v1/users/profile/me',
      CHANGE_PASSWORD: '/api/v1/users/change-password',
      STATS: '/api/v1/users/stats/overview',
    },
    APPOINTMENTS: {
      BASE: '/api/v1/appointments',
      AVAILABLE_SLOTS: '/api/v1/appointments/available-slots',
      CONFIRM: '/api/v1/appointments/:id/confirm',
      REJECT: '/api/v1/appointments/:id/reject',
      STATS: '/api/v1/appointments/stats/overview',
    },
    SERVICES: {
      BASE: '/api/v1/services',
      CATEGORIES: '/api/v1/services/categories/list',
      STATS: '/api/v1/services/stats/overview',
      SEARCH: '/api/v1/services/search/advanced',
      POPULAR: '/api/v1/services/popular',
    },
    CLINICS: {
      BASE: '/api/v1/clinics',
      TYPES: '/api/v1/clinics/types/list',
      SPECIALTIES: '/api/v1/clinics/specialties/list',
      STATS: '/api/v1/clinics/stats/overview',
      SEARCH: '/api/v1/clinics/search/advanced',
      NEARBY: '/api/v1/clinics/nearby',
    },
    NOTIFICATIONS: {
      BASE: '/api/v1/notifications',
      MARK_READ: '/api/v1/notifications/:id/mark-read',
      MARK_UNREAD: '/api/v1/notifications/:id/mark-unread',
      MARK_ALL_READ: '/api/v1/notifications/mark-all-read',
      UNREAD_COUNT: '/api/v1/notifications/unread-count',
      TYPES: '/api/v1/notifications/types/list',
      STATS: '/api/v1/notifications/stats/overview',
      BULK_SEND: '/api/v1/notifications/bulk-send',
      CLEAR_ALL: '/api/v1/notifications/clear-all',
    },
  },
  
  // Configuración de autenticación
  AUTH: {
    TOKEN_KEY: 'auth_token',
    USER_KEY: 'user_data',
    TOKEN_EXPIRY: 24 * 60 * 60 * 1000, // 24 horas en milisegundos
    REFRESH_THRESHOLD: 5 * 60 * 1000, // 5 minutos antes de expirar
  },
  
  // Configuración de la API
  API: {
    TIMEOUT: 30000, // 30 segundos
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000, // 1 segundo
  },
  
  // Configuración de paginación
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100,
  },
  
  // Configuración de caché
  CACHE: {
    ENABLED: true,
    TTL: 5 * 60 * 1000, // 5 minutos
    MAX_SIZE: 100, // máximo 100 items en caché
  },
  
  // Configuración de WebSocket (para futuras implementaciones)
  WEBSOCKET: {
    ENABLED: false,
    get URL() {
      return (
        process.env.EXPO_PUBLIC_WEBSOCKET_URL?.trim() ||
        getBackendBaseUrl().replace(/^http/, 'ws')
      );
    },
    RECONNECT_ATTEMPTS: 5,
    RECONNECT_DELAY: 1000,
  },
  
  // Configuración de notificaciones push (Expo Push Service)
  PUSH_NOTIFICATIONS: {
    ENABLED: true,
    VAPID_PUBLIC_KEY: process.env.EXPO_PUBLIC_VAPID_KEY,
  },
  
  // Configuración de MercadoPago (para futuras implementaciones)
  MERCADOPAGO: {
    ENABLED: false,
    PUBLIC_KEY: process.env.EXPO_PUBLIC_MERCADOPAGO_PUBLIC_KEY,
    SANDBOX: process.env.EXPO_PUBLIC_MERCADOPAGO_SANDBOX === 'true',
  },
};

// Función para construir URLs completas
export const buildApiUrl = (endpoint: string, params?: Record<string, string>): string => {
  let url = `${getBackendBaseUrl()}${endpoint}`;
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url = url.replace(`:${key}`, value);
    });
  }
  
  return url;
};

/** Resuelve foto/media relativa del backend a URL absoluta (o deja data:/http:/file:). */
export const resolveMediaUrl = (pathOrUrl?: string | null): string | null => {
  if (!pathOrUrl || typeof pathOrUrl !== 'string') return null;
  const trimmed = pathOrUrl.trim();
  if (!trimmed) return null;
  if (
    /^data:/i.test(trimmed) ||
    /^https?:\/\//i.test(trimmed) ||
    /^file:/i.test(trimmed)
  ) {
    return trimmed;
  }
  const base = getBackendBaseUrl().replace(/\/$/, '');
  return `${base}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
};

// Función para verificar si estamos en desarrollo
export const isDevelopment = (): boolean => {
  return __DEV__ || process.env.NODE_ENV === 'development';
};

// Función para verificar si estamos en producción
export const isProduction = (): boolean => {
  return !isDevelopment();
};

// Función para obtener la URL del backend según el entorno
export const getBackendUrl = (): string => {
  return getBackendBaseUrl();
};

export default BACKEND_CONFIG;
