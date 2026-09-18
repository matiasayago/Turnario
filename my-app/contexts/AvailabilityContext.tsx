// @ts-nocheck ? beta
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { getBackendBaseUrl } from '../config/backend';
import {
  availabilityService,
  isProfessionalMongoIdRejectedResponse,
} from '../services/availabilityService';

export interface ProfessionalAvailability {
  id: string;
  professionalId: string;
  professionalName: string;
  daysOfWeek: {
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
    saturday: boolean;
    sunday: boolean;
  };
  timeSlots: string[];
  workingHours: {
    start: string;
    end: string;
  };
  breakTime?: {
    start: string;
    end: string;
  };
  defaultTimeRanges?: Array<{
    start: string;
    end: string;
  }>;
  appointmentDuration?: number;
  maxAppointmentsPerDay?: number;
  advanceBookingDays?: number;
  replicateScopeWeeks?: number;
  overwriteDatesWithSchedule?: boolean;
  isActive: boolean;
  blockedTimeSlots?: BlockedTimeSlot[];
  createdAt: string;
  updatedAt: string;
}

export interface BlockedTimeSlot {
  timeSlot: string;
  appointmentId: string;
  reason: string;
  createdAt: string;
}

interface AvailabilityContextType {
  availabilities: ProfessionalAvailability[];
  availableProfessionals: Array<{
    id: string;
    name: string;
    specialty: string;
    services: string[];
    rating: number;
    reviews: number;
    price: number;
    duration: number;
    image?: string;
    isAvailable: boolean;
    location?: string;
    /** Nombres de consultorios (API GET /api/v1/professionals). */
    clinicNames?: string[];
    avatar?: string;
    /** Path/URL de foto de perfil del profesional. */
    profileImage?: string;
    experience?: string;
    /** Para contacto por WhatsApp (directorio API) */
    phone?: string;
    /** Si el profesional exige seña para reservas online (GET /api/v1/professionals). */
    clientBookingRequiresDeposit?: boolean;
    /** % de seña configurado por el profesional (GET /api/v1/professionals). */
    depositPercentage?: number;
    /** Super profesional: coincide con cualquier servicio del catálogo (API). */
    offersAllCatalogServices?: boolean;
  }>;
  getAvailabilityByProfessional: (professionalId: string) => ProfessionalAvailability | null;
  updateAvailability: (professionalId: string, availability: Partial<ProfessionalAvailability>) => Promise<void>;
  createAvailability: (availability: Omit<ProfessionalAvailability, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  createAvailabilityForUser: (userId: string, userName: string) => Promise<ProfessionalAvailability>;
  syncFromScheduleData: (professionalId: string, scheduleData: any) => Promise<void>;
  syncWithBackend: (professionalId: string) => Promise<ProfessionalAvailability | null>;
  isDateAvailable: (professionalId: string, date: Date) => boolean;
  getAvailableTimeSlots: (professionalId: string, date: Date) => string[];
  blockTimeSlot: (professionalId: string, date: string, timeSlot: string, appointmentId: string, reason?: string) => Promise<void>;
  unblockTimeSlot: (professionalId: string, date: string, timeSlot: string, appointmentId: string) => Promise<void>;
  unblockAppointmentTimeSlots: (professionalId: string, appointmentId: string) => Promise<void>;
  getBlockedTimeSlots: (professionalId: string, date: string) => Promise<BlockedTimeSlot[]>;
  isTimeSlotBlocked: (professionalId: string, date: Date, timeSlot: string) => boolean;
  isLoading: boolean;
  /** Vuelve a pedir el listado p?blico de profesionales (p. ej. tras guardar servicio en perfil). */
  refreshProfessionalDirectory: () => Promise<boolean | void>;
}

const AvailabilityContext = createContext<AvailabilityContextType | undefined>(undefined);

export const useAvailability = () => {
  const context = useContext(AvailabilityContext);
  if (!context) {
    throw new Error('useAvailability must be used within an AvailabilityProvider');
  }
  return context;
};

interface AvailabilityProviderProps {
  children: ReactNode;
}

/** Demo local; se combina con profesionales reales de GET /api/v1/professionals (MongoDB). */
const MOCK_PROFESSIONALS: AvailabilityContextType['availableProfessionals'] = [
  {
    id: '1',
    name: 'Dr. Carlos Mendoza',
    specialty: 'Psicologia y Salud Mental',
    services: [
      'Consulta Psicologica',
      'Terapia Cognitivo-Conductual',
      'Terapia Familiar',
      'Psicologia Infantil',
    ],
    rating: 4.8,
    reviews: 124,
    price: 5000,
    duration: 50,
    image: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=150&h=150&fit=crop&crop=face',
    isAvailable: true,
    location: 'Consultorio Central · Sede Palermo',
    clinicNames: ['Consultorio Central', 'Sede Palermo'],
    avatar: 'CM',
    experience: '15 anos',
    phone: '+54 9 11 5555-0001',
  },
  {
    id: '2',
    name: 'Dra. Maria Gonzalez',
    specialty: 'Medicina General',
    services: ['Consulta Medica General', 'Consulta de Pediatria'],
    rating: 4.9,
    reviews: 89,
    price: 4500,
    duration: 30,
    image: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&h=150&fit=crop&crop=face',
    isAvailable: true,
    location: 'Consultorio Norte',
    clinicNames: ['Consultorio Norte'],
    avatar: 'MG',
    experience: '12 anos',
    phone: '+54 9 11 5555-0002',
  },
  {
    id: '3',
    name: 'Dr. Juan Perez',
    specialty: 'Cardiologia',
    services: ['Consulta de Cardiologia'],
    rating: 4.7,
    reviews: 156,
    price: 8000,
    duration: 60,
    image: 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=150&h=150&fit=crop&crop=face',
    isAvailable: true,
    location: 'Instituto Cardio Recoleta',
    clinicNames: ['Instituto Cardio Recoleta'],
    avatar: 'JP',
    experience: '20 anos',
  },
  {
    id: '4',
    name: 'Dra. Ana Rodriguez',
    specialty: 'Dermatologia',
    services: ['Consulta de Dermatologia'],
    rating: 4.6,
    reviews: 78,
    price: 6000,
    duration: 40,
    image: 'https://images.unsplash.com/photo-1594824388852-9a1a3b8b4d8c?w=150&h=150&fit=crop&crop=face',
    isAvailable: true,
    location: 'Caballito · Once',
    clinicNames: ['Caballito', 'Once'],
    avatar: 'AR',
    experience: '10 anos',
  },
];

export const AvailabilityProvider: React.FC<AvailabilityProviderProps> = ({ children }) => {
  const [availabilities, setAvailabilities] = useState<ProfessionalAvailability[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [directoryProfessionals, setDirectoryProfessionals] =
    useState<AvailabilityContextType['availableProfessionals']>([]);

  // Cargar disponibilidades al inicializar
  useEffect(() => {
    loadAvailabilities();
  }, []);

  const loadProfessionalDirectory = useCallback(async () => {
    try {
      const res = await fetch(`${getBackendBaseUrl()}/api/v1/professionals`);
      if (!res.ok) {
        console.warn('Directorio de profesionales: HTTP', res.status);
        return false;
      }
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setDirectoryProfessionals(json.data);
        return true;
      }
      return false;
    } catch (e) {
      console.warn('Directorio de profesionales (API) no disponible:', e);
      return false;
    }
  }, []);

  useEffect(() => {
    loadProfessionalDirectory();
  }, [loadProfessionalDirectory]);

  /** Si el API respondió, no mezclar mocks demo (tapaban el vacío real / confundían el filtro). */
  const availableProfessionals = useMemo(() => {
    if (directoryProfessionals.length > 0) {
      return directoryProfessionals;
    }
    return MOCK_PROFESSIONALS;
  }, [directoryProfessionals]);

  const loadAvailabilities = async () => {
    try {
      setIsLoading(true);
      console.log('?? Cargando disponibilidades...');
      
      // Primero intentar cargar desde AsyncStorage para mostrar datos r?pidamente
      const stored = await AsyncStorage.getItem('professional_availabilities');
      if (stored) {
        const parsed = JSON.parse(stored);
        setAvailabilities(parsed);
        console.log('?? Disponibilidades cargadas desde AsyncStorage:', parsed.length);
      }
      
      // Luego intentar sincronizar con el backend para obtener datos actualizados
      try {
        console.log('?? Intentando sincronizar con backend...');
        // Nota: En un escenario real, aqu? cargar?amos todas las disponibilidades del backend
        // Por ahora, solo logueamos que intentamos sincronizar
        console.log('? Sincronizaci?n con backend completada');
      } catch (backendError) {
        console.warn('?? Error sincronizando con backend, usando datos locales:', backendError);
      }
      
      // Si no hay datos almacenados, crear disponibilidades por defecto
      if (!stored) {
        console.log('?? No hay datos almacenados, creando disponibilidades por defecto...');
        await createDefaultAvailabilities();
      }
    } catch (error) {
      console.error('? Error cargando disponibilidades:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createDefaultAvailabilities = async () => {
    // Crear disponibilidades por defecto para profesionales predefinidos
    const defaultAvailabilities: ProfessionalAvailability[] = [
      {
        id: 'avail_1',
        professionalId: '1',
        professionalName: 'Dr. Carlos Mendoza',
        daysOfWeek: {
          monday: true,
          tuesday: true,
          wednesday: true,
          thursday: true,
          friday: true,
          saturday: false,
          sunday: false,
        },
        timeSlots: ['08:00', '09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00', '18:00'],
        workingHours: {
          start: '08:00',
          end: '18:00',
        },
        breakTime: {
          start: '13:00',
          end: '14:00',
        },
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'avail_2',
        professionalId: '2',
        professionalName: 'Dra. Mar?a Gonz?lez',
        daysOfWeek: {
          monday: true,
          tuesday: true,
          wednesday: true,
          thursday: true,
          friday: true,
          saturday: true,
          sunday: false,
        },
        timeSlots: ['08:00', '09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00', '18:00'],
        workingHours: {
          start: '08:00',
          end: '19:00',
        },
        breakTime: {
          start: '13:00',
          end: '14:00',
        },
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'avail_3',
        professionalId: '3',
        professionalName: 'Lic. Juan P?rez',
        daysOfWeek: {
          monday: true,
          tuesday: true,
          wednesday: false,
          thursday: true,
          friday: true,
          saturday: true,
          sunday: false,
        },
        timeSlots: ['10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'],
        workingHours: {
          start: '10:00',
          end: '18:00',
        },
        breakTime: {
          start: '13:00',
          end: '14:00',
        },
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    setAvailabilities(defaultAvailabilities);
    await AsyncStorage.setItem('professional_availabilities', JSON.stringify(defaultAvailabilities));
  };

  // Funci?n para crear disponibilidad para un usuario espec?fico
  const createAvailabilityForUser = async (userId: string, userName: string) => {
    const existingAvailability = getAvailabilityByProfessional(userId);
    if (existingAvailability) {
      console.log('?? Disponibilidad ya existe para usuario:', userId);
      return existingAvailability;
    }

    console.log('? Creando disponibilidad para usuario:', userId);
    
    const newAvailability: ProfessionalAvailability = {
      id: `avail_${userId}_${Date.now()}`,
      professionalId: userId,
      professionalName: userName,
      daysOfWeek: {
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        friday: true,
        saturday: false,
        sunday: false,
      },
      timeSlots: ['08:00', '09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'],
      workingHours: {
        start: '08:00',
        end: '18:00',
      },
      breakTime: {
        start: '13:00',
        end: '14:00',
      },
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updatedAvailabilities = [...availabilities, newAvailability];
    setAvailabilities(updatedAvailabilities);
    await AsyncStorage.setItem('professional_availabilities', JSON.stringify(updatedAvailabilities));
    
    console.log('? Disponibilidad creada para usuario:', userId);
    return newAvailability;
  };

  const getAvailabilityByProfessional = (professionalId: string): ProfessionalAvailability | null => {
    return availabilities.find(avail => avail.professionalId === professionalId) || null;
  };

  const updateAvailability = async (professionalId: string, updates: Partial<ProfessionalAvailability>) => {
    try {
      console.log('?? Actualizando disponibilidad para profesional:', professionalId);
      console.log('?? Datos a actualizar:', JSON.stringify(updates, null, 2));
      
      // Actualizar en el backend
      const response = await availabilityService.createOrUpdateAvailability(professionalId, updates);
      
      if (response.success) {
        console.log('? Respuesta del backend:', response);
        
        // Actualizar localmente con los datos del backend si est?n disponibles
        let updatedAvailability;
        if (response.data && Object.keys(response.data).length > 0) {
          // Usar datos del backend
          updatedAvailability = {
            ...response.data,
            id: response.data.id || response.data._id || `avail_${Date.now()}`,
            createdAt: response.data.createdAt || new Date().toISOString(),
            updatedAt: response.data.updatedAt || new Date().toISOString(),
          };
          console.log('? Usando datos del backend:', updatedAvailability);
        } else {
          // Fallback: actualizar localmente con los datos enviados
          const existingAvailability = availabilities.find(avail => avail.professionalId === professionalId);
          updatedAvailability = {
            ...existingAvailability,
            ...updates,
            professionalId: professionalId,
            updatedAt: new Date().toISOString(),
            createdAt: existingAvailability?.createdAt || new Date().toISOString(),
            id: existingAvailability?.id || `avail_${Date.now()}`,
          };
          console.log('? Usando datos locales actualizados:', updatedAvailability);
        }
        
        const updatedAvailabilities = availabilities.map(avail => 
          avail.professionalId === professionalId ? updatedAvailability : avail
        );
        
        // Si no existe, agregarlo
        if (!availabilities.find(avail => avail.professionalId === professionalId)) {
          updatedAvailabilities.push(updatedAvailability);
        }
        
        setAvailabilities(updatedAvailabilities);
        await AsyncStorage.setItem('professional_availabilities', JSON.stringify(updatedAvailabilities));
        
        console.log('? Disponibilidad actualizada para profesional:', professionalId);
        console.log('? Datos finales guardados:', updatedAvailability);
      } else if (
        isProfessionalMongoIdRejectedResponse({
          error: response.error,
          message: response.message,
        })
      ) {
        console.log(
          'Disponibilidad en servidor no disponible: sesi\u00f3n sin _id MongoDB. Datos locales se mantienen; inici\u00e1 sesi\u00f3n con cuenta del backend para sincronizar.'
        );
      } else {
        console.error('? Error del backend:', response.error);
        throw new Error(response.error || 'Error actualizando disponibilidad en el backend');
      }
    } catch (error) {
      console.error('? Error actualizando disponibilidad:', error);
      throw error;
    }
  };

  const createAvailability = async (availability: Omit<ProfessionalAvailability, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      console.log('?? Creando nueva disponibilidad para profesional:', availability.professionalId);
      console.log('?? Datos a crear:', JSON.stringify(availability, null, 2));
      
      // Crear en el backend
      const response = await availabilityService.createOrUpdateAvailability(availability.professionalId, availability);
      
      if (response.success) {
        console.log('? Respuesta del backend al crear:', response);
        
        // Crear disponibilidad local
        const newAvailability: ProfessionalAvailability = {
          ...availability,
          id: response.data?.id || response.data?._id || `avail_${Date.now()}`,
          createdAt: response.data?.createdAt || new Date().toISOString(),
          updatedAt: response.data?.updatedAt || new Date().toISOString(),
        };
        
        // Actualizar en el contexto local
        const updatedAvailabilities = [...availabilities, newAvailability];
        setAvailabilities(updatedAvailabilities);
        await AsyncStorage.setItem('professional_availabilities', JSON.stringify(updatedAvailabilities));
        
        console.log('? Nueva disponibilidad creada para profesional:', availability.professionalId);
        console.log('? Datos creados:', newAvailability);
      } else if (
        isProfessionalMongoIdRejectedResponse({
          error: response.error,
          message: response.message,
        })
      ) {
        console.log(
          'Disponibilidad en servidor no disponible: sesi\u00f3n sin _id MongoDB. Us\u00e1 cuenta del backend para guardar en el servidor.'
        );
      } else {
        console.error('? Error del backend al crear:', response.error);
        throw new Error(response.error || 'Error creando disponibilidad en el backend');
      }
    } catch (error) {
      console.error('? Error creando disponibilidad:', error);
      throw error;
    }
  };

  const isDateAvailable = (professionalId: string, date: Date): boolean => {
    // Verificar que la fecha sea v?lida
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      console.warn('Fecha invalida en isDateAvailable (AvailabilityContext); se ignora el dia.');
      return false;
    }
    
    const availability = getAvailabilityByProfessional(professionalId);
    if (!availability || !availability.isActive) return false;

    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[date.getDay()] as keyof typeof availability.daysOfWeek;
    
    // Verificar si el d?a de la semana est? disponible
    const isDayAvailable = availability.daysOfWeek[dayName];
    
    // Verificar que no sea una fecha pasada
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isFutureDate = date >= today;
    
    return isDayAvailable && isFutureDate;
  };

  const getAvailableTimeSlots = (professionalId: string, date: Date): string[] => {
    const availability = getAvailabilityByProfessional(professionalId);
    if (!availability || !availability.isActive) return [];

    // Verificar si la fecha est? disponible
    if (!isDateAvailable(professionalId, date)) return [];

    // Obtener horarios bloqueados para esta fecha
    const blockedSlots = availability.blockedTimeSlots?.filter(blocked => {
      const blockedDate = new Date(blocked.createdAt);
      return blockedDate.toDateString() === date.toDateString();
    }).map(blocked => blocked.timeSlot) || [];

    // Filtrar horarios bloqueados
    return availability.timeSlots.filter(slot => !blockedSlots.includes(slot));
  };

  const blockTimeSlot = async (professionalId: string, date: string, timeSlot: string, appointmentId: string, reason: string = 'Cita programada') => {
    try {
      console.log('?? Bloqueando horario:', { professionalId, date, timeSlot, appointmentId, reason });
      
      const response = await availabilityService.blockTimeSlot(professionalId, {
        date,
        timeSlot,
        appointmentId,
        reason
      });

      if (response.success) {
        // Actualizar disponibilidad local
        const availability = getAvailabilityByProfessional(professionalId);
        if (availability) {
          const blockedTimeSlot: BlockedTimeSlot = {
            timeSlot,
            appointmentId,
            reason,
            createdAt: new Date().toISOString()
          };

          const updatedAvailability = {
            ...availability,
            blockedTimeSlots: [...(availability.blockedTimeSlots || []), blockedTimeSlot]
          };

          const updatedAvailabilities = availabilities.map(avail =>
            avail.professionalId === professionalId ? updatedAvailability : avail
          );

          setAvailabilities(updatedAvailabilities);
          await AsyncStorage.setItem('professional_availabilities', JSON.stringify(updatedAvailabilities));
        }
        
        console.log('? Horario bloqueado exitosamente');
      } else {
        throw new Error(response.error || 'Error bloqueando horario');
      }
    } catch (error) {
      console.error('? Error bloqueando horario:', error);
      throw error;
    }
  };

  const unblockTimeSlot = async (professionalId: string, date: string, timeSlot: string, appointmentId: string) => {
    try {
      console.log('?? Desbloqueando horario:', { professionalId, date, timeSlot, appointmentId });
      
      const response = await availabilityService.unblockTimeSlot(professionalId, {
        date,
        timeSlot,
        appointmentId
      });

      if (response.success) {
        // Actualizar disponibilidad local
        const availability = getAvailabilityByProfessional(professionalId);
        if (availability) {
          const updatedAvailability = {
            ...availability,
            blockedTimeSlots: (availability.blockedTimeSlots || []).filter(blocked =>
              !(blocked.timeSlot === timeSlot && blocked.appointmentId === appointmentId)
            )
          };

          const updatedAvailabilities = availabilities.map(avail =>
            avail.professionalId === professionalId ? updatedAvailability : avail
          );

          setAvailabilities(updatedAvailabilities);
          await AsyncStorage.setItem('professional_availabilities', JSON.stringify(updatedAvailabilities));
        }
        
        console.log('? Horario desbloqueado exitosamente');
      } else {
        throw new Error(response.error || 'Error desbloqueando horario');
      }
    } catch (error) {
      console.error('? Error desbloqueando horario:', error);
      throw error;
    }
  };

  const unblockAppointmentTimeSlots = async (professionalId: string, appointmentId: string) => {
    try {
      console.log('?? Desbloqueando horarios de cita:', { professionalId, appointmentId });
      
      const response = await availabilityService.unblockAppointmentTimeSlots(professionalId, {
        appointmentId
      });

      if (response.success) {
        // Actualizar disponibilidad local
        const availability = getAvailabilityByProfessional(professionalId);
        if (availability) {
          const updatedAvailability = {
            ...availability,
            blockedTimeSlots: (availability.blockedTimeSlots || []).filter(blocked =>
              blocked.appointmentId !== appointmentId
            )
          };

          const updatedAvailabilities = availabilities.map(avail =>
            avail.professionalId === professionalId ? updatedAvailability : avail
          );

          setAvailabilities(updatedAvailabilities);
          await AsyncStorage.setItem('professional_availabilities', JSON.stringify(updatedAvailabilities));
        }
        
        console.log('? Horarios de cita desbloqueados exitosamente');
      } else {
        throw new Error(response.error || 'Error desbloqueando horarios de cita');
      }
    } catch (error) {
      console.error('? Error desbloqueando horarios de cita:', error);
      throw error;
    }
  };

  const getBlockedTimeSlots = async (professionalId: string, date: string): Promise<BlockedTimeSlot[]> => {
    try {
      const response = await availabilityService.getBlockedTimeSlots(professionalId, date);
      
      if (response.success && response.data) {
        return response.data;
      } else {
        throw new Error(response.error || 'Error obteniendo horarios bloqueados');
      }
    } catch (error) {
      console.error('? Error obteniendo horarios bloqueados:', error);
      throw error;
    }
  };

  const isTimeSlotBlocked = (professionalId: string, date: Date, timeSlot: string): boolean => {
    const availability = getAvailabilityByProfessional(professionalId);
    if (!availability || !availability.blockedTimeSlots) return false;

    return availability.blockedTimeSlots.some(blocked => {
      const blockedDate = new Date(blocked.createdAt);
      return blockedDate.toDateString() === date.toDateString() && blocked.timeSlot === timeSlot;
    });
  };

  const syncFromScheduleData = async (professionalId: string, scheduleData: any) => {
    try {
      console.log('?? Sincronizando datos de horarios para profesional:', professionalId);
      console.log('?? Datos de horarios recibidos:', scheduleData);

      // Convertir los datos de horarios al formato de disponibilidad
      const daysOfWeek = {
        monday: scheduleData.monday?.morning || scheduleData.monday?.afternoon || false,
        tuesday: scheduleData.tuesday?.morning || scheduleData.tuesday?.afternoon || false,
        wednesday: scheduleData.wednesday?.morning || scheduleData.wednesday?.afternoon || false,
        thursday: scheduleData.thursday?.morning || scheduleData.thursday?.afternoon || false,
        friday: scheduleData.friday?.morning || scheduleData.friday?.afternoon || false,
        saturday: scheduleData.saturday?.morning || scheduleData.saturday?.afternoon || false,
        sunday: scheduleData.sunday?.morning || scheduleData.sunday?.afternoon || false,
      };

      // Extraer horarios disponibles de todos los d?as
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

      // Obtener el nombre del profesional
      const professionalName = `Profesional ${professionalId}`;

      // Crear o actualizar la disponibilidad
      const existingAvailability = getAvailabilityByProfessional(professionalId);
      
      if (existingAvailability) {
        // Actualizar disponibilidad existente
        await updateAvailability(professionalId, {
          daysOfWeek,
          timeSlots,
          workingHours,
          isActive: true,
        });
        console.log('? Disponibilidad actualizada desde datos de horarios');
      } else {
        // Crear nueva disponibilidad
        await createAvailability({
          professionalId,
          professionalName,
          daysOfWeek,
          timeSlots,
          workingHours,
          isActive: true,
        });
        console.log('? Nueva disponibilidad creada desde datos de horarios');
      }

    } catch (error) {
      console.error('? Error sincronizando datos de horarios:', error);
      throw error;
    }
  };

  const syncWithBackend = async (professionalId: string) => {
    try {
      console.log('?? Sincronizando con backend para profesional:', professionalId);
      
      // Obtener disponibilidad del backend
      const response = await availabilityService.getAvailabilityByProfessional(professionalId);
      
      if (response.success && response.data && Object.keys(response.data).length > 0) {
        console.log('? Datos encontrados en backend:', response.data);
        
        // Actualizar disponibilidad local con datos del backend
        const backendAvailability = response.data;
        
        const wh =
          backendAvailability.workingHours && typeof backendAvailability.workingHours === 'object'
            ? backendAvailability.workingHours
            : {};
        const bt =
          backendAvailability.breakTime && typeof backendAvailability.breakTime === 'object'
            ? backendAvailability.breakTime
            : {};
        const dow = backendAvailability.daysOfWeek || {};
        // El documento en Mongo puede no incluir workingHours/breakTime (p. ej. solo appointmentDuration)
        const localAvailability: ProfessionalAvailability = {
          id: backendAvailability.id || backendAvailability._id || `avail_${Date.now()}`,
          professionalId: backendAvailability.professionalId,
          professionalName: backendAvailability.professionalName || 'Profesional',
          daysOfWeek: {
            monday: true,
            tuesday: true,
            wednesday: true,
            thursday: true,
            friday: true,
            saturday: false,
            sunday: false,
            ...dow,
          },
          timeSlots: Array.isArray(backendAvailability.timeSlots) ? backendAvailability.timeSlots : [],
          workingHours: {
            start: typeof wh.start === 'string' && wh.start ? wh.start : '09:00',
            end: typeof wh.end === 'string' && wh.end ? wh.end : '18:00',
          },
          breakTime: {
            start: typeof bt.start === 'string' && bt.start ? bt.start : '13:00',
            end: typeof bt.end === 'string' && bt.end ? bt.end : '14:00',
          },
          defaultTimeRanges: Array.isArray(backendAvailability.defaultTimeRanges)
            ? backendAvailability.defaultTimeRanges
                .filter(
                  (range) =>
                    range &&
                    typeof range.start === 'string' &&
                    typeof range.end === 'string'
                )
                .map((range) => ({ start: range.start, end: range.end }))
            : undefined,
          appointmentDuration:
            Number.isFinite(Number(backendAvailability.appointmentDuration))
              ? Number(backendAvailability.appointmentDuration)
              : 30,
          maxAppointmentsPerDay:
            Number.isFinite(Number(backendAvailability.maxAppointmentsPerDay))
              ? Number(backendAvailability.maxAppointmentsPerDay)
              : 20,
          advanceBookingDays:
            Number.isFinite(Number(backendAvailability.advanceBookingDays))
              ? Number(backendAvailability.advanceBookingDays)
              : 30,
          replicateScopeWeeks:
            Number.isFinite(Number(backendAvailability.replicateScopeWeeks))
              ? Number(backendAvailability.replicateScopeWeeks)
              : 8,
          overwriteDatesWithSchedule:
            backendAvailability.overwriteDatesWithSchedule === true,
          isActive: backendAvailability.isActive !== false,
          createdAt: backendAvailability.createdAt || new Date().toISOString(),
          updatedAt: backendAvailability.updatedAt || new Date().toISOString(),
        };
        
        // Actualizar estado local
        const updatedAvailabilities = availabilities.map(avail => 
          avail.professionalId === professionalId ? localAvailability : avail
        );
        
        if (!availabilities.find(avail => avail.professionalId === professionalId)) {
          updatedAvailabilities.push(localAvailability);
        }
        
        setAvailabilities(updatedAvailabilities);
        
        // Guardar en AsyncStorage
        await AsyncStorage.setItem('professional_availabilities', JSON.stringify(updatedAvailabilities));
        
        console.log('? Disponibilidad sincronizada con backend:', localAvailability);
        return localAvailability;
      } else {
        console.log('?? No se encontr? disponibilidad en el backend para profesional:', professionalId);
        return null;
      }
    } catch (error) {
      console.warn('?? Error sincronizando con backend, usando datos locales:', error);
      // En caso de error, devolver la disponibilidad local si existe
      const localAvailability = getAvailabilityByProfessional(professionalId);
      return localAvailability;
    }
  };

  const contextValue: AvailabilityContextType = {
    availabilities,
    availableProfessionals,
    getAvailabilityByProfessional,
    updateAvailability,
    createAvailability,
    createAvailabilityForUser,
    syncFromScheduleData,
    syncWithBackend,
    isDateAvailable,
    getAvailableTimeSlots,
    blockTimeSlot,
    unblockTimeSlot,
    unblockAppointmentTimeSlots,
    getBlockedTimeSlots,
    isTimeSlotBlocked,
    isLoading,
    refreshProfessionalDirectory: loadProfessionalDirectory,
  };

  return (
    <AvailabilityContext.Provider value={contextValue}>
      {children}
    </AvailabilityContext.Provider>
  );
};
