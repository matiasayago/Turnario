// Re-exportar el contexto unificado desde src
export { 
  useUnifiedAppointments as useAppointments,
  UnifiedAppointmentProvider as AppointmentProvider 
} from '../../src/context/UnifiedAppointmentContext';

// También exportar el hook universal
export { useAppointments as useAppointmentsUniversal } from '../../src/hooks/useAppointmentsUniversal';
