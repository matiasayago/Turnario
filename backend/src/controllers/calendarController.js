const mongoose = require('mongoose');
const ProfessionalAvailability = require('../models/ProfessionalAvailability');
const ProfessionalDateSchedule = require('../models/ProfessionalDateSchedule');
const Appointment = require('../models/Appointment');
const ExpoAppointment = require('../models/ExpoAppointment');

/** Normaliza hora de Expo ("10:00", "10:00 - 11:00") a HH:mm para cruzar con timeSlots. */
function expoTimeToSlotKey(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const head = timeStr.split(/\s*[-–]\s*/)[0].trim();
  const m = head.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const h = String(Math.min(23, parseInt(m[1], 10))).padStart(2, '0');
  const min = String(Math.min(59, parseInt(m[2], 10))).padStart(2, '0');
  return `${h}:${min}`;
}

/** Igualdad de HH:mm entre franja del profesional y hora de cita (9:00 vs 09:00). */
function slotKeysMatch(a, b) {
  const ka = expoTimeToSlotKey(String(a)) || String(a).trim();
  const kb = expoTimeToSlotKey(String(b)) || String(b).trim();
  return ka === kb;
}

/**
 * Parsea YYYY-MM-DD en fecha local. Evita el bug de new Date('YYYY-MM-DD') (UTC)
 * que en zonas como AR puede cambiar el día y fallar el match con ExpoAppointment.date.
 */
function parseLocalYmd(dateParam) {
  const s = String(dateParam).trim().slice(0, 10);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const y = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10);
  const d = parseInt(m[3], 10);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const targetDate = new Date(y, mo - 1, d, 12, 0, 0, 0);
  if (
    targetDate.getFullYear() !== y ||
    targetDate.getMonth() !== mo - 1 ||
    targetDate.getDate() !== d
  ) {
    return null;
  }
  return { targetDate, dateYmd: `${m[1]}-${m[2]}-${m[3]}` };
}

/** ObjectId Mongo válido (24 hex). Evita CastError con IDs demo tipo "1" o "2". */
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

// Función para obtener el nombre del día
function getDayName(dayNumber) {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[dayNumber];
}

// Función para verificar si un horario está en el descanso
function isTimeInBreak(timeSlot, breakTime) {
  if (!breakTime || !breakTime.start || !breakTime.end) return false;
  
  const [slotHour, slotMinute] = timeSlot.split(':').map(Number);
  const [breakStartHour, breakStartMinute] = breakTime.start.split(':').map(Number);
  const [breakEndHour, breakEndMinute] = breakTime.end.split(':').map(Number);
  
  const slotMinutes = slotHour * 60 + slotMinute;
  const breakStartMinutes = breakStartHour * 60 + breakStartMinute;
  const breakEndMinutes = breakEndHour * 60 + breakEndMinute;
  
  return slotMinutes >= breakStartMinutes && slotMinutes < breakEndMinutes;
}

/**
 * Paciente: solo puede elegir horarios que el profesional definió en disponibilidad (timeSlots).
 * Las franjas por día (date-schedule) marcan la ventana; la lista semanal es la fuente de verdad.
 */
function filterDaySlotsByWeeklyTemplate(slots, weeklyTimeSlots) {
  if (!Array.isArray(slots) || slots.length === 0) return slots;
  if (!Array.isArray(weeklyTimeSlots) || weeklyTimeSlots.length === 0) return slots;
  const allow = new Set(
    weeklyTimeSlots
      .map((t) => expoTimeToSlotKey(String(t)) || String(t).trim())
      .filter(Boolean)
  );
  return slots.filter((s) => {
    const key = expoTimeToSlotKey(String(s.time)) || String(s.time).trim();
    return allow.has(key);
  });
}

function toDate(d) {
  if (!d) return null;
  if (d instanceof Date) return d;
  const x = new Date(d);
  return isNaN(x.getTime()) ? null : x;
}

/**
 * Rangos { start, end } (Gestión de horarios / date-schedules) → HH:mm cada 30 min, alineado con bookingSlotsService.
 */
function expandDateScheduleRangesToHalfHourTimes(rangeSlots) {
  const out = [];
  if (!Array.isArray(rangeSlots)) return out;
  for (const slot of rangeSlots) {
    if (!slot || !slot.start || !slot.end) continue;
    const startParts = String(slot.start).split(':').map(Number);
    const endParts = String(slot.end).split(':').map(Number);
    const sh = startParts[0] || 0;
    const sm = startParts[1] || 0;
    const eh = endParts[0] || 0;
    const em = endParts[1] || 0;
    let curH = sh;
    let curM = sm;
    const endMin = eh * 60 + em;
    while (curH * 60 + curM < endMin) {
      out.push(`${String(curH).padStart(2, '0')}:${String(curM).padStart(2, '0')}`);
      curM += 30;
      if (curM >= 60) {
        curM = 0;
        curH += 1;
      }
    }
  }
  return out;
}

