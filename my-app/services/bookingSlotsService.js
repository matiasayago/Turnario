/**
 * Horarios reservables para un profesional y fecha: calendario backend, date-schedules o demo,
 * siempre excluyendo turnos ya tomados (ExpoAppointment).
 */
import { getBackendBaseUrl } from '../config/backend';
import simpleAuthService from './simpleAuthService';

const ES_MONTHS = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];
const ES_DOW = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

/** Texto largo en español desde YYYY-MM-DD solo con fecha local (sin UTC). */
export function formatDateYmdToSpanishLong(dateYmd) {
  if (!dateYmd || typeof dateYmd !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateYmd.trim())) {
    return '';
  }
  const [ys, ms, ds] = dateYmd.trim().split('-');
  const y = parseInt(ys, 10);
  const m = parseInt(ms, 10);
  const d = parseInt(ds, 10);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return '';
  const dt = new Date(y, m - 1, d);
  if (isNaN(dt.getTime())) return '';
  return `${ES_DOW[dt.getDay()]}, ${d} de ${ES_MONTHS[m - 1]} de ${y}`;
}

const DEMO_PROFESSIONAL_SLOTS = {
  '1': ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '15:30', '16:00', '17:00'],
  '2': ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'],
  '3': ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'],
  '4': ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'],
  '5': ['14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'],
};

function getDefaultExpandedSlots() {
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
}

export function expoTimeToSlotKey(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const head = timeStr.split(/\s*[-–]\s*/)[0].trim();
  const m = head.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const h = String(Math.min(23, parseInt(m[1], 10))).padStart(2, '0');
  const min = String(Math.min(59, parseInt(m[2], 10))).padStart(2, '0');
  return `${h}:${min}`;
}

function isMongoObjectId(s) {
  return typeof s === 'string' && /^[a-fA-F0-9]{24}$/.test(s.trim());
}

function dedupeSort(arr) {
  return [...new Set(arr)].sort();
}

async function fetchJsonWithApiFallback(pathWithLeadingSlash, options) {
  const base = getBackendBaseUrl();
  const variants = pathWithLeadingSlash.startsWith('/api/v1/')
    ? [pathWithLeadingSlash, pathWithLeadingSlash.replace('/api/v1/', '/api/')]
    : [pathWithLeadingSlash];

  let lastError = null;
  for (const p of variants) {
    try {
      const res = await fetch(`${base}${p}`, options);
      if (res.ok) return { ok: true, res };
      if (res.status !== 404) return { ok: false, res };
      lastError = new Error(`HTTP ${res.status} for ${p}`);
    } catch (e) {
      lastError = e;
    }
  }
  return { ok: false, error: lastError };
}

export function expandConfiguredTimeSlots(timeSlots) {
  const availableSlots = [];
  if (!Array.isArray(timeSlots)) return availableSlots;
  timeSlots.forEach((slot) => {
    if (slot.start && slot.end) {
      const startHour = parseInt(slot.start.split(':')[0], 10);
      const startMinute = parseInt(slot.start.split(':')[1], 10);
      const endHour = parseInt(slot.end.split(':')[0], 10);
      const endMinute = parseInt(slot.end.split(':')[1], 10);
      let currentHour = startHour;
      let currentMinute = startMinute;
      while (currentHour < endHour || (currentHour === endHour && currentMinute < endMinute)) {
        const timeString = `${currentHour.toString().padStart(2, '0')}:${currentMinute
          .toString()
          .padStart(2, '0')}`;
        availableSlots.push(timeString);
        currentMinute += 30;
        if (currentMinute >= 60) {
          currentMinute = 0;
          currentHour += 1;
        }
      }
    }
  });
  return availableSlots;
}

/**
 * Slots base desde date-schedules o demo (sin filtrar citas).
 */
