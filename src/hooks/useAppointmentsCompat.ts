import { useAppointmentContext } from '../context/AppointmentContext';
import { useAppointments as useAppointmentsHook } from './useAppointments';
import { useAuth } from '../context/AuthContext';

/**
 * Hook compatible que funciona tanto con el contexto como con el hook directo
 */
export const useAppointments = (userId?: string, userType?: 'client' | 'professional') => {
  const { user } = useAuth();
  
  // Intentar usar el contexto primero
  try {
    const contextData = useAppointmentContext();
    if (contextData && contextData.appointments) {
      return contextData;
    }
  } catch (error) {
    // Si el contexto no está disponible, usar el hook directo
    console.log('AppointmentContext no disponible, usando hook directo');
  }
  
  // Usar el hook directo como fallback
  const actualUserId = userId || user?.id || 'guest';
  const actualUserType = userType || user?.userType || 'client';
  
  return useAppointmentsHook(actualUserId, actualUserType);
};
