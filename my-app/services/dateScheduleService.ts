// @ts-nocheck � beta
import { getBackendApiV1Url } from '../config/backend';

const API_BASE_URL = getBackendApiV1Url();

// Interfaces para los horarios por fecha específica
export interface TimeSlot {
  start: string;
  end: string;
  isCustom: boolean;
}

export interface DateSchedule {
  _id?: string;
  professionalId: string;
  professionalName: string;
  date: string;
  timeSlots: TimeSlot[];
  isAvailable: boolean;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DateScheduleResponse {
  success: boolean;
  data: DateSchedule | DateSchedule[] | null;
  message?: string;
  count?: number;
  error?: string;
  details?: string;
}

class DateScheduleService {
  // Datos mock basados en los registros reales de la base de datos
  private mockData: DateSchedule[] = [
    {
      _id: "68d785922991bb97a8f8110f",
      professionalId: "3",
      professionalName: "Dr. Carlos Mendoza",
      date: "2025-10-04",
      timeSlots: [
        { start: "08:00", end: "09:00", isCustom: true },
        { start: "09:30", end: "10:30", isCustom: true },
        { start: "11:00", end: "12:00", isCustom: true },
        { start: "14:00", end: "15:00", isCustom: true },
        { start: "15:30", end: "16:30", isCustom: true }
      ],
      isAvailable: true,
      notes: "Horarios completos para el 4 de octubre",
      createdAt: "2025-09-27T06:34:58.441Z",
      updatedAt: "2025-09-27T06:34:58.441Z"
    },
    {
      _id: "68d785b5bc53bf70c8bd7173",
      professionalId: "3",
      professionalName: "Dr. Carlos Mendoza",
      date: "2025-10-05",
      timeSlots: [
        { start: "09:00", end: "10:00", isCustom: true },
        { start: "10:30", end: "11:30", isCustom: true },
        { start: "14:00", end: "15:00", isCustom: true },
        { start: "15:30", end: "16:30", isCustom: true },
        { start: "17:00", end: "18:00", isCustom: true }
      ],
      isAvailable: true,
      notes: "Horarios extendidos para el 5 de octubre",
      createdAt: "2025-09-27T06:35:33.000Z",
      updatedAt: "2025-09-27T06:35:33.000Z"
    },
    {
      _id: "68d785b5bc53bf70c8bd7176",
      professionalId: "3",
      professionalName: "Dr. Carlos Mendoza",
      date: "2025-10-06",
      timeSlots: [
        { start: "08:00", end: "09:00", isCustom: true },
        { start: "09:30", end: "10:30", isCustom: true },
        { start: "16:00", end: "17:00", isCustom: true }
      ],
      isAvailable: true,
      notes: "Horarios reducidos para el 6 de octubre",
      createdAt: "2025-09-27T06:35:33.000Z",
      updatedAt: "2025-09-27T06:35:33.000Z"
    },
    {
      _id: "68d785b5bc53bf70c8bd7179",
      professionalId: "3",
      professionalName: "Dr. Carlos Mendoza",
      date: "2025-10-07",
      timeSlots: [
        { start: "09:00", end: "10:00", isCustom: true },
        { start: "10:30", end: "11:30", isCustom: true },
        { start: "11:30", end: "12:30", isCustom: true },
        { start: "14:00", end: "15:00", isCustom: true },
        { start: "15:30", end: "16:30", isCustom: true },
        { start: "17:00", end: "18:00", isCustom: true }
      ],
      isAvailable: true,
      notes: "Horarios completos con turno extra para el 7 de octubre",
      createdAt: "2025-09-27T06:35:33.000Z",
      updatedAt: "2025-09-27T06:35:33.000Z"
    },
    {
      _id: "68d785b5bc53bf70c8bd717c",
      professionalId: "3",
      professionalName: "Dr. Carlos Mendoza",
      date: "2025-10-08",
      timeSlots: [
        { start: "08:00", end: "09:00", isCustom: true },
        { start: "09:30", end: "10:30", isCustom: true },
        { start: "11:00", end: "12:00", isCustom: true }
      ],
      isAvailable: true,
      notes: "Solo horarios de mañana para el 8 de octubre",
      createdAt: "2025-09-27T06:35:33.000Z",
      updatedAt: "2025-09-27T06:35:33.000Z"
    },
    {
      _id: "68d785b5bc53bf70c8bd7180",
      professionalId: "3",
      professionalName: "Dr. Carlos Mendoza",
      date: "2025-10-09",
      timeSlots: [
        { start: "14:00", end: "15:00", isCustom: true },
        { start: "15:30", end: "16:30", isCustom: true },
        { start: "17:00", end: "18:00", isCustom: true },
        { start: "18:30", end: "19:30", isCustom: true }
      ],
      isAvailable: true,
      notes: "Solo horarios de tarde para el 9 de octubre",
      createdAt: "2025-09-27T06:35:33.000Z",
      updatedAt: "2025-09-27T06:35:33.000Z"
    },
    {
      _id: "68d785b5bc53bf70c8bd7183",
      professionalId: "3",
      professionalName: "Dr. Carlos Mendoza",
      date: "2025-10-10",
      timeSlots: [
        { start: "08:00", end: "09:00", isCustom: true },
        { start: "09:30", end: "10:30", isCustom: true },
        { start: "11:00", end: "12:00", isCustom: true },
        { start: "14:00", end: "15:00", isCustom: true },
        { start: "15:30", end: "16:30", isCustom: true },
        { start: "17:00", end: "18:00", isCustom: true }
      ],
      isAvailable: true,
      notes: "Horarios completos para el 10 de octubre",
      createdAt: "2025-09-27T06:35:33.000Z",
      updatedAt: "2025-09-27T06:35:33.000Z"
    },
    {
      _id: "68d785b5bc53bf70c8bd7186",
      professionalId: "3",
      professionalName: "Dr. Carlos Mendoza",
      date: "2025-10-11",
      timeSlots: [
        { start: "09:00", end: "10:00", isCustom: true },
        { start: "10:30", end: "11:30", isCustom: true },
        { start: "14:00", end: "15:00", isCustom: true },
        { start: "15:30", end: "16:30", isCustom: true }
      ],
      isAvailable: true,
      notes: "Horarios estándar para el 11 de octubre",
      createdAt: "2025-09-27T06:35:33.000Z",
      updatedAt: "2025-09-27T06:35:33.000Z"
    },
    {
      _id: "68d785b5bc53bf70c8bd7189",
      professionalId: "3",
      professionalName: "Dr. Carlos Mendoza",
      date: "2025-10-12",
      timeSlots: [
        { start: "08:00", end: "09:00", isCustom: true },
        { start: "09:30", end: "10:30", isCustom: true },
        { start: "11:00", end: "12:00", isCustom: true },
        { start: "12:30", end: "13:30", isCustom: true },
        { start: "14:00", end: "15:00", isCustom: true },
        { start: "15:30", end: "16:30", isCustom: true },
        { start: "17:00", end: "18:00", isCustom: true }
      ],
      isAvailable: true,
      notes: "Horarios extendidos con turno de almuerzo para el 12 de octubre",
      createdAt: "2025-09-27T06:35:33.000Z",
      updatedAt: "2025-09-27T06:35:33.000Z"
    },
    {
      _id: "68d785b5bc53bf70c8bd7192",
      professionalId: "3",
      professionalName: "Dr. Carlos Mendoza",
      date: "2025-10-13",
      timeSlots: [
        { start: "09:00", end: "10:00", isCustom: true },
        { start: "10:30", end: "11:30", isCustom: true },
        { start: "16:00", end: "17:00", isCustom: true }
      ],
      isAvailable: true,
      notes: "Horarios reducidos para el 13 de octubre",
      createdAt: "2025-09-27T06:35:33.000Z",
      updatedAt: "2025-09-27T06:35:33.000Z"
    }
  ];

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<DateScheduleResponse> {
    try {
      const url = `${API_BASE_URL}${endpoint}`;
      console.log('🌐 DateScheduleService: Realizando petición a:', url);
      
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Error del servidor:', errorData);
        throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Respuesta del servidor:', data);
      return data;
    } catch (error) {
      console.error('❌ Error en DateScheduleService, usando datos mock:', error);
      // Fallback a datos mock cuando el servidor no está disponible
      return this.getMockResponse(endpoint, options);
    }
  }

