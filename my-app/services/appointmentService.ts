import api, { createAuthHeaders } from './api';
import authService from './authService';

export interface Appointment {
  _id: string;
  clientId: string;
  professionalId: string;
  serviceId: string;
  clinicId: string;
  date: string;
  time: string;
  duration: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  notes?: string;
  clientNotes?: string;
  professionalNotes?: string;
  createdAt: string;
  updatedAt: string;
  // Campos populados
  client?: {
    _id: string;
    fullName: string;
    email: string;
    phone: string;
  };
  professional?: {
    _id: string;
    fullName: string;
    email: string;
    phone: string;
    service: string;
  };
  service?: {
    _id: string;
    name: string;
    description: string;
    price: number;
    duration: number;
  };
  clinic?: {
    _id: string;
    name: string;
    address: string;
    city: string;
    phone: string;
  };
}

export interface CreateAppointmentRequest {
  professionalId: string;
  serviceId: string;
  clinicId: string;
  date: string;
  time: string;
  notes?: string;
  clientNotes?: string;
}

export interface UpdateAppointmentRequest {
  date?: string;
  time?: string;
  notes?: string;
  clientNotes?: string;
  professionalNotes?: string;
}

export interface AppointmentFilters {
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  professionalId?: string;
  serviceId?: string;
  clinicId?: string;
  page?: number;
  limit?: number;
}

export interface AvailableSlot {
  date: string;
  time: string;
  available: boolean;
  reason?: string;
}

export interface AppointmentStats {
  total: number;
  pending: number;
  confirmed: number;
  cancelled: number;
  completed: number;
  upcoming: number;
}