/** Misma forma que generateAvailableSlots: marca citas como bloqueadas. */
function generateSlotsFromDateScheduleRanges(rangeSlots, existingAppointments = []) {
  const times = expandDateScheduleRangesToHalfHourTimes(rangeSlots);
  return times.map((time) => {
    const existingAppointment = existingAppointments.find((apt) =>
      slotKeysMatch(apt.startTime, time)
    );
    if (!existingAppointment) {
      return {
        time,
        isAvailable: true,
        isBlocked: false,
        appointmentId: null,
      };
    }
    return {
      time,
      isAvailable: false,
      isBlocked: true,
      appointmentId: existingAppointment._id,
      reason: 'Cita programada',
    };
  });
}

// Función para generar horarios disponibles para un día específico
function generateAvailableSlots(date, availability, existingAppointments = []) {
  const slots = [];
  const workingHours = availability.workingHours;
  const breakTime = availability.breakTime;
  const timeSlots = Array.isArray(availability.timeSlots) ? availability.timeSlots : [];
  const specialDates = Array.isArray(availability.specialDates) ? availability.specialDates : [];
  const recurringExceptions = Array.isArray(availability.recurringExceptions)
    ? availability.recurringExceptions
    : [];
  const blockedTimeSlots = Array.isArray(availability.blockedTimeSlots)
    ? availability.blockedTimeSlots
    : [];

  // Verificar excepciones especiales para esta fecha
  const specialDate = specialDates.find((sd) => {
    const sdDate = toDate(sd.date);
    return sdDate && sdDate.toDateString() === date.toDateString();
  });

  // Verificar excepciones recurrentes
  const dayOfWeek = date.getDay();
  const recurringException = recurringExceptions.find((re) => {
    const start = toDate(re.startDate);
    const end = toDate(re.endDate);
    return (
      re.dayOfWeek === dayOfWeek &&
      (!start || date >= start) &&
      (!end || date <= end)
    );
  });
  
  // Si hay excepción especial, usar esos horarios
  if (specialDate) {
    if (specialDate.isAvailable) {
      const customSlots =
        Array.isArray(specialDate.customTimeSlots) &&
        specialDate.customTimeSlots.length > 0
          ? specialDate.customTimeSlots
          : timeSlots;
      if (!customSlots.length) return [];
      return customSlots.map((time) => ({
        time,
        isAvailable: true,
        isBlocked: false,
        reason: specialDate.reason || 'Horario especial'
      }));
    } else {
      return []; // Día no disponible
    }
  }
  
  // Si hay excepción recurrente
  if (recurringException) {
    if (recurringException.isAvailable) {
      // Usar horarios normales
    } else {
      return []; // Día no disponible
    }
  }
  
  // Horarios normales del día
  for (const timeSlot of timeSlots) {
    // Verificar si el horario está en el descanso
    const isBreakTime = isTimeInBreak(timeSlot, breakTime);
    
    if (!isBreakTime) {
      const existingAppointment = existingAppointments.find((apt) =>
        slotKeysMatch(apt.startTime, timeSlot)
      );
      
      // Verificar si está bloqueado en la configuración
      const isBlockedInConfig = blockedTimeSlots.some((blocked) => {
        const bd = toDate(blocked.date);
        return (
          bd &&
          bd.toDateString() === date.toDateString() &&
          blocked.timeSlot === timeSlot
        );
      });
      
      if (!existingAppointment && !isBlockedInConfig) {
        slots.push({
          time: timeSlot,
          isAvailable: true,
          isBlocked: false,
          appointmentId: null
        });
      } else {
        slots.push({
          time: timeSlot,
          isAvailable: false,
          isBlocked: true,
          appointmentId: existingAppointment?._id || null,
          reason: existingAppointment ? 'Cita programada' : 'Horario bloqueado'
        });
      }
    }
  }
  
  return slots;
}

