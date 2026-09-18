import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { getBackendBaseUrl } from '../config/backend';
import { isMongoObjectIdString } from '../services/calendarService';
import simpleAuthService from '../services/simpleAuthService';
import { canClientCancelAppointment } from '../utils/appointmentCancellationPolicy';
import { useAuth } from './AuthContext';
import { useAvailability } from './AvailabilityContext';

export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'cancelled'
  | 'completed'
  | 'pending_payment'
  | 'pending_approval'
  | 'finished';

export interface Appointment {
  id: string;
  service: string;
  professional: string;
  professionalId: string;
  date: string;
  time: string;
  notes?: string;
  status: AppointmentStatus;
  clientId: string;
  clientName: string;
  patientName?: string;
  patientId?: string;
  patientEmail?: string;
  patientPhone?: string;
  serviceId?: string;
  depositAmount?: number;
  /** Estado del pago de seña en Mercado Pago (backend Expo) */
  paymentStatus?: string;
  totalAmount?: number;
  createdAt: Date;
}

/** Alta de cita: varios campos se completan en pantalla de forma parcial (beta). */
export type AppointmentCreateInput = Omit<
  Appointment,
  'id' | 'createdAt' | 'status' | 'professional' | 'clientId' | 'clientName'
> & {
  /** Si viene del POST /api/v1/appointments/create, usar el _id de Mongo para bloqueos y recarga */
  id?: string;
  status?: AppointmentStatus;
  professional?: string;
  clientId?: string;
  clientName?: string;
};

/** Documento lean de ExpoAppointment (backend) → modelo de la app */
function mapExpoAppointmentDoc(a: Record<string, unknown>): Appointment {
  const profRaw = a.professionalId;
  const profId =
    profRaw && typeof profRaw === 'object' && profRaw !== null && '_id' in profRaw
      ? String((profRaw as { _id: unknown })._id)
      : profRaw != null
        ? String(profRaw)
        : '';
  let profName = '';
  let profService = '';
  if (profRaw && typeof profRaw === 'object' && profRaw !== null) {
    const pr = profRaw as { fullName?: string; service?: string };
    if (typeof pr.fullName === 'string') profName = pr.fullName;
    if (typeof pr.service === 'string') profService = pr.service;
  }

  const serviceRaw = a.serviceId;
  let serviceFromRef = '';
  if (serviceRaw && typeof serviceRaw === 'object' && serviceRaw !== null) {
    const sr = serviceRaw as { name?: string };
    if (typeof sr.name === 'string') serviceFromRef = sr.name;
  }

  const clientRaw = a.clientId;
  const clientId =
    clientRaw && typeof clientRaw === 'object' && clientRaw !== null && '_id' in clientRaw
      ? String((clientRaw as { _id: unknown })._id)
      : clientRaw != null
        ? String(clientRaw)
        : '';
  let clientProfileName = '';
  let clientProfileEmail = '';
  let clientProfilePhone = '';
  if (clientRaw && typeof clientRaw === 'object' && clientRaw !== null && '_id' in clientRaw) {
    const cr = clientRaw as { fullName?: string; email?: string; phone?: string };
    clientProfileName = typeof cr.fullName === 'string' ? cr.fullName : '';
    clientProfileEmail = typeof cr.email === 'string' ? cr.email : '';
    clientProfilePhone = typeof cr.phone === 'string' ? cr.phone : '';
  }
  const created =
    typeof a.createdAt === 'string' || a.createdAt instanceof Date
      ? new Date(a.createdAt as string | Date)
      : new Date();
  const st = (a.status as string) || 'confirmed';
  const status = (
    ['pending', 'confirmed', 'cancelled', 'completed', 'pending_payment', 'pending_approval', 'finished'].includes(
      st
    )
      ? st
      : 'confirmed'
  ) as AppointmentStatus;

  const serviceName =
    (typeof a.service === 'string' && a.service.trim()) ||
    serviceFromRef ||
    profService ||
    'Servicio';
  const professionalName =
    (typeof a.professionalName === 'string' && a.professionalName.trim()) ||
    (typeof a.professional === 'string' && a.professional.trim()) ||
    profName ||
    'Profesional';

  return {
    id: String(a._id),
    service: serviceName,
    professional: professionalName,
    professionalId: profId,
    date: String(a.date),
    time: String(a.time),
    notes: (a.notes as string) || '',
    status,
    clientId,
    // Perfil poblado manda sobre campos denormalizados (evita datos viejos tras editar paciente).
    clientName: clientProfileName || (a.patientName as string) || 'Cliente',
    patientName: clientProfileName || (a.patientName as string) || '',
    patientEmail: clientProfileEmail || (a.patientEmail as string) || '',
    patientPhone: clientProfilePhone || (a.patientPhone as string) || '',
    totalAmount:
      typeof a.totalAmount === 'number'
        ? a.totalAmount
        : typeof a.price === 'number'
          ? a.price
          : 0,
    depositAmount: typeof a.depositAmount === 'number' ? a.depositAmount : undefined,
    paymentStatus: typeof a.paymentStatus === 'string' ? a.paymentStatus : undefined,
    createdAt: created,
  };
}

