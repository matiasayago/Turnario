import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { testAppointmentService } from '../services/testAppointmentService';
import { testAuthService } from '../services/testAuthService';

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
  loading: boolean;
  error: string | null;
  addAppointment: (appointmentData: Omit<Appointment, 'id' | 'createdAt' | 'status'>) => Promise<void>;
  updateAppointment: (id: string, updates: Partial<Appointment>) => Promise<void>;
  deleteAppointment: (id: string) => Promise<void>;
  updateAppointmentStatus: (id: string, status: Appointment['status']) => Promise<void>;
  loadAppointments: () => Promise<void>;
  getAppointmentsByProfessional: (professionalId: string) => Appointment[];
  getAppointmentsByClient: (clientId: string) => Appointment[];
  clearError: () => void;
}

const AppointmentContext = createContext<AppointmentContextType | undefined>(undefined);

export const useAppointments = () => {
  const context = useContext(AppointmentContext);
  if (!context) {
    throw new Error('useAppointments must be used within an AppointmentProvider');
  }
  return context;
};

export const TestAppointmentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar citas al iniciar
  useEffect(() => {
    loadAppointments();
  }, []);

  // Cargar citas del backend
  const loadAppointments = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Cargando citas con servicio de prueba...');
      
      // Usar servicio de prueba
      const response = await testAppointmentService.getAppointments();
      const backendAppointments = response.appointments || [];
      
      // Convertir formato del backend al formato del contexto
      const convertedAppointments: Appointment[] = backendAppointments.map(appointment => ({
        id: appointment._id,
        service: appointment.service?.name || 'Servicio',
        professional: appointment.professional?.fullName || 'Profesional',
        professionalId: appointment.professionalId,
        date: appointment.date,
        time: appointment.time,
        notes: appointment.notes,
        status: appointment.status as Appointment['status'],
        clientId: appointment.clientId,
        clientName: appointment.client?.fullName || 'Cliente',
        createdAt: new Date(appointment.createdAt)
      }));

      setAppointments(convertedAppointments);
      
      // Guardar en AsyncStorage como respaldo
      await saveAppointments(convertedAppointments);
      
      console.log(`✅ Citas cargadas: ${convertedAppointments.length} citas`);
    } catch (error) {
      console.error('❌ Error cargando citas:', error);
      setError('Error cargando citas');
      
      // Intentar cargar desde AsyncStorage como respaldo
      try {
        const stored = await AsyncStorage.getItem('appointments');
        if (stored) {
          const parsedAppointments = JSON.parse(stored);
          setAppointments(parsedAppointments);
          console.log('📱 Citas cargadas desde AsyncStorage como respaldo');
        }
      } catch (storageError) {
        console.error('❌ Error cargando desde AsyncStorage:', storageError);
      }
    } finally {
      setLoading(false);
    }
  };

  // Guardar citas en AsyncStorage
  const saveAppointments = async (appointmentsToSave: Appointment[]) => {
    try {
      await AsyncStorage.setItem('appointments', JSON.stringify(appointmentsToSave));
    } catch (error) {
      console.error('Error guardando citas:', error);
    }
  };

  // Agregar nueva cita
  const addAppointment = async (appointmentData: Omit<Appointment, 'id' | 'createdAt' | 'status'>) => {
    try {
      setLoading(true);
      setError(null);

      console.log('➕ Agregando cita con servicio de prueba...');

      // Crear cita en el backend usando servicio de prueba
      const newBackendAppointment = await testAppointmentService.createAppointment({
        clientId: appointmentData.clientId,
        professionalId: appointmentData.professionalId,
        serviceId: 'test_service_id', // ID de servicio de prueba
        date: appointmentData.date,
        time: appointmentData.time,
        duration: 60, // Duración por defecto
        notes: appointmentData.notes,
        price: 100 // Precio por defecto
      });

      // Crear cita local
      const newAppointment: Appointment = {
        id: newBackendAppointment._id,
        service: appointmentData.service,
        professional: appointmentData.professional,
        professionalId: appointmentData.professionalId,
        date: appointmentData.date,
        time: appointmentData.time,
        notes: appointmentData.notes,
        status: 'pending',
        clientId: appointmentData.clientId,
        clientName: appointmentData.clientName,
        createdAt: new Date()
      };

      // Actualizar estado local
      const updatedAppointments = [...appointments, newAppointment];
      setAppointments(updatedAppointments);
      await saveAppointments(updatedAppointments);

      console.log('✅ Cita agregada exitosamente');
    } catch (error) {
      console.error('❌ Error agregando cita:', error);
      setError('Error agregando cita');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Actualizar cita
  const updateAppointment = async (id: string, updates: Partial<Appointment>) => {
    try {
      setLoading(true);
      setError(null);

      console.log(`✏️ Actualizando cita ${id} con servicio de prueba...`);

      // Actualizar en el backend
      await testAppointmentService.updateAppointment(id, {
        date: updates.date,
        time: updates.time,
        notes: updates.notes,
        status: updates.status
      });

      // Actualizar localmente
      const updatedAppointments = appointments.map(appointment =>
        appointment.id === id ? { ...appointment, ...updates } : appointment
      );
      setAppointments(updatedAppointments);
      await saveAppointments(updatedAppointments);

      console.log('✅ Cita actualizada exitosamente');
    } catch (error) {
      console.error('❌ Error actualizando cita:', error);
      setError('Error actualizando cita');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Eliminar cita
  const deleteAppointment = async (id: string) => {
    try {
      setLoading(true);
      setError(null);

      console.log(`🗑️ Eliminando cita ${id} con servicio de prueba...`);

      // Eliminar del backend
      await testAppointmentService.deleteAppointment(id);

      // Eliminar localmente
      const updatedAppointments = appointments.filter(appointment => appointment.id !== id);
      setAppointments(updatedAppointments);
      await saveAppointments(updatedAppointments);

      console.log('✅ Cita eliminada exitosamente');
    } catch (error) {
      console.error('❌ Error eliminando cita:', error);
      setError('Error eliminando cita');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Actualizar estado de cita
  const updateAppointmentStatus = async (id: string, status: Appointment['status']) => {
    try {
      setLoading(true);
      setError(null);

      console.log(`🔄 Actualizando estado de cita ${id} a ${status} con servicio de prueba...`);

      // Actualizar en el backend según el estado
      if (status === 'confirmed') {
        await testAppointmentService.confirmAppointment(id);
      } else if (status === 'cancelled') {
        await testAppointmentService.cancelAppointment(id);
      } else if (status === 'completed') {
        await testAppointmentService.markAsCompleted(id);
      }

      // Actualizar localmente
      const updatedAppointments = appointments.map(appointment =>
        appointment.id === id ? { ...appointment, status } : appointment
      );
      setAppointments(updatedAppointments);
      await saveAppointments(updatedAppointments);

      console.log('✅ Estado de cita actualizado exitosamente');
    } catch (error) {
      console.error('❌ Error actualizando estado de cita:', error);
      setError('Error actualizando estado de cita');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Obtener citas por profesional
  const getAppointmentsByProfessional = (professionalId: string): Appointment[] => {
    return appointments.filter(appointment => appointment.professionalId === professionalId);
  };

  // Obtener citas por cliente
  const getAppointmentsByClient = (clientId: string): Appointment[] => {
    return appointments.filter(appointment => appointment.clientId === clientId);
  };

  // Limpiar error
  const clearError = () => {
    setError(null);
  };

  const contextValue: AppointmentContextType = {
    appointments,
    loading,
    error,
    addAppointment,
    updateAppointment,
    deleteAppointment,
    updateAppointmentStatus,
    loadAppointments,
    getAppointmentsByProfessional,
    getAppointmentsByClient,
    clearError
  };

  return (
    <AppointmentContext.Provider value={contextValue}>
      {children}
    </AppointmentContext.Provider>
  );
};

export default TestAppointmentProvider;
