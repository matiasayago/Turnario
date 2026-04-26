import { Appointment, AppointmentFilters } from './appointmentService';

// Datos mock para citas
const mockAppointments: Appointment[] = [
  {
    _id: '507f1f77bcf86cd799439013',
    clientId: '507f1f77bcf86cd799439011',
    professionalId: '507f1f77bcf86cd799439020',
    serviceId: '507f1f77bcf86cd799439014',
    clinicId: '507f1f77bcf86cd799439015',
    date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    time: '10:00',
    duration: 30,
    status: 'confirmed',
    notes: 'Cita de prueba',
    clientNotes: 'Primera consulta',
    price: 5000,
    paymentStatus: 'paid',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    client: {
      _id: '507f1f77bcf86cd799439011',
      fullName: 'Usuario Demo',
      email: 'demo@turnario.com',
      phone: '+56912345678'
    },
    professional: {
      _id: '507f1f77bcf86cd799439020',
      fullName: 'Dr. Juan Pérez',
      email: 'juan.perez@turnario.com',
      phone: '+56987654321',
      specialties: ['Medicina General']
    },
    service: {
      _id: '507f1f77bcf86cd799439014',
      name: 'Consulta General',
      description: 'Consulta médica general',
      duration: 30,
      price: 5000
    },
    clinic: {
      _id: '507f1f77bcf86cd799439015',
      name: 'Clínica Demo',
      address: 'Av. Principal 123',
      phone: '+56912345678'
    }
  },
  {
    _id: '507f1f77bcf86cd799439016',
    clientId: '507f1f77bcf86cd799439011',
    professionalId: '507f1f77bcf86cd799439021',
    serviceId: '507f1f77bcf86cd799439017',
    clinicId: '507f1f77bcf86cd799439015',
    date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    time: '14:30',
    duration: 45,
    status: 'pending',
    notes: 'Seguimiento',
    price: 7500,
    paymentStatus: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    client: {
      _id: '507f1f77bcf86cd799439011',
      fullName: 'Usuario Demo',
      email: 'demo@turnario.com',
      phone: '+56912345678'
    },
    professional: {
      _id: '507f1f77bcf86cd799439021',
      fullName: 'Dra. María González',
      email: 'maria.gonzalez@turnario.com',
      phone: '+56987654322',
      specialties: ['Cardiología']
    },
    service: {
      _id: '507f1f77bcf86cd799439017',
      name: 'Consulta Cardiológica',
      description: 'Consulta especializada en cardiología',
      duration: 45,
      price: 7500
    },
    clinic: {
      _id: '507f1f77bcf86cd799439015',
      name: 'Clínica Demo',
      address: 'Av. Principal 123',
      phone: '+56912345678'
    }
  }
];

class MockAppointmentService {
  // Simular delay de red
  private delay(ms: number = 500): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Obtener citas del usuario
  async getUserAppointments(filters: AppointmentFilters = {}): Promise<{
    appointments: Appointment[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    await this.delay();
    
    let filteredAppointments = [...mockAppointments];
    
    // Aplicar filtros
    if (filters.status) {
      filteredAppointments = filteredAppointments.filter(
        apt => apt.status === filters.status
      );
    }
    
    if (filters.professionalId) {
      filteredAppointments = filteredAppointments.filter(
        apt => apt.professionalId === filters.professionalId
      );
    }
    
    if (filters.serviceId) {
      filteredAppointments = filteredAppointments.filter(
        apt => apt.serviceId === filters.serviceId
      );
    }
    
    if (filters.dateFrom) {
      filteredAppointments = filteredAppointments.filter(
        apt => apt.date >= filters.dateFrom!
      );
    }
    
    if (filters.dateTo) {
      filteredAppointments = filteredAppointments.filter(
        apt => apt.date <= filters.dateTo!
      );
    }
    
    // Paginación
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    
    const paginatedAppointments = filteredAppointments.slice(startIndex, endIndex);
    const totalPages = Math.ceil(filteredAppointments.length / limit);
    
    return {
      appointments: paginatedAppointments,
      total: filteredAppointments.length,
      page,
      totalPages
    };
  }

  // Obtener una cita específica
  async getAppointment(appointmentId: string): Promise<Appointment> {
    await this.delay();
    
    const appointment = mockAppointments.find(apt => apt._id === appointmentId);
    if (!appointment) {
      throw new Error('Cita no encontrada');
    }
    
    return appointment;
  }

  // Crear nueva cita
  async createAppointment(appointmentData: any): Promise<Appointment> {
    await this.delay();
    
    const newAppointment: Appointment = {
      _id: '507f1f77bcf86cd799439' + Math.random().toString(36).substr(2, 9),
      clientId: '507f1f77bcf86cd799439011',
      professionalId: appointmentData.professionalId,
      serviceId: appointmentData.serviceId,
      clinicId: appointmentData.clinicId,
      date: appointmentData.date,
      time: appointmentData.time,
      duration: 30,
      status: 'pending',
      notes: appointmentData.notes,
      clientNotes: appointmentData.clientNotes,
      price: 5000,
      paymentStatus: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    mockAppointments.push(newAppointment);
    return newAppointment;
  }

  // Obtener citas del día
  async getTodayAppointments(): Promise<Appointment[]> {
    await this.delay();
    
    const today = new Date().toISOString().split('T')[0];
    return mockAppointments.filter(apt => apt.date === today);
  }

  // Obtener próximas citas
  async getUpcomingAppointments(limit: number = 10): Promise<Appointment[]> {
    await this.delay();
    
    const today = new Date().toISOString().split('T')[0];
    return mockAppointments
      .filter(apt => apt.date >= today && apt.status === 'confirmed')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, limit);
  }

  // Obtener estadísticas
  async getAppointmentStats(): Promise<any> {
    await this.delay();
    
    const total = mockAppointments.length;
    const pending = mockAppointments.filter(apt => apt.status === 'pending').length;
    const confirmed = mockAppointments.filter(apt => apt.status === 'confirmed').length;
    const completed = mockAppointments.filter(apt => apt.status === 'completed').length;
    const cancelled = mockAppointments.filter(apt => apt.status === 'cancelled').length;
    const noShow = mockAppointments.filter(apt => apt.status === 'no_show').length;
    
    return {
      total,
      pending,
      confirmed,
      completed,
      cancelled,
      noShow,
      totalRevenue: mockAppointments.reduce((sum, apt) => sum + apt.price, 0),
      averageRating: 4.5
    };
  }
}

// Instancia singleton
export const mockAppointmentService = new MockAppointmentService();

export default mockAppointmentService;