// Función para generar calendario mensual
async function generateMonthlyCalendar(professionalId, year, month) {
  try {
    const professionalObjectId = toProfessionalObjectId(professionalId);
    if (!professionalObjectId) {
      return null;
    }

    // Obtener disponibilidad del profesional
    const availability = await ProfessionalAvailability.findOne({
      professionalId: professionalObjectId,
      isActive: true,
    });
    
    if (!availability) {
      return null;
    }

    if (!Array.isArray(availability.timeSlots) || availability.timeSlots.length === 0) {
      console.warn(
        '[calendar] ProfessionalAvailability sin timeSlots para professionalId:',
        professionalId
      );
    }
    
    // Obtener citas existentes para el mes
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    
    const existingAppointments = await Appointment.find({
      professional: professionalObjectId,
      date: { $gte: startDate, $lte: endDate },
      status: { $in: ['confirmed', 'pending'] },
    }).select('date startTime endTime _id');

    const pad2 = (n) => String(n).padStart(2, '0');
    const startYmd = `${year}-${pad2(month)}-01`;
    const lastDayNum = new Date(year, month, 0).getDate();
    const endYmd = `${year}-${pad2(month)}-${pad2(lastDayNum)}`;
    const expoMonth = await ExpoAppointment.find({
      professionalId: professionalObjectId,
      date: { $gte: startYmd, $lte: endYmd },
      status: { $nin: ['cancelled', 'rejected'] },
    })
      .select('date time _id')
      .lean();

    const monthDateSchedules = await ProfessionalDateSchedule.find({
      professionalId: String(professionalObjectId),
      date: { $gte: startYmd, $lte: endYmd },
    })
      .select('date timeSlots isAvailable')
      .lean();
    const dateScheduleByYmd = new Map(monthDateSchedules.map((row) => [row.date, row]));
    
    const calendar = [];
    const daysInMonth = new Date(year, month, 0).getDate();
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const dayName = getDayName(date.getDay());
      const dateYmd = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
        date.getDate()
      ).padStart(2, '0')}`;
      const ds = dateScheduleByYmd.get(dateYmd);

      let isWorkingDay = Boolean(
        availability.daysOfWeek && availability.daysOfWeek[dayName]
      );
      if (ds) {
        if (ds.isAvailable === false) {
          isWorkingDay = false;
        } else if (Array.isArray(ds.timeSlots) && ds.timeSlots.length > 0) {
          isWorkingDay = true;
        }
      }
      
      if (isWorkingDay) {
        const dayLegacy = existingAppointments.filter(
          (apt) => apt.date.toDateString() === date.toDateString()
        );
        const dayExpo = expoMonth
          .filter((e) => e.date === dateYmd)
          .map((e) => {
            const st = expoTimeToSlotKey(e.time);
            return st ? { startTime: st, _id: e._id } : null;
          })
          .filter(Boolean);
        const dayAppointments = [...dayLegacy, ...dayExpo];

        const useDateSchedule =
          ds &&
          ds.isAvailable !== false &&
          Array.isArray(ds.timeSlots) &&
          ds.timeSlots.length > 0;
        const availableSlots = useDateSchedule
          ? generateSlotsFromDateScheduleRanges(ds.timeSlots, dayAppointments)
          : generateAvailableSlots(date, availability, dayAppointments);
        
        calendar.push({
          date: date.toISOString().split('T')[0],
          day: day,
          dayName: dayName,
          isWorkingDay: true,
          availableSlots: availableSlots,
          workingHours: availability.workingHours,
          breakTime: availability.breakTime,
          totalSlots: availableSlots.length,
          availableSlotsCount: availableSlots.filter(slot => slot.isAvailable).length,
          blockedSlotsCount: availableSlots.filter(slot => slot.isBlocked).length
        });
      } else {
        calendar.push({
          date: date.toISOString().split('T')[0],
          day: day,
          dayName: dayName,
          isWorkingDay: false,
          availableSlots: [],
          reason: "Día no laboral",
          totalSlots: 0,
          availableSlotsCount: 0,
          blockedSlotsCount: 0
        });
      }
    }
    
    return {
      professionalId: String(professionalObjectId),
      professionalName: availability.professionalName,
      year: parseInt(year),
      month: parseInt(month),
      monthName: new Date(year, month - 1).toLocaleString('es-ES', { month: 'long' }),
      calendar: calendar,
      summary: {
        totalDays: daysInMonth,
        workingDays: calendar.filter(day => day.isWorkingDay).length,
        nonWorkingDays: calendar.filter(day => !day.isWorkingDay).length,
        totalAvailableSlots: calendar.reduce((sum, day) => sum + day.availableSlotsCount, 0),
        totalBlockedSlots: calendar.reduce((sum, day) => sum + day.blockedSlotsCount, 0)
      }
    };
  } catch (error) {
    throw error;
  }
}

// Controlador para obtener calendario mensual
const getMonthlyCalendar = async (req, res) => {
  try {
    const { professionalId, year, month } = req.params;
    
    // Validar parámetros
    if (!professionalId || !year || !month) {
      return res.status(400).json({ 
        error: 'Se requieren professionalId, year y month' 
      });
    }
    
    // Validar formato de año y mes
    const yearNum = parseInt(year);
    const monthNum = parseInt(month);
    
    if (isNaN(yearNum) || yearNum < 2020 || yearNum > 2030) {
      return res.status(400).json({ 
        error: 'Año inválido. Debe estar entre 2020 y 2030' 
      });
    }
    
    if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return res.status(400).json({ 
        error: 'Mes inválido. Debe estar entre 1 y 12' 
      });
    }

    if (!toProfessionalObjectId(professionalId)) {
      return res.status(400).json({
        error: 'ID de profesional inválido',
        message:
          'El API espera el _id de MongoDB del profesional (24 caracteres hex). Los IDs de catálogo demo ("1","2", etc.) no son ObjectIds; iniciá sesión como profesional o usa el _id real del usuario.',
      });
    }
    
    // Generar calendario mensual
    const monthlyCalendar = await generateMonthlyCalendar(professionalId, yearNum, monthNum);

    if (!monthlyCalendar) {
      return res.status(404).json({
        error: 'Profesional no encontrado',
        message:
          'No hay disponibilidad configurada para este profesional. Configura horarios en la app o en la base de datos.',
      });
    }

    res.json({
      success: true,
      data: monthlyCalendar
    });
    
  } catch (error) {
    console.error('Error generando calendario mensual:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      message: error.message 
    });
  }
};

// Controlador para obtener disponibilidad de un día específico
const getDayAvailability = async (req, res) => {
  try {
    const { professionalId, date } = req.params;
    
    // Validar parámetros
    if (!professionalId || !date) {
      return res.status(400).json({ 
        error: 'Se requieren professionalId y date' 
      });
    }
    
    const parsed = parseLocalYmd(date);
    if (!parsed) {
      return res.status(400).json({
        error: 'Formato de fecha inválido. Use YYYY-MM-DD',
      });
    }
    const { targetDate, dateYmd } = parsed;

    const professionalObjectId = toProfessionalObjectId(professionalId);
    if (!professionalObjectId) {
      return res.status(400).json({
        error: 'ID de profesional inválido',
        message:
          'Use el _id de MongoDB del profesional (24 caracteres hex), no IDs de demo.',
      });
    }

    const [availability, dateScheduleDoc] = await Promise.all([
      ProfessionalAvailability.findOne({
        professionalId: professionalObjectId,
        isActive: true,
      }),
      ProfessionalDateSchedule.findOne({
        professionalId: String(professionalObjectId),
        date: dateYmd,
      }).lean(),
    ]);

    // Obtener citas existentes para este día
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const legacyAppointments = await Appointment.find({
      professional: professionalObjectId,
      date: { $gte: startOfDay, $lte: endOfDay },
      status: { $in: ['confirmed', 'pending'] },
    })
      .select('startTime endTime _id')
      .lean();

    const expoDocs = await ExpoAppointment.find({
      professionalId: professionalObjectId,
      date: dateYmd,
      status: { $nin: ['cancelled', 'rejected'] },
    })
      .select('time _id')
      .lean();

    const expoAsBlocks = expoDocs
      .map((doc) => {
        const startTime = expoTimeToSlotKey(doc.time);
        return startTime ? { startTime, _id: doc._id } : null;
      })
      .filter(Boolean);

    const existingAppointments = [...legacyAppointments, ...expoAsBlocks];

    const dayName = getDayName(targetDate.getDay());
    const hasDateScheduleSlots =
      dateScheduleDoc &&
      dateScheduleDoc.isAvailable !== false &&
      Array.isArray(dateScheduleDoc.timeSlots) &&
      dateScheduleDoc.timeSlots.length > 0;

    let availableSlots;
    let isWorkingDay;
    let professionalName;
    let workingHours;
    let breakTime;

    if (dateScheduleDoc && dateScheduleDoc.isAvailable === false) {
      availableSlots = [];
      isWorkingDay = false;
      professionalName =
        (availability && availability.professionalName) ||
        dateScheduleDoc.professionalName ||
        'Profesional';
      workingHours =
        (availability && availability.workingHours) || { start: '09:00', end: '18:00' };
      breakTime = availability && availability.breakTime;
    } else if (hasDateScheduleSlots) {
      availableSlots = generateSlotsFromDateScheduleRanges(
        dateScheduleDoc.timeSlots,
        existingAppointments
      );
      const bt = availability && availability.breakTime;
      if (bt && bt.start && bt.end) {
        availableSlots = availableSlots.filter((s) => !isTimeInBreak(s.time, bt));
      }
      if (availability && Array.isArray(availability.timeSlots) && availability.timeSlots.length > 0) {
        availableSlots = filterDaySlotsByWeeklyTemplate(availableSlots, availability.timeSlots);
      }
      isWorkingDay = true;
      professionalName =
        (availability && availability.professionalName) ||
        dateScheduleDoc.professionalName ||
        'Profesional';
      workingHours =
        (availability && availability.workingHours) || { start: '09:00', end: '18:00' };
      breakTime = availability && availability.breakTime;
    } else if (availability) {
      availableSlots = generateAvailableSlots(targetDate, availability, existingAppointments);
      isWorkingDay = Boolean(
        availability.daysOfWeek && availability.daysOfWeek[dayName]
      );
      professionalName = availability.professionalName;
      workingHours = availability.workingHours;
      breakTime = availability.breakTime;
    } else {
      return res.status(404).json({
        error: 'Profesional no encontrado',
        message:
          'No hay disponibilidad configurada. Configurá horarios en la app o usá Gestión de horarios en Configuración.',
      });
    }

    res.json({
      success: true,
      data: {
        professionalId,
        professionalName,
        date: date,
        dayName,
        isWorkingDay,
        availableSlots: availableSlots,
        workingHours: workingHours,
        breakTime: breakTime,
        summary: {
          totalSlots: availableSlots.length,
          availableSlotsCount: availableSlots.filter((slot) => slot.isAvailable).length,
          blockedSlotsCount: availableSlots.filter((slot) => slot.isBlocked).length,
        },
      },
    });
    
  } catch (error) {
    console.error('Error obteniendo disponibilidad del día:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      message: error.message 
    });
  }
};

// Controlador para obtener próximos días disponibles
const getUpcomingAvailability = async (req, res) => {
  try {
    const { professionalId } = req.params;
    const { days = 30 } = req.query;
    
    if (!professionalId) {
      return res.status(400).json({ 
        error: 'Se requiere professionalId' 
      });
    }
    
    const daysNum = parseInt(days);
    if (isNaN(daysNum) || daysNum < 1 || daysNum > 90) {
      return res.status(400).json({ 
        error: 'Días debe estar entre 1 y 90' 
      });
    }

    const professionalObjectId = toProfessionalObjectId(professionalId);
    if (!professionalObjectId) {
      return res.status(400).json({
        error: 'ID de profesional inválido',
        message:
          'Use el _id de MongoDB del profesional (24 caracteres hex), no IDs de demo.',
      });
    }
    
    // Obtener disponibilidad del profesional
    const availability = await ProfessionalAvailability.findOne({
      professionalId: professionalObjectId,
      isActive: true,
    });
    
    if (!availability) {
      return res.status(404).json({ 
        error: 'Profesional no encontrado' 
      });
    }
    
    const upcomingDays = [];
    const today = new Date();
    
    for (let i = 0; i < daysNum; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      const dayName = getDayName(date.getDay());
      const isWorkingDay = Boolean(
        availability.daysOfWeek && availability.daysOfWeek[dayName]
      );
      
      if (isWorkingDay) {
        // Obtener citas para este día
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        
        const existingAppointments = await Appointment.find({
          professional: professionalObjectId,
          date: { $gte: startOfDay, $lte: endOfDay },
          status: { $in: ['confirmed', 'pending'] },
        }).select('startTime endTime _id');
        
        // Generar horarios disponibles
        const availableSlots = generateAvailableSlots(date, availability, existingAppointments);
        const availableCount = availableSlots.filter(slot => slot.isAvailable).length;
        
        if (availableCount > 0) {
          upcomingDays.push({
            date: date.toISOString().split('T')[0],
            dayName: dayName,
            availableSlotsCount: availableCount,
            firstAvailableSlot: availableSlots.find(slot => slot.isAvailable)?.time,
            lastAvailableSlot: [...availableSlots].reverse().find(slot => slot.isAvailable)?.time
          });
        }
      }
    }
    
    res.json({
      success: true,
      data: {
        professionalId,
        professionalName: availability.professionalName,
        upcomingDays: upcomingDays,
        totalDays: upcomingDays.length,
        searchPeriod: `${daysNum} días desde hoy`
      }
    });
    
  } catch (error) {
    console.error('Error obteniendo próximos días disponibles:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      message: error.message 
    });
  }
};

module.exports = {
  getMonthlyCalendar,
  getDayAvailability,
  getUpcomingAvailability
};
