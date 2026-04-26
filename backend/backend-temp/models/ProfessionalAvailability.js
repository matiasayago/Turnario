const mongoose = require('mongoose');

const professionalAvailabilitySchema = new mongoose.Schema({
  professionalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  professionalName: {
    type: String,
    required: true
  },
  daysOfWeek: {
    monday: { type: Boolean, default: false },
    tuesday: { type: Boolean, default: false },
    wednesday: { type: Boolean, default: false },
    thursday: { type: Boolean, default: false },
    friday: { type: Boolean, default: false },
    saturday: { type: Boolean, default: false },
    sunday: { type: Boolean, default: false }
  },
  timeSlots: [{
    type: String,
    required: true
  }],
  workingHours: {
    start: {
      type: String,
      required: true,
      match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
    },
    end: {
      type: String,
      required: true,
      match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
    }
  },
  breakTime: {
    start: {
      type: String,
      match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
    },
    end: {
      type: String,
      match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  timezone: {
    type: String,
    default: 'America/Argentina/Buenos_Aires'
  },
  specialDates: [{
    date: {
      type: Date,
      required: true
    },
    isAvailable: {
      type: Boolean,
      default: true
    },
    customTimeSlots: [String],
    reason: String
  }],
  recurringExceptions: [{
    dayOfWeek: {
      type: Number,
      min: 0,
      max: 6
    },
    startDate: Date,
    endDate: Date,
    isAvailable: {
      type: Boolean,
      default: false
    },
    reason: String
  }],
  blockedTimeSlots: [{
    date: {
      type: Date,
      required: true
    },
    timeSlot: {
      type: String,
      required: true
    },
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      required: true
    },
    reason: {
      type: String,
      default: 'Cita programada'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices para optimizar consultas
professionalAvailabilitySchema.index({ professionalId: 1, isActive: 1 });
professionalAvailabilitySchema.index({ 'daysOfWeek.monday': 1 });
professionalAvailabilitySchema.index({ 'specialDates.date': 1 });

// Middleware para validar horarios
professionalAvailabilitySchema.pre('save', function(next) {
  // Validar que start time sea menor que end time
  if (this.workingHours.start >= this.workingHours.end) {
    return next(new Error('El horario de inicio debe ser menor al horario de fin'));
  }

  // Validar que los timeSlots estén dentro del horario de trabajo (validación flexible)
  const startMinutes = this.timeToMinutes(this.workingHours.start);
  const endMinutes = this.timeToMinutes(this.workingHours.end);
  
  for (const timeSlot of this.timeSlots) {
    const slotMinutes = this.timeToMinutes(timeSlot);
    // Permitir horarios que estén dentro o muy cerca del horario de trabajo (margen de 1 hora)
    if (slotMinutes < startMinutes - 60 || slotMinutes > endMinutes + 60) {
      console.warn(`⚠️ Horario ${timeSlot} está fuera del horario de trabajo (${this.workingHours.start}-${this.workingHours.end}), pero se permite`);
    }
  }

  // Validar breakTime si existe
  if (this.breakTime && this.breakTime.start && this.breakTime.end) {
    if (this.breakTime.start >= this.breakTime.end) {
      return next(new Error('El horario de descanso de inicio debe ser menor al horario de fin'));
    }
  }

  next();
});

// Método helper para convertir tiempo a minutos
professionalAvailabilitySchema.methods.timeToMinutes = function(timeString) {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
};

// Método para verificar si una fecha específica está disponible
professionalAvailabilitySchema.methods.isDateAvailable = function(date) {
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayName = dayNames[date.getDay()];
  
  // Verificar si el día de la semana está disponible
  const isDayAvailable = this.daysOfWeek[dayName];
  
  // Verificar excepciones especiales para esta fecha
  const specialDate = this.specialDates.find(sd => 
    sd.date.toDateString() === date.toDateString()
  );
  
  if (specialDate) {
    return specialDate.isAvailable;
  }
  
  // Verificar excepciones recurrentes
  const dayOfWeek = date.getDay();
  const recurringException = this.recurringExceptions.find(re => 
    re.dayOfWeek === dayOfWeek &&
    (!re.startDate || date >= re.startDate) &&
    (!re.endDate || date <= re.endDate)
  );
  
  if (recurringException) {
    return recurringException.isAvailable;
  }
  
  return isDayAvailable && this.isActive;
};

// Método para obtener horarios disponibles para una fecha específica
professionalAvailabilitySchema.methods.getAvailableTimeSlots = function(date) {
  if (!this.isDateAvailable(date)) {
    return [];
  }
  
  // Verificar si hay horarios personalizados para esta fecha
  const specialDate = this.specialDates.find(sd => 
    sd.date.toDateString() === date.toDateString()
  );
  
  let availableSlots = [];
  if (specialDate && specialDate.customTimeSlots) {
    availableSlots = specialDate.customTimeSlots;
  } else {
    availableSlots = this.timeSlots;
  }
  
  // Filtrar horarios bloqueados
  const blockedSlots = this.blockedTimeSlots
    .filter(blocked => blocked.date.toDateString() === date.toDateString())
    .map(blocked => blocked.timeSlot);
  
  return availableSlots.filter(slot => !blockedSlots.includes(slot));
};

// Método para verificar si un horario específico está disponible
professionalAvailabilitySchema.methods.isTimeSlotAvailable = function(date, timeSlot) {
  const availableSlots = this.getAvailableTimeSlots(date);
  return availableSlots.includes(timeSlot);
};

// Método para verificar si un horario específico está bloqueado
professionalAvailabilitySchema.methods.isTimeSlotBlocked = function(date, timeSlot) {
  return this.blockedTimeSlots.some(blocked => 
    blocked.date.toDateString() === date.toDateString() && 
    blocked.timeSlot === timeSlot
  );
};

// Método para agregar una excepción especial
professionalAvailabilitySchema.methods.addSpecialDate = function(date, isAvailable, customTimeSlots, reason) {
  this.specialDates.push({
    date,
    isAvailable,
    customTimeSlots: customTimeSlots || this.timeSlots,
    reason
  });
  return this.save();
};

// Método para agregar una excepción recurrente
professionalAvailabilitySchema.methods.addRecurringException = function(dayOfWeek, startDate, endDate, isAvailable, reason) {
  this.recurringExceptions.push({
    dayOfWeek,
    startDate,
    endDate,
    isAvailable,
    reason
  });
  return this.save();
};

// Método para bloquear un horario específico
professionalAvailabilitySchema.methods.blockTimeSlot = function(date, timeSlot, appointmentId, reason = 'Cita programada') {
  // Verificar si ya está bloqueado
  const existingBlock = this.blockedTimeSlots.find(blocked => 
    blocked.date.toDateString() === date.toDateString() && 
    blocked.timeSlot === timeSlot
  );
  
  if (existingBlock) {
    throw new Error('Este horario ya está bloqueado');
  }
  
  this.blockedTimeSlots.push({
    date,
    timeSlot,
    appointmentId,
    reason,
    createdAt: new Date()
  });
  
  return this.save();
};

// Método para desbloquear un horario específico
professionalAvailabilitySchema.methods.unblockTimeSlot = function(date, timeSlot, appointmentId) {
  const blockIndex = this.blockedTimeSlots.findIndex(blocked => 
    blocked.date.toDateString() === date.toDateString() && 
    blocked.timeSlot === timeSlot &&
    blocked.appointmentId.toString() === appointmentId.toString()
  );
  
  if (blockIndex === -1) {
    throw new Error('Horario bloqueado no encontrado');
  }
  
  this.blockedTimeSlots.splice(blockIndex, 1);
  return this.save();
};

// Método para desbloquear todos los horarios de una cita
professionalAvailabilitySchema.methods.unblockAppointmentTimeSlots = function(appointmentId) {
  this.blockedTimeSlots = this.blockedTimeSlots.filter(blocked => 
    blocked.appointmentId.toString() !== appointmentId.toString()
  );
  return this.save();
};

// Método para obtener horarios bloqueados en una fecha
professionalAvailabilitySchema.methods.getBlockedTimeSlots = function(date) {
  return this.blockedTimeSlots
    .filter(blocked => blocked.date.toDateString() === date.toDateString())
    .map(blocked => ({
      timeSlot: blocked.timeSlot,
      appointmentId: blocked.appointmentId,
      reason: blocked.reason,
      createdAt: blocked.createdAt
    }));
};

// Método estático para obtener disponibilidad por profesional
professionalAvailabilitySchema.statics.findByProfessional = function(professionalId) {
  return this.findOne({ professionalId, isActive: true });
};

// Método estático para obtener todos los profesionales disponibles en una fecha
professionalAvailabilitySchema.statics.findAvailableProfessionals = function(date) {
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayName = dayNames[date.getDay()];
  
  return this.find({
    isActive: true,
    [`daysOfWeek.${dayName}`]: true
  }).populate('professionalId', 'fullName email phone service');
};

module.exports = mongoose.model('ProfessionalAvailability', professionalAvailabilitySchema);
