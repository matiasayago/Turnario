const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  // Usuario que realiza la reserva
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Servicio reservado
  serviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: true,
    index: true
  },

  // Clínica donde se realiza el servicio
  clinicId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Clinic',
    required: true,
    index: true
  },

  // Fecha de la reserva
  date: {
    type: Date,
    required: true,
    index: true
  },

  // Hora de inicio
  startTime: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
      },
      message: 'Formato de hora inválido (HH:MM)'
    }
  },

  // Hora de fin
  endTime: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
      },
      message: 'Formato de hora inválido (HH:MM)'
    }
  },

  // Estado de la reserva
  status: {
    type: String,
    enum: [
      'pending',
      'confirmed',
      'cancelled',
      'completed',
      'no_show',
      'rescheduled'
    ],
    default: 'pending',
    index: true
  },

  // Tipo de reserva
  bookingType: {
    type: String,
    enum: ['in_person', 'virtual', 'home_visit'],
    default: 'in_person'
  },

  // Notas del cliente
  clientNotes: {
    type: String,
    maxlength: 1000
  },

  // Notas del proveedor
  providerNotes: {
    type: String,
    maxlength: 1000
  },

  // Información de contacto de emergencia
  emergencyContact: {
    name: String,
    phone: String,
    relationship: String
  },

  // Información médica relevante
  medicalInfo: {
    allergies: [String],
    medications: [String],
    conditions: [String],
    specialNeeds: String
  },

  // Información de pago
  payment: {
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      default: 'USD',
      enum: ['USD', 'EUR', 'MXN', 'COP', 'ARS', 'CLP', 'PEN', 'BRL']
    },
    method: {
      type: String,
      enum: ['cash', 'card', 'transfer', 'insurance', 'pending']
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded', 'partial'],
      default: 'pending'
    },
    transactionId: String,
    paidAt: Date
  },

  // Información de cancelación
  cancellation: {
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    cancelledAt: Date,
    reason: String,
    refundAmount: Number,
    refundStatus: {
      type: String,
      enum: ['pending', 'processed', 'completed', 'failed'],
      default: 'pending'
    }
  },

  // Información de reprogramación
  rescheduleInfo: {
    originalDate: Date,
    originalTime: String,
    rescheduledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rescheduledAt: Date,
    reason: String
  },

  // Calificación y reseña
  rating: {
    type: Number,
    min: 1,
    max: 5,
    validate: {
      validator: Number.isInteger,
      message: 'La calificación debe ser un número entero'
    }
  },

  review: {
    type: String,
    maxlength: 1000
  },

  reviewDate: Date,

  // Configuración de recordatorios
  reminders: {
    email24h: {
      type: Boolean,
      default: true
    },
    email1h: {
      type: Boolean,
      default: true
    },
    sms24h: {
      type: Boolean,
      default: false
    },
    sms1h: {
      type: Boolean,
      default: false
    },
    push24h: {
      type: Boolean,
      default: true
    },
    push1h: {
      type: Boolean,
      default: true
    }
  },

  // Estado de recordatorios enviados
  remindersSent: {
    email24h: {
      type: Boolean,
      default: false
    },
    email1h: {
      type: Boolean,
      default: false
    },
    sms24h: {
      type: Boolean,
      default: false
    },
    sms1h: {
      type: Boolean,
      default: false
    },
    push24h: {
      type: Boolean,
      default: false
    },
    push1h: {
      type: Boolean,
      default: false
    }
  },

  // Información de verificación
  verification: {
    verified: {
      type: Boolean,
      default: false
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    verifiedAt: Date,
    verificationMethod: {
      type: String,
      enum: ['email', 'phone', 'document', 'manual']
    }
  },

  // Metadatos
  metadata: {
    type: Map,
    of: String,
    default: new Map()
  },

  // Soft delete
  deleted: {
    type: Boolean,
    default: false,
    index: true
  },

  deletedAt: Date,
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Índices para optimizar consultas
bookingSchema.index({ userId: 1, date: -1 });
bookingSchema.index({ serviceId: 1, date: 1 });
bookingSchema.index({ clinicId: 1, date: 1 });
bookingSchema.index({ status: 1, date: 1 });
bookingSchema.index({ 'payment.status': 1 });
bookingSchema.index({ date: 1, startTime: 1, endTime: 1 });

// Métodos de instancia
bookingSchema.methods.cancel = function(userId, reason = '') {
  this.status = 'cancelled';
  this.cancellation = {
    cancelledBy: userId,
    cancelledAt: new Date(),
    reason: reason
  };
  return this.save();
};

bookingSchema.methods.confirm = function() {
  this.status = 'confirmed';
  return this.save();
};

bookingSchema.methods.complete = function() {
  this.status = 'completed';
  return this.save();
};

bookingSchema.methods.markAsNoShow = function() {
  this.status = 'no_show';
  return this.save();
};

bookingSchema.methods.reschedule = function(newDate, newStartTime, newEndTime, userId, reason = '') {
  if (!this.rescheduleInfo) {
    this.rescheduleInfo = {};
  }
  
  this.rescheduleInfo.originalDate = this.date;
  this.rescheduleInfo.originalTime = `${this.startTime} - ${this.endTime}`;
  this.rescheduleInfo.rescheduledBy = userId;
  this.rescheduleInfo.rescheduledAt = new Date();
  this.rescheduleInfo.reason = reason;
  
  this.date = newDate;
  this.startTime = newStartTime;
  this.endTime = newEndTime;
  this.status = 'rescheduled';
  
  return this.save();
};

bookingSchema.methods.addRating = function(rating, review = '') {
  this.rating = rating;
  this.review = review;
  this.reviewDate = new Date();
  return this.save();
};

bookingSchema.methods.markPaymentPaid = function(transactionId = null) {
  this.payment.status = 'paid';
  this.payment.paidAt = new Date();
  if (transactionId) {
    this.payment.transactionId = transactionId;
  }
  return this.save();
};

bookingSchema.methods.markReminderSent = function(type) {
  if (this.remindersSent[type] !== undefined) {
    this.remindersSent[type] = true;
  }
  return this.save();
};

// Métodos estáticos
bookingSchema.statics.findByUser = function(userId, options = {}) {
  const { status, limit = 50, skip = 0, sort = { date: -1 } } = options;
  
  const query = { userId, deleted: false };
  if (status) query.status = status;

  return this.find(query)
    .populate('serviceId', 'name description price duration')
    .populate('clinicId', 'name address phone')
    .sort(sort)
    .limit(limit)
    .skip(skip);
};

bookingSchema.statics.findByService = function(serviceId, options = {}) {
  const { date, status, limit = 50, skip = 0 } = options;
  
  const query = { serviceId, deleted: false };
  if (date) query.date = date;
  if (status) query.status = status;

  return this.find(query)
    .populate('userId', 'firstName lastName email phone')
    .populate('clinicId', 'name address')
    .sort({ date: 1, startTime: 1 })
    .limit(limit)
    .skip(skip);
};

bookingSchema.statics.findByClinic = function(clinicId, options = {}) {
  const { date, status, limit = 50, skip = 0 } = options;
  
  const query = { clinicId, deleted: false };
  if (date) query.date = date;
  if (status) query.status = status;

  return this.find(query)
    .populate('userId', 'firstName lastName email phone')
    .populate('serviceId', 'name description price duration')
    .sort({ date: 1, startTime: 1 })
    .limit(limit)
    .skip(skip);
};

bookingSchema.statics.findConflicts = function(clinicId, date, startTime, endTime, excludeId = null) {
  const query = {
    clinicId,
    date,
    deleted: false,
    status: { $in: ['pending', 'confirmed'] },
    $or: [
      {
        startTime: { $lt: endTime },
        endTime: { $gt: startTime }
      }
    ]
  };

  if (excludeId) {
    query._id = { $ne: excludeId };
  }

  return this.find(query);
};

bookingSchema.statics.findUpcoming = function(userId, limit = 10) {
  return this.find({
    userId,
    date: { $gte: new Date() },
    status: { $in: ['pending', 'confirmed'] },
    deleted: false
  })
  .populate('serviceId', 'name description price duration')
  .populate('clinicId', 'name address phone')
  .sort({ date: 1, startTime: 1 })
  .limit(limit);
};

bookingSchema.statics.findPendingReminders = function() {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

  return this.find({
    deleted: false,
    status: { $in: ['pending', 'confirmed'] },
    $or: [
      {
        date: {
          $gte: tomorrow,
          $lt: new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000)
        },
        'reminders.email24h': true,
        'remindersSent.email24h': false
      },
      {
        date: {
          $gte: oneHourFromNow,
          $lt: new Date(oneHourFromNow.getTime() + 60 * 60 * 1000)
        },
        'reminders.email1h': true,
        'remindersSent.email1h': false
      }
    ]
  }).populate('userId', 'email firstName lastName');
};

// Middleware pre-save
bookingSchema.pre('save', function(next) {
  // Validar que la hora de fin sea posterior a la hora de inicio
  if (this.startTime && this.endTime) {
    const start = new Date(`2000-01-01T${this.startTime}:00`);
    const end = new Date(`2000-01-01T${this.endTime}:00`);
    
    if (end <= start) {
      return next(new Error('La hora de fin debe ser posterior a la hora de inicio'));
    }
  }

  // Si se marca como pagado, establecer paidAt
  if (this.isModified('payment.status') && this.payment.status === 'paid' && !this.payment.paidAt) {
    this.payment.paidAt = new Date();
  }

  next();
});

// Middleware pre-remove (soft delete)
bookingSchema.pre('remove', function(next) {
  this.deleted = true;
  this.deletedAt = new Date();
  this.save().then(() => {
    next();
  }).catch(next);
});

module.exports = mongoose.model('Booking', bookingSchema);
