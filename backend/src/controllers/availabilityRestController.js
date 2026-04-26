const mongoose = require('mongoose');
const ProfessionalAvailability = require('../models/ProfessionalAvailability');
const User = require('../models/User');

function toProfessionalObjectId(raw) {
  if (raw == null || raw === '') return null;
  const s = String(raw).trim();
  if (!/^[a-fA-F0-9]{24}$/.test(s)) return null;
  try {
    return new mongoose.Types.ObjectId(s);
  } catch {
    return null;
  }
}

const getAvailability = async (req, res) => {
  try {
    const { professionalId } = req.params;
    const oid = toProfessionalObjectId(professionalId);
    if (!oid) {
      return res.status(400).json({
        success: false,
        error: 'ID de profesional inválido',
        message:
          'El API espera el _id de MongoDB (24 caracteres hex). Los IDs tipo "1" o "2" no son válidos.',
      });
    }

    const availability = await ProfessionalAvailability.findOne({
      professionalId: oid,
    });

    if (!availability) {
      return res.status(404).json({
        success: false,
        error: 'No se encontró configuración de disponibilidad para este profesional',
      });
    }

    res.json({
      success: true,
      data: availability,
    });
  } catch (error) {
    console.error('Error obteniendo disponibilidad:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: error.message,
    });
  }
};

/** La app móvil envía slots bloqueados con createdAt; el esquema exige date. */
function sanitizeBlockedTimeSlots(slots) {
  if (!Array.isArray(slots)) return [];
  return slots
    .map((b) => {
      if (!b || typeof b !== 'object') return null;
      const timeSlot = String(b.timeSlot || '').trim();
      if (!timeSlot) return null;
      let d = b.date ? new Date(b.date) : null;
      if (!d || Number.isNaN(d.getTime())) {
        d = b.createdAt ? new Date(b.createdAt) : new Date();
      }
      if (!d || Number.isNaN(d.getTime())) d = new Date();
      const out = {
        date: d,
        timeSlot,
      };
      if (b.reason != null && String(b.reason).trim() !== '') {
        out.reason = String(b.reason).trim().slice(0, 500);
      }
      return out;
    })
    .filter(Boolean);
}

function pickAvailabilityFields(body) {
  const b = body && typeof body === 'object' ? body : {};
  const allowed = [
    'professionalName',
    'daysOfWeek',
    'timeSlots',
    'workingHours',
    'breakTime',
    'specialDates',
    'recurringExceptions',
    'isActive',
    'appointmentDuration',
    'maxAppointmentsPerDay',
    'advanceBookingDays',
  ];
  const out = {};
  for (const k of allowed) {
    if (Object.prototype.hasOwnProperty.call(b, k) && b[k] !== undefined) {
      out[k] = b[k];
    }
  }
  const num = (v, min, max, fallback) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, Math.round(n)));
  };
  if (Object.prototype.hasOwnProperty.call(out, 'appointmentDuration')) {
    out.appointmentDuration = num(out.appointmentDuration, 15, 480, 30);
  }
  if (Object.prototype.hasOwnProperty.call(out, 'maxAppointmentsPerDay')) {
    out.maxAppointmentsPerDay = num(out.maxAppointmentsPerDay, 1, 100, 20);
  }
  if (Object.prototype.hasOwnProperty.call(out, 'advanceBookingDays')) {
    out.advanceBookingDays = num(out.advanceBookingDays, 0, 365, 30);
  }
  if (Object.prototype.hasOwnProperty.call(b, 'blockedTimeSlots')) {
    out.blockedTimeSlots = sanitizeBlockedTimeSlots(b.blockedTimeSlots);
  }
  return out;
}

