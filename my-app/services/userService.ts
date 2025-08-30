import api, { showApiError, createAuthHeaders } from './api';
import authService from './authService';

// Tipos de usuario
export interface User {
  _id: string;
  email: string;
  fullName: string;
  userType: 'client' | 'professional' | 'admin';
  phone: string;
  dateOfBirth?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  medicalHistory?: {
    allergies: string[];
    chronicConditions: string[];
    bloodType: string;
    emergencyContact: {
      name: string;
      relationship: string;
      phone: string;
    };
  };
  professionalInfo?: {
    license: string;
    specialization: string;
    experience: number;
    education: Array<{
      degree: string;
      institution: string;
      year: number;
    }>;
    consultationFee: number;
    rating: {
      average: number;
      totalReviews: number;
    };
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  fullName: string;
  userType: 'client' | 'professional';
  phone: string;
  dateOfBirth?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
}

export interface AuthResponse {
  user: User;
  token: string;
  message: string;
}

// Servicio de usuarios
const userService = {
  // Obtener todos los usuarios
  async getAllUsers(): Promise<User[]> {
    try {
      const token = await authService.getStoredToken();
      
      if (token) {
        try {
          return await api.get<User[]>('/users', createAuthHeaders(token));
        } catch (error) {
          console.log('Error en backend, usando datos de fallback');
          return this.getFallbackUsers();
        }
      } else {
        console.log('No hay token, usando datos de fallback');
        return this.getFallbackUsers();
      }
    } catch (error) {
      console.log('Error general, usando datos de fallback');
      return this.getFallbackUsers();
    }
  },

  // Obtener usuario por ID
  async getUserById(id: string): Promise<User> {
    try {
      const token = await authService.getStoredToken();
      
      if (token) {
        try {
          return await api.get<User>(`/users/${id}`, createAuthHeaders(token));
        } catch (error) {
          console.log('Error en backend, usando datos de fallback');
          const fallbackUsers = this.getFallbackUsers();
          const user = fallbackUsers.find(u => u._id === id);
          if (user) return user;
          throw new Error('Usuario no encontrado');
        }
      } else {
        console.log('No hay token, usando datos de fallback');
        const fallbackUsers = this.getFallbackUsers();
        const user = fallbackUsers.find(u => u._id === id);
        if (user) return user;
        throw new Error('Usuario no encontrado');
      }
    } catch (error) {
      console.log('Error general, usando datos de fallback');
      const fallbackUsers = this.getFallbackUsers();
      const user = fallbackUsers.find(u => u._id === id);
      if (user) return user;
      throw new Error('Usuario no encontrado');
    }
  },

  // Obtener usuarios por tipo
  async getUsersByType(userType: 'client' | 'professional'): Promise<User[]> {
    try {
      const allUsers = await this.getAllUsers();
      return allUsers.filter(user => user.userType === userType);
    } catch (error) {
      showApiError(error, 'Error al obtener usuarios');
      throw error;
    }
  },

  // Obtener solo usuarios cliente
  async getClients(): Promise<User[]> {
    return this.getUsersByType('client');
  },

  // Obtener solo profesionales
  async getProfessionals(): Promise<User[]> {
    return this.getUsersByType('professional');
  },

  // Login de usuario
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      return await api.post<AuthResponse>('/auth/login', credentials);
    } catch (error) {
      showApiError(error, 'Error de login');
      throw error;
    }
  },

  // Registro de usuario
  async register(userData: RegisterData): Promise<AuthResponse> {
    try {
      return await api.post<AuthResponse>('/auth/register', userData);
    } catch (error) {
      showApiError(error, 'Error de registro');
      throw error;
    }
  },

  // Actualizar usuario
  async updateUser(id: string, userData: Partial<User>): Promise<User> {
    try {
      const token = await authService.getStoredToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }
      
      return await api.put<User>(`/users/${id}`, userData, createAuthHeaders(token));
    } catch (error) {
      showApiError(error, 'Error al actualizar usuario');
      throw error;
    }
  },

  // Eliminar usuario
  async deleteUser(id: string): Promise<void> {
    try {
      const token = await authService.getStoredToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }
      
      await api.delete(`/users/${id}`, createAuthHeaders(token));
    } catch (error) {
      showApiError(error, 'Error al eliminar usuario');
      throw error;
    }
  },

  // Verificar si el email existe
  async checkEmailExists(email: string): Promise<boolean> {
    try {
      const users = await this.getAllUsers();
      return users.some(user => user.email === email);
    } catch (error) {
      console.error('Error verificando email:', error);
      return false;
    }
  },

  // Buscar usuarios por nombre
  async searchUsersByName(searchTerm: string): Promise<User[]> {
    try {
      const users = await this.getAllUsers();
      const term = searchTerm.toLowerCase();
      return users.filter(user => 
        user.fullName.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term)
      );
    } catch (error) {
      console.error('Error en búsqueda de usuarios:', error);
      return [];
    }
  },

  // Datos de fallback para desarrollo
  getFallbackUsers(): User[] {
    return [
      {
        _id: '1',
        email: 'dr.carlos.mendoza@turnario.com',
        fullName: 'Dr. Carlos Mendoza',
        userType: 'professional',
        phone: '+54 11 1234-5678',
        isActive: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        professionalInfo: {
          license: 'MP-12345',
          specialization: 'Medicina General',
          experience: 15,
          education: [
            {
              degree: 'Médico',
              institution: 'Universidad de Buenos Aires',
              year: 2009
            }
          ],
          consultationFee: 10000,
          rating: {
            average: 4.8,
            totalReviews: 127
          }
        }
      },
      {
        _id: '2',
        email: 'dra.ana.martinez@turnario.com',
        fullName: 'Dra. Ana Martínez',
        userType: 'professional',
        phone: '+54 11 2345-6789',
        isActive: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        professionalInfo: {
          license: 'MP-23456',
          specialization: 'Psicología Clínica',
          experience: 12,
          education: [
            {
              degree: 'Psicóloga',
              institution: 'Universidad Nacional de Córdoba',
              year: 2012
            }
          ],
          consultationFee: 8000,
          rating: {
            average: 4.9,
            totalReviews: 89
          }
        }
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
  }
};

export { userService };

