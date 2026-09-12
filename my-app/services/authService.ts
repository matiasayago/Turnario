import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, createAuthHeaders, showApiError } from './api';
import { BACKEND_CONFIG } from '../config/backend';

// Tipos para autenticación
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
  userType: 'client' | 'professional' | 'admin';
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
  expiresIn: number;
}

export interface UserAddress {
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
}

export interface UserEmergencyContact {
  name?: string;
  phone?: string;
  relationship?: string;
}

export type UserGender = 'male' | 'female' | 'other' | 'prefer_not_to_say';

/** Rubro / tipo de negocio (schema backend `businessInfo.businessType`). */
export type UserBusinessType =
  | 'medical'
  | 'beauty'
  | 'fitness'
  | 'education'
  | 'consulting'
  | 'repair'
  | 'cleaning'
  | 'transport'
  | 'food'
  | 'retail'
  | 'other';

export interface UserEducationEntry {
  degree?: string;
  institution?: string;
  year?: number;
}

export interface UserCertificationEntry {
  name?: string;
  issuer?: string;
  issueDate?: string;
  expiryDate?: string;
}

export interface UserLanguageEntry {
  language: string;
  level?: 'basic' | 'intermediate' | 'advanced' | 'native';
}

/** Información profesional extendida (Mongo `businessInfo`). */
export interface UserBusinessInfo {
  businessName?: string;
  businessType?: UserBusinessType;
  businessCategory?: string;
  license?: string;
  specialties?: string[];
  experience?: number;
  education?: UserEducationEntry[];
  certifications?: UserCertificationEntry[];
  skills?: string[];
  languages?: UserLanguageEntry[];
}

export type SubscriptionTier = 'free' | 'pro';

export interface User {
  _id: string;
  /** Alias usado por algunas pantallas / APIs (mismo valor que _id cuando existe) */
  id?: string;
  userId?: string;
  fullName: string;
  email: string;
  phone?: string;
  userType: 'client' | 'professional' | 'admin';
  /**
   * Plan de suscripción en backend (profesionales). Clientes suelen ir como `free` con acceso pleno.
   */
  subscriptionTier?: SubscriptionTier;
  /** ISO 8601; fin de periodo Pro (null = sin caducidad configurada). */
  subscriptionExpiresAt?: string | null;
  /**
   * Puede usar funciones Pro: siempre true para cliente/admin; profesional según tier y fecha.
   */
  hasProAccess?: boolean;
  /** Solo profesional: si las reservas que hacen los clientes online exigen seña (default true). */
  clientBookingRequiresDeposit?: boolean;
  /** Solo profesional: precio de consulta en ARS (cliente lo ve en Reservar Cita). */
  consultationPrice?: number;
  /** Solo profesional: % de seña sobre consultationPrice (default 20). */
  depositPercentage?: number;
  service?: string;
  serviceId?: string;
  clinicId?: string;
  isEmailVerified: boolean;
  isActive: boolean;
  profileImage?: string | null;
  createdAt: string;
  updatedAt: string;
  /** Datos extra (cliente): dirección */
  address?: UserAddress;
  /** Fecha de nacimiento YYYY-MM-DD */
  dateOfBirth?: string;
  nationalId?: string;
  gender?: UserGender;
  emergencyContact?: UserEmergencyContact;
  /** Texto libre (metadata.bio en el backend) */
  profileBio?: string;
  /** Solo profesional: datos de negocio / carrera (Mongo `businessInfo`) */
  businessInfo?: UserBusinessInfo;
}

export interface RefreshTokenResponse {
  token: string;
  refreshToken: string;
  expiresIn: number;
}

class AuthService {
  private token: string | null = null;
  private refreshToken: string | null = null;
  private user: User | null = null;

  // Inicializar el servicio
  async initialize(): Promise<void> {
    try {
      await this.loadStoredAuth();
    } catch (error) {
      console.error('Error inicializando AuthService:', error);
    }
  }

  // Cargar autenticación almacenada
  private async loadStoredAuth(): Promise<void> {
    try {
      const [token, refreshToken, userData] = await Promise.all([
        AsyncStorage.getItem(BACKEND_CONFIG.AUTH.TOKEN_KEY),
        AsyncStorage.getItem(`${BACKEND_CONFIG.AUTH.TOKEN_KEY}_refresh`),
        AsyncStorage.getItem(BACKEND_CONFIG.AUTH.USER_KEY)
      ]);

      if (token && userData) {
        this.token = token;
        this.refreshToken = refreshToken;
        this.user = JSON.parse(userData);
        
        // Verificar si el token está próximo a expirar
        await this.checkTokenExpiry();
      }
    } catch (error) {
      console.error('Error cargando autenticación almacenada:', error);
      await this.clearAuth();
    }
  }

