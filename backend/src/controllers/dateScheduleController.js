const ProfessionalDateSchedule = require('../models/ProfessionalDateSchedule');

const getDateSchedule = async (req, res) => {
  try {
    const { professionalId, date } = req.params;

    if (!professionalId || !date) {
      return res.status(400).json({
        success: false,
        error: 'professionalId y date son requeridos'
      });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        success: false,
        error: 'Formato de fecha inválido. Use YYYY-MM-DD'
      });
    }

    const schedule = await ProfessionalDateSchedule.findOne({
      professionalId,
      date
    });

    if (!schedule) {
      return res.json({
        success: true,
        data: null,
        message: 'No hay horarios configurados para esta fecha'
      });
    }

    res.json({
      success: true,
      data: schedule
    });

  } catch (error) {
    console.error('Error obteniendo horarios de fecha:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: error.message
    });
  }
};

const createOrUpdateDateSchedule = async (req, res) => {
  try {
    const { professionalId } = req.params;
    const { date, timeSlots, isAvailable, notes, professionalName } = req.body;

    if (!professionalId || !date) {
      return res.status(400).json({
        success: false,
        error: 'professionalId y date son requeridos'
      });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        success: false,
        error: 'Formato de fecha inválido. Use YYYY-MM-DD'
      });
    }

    if (isAvailable && (!timeSlots || timeSlots.length === 0)) {
      return res.status(400).json({
        success: false,
        error: 'Debe haber al menos un horario si la fecha está disponible'
      });
    }

    let schedule = await ProfessionalDateSchedule.findOne({
      professionalId,
      date
    });

    const scheduleData = {
      professionalId,
      professionalName: professionalName || 'Profesional',
      date,
      timeSlots: timeSlots || [],
      isAvailable: isAvailable !== undefined ? isAvailable : true,
      notes: notes || ''
    };

    if (schedule) {
      schedule = await ProfessionalDateSchedule.findOneAndUpdate(
        { professionalId, date },
        scheduleData,
        { new: true, runValidators: true }
      );
    } else {
      schedule = new ProfessionalDateSchedule(scheduleData);
      await schedule.save();
    }

    res.json({
      success: true,
      data: schedule,
      message: schedule ? 'Horarios guardados exitosamente' : 'Horarios creados exitosamente'
    });

  } catch (error) {
    console.error('Error guardando horarios de fecha:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: error.message
    });
  }
};

const getMonthlySchedules = async (req, res) => {
  try {
    const { professionalId, year, month } = req.params;

    if (!professionalId || !year || !month) {
      return res.status(400).json({
        success: false,
        error: 'professionalId, year y month son requeridos'
      });
    }

    const yearNum = parseInt(year, 10);
    const monthNum = parseInt(month, 10);

    if (isNaN(yearNum) || yearNum < 2020 || yearNum > 2030) {
      return res.status(400).json({
        success: false,
        error: 'Año inválido'
      });
    }

    if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return res.status(400).json({
        success: false,
        error: 'Mes inválido'
      });
    }

    const schedules = await ProfessionalDateSchedule.getMonthlySchedules(professionalId, yearNum, monthNum);

    res.json({
      success: true,
      data: schedules,
      count: schedules.length
    });

  } catch (error) {
    console.error('Error obteniendo horarios del mes:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: error.message
    });
  }
};

const getDateRangeSchedules = async (req, res) => {
  try {
    const { professionalId } = req.params;
    const { startDate, endDate } = req.query;

    if (!professionalId || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'professionalId, startDate y endDate son requeridos'
      });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      return res.status(400).json({
        success: false,
        error: 'Formato de fecha inválido. Use YYYY-MM-DD'
      });
    }

    const schedules = await ProfessionalDateSchedule.getDateRangeSchedules(professionalId, startDate, endDate);

    res.json({
      success: true,
      data: schedules,
      count: schedules.length
    });

  } catch (error) {
    console.error('Error obteniendo horarios del rango:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: error.message
    });
  }
};

