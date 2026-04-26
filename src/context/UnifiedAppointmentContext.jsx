import React, { createContext, useContext } from 'react';
import { useAppointments as useAppointmentsHook } from '../hooks/useAppointments';
import { useAuth } from './AuthContext';

const UnifiedAppointmentContext = createContext();

export const useUnifiedAppointments = () => {
  const context = useContext(UnifiedAppointmentContext);
  if (!context) {
    console.warn('useUnifiedAppointments debe ser usado dentro de un UnifiedAppointmentProvider, usando valores por defecto');
    return {
      appointments: [],
      loading: false,
      error: null,
      createAppointment: async () => console.warn('UnifiedAppointmentProvider no disponible'),
      updateAppointmentStatus: async () => console.warn('UnifiedAppointmentProvider no disponible'),
      cancelAppointment: async () => console.warn('UnifiedAppointmentProvider no disponible'),
      confirmAppointment: async () => console.warn('UnifiedAppointmentProvider no disponible'),
      completeAppointment: async () => console.warn('UnifiedAppointmentProvider no disponible'),
      getAppointmentsByDate: () => [],
      getAppointmentsByStatus: () => [],
      getUpcomingAppointments: () => [],
      getStats: () => ({ total: 0, completed: 0, cancelled: 0, pending: 0, confirmed: 0, completionRate: 0, cancellationRate: 0 }),
      refresh: async () => console.warn('UnifiedAppointmentProvider no disponible'),
      getAppointmentsForUser: () => [],
      addAppointment: async () => console.warn('UnifiedAppointmentProvider no disponible'),
      deleteAppointment: async () => console.warn('UnifiedAppointmentProvider no disponible'),
      rejectAppointment: async () => console.warn('UnifiedAppointmentProvider no disponible'),
      refreshAppointments: async () => console.warn('UnifiedAppointmentProvider no disponible'),
    };
  }
  return context;
};

export const UnifiedAppointmentProvider = ({ children }) => {
  const { user } = useAuth();
  
  // Usar el hook useAppointments con los datos del usuario autenticado
  const appointmentData = useAppointmentsHook(
    user?.id || 'guest',
    user?.userType || 'client'
  );

  // Crear un objeto unificado que incluya todas las funciones necesarias
  const unifiedContext = {
    // Funciones del hook original
    ...appointmentData,
    
    // Alias para compatibilidad con my-app
    addAppointment: appointmentData.createAppointment,
    deleteAppointment: appointmentData.cancelAppointment,
    rejectAppointment: appointmentData.cancelAppointment,
    refreshAppointments: appointmentData.refresh,
    
    // Funciones adicionales para compatibilidad
    getUpcomingAppointments: () => {
      const now = new Date();
      return appointmentData.appointments.filter(apt => 
        new Date(apt.date) >= now && 
        ['confirmed', 'pending'].includes(apt.status)
      );
    },
    
    getAppointmentsForUser: (userId) => {
      return appointmentData.appointments.filter(apt => apt.userId === userId);
    },
  };

  return (
    <UnifiedAppointmentContext.Provider value={unifiedContext}>
      {children}
    </UnifiedAppointmentContext.Provider>
  );
};
