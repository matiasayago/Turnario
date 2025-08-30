import { Alert } from 'react-native';

import { BACKEND_CONFIG } from '../config/backend';

// Configuración de la API
const API_BASE_URL = BACKEND_CONFIG.BASE_URL + '/api';

// Tipos de respuesta de la API
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

// Clase base para manejar errores de la API
class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public response?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Función para hacer peticiones HTTP
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    // Agregar timeout a la petición
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), BACKEND_CONFIG.API.TIMEOUT);
    
    const requestOptions = {
      ...defaultOptions,
      signal: controller.signal
    };

    console.log(`🌐 API Request: ${options.method || 'GET'} ${url}`);
    
    const response = await fetch(url, requestOptions);
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      let errorMessage = `Error ${response.status}: ${response.statusText}`;
      
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch {
        // Si no se puede parsear el error, usar el mensaje por defecto
      }
      
      // Manejar errores de autenticación
      if (response.status === 401) {
        throw new ApiError('Sesión expirada. Por favor, inicia sesión nuevamente.', 401);
      }
      
      if (response.status === 403) {
        throw new ApiError('No tienes permisos para realizar esta acción.', 403);
      }
      
      throw new ApiError(errorMessage, response.status, response);
    }

    const data = await response.json();
    console.log(`✅ API Response: ${endpoint}`, data);
    
    return data;
  } catch (error) {
    console.error(`❌ API Error: ${endpoint}`, error);
    
    if (error instanceof ApiError) {
      throw error;
    }
    
    // Error de timeout
    if (error.name === 'AbortError') {
      throw new ApiError(
        'La petición tardó demasiado. Verifica tu conexión a internet.',
        0
      );
    }
    
    // Error de red o conexión
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new ApiError(
        'Error de conexión. Verifica que el servidor esté ejecutándose.',
        0
      );
    }
    
    throw new ApiError(
      error instanceof Error ? error.message : 'Error desconocido',
      0
    );
  }
}

// Funciones helper para diferentes tipos de peticiones
export const api = {
  get: <T>(endpoint: string, headers?: Record<string, string>): Promise<T> => 
    apiRequest<T>(endpoint, { 
      method: 'GET',
      headers: headers ? { ...headers } : undefined
    }),
    
  post: <T>(endpoint: string, data?: any, headers?: Record<string, string>): Promise<T> => 
    apiRequest<T>(endpoint, { 
      method: 'POST', 
      body: data ? JSON.stringify(data) : undefined,
      headers: headers ? { ...headers } : undefined
    }),
    
  put: <T>(endpoint: string, data?: any, headers?: Record<string, string>): Promise<T> => 
    apiRequest<T>(endpoint, { 
      method: 'PUT', 
      body: data ? JSON.stringify(data) : undefined,
      headers: headers ? { ...headers } : undefined
    }),
    
  delete: <T>(endpoint: string, headers?: Record<string, string>): Promise<T> => 
    apiRequest<T>(endpoint, { 
      method: 'DELETE',
      headers: headers ? { ...headers } : undefined
    }),
    
  patch: <T>(endpoint: string, data?: any, headers?: Record<string, string>): Promise<T> => 
    apiRequest<T>(endpoint, { 
      method: 'PATCH', 
      body: data ? JSON.stringify(data) : undefined,
      headers: headers ? { ...headers } : undefined
    }),
};

// Función para crear headers de autorización
export const createAuthHeaders = (token: string): Record<string, string> => ({
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
});

// Función para manejar reintentos automáticos
export const apiWithRetry = async <T>(
  apiCall: () => Promise<T>,
  maxRetries: number = BACKEND_CONFIG.API.RETRY_ATTEMPTS
): Promise<T> => {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      lastError = error as Error;
      
      // No reintentar en errores de autenticación o permisos
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        throw error;
      }
      
      if (attempt < maxRetries) {
        console.log(`🔄 Reintento ${attempt}/${maxRetries} después de error:`, error);
        await new Promise(resolve => setTimeout(resolve, BACKEND_CONFIG.API.RETRY_DELAY * attempt));
      }
    }
  }
  
  throw lastError!;
};

// Función para mostrar errores de API de forma amigable
export function showApiError(error: any, title: string = 'Error') {
  let message = 'Ha ocurrido un error inesperado.';
  
  if (error instanceof ApiError) {
    message = error.message;
  } else if (error?.message) {
    message = error.message;
  }
  
  Alert.alert(title, message, [{ text: 'OK' }]);
}

export { ApiError };
export default api;