const saveAvailability = async (req, res) => {
  try {
    const { professionalId } = req.params;
    const availabilityData = req.body || {};
    const oid = toProfessionalObjectId(professionalId);
    if (!oid) {
      return res.status(400).json({
        success: false,
        error: 'ID de profesional inválido',
        message:
          'El API espera el _id de MongoDB (24 caracteres hex). Los IDs tipo "1" o "2" no son válidos.',
      });
    }

    const picked = pickAvailabilityFields(availabilityData);
    const existing = await ProfessionalAvailability.findOne({
      professionalId: oid,
    });

    const profUser = await User.findById(oid).select('fullName').lean();
    const nameFromUser = profUser && profUser.fullName ? profUser.fullName : '';

    const professionalName =
      (typeof picked.professionalName === 'string' && picked.professionalName.trim()) ||
      (existing && existing.professionalName) ||
      nameFromUser ||
      'Profesional';

    const setDoc = {
      ...picked,
      professionalId: oid,
      professionalName,
      updatedAt: new Date(),
    };

    let availability;
    if (existing) {
      availability = await ProfessionalAvailability.findOneAndUpdate(
        { professionalId: oid },
        { $set: setDoc },
        { new: true, runValidators: true }
      );
    } else {
      const doc = new ProfessionalAvailability({
        ...setDoc,
        createdAt: new Date(),
      });
      await doc.save();
      availability = doc;
    }

    res.json({
      success: true,
      data: availability,
    });
  } catch (error) {
    console.error('Error guardando disponibilidad:', error);
    if (error.name === 'ValidationError') {
      const first =
        error.errors &&
        Object.values(error.errors)[0] &&
        Object.values(error.errors)[0].message;
      return res.status(400).json({
        success: false,
        error: first || 'Datos de disponibilidad inválidos',
        message: error.message,
        details: error.message,
      });
    }
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: error.message,
    });
  }
};

function normalizeTimeSlot(raw) {
  const s = String(raw || '').trim();
  const m = s.match(/^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/);
  if (!m) return null;
  return `${m[1].padStart(2, '0')}:${m[2]}`;
}

/** Fecha YYYY-MM-DD o ISO; devuelve Date UTC mediodía para comparar día sin correr TZ. */
function parseBookingDate(raw) {
  if (raw == null || raw === '') return null;
  const str = String(raw).trim();
  const ymd = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymd) {
    return new Date(Date.UTC(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]), 12, 0, 0));
  }
  const d = new Date(str);
  return Number.isNaN(d.getTime()) ? null : d;
}

function dateKeyUtc(d) {
  const x = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(x.getTime())) return '';
  return x.toISOString().slice(0, 10);
}

async function ensureAvailabilityDoc(oid) {
  let availability = await ProfessionalAvailability.findOne({ professionalId: oid });
  if (availability) return availability;
  const profUser = await User.findById(oid).select('fullName').lean();
  const professionalName = profUser && profUser.fullName ? profUser.fullName : 'Profesional';
  availability = new ProfessionalAvailability({
    professionalId: oid,
    professionalName,
    daysOfWeek: {
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: false,
      sunday: false,
    },
    timeSlots: ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'],
    workingHours: { start: '09:00', end: '18:00' },
    blockedTimeSlots: [],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  await availability.save();
  return availability;
}

const blockTimeSlot = async (req, res) => {
  try {
    const { professionalId } = req.params;
    const oid = toProfessionalObjectId(professionalId);
    if (!oid) {
      return res.status(400).json({
        success: false,
        error: 'ID de profesional inválido',
        message:
          'El API espera el _id de MongoDB (24 caracteres hex). Los IDs tipo "1" o "2" no son válidos.',
      });
    }

    const { date, timeSlot, appointmentId, reason } = req.body || {};
    const d = parseBookingDate(date);
    const ts = normalizeTimeSlot(timeSlot);
    const apptId = String(appointmentId || '').trim();
    if (!d || !ts || !apptId || apptId.length > 200) {
      return res.status(400).json({
        success: false,
        error: 'Solicitud inválida',
        message: 'Se requieren date, timeSlot (HH:MM) y appointmentId.',
      });
    }

    const key = dateKeyUtc(d);
    const availability = await ensureAvailabilityDoc(oid);
    const dup = (availability.blockedTimeSlots || []).some((b) => {
      const sameDay = dateKeyUtc(b.date) === key;
      const sameSlot = String(b.timeSlot || '') === ts;
      const sameAppt = String(b.appointmentId || '') === apptId;
      return sameDay && sameSlot && sameAppt;
    });
    if (dup) {
      return res.json({ success: true, message: 'Horario ya bloqueado para esta cita' });
    }

    availability.blockedTimeSlots.push({
      date: d,
      timeSlot: ts,
      appointmentId: apptId,
      reason: reason != null && String(reason).trim() ? String(reason).trim().slice(0, 500) : 'Cita programada',
      createdAt: new Date(),
    });
    availability.updatedAt = new Date();
    await availability.save();
    return res.json({ success: true, message: 'Horario bloqueado' });
  } catch (error) {
    console.error('Error bloqueando horario:', error);
    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: error.message,
    });
  }
};