/** YYYY-MM-DD en hora local (evita desfase por UTC). */
function formatLocalYmd(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Aplica los mismos timeSlots a todas las fechas en [startDate, endDate] cuyo día de la semana esté en weekdays.
 * weekdays: números 0–6 (0=domingo … 6=sábado), como Date.getDay().
 * overwriteExisting: si false, no modifica fechas que ya tienen documento en BD.
 */
const bulkApplyWeeklyTemplate = async (req, res) => {
  try {
    const { professionalId } = req.params;
    const {
      startDate,
      endDate,
      weekdays,
      timeSlots,
      professionalName,
      isAvailable,
      overwriteExisting,
    } = req.body;

    if (!professionalId) {
      return res.status(400).json({
        success: false,
        error: 'professionalId es requerido',
      });
    }

    if (!startDate || !endDate || !/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      return res.status(400).json({
        success: false,
        error: 'startDate y endDate son obligatorios (YYYY-MM-DD)',
      });
    }

    if (!Array.isArray(weekdays) || weekdays.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Seleccioná al menos un día de la semana (weekdays: 0–6)',
      });
    }

    const wdSet = new Set(weekdays.map((n) => parseInt(n, 10)).filter((n) => !Number.isNaN(n) && n >= 0 && n <= 6));
    if (wdSet.size === 0) {
      return res.status(400).json({
        success: false,
        error: 'weekdays inválidos; usá enteros 0 (dom) a 6 (sáb)',
      });
    }

    const slots = Array.isArray(timeSlots) ? timeSlots : [];
    const available = isAvailable !== false;
    if (available && slots.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Con la fecha disponible, debe haber al menos un rango horario',
      });
    }

    const start = new Date(`${startDate}T12:00:00`);
    const end = new Date(`${endDate}T12:00:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
      return res.status(400).json({
        success: false,
        error: 'Rango de fechas inválido',
      });
    }

    const maxDays = 400;
    let dayCount = 0;
    for (let t = start.getTime(); t <= end.getTime(); t += 86400000) {
      dayCount++;
    }
    if (dayCount > maxDays) {
      return res.status(400).json({
        success: false,
        error: `El rango no puede superar ${maxDays} días`,
      });
    }

    const overwrite = overwriteExisting === true || overwriteExisting === 'true';
    const name = professionalName != null ? String(professionalName) : 'Profesional';

    const datesToWrite = [];
    for (let t = start.getTime(); t <= end.getTime(); t += 86400000) {
      const d = new Date(t);
      if (!wdSet.has(d.getDay())) continue;
      datesToWrite.push(formatLocalYmd(d));
    }

    let applied = 0;
    let skipped = 0;

    if (!overwrite && datesToWrite.length > 0) {
      const existing = await ProfessionalDateSchedule.find({
        professionalId,
        date: { $in: datesToWrite },
      })
        .select('date')
        .lean();
      const has = new Set(existing.map((e) => e.date));
      for (const dateStr of datesToWrite) {
        if (has.has(dateStr)) {
          skipped++;
          continue;
        }
        await ProfessionalDateSchedule.findOneAndUpdate(
          { professionalId, date: dateStr },
          {
            professionalId,
            professionalName: name,
            date: dateStr,
            timeSlots: slots,
            isAvailable: available,
            notes: '',
          },
          { upsert: true, new: true, runValidators: true }
        );
        applied++;
      }
    } else {
      for (const dateStr of datesToWrite) {
        await ProfessionalDateSchedule.findOneAndUpdate(
          { professionalId, date: dateStr },
          {
            professionalId,
            professionalName: name,
            date: dateStr,
            timeSlots: slots,
            isAvailable: available,
            notes: '',
          },
          { upsert: true, new: true, runValidators: true }
        );
        applied++;
      }
    }

    return res.json({
      success: true,
      message: `Plantilla aplicada: ${applied} día(s).${skipped ? ` Omitidos (ya tenían horario): ${skipped}.` : ''}`,
      data: { applied, skipped, totalTargets: datesToWrite.length },
    });
  } catch (error) {
    console.error('Error bulkApplyWeeklyTemplate:', error);
    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: error.message,
    });
  }
};

const deleteDateSchedule = async (req, res) => {
  try {
    const { professionalId, date } = req.params;

    if (!professionalId || !date) {
      return res.status(400).json({
        success: false,
        error: 'professionalId y date son requeridos'
      });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        success: false,
        error: 'Formato de fecha inválido. Use YYYY-MM-DD'
      });
    }

    const schedule = await ProfessionalDateSchedule.findOneAndDelete({
      professionalId,
      date
    });

    if (!schedule) {
      return res.status(404).json({
        success: false,
        error: 'No se encontraron horarios para esta fecha'
      });
    }

    res.json({
      success: true,
      message: 'Horarios eliminados exitosamente',
      data: schedule
    });

  } catch (error) {
    console.error('Error eliminando horarios:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: error.message
    });
  }
};

module.exports = {
  getDateSchedule,
  createOrUpdateDateSchedule,
  getMonthlySchedules,
  getDateRangeSchedules,
  bulkApplyWeeklyTemplate,
  deleteDateSchedule
};
