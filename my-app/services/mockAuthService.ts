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

class MockAuthService {
  private tokenKey = 'auth_token';
  private userKey = 'user_data';

  // Usuarios mock para desarrollo
  private mockUsers: User[] = [
    {
      _id: '1',
      email: 'dr.carlos.mendoza@turnario.com',
      fullName: 'Dr. Carlos Mendoza',
      userType: 'professional',
      phone: '+54 11 1234-5678',
      service: 'Medicina General',
      isActive: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z'
    },
    {
      _id: '2',
      email: 'dra.ana.martinez@turnario.com',
      fullName: 'Dra. Ana Martínez',
      userType: 'professional',
      phone: '+54 11 2345-6789',
      service: 'Psicología Clínica',
      isActive: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z'
    },
    {
      _id: '3',
      email: 'maria.gonzalez@email.com',
      fullName: 'María González',
      userType: 'client',
      phone: '+54 11 3456-7890',
      isActive: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z'
    },
    {
      _id: '4',
      email: 'carlos.rodriguez@email.com',
      fullName: 'Carlos Rodríguez',
      userType: 'client',
      phone: '+54 11 4567-8901',
      isActive: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z'
    }
  ];

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

  // Login mock
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    try {
      // Simular delay de red
      await new Promise(resolve => setTimeout(resolve, 1000));

      const user = this.mockUsers.find(u => u.email === credentials.email);
      
      if (!user) {
        throw new Error('Usuario no encontrado');
      }

      // Simular validación de contraseña (en desarrollo acepta cualquier contraseña)
      if (credentials.password.length < 3) {
        throw new Error('Contraseña incorrecta');
      }

      const token = `mock_token_${user._id}_${Date.now()}`;
      
      await this.storeAuthData(token, user);
      
      return {
        user,
        token,
        message: 'Login exitoso'
      };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  // Registro mock
  async register(userData: RegisterRequest): Promise<AuthResponse> {
    try {
      // Simular delay de red
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Verificar si el email ya existe
      const existingUser = this.mockUsers.find(u => u.email === userData.email);
      if (existingUser) {
        throw new Error('El email ya está registrado');
      }

      // Crear nuevo usuario
      const newUser: User = {
        _id: `${this.mockUsers.length + 1}`,
        email: userData.email,
        fullName: userData.fullName,
        userType: userData.userType,
        phone: userData.phone,
        service: userData.service,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Agregar a la lista mock
      this.mockUsers.push(newUser);

      const token = `mock_token_${newUser._id}_${Date.now()}`;
      
      await this.storeAuthData(token, newUser);
      
      return {
        user: newUser,
        token,
        message: 'Registro exitoso'
      };
    } catch (error) {
      console.error('Register error:', error);
      throw error;
    }
  }

  // Logout
  async logout(): Promise<void> {
    try {
      await this.clearAuthData();
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  // Obtener perfil del usuario
  async getProfile(): Promise<User> {
    try {
      const user = await this.getStoredUser();
      if (!user) {
        throw new Error('No hay usuario autenticado');
      }
      return user;
    } catch (error) {
      console.error('Get profile error:', error);
      throw error;
    }
  }

  // Verificar si el token es válido
  async validateToken(): Promise<boolean> {
    try {
      const token = await this.getStoredToken();
      const user = await this.getStoredUser();
      return !!(token && user);
    } catch (error) {
      console.error('Token validation error:', error);
      return false;
    }
  }

  // Obtener todos los usuarios (para desarrollo)
  async getAllUsers(): Promise<User[]> {
    try {
      // Simular delay de red
      await new Promise(resolve => setTimeout(resolve, 500));
      return this.mockUsers;
    } catch (error) {
      console.error('Get all users error:', error);
      return [];
    }
  }

  // Inicializar servicio
  async initialize(): Promise<void> {
    try {
      console.log('🔄 Inicializando servicio de autenticación mock...');
      // Simular delay de inicialización
      await new Promise(resolve => setTimeout(resolve, 100));
      console.log('✅ Servicio de autenticación mock inicializado');
    } catch (error) {
      console.error('❌ Error inicializando servicio mock:', error);
      throw error;
    }
  }
}

export default new MockAuthService();