const unblockTimeSlot = async (req, res) => {
  try {
    const { professionalId } = req.params;
    const oid = toProfessionalObjectId(professionalId);
    if (!oid) {
      return res.status(400).json({
        success: false,
        error: 'ID de profesional inválido',
      });
    }
    const { date, timeSlot, appointmentId } = req.body || {};
    const d = parseBookingDate(date);
    const ts = normalizeTimeSlot(timeSlot);
    const apptId = String(appointmentId || '').trim();
    if (!d || !ts || !apptId) {
      return res.status(400).json({
        success: false,
        error: 'Solicitud inválida',
      });
    }
    const key = dateKeyUtc(d);
    const availability = await ProfessionalAvailability.findOne({ professionalId: oid });
    if (!availability) {
      return res.json({ success: true, message: 'Sin disponibilidad que actualizar' });
    }
    const before = (availability.blockedTimeSlots || []).length;
    availability.blockedTimeSlots = (availability.blockedTimeSlots || []).filter((b) => {
      const keep =
        !(dateKeyUtc(b.date) === key && String(b.timeSlot || '') === ts && String(b.appointmentId || '') === apptId);
      return keep;
    });
    if (availability.blockedTimeSlots.length !== before) {
      availability.updatedAt = new Date();
      await availability.save();
    }
    return res.json({ success: true, message: 'Horario desbloqueado' });
  } catch (error) {
    console.error('Error desbloqueando horario:', error);
    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: error.message,
    });
  }
};

const unblockAppointmentTimeSlots = async (req, res) => {
  try {
    const { professionalId } = req.params;
    const oid = toProfessionalObjectId(professionalId);
    if (!oid) {
      return res.status(400).json({
        success: false,
        error: 'ID de profesional inválido',
      });
    }
    const { appointmentId } = req.body || {};
    const apptId = String(appointmentId || '').trim();
    if (!apptId) {
      return res.status(400).json({ success: false, error: 'appointmentId requerido' });
    }
    const availability = await ProfessionalAvailability.findOne({ professionalId: oid });
    if (!availability) {
      return res.json({ success: true, message: 'Sin bloqueos' });
    }
    availability.blockedTimeSlots = (availability.blockedTimeSlots || []).filter(
      (b) => String(b.appointmentId || '') !== apptId
    );
    availability.updatedAt = new Date();
    await availability.save();
    return res.json({ success: true, message: 'Bloqueos de la cita eliminados' });
  } catch (error) {
    console.error('Error desbloqueando cita:', error);
    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: error.message,
    });
  }
};

const getBlockedTimeSlots = async (req, res) => {
  try {
    const { professionalId } = req.params;
    const oid = toProfessionalObjectId(professionalId);
    if (!oid) {
      return res.status(400).json({
        success: false,
        error: 'ID de profesional inválido',
      });
    }
    const rawDate = String(req.query.date || '').trim();
    const d = parseBookingDate(rawDate);
    if (!d) {
      return res.status(400).json({
        success: false,
        error: 'Parámetro date inválido (use YYYY-MM-DD o ISO)',
      });
    }
    const key = dateKeyUtc(d);
    const availability = await ProfessionalAvailability.findOne({ professionalId: oid });
    const list = (availability && availability.blockedTimeSlots) || [];
    const filtered = list.filter((b) => dateKeyUtc(b.date) === key);
    const data = filtered.map((b) => ({
      timeSlot: b.timeSlot,
      appointmentId: b.appointmentId != null ? String(b.appointmentId) : '',
      reason: b.reason || '',
      createdAt: (b.createdAt && new Date(b.createdAt).toISOString()) || new Date().toISOString(),
    }));
    return res.json({ success: true, data });
  } catch (error) {
    console.error('Error listando horarios bloqueados:', error);
    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: error.message,
    });
  }
};

module.exports = {
  getAvailability,
  saveAvailability,
  blockTimeSlot,
  unblockTimeSlot,
  unblockAppointmentTimeSlots,
  getBlockedTimeSlots,
};