class AppointmentService {
  // Obtener todas las citas del usuario
  async getUserAppointments(filters: AppointmentFilters = {}): Promise<Appointment[]> {
    try {
      const token = await authService.getStoredToken();
      
      // Si hay token, intentar obtener del backend
      if (token) {
        try {
          const queryParams = new URLSearchParams();
          Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
              queryParams.append(key, value.toString());
            }
          });

          const endpoint = `/appointments/user?${queryParams.toString()}`;
          const response = await api.get<Appointment[]>(endpoint, createAuthHeaders(token));
          return response;
        } catch (backendError) {
          console.warn('Error obteniendo citas del backend, usando fallback:', backendError);
        }
      }

      // Fallback: datos de citas para testing
      console.log('📱 Usando citas de fallback para testing');
      return this.getFallbackAppointments(filters);
      
    } catch (error) {
      console.error('Get user appointments error:', error);
      // En caso de error, devolver citas de fallback
      return this.getFallbackAppointments(filters);
    }
  }

  // Obtener cita por ID
  async getAppointmentById(appointmentId: string): Promise<Appointment> {
    try {
      const token = await authService.getStoredToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await api.get<Appointment>(`/appointments/${appointmentId}`, createAuthHeaders(token));
      return response;
    } catch (error) {
      console.error('Get appointment error:', error);
      throw error;
    }
  }

  // Crear nueva cita
  async createAppointment(appointmentData: CreateAppointmentRequest): Promise<Appointment> {
    try {
      const token = await authService.getStoredToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await api.post<Appointment>('/appointments', appointmentData, createAuthHeaders(token));
      return response;
    } catch (error) {
      console.error('Create appointment error:', error);
      throw error;
    }
  }

  // Actualizar cita
  async updateAppointment(appointmentId: string, updateData: UpdateAppointmentRequest): Promise<Appointment> {
    try {
      const token = await authService.getStoredToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await api.put<Appointment>(`/appointments/${appointmentId}`, updateData, createAuthHeaders(token));
      return response;
    } catch (error) {
      console.error('Update appointment error:', error);
      throw error;
    }
  }

  // Cancelar cita
  async cancelAppointment(appointmentId: string, reason?: string): Promise<{ message: string }> {
    try {
      const token = await authService.getStoredToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await api.post<{ message: string }>(`/appointments/${appointmentId}/cancel`, { reason }, createAuthHeaders(token));
      return response;
    } catch (error) {
      console.error('Cancel appointment error:', error);
      throw error;
    }
  }

  // Confirmar cita
  async confirmAppointment(appointmentId: string): Promise<{ message: string }> {
    try {
      const token = await authService.getStoredToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await api.post<{ message: string }>(`/appointments/${appointmentId}/confirm`, {}, createAuthHeaders(token));
      return response;
    } catch (error) {
      console.error('Confirm appointment error:', error);
      throw error;
    }
  }

  // Marcar cita como completada
  async completeAppointment(appointmentId: string, notes?: string): Promise<{ message: string }> {
    try {
      const token = await authService.getStoredToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await api.post<{ message: string }>(`/appointments/${appointmentId}/complete`, { notes }, createAuthHeaders(token));
      return response;
    } catch (error) {
      console.error('Complete appointment error:', error);
      throw error;
    }
  }

  // Obtener slots disponibles
  async getAvailableSlots(professionalId: string, serviceId: string, date: string): Promise<AvailableSlot[]> {
    try {
      const token = await authService.getStoredToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const queryParams = new URLSearchParams({
        professionalId,
        serviceId,
        date
      });

      const endpoint = `/appointments/available-slots?${queryParams.toString()}`;
      const response = await api.get<AvailableSlot[]>(endpoint, createAuthHeaders(token));
      return response;
    } catch (error) {
      console.error('Get available slots error:', error);
      throw error;
    }
  }

  // Obtener estadísticas de citas
  async getAppointmentStats(): Promise<AppointmentStats> {
    try {
      const token = await authService.getStoredToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await api.get<AppointmentStats>('/appointments/stats', createAuthHeaders(token));
      return response;
    } catch (error) {
      console.error('Get appointment stats error:', error);
      throw error;
    }
  }

  // Obtener citas por profesional
  async getAppointmentsByProfessional(professionalId: string, filters: AppointmentFilters = {}): Promise<Appointment[]> {
    try {
      const token = await authService.getStoredToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const queryParams = new URLSearchParams({ professionalId });
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });

      const endpoint = `/appointments/professional?${queryParams.toString()}`;
      const response = await api.get<Appointment[]>(endpoint, createAuthHeaders(token));
      return response;
    } catch (error) {
      console.error('Get appointments by professional error:', error);
      throw error;
    }
  }

  // Obtener citas por clínica
  async getAppointmentsByClinic(clinicId: string, filters: AppointmentFilters = {}): Promise<Appointment[]> {
    try {
      const token = await authService.getStoredToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const queryParams = new URLSearchParams({ clinicId });
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });

      const endpoint = `/appointments/clinic?${queryParams.toString()}`;
      const response = await api.get<Appointment[]>(endpoint, createAuthHeaders(token));
      return response;
    } catch (error) {
      console.error('Get appointments by clinic error:', error);
      throw error;
    }
  }

  // Método privado para obtener citas de fallback
  private getFallbackAppointments(filters: AppointmentFilters = {}): Appointment[] {
    const fallbackAppointments: Appointment[] = [
      {
        _id: 'appointment_001',
        clientId: 'client_001',
        professionalId: 'prof_001',
        serviceId: 'service_001',
        clinicId: 'clinic_001',
        date: '2024-01-15',
        time: '15:30',
        duration: 60,
        status: 'confirmed',
        notes: 'Primera consulta psicológica',
        clientNotes: 'Llegar 10 minutos antes',
        professionalNotes: 'Paciente nuevo, primera consulta',
        createdAt: '2024-01-10T10:00:00.000Z',
        updatedAt: '2024-01-10T10:00:00.000Z',
        client: {
          _id: 'client_001',
          fullName: 'Juan Pérez',
          email: 'juan.perez@email.com',
          phone: '+5491112345678'
        },
        professional: {
          _id: 'prof_001',
          fullName: 'Dr. Ana Martínez',
          email: 'ana.martinez@clinic.com',
          phone: '+5491187654321',
          service: 'Psicología Clínica'
        },
        service: {
          _id: 'service_001',
          name: 'Consulta Psicológica',
          description: 'Sesión de terapia psicológica individual',
          price: 5000,
          duration: 60
        },
        clinic: {
          _id: 'clinic_001',
          name: 'Centro de Salud Mental',
          address: 'Av. Corrientes 1234',
          city: 'Buenos Aires',
          phone: '+5491145678901'
        }
      },
      {
        _id: 'appointment_002',
        clientId: 'client_002',
        professionalId: 'prof_002',
        serviceId: 'service_002',
        clinicId: 'clinic_002',
        date: '2024-01-16',
        time: '10:00',
        duration: 30,
        status: 'pending',
        notes: 'Consulta médica general',
        clientNotes: 'Traer estudios previos',
        professionalNotes: '',
        createdAt: '2024-01-11T14:00:00.000Z',
        updatedAt: '2024-01-11T14:00:00.000Z',
        client: {
          _id: 'client_002',
          fullName: 'María González',
          email: 'maria.gonzalez@email.com',
          phone: '+5491123456789'
        },
        professional: {
          _id: 'prof_002',
          fullName: 'Dr. Carlos López',
          email: 'carlos.lopez@clinic.com',
          phone: '+5491198765432',
          service: 'Medicina General'
        },
        service: {
          _id: 'service_002',
          name: 'Consulta Médica General',
          description: 'Consulta médica de medicina general',
          price: 8000,
          duration: 30
        },
        clinic: {
          _id: 'clinic_002',
          name: 'Clínica San Martín',
          address: 'Calle San Martín 567',
          city: 'Buenos Aires',
          phone: '+5491156789012'
        }
      },
      {
        _id: 'appointment_003',
        clientId: 'client_003',
        professionalId: 'prof_003',
        serviceId: 'service_003',
        clinicId: 'clinic_003',
        date: '2024-01-17',
        time: '16:00',
        duration: 45,
        status: 'confirmed',
        notes: 'Corte y peinado',
        clientNotes: 'Llegar con cabello limpio',
        professionalNotes: 'Cliente regular',
        createdAt: '2024-01-12T09:00:00.000Z',
        updatedAt: '2024-01-12T09:00:00.000Z',
        client: {
          _id: 'client_003',
          fullName: 'Laura Fernández',
          email: 'laura.fernandez@email.com',
          phone: '+5491134567890'
        },
        professional: {
          _id: 'prof_003',
          fullName: 'Sofía Rodríguez',
          email: 'sofia.rodriguez@salon.com',
          phone: '+5491109876543',
          service: 'Peluquería'
        },
        service: {
          _id: 'service_003',
          name: 'Corte de Cabello',
          description: 'Corte y peinado profesional',
          price: 3000,
          duration: 45
        },
        clinic: {
          _id: 'clinic_003',
          name: 'Salón de Belleza Elegante',
          address: 'Av. Santa Fe 789',
          city: 'Buenos Aires',
          phone: '+5491167890123'
        }
      }
    ];

    // Aplicar filtros básicos
    let filteredAppointments = fallbackAppointments;

    if (filters.status) {
      filteredAppointments = filteredAppointments.filter(a => a.status === filters.status);
    }

    if (filters.dateFrom) {
      filteredAppointments = filteredAppointments.filter(a => a.date >= filters.dateFrom!);
    }

    if (filters.dateTo) {
      filteredAppointments = filteredAppointments.filter(a => a.date <= filters.dateTo!);
    }

    if (filters.professionalId) {
      filteredAppointments = filteredAppointments.filter(a => a.professionalId === filters.professionalId);
    }

    if (filters.serviceId) {
      filteredAppointments = filteredAppointments.filter(a => a.serviceId === filters.serviceId);
    }

    if (filters.clinicId) {
      filteredAppointments = filteredAppointments.filter(a => a.clinicId === filters.clinicId);
    }

    return filteredAppointments;
  }
}

export default new AppointmentService();