/** Servidor tiene prioridad; del caché solo entran ids que el API no devolvió (evita borrar citas si el GET filtró mal). */
function mergeAppointmentsFromApiAndCache(
  fromApi: Appointment[],
  cached: Appointment[]
): Appointment[] {
  const map = new Map<string, Appointment>();
  for (const row of fromApi) {
    map.set(String(row.id), row);
  }
  for (const row of cached) {
    const id = String(row.id);
    if (!map.has(id)) {
      map.set(id, {
        ...row,
        createdAt:
          row.createdAt instanceof Date ? row.createdAt : new Date(row.createdAt),
      });
    }
  }
  return Array.from(map.values());
}

async function readCachedAppointments(): Promise<Appointment[]> {
  const raw = await AsyncStorage.getItem('appointments');
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>[];
    return parsed.map((a) => ({
      ...(a as unknown as Appointment),
      createdAt: new Date(a.createdAt as string | Date),
    }));
  } catch {
    return [];
  }
}

interface AppointmentContextType {
  appointments: Appointment[];
  addAppointment: (appointment: AppointmentCreateInput) => Promise<void>;
  updateAppointmentStatus: (appointmentId: string, status: Appointment['status']) => Promise<void>;
  deleteAppointment: (appointmentId: string) => Promise<void>;
  getAppointmentsForUser: (userId: string) => Appointment[];
  getUpcomingAppointments: (userId: string) => Appointment[];
  getPendingAppointments: (userId: string) => Appointment[];
  confirmAppointment: (appointmentId: string) => Promise<void>;
  rejectAppointment: (appointmentId: string) => Promise<void>;
  completeAppointment: (
    appointmentId: string,
    session?: { notes?: string; treatmentSummary?: string }
  ) => Promise<void>;
  /** Paciente: cancela vía API con regla de 48 h; actualiza estado local si OK. */
  cancelAppointmentAsClient: (appointmentId: string) => Promise<{ ok: boolean; message?: string }>;
  /** Paciente: nueva fecha/hora; misma regla 48 h que cancelar; actualiza local y bloqueos de agenda. */
  rescheduleAppointmentAsClient: (
    appointmentId: string,
    newDate: string,
    newTime: string
  ) => Promise<{ ok: boolean; message?: string }>;
  cancelAppointmentAsProfessional: (
    appointmentId: string
  ) => Promise<{ ok: boolean; message?: string }>;
  rescheduleAppointmentAsProfessional: (
    appointmentId: string,
    newDate: string,
    newTime: string
  ) => Promise<{ ok: boolean; message?: string }>;
  refreshAppointments: () => Promise<void>;
  loading: boolean;
  error: string | null;
}

const AppointmentContext = createContext<AppointmentContextType | undefined>(undefined);

export const useAppointments = () => {
  // Usar el contexto local directamente
  const context = useContext(AppointmentContext);
  if (!context) {
    console.warn('useAppointments: Usando valores por defecto - AppointmentProvider no disponible');
    return {
      appointments: [],
      addAppointment: async () => console.warn('AppointmentProvider not available'),
      updateAppointmentStatus: async () => console.warn('AppointmentProvider not available'),
      deleteAppointment: async () => console.warn('AppointmentProvider not available'),
      getAppointmentsForUser: () => [],
      getUpcomingAppointments: () => [],
      getPendingAppointments: () => [],
      confirmAppointment: async () => console.warn('AppointmentProvider not available'),
      rejectAppointment: async () => console.warn('AppointmentProvider not available'),
      completeAppointment: async () => console.warn('AppointmentProvider not available'),
      cancelAppointmentAsClient: async () => ({ ok: false, message: 'AppointmentProvider not available' }),
      rescheduleAppointmentAsClient: async () => ({
        ok: false,
        message: 'AppointmentProvider not available',
      }),
      cancelAppointmentAsProfessional: async () => ({
        ok: false,
        message: 'AppointmentProvider not available',
      }),
      rescheduleAppointmentAsProfessional: async () => ({
        ok: false,
        message: 'AppointmentProvider not available',
      }),
      refreshAppointments: async () => console.warn('AppointmentProvider not available'),
      loading: false,
      error: null,
    };
  }
  return context;
};

