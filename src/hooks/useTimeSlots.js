import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';

const useTimeSlots = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Función para obtener horarios disponibles desde el backend
  const fetchAvailableTimeSlots = useCallback(async (professionalId, date, clinicId, serviceId) => {
    if (!professionalId || !date || !clinicId || !serviceId) {
      return [];
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'}/api/appointments/available-slots?date=${date}&clinicId=${clinicId}&serviceId=${serviceId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.data && data.data.availableSlots) {
        return data.data.availableSlots;
      } else {
        console.warn('Respuesta inesperada del servidor:', data);
        return [];
      }
    } catch (err) {
      console.error('Error al obtener horarios disponibles:', err);
      setError(err.message);
      
      // En caso de error, retornar horarios por defecto
      return getDefaultTimeSlots();
    } finally {
      setLoading(false);
    }
  }, []);

  // Función para verificar disponibilidad de un horario específico
  const checkTimeSlotAvailability = useCallback(async (professionalId, date, time, clinicId, serviceId) => {
    try {
      const availableSlots = await fetchAvailableTimeSlots(professionalId, date, clinicId, serviceId);
      return availableSlots.includes(time);
    } catch (err) {
      console.error('Error al verificar disponibilidad:', err);
      return false;
    }
  }, [fetchAvailableTimeSlots]);

  // Función para generar horarios por defecto
  const getDefaultTimeSlots = useCallback(() => {
    const slots = [];
    
    // Horarios de mañana (9:00 - 12:00)
    for (let hour = 9; hour < 12; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(time);
      }
    }
    
    // Horarios de tarde (14:00 - 18:00)
    for (let hour = 14; hour < 18; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(time);
      }
    }
    
    return slots;
  }, []);

  // Función para formatear fecha para la API
  const formatDateForAPI = useCallback((date) => {
    if (!date) return null;
    
    // Si es un string, intentar parsearlo
    if (typeof date === 'string') {
      // Formato "DD de MMMM" -> "YYYY-MM-DD"
      const dateMatch = date.match(/(\d{1,2})\s+de\s+(\w+)/);
      if (dateMatch) {
        const day = dateMatch[1];
        const monthName = dateMatch[2];
        const monthMap = {
          'enero': '01', 'febrero': '02', 'marzo': '03', 'abril': '04',
          'mayo': '05', 'junio': '06', 'julio': '07', 'agosto': '08',
          'septiembre': '09', 'octubre': '10', 'noviembre': '11', 'diciembre': '12'
        };
        const month = monthMap[monthName.toLowerCase()];
        if (month) {
          const currentYear = new Date().getFullYear();
          return `${currentYear}-${month}-${day.padStart(2, '0')}`;
        }
      }
      
      // Si ya está en formato ISO, devolverlo
      if (date.includes('-')) {
        return date;
      }
    }
    
    // Si es un objeto Date
    if (date instanceof Date) {
      return date.toISOString().split('T')[0];
    }
    
    return null;
  }, []);

  // Función para obtener horarios del profesional desde configuración local
  const getProfessionalTimeSlots = useCallback((professionalId, date) => {
    // Horarios específicos por profesional (configuración local)
    const professionalSchedules = {
      '1': ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '15:30', '16:00', '17:00'], // Dr. Carlos Mendoza
      '2': ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'], // Dra. Ana García
      '3': ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'], // Dr. Luis Rodríguez
      '4': ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'], // Dra. María López
      '5': ['14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'], // Dr. Juan Pérez
    };

    return professionalSchedules[professionalId] || getDefaultTimeSlots();
  }, [getDefaultTimeSlots]);

  // Función para filtrar horarios ocupados
  const filterOccupiedSlots = useCallback((availableSlots, occupiedSlots) => {
    if (!occupiedSlots || occupiedSlots.length === 0) {
      return availableSlots;
    }
    
    return availableSlots.filter(slot => !occupiedSlots.includes(slot));
  }, []);

  // Función para obtener horarios con validación completa
  const getAvailableTimeSlots = useCallback(async (professionalId, date, clinicId, serviceId, occupiedSlots = []) => {
    try {
      // Intentar obtener horarios desde el backend
      const backendSlots = await fetchAvailableTimeSlots(professionalId, date, clinicId, serviceId);
      
      if (backendSlots.length > 0) {
        return filterOccupiedSlots(backendSlots, occupiedSlots);
      }
      
      // Fallback a horarios del profesional
      const professionalSlots = getProfessionalTimeSlots(professionalId, date);
      return filterOccupiedSlots(professionalSlots, occupiedSlots);
    } catch (err) {
      console.error('Error al obtener horarios disponibles:', err);
      
      // Fallback final a horarios por defecto
      const defaultSlots = getDefaultTimeSlots();
      return filterOccupiedSlots(defaultSlots, occupiedSlots);
    }
  }, [fetchAvailableTimeSlots, getProfessionalTimeSlots, filterOccupiedSlots, getDefaultTimeSlots]);

  return {
    loading,
    error,
    fetchAvailableTimeSlots,
    checkTimeSlotAvailability,
    getAvailableTimeSlots,
    getDefaultTimeSlots,
    formatDateForAPI,
    getProfessionalTimeSlots,
    filterOccupiedSlots
  };
};

export default useTimeSlots;

