import { useUnifiedAppointments } from '../context/UnifiedAppointmentContext';

/**
 * Hook universal que funciona tanto en src como en my-app
 * Proporciona compatibilidad completa con ambos sistemas
 */
export const useAppointments = () => {
  return useUnifiedAppointments();
};

// Exportar también como useAppointmentsCompat para compatibilidad
export { useAppointments as useAppointmentsCompat };
