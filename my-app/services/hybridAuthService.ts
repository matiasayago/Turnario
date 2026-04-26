// @ts-nocheck � beta
import {
    AuthResponse,
    LoginCredentials,
    ProfileUpdateRequest,
    RegisterData,
    User
} from './authService';
import { connectionService } from './connectionService';
import { mockAuthService } from './mockAuthService';
import { simpleAuthService } from './simpleAuthService';

class HybridAuthService {
  private useBackend: boolean = true;

  // Verificar si el backend está disponible
  private async checkBackendAvailability(): Promise<boolean> {
    try {
      const status = await connectionService.checkConnection();
      this.useBackend = status.isConnected;
      return status.isConnected;
    } catch (error) {
      console.log('🔄 Backend no disponible, usando autenticación local');
      this.useBackend = false;
      return false;
    }
  }

  // Iniciar sesión
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const isBackendAvailable = await this.checkBackendAvailability();
      
      if (isBackendAvailable) {
        console.log('🌐 Iniciando sesión en el backend');
        return await simpleAuthService.login(credentials);
      } else {
        console.log('📱 Iniciando sesión local (modo demo)');
        return await mockAuthService.login(credentials);
      }
    } catch (error) {
      console.error('❌ Error iniciando sesión en el backend, usando modo local:', error);
      return await mockAuthService.login(credentials);
    }
  }

  // Registrar usuario
  async register(userData: RegisterData): Promise<AuthResponse> {
    try {
      const isBackendAvailable = await this.checkBackendAvailability();
      
      if (isBackendAvailable) {
        console.log('🌐 Registrando usuario en el backend');
        return await simpleAuthService.register(userData);
      } else {
        console.log('📱 Registrando usuario local (modo demo)');
        return await mockAuthService.register(userData);
      }
    } catch (error) {
      console.error('❌ Error registrando usuario en el backend, usando modo local:', error);
      return await mockAuthService.register(userData);
    }
  }

  // Cerrar sesión
  async logout(): Promise<void> {
    try {
      const isBackendAvailable = await this.checkBackendAvailability();
      
      if (isBackendAvailable) {
        await simpleAuthService.logout();
      } else {
        await mockAuthService.logout();
      }
    } catch (error) {
      console.error('❌ Error cerrando sesión:', error);
      // Intentar cerrar sesión local como respaldo
      try {
        await mockAuthService.logout();
      } catch (localError) {
        console.error('❌ Error cerrando sesión local:', localError);
      }
    }
  }

  // Obtener usuario actual
  getUser(): User | null {
    try {
      if (this.useBackend) {
        return simpleAuthService.getUser();
      } else {
        return mockAuthService.getUser();
      }
    } catch (error) {
      console.error('❌ Error obteniendo usuario:', error);
      return null;
    }
  }

  // Verificar si está autenticado
  isAuthenticated(): boolean {
    try {
      if (this.useBackend) {
        return simpleAuthService.isAuthenticated();
      } else {
        return mockAuthService.isAuthenticated();
      }
    } catch (error) {
      console.error('❌ Error verificando autenticación:', error);
      return false;
    }
  }

  // Obtener headers de autenticación
  getAuthHeaders(): Record<string, string> | null {
    try {
      if (this.useBackend) {
        return simpleAuthService.getAuthHeaders();
      } else {
        return mockAuthService.getAuthHeaders();
      }
    } catch (error) {
      console.error('❌ Error obteniendo headers de autenticación:', error);
      return null;
    }
  }

  // Actualizar perfil
  async updateProfile(profileData: ProfileUpdateRequest): Promise<User> {
    try {
      const isBackendAvailable = await this.checkBackendAvailability();
      
      if (isBackendAvailable) {
        console.log('🌐 Actualizando perfil en el backend');
        return await simpleAuthService.updateProfile(profileData);
      } else {
        console.log('📱 Actualizando perfil local (modo demo)');
        return await mockAuthService.updateProfile(profileData);
      }
    } catch (error) {
      console.error('❌ Error actualizando perfil en el backend, usando modo local:', error);
      return await mockAuthService.updateProfile(profileData);
    }
  }

  // Obtener perfil
  async getProfile(): Promise<User> {
    try {
      const isBackendAvailable = await this.checkBackendAvailability();
      
      if (isBackendAvailable) {
        return await simpleAuthService.getProfile();
      } else {
        return await mockAuthService.getProfile();
      }
    } catch (error) {
      console.error('❌ Error obteniendo perfil del backend, usando modo local:', error);
      return await mockAuthService.getProfile();
    }
  }

  // Validar token
  async validateToken(): Promise<boolean> {
    try {
      const isBackendAvailable = await this.checkBackendAvailability();
      
      if (isBackendAvailable) {
        return await simpleAuthService.validateToken();
      } else {
        return await mockAuthService.validateToken();
      }
    } catch (error) {
      console.error('❌ Error validando token del backend, usando modo local:', error);
      return await mockAuthService.validateToken();
    }
  }

  // Renovar token
  async refreshAuthToken(): Promise<void> {
    try {
      const isBackendAvailable = await this.checkBackendAvailability();
      
      if (isBackendAvailable) {
        console.log('🌐 Renovando token en el backend');
        await simpleAuthService.refreshAuthToken();
      } else {
        console.log('📱 Renovando token local (modo demo)');
        await mockAuthService.refreshAuthToken();
      }
    } catch (error) {
      console.error('❌ Error renovando token del backend, usando modo local:', error);
      await mockAuthService.refreshAuthToken();
    }
  }

  // Verificar tipo de usuario
  isUserType(userType: 'client' | 'professional' | 'admin'): boolean {
    try {
      if (this.useBackend) {
        return simpleAuthService.isUserType(userType);
      } else {
        return mockAuthService.isUserType(userType);
      }
    } catch (error) {
      console.error('❌ Error verificando tipo de usuario:', error);
      return false;
    }
  }

  isClient(): boolean {
    return this.isUserType('client');
  }

  isProfessional(): boolean {
    return this.isUserType('professional');
  }

  isAdmin(): boolean {
    return this.isUserType('admin');
  }

  // Obtener todos los usuarios (solo para admin)
  async getAllUsers(): Promise<User[]> {
    try {
      const isBackendAvailable = await this.checkBackendAvailability();
      
      if (isBackendAvailable) {
        return await simpleAuthService.getAllUsers();
      } else {
        return await mockAuthService.getAllUsers();
      }
    } catch (error) {
      console.error('❌ Error obteniendo usuarios del backend, usando modo local:', error);
      return await mockAuthService.getAllUsers();
    }
  }

  // Obtener estado de conexión
  isUsingBackend(): boolean {
    return this.useBackend;
  }

  // Forzar uso de datos locales
  forceLocalMode(): void {
    this.useBackend = false;
  }

  // Forzar uso del backend
  forceBackendMode(): void {
    this.useBackend = true;
  }

  // Inicializar servicio
  async initialize(): Promise<void> {
    try {
      const isBackendAvailable = await this.checkBackendAvailability();
      
      if (isBackendAvailable) {
        await simpleAuthService.initialize();
      } else {
        await mockAuthService.initialize();
      }
    } catch (error) {
      console.error('❌ Error inicializando servicio de autenticación:', error);
      // Intentar inicializar servicio local como respaldo
      try {
        await mockAuthService.initialize();
      } catch (localError) {
        console.error('❌ Error inicializando servicio local:', localError);
      }
    }
  }
}

// Instancia singleton
export const hybridAuthService = new HybridAuthService();

export default hybridAuthService;
