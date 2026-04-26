import { getBackendApiV1Url } from '../config/backend';

const API_BASE_URL = getBackendApiV1Url();

/** El API de calendario en Mongo espera el _id del profesional (24 hex). */
export function isMongoObjectIdString(value: string | undefined | null): boolean {
  if (value == null || value === '') return false;
  return /^[a-fA-F0-9]{24}$/.test(String(value).trim());
}

// Tipos para el calendario
export interface TimeSlot {
  time: string;
  isAvailable: boolean;
  isBlocked: boolean;
  appointmentId?: string | null;
  reason?: string;
}

export interface DayAvailability {
  date: string;
  day: number;
  dayName: string;
  isWorkingDay: boolean;
  availableSlots: TimeSlot[];
  workingHours?: {
    start: string;
    end: string;
  };
  breakTime?: {
    start: string;
    end: string;
  };
  reason?: string;
  totalSlots: number;
  availableSlotsCount: number;
  blockedSlotsCount: number;
}

export interface MonthlyCalendar {
  professionalId: string;
  professionalName: string;
  year: number;
  month: number;
  monthName: string;
  calendar: DayAvailability[];
  summary: {
    totalDays: number;
    workingDays: number;
    nonWorkingDays: number;
    totalAvailableSlots: number;
    totalBlockedSlots: number;
  };
}

export interface UpcomingDay {
  date: string;
  dayName: string;
  availableSlotsCount: number;
  firstAvailableSlot?: string;
  lastAvailableSlot?: string;
}

export interface UpcomingAvailability {
  professionalId: string;
  professionalName: string;
  upcomingDays: UpcomingDay[];
  totalDays: number;
  searchPeriod: string;
}

class CalendarService {
  private shouldUseLocalCalendarMock(professionalId: string): boolean {
    return !isMongoObjectIdString(professionalId);
  }

  /** Mensaje plano desde respuestas { error } o { error: { message } }. */
  private normalizeApiErrorMessage(errorData: unknown): string {
    if (!errorData || typeof errorData !== 'object') return '';
    const o = errorData as Record<string, unknown>;
    const e = o.error;
    if (typeof e === 'string') return e;
    if (e && typeof e === 'object' && 'message' in e && typeof (e as { message: unknown }).message === 'string') {
      return String((e as { message: string }).message);
    }
    if (typeof o.message === 'string') return o.message;
    return '';
  }