export const AppointmentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { blockTimeSlot, unblockAppointmentTimeSlots } = useAvailability();

  // SOLUCIÓN DEFINITIVA: NO cargar citas hasta que el usuario esté realmente logueado
  useEffect(() => {
    const uid = user?._id != null ? String(user._id) : '';
    const email = String(user?.email || '');
    // Solo cargar citas si hay un usuario REAL (no de prueba) y está autenticado
    if (
      user &&
      uid &&
      !uid.startsWith('test_') &&
      !email.includes('test.') &&
      email !== 'test.professional@turnario.com'
    ) {
      console.log('👤 Usuario REAL autenticado, cargando citas...');
      loadAppointments();
    } else {
      console.log('⚠️ Usuario no autenticado o es usuario de prueba, NO cargando citas');
    }
  }, [user]);

  // Cargar citas: Mongo (ExpoAppointment) + JWT; fusionar con caché para no perder filas si el GET vino vacío
  const loadAppointments = async () => {
    try {
      setLoading(true);
      setError(null);

      const cached = await readCachedAppointments();

      const token = await simpleAuthService.getToken();
      const authHeaders: Record<string, string> = {};
      if (token) {
        authHeaders.Authorization = `Bearer ${token}`;
      }

      const userId = String(user?._id || user?.id || '').trim();

      const tryFetchList = async (path: string): Promise<Appointment[] | null> => {
        if (!userId || userId.length !== 24) {
          return null;
        }
        const url = `${getBackendBaseUrl()}${path}`;
        const response = await fetch(url, { headers: authHeaders });
        if (!response.ok) {
          console.log(`❌ Citas API ${path}: HTTP ${response.status}`);
          return null;
        }
        const data = await response.json();
        if (!data.success || !Array.isArray(data.data)) {
          return null;
        }
        return data.data.map((row: Record<string, unknown>) => mapExpoAppointmentDoc(row));
      };

      if (user?.userType === 'professional') {
        const fromApi = await tryFetchList(`/api/v1/appointments/professional/${userId}`);
        if (fromApi !== null) {
          const merged = mergeAppointmentsFromApiAndCache(fromApi, cached);
          setAppointments(merged);
          await AsyncStorage.setItem('appointments', JSON.stringify(merged));
          console.log(
            `✅ Citas profesional — API: ${fromApi.length}, tras fusionar caché: ${merged.length}`
          );
          return;
        }
      }

      if (user?.userType === 'client') {
        const fromApi = await tryFetchList(`/api/v1/appointments/client/${userId}`);
        if (fromApi !== null) {
          const merged = mergeAppointmentsFromApiAndCache(fromApi, cached);
          setAppointments(merged);
          await AsyncStorage.setItem('appointments', JSON.stringify(merged));
          console.log(
            `✅ Citas cliente — API: ${fromApi.length}, tras fusionar caché: ${merged.length}`
          );
          return;
        }
      }

      if (cached.length > 0) {
        setAppointments(cached);
        console.log('📱 Citas solo desde AsyncStorage (sin token o API no disponible):', cached.length);
        return;
      }

      setAppointments([]);
      console.log('📋 Sin citas en servidor ni caché local');
    } catch (error) {
      console.error('Error loading appointments:', error);
      setError('Error al cargar citas');
    } finally {
      setLoading(false);
    }
  };

  // Refrescar citas
  const refreshAppointments = async () => {
    await loadAppointments();
  };

  // Guardar citas en AsyncStorage
  const saveAppointments = async (newAppointments: Appointment[]) => {
    try {
      await AsyncStorage.setItem('appointments', JSON.stringify(newAppointments));
    } catch (error) {
      console.error('Error saving appointments:', error);
    }
  };

  // Agregar cita (backend y local)
  const addAppointment = async (appointmentData: AppointmentCreateInput) => {
    try {
      // SOLUCIÓN DEFINITIVA: Crear cita solo localmente
      console.log('📱 Creando cita localmente (modo desarrollo)');

      const appointmentId =
        (appointmentData.id && String(appointmentData.id).trim()) ||
        Date.now().toString() + Math.random().toString(36).substr(2, 9);
      const newAppointment: Appointment = {
        ...appointmentData,
        professional:
          appointmentData.professional ??
          appointmentData.professionalId ??
          'Profesional',
        clientId: appointmentData.clientId ?? appointmentData.patientId ?? '',
        clientName:
          appointmentData.clientName ??
          appointmentData.patientName ??
          'Cliente',
        id: appointmentId,
        createdAt: new Date(),
        status: appointmentData.status || 'pending',
      };

      const updatedAppointments = [newAppointment, ...appointments];
      setAppointments(updatedAppointments);
      saveAppointments(updatedAppointments);
      console.log('📅 Nueva cita agregada localmente:', newAppointment);

      // Bloquear horario para cualquier cita activa (confirmada o por confirmar / pago pendiente).
      // Si no se bloquea en pending_approval, otro cliente puede tomar el mismo turno.
      const profId = appointmentData.professionalId;
      const status = String(newAppointment.status || '');
      const shouldBlockSlot = !['cancelled', 'rejected', 'no_show'].includes(status);
      if (
        shouldBlockSlot &&
        appointmentId &&
        isMongoObjectIdString(profId)
      ) {
        try {
          await blockTimeSlot(
            profId,
            appointmentData.date,
            appointmentData.time,
            appointmentId,
            status === 'pending_approval' || status === 'pending_payment' || status === 'pending'
              ? 'Cita pendiente de confirmación'
              : 'Cita programada'
          );
          console.log('🔒 Horario bloqueado automáticamente para cita:', appointmentId, status);
        } catch (blockError) {
          console.error('⚠️ Error bloqueando horario (cita creada pero horario no bloqueado):', blockError);
          // No lanzar error aquí para no afectar la creación de la cita
        }
      } else if (appointmentId && !isMongoObjectIdString(profId)) {
        console.log(
          'ℹ️ Sin bloqueo remoto de horario: professionalId no es ObjectId de Mongo (demo o usuario local).'
        );
      }
      
    } catch (error) {
      console.error('Error adding appointment:', error);
      throw error;
    }
  };

  // Actualizar estado de cita
  const updateAppointmentStatus = async (appointmentId: string, status: Appointment['status']) => {
    try {
      // Obtener datos de la cita antes de actualizar para manejar bloqueos
      const appointmentToUpdate = appointments.find(appointment => appointment.id === appointmentId);
      
      // SOLUCIÓN DEFINITIVA: Solo actualizar localmente
      console.log('📱 Actualizando estado de cita localmente (modo desarrollo)');
      
      // Desbloquear horarios cuando se cancela una cita
      if (
        status === 'cancelled' &&
        appointmentToUpdate &&
        unblockAppointmentTimeSlots &&
        isMongoObjectIdString(appointmentToUpdate.professionalId)
      ) {
        try {
          await unblockAppointmentTimeSlots(
            appointmentToUpdate.professionalId,
            appointmentId
          );
          console.log('🔓 Horarios desbloqueados para cita cancelada:', appointmentId);
        } catch (unblockError) {
          console.error('⚠️ Error desbloqueando horarios:', unblockError);
        }
      }
      
      // Actualizar localmente
      const updatedAppointments = appointments.map(appointment =>
        appointment.id === appointmentId ? { ...appointment, status } : appointment
      );
      setAppointments(updatedAppointments);
      saveAppointments(updatedAppointments);
      
    } catch (error) {
      console.error('Error updating appointment status:', error);
    }
  };

  // Eliminar cita
  const deleteAppointment = async (appointmentId: string) => {
    try {
      // Obtener datos de la cita antes de eliminarla para desbloquear horarios
      const appointmentToDelete = appointments.find(appointment => appointment.id === appointmentId);
      
      // SOLUCIÓN DEFINITIVA: Solo eliminar localmente
      console.log('📱 Eliminando cita localmente (modo desarrollo)');
      
      // Desbloquear horarios si la cita existe
      if (
        appointmentToDelete &&
        unblockAppointmentTimeSlots &&
        isMongoObjectIdString(appointmentToDelete.professionalId)
      ) {
        try {
          await unblockAppointmentTimeSlots(
            appointmentToDelete.professionalId,
            appointmentId
          );
          console.log('🔓 Horarios desbloqueados para cita cancelada:', appointmentId);
        } catch (unblockError) {
          console.error('⚠️ Error desbloqueando horarios (cita cancelada pero horarios no desbloqueados):', unblockError);
          // No lanzar error aquí para no afectar la cancelación de la cita
        }
      } else if (appointmentToDelete && !unblockAppointmentTimeSlots) {
        console.warn('⚠️ unblockAppointmentTimeSlots no disponible, horarios no desbloqueados');
      }
      
      // Eliminar localmente
      const updatedAppointments = appointments.filter(appointment => appointment.id !== appointmentId);
      setAppointments(updatedAppointments);
      saveAppointments(updatedAppointments);
      
    } catch (error) {
      console.error('Error deleting appointment:', error);
    }
  };

  // Obtener citas del usuario
  const getAppointmentsForUser = (userId: string) => {
    return appointments.filter(appointment => 
      appointment.clientId === userId || appointment.professionalId === userId
    ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  // Obtener citas próximas
  const getUpcomingAppointments = (userId: string) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Normalizar a inicio del día
    
    console.log('🔍 getUpcomingAppointments - Parámetros:', {
      userId,
      totalAppointments: appointments.length,
      today: now.toISOString().split('T')[0],
      appointments: appointments.map(apt => ({
        id: apt.id,
        professionalId: apt.professionalId,
        clientId: apt.clientId,
        date: apt.date,
        status: apt.status,
        patientName: apt.patientName
      }))
    });
    
    const filteredAppointments = appointments.filter(appointment => {
      // Para profesionales, mostrar todas sus citas (el backend ya filtró por professionalId)
      // Para clientes, filtrar por clientId
      const userIdString = userId?.toString();
      const professionalIdString = appointment.professionalId?.toString();
      const clientIdString = appointment.clientId?.toString();
      
      let belongsToUser = false;
      
      if (user?.userType === 'professional') {
        // Si es profesional, todas las citas ya vienen filtradas del backend, aceptarlas todas
        belongsToUser = true;
        console.log('👨‍⚕️ Profesional - Aceptando cita automáticamente');
      } else {
        const patientIdString = appointment.patientId?.toString();
        belongsToUser =
          clientIdString === userIdString ||
          patientIdString === userIdString;
      }
      
      // Incluye esperando confirmación del profesional
      const isActive =
        appointment.status === 'confirmed' ||
        appointment.status === 'pending' ||
        appointment.status === 'pending_approval' ||
        appointment.status === 'pending_payment';
      
      // Verificar que la fecha es hoy o futura (soportar formato ISO y formato legible)
      let appointmentDate: Date;
      try {
        // Si la fecha está en formato ISO (2025-10-06)
        if (appointment.date.includes('-')) {
          appointmentDate = new Date(appointment.date + 'T00:00:00');
        } else {
          // Si está en formato legible, intentar parsear
          appointmentDate = new Date(appointment.date);
        }
        appointmentDate.setHours(0, 0, 0, 0);
      } catch {
        return false; // Si no se puede parsear la fecha, excluir la cita
      }
      
      const isTodayOrFuture = appointmentDate >= now;
      
      console.log('🔍 Filtro de citas próximas:', {
        appointmentId: appointment.id,
        professionalId: appointment.professionalId,
        clientId: appointment.clientId,
        userId,
        date: appointment.date,
        today: now.toISOString().split('T')[0],
        belongsToUser,
        isActive,
        isTodayOrFuture,
        status: appointment.status,
        patientName: appointment.patientName
      });
      
      return belongsToUser && isActive && isTodayOrFuture;
    });
    
    console.log('🔍 Citas filtradas:', filteredAppointments.length, filteredAppointments.map(apt => ({
      id: apt.id,
      patientName: apt.patientName,
      date: apt.date,
      status: apt.status
    })));
    
    return filteredAppointments.sort((a, b) => {
      // Ordenar por fecha y hora
      try {
        const dateA = a.date.includes('-') ? new Date(a.date + 'T' + a.time) : new Date(a.date + ' ' + a.time);
        const dateB = b.date.includes('-') ? new Date(b.date + 'T' + b.time) : new Date(b.date + ' ' + b.time);
        return dateA.getTime() - dateB.getTime();
      } catch {
        return 0; // Mantener orden original si hay error
      }
    });
  };

  // Obtener citas pendientes
  const getPendingAppointments = (userId: string) => {
    return appointments.filter(appointment => 
      String(appointment.professionalId) === String(userId) &&
          (appointment.status === 'pending' || appointment.status === 'pending_approval')
    ).sort((a, b) => new Date(a.date).getTime() - new Date(a.date).getTime());
  };

  // Confirmar cita
  const confirmAppointment = async (appointmentId: string) => {
    try {
      const aptSnapshot = appointments.find((a) => String(a.id) === String(appointmentId));
      const token = await simpleAuthService.getToken();
      if (token && isMongoObjectIdString(appointmentId)) {
        const res = await fetch(
          `${getBackendBaseUrl()}/api/v1/appointments/expo/${appointmentId}/confirm`,
          {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );
        if (!res.ok) {
          const t = await res.text();
          console.warn('⚠️ confirmAppointment API:', res.status, t);
        }
      }
      await updateAppointmentStatus(appointmentId, 'confirmed');
      if (
        aptSnapshot &&
        blockTimeSlot &&
        isMongoObjectIdString(aptSnapshot.professionalId)
      ) {
        try {
          await blockTimeSlot(
            aptSnapshot.professionalId,
            aptSnapshot.date,
            aptSnapshot.time,
            appointmentId,
            'Cita confirmada'
          );
        } catch (e) {
          console.warn('Bloqueo de horario tras confirmar:', e);
        }
      }
      await refreshAppointments();
      console.log('✅ Cita confirmada:', appointmentId);
    } catch (error) {
      console.error('Error confirming appointment:', error);
    }
  };

  // Rechazar cita
  const rejectAppointment = async (appointmentId: string) => {
    try {
      const token = await simpleAuthService.getToken();
      if (token && isMongoObjectIdString(appointmentId)) {
        const res = await fetch(
          `${getBackendBaseUrl()}/api/v1/appointments/expo/${appointmentId}/reject`,
          {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );
        if (!res.ok) {
          const t = await res.text();
          console.warn('⚠️ rejectAppointment API:', res.status, t);
        }
      }
      
      await updateAppointmentStatus(appointmentId, 'cancelled');
      await refreshAppointments();
      console.log('❌ Cita rechazada:', appointmentId);
    } catch (error) {
      console.error('Error rejecting appointment:', error);
    }
  };

  const completeAppointment = async (
    appointmentId: string,
    session?: { notes?: string; treatmentSummary?: string }
  ) => {
    try {
      const token = await simpleAuthService.getToken();
      if (token && isMongoObjectIdString(appointmentId)) {
        const res = await fetch(
          `${getBackendBaseUrl()}/api/v1/appointments/expo/${appointmentId}/complete`,
          {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              notes: session?.notes || '',
              treatmentSummary: session?.treatmentSummary || '',
            }),
          }
        );
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(
            (typeof json.message === 'string' && json.message) ||
              `No se pudo completar la cita (${res.status})`
          );
        }
      }
      await updateAppointmentStatus(appointmentId, 'completed');
      await refreshAppointments();
      console.log('✅ Cita marcada como completada:', appointmentId);
    } catch (error) {
      console.error('Error completing appointment:', error);
      throw error;
    }
  };

  const cancelAppointmentAsClient = async (
    appointmentId: string
  ): Promise<{ ok: boolean; message?: string }> => {
    if (user?.userType !== 'client') {
      return { ok: false, message: 'Solo los pacientes pueden usar esta acción.' };
    }
    const apt = appointments.find((a) => String(a.id) === String(appointmentId));
    if (!apt) {
      return { ok: false, message: 'Cita no encontrada.' };
    }
    const gate = canClientCancelAppointment(apt.date, apt.time);
    if (!gate.ok) {
      return { ok: false, message: gate.message };
    }

    const token = await simpleAuthService.getToken();
    const base = getBackendBaseUrl();
    if (token && isMongoObjectIdString(appointmentId)) {
      try {
        const res = await fetch(
          `${base}/api/v1/appointments/expo/${appointmentId}/cancel-by-client`,
          {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );
        const json = (await res.json().catch(() => ({}))) as {
          success?: boolean;
          message?: string;
        };
        if (!res.ok || !json.success) {
          return {
            ok: false,
            message:
              (typeof json.message === 'string' && json.message) ||
              `No se pudo cancelar (${res.status})`,
          };
        }
      } catch (e) {
        return {
          ok: false,
          message: e instanceof Error ? e.message : 'Error de red',
        };
      }
    }

    await updateAppointmentStatus(appointmentId, 'cancelled');
    await refreshAppointments();
    return { ok: true };
  };

  const rescheduleAppointmentAsClient = async (
    appointmentId: string,
    newDate: string,
    newTime: string
  ): Promise<{ ok: boolean; message?: string }> => {
    if (user?.userType !== 'client') {
      return { ok: false, message: 'Solo los pacientes pueden reprogramar citas.' };
    }
    const apt = appointments.find((a) => String(a.id) === String(appointmentId));
    if (!apt) {
      return { ok: false, message: 'Cita no encontrada.' };
    }
    const gate = canClientCancelAppointment(apt.date, apt.time);
    if (!gate.ok) {
      return { ok: false, message: gate.message };
    }
    const d0 = String(apt.date).trim();
    const t0 = String(apt.time).trim();
    const d1 = String(newDate).trim();
    const t1 = String(newTime).trim();
    if (!d1 || !t1) {
      return { ok: false, message: 'Elegí fecha y hora nuevas.' };
    }
    if (d0 === d1 && t0 === t1) {
      return { ok: false, message: 'La fecha y hora son las mismas que las actuales.' };
    }

    const token = await simpleAuthService.getToken();
    const base = getBackendBaseUrl();
    if (token && isMongoObjectIdString(appointmentId)) {
      try {
        const res = await fetch(
          `${base}/api/v1/appointments/expo/${appointmentId}/reschedule-by-client`,
          {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ newDate: d1, newTime: t1 }),
          }
        );
        const json = (await res.json().catch(() => ({}))) as {
          success?: boolean;
          message?: string;
        };
        if (!res.ok || !json.success) {
          return {
            ok: false,
            message:
              (typeof json.message === 'string' && json.message) ||
              `No se pudo reprogramar (${res.status})`,
          };
        }
        try {
          if (unblockAppointmentTimeSlots && isMongoObjectIdString(apt.professionalId)) {
            await unblockAppointmentTimeSlots(apt.professionalId, appointmentId);
          }
          if (blockTimeSlot && isMongoObjectIdString(apt.professionalId)) {
            await blockTimeSlot(apt.professionalId, d1, t1, appointmentId, 'Cita reprogramada');
          }
        } catch (e) {
          console.warn('rescheduleAppointmentAsClient — bloqueo de agenda:', e);
        }
        await refreshAppointments();
        return { ok: true };
      } catch (e) {
        return {
          ok: false,
          message: e instanceof Error ? e.message : 'Error de red',
        };
      }
    }

    try {
      if (unblockAppointmentTimeSlots && isMongoObjectIdString(apt.professionalId)) {
        await unblockAppointmentTimeSlots(apt.professionalId, appointmentId);
      }
      if (blockTimeSlot && isMongoObjectIdString(apt.professionalId)) {
        await blockTimeSlot(apt.professionalId, d1, t1, appointmentId, 'Cita reprogramada');
      }
    } catch (e) {
      console.warn('rescheduleAppointmentAsClient — bloqueo de agenda:', e);
    }

    const updatedAppointments = appointments.map((a) =>
      String(a.id) === String(appointmentId)
        ? { ...a, date: d1, time: t1, status: 'pending_approval' as const }
        : a
    );
    setAppointments(updatedAppointments);
    saveAppointments(updatedAppointments);
    return { ok: true };
  };

  const cancelAppointmentAsProfessional = async (
    appointmentId: string
  ): Promise<{ ok: boolean; message?: string }> => {
    if (user?.userType !== 'professional') {
      return { ok: false, message: 'Solo los profesionales pueden usar esta acción.' };
    }
    const apt = appointments.find((a) => String(a.id) === String(appointmentId));
    if (!apt) {
      return { ok: false, message: 'Cita no encontrada.' };
    }
    const token = await simpleAuthService.getToken();
    const base = getBackendBaseUrl();
    if (token && isMongoObjectIdString(appointmentId)) {
      try {
        const res = await fetch(
          `${base}/api/v1/appointments/expo/${appointmentId}/cancel-by-professional`,
          {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );
        const json = (await res.json().catch(() => ({}))) as {
          success?: boolean;
          message?: string;
        };
        if (!res.ok || !json.success) {
          return {
            ok: false,
            message:
              (typeof json.message === 'string' && json.message) ||
              `No se pudo cancelar (${res.status})`,
          };
        }
      } catch (e) {
        return {
          ok: false,
          message: e instanceof Error ? e.message : 'Error de red',
        };
      }
    }
    await updateAppointmentStatus(appointmentId, 'cancelled');
    await refreshAppointments();
    return { ok: true };
  };

  const rescheduleAppointmentAsProfessional = async (
    appointmentId: string,
    newDate: string,
    newTime: string
  ): Promise<{ ok: boolean; message?: string }> => {
    if (user?.userType !== 'professional') {
      return { ok: false, message: 'Solo los profesionales pueden reprogramar citas.' };
    }
    const apt = appointments.find((a) => String(a.id) === String(appointmentId));
    if (!apt) {
      return { ok: false, message: 'Cita no encontrada.' };
    }
    const d1 = String(newDate).trim();
    const t1 = String(newTime).trim();
    if (!d1 || !t1) {
      return { ok: false, message: 'Elegí fecha y hora nuevas.' };
    }
    if (String(apt.date).trim() === d1 && String(apt.time).trim() === t1) {
      return { ok: false, message: 'La fecha y hora son las mismas que las actuales.' };
    }

    const token = await simpleAuthService.getToken();
    const base = getBackendBaseUrl();
    if (token && isMongoObjectIdString(appointmentId)) {
      try {
        const res = await fetch(
          `${base}/api/v1/appointments/expo/${appointmentId}/reschedule-by-professional`,
          {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ newDate: d1, newTime: t1 }),
          }
        );
        const json = (await res.json().catch(() => ({}))) as {
          success?: boolean;
          message?: string;
        };
        if (!res.ok || !json.success) {
          return {
            ok: false,
            message:
              (typeof json.message === 'string' && json.message) ||
              `No se pudo reprogramar (${res.status})`,
          };
        }
        try {
          if (unblockAppointmentTimeSlots && isMongoObjectIdString(apt.professionalId)) {
            await unblockAppointmentTimeSlots(apt.professionalId, appointmentId);
          }
          if (blockTimeSlot && isMongoObjectIdString(apt.professionalId)) {
            await blockTimeSlot(apt.professionalId, d1, t1, appointmentId, 'Cita reprogramada (prof.)');
          }
        } catch (e) {
          console.warn('rescheduleAppointmentAsProfessional — bloqueo de agenda:', e);
        }
        await refreshAppointments();
        return { ok: true };
      } catch (e) {
        return {
          ok: false,
          message: e instanceof Error ? e.message : 'Error de red',
        };
      }
    }

    try {
      if (unblockAppointmentTimeSlots && isMongoObjectIdString(apt.professionalId)) {
        await unblockAppointmentTimeSlots(apt.professionalId, appointmentId);
      }
      if (blockTimeSlot && isMongoObjectIdString(apt.professionalId)) {
        await blockTimeSlot(apt.professionalId, d1, t1, appointmentId, 'Cita reprogramada (prof.)');
      }
    } catch (e) {
      console.warn('rescheduleAppointmentAsProfessional — bloqueo de agenda:', e);
    }
    const updatedAppointments = appointments.map((a) =>
      String(a.id) === String(appointmentId) ? { ...a, date: d1, time: t1 } : a
    );
    setAppointments(updatedAppointments);
    saveAppointments(updatedAppointments);
    return { ok: true };
  };

  const value: AppointmentContextType = {
    appointments,
    addAppointment,
    updateAppointmentStatus,
    deleteAppointment,
    getAppointmentsForUser,
    getUpcomingAppointments,
    getPendingAppointments,
    confirmAppointment,
    rejectAppointment,
    completeAppointment,
    cancelAppointmentAsClient,
    rescheduleAppointmentAsClient,
    cancelAppointmentAsProfessional,
    rescheduleAppointmentAsProfessional,
    refreshAppointments,
    loading,
    error,
  };

  return (
    <AppointmentContext.Provider value={value}>
      {children}
    </AppointmentContext.Provider>
  );
};
