// @ts-nocheck � beta
import { api, createAuthHeaders, showApiError } from './api';
import { BACKEND_CONFIG } from '../config/backend';

// Tipos para autenticación (copiados del servicio original)
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

export interface User {
  _id: string;
  fullName: string;
  email: string;
  phone?: string;
  userType: 'client' | 'professional' | 'admin';
  isEmailVerified: boolean;
  isActive: boolean;
  profileImage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RefreshTokenResponse {
  token: string;
  refreshToken: string;
  expiresIn: number;
}

class TestAuthService {
  private token: string | null = null;
  private refreshToken: string | null = null;
  private user: User | null = null;

  // Usuario de prueba por defecto
  private testUser: User = {
    _id: 'test_user_id',
    fullName: 'Usuario de Prueba',
    email: 'test@turnario.com',
    phone: '+54911234567',
    userType: 'professional',
    isEmailVerified: true,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  private testToken = 'test_token_for_development';

  // Inicializar con datos de prueba
  async initialize(): Promise<void> {
    try {
      console.log('🔄 Inicializando TestAuthService con datos de prueba...');
      this.token = this.testToken;
      this.user = this.testUser;
      console.log('✅ TestAuthService inicializado con usuario de prueba');
    } catch (error) {
      console.error('❌ Error inicializando TestAuthService:', error);
    }
  }

  // Login simulado (siempre exitoso para testing)
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      console.log('🔐 Login simulado para testing...');
      
      // Simular delay de red
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      this.token = this.testToken;
      this.user = this.testUser;
      
      const response: AuthResponse = {
        user: this.user,
        token: this.token,
        refreshToken: 'test_refresh_token',
        expiresIn: 3600
      };

      console.log('✅ Login simulado exitoso');
      return response;
    } catch (error) {
      console.error('❌ Error en login simulado:', error);
      throw error;
    }
  }

  // Registro simulado (siempre exitoso para testing)
  async register(data: RegisterData): Promise<AuthResponse> {
    try {
      console.log('📝 Registro simulado para testing...');
      
      // Simular delay de red
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newUser: User = {
        _id: `test_user_${Date.now()}`,
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        userType: data.userType,
        isEmailVerified: true,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      this.token = this.testToken;
      this.user = newUser;
      
      const response: AuthResponse = {
        user: this.user,
        token: this.token,
        refreshToken: 'test_refresh_token',
        expiresIn: 3600
      };

      console.log('✅ Registro simulado exitoso');
      return response;
    } catch (error) {
      console.error('❌ Error en registro simulado:', error);
      throw error;
    }
  }

  // Logout simulado
  async logout(): Promise<void> {
    try {
      console.log('🚪 Logout simulado...');
      this.token = null;
      this.refreshToken = null;
      this.user = null;
      console.log('✅ Logout simulado exitoso');
    } catch (error) {
      console.error('❌ Error en logout simulado:', error);
      throw error;
    }
  }

  // Refrescar token simulado
  async refreshToken(): Promise<RefreshTokenResponse> {
    try {
      console.log('🔄 Refrescando token simulado...');
      
      // Simular delay de red
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const response: RefreshTokenResponse = {
        token: this.testToken,
        refreshToken: 'test_refresh_token',
        expiresIn: 3600
      };

      console.log('✅ Token refrescado simulado');
      return response;
    } catch (error) {
      console.error('❌ Error refrescando token simulado:', error);
      throw error;
    }
  }

  // Limpiar autenticación
  async clearAuth(): Promise<void> {
    this.token = null;
    this.refreshToken = null;
    this.user = null;
  }

  // Getters
  getToken(): string | null {
    return this.token;
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

  // Obtener información del usuario actual
  getCurrentUser(): User | null {
    return this.user;
  }

  // Verificar si el token está próximo a expirar (simulado)
  async checkTokenExpiry(): Promise<boolean> {
    // Para testing, siempre retornamos false (token válido)
    return false;
  }
}

// Instancia singleton
export const testAuthService = new TestAuthService();

// Inicializar automáticamente
testAuthService.initialize();

export default testAuthService;