  private isInvalidProfessionalIdServerMessage(msg: string): boolean {
    const m = msg.toLowerCase();
    return (
      m.includes('id de profesional inválido') ||
      m.includes('profesional inválido') ||
      m.includes('objectid') ||
      m.includes('24 caracteres hex')
    );
  }

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    try {
      const url = `${API_BASE_URL}${endpoint}`;
      console.log('🌐 CalendarService: Realizando petición a:', url);
      
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        let errorData: unknown = {};
        try {
          errorData = await response.json();
        } catch {
          /* cuerpo vacío o no JSON */
        }
        const flatMsg = this.normalizeApiErrorMessage(errorData);

        if (
          response.status === 400 &&
          flatMsg &&
          this.isInvalidProfessionalIdServerMessage(flatMsg)
        ) {
          console.log(
            'ℹ️ Calendario: el servidor no aceptó el id de profesional; usando calendario local. Iniciá sesión con un usuario del backend (ObjectId de 24 hex) para datos reales.'
          );
          return (await this.getMockResponse(endpoint, options)) as T;
        }

        console.error('❌ Error del servidor:', errorData);
        throw new Error(flatMsg || `Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Respuesta del servidor:', data);
      return data;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      const invalidProf = this.isInvalidProfessionalIdServerMessage(msg);

      if (error instanceof Error && error.message.includes('Network request failed')) {
        console.log('🔄 CalendarService: Backend no disponible, usando datos mock');
      } else if (invalidProf) {
        console.log('ℹ️ Calendario: id de profesional no válido en API; usando datos mock');
      } else {
        console.error('❌ Error en CalendarService:', error);
      }
      return (await this.getMockResponse(endpoint, options)) as T;
    }
  }

  private getMockResponse(endpoint: string, options: RequestInit): any {
    console.log('🔄 Usando datos mock para CalendarService:', endpoint);
    
    // Simular delay de red
    return new Promise((resolve) => {
      setTimeout(() => {
        if (endpoint.includes('/calendar/monthly/')) {
          // GET /calendar/monthly/:professionalId/:year/:month
          const parts = endpoint.split('/');
          const professionalId = parts[3];
          const year = parseInt(parts[4]);
          const month = parseInt(parts[5]);
          
          const mockCalendar = this.generateMockMonthlyCalendar(professionalId, year, month);
          resolve({
            success: true,
            data: mockCalendar
          });
        } else if (endpoint.includes('/calendar/upcoming/')) {
          // GET /calendar/upcoming/:professionalId
          const parts = endpoint.split('/');
          const professionalId = parts[3];
          const urlParams = new URLSearchParams(endpoint.split('?')[1]);
          const days = parseInt(urlParams.get('days') || '30');
          
          const mockUpcoming = this.generateMockUpcomingAvailability(professionalId, days);
          resolve({
            success: true,
            data: mockUpcoming
          });
        } else if (endpoint.includes('/calendar/day/')) {
          // GET /calendar/day/:professionalId/:date
          const parts = endpoint.split('/');
          const professionalId = parts[3];
          const date = parts[4];
          
          const mockDay = this.generateMockDayAvailability(professionalId, date);
          resolve({
            success: true,
            data: mockDay
          });
        } else {
          resolve({
            success: false,
            error: 'Endpoint no soportado en modo mock'
          });
        }
      }, 500); // Simular delay de 500ms
    });
  }

  private generateMockMonthlyCalendar(professionalId: string, year: number, month: number): MonthlyCalendar {
    const monthName = this.getMonthName(month);
    const daysInMonth = new Date(year, month, 0).getDate();
    const calendar: DayAvailability[] = [];
    
    // Generar días del mes
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const dayName = this.getDayName(date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase());
      const isWorkingDay = date.getDay() >= 1 && date.getDay() <= 5; // Lunes a Viernes
      
      // Generar horarios disponibles
      const availableSlots: TimeSlot[] = [];
      if (isWorkingDay) {
        const timeSlots = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'];
        timeSlots.forEach(time => {
          availableSlots.push({
            time,
            isAvailable: true,
            isBlocked: false
          });
        });
      }
      
      calendar.push({
        date: `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`,
        day,
        dayName,
        isWorkingDay,
        availableSlots,
        workingHours: isWorkingDay ? { start: '09:00', end: '18:00' } : undefined,
        totalSlots: availableSlots.length,
        availableSlotsCount: availableSlots.filter(slot => slot.isAvailable).length,
        blockedSlotsCount: availableSlots.filter(slot => slot.isBlocked).length
      });
    }
    
    return {
      professionalId,
      professionalName: 'Dr. Carlos Mendoza',
      year,
      month,
      monthName,
      calendar,
      summary: {
        totalDays: daysInMonth,
        workingDays: calendar.filter(day => day.isWorkingDay).length,
        nonWorkingDays: calendar.filter(day => !day.isWorkingDay).length,
        totalAvailableSlots: calendar.reduce((total, day) => total + day.availableSlotsCount, 0),
        totalBlockedSlots: calendar.reduce((total, day) => total + day.blockedSlotsCount, 0)
      }
    };
  }

  private generateMockUpcomingAvailability(professionalId: string, days: number): UpcomingAvailability {
    const upcomingDays: UpcomingDay[] = [];
    const today = new Date();
    
    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      const dayOfWeek = date.getDay();
      const isWorkingDay = dayOfWeek >= 1 && dayOfWeek <= 5; // Lunes a Viernes
      
      if (isWorkingDay) {
        const timeSlots = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'];
        upcomingDays.push({
          date: date.toISOString().split('T')[0],
          dayName: this.getDayName(date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()),
          availableSlotsCount: timeSlots.length,
          firstAvailableSlot: timeSlots[0],
          lastAvailableSlot: timeSlots[timeSlots.length - 1]
        });
      }
    }
    
    return {
      professionalId,
      professionalName: 'Dr. Carlos Mendoza',
      upcomingDays,
      totalDays: upcomingDays.length,
      searchPeriod: `Próximos ${days} días`
    };
  }

  private generateMockDayAvailability(professionalId: string, date: string): DayAvailability {
    const targetDate = new Date(date);
    const dayOfWeek = targetDate.getDay();
    const isWorkingDay = dayOfWeek >= 1 && dayOfWeek <= 5;
    
    const availableSlots: TimeSlot[] = [];
    if (isWorkingDay) {
      const timeSlots = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'];
      timeSlots.forEach(time => {
        availableSlots.push({
          time,
          isAvailable: true,
          isBlocked: false
        });
      });
    }
    
    return {
      date,
      day: targetDate.getDate(),
      dayName: this.getDayName(targetDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()),
      isWorkingDay,
      availableSlots,
      workingHours: isWorkingDay ? { start: '09:00', end: '18:00' } : undefined,
      totalSlots: availableSlots.length,
      availableSlotsCount: availableSlots.filter(slot => slot.isAvailable).length,
      blockedSlotsCount: availableSlots.filter(slot => slot.isBlocked).length
    };
  }

  // Obtener calendario mensual completo
  async getMonthlyCalendar(
    professionalId: string, 
    year: number, 
    month: number
  ): Promise<MonthlyCalendar> {
    try {
      console.log('📅 Obteniendo calendario mensual:', { professionalId, year, month });

      if (this.shouldUseLocalCalendarMock(professionalId)) {
        console.log(
          'ℹ️ Calendario: el id del profesional no es un ObjectId de MongoDB; usando datos locales de demo. Iniciá sesión con un usuario del backend para datos reales.'
        );
        return this.generateMockMonthlyCalendar(String(professionalId), year, month);
      }
      
      const response = await this.makeRequest<{ success: boolean; data: MonthlyCalendar }>(
        `/calendar/monthly/${professionalId}/${year}/${month}`
      );
      
      if (!response.success) {
        throw new Error('Error obteniendo calendario mensual');
      }
      
      return response.data;
    } catch (error) {
      console.error('❌ Error obteniendo calendario mensual:', error);
      throw error;
    }
  }

  // Obtener disponibilidad de un día específico
  async getDayAvailability(
    professionalId: string, 
    date: string
  ): Promise<DayAvailability> {
    try {
      console.log('📅 Obteniendo disponibilidad del día:', { professionalId, date });

      if (this.shouldUseLocalCalendarMock(professionalId)) {
        return this.generateMockDayAvailability(String(professionalId), date);
      }
      
      const response = await this.makeRequest<{ success: boolean; data: DayAvailability }>(
        `/calendar/day/${professionalId}/${date}`
      );
      
      if (!response.success) {
        throw new Error('Error obteniendo disponibilidad del día');
      }
      
      return response.data;
    } catch (error) {
      console.error('❌ Error obteniendo disponibilidad del día:', error);
      throw error;
    }
  }

  // Obtener próximos días disponibles
  async getUpcomingAvailability(
    professionalId: string, 
    days: number = 30
  ): Promise<UpcomingAvailability> {
    try {
      console.log('📅 Obteniendo próximos días disponibles:', { professionalId, days });

      if (this.shouldUseLocalCalendarMock(professionalId)) {
        return this.generateMockUpcomingAvailability(String(professionalId), days);
      }
      
      const response = await this.makeRequest<{ success: boolean; data: UpcomingAvailability }>(
        `/calendar/upcoming/${professionalId}?days=${days}`
      );
      
      if (!response.success) {
        throw new Error('Error obteniendo próximos días disponibles');
      }
      
      return response.data;
    } catch (error) {
      console.error('❌ Error obteniendo próximos días disponibles:', error);
      throw error;
    }
  }

  // Función auxiliar para formatear fechas
  formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  // Función auxiliar para obtener el nombre del mes en español
  getMonthName(month: number): string {
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return months[month - 1] || 'Mes inválido';
  }

  // Función auxiliar para obtener el nombre del día en español
  getDayName(dayName: string): string {
    const days: { [key: string]: string } = {
      'monday': 'Lunes',
      'tuesday': 'Martes',
      'wednesday': 'Miércoles',
      'thursday': 'Jueves',
      'friday': 'Viernes',
      'saturday': 'Sábado',
      'sunday': 'Domingo'
    };
    return days[dayName] || dayName;
  }

  // Función auxiliar para verificar si una fecha es hoy
  isToday(date: string): boolean {
    const today = new Date();
    const targetDate = new Date(date);
    return today.toDateString() === targetDate.toDateString();
  }

  // Función auxiliar para verificar si una fecha es en el pasado
  isPastDate(date: string): boolean {
    const today = new Date();
    const targetDate = new Date(date);
    return targetDate < today;
  }

  // Función auxiliar para obtener el número de días hasta una fecha
  getDaysUntil(date: string): number {
    const today = new Date();
    const targetDate = new Date(date);
    const diffTime = targetDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  // Función auxiliar para filtrar días disponibles
  filterAvailableDays(days: DayAvailability[]): DayAvailability[] {
    return days.filter(day => 
      day.isWorkingDay && 
      day.availableSlotsCount > 0 &&
      !this.isPastDate(day.date)
    );
  }

  // Función auxiliar para obtener el primer día disponible
  getFirstAvailableDay(days: DayAvailability[]): DayAvailability | null {
    const availableDays = this.filterAvailableDays(days);
    return availableDays.length > 0 ? availableDays[0] : null;
  }

  // Función auxiliar para obtener el último día disponible
  getLastAvailableDay(days: DayAvailability[]): DayAvailability | null {
    const availableDays = this.filterAvailableDays(days);
    return availableDays.length > 0 ? availableDays[availableDays.length - 1] : null;
  }

  // Función auxiliar para contar días disponibles en un rango
  countAvailableDays(days: DayAvailability[]): number {
    return this.filterAvailableDays(days).length;
  }

  // Función auxiliar para obtener estadísticas del calendario
  getCalendarStats(calendar: MonthlyCalendar) {
    const availableDays = this.filterAvailableDays(calendar.calendar);
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();
    
    return {
      totalDays: calendar.summary.totalDays,
      workingDays: calendar.summary.workingDays,
      availableDays: availableDays.length,
      totalSlots: calendar.summary.totalAvailableSlots,
      blockedSlots: calendar.summary.totalBlockedSlots,
      isCurrentMonth: calendar.year === currentYear && calendar.month === currentMonth,
      firstAvailableDay: this.getFirstAvailableDay(calendar.calendar),
      lastAvailableDay: this.getLastAvailableDay(calendar.calendar)
    };
  }
}

export const calendarService = new CalendarService();