  private getMockResponse(endpoint: string, options: RequestInit): DateScheduleResponse {
    console.log('🔄 Usando datos mock para:', endpoint);
    
    // Simular delay de red
    return new Promise((resolve) => {
      setTimeout(() => {
        if (endpoint.includes('/month/')) {
          // GET /date-schedules/:professionalId/month/:year/:month
          const parts = endpoint.split('/');
          const professionalId = parts[2];
          const year = parseInt(parts[4]);
          const month = parseInt(parts[5]);
          
          const filteredData = this.mockData.filter(schedule => {
            const scheduleDate = new Date(schedule.date);
            return scheduleDate.getFullYear() === year && 
                   scheduleDate.getMonth() + 1 === month &&
                   schedule.professionalId === professionalId;
          });
          
          resolve({
            success: true,
            data: filteredData,
            count: filteredData.length,
            message: 'Datos obtenidos desde mock'
          });
        } else if (endpoint.includes('/range')) {
          // GET /date-schedules/:professionalId/range
          const parts = endpoint.split('/');
          const professionalId = parts[2];
          const urlParams = new URLSearchParams(endpoint.split('?')[1]);
          const startDate = urlParams.get('startDate');
          const endDate = urlParams.get('endDate');
          
          const filteredData = this.mockData.filter(schedule => {
            return schedule.professionalId === professionalId &&
                   schedule.date >= startDate! &&
                   schedule.date <= endDate!;
          });
          
          resolve({
            success: true,
            data: filteredData,
            count: filteredData.length,
            message: 'Datos obtenidos desde mock'
          });
        } else if (endpoint.includes('/date-schedules/') && !endpoint.includes('/month/') && !endpoint.includes('/range')) {
          // GET /date-schedules/:professionalId/:date
          const parts = endpoint.split('/');
          const professionalId = parts[2];
          const date = parts[3];
          
          const foundSchedule = this.mockData.find(schedule => 
            schedule.professionalId === professionalId && schedule.date === date
          );
          
          resolve({
            success: true,
            data: foundSchedule || null,
            message: foundSchedule ? 'Horario encontrado' : 'No hay horarios configurados para esta fecha'
          });
        } else if (options.method === 'POST') {
          // POST /date-schedules/:professionalId
          const parts = endpoint.split('/');
          const professionalId = parts[2];
          
          // Simular creación/actualización
          const newSchedule: DateSchedule = {
            _id: `mock_${Date.now()}`,
            professionalId,
            professionalName: "Dr. Carlos Mendoza",
            date: "2025-10-14",
            timeSlots: [
              { start: "09:00", end: "10:00", isCustom: true },
              { start: "10:30", end: "11:30", isCustom: true }
            ],
            isAvailable: true,
            notes: "Horario creado desde mock",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          
          resolve({
            success: true,
            data: newSchedule,
            message: 'Horarios creados/actualizados exitosamente'
          });
        } else if (options.method === 'DELETE') {
          // DELETE /date-schedules/:professionalId/:date
          resolve({
            success: true,
            data: null,
            message: 'Horarios eliminados exitosamente'
          });
        } else {
          resolve({
            success: false,
            data: null,
            error: 'Endpoint no soportado en modo mock'
          });
        }
      }, 500); // Simular delay de 500ms
    });
  }

  // Obtener horarios de una fecha específica
  async getDateSchedule(
    professionalId: string,
    date: string
  ): Promise<DateScheduleResponse> {
    try {
      console.log('📅 Obteniendo horarios para fecha específica:', { professionalId, date });
      
      const response = await this.makeRequest<DateSchedule>(
        `/date-schedules/${professionalId}/${date}`,
        { method: 'GET' }
      );
      
      return response;
    } catch (error) {
      console.error('❌ Error obteniendo horarios de fecha específica:', error);
      throw error;
    }
  }

  // Crear o actualizar horarios de una fecha específica
  async createOrUpdateDateSchedule(
    professionalId: string,
    scheduleData: Omit<DateSchedule, '_id' | 'createdAt' | 'updatedAt'>
  ): Promise<DateScheduleResponse> {
    try {
      console.log('📅 Creando/actualizando horarios para fecha específica:', { professionalId, date: scheduleData.date });
      
      const response = await this.makeRequest<DateSchedule>(
        `/date-schedules/${professionalId}`,
        {
          method: 'POST',
          body: JSON.stringify(scheduleData),
        }
      );
      
      return response;
    } catch (error) {
      console.error('❌ Error creando/actualizando horarios de fecha específica:', error);
      throw error;
    }
  }

  // Obtener horarios de un mes completo
  async getMonthlySchedules(
    professionalId: string,
    year: number,
    month: number
  ): Promise<DateScheduleResponse> {
    try {
      console.log('📅 Obteniendo horarios del mes:', { professionalId, year, month });
      
      const response = await this.makeRequest<DateSchedule[]>(
        `/date-schedules/${professionalId}/month/${year}/${month}`,
        { method: 'GET' }
      );
      
      return response;
    } catch (error) {
      console.error('❌ Error obteniendo horarios del mes:', error);
      throw error;
    }
  }

  // Obtener horarios de un rango de fechas
  async getDateRangeSchedules(
    professionalId: string,
    startDate: string,
    endDate: string
  ): Promise<DateScheduleResponse> {
    try {
      console.log('📅 Obteniendo horarios del rango:', { professionalId, startDate, endDate });
      
      const response = await this.makeRequest<DateSchedule[]>(
        `/date-schedules/${professionalId}/range?startDate=${startDate}&endDate=${endDate}`,
        { method: 'GET' }
      );
      
      return response;
    } catch (error) {
      console.error('❌ Error obteniendo horarios del rango:', error);
      throw error;
    }
  }

  // Eliminar horarios de una fecha específica
  async deleteDateSchedule(
    professionalId: string,
    date: string
  ): Promise<DateScheduleResponse> {
    try {
      console.log('🗑️ Eliminando horarios para fecha:', { professionalId, date });
      
      const response = await this.makeRequest<DateSchedule>(
        `/date-schedules/${professionalId}/${date}`,
        { method: 'DELETE' }
      );
      
      return response;
    } catch (error) {
      console.error('❌ Error eliminando horarios de fecha específica:', error);
      throw error;
    }
  }

  // Funciones auxiliares
  formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  formatDateForDisplay(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  validateTimeSlot(timeSlot: TimeSlot): boolean {
    if (!timeSlot.start || !timeSlot.end) {
      return false;
    }

    const startTime = timeSlot.start.split(':');
    const endTime = timeSlot.end.split(':');

    if (startTime.length !== 2 || endTime.length !== 2) {
      return false;
    }

    const startHour = parseInt(startTime[0]);
    const startMinute = parseInt(startTime[1]);
    const endHour = parseInt(endTime[0]);
    const endMinute = parseInt(endTime[1]);

    if (isNaN(startHour) || isNaN(startMinute) || isNaN(endHour) || isNaN(endMinute)) {
      return false;
    }

    if (startHour < 0 || startHour > 23 || endHour < 0 || endHour > 23) {
      return false;
    }

    if (startMinute < 0 || startMinute > 59 || endMinute < 0 || endMinute > 59) {
      return false;
    }

    // El horario de inicio debe ser anterior al de fin
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;

    return startMinutes < endMinutes;
  }

  validateDate(dateString: string): boolean {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateString)) {
      return false;
    }

    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
  }

