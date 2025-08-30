import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appointment, User } from '../types';

export const useAppointments = (userId: string, userType: 'client' | 'professional') => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar citas desde AsyncStorage
  const loadAppointments = useCallback(async () => {
    try {
      setLoading(true);
      const stored = await AsyncStorage.getItem('appointments');
      if (stored) {
        const allAppointments: Appointment[] = JSON.parse(stored);
        const userAppointments = allAppointments.filter(apt => 
          userType === 'client' 
            ? apt.clientId === userId 
            : apt.professionalId === userId
        );
        setAppointments(userAppointments);
      }
    } catch (err) {
      setError('Error al cargar las citas');
      console.error('Error loading appointments:', err);
    } finally {
      setLoading(false);
    }
  }, [userId, userType]);

  // Crear nueva cita
  const createAppointment = useCallback(async (appointmentData: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      setLoading(true);
      const newAppointment: Appointment = {
        ...appointmentData,
        id: Date.now().toString(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const stored = await AsyncStorage.getItem('appointments');
      const allAppointments: Appointment[] = stored ? JSON.parse(stored) : [];
      allAppointments.push(newAppointment);
      
      await AsyncStorage.setItem('appointments', JSON.stringify(allAppointments));
      setAppointments(prev => [...prev, newAppointment]);
      
      return newAppointment;
    } catch (err) {
      setError('Error al crear la cita');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Actualizar estado de cita
  const updateAppointmentStatus = useCallback(async (appointmentId: string, status: Appointment['status']) => {
    try {
      setLoading(true);
      const stored = await AsyncStorage.getItem('appointments');
      const allAppointments: Appointment[] = stored ? JSON.parse(stored) : [];
      
      const updatedAppointments = allAppointments.map(apt => 
        apt.id === appointmentId 
          ? { ...apt, status, updatedAt: new Date() }
          : apt
      );
      
      await AsyncStorage.setItem('appointments', JSON.stringify(updatedAppointments));
      setAppointments(prev => 
        prev.map(apt => 
          apt.id === appointmentId 
            ? { ...apt, status, updatedAt: new Date() }
            : apt
        )
      );
    } catch (err) {
      setError('Error al actualizar la cita');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Cancelar cita
  const cancelAppointment = useCallback(async (appointmentId: string) => {
    return updateAppointmentStatus(appointmentId, 'cancelled');
  }, [updateAppointmentStatus]);

  // Confirmar cita
  const confirmAppointment = useCallback(async (appointmentId: string) => {
    return updateAppointmentStatus(appointmentId, 'confirmed');
  }, [updateAppointmentStatus]);

  // Completar cita
  const completeAppointment = useCallback(async (appointmentId: string) => {
    return updateAppointmentStatus(appointmentId, 'completed');
  }, [updateAppointmentStatus]);

  // Obtener citas por fecha
  const getAppointmentsByDate = useCallback((date: string) => {
    return appointments.filter(apt => apt.date === date);
  }, [appointments]);

  // Obtener citas por estado
  const getAppointmentsByStatus = useCallback((status: Appointment['status']) => {
    return appointments.filter(apt => apt.status === status);
  }, [appointments]);

  // Obtener próximas citas
  const getUpcomingAppointments = useCallback(() => {
    const now = new Date();
    return appointments
      .filter(apt => 
        apt.status === 'confirmed' || apt.status === 'pending'
      )
      .filter(apt => {
        const appointmentDate = new Date(apt.date + 'T' + apt.startTime);
        return appointmentDate > now;
      })
      .sort((a, b) => {
        const dateA = new Date(a.date + 'T' + a.startTime);
        const dateB = new Date(b.date + 'T' + b.startTime);
        return dateA.getTime() - dateB.getTime();
      });
  }, [appointments]);

  // Obtener estadísticas
  const getStats = useCallback(() => {
    const total = appointments.length;
    const completed = appointments.filter(apt => apt.status === 'completed').length;
    const cancelled = appointments.filter(apt => apt.status === 'cancelled').length;
    const pending = appointments.filter(apt => apt.status === 'pending').length;
    const confirmed = appointments.filter(apt => apt.status === 'confirmed').length;

    return {
      total,
      completed,
      cancelled,
      pending,
      confirmed,
      completionRate: total > 0 ? (completed / total) * 100 : 0,
      cancellationRate: total > 0 ? (cancelled / total) * 100 : 0,
    };
  }, [appointments]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  return {
    appointments,
    loading,
    error,
    createAppointment,
    updateAppointmentStatus,
    cancelAppointment,
    confirmAppointment,
    completeAppointment,
    getAppointmentsByDate,
    getAppointmentsByStatus,
    getUpcomingAppointments,
    getStats,
    refresh: loadAppointments,
  };
};

