import { getBackendApiV1Url } from '../config/backend';
import { ProfessionalAvailability } from '../contexts/AvailabilityContext';
import { isMongoObjectIdString } from './calendarService';

const API_BASE_URL = getBackendApiV1Url();

/** Primer segmento tras `/availability/` cuando es un id de profesional (no rutas como `professionals`). */
function getPathProfessionalId(endpoint: string): string | null {
  const path = endpoint.split('?')[0];
  const parts = path.split('/').filter((p) => p.length > 0);
  const i = parts.indexOf('availability');
  if (i === -1 || i >= parts.length - 1) return null;
  const seg = parts[i + 1];
  if (seg === 'professionals') return null;
  return seg;
}

function safeNormalizeLower(s: string): string {
  try {
    return s.normalize('NFC').toLowerCase();
  } catch {
    return s.toLowerCase();
  }
}

function isInvalidProfessionalIdServerPayload(data: unknown): boolean {
  const rawJson =
    data !== undefined && data !== null
      ? safeNormalizeLower(typeof data === 'string' ? data : JSON.stringify(data))
      : '';
  if (rawJson.includes('mongodb') && rawJson.includes('24 caracteres')) return true;
  if (rawJson.includes('objectid')) return true;
  if (/id\s*de\s*profesional/i.test(rawJson)) return true;
  if (rawJson.includes('ids tipo') || rawJson.includes('"1"')) return true;

  if (!data || typeof data !== 'object') return false;
  const o = data as Record<string, unknown>;
  const e = o.error;
  const errStr =
    typeof e === 'string'
      ? e
      : typeof e === 'object' && e && 'message' in e
        ? String((e as { message?: string }).message)
        : '';
  const msgStr = typeof o.message === 'string' ? o.message : '';
  const blob = safeNormalizeLower(`${errStr} ${msgStr}`);
  if (blob.includes('mongodb')) return true;
  if (blob.includes('24 caracteres')) return true;
  if (blob.includes('objectid')) return true;
  if (/id\s+de\s+profesional/i.test(blob)) return true;
  if (blob.includes('hex') && blob.includes('caracteres')) return true;
  if (/los\s+ids\s+tipo/i.test(blob)) return true;
  return false;
}

/** Para pantallas/contexto: saber si el fallo es solo por id demo / no ObjectId (sin tratarlo como error grave). */
export function isProfessionalMongoIdRejectedResponse(res: {
  error?: string;
  message?: string;
}): boolean {
  return isInvalidProfessionalIdServerPayload({
    success: false,
    error: res.error,
    message: res.message,
  });
}

export interface AvailabilityServiceResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface DateAvailabilityResponse {
  isAvailable: boolean;
  date: string;
  reason?: string;
}

export interface TimeSlotsResponse {
  timeSlots: string[];
  date: string;
  isAvailable: boolean;
}

export interface TimeSlotAvailabilityResponse {
  isAvailable: boolean;
  date: string;
  timeSlot: string;
}

export interface AvailableProfessionalsResponse {
  professionals: Array<{
    _id: string;
    professionalId: {
      _id: string;
      fullName: string;
      email: string;
      phone: string;
      service: string;
    };
    professionalName: string;
    daysOfWeek: any;
    timeSlots: string[];
    workingHours: {
      start: string;
      end: string;
    };
    isActive: boolean;
  }>;
  date: string;
  count: number;
}

export interface SpecialDateRequest {
  date: string;
  isAvailable: boolean;
  customTimeSlots?: string[];
  reason?: string;
}

export interface RecurringExceptionRequest {
  dayOfWeek: number;
  startDate: string;
  endDate: string;
  isAvailable: boolean;
  reason?: string;
}

export interface BlockTimeSlotRequest {
  date: string;
  timeSlot: string;
  appointmentId: string;
  reason?: string;
}

export interface UnblockTimeSlotRequest {
  date: string;
  timeSlot: string;
  appointmentId: string;
}

export interface UnblockAppointmentRequest {
  appointmentId: string;
}

export interface BlockedTimeSlot {
  timeSlot: string;
  appointmentId: string;
  reason: string;
  createdAt: string;
}

