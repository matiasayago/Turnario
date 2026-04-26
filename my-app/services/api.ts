// @ts-nocheck ? beta
import { Alert } from 'react-native';

import { BACKEND_CONFIG } from '../config/backend';

// Configuraci�n de la API
const getApiBaseUrl = (): string => BACKEND_CONFIG.BASE_URL;

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

// Funci�n para hacer peticiones HTTP
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  try {
    const apiBaseUrl = getApiBaseUrl();
    const url = `${apiBaseUrl}${endpoint}`;
    
    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    // Agregar timeout a la petici�n
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), BACKEND_CONFIG.API.TIMEOUT);
    
    const requestOptions = {
      ...defaultOptions,
      signal: controller.signal
    };

    console.log(`?? API Request: ${options.method || 'GET'} ${url}`);
    console.log(`?? Debug - API_BASE_URL: ${apiBaseUrl}`);
    console.log(`?? Debug - endpoint: ${endpoint}`);
    
    const response = await fetch(url, requestOptions);
    
    clearTimeout(timeoutId);
    
    console.log(`?? Response received:`, {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      url: response.url
    });
    
    if (!response.ok) {
      let errorMessage = `Error ${response.status}: ${response.statusText}`;
      
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        // Si no se puede parsear el error, usar el mensaje por defecto
      }
      
      // Manejar errores de autenticaci�n
      if (response.status === 401) {
        throw new ApiError('Sesi�n expirada. Por favor, inicia sesi�n nuevamente.', 401);
      }
      
      if (response.status === 403) {
        throw new ApiError('No tienes permisos para realizar esta acci�n.', 403);
      }

      if (response.status === 429) {
        throw new ApiError(
          typeof errorMessage === 'string' && errorMessage.startsWith('Error 429')
            ? 'Demasiadas peticiones al servidor. Esper? unos minutos e intent? de nuevo.'
            : errorMessage,
          429,
          response
        );
      }
      
      throw new ApiError(errorMessage, response.status, response);
    }

    const data = await response.json();
    console.log(`? API Response: ${endpoint}`, data);
    
    return data;
  } catch (error) {
    console.error(`? API Error: ${endpoint}`, error);
    
    if (error instanceof ApiError) {
      throw error;
    }
    
    // Error de timeout
    if (error.name === 'AbortError') {
      throw new ApiError(
        'La petici�n tard� demasiado. Verifica tu conexi�n a internet.',
        0
      );
    }
    
    // Error de red o conexi�n
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new ApiError(
        'Error de conexi�n. Verifica que el servidor est� ejecut�ndose.',
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
    })
};

// Funci�n para crear headers de autorizaci�n
export const createAuthHeaders = (token: string): Record<string, string> => ({
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
});

// Funci�n para manejar reintentos autom�ticos
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
      
      // No reintentar en errores de autenticaci�n o permisos
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        throw error;
      }
      
      if (attempt < maxRetries) {
        console.log(`?? Reintento ${attempt}/${maxRetries} despu�s de error:`, error);
        await new Promise(resolve => setTimeout(resolve, BACKEND_CONFIG.API.RETRY_DELAY * attempt));
      }
    }
  }
  
  throw lastError!;
};

// Funci�n para mostrar errores de API de forma amigable
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

