// Configuración del backend
export const BACKEND_CONFIG = {
  // URL base del backend
  BASE_URL: process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3001',
  
  // Endpoints de la API
  ENDPOINTS: {
    AUTH: {
      LOGIN: '/api/auth/login',
      REGISTER: '/api/auth/register',
      LOGOUT: '/api/auth/logout',
      REFRESH: '/api/auth/refresh',
      VERIFY: '/api/auth/verify',
    },
    USERS: {
      BASE: '/api/users',
      PROFILE: '/api/users/profile/me',
      UPDATE_PROFILE: '/api/users/profile/me',
      CHANGE_PASSWORD: '/api/users/change-password',
      STATS: '/api/users/stats/overview',
    },
    APPOINTMENTS: {
      BASE: '/api/appointments',
      AVAILABLE_SLOTS: '/api/appointments/available-slots',
      CONFIRM: '/api/appointments/:id/confirm',
      REJECT: '/api/appointments/:id/reject',
      STATS: '/api/appointments/stats/overview',
    },
    SERVICES: {
      BASE: '/api/services',
      CATEGORIES: '/api/services/categories/list',
      STATS: '/api/services/stats/overview',
      SEARCH: '/api/services/search/advanced',
      POPULAR: '/api/services/popular',
    },
    CLINICS: {
      BASE: '/api/clinics',
      TYPES: '/api/clinics/types/list',
      SPECIALTIES: '/api/clinics/specialties/list',
      STATS: '/api/clinics/stats/overview',
      SEARCH: '/api/clinics/search/advanced',
      NEARBY: '/api/clinics/nearby',
    },
    NOTIFICATIONS: {
      BASE: '/api/notifications',
      MARK_READ: '/api/notifications/:id/mark-read',
      MARK_UNREAD: '/api/notifications/:id/mark-unread',
      MARK_ALL_READ: '/api/notifications/mark-all-read',
      UNREAD_COUNT: '/api/notifications/unread-count',
      TYPES: '/api/notifications/types/list',
      STATS: '/api/notifications/stats/overview',
      BULK_SEND: '/api/notifications/bulk-send',
      CLEAR_ALL: '/api/notifications/clear-all',
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
    URL: process.env.EXPO_PUBLIC_WEBSOCKET_URL || 'ws://localhost:3001',
    RECONNECT_ATTEMPTS: 5,
    RECONNECT_DELAY: 1000,
  },
  
  // Configuración de notificaciones push (para futuras implementaciones)
  PUSH_NOTIFICATIONS: {
    ENABLED: false,
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
  let url = `${BACKEND_CONFIG.BASE_URL}${endpoint}`;
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url = url.replace(`:${key}`, value);
    });
  }
  
  return url;
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
  if (isDevelopment()) {
    return BACKEND_CONFIG.BASE_URL;
  }
  
  // En producción, usar la URL configurada
  return process.env.EXPO_PUBLIC_BACKEND_URL || BACKEND_CONFIG.BASE_URL;
};

export default BACKEND_CONFIG;