export async function fetchDateScheduleExpandedSlots(professionalId, dateYmd) {
  if (!professionalId || !dateYmd) {
    return DEMO_PROFESSIONAL_SLOTS[professionalId] || getDefaultExpandedSlots();
  }
  try {
    const result = await fetchJsonWithApiFallback(
      `/api/v1/date-schedules/${professionalId}/${dateYmd}`
    );
    if (result.ok && result.res) {
      const data = await result.res.json();
      if (data.success && data.data && data.data.timeSlots && data.data.timeSlots.length > 0) {
        return expandConfiguredTimeSlots(data.data.timeSlots);
      }
    }
  } catch (e) {
    console.warn('bookingSlotsService date-schedules:', e.message);
  }
  return DEMO_PROFESSIONAL_SLOTS[professionalId] || getDefaultExpandedSlots();
}

/**
 * GET /api/v1/calendar/day — horarios con citas legacy + bloqueos ya aplicados.
 * Retorna { ok: true, slots } si hubo respuesta 200; ok: false si 404/error (usar fallback).
 */
export async function fetchCalendarDayBookableSlots(professionalId, dateYmd) {
  if (!isMongoObjectId(professionalId) || !dateYmd) {
    return { ok: false, slots: null, isWorkingDay: false, totalDefined: 0 };
  }
  try {
    const result = await fetchJsonWithApiFallback(`/api/v1/calendar/day/${professionalId}/${dateYmd}`);
    if (!result.ok || !result.res) return { ok: false, slots: null, isWorkingDay: false, totalDefined: 0 };
    const json = await result.res.json();
    const list = json.data?.availableSlots;
    const isWorkingDay = Boolean(json.data?.isWorkingDay);
    if (!Array.isArray(list)) {
      return { ok: true, slots: [], isWorkingDay, totalDefined: 0 };
    }
    const bookable = list.filter((s) => s.isAvailable).map((s) => s.time);
    return { ok: true, slots: bookable, isWorkingDay, totalDefined: list.length };
  } catch {
    return { ok: false, slots: null, isWorkingDay: false, totalDefined: 0 };
  }
}

export async function fetchOccupiedExpoSlotKeys(professionalId, dateYmd) {
  if (!isMongoObjectId(professionalId) || !dateYmd) return [];
  try {
    const token = await simpleAuthService.getToken();
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const result = await fetchJsonWithApiFallback(
      `/api/v1/appointments/expo/occupied-times/${professionalId}/${dateYmd}`,
      { headers }
    );
    if (!result.ok || !result.res) return [];
    const data = await result.res.json();
    const times = data.data?.times || [];
    return dedupeSort(times.map((t) => expoTimeToSlotKey(t) || t).filter(Boolean));
  } catch {
    return [];
  }
}

/**
 * Lista final de HH:mm reservables (sin solapar citas Expo existentes).
 * Siempre resta occupied-times aunque el calendario diga disponible (doble chequeo).
 */
export async function getBookableTimeSlotsForProfessionalDate(professionalId, dateYmd) {
  if (!dateYmd || typeof dateYmd !== 'string') return [];

  const mongo = isMongoObjectId(professionalId);
  const [cal, occupied] = await Promise.all([
    mongo
      ? fetchCalendarDayBookableSlots(professionalId, dateYmd)
      : Promise.resolve({ ok: false, slots: null, isWorkingDay: false, totalDefined: 0 }),
    mongo ? fetchOccupiedExpoSlotKeys(professionalId, dateYmd) : Promise.resolve([]),
  ]);
  const occSet = new Set(occupied);
  const isBooked = (slot) => occSet.has(expoTimeToSlotKey(slot) || String(slot).trim());

  if (mongo) {
    if (cal.ok && cal.slots !== null) {
      if (cal.slots.length > 0) {
        return dedupeSort(cal.slots.filter((s) => !isBooked(s)));
      }
      if (cal.isWorkingDay && cal.totalDefined === 0) {
        // Día laborable sin franjas en calendario → date-schedules / demo
      } else {
        return [];
      }
    }
  }

  const base = await fetchDateScheduleExpandedSlots(professionalId, dateYmd);
  return dedupeSort(base.filter((s) => !isBooked(s)));
}
