import api from './api';
import authService from './authService';

export interface Clinic {
  _id: string;
  name: string;
  description?: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  phone: string;
  email?: string;
  website?: string;
  type: 'hospital' | 'clinic' | 'medical_center' | 'specialized_center';
  specialties: string[];
  services: string[];
  operatingHours: {
    monday: { open: string; close: string; closed: boolean };
    tuesday: { open: string; close: string; closed: boolean };
    wednesday: { open: string; close: string; closed: boolean };
    thursday: { open: string; close: string; closed: boolean };
    friday: { open: string; close: string; closed: boolean };
    saturday: { open: string; close: string; closed: boolean };
    sunday: { open: string; close: string; closed: boolean };
  };
  amenities: string[];
  insurance: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClinicRequest {
  name: string;
  description?: string;
  address: Clinic['address'];
  phone: string;
  email?: string;
  website?: string;
  type: Clinic['type'];
  specialties: string[];
  services: string[];
  operatingHours: Clinic['operatingHours'];
  amenities?: string[];
  insurance?: string[];
}

export interface UpdateClinicRequest {
  name?: string;
  description?: string;
  address?: Partial<Clinic['address']>;
  phone?: string;
  email?: string;
  website?: string;
  type?: Clinic['type'];
  specialties?: string[];
  services?: string[];
  operatingHours?: Partial<Clinic['operatingHours']>;
  amenities?: string[];
  insurance?: string[];
}

export interface ClinicFilters {
  type?: string;
  specialties?: string[];
  services?: string[];
  city?: string;
  state?: string;
  insurance?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export interface ClinicStats {
  total: number;
  active: number;
  inactive: number;
  byType: Record<string, number>;
  bySpecialty: Record<string, number>;
}

export interface NearbyClinicRequest {
  latitude: number;
  longitude: number;
  radius?: number; // en kilómetros
  type?: string;
  specialties?: string[];
}

class ClinicService {
  // Obtener todas las clínicas
  async getAllClinics(filters: ClinicFilters = {}): Promise<Clinic[]> {
    try {
      const token = await authService.getStoredToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach(v => queryParams.append(key, v));
          } else {
            queryParams.append(key, value.toString());
          }
        }
      });

      const endpoint = `/clinics?${queryParams.toString()}`;
      const response = await api.get<Clinic[]>(endpoint, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      return response;
    } catch (error) {
      console.error('Get all clinics error:', error);
      throw error;
    }
  }

  // Obtener clínica por ID
  async getClinicById(clinicId: string): Promise<Clinic> {
    try {
      const token = await authService.getStoredToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await api.get<Clinic>(`/clinics/${clinicId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      return response;
    } catch (error) {
      console.error('Get clinic error:', error);
      throw error;
    }
  }

  // Crear nueva clínica
  async createClinic(clinicData: CreateClinicRequest): Promise<Clinic> {
    try {
      const token = await authService.getStoredToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await api.post<Clinic>('/clinics', clinicData, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      return response;
    } catch (error) {
      console.error('Create clinic error:', error);
      throw error;
    }
  }

  // Actualizar clínica
  async updateClinic(clinicId: string, updateData: UpdateClinicRequest): Promise<Clinic> {
    try {
      const token = await authService.getStoredToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await api.put<Clinic>(`/clinics/${clinicId}`, updateData, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      return response;
    } catch (error) {
      console.error('Update clinic error:', error);
      throw error;
    }
  }

  // Desactivar clínica
  async deactivateClinic(clinicId: string): Promise<{ message: string }> {
    try {
      const token = await authService.getStoredToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await api.delete<{ message: string }>(`/clinics/${clinicId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      return response;
    } catch (error) {
      console.error('Deactivate clinic error:', error);
      throw error;
    }
  }

  // Reactivar clínica
  async reactivateClinic(clinicId: string): Promise<{ message: string }> {
    try {
      const token = await authService.getStoredToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await api.post<{ message: string }>(`/clinics/${clinicId}/reactivate`, {}, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      return response;
    } catch (error) {
      console.error('Reactivate clinic error:', error);
      throw error;
    }
  }

  // Obtener tipos de clínicas disponibles
  async getClinicTypes(): Promise<string[]> {
    try {
      const token = await authService.getStoredToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await api.get<{ types: string[] }>('/clinics/types/list', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      return response.types;
    } catch (error) {
      console.error('Get clinic types error:', error);
      throw error;
    }
  }

  // Obtener especialidades disponibles
  async getClinicSpecialties(): Promise<string[]> {
    try {
      const token = await authService.getStoredToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await api.get<{ specialties: string[] }>('/clinics/specialties/list', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      return response.specialties;
    } catch (error) {
      console.error('Get clinic specialties error:', error);
      throw error;
    }
  }

  // Obtener estadísticas de clínicas
  async getClinicStats(): Promise<ClinicStats> {
    try {
      const token = await authService.getStoredToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await api.get<ClinicStats>('/clinics/stats/overview', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      return response;
    } catch (error) {
      console.error('Get clinic stats error:', error);
      throw error;
    }
  }

  // Buscar clínicas avanzado
  async searchClinics(searchQuery: string, filters: ClinicFilters = {}): Promise<Clinic[]> {
    try {
      const token = await authService.getStoredToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const queryParams = new URLSearchParams({ q: searchQuery, ...filters });
      const endpoint = `/clinics/search/advanced?${queryParams.toString()}`;
      
      const response = await api.get<Clinic[]>(endpoint, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      return response;
    } catch (error) {
      console.error('Search clinics error:', error);
      throw error;
    }
  }

  // Obtener clínicas cercanas
  async getNearbyClinics(locationData: NearbyClinicRequest): Promise<Clinic[]> {
    try {
      const token = await authService.getStoredToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await api.post<Clinic[]>('/clinics/nearby', locationData, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      return response;
    } catch (error) {
      console.error('Get nearby clinics error:', error);
      throw error;
    }
  }

  // Obtener clínicas por especialidad
  async getClinicsBySpecialty(specialty: string, filters: Omit<ClinicFilters, 'specialties'> = {}): Promise<Clinic[]> {
    try {
      const token = await authService.getStoredToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const queryParams = new URLSearchParams({ specialty, ...filters });
      const endpoint = `/clinics/by-specialty?${queryParams.toString()}`;
      
      const response = await api.get<Clinic[]>(endpoint, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      return response;
    } catch (error) {
      console.error('Get clinics by specialty error:', error);
      throw error;
    }
  }

  // Obtener clínicas por tipo
  async getClinicsByType(type: string, filters: Omit<ClinicFilters, 'type'> = {}): Promise<Clinic[]> {
    try {
      const token = await authService.getStoredToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const queryParams = new URLSearchParams({ type, ...filters });
      const endpoint = `/clinics/by-type?${queryParams.toString()}`;
      
      const response = await api.get<Clinic[]>(endpoint, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      return response;
    } catch (error) {
      console.error('Get clinics by type error:', error);
      throw error;
    }
  }

  // Obtener clínicas por ciudad
  async getClinicsByCity(city: string, filters: Omit<ClinicFilters, 'city'> = {}): Promise<Clinic[]> {
    try {
      const token = await authService.getStoredToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const queryParams = new URLSearchParams({ city, ...filters });
      const endpoint = `/clinics/by-city?${queryParams.toString()}`;
      
      const response = await api.get<Clinic[]>(endpoint, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      return response;
    } catch (error) {
      console.error('Get clinics by city error:', error);
      throw error;
    }
  }
}

export default new ClinicService();