class AvailabilityService {
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<AvailabilityServiceResponse<T>> {
    try {
      const url = `${API_BASE_URL}${endpoint}`;
      console.log('🌐 AvailabilityService: Realizando petición a:', url);
      console.log('🌐 Opciones:', options);
      
      const pathProfessionalId = getPathProfessionalId(endpoint);
      if (pathProfessionalId && !isMongoObjectIdString(pathProfessionalId)) {
        console.log(
          'ℹ️ AvailabilityService: el id no es un ObjectId de MongoDB (sesión demo u offline); no se llama al backend. Iniciá sesión con un usuario del servidor para sincronizar.'
        );
        return {
          success: false,
          error: 'ID de profesional inválido',
          message:
            'El API espera el _id de MongoDB (24 caracteres hex). Cerrá sesión e iniciá con una cuenta registrada en el backend.',
        };
      }

      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      const data = await response.json();
      
      if (!response.ok) {
        if (isInvalidProfessionalIdServerPayload(data)) {
          console.log('ℹ️ AvailabilityService: el servidor rechazó el id de profesional; usá un usuario con _id MongoDB válido.');
        } else {
          console.error('❌ Error en respuesta del servidor:', data);
        }
        const errField = (data as { error?: unknown }).error;
        const errStr =
          typeof errField === 'string'
            ? errField
            : errField && typeof errField === 'object' && 'message' in errField
              ? String((errField as { message?: string }).message)
              : `Error ${response.status}: ${response.statusText}`;
        const detailsRaw = (data as { details?: unknown }).details;
        const details =
          typeof detailsRaw === 'string' && detailsRaw.trim()
            ? detailsRaw.trim()
            : '';
        const msgField =
          typeof (data as { message?: unknown }).message === 'string'
            ? (data as { message: string }).message
            : undefined;
        let errorOut = errStr;
        if (details && !errorOut.includes(details)) {
          errorOut = `${errorOut}\n${details}`;
        }
        if (msgField && !errorOut.includes(msgField)) {
          errorOut = `${errorOut}\n${msgField}`;
        }
        return {
          success: false,
          error: errorOut,
          message: msgField,
        };
      }

      console.log('✅ Respuesta exitosa del servidor:', data);
      return {
        success: true,
        data: data.data || data,
        message: data.message,
      };
    } catch (error) {
      // Solo registrar como error si no es un error de red (que es esperado cuando el backend no está disponible)
      if (error instanceof Error && error.message.includes('Network request failed')) {
        console.log('🔄 AvailabilityService: Backend no disponible, usando datos locales');
      } else {
        console.error('❌ Error en petición:', error);
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error de conexión',
      };
    }
  }

  // Obtener disponibilidad de un profesional
  async getAvailabilityByProfessional(professionalId: string): Promise<AvailabilityServiceResponse<ProfessionalAvailability>> {
    return this.makeRequest<ProfessionalAvailability>(`/availability/${professionalId}`, {
      method: 'GET',
    });
  }

  // Crear o actualizar disponibilidad
  async createOrUpdateAvailability(
    professionalId: string,
    availabilityData: Partial<ProfessionalAvailability>
  ): Promise<AvailabilityServiceResponse<ProfessionalAvailability>> {
    return this.makeRequest<ProfessionalAvailability>(`/availability/${professionalId}`, {
      method: 'POST',
      body: JSON.stringify(availabilityData),
    });
  }

  // Verificar si una fecha está disponible
  async checkDateAvailability(
    professionalId: string,
    date: string
  ): Promise<AvailabilityServiceResponse<DateAvailabilityResponse>> {
    return this.makeRequest<DateAvailabilityResponse>(
      `/availability/${professionalId}/check-date?date=${encodeURIComponent(date)}`,
      {
        method: 'GET',
      }
    );
  }

  // Obtener horarios disponibles para una fecha
  async getAvailableTimeSlots(
    professionalId: string,
    date: string
  ): Promise<AvailabilityServiceResponse<TimeSlotsResponse>> {
    return this.makeRequest<TimeSlotsResponse>(
      `/availability/${professionalId}/time-slots?date=${encodeURIComponent(date)}`,
      {
        method: 'GET',
      }
    );
  }

  // Verificar si un horario específico está disponible
  async checkTimeSlotAvailability(
    professionalId: string,
    date: string,
    timeSlot: string
  ): Promise<AvailabilityServiceResponse<TimeSlotAvailabilityResponse>> {
    return this.makeRequest<TimeSlotAvailabilityResponse>(
      `/availability/${professionalId}/check-time-slot?date=${encodeURIComponent(date)}&timeSlot=${encodeURIComponent(timeSlot)}`,
      {
        method: 'GET',
      }
    );
  }

  // Obtener profesionales disponibles en una fecha
  async getAvailableProfessionals(date: string): Promise<AvailabilityServiceResponse<AvailableProfessionalsResponse>> {
    return this.makeRequest<AvailableProfessionalsResponse>(
      `/availability/professionals/available?date=${encodeURIComponent(date)}`,
      {
        method: 'GET',
      }
    );
  }

  // Agregar excepción especial
  async addSpecialDate(
    professionalId: string,
    specialDateData: SpecialDateRequest
  ): Promise<AvailabilityServiceResponse<ProfessionalAvailability>> {
    return this.makeRequest<ProfessionalAvailability>(`/availability/${professionalId}/special-date`, {
      method: 'POST',
      body: JSON.stringify(specialDateData),
    });
  }

