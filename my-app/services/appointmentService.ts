import { BACKEND_CONFIG } from '../config/backend';
import { api, showApiError } from './api';
import { simpleAuthService } from './simpleAuthService';

// Tipos para citas
export interface Appointment {
  _id: string;
  clientId: string;
  professionalId: string;
  serviceId: string;
  clinicId?: string;
  date: string;
  time: string;
  duration: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  notes?: string;
  clientNotes?: string;
  professionalNotes?: string;
  price: number;
  paymentStatus: 'pending' | 'paid' | 'refunded';
  createdAt: string;
  updatedAt: string;
  client?: {
    _id: string;
    fullName: string;
    email: string;
    phone?: string;
  };
  professional?: {
    _id: string;
    fullName: string;
    email: string;
    phone?: string;
    specialties?: string[];
  };
  service?: {
    _id: string;
    name: string;
    description: string;
    duration: number;
    price: number;
  };
  clinic?: {
    _id: string;
    name: string;
    address: string;
    phone?: string;
  };
}

export interface CreateAppointmentData {
  professionalId: string;
  serviceId: string;
  clinicId?: string;
  date: string;
  time: string;
  notes?: string;
  clientNotes?: string;
}

export interface UpdateAppointmentData {
  date?: string;
  time?: string;
  notes?: string;
  clientNotes?: string;
  professionalNotes?: string;
  status?: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
}

export interface AvailableSlot {
  date: string;
  time: string;
  available: boolean;
  duration: number;
}

export interface AppointmentStats {
  total: number;
  pending: number;
  confirmed: number;
  completed: number;
  cancelled: number;
  noShow: number;
  totalRevenue: number;
  averageRating: number;
}

export interface AppointmentFilters {
  status?: string;
  professionalId?: string;
  serviceId?: string;
  clinicId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

class AppointmentService {
  // Obtener citas del usuario (alias para getAppointments)
  async getUserAppointments(filters: AppointmentFilters = {}): Promise<{
    appointments: Appointment[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    return this.getAppointments(filters);
  }

  // Obtener citas del usuario
  async getAppointments(filters: AppointmentFilters = {}): Promise<{
    appointments: Appointment[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const headers = simpleAuthService.getAuthHeaders();
      if (!headers) {
        throw new Error('No hay token de autenticación');
      }

      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });

      console.log(`🔍 Debug - BACKEND_CONFIG completo:`, BACKEND_CONFIG);
      console.log(`🔍 Debug - BACKEND_CONFIG.ENDPOINTS:`, BACKEND_CONFIG.ENDPOINTS);
      console.log(`🔍 Debug - BACKEND_CONFIG.ENDPOINTS.APPOINTMENTS:`, BACKEND_CONFIG.ENDPOINTS.APPOINTMENTS);
      console.log(`🔍 Debug - BACKEND_CONFIG.ENDPOINTS.APPOINTMENTS.BASE:`, BACKEND_CONFIG.ENDPOINTS.APPOINTMENTS.BASE);
      
      const endpoint = `${BACKEND_CONFIG.ENDPOINTS.APPOINTMENTS.BASE}?${queryParams.toString()}`;
      console.log(`🔍 Debug - appointments endpoint: ${endpoint}`);
      
      const response = await api.get<{
        appointments: Appointment[];
        total: number;
        page: number;
        totalPages: number;
      }>(
        endpoint,
        headers
      );

      return response;
    } catch (error) {
      console.error('Error obteniendo citas:', error);
      
      // Si es un error de red, devolver datos de fallback
      if (error instanceof Error && error.message.includes('Network request failed')) {
        console.log('📱 Usando datos de fallback para citas...');
        return this.getFallbackAppointments(filters);
      }
      
      showApiError(error, 'Error obteniendo citas');
      throw error;
    }
  }

