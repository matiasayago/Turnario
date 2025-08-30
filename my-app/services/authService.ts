import api, { ApiError } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
  userType: 'client' | 'professional';
  phone: string;
  service?: string;
}

export interface User {
  _id: string;
  email: string;
  fullName: string;
  userType: 'client' | 'professional' | 'admin';
  phone: string;
  service?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  message: string;
}

export interface ProfileUpdateRequest {
  fullName?: string;
  phone?: string;
  service?: string;
}

class AuthService {
  private tokenKey = 'auth_token';
  private userKey = 'user_data';

  // Obtener token almacenado
  async getStoredToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(this.tokenKey);
    } catch (error) {
      console.error('Error getting stored token:', error);
      return null;
    }
  }

  // Obtener usuario almacenado
  async getStoredUser(): Promise<User | null> {
    try {
      const userData = await AsyncStorage.getItem(this.userKey);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error getting stored user:', error);
      return null;
    }
  }

  // Almacenar token y usuario
  async storeAuthData(token: string, user: User): Promise<void> {
    try {
      await AsyncStorage.setItem(this.tokenKey, token);
      await AsyncStorage.setItem(this.userKey, JSON.stringify(user));
    } catch (error) {
      console.error('Error storing auth data:', error);
      throw new Error('Error al guardar datos de autenticación');
    }
  }

  // Limpiar datos de autenticación
  async clearAuthData(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.tokenKey);
      await AsyncStorage.removeItem(this.userKey);
    } catch (error) {
      console.error('Error clearing auth data:', error);
    }
  }

  // Configurar headers de autorización
  private getAuthHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.getStoredToken()}`,
    };
  }

  // Login
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    try {
      const response = await api.post<AuthResponse>('/auth/login', credentials);
      
      if (response.user && response.token) {
        await this.storeAuthData(response.token, response.user);
      }
      
      return response;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  // Registro
  async register(userData: RegisterRequest): Promise<AuthResponse> {
    try {
      const response = await api.post<AuthResponse>('/auth/register', userData);
      
      if (response.user && response.token) {
        await this.storeAuthData(response.token, response.user);
      }
      
      return response;
    } catch (error) {
      console.error('Register error:', error);
      throw error;
    }
  }

  // Logout
  async logout(): Promise<void> {
    try {
      // Opcional: llamar al endpoint de logout del backend
      const token = await this.getStoredToken();
      if (token) {
        await api.post('/auth/logout', {}, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      await this.clearAuthData();
    }
  }

  // Obtener perfil del usuario
  async getProfile(): Promise<User> {
    try {
      const token = await this.getStoredToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await api.get<User>('/users/profile/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      return response;
    } catch (error) {
      console.error('Get profile error:', error);
      throw error;
    }
  }

  // Actualizar perfil
  async updateProfile(profileData: ProfileUpdateRequest): Promise<User> {
    try {
      const token = await this.getStoredToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await api.put<User>('/users/profile/me', profileData, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      // Actualizar usuario almacenado
      const currentUser = await this.getStoredUser();
      if (currentUser) {
        const updatedUser = { ...currentUser, ...response };
        await AsyncStorage.setItem(this.userKey, JSON.stringify(updatedUser));
      }
      
      return response;
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  }

  // Cambiar contraseña
  async changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
    try {
      const token = await this.getStoredToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await api.post<{ message: string }>('/users/change-password', {
        currentPassword,
        newPassword
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      return response;
    } catch (error) {
      console.error('Change password error:', error);
      throw error;
    }
  }

  // Verificar si el token es válido
  async validateToken(): Promise<boolean> {
    try {
      const token = await this.getStoredToken();
      if (!token) return false;

      await api.get('/users/profile/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      return true;
    } catch (error) {
      console.error('Token validation error:', error);
      await this.clearAuthData();
      return false;
    }
  }

  // Renovar token (si el backend lo soporta)
  async refreshToken(): Promise<string | null> {
    try {
      const token = await this.getStoredToken();
      if (!token) return null;

      const response = await api.post<{ token: string }>('/auth/refresh', {}, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.token) {
        await AsyncStorage.setItem(this.tokenKey, response.token);
        return response.token;
      }
      
      return null;
    } catch (error) {
      console.error('Refresh token error:', error);
      return null;
    }
  }
}

export default new AuthService();