  // Agregar excepción recurrente
  async addRecurringException(
    professionalId: string,
    recurringExceptionData: RecurringExceptionRequest
  ): Promise<AvailabilityServiceResponse<ProfessionalAvailability>> {
    return this.makeRequest<ProfessionalAvailability>(`/availability/${professionalId}/recurring-exception`, {
      method: 'POST',
      body: JSON.stringify(recurringExceptionData),
    });
  }

  // Eliminar disponibilidad (admin)
  async deleteAvailability(professionalId: string): Promise<AvailabilityServiceResponse<void>> {
    return this.makeRequest<void>(`/availability/${professionalId}`, {
      method: 'DELETE',
    });
  }

  // Obtener todas las disponibilidades (admin)
  async getAllAvailabilities(
    page: number = 1,
    limit: number = 10,
    isActive?: boolean
  ): Promise<AvailabilityServiceResponse<{
    availabilities: ProfessionalAvailability[];
    pagination: {
      current: number;
      pages: number;
      total: number;
    };
  }>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    
    if (isActive !== undefined) {
      params.append('isActive', isActive.toString());
    }

    return this.makeRequest(`/availability?${params.toString()}`, {
      method: 'GET',
    });
  }

  // Bloquear un horario específico
  async blockTimeSlot(
    professionalId: string,
    blockData: BlockTimeSlotRequest
  ): Promise<AvailabilityServiceResponse<void>> {
    return this.makeRequest<void>(`/availability/${professionalId}/block-time-slot`, {
      method: 'POST',
      body: JSON.stringify(blockData),
    });
  }

  // Desbloquear un horario específico
  async unblockTimeSlot(
    professionalId: string,
    unblockData: UnblockTimeSlotRequest
  ): Promise<AvailabilityServiceResponse<void>> {
    return this.makeRequest<void>(`/availability/${professionalId}/unblock-time-slot`, {
      method: 'POST',
      body: JSON.stringify(unblockData),
    });
  }

  // Desbloquear todos los horarios de una cita
  async unblockAppointmentTimeSlots(
    professionalId: string,
    unblockData: UnblockAppointmentRequest
  ): Promise<AvailabilityServiceResponse<void>> {
    return this.makeRequest<void>(`/availability/${professionalId}/unblock-appointment`, {
      method: 'POST',
      body: JSON.stringify(unblockData),
    });
  }

  // Obtener horarios bloqueados en una fecha
  async getBlockedTimeSlots(
    professionalId: string,
    date: string
  ): Promise<AvailabilityServiceResponse<BlockedTimeSlot[]>> {
    return this.makeRequest<BlockedTimeSlot[]>(
      `/availability/${professionalId}/blocked-time-slots?date=${encodeURIComponent(date)}`,
      {
        method: 'GET',
      }
    );
  }

  // Método helper para sincronizar datos del frontend con el backend
  async syncAvailabilityFromFrontend(
    professionalId: string,
    scheduleData: any
  ): Promise<AvailabilityServiceResponse<ProfessionalAvailability>> {
    try {
      // Convertir los datos de horarios del frontend al formato del backend
      const daysOfWeek = {
        monday: scheduleData.monday?.morning || scheduleData.monday?.afternoon || false,
        tuesday: scheduleData.tuesday?.morning || scheduleData.tuesday?.afternoon || false,
        wednesday: scheduleData.wednesday?.morning || scheduleData.wednesday?.afternoon || false,
        thursday: scheduleData.thursday?.morning || scheduleData.thursday?.afternoon || false,
        friday: scheduleData.friday?.morning || scheduleData.friday?.afternoon || false,
        saturday: scheduleData.saturday?.morning || scheduleData.saturday?.afternoon || false,
        sunday: scheduleData.sunday?.morning || scheduleData.sunday?.afternoon || false,
      };

      // Extraer horarios disponibles de todos los días
      const allTimeSlots = new Set<string>();
      const workingHours = { start: '09:00', end: '18:00' };

      Object.entries(scheduleData).forEach(([day, dayData]: [string, any]) => {
        if (dayData) {
          Object.entries(dayData).forEach(([period, periodData]: [string, any]) => {
            if (periodData && typeof periodData === 'object') {
              Object.entries(periodData).forEach(([time, isAvailable]: [string, any]) => {
                if (isAvailable) {
                  allTimeSlots.add(time);
                }
              });
            }
          });
        }
      });

      const timeSlots = Array.from(allTimeSlots).sort();

      // Crear o actualizar disponibilidad
      const availabilityData = {
        daysOfWeek,
        timeSlots,
        workingHours,
        isActive: true,
      };

      return await this.createOrUpdateAvailability(professionalId, availabilityData);
    } catch (error) {
      console.error('Error sincronizando disponibilidad:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error sincronizando disponibilidad',
      };
    }
  }
}

export const availabilityService = new AvailabilityService();
export default availabilityService;
