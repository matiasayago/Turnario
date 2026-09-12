const mongoose = require('mongoose');

const blockedTimeSlotSchema = new mongoose.Schema({
  timeSlot: {
    type: String,
    required: true
  },
  appointmentId: {
    type: String,
    required: true
  },
  reason: {
    type: String,
    default: 'Appointment booked'
  }
}, {
  timestamps: true
});

const professionalAvailabilitySchema = new mongoose.Schema({
  professionalId: {
    type: String,
    required: true,
    unique: true
  },
  professionalName: {
    type: String,
    required: true,
    trim: true
  },
  daysOfWeek: {
    monday: {
      type: Boolean,
      default: true
    },
    tuesday: {
      type: Boolean,
      default: true
    },
    wednesday: {
      type: Boolean,
      default: true
    },
    thursday: {
      type: Boolean,
      default: true
    },
    friday: {
      type: Boolean,
      default: true
    },
    saturday: {
      type: Boolean,
      default: false
    },
    sunday: {
      type: Boolean,
      default: false
    }
  },
  timeSlots: [{
    type: String,
    trim: true
  }],
  workingHours: {
    start: {
      type: String,
      required: true,
      default: '09:00'
    },
    end: {
      type: String,
      required: true,
      default: '18:00'
    }
  },
  breakTime: {
    start: String,
    end: String
  },
  defaultTimeRanges: [{
    start: {
      type: String,
      required: true
    },
    end: {
      type: String,
      required: true
    }
  }],
  appointmentDuration: {
    type: Number,
    default: 30,
    min: 15,
    max: 180
  },
  maxAppointmentsPerDay: {
    type: Number,
    default: 20,
    min: 1,
    max: 100
  },
  advanceBookingDays: {
    type: Number,
    default: 30,
    min: 0,
    max: 365
  },
  replicateScopeWeeks: {
    type: Number,
    default: 8,
    min: 1,
    max: 52
  },
  overwriteDatesWithSchedule: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  blockedTimeSlots: [blockedTimeSlotSchema]
}, {
  timestamps: true
});

// Índices para optimizar consultas
professionalAvailabilitySchema.index({ professionalId: 1 });
professionalAvailabilitySchema.index({ isActive: 1 });

module.exports = mongoose.model('ProfessionalAvailability', professionalAvailabilitySchema);