  // Verificar si el token está próximo a expirar
  private async checkTokenExpiry(): Promise<void> {
    if (!this.token) return;

    try {
      // Validar que el token tenga el formato JWT correcto (3 partes separadas por puntos)
      const tokenParts = this.token.split('.');
      if (tokenParts.length !== 3) {
        console.warn('Token JWT inválido: no tiene 3 partes');
        await this.clearAuth();
        return;
      }

      // Validar que la parte del payload no esté vacía
      const payloadPart = tokenParts[1];
      if (!payloadPart || payloadPart.length === 0) {
        console.warn('Token JWT inválido: payload vacío');
        await this.clearAuth();
        return;
      }

      // Validar que la longitud sea múltiplo de 4 para base64
      if (payloadPart.length % 4 !== 0) {
        console.warn('Token JWT inválido: longitud de payload incorrecta para base64');
        await this.clearAuth();
        return;
      }

      // Decodificar el token JWT (parte del payload)
      const payload = JSON.parse(atob(payloadPart));
      
      // Validar que el payload tenga la propiedad exp
      if (!payload.exp || typeof payload.exp !== 'number') {
        console.warn('Token JWT inválido: no tiene expiración válida');
        await this.clearAuth();
        return;
      }

      const now = Date.now() / 1000;
      const timeUntilExpiry = payload.exp - now;

      // Si el token ya expiró, limpiar autenticación
      if (timeUntilExpiry <= 0) {
        console.log('Token expirado, limpiando autenticación');
        await this.clearAuth();
        return;
      }

      // Si el token expira en menos de 5 minutos, intentar renovarlo
      if (timeUntilExpiry < BACKEND_CONFIG.AUTH.REFRESH_THRESHOLD / 1000) {
        console.log('Token próximo a expirar, intentando renovar...');
        await this.refreshAuthToken();
      }
    } catch (error) {
      console.error('Error verificando expiración del token:', error);
      // Si hay cualquier error, limpiar la autenticación
      await this.clearAuth();
    }
  }

  // Iniciar sesión
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await api.post<AuthResponse>(
        BACKEND_CONFIG.ENDPOINTS.AUTH.LOGIN,
        credentials
      );

      await this.setAuth(response);
      return response;
    } catch (error) {
      console.error('Error en login:', error);
      showApiError(error, 'Error de inicio de sesión');
      throw error;
    }
  }

  // Registrarse
  async register(userData: RegisterData): Promise<AuthResponse> {
    try {
      const response = await api.post<AuthResponse>(
        BACKEND_CONFIG.ENDPOINTS.AUTH.REGISTER,
        userData
      );

      await this.setAuth(response);
      return response;
    } catch (error) {
      console.error('Error en registro:', error);
      showApiError(error, 'Error de registro');
      throw error;
    }
  }

  // Cerrar sesión
  async logout(): Promise<void> {
    try {
      if (this.token) {
        await api.post(
          BACKEND_CONFIG.ENDPOINTS.AUTH.LOGOUT,
          {},
          createAuthHeaders(this.token)
        );
      }
    } catch (error) {
      console.error('Error en logout:', error);
    } finally {
      await this.clearAuth();
    }
  }

  // Renovar token
  async refreshAuthToken(): Promise<void> {
    if (!this.refreshToken) {
      throw new Error('No hay refresh token disponible');
    }

    try {
      const response = await api.post<RefreshTokenResponse>(
        BACKEND_CONFIG.ENDPOINTS.AUTH.REFRESH,
        { refreshToken: this.refreshToken }
      );

      this.token = response.token;
      this.refreshToken = response.refreshToken;

      await AsyncStorage.setItem(BACKEND_CONFIG.AUTH.TOKEN_KEY, response.token);
      await AsyncStorage.setItem(
        `${BACKEND_CONFIG.AUTH.TOKEN_KEY}_refresh`,
        response.refreshToken
      );
    } catch (error) {
      console.error('Error renovando token:', error);
      await this.clearAuth();
      throw error;
    }
  }

  // Verificar token
  async verifyToken(): Promise<boolean> {
    if (!this.token) return false;

    try {
      await api.get(
        BACKEND_CONFIG.ENDPOINTS.AUTH.VERIFY,
        createAuthHeaders(this.token)
      );
      return true;
    } catch (error) {
      console.error('Error verificando token:', error);
      return false;
    }
  }

  // Establecer autenticación
  private async setAuth(authData: AuthResponse): Promise<void> {
    this.token = authData.token;
    this.refreshToken = authData.refreshToken;
    this.user = authData.user;

    await Promise.all([
      AsyncStorage.setItem(BACKEND_CONFIG.AUTH.TOKEN_KEY, authData.token),
      AsyncStorage.setItem(
        `${BACKEND_CONFIG.AUTH.TOKEN_KEY}_refresh`,
        authData.refreshToken
      ),
      AsyncStorage.setItem(BACKEND_CONFIG.AUTH.USER_KEY, JSON.stringify(authData.user))
    ]);
  }

  // Limpiar autenticación
  private async clearAuth(): Promise<void> {
    this.token = null;
    this.refreshToken = null;
    this.user = null;

    await Promise.all([
      AsyncStorage.removeItem(BACKEND_CONFIG.AUTH.TOKEN_KEY),
      AsyncStorage.removeItem(`${BACKEND_CONFIG.AUTH.TOKEN_KEY}_refresh`),
      AsyncStorage.removeItem(BACKEND_CONFIG.AUTH.USER_KEY)
    ]);
  }

  // Getters
  getToken(): string | null {
    return this.token;
  }

  // Alias para compatibilidad con código existente
  async getStoredToken(): Promise<string | null> {
    return this.getToken();
  }

  getUser(): User | null {
    return this.user;
  }

  isAuthenticated(): boolean {
    return !!this.token && !!this.user;
  }

  // Obtener headers de autorización
  getAuthHeaders(): Record<string, string> | null {
    if (!this.token) return null;
    return createAuthHeaders(this.token);
  }

  // Verificar si el usuario es de un tipo específico
  isUserType(userType: 'client' | 'professional' | 'admin'): boolean {
    return this.user?.userType === userType;
  }

  // Verificar si el usuario es cliente
  isClient(): boolean {
    return this.isUserType('client');
  }

  // Verificar si el usuario es profesional
  isProfessional(): boolean {
    return this.isUserType('professional');
  }

  // Verificar si el usuario es admin
  isAdmin(): boolean {
    return this.isUserType('admin');
  }
}

// Instancia singleton
export const authService = new AuthService();

// Inicializar el servicio al importar
authService.initialize();

export default authService;