  // Datos de fallback cuando no hay conexión
  private getFallbackAppointments(filters: AppointmentFilters = {}): {
    appointments: Appointment[];
    total: number;
    page: number;
    totalPages: number;
  } {
    const mockAppointments: Appointment[] = [
      {
        _id: '1',
        clientId: 'client1',
        professionalId: 'prof1',
        serviceId: 'service1',
        clinicId: 'clinic1',
        date: '2024-01-20',
        time: '10:00',
        duration: 60,
        status: 'confirmed',
        notes: 'Consulta de seguimiento',
        price: 15000,
        paymentStatus: 'paid',
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-15T10:00:00Z',
        client: {
          _id: 'client1',
          fullName: 'Ana Martínez',
          email: 'ana.martinez@email.com',
          phone: '+54 9 11 1234-5678'
        },
        professional: {
          _id: 'prof1',
          fullName: 'Dr. Juan Pérez',
          email: 'juan.perez@email.com',
          phone: '+54 9 11 9876-5432',
          specialties: ['Psicología']
        },
        service: {
          _id: 'service1',
          name: 'Consulta Psicológica',
          description: 'Sesión de terapia individual',
          duration: 60,
          price: 15000
        },
        clinic: {
          _id: 'clinic1',
          name: 'Centro Médico Central',
          address: 'Av. Corrientes 1234, CABA',
          phone: '+54 9 11 5555-0000'
        }
      },
      {
        _id: '2',
        clientId: 'client2',
        professionalId: 'prof1',
        serviceId: 'service2',
        clinicId: 'clinic1',
        date: '2024-01-21',
        time: '14:00',
        duration: 45,
        status: 'pending',
        notes: 'Primera consulta',
        price: 12000,
        paymentStatus: 'pending',
        createdAt: '2024-01-16T14:00:00Z',
        updatedAt: '2024-01-16T14:00:00Z',
        client: {
          _id: 'client2',
          fullName: 'María González',
          email: 'maria.gonzalez@email.com',
          phone: '+54 9 11 3456-7890'
        },
        professional: {
          _id: 'prof1',
          fullName: 'Dr. Juan Pérez',
          email: 'juan.perez@email.com',
          phone: '+54 9 11 9876-5432',
          specialties: ['Psicología']
        },
        service: {
          _id: 'service2',
          name: 'Consulta Médica General',
          description: 'Consulta médica general',
          duration: 45,
          price: 12000
        },
        clinic: {
          _id: 'clinic1',
          name: 'Centro Médico Central',
          address: 'Av. Corrientes 1234, CABA',
          phone: '+54 9 11 5555-0000'
        }
      }
    ];

    // Aplicar filtros básicos
    let filteredAppointments = mockAppointments;
    
    if (filters.status) {
      filteredAppointments = filteredAppointments.filter(apt => apt.status === filters.status);
    }
    
    if (filters.professionalId) {
      filteredAppointments = filteredAppointments.filter(apt => apt.professionalId === filters.professionalId);
    }

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const total = filteredAppointments.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    
    const appointments = filteredAppointments.slice(startIndex, endIndex);

    return {
      appointments,
      total,
      page,
      totalPages
    };
  }

  // Obtener una cita específica
  async getAppointment(appointmentId: string): Promise<Appointment> {
    try {
      const headers = simpleAuthService.getAuthHeaders();
      if (!headers) {
        throw new Error('No hay token de autenticación');
      }

      const response = await api.get<Appointment>(
        `${BACKEND_CONFIG.ENDPOINTS.APPOINTMENTS.BASE}/${appointmentId}`,
        headers
      );

      return response;
    } catch (error) {
      console.error('Error obteniendo cita:', error);
      showApiError(error, 'Error obteniendo cita');
      throw error;
    }
  }

  // Crear nueva cita
  async createAppointment(appointmentData: CreateAppointmentData): Promise<Appointment> {
    try {
      const headers = simpleAuthService.getAuthHeaders();
      if (!headers) {
        throw new Error('No hay token de autenticación');
      }

      const response = await api.post<Appointment>(
        BACKEND_CONFIG.ENDPOINTS.APPOINTMENTS.BASE,
        appointmentData,
        headers
      );

      return response;
    } catch (error) {
      console.error('Error creando cita:', error);
      showApiError(error, 'Error creando cita');
      throw error;
    }
  }

  // Actualizar cita
  async updateAppointment(
    appointmentId: string,
    appointmentData: UpdateAppointmentData
  ): Promise<Appointment> {
    try {
      const headers = simpleAuthService.getAuthHeaders();
      if (!headers) {
        throw new Error('No hay token de autenticación');
      }

      const response = await api.put<Appointment>(
        `${BACKEND_CONFIG.ENDPOINTS.APPOINTMENTS.BASE}/${appointmentId}`,
        appointmentData,
        headers
      );

      return response;
    } catch (error) {
      console.error('Error actualizando cita:', error);
      showApiError(error, 'Error actualizando cita');
      throw error;
    }
  }

