/**

 * Horarios reservables para un profesional y fecha: calendario backend, date-schedules o demo,

 * siempre excluyendo turnos ya tomados (ExpoAppointment) respetando la duración de cita.

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



function normalizeDurationMinutes(value, fallback = 30) {

  const n = Number(value);

  if (!Number.isFinite(n) || n < 5) return fallback;

  return Math.min(180, Math.round(n));

}



export function timeToMinutes(timeStr) {

  if (!timeStr || typeof timeStr !== 'string') return null;

  const head = timeStr.split(/\s*[-–]\s*/)[0].trim();

  const m = head.match(/^(\d{1,2}):(\d{2})/);

  if (!m) return null;

  return Math.min(23, parseInt(m[1], 10)) * 60 + Math.min(59, parseInt(m[2], 10));

}



function minutesToTime(total) {

  const h = Math.floor(total / 60);

  const min = total % 60;

  return `${String(Math.min(23, h)).padStart(2, '0')}:${String(Math.min(59, min)).padStart(2, '0')}`;

}



function intervalsOverlap(startA, durA, startB, durB) {

  if (startA == null || startB == null) return false;

  return startA < startB + durB && startA + durA > startB;

}



function getDefaultExpandedSlots(stepMinutes = 30) {

  const step = normalizeDurationMinutes(stepMinutes, 30);

  const slots = [];

  const pushRange = (startHour, endHour) => {

    for (let m = startHour * 60; m + step <= endHour * 60; m += step) {

      slots.push(minutesToTime(m));

    }

  };

  pushRange(9, 12);

  pushRange(14, 18);

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



export async function fetchProfessionalBookingSettings(professionalId) {

  const fallback = {
    appointmentDuration: 30,
    maxAppointmentsPerDay: null,
    advanceBookingDays: null,
  };

  if (!isMongoObjectId(professionalId)) return fallback;

  try {

    const result = await fetchJsonWithApiFallback(`/api/v1/availability/${professionalId}`);

    if (!result.ok || !result.res) return fallback;

    const data = await result.res.json();
    const availability = data?.data || {};
    const maxPerDay = Number(availability.maxAppointmentsPerDay);
    const advanceDays = Number(availability.advanceBookingDays);

    return {
      appointmentDuration: normalizeDurationMinutes(availability.appointmentDuration, 30),
      maxAppointmentsPerDay:
        Number.isFinite(maxPerDay) && maxPerDay > 0 ? Math.round(maxPerDay) : null,
      advanceBookingDays:
        Number.isFinite(advanceDays) && advanceDays >= 0 ? Math.round(advanceDays) : null,
    };

  } catch {

    return fallback;

  }

}

export async function fetchProfessionalAppointmentDuration(professionalId) {

  const settings = await fetchProfessionalBookingSettings(professionalId);

  return settings.appointmentDuration;

}



export function expandConfiguredTimeSlots(timeSlots, stepMinutes = 30) {

  const step = normalizeDurationMinutes(stepMinutes, 30);

  const availableSlots = [];

  if (!Array.isArray(timeSlots)) return availableSlots;

  timeSlots.forEach((slot) => {

    if (slot.start && slot.end) {

      const startMin = timeToMinutes(slot.start);

      const endMin = timeToMinutes(slot.end);

      if (startMin == null || endMin == null) return;

      for (let m = startMin; m + step <= endMin; m += step) {

        availableSlots.push(minutesToTime(m));

      }

    }

  });

  return availableSlots;

}



/**

 * Slots base desde date-schedules o demo (sin filtrar citas).

 */

export async function fetchDateScheduleExpandedSlots(professionalId, dateYmd, stepMinutes = 30) {

  if (!professionalId || !dateYmd) {

    return DEMO_PROFESSIONAL_SLOTS[professionalId] || getDefaultExpandedSlots(stepMinutes);

  }

  try {

    const result = await fetchJsonWithApiFallback(

      `/api/v1/date-schedules/${professionalId}/${dateYmd}`

    );

    if (result.ok && result.res) {

      const data = await result.res.json();

      if (data.success && data.data && data.data.timeSlots && data.data.timeSlots.length > 0) {

        return expandConfiguredTimeSlots(data.data.timeSlots, stepMinutes);

      }

    }

  } catch (e) {

    console.warn('bookingSlotsService date-schedules:', e.message);

  }

  return DEMO_PROFESSIONAL_SLOTS[professionalId] || getDefaultExpandedSlots(stepMinutes);

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



export async function fetchOccupiedExpoSlotInfo(professionalId, dateYmd) {

  if (!isMongoObjectId(professionalId) || !dateYmd) {

    return { times: [], appointments: [], appointmentDuration: 30 };

  }

  try {

    const token = await simpleAuthService.getToken();

    const headers = {};

    if (token) headers.Authorization = `Bearer ${token}`;

    const result = await fetchJsonWithApiFallback(

      `/api/v1/appointments/expo/occupied-times/${professionalId}/${dateYmd}`,

      { headers }

    );

    if (!result.ok || !result.res) {

      return { times: [], appointments: [], appointmentDuration: 30 };

    }

    const data = await result.res.json();

    const times = (data.data?.times || [])

      .map((t) => expoTimeToSlotKey(t) || t)

      .filter(Boolean);

    const appointments = Array.isArray(data.data?.appointments) ? data.data.appointments : [];

    const appointmentDuration = normalizeDurationMinutes(

      data.data?.appointmentDuration,

      30

    );

    return {

      times: dedupeSort(times),

      appointments,

      appointmentDuration,

    };

  } catch {

    return { times: [], appointments: [], appointmentDuration: 30 };

  }

}



/** @deprecated usar fetchOccupiedExpoSlotInfo */

export async function fetchOccupiedExpoSlotKeys(professionalId, dateYmd) {

  const info = await fetchOccupiedExpoSlotInfo(professionalId, dateYmd);

  return info.times;

}



function filterSlotsAgainstOccupied(slots, occupiedInfo, bookingDuration) {

  const duration = normalizeDurationMinutes(bookingDuration, 30);

  const blocks = (occupiedInfo.appointments || [])

    .map((a) => ({

      start: timeToMinutes(String(a.time || '')),

      duration: normalizeDurationMinutes(a.duration, duration),

    }))

    .filter((b) => b.start != null);



  const occSet = new Set(occupiedInfo.times || []);



  return slots.filter((slot) => {

    const key = expoTimeToSlotKey(slot) || String(slot).trim();

    const start = timeToMinutes(key);

    if (start == null) return false;



    if (blocks.length > 0) {

      return !blocks.some((b) => intervalsOverlap(start, duration, b.start, b.duration));

    }

    // Fallback: times ya expandido por el backend (p. ej. 10:00 + 60 → 10:00,10:15,10:30,10:45)

    return !occSet.has(key);

  });

}



/**

 * Lista final de HH:mm reservables (sin solapar citas existentes).

 * Usa appointmentDuration del profesional para el paso de grilla y el solape.

 */

export async function getBookableTimeSlotsForProfessionalDate(professionalId, dateYmd) {

  if (!dateYmd || typeof dateYmd !== 'string') return [];



  const mongo = isMongoObjectId(professionalId);

  const [cal, occupied, bookingSettings] = await Promise.all([

    mongo

      ? fetchCalendarDayBookableSlots(professionalId, dateYmd)

      : Promise.resolve({ ok: false, slots: null, isWorkingDay: false, totalDefined: 0 }),

    mongo

      ? fetchOccupiedExpoSlotInfo(professionalId, dateYmd)

      : Promise.resolve({ times: [], appointments: [], appointmentDuration: 30 }),

    mongo ? fetchProfessionalBookingSettings(professionalId) : Promise.resolve({
      appointmentDuration: 30,
      maxAppointmentsPerDay: null,
      advanceBookingDays: null,
    }),

  ]);



  const configuredDuration = bookingSettings.appointmentDuration;

  const bookingDuration = normalizeDurationMinutes(

    occupied.appointmentDuration || configuredDuration,

    configuredDuration

  );

  if (mongo) {

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const requested = new Date(`${dateYmd}T12:00:00`);
    requested.setHours(0, 0, 0, 0);

    if (requested < today) return [];

    if (bookingSettings.advanceBookingDays != null) {
      const lastAllowed = new Date(today);
      lastAllowed.setDate(lastAllowed.getDate() + bookingSettings.advanceBookingDays);
      if (requested > lastAllowed) return [];
    }

    if (
      bookingSettings.maxAppointmentsPerDay != null &&
      occupied.appointments.length >= bookingSettings.maxAppointmentsPerDay
    ) {
      return [];
    }

  }



  if (mongo) {

    if (cal.ok && cal.slots !== null) {

      if (cal.slots.length > 0) {

        return dedupeSort(filterSlotsAgainstOccupied(cal.slots, occupied, bookingDuration));

      }

      if (cal.isWorkingDay && cal.totalDefined === 0) {

        // Día laborable sin franjas en calendario → date-schedules / demo

      } else {

        // Aún sin franjas del calendario

      }

    }

  }



  const base = await fetchDateScheduleExpandedSlots(professionalId, dateYmd, bookingDuration);

  return dedupeSort(filterSlotsAgainstOccupied(base, occupied, bookingDuration));

}


