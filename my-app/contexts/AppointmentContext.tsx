import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import appointmentService from '../services/appointmentService';
import { useAuth } from './AuthContext';

export interface Appointment {
  id: string;
  service: string;
  professional: string;
  professionalId: string;
  date: string;
  time: string;
  notes?: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  clientId: string;
  clientName: string;
  createdAt: Date;
}

interface AppointmentContextType {
  appointments: Appointment[];
  addAppointment: (appointment: Omit<Appointment, 'id' | 'createdAt' | 'status'>) => Promise<void>;
  updateAppointmentStatus: (appointmentId: string, status: Appointment['status']) => Promise<void>;
  deleteAppointment: (appointmentId: string) => Promise<void>;
  getAppointmentsForUser: (userId: string) => Appointment[];
  getUpcomingAppointments: (userId: string) => Appointment[];
  getPendingAppointments: (userId: string) => Appointment[];
  confirmAppointment: (appointmentId: string) => Promise<void>;
  rejectAppointment: (appointmentId: string) => Promise<void>;
  refreshAppointments: () => Promise<void>;
  loading: boolean;
  error: string | null;
}

const AppointmentContext = createContext<AppointmentContextType | undefined>(undefined);

export const useAppointments = () => {
  const context = useContext(AppointmentContext);
  if (!context) {
    console.error('useAppointments must be used within an AppointmentProvider');
    // Retornar un objeto por defecto en lugar de lanzar un error
    return {
      appointments: [],
      addAppointment: async () => console.warn('AppointmentProvider not available'),
      updateAppointmentStatus: async () => console.warn('AppointmentProvider not available'),
      deleteAppointment: async () => console.warn('AppointmentProvider not available'),
      getUpcomingAppointments: () => [],
      confirmAppointment: async () => console.warn('AppointmentProvider not available'),
      rejectAppointment: async () => console.warn('AppointmentProvider not available'),
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

  // Cargar citas al iniciar
  useEffect(() => {
    if (user) {
      loadAppointments();
    }
  }, [user]);

  // Cargar citas del backend
  const loadAppointments = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Intentar cargar del backend
      try {
        const backendAppointments = await appointmentService.getUserAppointments();
        
        // Convertir citas del backend al formato del frontend
        const convertedAppointments: Appointment[] = backendAppointments.map(apt => ({
          id: apt._id,
          service: apt.service?.name || 'Servicio no especificado',
          professional: apt.professional?.fullName || 'Profesional no especificado',
          professionalId: apt.professionalId,
          date: apt.date,
          time: apt.time,
          notes: apt.notes,
          status: apt.status,
          clientId: apt.clientId,
          clientName: apt.client?.fullName || 'Cliente no especificado',
          createdAt: new Date(apt.createdAt),
        }));
        
        setAppointments(convertedAppointments);
        console.log('✅ Citas cargadas del backend:', convertedAppointments.length);
        
        // Guardar en AsyncStorage como respaldo
        await AsyncStorage.setItem('appointments', JSON.stringify(convertedAppointments));
        
      } catch (backendError) {
        console.error('Error cargando del backend, usando respaldo local:', backendError);
        
        // Fallback a citas locales
        const savedAppointments = await AsyncStorage.getItem('appointments');
        if (savedAppointments) {
          const parsed = JSON.parse(savedAppointments);
          const appointmentsWithDates = parsed.map((a: any) => ({
            ...a,
            createdAt: new Date(a.createdAt),
          }));
          setAppointments(appointmentsWithDates);
        }
      }
      
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
  const addAppointment = async (appointmentData: Omit<Appointment, 'id' | 'createdAt' | 'status'>) => {
    try {
      // Intentar crear en el backend
      try {
        const newBackendAppointment = await appointmentService.createAppointment({
          professionalId: appointmentData.professionalId,
          serviceId: appointmentData.service, // Asumiendo que service es el ID del servicio
          clinicId: 'clinic_default', // ID por defecto, debería venir del contexto
          date: appointmentData.date,
          time: appointmentData.time,
          notes: appointmentData.notes,
          clientNotes: appointmentData.notes,
        });
        
        console.log('✅ Cita creada en backend:', newBackendAppointment);
        
        // Recargar citas del backend
        await loadAppointments();
        
      } catch (backendError) {
        console.error('Error creando en backend, usando fallback local:', backendError);
        
        // Fallback a creación local
        const newAppointment: Appointment = {
          ...appointmentData,
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          createdAt: new Date(),
          status: 'pending',
        };

        const updatedAppointments = [newAppointment, ...appointments];
        setAppointments(updatedAppointments);
        saveAppointments(updatedAppointments);
        console.log('📅 Nueva cita agregada localmente:', newAppointment);
      }
      
    } catch (error) {
      console.error('Error adding appointment:', error);
      throw error;
    }
  };

  // Actualizar estado de cita
  const updateAppointmentStatus = async (appointmentId: string, status: Appointment['status']) => {
    try {
      // Actualizar en el backend - usar el método específico para cambio de estado
      try {
        if (status === 'confirmed') {
          await appointmentService.confirmAppointment(appointmentId);
        } else if (status === 'cancelled') {
          await appointmentService.cancelAppointment(appointmentId);
        } else if (status === 'completed') {
          await appointmentService.markAsCompleted(appointmentId);
        }
        console.log('✅ Estado de cita actualizado en backend');
      } catch (backendError) {
        console.error('Error actualizando estado en backend:', backendError);
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
      // Eliminar del backend
      try {
        await appointmentService.cancelAppointment(appointmentId);
        console.log('✅ Cita cancelada en backend');
      } catch (backendError) {
        console.error('Error cancelando en backend:', backendError);
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
    return appointments.filter(appointment => 
      (appointment.clientId === userId || appointment.professionalId === userId) &&
      (appointment.status === 'confirmed' || appointment.status === 'pending') &&
      new Date(appointment.date) > now
    ).sort((a, b) => new Date(a.date).getTime() - new Date(a.date).getTime());
  };

  // Obtener citas pendientes
  const getPendingAppointments = (userId: string) => {
    return appointments.filter(appointment => 
      appointment.professionalId === userId && appointment.status === 'pending'
    ).sort((a, b) => new Date(a.date).getTime() - new Date(a.date).getTime());
  };

  // Confirmar cita
  const confirmAppointment = async (appointmentId: string) => {
    try {
      // Confirmar en el backend
      try {
        await appointmentService.confirmAppointment(appointmentId);
        console.log('✅ Cita confirmada en backend');
      } catch (backendError) {
        console.error('Error confirmando en backend:', backendError);
      }
      
      // Actualizar localmente
      await updateAppointmentStatus(appointmentId, 'confirmed');
      console.log('✅ Cita confirmada:', appointmentId);
      
    } catch (error) {
      console.error('Error confirming appointment:', error);
    }
  };

  // Rechazar cita
  const rejectAppointment = async (appointmentId: string) => {
    try {
      // Rechazar en el backend
      try {
        await appointmentService.rejectAppointment(appointmentId, 'Cita rechazada por el profesional');
        console.log('✅ Cita rechazada en backend');
      } catch (backendError) {
        console.error('Error rechazando en backend:', backendError);
      }
      
      // Actualizar localmente
      await updateAppointmentStatus(appointmentId, 'cancelled');
      console.log('❌ Cita rechazada:', appointmentId);
      
    } catch (error) {
      console.error('Error rejecting appointment:', error);
    }
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
