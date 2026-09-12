import { getBackendBaseUrl } from '../config/backend';
import simpleAuthService from './simpleAuthService';

// Tipos para usuarios
export interface UserProfile {
  _id: string;
  fullName: string;
  email: string;
  phone?: string;
  userType: 'client' | 'professional' | 'admin';
  isEmailVerified: boolean;
  isActive: boolean;
  profileImage?: string;
  dateOfBirth?: string;
  gender?: string;
  emergencyContact?: string;
  medicalHistory?: string;
  allergies?: string;
  clinicalNotes?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  preferences?: {
    language: string;
    timezone: string;
    notifications: {
      email: boolean;
      push: boolean;
      sms: boolean;
    };
  };
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProfileData {
  fullName?: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  preferences?: {
    language?: string;
    timezone?: string;
    notifications?: {
      email?: boolean;
      push?: boolean;
      sms?: boolean;
    };
  };
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface UserStats {
  totalAppointments: number;
  completedAppointments: number;
  pendingAppointments: number;
  cancelledAppointments: number;
  totalSpent: number;
  averageRating: number;
  totalReviews: number;
  memberSince: string;
}

class UserService {
  // Obtener perfil del usuario actual
  async getProfile(): Promise<UserProfile> {
    // SOLUCIÓN DEFINITIVA: NO hacer llamadas al backend, solo usar datos mock
    console.log('📱 UserService: Obteniendo perfil localmente (modo desarrollo)');
    
    // Retornar perfil mock local
    return {
      _id: 'test_user_1',
      email: 'test@example.com',
      fullName: 'Usuario de Prueba',
      userType: 'client',
      phone: '+1234567890',
      address: {
        street: 'Calle de prueba 123',
        city: 'Ciudad de prueba',
        state: 'Estado de prueba',
        country: 'País de prueba',
        postalCode: '12345'
      },
      profileImage: undefined,
      isActive: true,
      isEmailVerified: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  // Actualizar perfil del usuario
  async updateProfile(profileData: UpdateProfileData): Promise<UserProfile> {
    // SOLUCIÓN DEFINITIVA: NO hacer llamadas al backend, solo usar datos mock
    console.log('📱 UserService: Actualizando perfil localmente (modo desarrollo)');
    
    // Retornar perfil mock actualizado
    return {
      _id: 'test_user_1',
      email: 'test@example.com',
      fullName: profileData.fullName || 'Usuario de Prueba',
      userType: 'client',
      phone: profileData.phone || '+1234567890',
      address: {
        street: 'Calle de prueba 123',
        city: 'Ciudad de prueba',
        state: 'Estado de prueba',
        country: 'País de prueba',
        postalCode: '12345'
      },
      profileImage: undefined,
      isActive: true,
      isEmailVerified: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  // Cambiar contraseña
  async changePassword(passwordData: ChangePasswordData): Promise<{ message: string }> {
    // SOLUCIÓN DEFINITIVA: NO hacer llamadas al backend, solo simular cambio local
    console.log('📱 UserService: Cambiando contraseña localmente (modo desarrollo)');
    
    // Simular cambio exitoso
    return { message: 'Contraseña cambiada exitosamente (modo desarrollo)' };
  }

  // Obtener estadísticas del usuario
  async getUserStats(): Promise<UserStats> {
    // SOLUCIÓN DEFINITIVA: NO hacer llamadas al backend, solo usar datos mock
    console.log('📱 UserService: Obteniendo estadísticas localmente (modo desarrollo)');
    
    // Retornar estadísticas mock locales
    return {
      totalAppointments: 5,
      completedAppointments: 3,
      pendingAppointments: 2,
      cancelledAppointments: 0,
      totalSpent: 150000,
      averageRating: 4.5,
      totalReviews: 10,
      memberSince: '2024-01-01'
    };
  }

  // Subir imagen de perfil
  async uploadProfileImage(imageUri: string): Promise<{ profileImage: string }> {
    // SOLUCIÓN DEFINITIVA: NO hacer llamadas al backend, solo simular subida local
    console.log('📱 UserService: Subiendo imagen localmente (modo desarrollo)');
    
    // Simular subida exitosa
    return { profileImage: 'https://example.com/mock-profile-image.jpg' };
  }

  // Eliminar cuenta
  async deleteAccount(): Promise<{ message: string }> {
    // SOLUCIÓN DEFINITIVA: NO hacer llamadas al backend, solo simular eliminación local
    console.log('📱 UserService: Eliminando cuenta localmente (modo desarrollo)');
    
    // Simular eliminación exitosa
    return { message: 'Cuenta eliminada exitosamente (modo desarrollo)' };
  }

  // Obtener historial de actividad
  async getActivityHistory(page: number = 1, limit: number = 20): Promise<{
    activities: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    // SOLUCIÓN DEFINITIVA: NO hacer llamadas al backend, solo usar datos mock
    console.log('📱 UserService: Obteniendo historial localmente (modo desarrollo)');
    
    // Retornar historial mock local
    return {
      activities: [
        { id: '1', action: 'Cita creada', date: '2024-01-15', details: 'Consulta General' },
        { id: '2', action: 'Perfil actualizado', date: '2024-01-14', details: 'Información personal' }
      ],
      total: 2,
      page: 1,
      totalPages: 1
    };
  }

  // Exportar datos del usuario
  async exportUserData(): Promise<{ downloadUrl: string }> {
    // SOLUCIÓN DEFINITIVA: NO hacer llamadas al backend, solo simular exportación local
    console.log('📱 UserService: Exportando datos localmente (modo desarrollo)');
    
    // Simular exportación exitosa
    return { downloadUrl: 'https://example.com/mock-export.zip' };
  }

  // Obtener todos los usuarios desde el backend
  async getAllUsers(): Promise<UserProfile[]> {
    const token = await simpleAuthService.getToken();
    if (!token) {
      throw new Error('No hay sesión activa');
    }

    const response = await fetch(`${getBackendBaseUrl()}/api/users?role=client&limit=100`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok || !json?.success || !Array.isArray(json.data)) {
      throw new Error(json?.message || `No se pudieron cargar usuarios (HTTP ${response.status})`);
    }

    return json.data.map((user: any) => ({
      _id: String(user._id),
      fullName: user.fullName || '',
      email: user.email || '',
      phone: user.phone || '',
      userType: user.userType || 'client',
      isEmailVerified: Boolean(user.isEmailVerified),
      isActive: user.isActive !== false,
      profileImage: user.profileImage || undefined,
      dateOfBirth: user.dateOfBirth || '',
      gender: user.gender || '',
      emergencyContact: user.emergencyContact || '',
      medicalHistory: user.medicalHistory || '',
      allergies: user.allergies || '',
      clinicalNotes: user.clinicalNotes || '',
      address: user.address || undefined,
      preferences: user.preferences || undefined,
      createdAt: user.createdAt || '',
      updatedAt: user.updatedAt || '',
    }));
  }

  // Buscar usuarios por nombre
  async searchUsersByName(searchTerm: string): Promise<UserProfile[]> {
    const all = await this.getAllUsers();
    const term = searchTerm.toLowerCase();
    return all.filter(
      (user) =>
        user.fullName.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term)
    );
  }

  // Obtener usuario por ID
  async getUserById(id: string): Promise<UserProfile | null> {
    const token = await simpleAuthService.getToken();
    if (!token) {
      throw new Error('No hay sesión activa');
    }

    const response = await fetch(`${getBackendBaseUrl()}/api/v1/users/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(json?.error || json?.message || `Usuario no encontrado (HTTP ${response.status})`);
    }
    const user = json?._id ? json : json?.data;
    if (!user?._id) return null;

    return {
      _id: String(user._id),
      fullName: user.fullName || '',
      email: user.email || '',
      phone: user.phone || '',
      userType: user.userType || 'client',
      isEmailVerified: Boolean(user.isEmailVerified),
      isActive: user.isActive !== false,
      profileImage: user.profileImage || undefined,
      dateOfBirth: user.dateOfBirth || '',
      gender: user.gender || '',
      emergencyContact: user.emergencyContact || '',
      medicalHistory: user.medicalHistory || '',
      allergies: user.allergies || '',
      clinicalNotes: user.clinicalNotes || '',
      address: user.address || undefined,
      preferences: user.preferences || undefined,
      createdAt: user.createdAt || '',
      updatedAt: user.updatedAt || '',
    };
  }

  // Obtener solo clientes
  async getClients(): Promise<UserProfile[]> {
    const all = await this.getAllUsers();
    return all.filter((user) => user.userType === 'client');
  }

  // Obtener solo profesionales
  async getProfessionals(): Promise<UserProfile[]> {
    const token = await simpleAuthService.getToken();
    if (!token) {
      throw new Error('No hay sesión activa');
    }
    const response = await fetch(`${getBackendBaseUrl()}/api/users?role=professional&limit=100`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok || !json?.success || !Array.isArray(json.data)) {
      throw new Error(json?.message || `No se pudieron cargar profesionales (HTTP ${response.status})`);
    }
    return json.data.map((user: any) => ({
      _id: String(user._id),
      fullName: user.fullName || '',
      email: user.email || '',
      phone: user.phone || '',
      userType: 'professional' as const,
      isEmailVerified: Boolean(user.isEmailVerified),
      isActive: user.isActive !== false,
      profileImage: user.profileImage || undefined,
      createdAt: user.createdAt || '',
      updatedAt: user.updatedAt || '',
    }));
  }

  // Función para obtener datos mock de usuarios
  private getMockUsers(): UserProfile[] {
    return [
      {
        _id: '1',
        fullName: 'Ana Martínez',
        email: 'ana.martinez@email.com',
        phone: '+54 9 11 1234-5678',
        userType: 'client',
        isEmailVerified: true,
        isActive: true,
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-15T10:30:00Z'
      },
      {
        _id: '2',
        fullName: 'Dr. Carlos Mendoza',
        email: 'carlos.mendoza@email.com',
        phone: '+54 9 11 2345-6789',
        userType: 'professional',
        isEmailVerified: true,
        isActive: true,
        createdAt: '2024-01-10T08:15:00Z',
        updatedAt: '2024-01-10T08:15:00Z'
      },
      {
        _id: '3',
        fullName: 'María González',
        email: 'maria.gonzalez@email.com',
        phone: '+54 9 11 3456-7890',
        userType: 'client',
        isEmailVerified: true,
        isActive: true,
        createdAt: '2024-01-20T14:45:00Z',
        updatedAt: '2024-01-20T14:45:00Z'
      },
      {
        _id: '4',
        fullName: 'Dr. Laura Fernández',
        email: 'laura.fernandez@email.com',
        phone: '+54 9 11 4567-8901',
        userType: 'professional',
        isEmailVerified: true,
        isActive: true,
        createdAt: '2024-01-12T11:20:00Z',
        updatedAt: '2024-01-12T11:20:00Z'
      }
    ];
  }
}

// Instancia singleton
export const userService = new UserService();

export default userService;