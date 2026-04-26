import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import {
  calendarService,
  DayAvailability,
  isMongoObjectIdString,
  MonthlyCalendar,
  UpcomingAvailability,
} from '../services/calendarService';
import { User } from '../services/authService';
import { useAuth } from './AuthContext';

/** Preferir el _id real de Mongo si el usuario tiene varios campos de id (sesiones viejas vs login API). */
function getProfessionalIdForCalendarApi(user: User | null): string {
  if (!user) return '';
  const candidates = [user._id, user.id, user.userId]
    .filter((x) => x != null && String(x).length > 0)
    .map((x) => String(x).trim());
  const mongo = candidates.find((c) => isMongoObjectIdString(c));
  if (mongo) return mongo;
  return candidates[0] ?? '';
}

// Tipos para el contexto
interface CalendarContextType {
  // Estado del calendario
  currentCalendar: MonthlyCalendar | null;
  currentDay: DayAvailability | null;
  upcomingAvailability: UpcomingAvailability | null;
  
  // Estado de carga
  isLoading: boolean;
  error: string | null;
  
  // Funciones principales
  loadMonthlyCalendar: (year: number, month: number) => Promise<void>;
  loadDayAvailability: (date: string) => Promise<void>;
  loadUpcomingAvailability: (days?: number) => Promise<void>;
  
  // Funciones auxiliares
  refreshCalendar: () => Promise<void>;
  clearError: () => void;
  
  // Estado de navegación
  currentYear: number;
  currentMonth: number;
  setCurrentMonth: (month: number) => void;
  setCurrentYear: (year: number) => void;
  goToPreviousMonth: () => void;
  goToNextMonth: () => void;
  goToToday: () => void;
}

// Crear el contexto
const CalendarContext = createContext<CalendarContextType | undefined>(undefined);

// Hook para usar el contexto
export const useCalendar = (): CalendarContextType => {
  const context = useContext(CalendarContext);
  if (!context) {
    throw new Error('useCalendar debe ser usado dentro de un CalendarProvider');
  }
  return context;
};

// Props del provider
interface CalendarProviderProps {
  children: ReactNode;
}

// Provider del contexto
export const CalendarProvider: React.FC<CalendarProviderProps> = ({ children }) => {
  const { user } = useAuth();
  
  // Estado del calendario
  const [currentCalendar, setCurrentCalendar] = useState<MonthlyCalendar | null>(null);
  const [currentDay, setCurrentDay] = useState<DayAvailability | null>(null);
  const [upcomingAvailability, setUpcomingAvailability] = useState<UpcomingAvailability | null>(null);
  
  // Estado de carga
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Estado de navegación
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  
  // Función para cargar calendario mensual
  const loadMonthlyCalendar = async (year: number, month: number): Promise<void> => {
    if (!user || user.userType !== 'professional') {
      console.log('⚠️ Usuario no es profesional, no se puede cargar calendario');
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('📅 Cargando calendario mensual:', { year, month });
      const professionalId = getProfessionalIdForCalendarApi(user);
      const calendar = await calendarService.getMonthlyCalendar(professionalId, year, month);
      setCurrentCalendar(calendar);
      
      console.log('✅ Calendario mensual cargado:', calendar.summary);
    } catch (error) {
      console.error('❌ Error cargando calendario mensual:', error);
      // Solo mostrar error si no es un error de red (que ya está manejado por el servicio)
      if (error instanceof Error && !error.message.includes('Network request failed')) {
        setError(error.message);
      } else {
        // Error de red - el servicio ya está usando datos mock, no mostrar error
        console.log('🔄 Usando datos mock para calendario mensual');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // Función para cargar disponibilidad de un día específico
  const loadDayAvailability = async (date: string): Promise<void> => {
    if (!user || user.userType !== 'professional') {
      console.log('⚠️ Usuario no es profesional, no se puede cargar disponibilidad del día');
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('📅 Cargando disponibilidad del día:', date);
      const professionalId = getProfessionalIdForCalendarApi(user);
      const dayAvailability = await calendarService.getDayAvailability(professionalId, date);
      setCurrentDay(dayAvailability);
      
      console.log('✅ Disponibilidad del día cargada:', dayAvailability.availableSlotsCount);
    } catch (error) {
      console.error('❌ Error cargando disponibilidad del día:', error);
      // Solo mostrar error si no es un error de red (que ya está manejado por el servicio)
      if (error instanceof Error && !error.message.includes('Network request failed')) {
        setError(error.message);
      } else {
        // Error de red - el servicio ya está usando datos mock, no mostrar error
        console.log('🔄 Usando datos mock para disponibilidad del día');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // Función para cargar próximos días disponibles
  const loadUpcomingAvailability = async (days: number = 30): Promise<void> => {
    if (!user || user.userType !== 'professional') {
      console.log('⚠️ Usuario no es profesional, no se puede cargar próximos días');
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('📅 Cargando próximos días disponibles:', days);
      const professionalId = getProfessionalIdForCalendarApi(user);
      const upcoming = await calendarService.getUpcomingAvailability(professionalId, days);
      setUpcomingAvailability(upcoming);
      
      console.log('✅ Próximos días cargados:', upcoming.totalDays);
    } catch (error) {
      console.error('❌ Error cargando próximos días:', error);
      // Solo mostrar error si no es un error de red (que ya está manejado por el servicio)
      if (error instanceof Error && !error.message.includes('Network request failed')) {
        setError(error.message);
      } else {
        // Error de red - el servicio ya está usando datos mock, no mostrar error
        console.log('🔄 Usando datos mock para próximos días');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // Función para refrescar el calendario actual
  const refreshCalendar = async (): Promise<void> => {
    if (currentCalendar) {
      await loadMonthlyCalendar(currentCalendar.year, currentCalendar.month);
    }
  };
  
  // Función para limpiar errores
  const clearError = (): void => {
    setError(null);
  };
  
  // Funciones de navegación
  const goToPreviousMonth = (): void => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };
  
  const goToNextMonth = (): void => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };
  
  const goToToday = (): void => {
    const today = new Date();
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth() + 1);
  };
  
  // Efecto para cargar calendario cuando cambia el mes/año
  useEffect(() => {
    if (user && user.userType === 'professional') {
      loadMonthlyCalendar(currentYear, currentMonth);
    }
  }, [currentYear, currentMonth, user]);
  
  // Efecto para cargar próximos días cuando se monta el componente
  useEffect(() => {
    if (user && user.userType === 'professional') {
      loadUpcomingAvailability(30);
    }
  }, [user]);
  
  // Valor del contexto
  const contextValue: CalendarContextType = {
    // Estado del calendario
    currentCalendar,
    currentDay,
    upcomingAvailability,
    
    // Estado de carga
    isLoading,
    error,
    
    // Funciones principales
    loadMonthlyCalendar,
    loadDayAvailability,
    loadUpcomingAvailability,
    
    // Funciones auxiliares
    refreshCalendar,
    clearError,
    
    // Estado de navegación
    currentYear,
    currentMonth,
    setCurrentMonth,
    setCurrentYear,
    goToPreviousMonth,
    goToNextMonth,
    goToToday
  };
  
  return (
    <CalendarContext.Provider value={contextValue}>
      {children}
    </CalendarContext.Provider>
  );
};