  // Cancelar cita
  async cancelAppointment(appointmentId: string, reason?: string): Promise<Appointment> {
    try {
      const headers = simpleAuthService.getAuthHeaders();
      if (!headers) {
        throw new Error('No hay token de autenticación');
      }

      const response = await api.patch<Appointment>(
        `${BACKEND_CONFIG.ENDPOINTS.APPOINTMENTS.BASE}/${appointmentId}/cancel`,
        { reason },
        headers
      );

      return response;
    } catch (error) {
      console.error('Error cancelando cita:', error);
      showApiError(error, 'Error cancelando cita');
      throw error;
    }
  }

  // Confirmar cita
  async confirmAppointment(appointmentId: string): Promise<Appointment> {
    try {
      const headers = simpleAuthService.getAuthHeaders();
      if (!headers) {
        throw new Error('No hay token de autenticación');
      }

      const response = await api.patch<Appointment>(
        `${BACKEND_CONFIG.ENDPOINTS.APPOINTMENTS.BASE}/${appointmentId}/confirm`,
        {},
        headers
      );

      return response;
    } catch (error) {
      console.error('Error confirmando cita:', error);
      showApiError(error, 'Error confirmando cita');
      throw error;
    }
  }

  // Obtener horarios disponibles
  async getAvailableSlots(
    professionalId: string,
    serviceId: string,
    date: string
  ): Promise<AvailableSlot[]> {
    try {
      const headers = simpleAuthService.getAuthHeaders();
      if (!headers) {
        throw new Error('No hay token de autenticación');
      }

      const response = await api.get<AvailableSlot[]>(
        `${BACKEND_CONFIG.ENDPOINTS.APPOINTMENTS.AVAILABLE_SLOTS}?professionalId=${professionalId}&serviceId=${serviceId}&date=${date}`,
        headers
      );

      return response;
    } catch (error) {
      console.error('Error obteniendo horarios disponibles:', error);
      showApiError(error, 'Error obteniendo horarios');
      throw error;
    }
  }

  // Obtener estadísticas de citas
  async getAppointmentStats(): Promise<AppointmentStats> {
    try {
      const headers = simpleAuthService.getAuthHeaders();
      if (!headers) {
        throw new Error('No hay token de autenticación');
      }

      const response = await api.get<AppointmentStats>(
        BACKEND_CONFIG.ENDPOINTS.APPOINTMENTS.STATS,
        headers
      );

      return response;
    } catch (error) {
      console.error('Error obteniendo estadísticas de citas:', error);
      showApiError(error, 'Error obteniendo estadísticas');
      throw error;
    }
  }

  // Obtener citas del día
  async getTodayAppointments(): Promise<Appointment[]> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await this.getAppointments({
        dateFrom: today,
        dateTo: today,
        limit: 50
      });

      return response.appointments;
    } catch (error) {
      console.error('Error obteniendo citas del día:', error);
      showApiError(error, 'Error obteniendo citas del día');
      throw error;
    }
  }

  // Obtener próximas citas
  async getUpcomingAppointments(limit: number = 10): Promise<Appointment[]> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await this.getAppointments({
        dateFrom: today,
        status: 'confirmed',
        limit,
        sortBy: 'date',
        sortOrder: 'asc'
      });

      return response.appointments;
    } catch (error) {
      console.error('Error obteniendo próximas citas:', error);
      showApiError(error, 'Error obteniendo próximas citas');
      throw error;
    }
  }

  // Marcar cita como completada
  async completeAppointment(
    appointmentId: string,
    professionalNotes?: string
  ): Promise<Appointment> {
    try {
      const headers = simpleAuthService.getAuthHeaders();
      if (!headers) {
        throw new Error('No hay token de autenticación');
      }

      const response = await api.patch<Appointment>(
        `${BACKEND_CONFIG.ENDPOINTS.APPOINTMENTS.BASE}/${appointmentId}/complete`,
        { professionalNotes },
        headers
      );

      return response;
    } catch (error) {
      console.error('Error completando cita:', error);
      showApiError(error, 'Error completando cita');
      throw error;
    }
  }

  // Marcar cita como no asistió
  async markNoShow(appointmentId: string, reason?: string): Promise<Appointment> {
    try {
      const headers = simpleAuthService.getAuthHeaders();
      if (!headers) {
        throw new Error('No hay token de autenticación');
      }

      const response = await api.patch<Appointment>(
        `${BACKEND_CONFIG.ENDPOINTS.APPOINTMENTS.BASE}/${appointmentId}/no-show`,
        { reason },
        headers
      );

      return response;
    } catch (error) {
      console.error('Error marcando no asistió:', error);
      showApiError(error, 'Error marcando no asistió');
      throw error;
    }
  }
}

// Instancia singleton
export const appointmentService = new AppointmentService();

export default appointmentService;