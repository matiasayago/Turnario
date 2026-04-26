const mongoose = require('mongoose');

const professionalAvailabilitySchema = new mongoose.Schema({
  professionalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  professionalName: {
    type: String,
    required: true
  },
  
  // Días de la semana disponibles
  daysOfWeek: {
    monday: { type: Boolean, default: true },
    tuesday: { type: Boolean, default: true },
    wednesday: { type: Boolean, default: true },
    thursday: { type: Boolean, default: true },
    friday: { type: Boolean, default: true },
    saturday: { type: Boolean, default: false },
    sunday: { type: Boolean, default: false }
  },
  
  // Horarios por defecto
  timeSlots: [{
    type: String,
    validate: {
      validator: function(v) {
        return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
      },
      message: 'Formato de horario inválido. Use HH:MM'
    }
  }],
  
  // Horario de trabajo
  workingHours: {
    start: {
      type: String,
      validate: {
        validator: function(v) {
          return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
        },
        message: 'Formato de horario inválido. Use HH:MM'
      }
    },
    end: {
      type: String,
      validate: {
        validator: function(v) {
          return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
        },
        message: 'Formato de horario inválido. Use HH:MM'
      }
    }
  },
  
  // Horario de descanso
  breakTime: {
    start: {
      type: String,
      validate: {
        validator: function(v) {
          return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
        },
        message: 'Formato de horario inválido. Use HH:MM'
      }
    },
    end: {
      type: String,
      validate: {
        validator: function(v) {
          return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
        },
        message: 'Formato de horario inválido. Use HH:MM'
      }
    }
  },
  
  // Excepciones especiales por fecha
  specialDates: [{
    date: { type: Date, required: true },
    isAvailable: { type: Boolean, default: false },
    customTimeSlots: [String],
    reason: String
  }],
  
  // Excepciones recurrentes
  recurringExceptions: [{
    dayOfWeek: { type: Number, min: 0, max: 6 }, // 0 = domingo, 1 = lunes, etc.
    startDate: Date,
    endDate: Date,
    isAvailable: { type: Boolean, default: false },
    customTimeSlots: [String],
    reason: String
  }],
  
  // Horarios bloqueados específicos (citas / reservas)
  blockedTimeSlots: [{
    date: { type: Date, required: true },
    timeSlot: { type: String, required: true },
    reason: String,
    appointmentId: { type: String, trim: true },
    createdAt: { type: Date, default: Date.now },
  }],
  
  // Estado de la configuración
  isActive: {
    type: Boolean,
    default: true
  },

  /** Duración estándar de cada cita (minutos). La app de gestión de horarios la guarda aquí. */
  appointmentDuration: {
    type: Number,
    min: 15,
    max: 480,
    default: 30,
  },
  maxAppointmentsPerDay: {
    type: Number,
    min: 1,
    max: 100,
    default: 20,
  },
  advanceBookingDays: {
    type: Number,
    min: 0,
    max: 365,
    default: 30,
  },
  
  // Metadatos
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Middleware para actualizar updatedAt
professionalAvailabilitySchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Índices para optimizar consultas
professionalAvailabilitySchema.index({ professionalId: 1 });
professionalAvailabilitySchema.index({ professionalId: 1, isActive: 1 });
professionalAvailabilitySchema.index({ 'specialDates.date': 1 });
professionalAvailabilitySchema.index({ 'blockedTimeSlots.date': 1 });

module.exports = mongoose.model('ProfessionalAvailability', professionalAvailabilitySchema);
