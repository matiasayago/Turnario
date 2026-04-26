import React, { createContext, useContext } from 'react';
import { useAppointments } from '../hooks/useAppointments';
import { useAuth } from './AuthContext';

const AppointmentContext = createContext();

export const useAppointmentContext = () => {
  const context = useContext(AppointmentContext);
  if (!context) {
    console.warn('useAppointmentContext debe ser usado dentro de un AppointmentProvider, usando valores por defecto');
    // Retornar valores por defecto en lugar de lanzar error
    return {
      appointments: [],
      loading: false,
      error: null,
      createAppointment: async () => console.warn('AppointmentProvider no disponible'),
      updateAppointmentStatus: async () => console.warn('AppointmentProvider no disponible'),
      cancelAppointment: async () => console.warn('AppointmentProvider no disponible'),
      confirmAppointment: async () => console.warn('AppointmentProvider no disponible'),
      completeAppointment: async () => console.warn('AppointmentProvider no disponible'),
      getAppointmentsByDate: () => [],
      getAppointmentsByStatus: () => [],
      getUpcomingAppointments: () => [],
      getStats: () => ({ total: 0, completed: 0, cancelled: 0, pending: 0, confirmed: 0, completionRate: 0, cancellationRate: 0 }),
      refresh: async () => console.warn('AppointmentProvider no disponible'),
      getAppointmentsForUser: () => [],
    };
  }
  return context;
};

export const AppointmentProvider = ({ children }) => {
  const { user } = useAuth();
  
  // Usar el hook useAppointments con los datos del usuario autenticado
  const appointmentData = useAppointments(
    user?.id || 'guest',
    user?.userType || 'client'
  );

  const value = {
    ...appointmentData,
    // Agregar métodos adicionales si es necesario
    getAppointmentsForUser: (userId) => {
      return appointmentData.appointments.filter(apt => 
        apt.clientId === userId || apt.professionalId === userId
      );
    },
    getUpcomingAppointments: (userId) => {
      return appointmentData.getUpcomingAppointments();
    },
    getPendingAppointments: (userId) => {
      return appointmentData.getAppointmentsByStatus('pending');
    },
  };

  return (
    <AppointmentContext.Provider value={value}>
      {children}
    </AppointmentContext.Provider>
  );
};
