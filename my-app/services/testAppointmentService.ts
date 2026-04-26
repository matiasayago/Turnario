// @ts-nocheck — servicio de pruebas (beta)
import { createAuthHeaders } from './api';

// Tipos para citas (copiados del servicio original)
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
    description?: string;
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

export interface AppointmentFilters {
  clientId?: string;
  professionalId?: string;
  serviceId?: string;
  clinicId?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface CreateAppointmentData {
  clientId: string;
  professionalId: string;
  serviceId: string;
  clinicId?: string;
  date: string;
  time: string;
  duration: number;
  notes?: string;
  clientNotes?: string;
  price: number;
}

export interface UpdateAppointmentData {
  serviceId?: string;
  clinicId?: string;
  date?: string;
  time?: string;
  duration?: number;
  status?: string;
  notes?: string;
  clientNotes?: string;
  professionalNotes?: string;
  price?: number;
  paymentStatus?: string;
}

class TestAppointmentService {
  // Token de prueba para testing
  private testToken = 'test_token_for_development';

  // Obtener headers de autenticación para testing
  private getTestAuthHeaders(): Record<string, string> {
    return createAuthHeaders(this.testToken);
  }

  // Obtener todas las citas con filtros
  async getAppointments(filters: AppointmentFilters = {}): Promise<{
    appointments: Appointment[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    // SOLUCIÓN DEFINITIVA: NO hacer llamadas al backend, solo usar datos mock
    console.log('📱 TestAppointmentService: Usando datos locales (modo desarrollo)');
    
    // Retornar datos mock locales
    const mockAppointments: Appointment[] = [
      {
        _id: 'test_appointment_1',
        clientId: 'test_client_1',
        professionalId: 'test_professional_1',
        serviceId: 'test_service_1',
        clinicId: 'test_clinic_1',
        date: '2024-01-15',
        time: '10:00',
        duration: 30,
        status: 'pending',
        notes: 'Cita de prueba',
        clientNotes: 'Notas del cliente',
        professionalNotes: 'Notas del profesional',
        price: 50000,
        paymentStatus: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        service: { _id: 'test_service_1', name: 'Consulta General' },
        professional: { _id: 'test_professional_1', fullName: 'Dr. Carlos Mendoza' },
        client: { _id: 'test_client_1', fullName: 'Cliente de Prueba' }
      }
    ];
    
    return {
      appointments: mockAppointments,
      total: mockAppointments.length,
      page: 1,
      totalPages: 1
    };
  }

  // Obtener una cita por ID
  async getAppointmentById(id: string): Promise<Appointment> {
    // SOLUCIÓN DEFINITIVA: NO hacer llamadas al backend, solo usar datos mock
    console.log('📱 TestAppointmentService: Obteniendo cita localmente (modo desarrollo)');
    
    // Retornar cita mock local
    const mockAppointment: Appointment = {
      _id: id,
      clientId: 'test_client_1',
      professionalId: 'test_professional_1',
      serviceId: 'test_service_1',
      clinicId: 'test_clinic_1',
      date: '2024-01-15',
      time: '10:00',
      duration: 30,
      status: 'pending',
      notes: 'Cita de prueba',
      clientNotes: 'Notas del cliente',
      professionalNotes: 'Notas del profesional',
      price: 50000,
      paymentStatus: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      service: { _id: 'test_service_1', name: 'Consulta General' },
      professional: { _id: 'test_professional_1', fullName: 'Dr. Carlos Mendoza' },
      client: { _id: 'test_client_1', fullName: 'Cliente de Prueba' }
    };
    
    return mockAppointment;
  }

  // Crear una nueva cita
  async createAppointment(data: CreateAppointmentData): Promise<Appointment> {
    // SOLUCIÓN DEFINITIVA: NO hacer llamadas al backend, solo usar datos mock
    console.log('📱 TestAppointmentService: Creando cita localmente (modo desarrollo)');
    
    // Crear cita mock local
    const mockAppointment: Appointment = {
      _id: `test_appointment_${Date.now()}`,
      clientId: data.clientId || 'test_client_1',
      professionalId: data.professionalId,
      serviceId: data.serviceId,
      clinicId: data.clinicId || 'test_clinic_1',
      date: data.date,
      time: data.time,
      duration: data.duration || 30,
      status: 'pending',
      notes: data.notes || 'Cita creada localmente',
      clientNotes: data.clientNotes || '',
      professionalNotes: '',
      price: data.price || 50000,
      paymentStatus: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      service: { _id: data.serviceId, name: 'Servicio' },
      professional: { _id: data.professionalId, fullName: 'Profesional' },
      client: { _id: data.clientId || 'test_client_1', fullName: 'Cliente' }
    };
    
    console.log(`✅ Cita creada localmente: ${mockAppointment._id}`);
    return mockAppointment;
  }

  // Actualizar una cita
  async updateAppointment(id: string, data: UpdateAppointmentData): Promise<Appointment> {
    // SOLUCIÓN DEFINITIVA: NO hacer llamadas al backend, solo usar datos mock
    console.log('📱 TestAppointmentService: Actualizando cita localmente (modo desarrollo)');
    
    // Retornar cita mock actualizada
    const mockAppointment: Appointment = {
      _id: id,
      clientId: 'test_client_1',
      professionalId: 'test_professional_1',
      serviceId: 'test_service_1',
      clinicId: 'test_clinic_1',
      date: data.date || '2024-01-15',
      time: data.time || '10:00',
      duration: data.duration || 30,
      status: data.status || 'pending',
      notes: data.notes || 'Cita actualizada localmente',
      clientNotes: data.clientNotes || '',
      professionalNotes: data.professionalNotes || '',
      price: data.price || 50000,
      paymentStatus: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      service: { _id: 'test_service_1', name: 'Servicio' },
      professional: { _id: 'test_professional_1', fullName: 'Profesional' },
      client: { _id: 'test_client_1', fullName: 'Cliente' }
    };
    
    console.log(`✅ Cita actualizada localmente: ${mockAppointment._id}`);
    return mockAppointment;
  }

  // Eliminar una cita
  async deleteAppointment(id: string): Promise<void> {
    // SOLUCIÓN DEFINITIVA: NO hacer llamadas al backend, solo simular eliminación local
    console.log('📱 TestAppointmentService: Eliminando cita localmente (modo desarrollo)');
    console.log(`✅ Cita eliminada localmente: ${id}`);
  }

  // Confirmar una cita
  async confirmAppointment(id: string): Promise<Appointment> {
    // SOLUCIÓN DEFINITIVA: NO hacer llamadas al backend, solo usar datos mock
    console.log('📱 TestAppointmentService: Confirmando cita localmente (modo desarrollo)');
    
    const mockAppointment: Appointment = {
      _id: id,
      clientId: 'test_client_1',
      professionalId: 'test_professional_1',
      serviceId: 'test_service_1',
      clinicId: 'test_clinic_1',
      date: '2024-01-15',
      time: '10:00',
      duration: 30,
      status: 'confirmed',
      notes: 'Cita confirmada localmente',
      clientNotes: '',
      professionalNotes: '',
      price: 50000,
      paymentStatus: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      service: { _id: 'test_service_1', name: 'Servicio' },
      professional: { _id: 'test_professional_1', fullName: 'Profesional' },
      client: { _id: 'test_client_1', fullName: 'Cliente' }
    };
    
    console.log(`✅ Cita confirmada localmente: ${mockAppointment._id}`);
    return mockAppointment;
  }

  // Cancelar una cita
  async cancelAppointment(id: string): Promise<Appointment> {
    // SOLUCIÓN DEFINITIVA: NO hacer llamadas al backend, solo usar datos mock
    console.log('📱 TestAppointmentService: Cancelando cita localmente (modo desarrollo)');
    
    const mockAppointment: Appointment = {
      _id: id,
      clientId: 'test_client_1',
      professionalId: 'test_professional_1',
      serviceId: 'test_service_1',
      clinicId: 'test_clinic_1',
      date: '2024-01-15',
      time: '10:00',
      duration: 30,
      status: 'cancelled',
      notes: 'Cita cancelada localmente',
      clientNotes: '',
      professionalNotes: '',
      price: 50000,
      paymentStatus: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      service: { _id: 'test_service_1', name: 'Servicio' },
      professional: { _id: 'test_professional_1', fullName: 'Profesional' },
      client: { _id: 'test_client_1', fullName: 'Cliente' }
    };
    
    console.log(`✅ Cita cancelada localmente: ${mockAppointment._id}`);
    return mockAppointment;
  }

  // Marcar cita como completada
  async markAsCompleted(id: string): Promise<Appointment> {
    // SOLUCIÓN DEFINITIVA: NO hacer llamadas al backend, solo usar datos mock
    console.log('📱 TestAppointmentService: Completando cita localmente (modo desarrollo)');
    
    const mockAppointment: Appointment = {
      _id: id,
      clientId: 'test_client_1',
      professionalId: 'test_professional_1',
      serviceId: 'test_service_1',
      clinicId: 'test_clinic_1',
      date: '2024-01-15',
      time: '10:00',
      duration: 30,
      status: 'completed',
      notes: 'Cita completada localmente',
      clientNotes: '',
      professionalNotes: '',
      price: 50000,
      paymentStatus: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      service: { _id: 'test_service_1', name: 'Servicio' },
      professional: { _id: 'test_professional_1', fullName: 'Profesional' },
      client: { _id: 'test_client_1', fullName: 'Cliente' }
    };
    
    console.log(`✅ Cita completada localmente: ${mockAppointment._id}`);
    return mockAppointment;
  }

  // Obtener citas por profesional
  async getAppointmentsByProfessional(professionalId: string, filters: AppointmentFilters = {}): Promise<Appointment[]> {
    try {
      console.log(`🔍 Obteniendo citas del profesional ${professionalId} con token de prueba...`);
      
      const response = await this.getAppointments({
        ...filters,
        professionalId
      });

      console.log(`✅ Citas del profesional obtenidas: ${response.appointments.length} citas`);
      return response.appointments;
    } catch (error) {
      console.error('❌ Error obteniendo citas del profesional:', error);
      throw error;
    }
  }

  // Obtener citas por cliente
  async getAppointmentsByClient(clientId: string, filters: AppointmentFilters = {}): Promise<Appointment[]> {
    try {
      console.log(`🔍 Obteniendo citas del cliente ${clientId} con token de prueba...`);
      
      const response = await this.getAppointments({
        ...filters,
        clientId
      });

      console.log(`✅ Citas del cliente obtenidas: ${response.appointments.length} citas`);
      return response.appointments;
    } catch (error) {
      console.error('❌ Error obteniendo citas del cliente:', error);
      throw error;
    }
  }
}

// Instancia singleton
export const testAppointmentService = new TestAppointmentService();
export default testAppointmentService;