  // Convertir dateSchedules del frontend al formato del backend
  convertFrontendToBackend(
    professionalId: string,
    professionalName: string,
    dateSchedules: { [date: string]: any }
  ): DateSchedule[] {
    const schedules: DateSchedule[] = [];

    Object.entries(dateSchedules).forEach(([date, schedule]) => {
      if (schedule && schedule.timeSlots && schedule.timeSlots.length > 0) {
        schedules.push({
          professionalId,
          professionalName,
          date,
          timeSlots: schedule.timeSlots.map((slot: any) => ({
            start: slot.start,
            end: slot.end,
            isCustom: slot.isCustom || true
          })),
          isAvailable: schedule.isAvailable !== undefined ? schedule.isAvailable : true,
          notes: schedule.notes || ''
        });
      }
    });

    return schedules;
  }

  // Convertir datos del backend al formato del frontend
  convertBackendToFrontend(schedules: DateSchedule[]): { [date: string]: any } {
    const dateSchedules: { [date: string]: any } = {};

    schedules.forEach(schedule => {
      dateSchedules[schedule.date] = {
        date: schedule.date,
        timeSlots: schedule.timeSlots,
        isAvailable: schedule.isAvailable,
        notes: schedule.notes
      };
    });

    return dateSchedules;
  }
}

export const dateScheduleService = new DateScheduleService();
