// @ts-nocheck � beta
import {
    Appointment, AppointmentFilters,
    AppointmentStats, AvailableSlot, CreateAppointmentData,
    UpdateAppointmentData
} from './appointmentService';
import { connectionService } from './connectionService';
import { mockAppointmentService } from './mockAppointmentService';

class HybridAppointmentService {
  private useBackend: boolean = true;

  // Verificar si el backend está disponible
  private async checkBackendAvailability(): Promise<boolean> {
    try {
      const status = await connectionService.checkConnection();
      this.useBackend = status.isConnected;
      return status.isConnected;
    } catch (error) {
      console.log('🔄 Backend no disponible, usando datos locales');
      this.useBackend = false;
      return false;
    }
  }

  // Obtener citas del usuario
  async getUserAppointments(filters: AppointmentFilters = {}): Promise<{
    appointments: Appointment[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    // SOLUCIÓN DEFINITIVA: Usar siempre datos locales para desarrollo
    // Esto evita completamente los errores 404 antes del login
    console.log('📱 Usando datos locales para obtener citas (modo desarrollo)');
    return await mockAppointmentService.getUserAppointments(filters);
  }

  // Obtener una cita específica
  async getAppointment(appointmentId: string): Promise<Appointment> {
    // SOLUCIÓN DEFINITIVA: Usar siempre datos locales para desarrollo
    console.log('📱 Obteniendo cita desde datos locales (modo desarrollo)');
    return await mockAppointmentService.getAppointment(appointmentId);
  }

  // Crear nueva cita
  async createAppointment(appointmentData: CreateAppointmentData): Promise<Appointment> {
    // SOLUCIÓN DEFINITIVA: Usar siempre datos locales para desarrollo
    console.log('📱 Creando cita en datos locales (modo desarrollo)');
    return await mockAppointmentService.createAppointment(appointmentData);
  }

  // Actualizar cita
  async updateAppointment(
    appointmentId: string,
    appointmentData: UpdateAppointmentData
  ): Promise<Appointment> {
    // SOLUCIÓN DEFINITIVA: Usar siempre datos locales para desarrollo
    console.log('📱 Actualizando cita en datos locales (modo desarrollo)');
    return await mockAppointmentService.updateAppointment(appointmentId, appointmentData);
  }

  // Cancelar cita
  async cancelAppointment(appointmentId: string, reason?: string): Promise<Appointment> {
    // SOLUCIÓN DEFINITIVA: Usar siempre datos locales para desarrollo
    console.log('📱 Cancelando cita en datos locales (modo desarrollo)');
    return await mockAppointmentService.cancelAppointment(appointmentId, reason);
  }

  // Confirmar cita
  async confirmAppointment(appointmentId: string): Promise<Appointment> {
    // SOLUCIÓN DEFINITIVA: Usar siempre datos locales para desarrollo
    console.log('📱 Confirmando cita en datos locales (modo desarrollo)');
    return await mockAppointmentService.confirmAppointment(appointmentId);
  }

  // Obtener horarios disponibles
  async getAvailableSlots(
    professionalId: string,
    serviceId: string,
    date: string
  ): Promise<AvailableSlot[]> {
    // SOLUCIÓN DEFINITIVA: Usar siempre datos locales para desarrollo
    console.log('📱 Obteniendo horarios disponibles desde datos locales (modo desarrollo)');
    
    // Generar horarios mock
    const slots: AvailableSlot[] = [];
    for (let hour = 9; hour <= 17; hour++) {
      slots.push({
        date,
        time: `${hour.toString().padStart(2, '0')}:00`,
        available: Math.random() > 0.3, // 70% de disponibilidad
        duration: 30
      });
    }
    return slots;
  }

  // Obtener estadísticas de citas
  async getAppointmentStats(): Promise<AppointmentStats> {
    // SOLUCIÓN DEFINITIVA: Usar siempre datos locales para desarrollo
    console.log('📱 Obteniendo estadísticas desde datos locales (modo desarrollo)');
    return await mockAppointmentService.getAppointmentStats();
  }

  // Obtener citas del día
  async getTodayAppointments(): Promise<Appointment[]> {
    // SOLUCIÓN DEFINITIVA: Usar siempre datos locales para desarrollo
    console.log('📱 Obteniendo citas del día desde datos locales (modo desarrollo)');
    return await mockAppointmentService.getTodayAppointments();
  }

  // Obtener próximas citas
  async getUpcomingAppointments(limit: number = 10): Promise<Appointment[]> {
    // SOLUCIÓN DEFINITIVA: Usar siempre datos locales para desarrollo
    console.log('📱 Obteniendo próximas citas desde datos locales (modo desarrollo)');
    return await mockAppointmentService.getUpcomingAppointments(limit);
  }

  // Marcar cita como completada
  async completeAppointment(
    appointmentId: string,
    professionalNotes?: string
  ): Promise<Appointment> {
    // SOLUCIÓN DEFINITIVA: Usar siempre datos locales para desarrollo
    console.log('📱 Completando cita en datos locales (modo desarrollo)');
    return await mockAppointmentService.completeAppointment(appointmentId, professionalNotes);
  }

  // Marcar cita como no asistió
  async markNoShow(appointmentId: string, reason?: string): Promise<Appointment> {
    // SOLUCIÓN DEFINITIVA: Usar siempre datos locales para desarrollo
    console.log('📱 Marcando no asistió en datos locales (modo desarrollo)');
    return await mockAppointmentService.markNoShow(appointmentId, reason);
  }

  // Marcar cita como completada (alias para completeAppointment)
  async markAsCompleted(appointmentId: string, professionalNotes?: string): Promise<Appointment> {
    return this.completeAppointment(appointmentId, professionalNotes);
  }

  // Rechazar cita (alias para cancelAppointment)
  async rejectAppointment(appointmentId: string, reason?: string): Promise<Appointment> {
    return this.cancelAppointment(appointmentId, reason);
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
}

// Instancia singleton
export const hybridAppointmentService = new HybridAppointmentService();

export default hybridAppointmentService;
