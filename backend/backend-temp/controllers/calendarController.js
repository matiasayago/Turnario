const ProfessionalAvailability = require('../models/ProfessionalAvailability');
const Appointment = require('../models/Appointment');

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

// Función para generar horarios disponibles para un día específico
function generateAvailableSlots(date, availability, existingAppointments = []) {
  const slots = [];
  const workingHours = availability.workingHours;
  const breakTime = availability.breakTime;
  const timeSlots = availability.timeSlots;
  
  // Verificar excepciones especiales para esta fecha
  const specialDate = availability.specialDates.find(sd => 
    sd.date.toDateString() === date.toDateString()
  );
  
  // Verificar excepciones recurrentes
  const dayOfWeek = date.getDay();
  const recurringException = availability.recurringExceptions.find(re => 
    re.dayOfWeek === dayOfWeek &&
    (!re.startDate || date >= re.startDate) &&
    (!re.endDate || date <= re.endDate)
  );
  
  // Si hay excepción especial, usar esos horarios
  if (specialDate) {
    if (specialDate.isAvailable) {
      const customSlots = specialDate.customTimeSlots || timeSlots;
      return customSlots.map(time => ({
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
      // Verificar si está bloqueado por una cita existente
      const existingAppointment = existingAppointments.find(apt => 
        apt.startTime === timeSlot
      );
      
      // Verificar si está bloqueado en la configuración
      const isBlockedInConfig = availability.blockedTimeSlots.some(blocked => 
        blocked.date.toDateString() === date.toDateString() && 
        blocked.timeSlot === timeSlot
      );
      
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
    // Obtener disponibilidad del profesional
    const availability = await ProfessionalAvailability.findOne({ 
      professionalId, 
      isActive: true 
    });
    
    if (!availability) {
      throw new Error('Profesional no encontrado');
    }
    
    // Obtener citas existentes para el mes
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    
    const existingAppointments = await Appointment.find({
      professional: professionalId,
      date: { $gte: startDate, $lte: endDate },
      status: { $in: ['confirmed', 'pending'] }
    }).select('date startTime endTime _id');
    
    const calendar = [];
    const daysInMonth = new Date(year, month, 0).getDate();
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const dayName = getDayName(date.getDay());
      
      // Verificar si el profesional trabaja este día
      const isWorkingDay = availability.daysOfWeek[dayName];
      
      if (isWorkingDay) {
        // Obtener citas para este día específico
        const dayAppointments = existingAppointments.filter(apt => 
          apt.date.toDateString() === date.toDateString()
        );
        
        // Generar horarios disponibles para este día
        const availableSlots = generateAvailableSlots(date, availability, dayAppointments);
        
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
      professionalId,
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
    
    // Generar calendario mensual
    const monthlyCalendar = await generateMonthlyCalendar(professionalId, yearNum, monthNum);
    
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
    
    // Validar formato de fecha
    const targetDate = new Date(date);
    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({ 
        error: 'Formato de fecha inválido. Use YYYY-MM-DD' 
      });
    }
    
    // Obtener disponibilidad del profesional
    const availability = await ProfessionalAvailability.findOne({ 
      professionalId, 
      isActive: true 
    });
    
    if (!availability) {
      return res.status(404).json({ 
        error: 'Profesional no encontrado' 
      });
    }
    
    // Obtener citas existentes para este día
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    const existingAppointments = await Appointment.find({
      professional: professionalId,
      date: { $gte: startOfDay, $lte: endOfDay },
      status: { $in: ['confirmed', 'pending'] }
    }).select('startTime endTime _id');
    
    // Generar horarios disponibles
    const availableSlots = generateAvailableSlots(targetDate, availability, existingAppointments);
    
    res.json({
      success: true,
      data: {
        professionalId,
        professionalName: availability.professionalName,
        date: date,
        dayName: getDayName(targetDate.getDay()),
        isWorkingDay: availability.daysOfWeek[getDayName(targetDate.getDay())],
        availableSlots: availableSlots,
        workingHours: availability.workingHours,
        breakTime: availability.breakTime,
        summary: {
          totalSlots: availableSlots.length,
          availableSlotsCount: availableSlots.filter(slot => slot.isAvailable).length,
          blockedSlotsCount: availableSlots.filter(slot => slot.isBlocked).length
        }
      }
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
    
    // Obtener disponibilidad del profesional
    const availability = await ProfessionalAvailability.findOne({ 
      professionalId, 
      isActive: true 
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
      const isWorkingDay = availability.daysOfWeek[dayName];
      
      if (isWorkingDay) {
        // Obtener citas para este día
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        
        const existingAppointments = await Appointment.find({
          professional: professionalId,
          date: { $gte: startOfDay, $lte: endOfDay },
          status: { $in: ['confirmed', 'pending'] }
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
