import { useCallback, useState } from 'react';
import { getBookableTimeSlotsForProfessionalDate } from '../services/bookingSlotsService';

const useTimeSlots = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getDefaultTimeSlots = useCallback(() => {
    const slots = [];
    for (let hour = 9; hour < 12; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        slots.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
      }
    }
    for (let hour = 14; hour < 18; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        slots.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
      }
    }
    return slots;
  }, []);

  const formatDateForAPI = useCallback((date) => {
    if (!date) return null;
    if (typeof date === 'string') {
      const dateMatch = date.match(/(\d{1,2})\s+de\s+(\w+)/);
      if (dateMatch) {
        const day = dateMatch[1];
        const monthName = dateMatch[2];
        const monthMap = {
          enero: '01',
          febrero: '02',
          marzo: '03',
          abril: '04',
          mayo: '05',
          junio: '06',
          julio: '07',
          agosto: '08',
          septiembre: '09',
          octubre: '10',
          noviembre: '11',
          diciembre: '12',
        };
        const month = monthMap[monthName.toLowerCase()];
        if (month) {
          const currentYear = new Date().getFullYear();
          return `${currentYear}-${month}-${day.padStart(2, '0')}`;
        }
      }
      if (date.includes('-')) {
        return date.slice(0, 10);
      }
    }
    if (date instanceof Date) {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    return null;
  }, []);

  const fetchAvailableTimeSlots = useCallback(
    async (professionalId, date, clinicId, serviceId) => {
      if (!professionalId || !date) {
        return [];
      }

      setLoading(true);
      setError(null);

      try {
        const formattedDate = formatDateForAPI(date);
        if (!formattedDate) {
          console.warn('⚠️ No se pudo formatear la fecha:', date);
          return getDefaultTimeSlots();
        }
        return await getBookableTimeSlotsForProfessionalDate(professionalId, formattedDate);
      } catch (err) {
        console.error('Error al obtener horarios:', err);
        setError(err.message);
        return getDefaultTimeSlots();
      } finally {
        setLoading(false);
      }
    },
    [getDefaultTimeSlots, formatDateForAPI]
  );

  const getProfessionalTimeSlots = useCallback(
    (professionalId) => {
      const professionalSchedules = {
        '1': ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '15:30', '16:00', '17:00'],
        '2': ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'],
        '3': ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'],
        '4': ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'],
        '5': ['14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'],
      };
      return professionalSchedules[professionalId] || getDefaultTimeSlots();
    },
    [getDefaultTimeSlots]
  );

  const filterOccupiedSlots = useCallback((availableSlots, occupiedSlots) => {
    if (!occupiedSlots || occupiedSlots.length === 0) {
      return availableSlots;
    }
    return availableSlots.filter((slot) => !occupiedSlots.includes(slot));
  }, []);

  const getAvailableTimeSlots = useCallback(
    async (professionalId, date, clinicId, serviceId, occupiedSlots = []) => {
      try {
        const backendSlots = await fetchAvailableTimeSlots(professionalId, date, clinicId, serviceId);
        return filterOccupiedSlots(backendSlots, occupiedSlots);
      } catch (err) {
        console.error('Error al obtener horarios disponibles:', err);
        return filterOccupiedSlots(getProfessionalTimeSlots(professionalId), occupiedSlots);
      }
    },
    [fetchAvailableTimeSlots, filterOccupiedSlots, getProfessionalTimeSlots]
  );

  const checkTimeSlotAvailability = useCallback(
    async (professionalId, date, time, clinicId, serviceId) => {
      try {
        const availableSlots = await fetchAvailableTimeSlots(professionalId, date, clinicId, serviceId);
        return availableSlots.includes(time);
      } catch (err) {
        console.error('Error al verificar disponibilidad:', err);
        return false;
      }
    },
    [fetchAvailableTimeSlots]
  );

  return {
    loading,
    error,
    fetchAvailableTimeSlots,
    checkTimeSlotAvailability,
    getAvailableTimeSlots,
    getDefaultTimeSlots,
    formatDateForAPI,
    getProfessionalTimeSlots,
    filterOccupiedSlots,
  };
};

export default useTimeSlots;
