const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  // Información básica
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  professional: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  service: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: true
  },
  clinic: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Clinic'
  },

  // Detalles de la cita
  date: {
    type: Date,
    required: [true, 'La fecha es requerida'],
    validate: {
      validator: function(v) {
        return v > new Date();
      },
      message: 'La fecha de la cita debe ser en el futuro'
    }
  },
  startTime: {
    type: String,
    required: [true, 'La hora de inicio es requerida'],
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)']
  },
  endTime: {
    type: String,
    required: [true, 'La hora de fin es requerida'],
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)']
  },
  duration: {
    type: Number,
    required: [true, 'La duración es requerida'],
    min: [5, 'La duración mínima es 5 minutos'],
    max: [480, 'La duración máxima es 8 horas']
  },

  // Estado de la cita
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled'],
    default: 'pending',
    required: true
  },
  statusHistory: [{
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled'],
      required: true
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    changedAt: {
      type: Date,
      default: Date.now
    },
    reason: {
      type: String,
      trim: true,
      maxlength: [500, 'La razón no puede exceder 500 caracteres']
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Las notas no pueden exceder 1000 caracteres']
    }
  }],

  // Información de la sesión
  sessionInfo: {
    notes: {
      type: String,
      trim: true,
      maxlength: [2000, 'Las notas no pueden exceder 2000 caracteres']
    },
    symptoms: [{
      type: String,
      trim: true,
      maxlength: [200, 'Cada síntoma no puede exceder 200 caracteres']
    }],
    diagnosis: [{
      type: String,
      trim: true,
      maxlength: [200, 'Cada diagnóstico no puede exceder 200 caracteres']
    }],
    treatment: [{
      type: String,
      trim: true,
      maxlength: [200, 'Cada tratamiento no puede exceder 200 caracteres']
    }],
    recommendations: [{
      type: String,
      trim: true,
      maxlength: [200, 'Cada recomendación no puede exceder 200 caracteres']
    }],
    followUp: {
      required: {
        type: Boolean,
        default: false
      },
      date: Date,
      notes: {
        type: String,
        trim: true,
        maxlength: [500, 'Las notas de seguimiento no pueden exceder 500 caracteres']
      }
    }
  },

  // Información de pago
  payment: {
    amount: {
      type: Number,
      required: [true, 'El monto es requerido'],
      min: [0, 'El monto no puede ser negativo']
    },
    currency: {
      type: String,
      default: 'ARS',
      enum: ['ARS', 'USD', 'EUR', 'BRL', 'CLP', 'COP', 'MXN', 'PEN', 'UYU']
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'partially_paid', 'refunded', 'cancelled'],
      default: 'pending'
    },
    method: {
      type: String,
      enum: ['cash', 'credit_card', 'debit_card', 'transfer', 'digital_wallet', 'insurance', 'other'],
      default: 'cash'
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: [0, 'El monto pagado no puede ser negativo']
    },
    paidAt: Date,
    transactionId: {
      type: String,
      trim: true
    },
    insurance: {
      provider: {
        type: String,
        trim: true,
        maxlength: [100, 'El proveedor de seguro no puede exceder 100 caracteres']
      },
      policyNumber: {
        type: String,
        trim: true,
        maxlength: [50, 'El número de póliza no puede exceder 50 caracteres']
      },
      coverage: {
        type: Number,
        min: [0, 'La cobertura no puede ser negativa'],
        max: [100, 'La cobertura no puede exceder 100%']
      }
    }
  },

  // Calificación y reseña
  review: {
    rating: {
      type: Number,
      min: [1, 'La calificación mínima es 1'],
      max: [5, 'La calificación máxima es 5']
    },
    comment: {
      type: String,
      trim: true,
      maxlength: [1000, 'El comentario no puede exceder 1000 caracteres']
    },
    createdAt: Date,
    isPublic: {
      type: Boolean,
      default: true
    }
  },

  // Notificaciones
  notifications: {
    reminderSent: {
      type: Boolean,
      default: false
    },
    reminderSentAt: Date,
    confirmationSent: {
      type: Boolean,
      default: false
    },
    confirmationSentAt: Date,
    followUpSent: {
      type: Boolean,
      default: false
    },
    followUpSentAt: Date
  },

  // Metadatos
  tags: [{
    type: String,
    trim: true,
    maxlength: [30, 'Cada etiqueta no puede exceder 30 caracteres']
  }],
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  source: {
    type: String,
    enum: ['online', 'phone', 'in_person', 'referral', 'other'],
    default: 'online'
  },

  // Configuración de recordatorios
  reminders: {
    enabled: {
      type: Boolean,
      default: true
    },
    reminderTime: {
      type: Number,
      default: 24,
      min: [1, 'El tiempo de recordatorio mínimo es 1 hora'],
      max: [168, 'El tiempo de recordatorio máximo es 1 semana']
    },
    reminderSent: {
      type: Boolean,
      default: false
    },
    reminderSentAt: Date
  },

  // Estado y configuración
  isActive: {
    type: Boolean,
    default: true
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringPattern: {
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'yearly'],
      default: 'weekly'
    },
    interval: {
      type: Number,
      default: 1,
      min: [1, 'El intervalo debe ser al menos 1']
    },
    endDate: Date,
    maxOccurrences: {
      type: Number,
      min: [1, 'El máximo de ocurrencias debe ser al menos 1']
    }
  },

  // Soft delete
  deletedAt: Date
}, {
  timestamps: true
});

// Índices
appointmentSchema.index({ client: 1 });
appointmentSchema.index({ professional: 1 });
appointmentSchema.index({ service: 1 });
appointmentSchema.index({ clinic: 1 });
appointmentSchema.index({ date: 1 });
appointmentSchema.index({ status: 1 });
appointmentSchema.index({ 'payment.status': 1 });
appointmentSchema.index({ 'payment.method': 1 });
appointmentSchema.index({ createdAt: -1 });
appointmentSchema.index({ deletedAt: 1 });
appointmentSchema.index({ client: 1, date: 1 });
appointmentSchema.index({ professional: 1, date: 1 });
appointmentSchema.index({ date: 1, startTime: 1 });

// Virtuals
appointmentSchema.virtual('isOverdue').get(function() {
  if (this.status === 'completed' || this.status === 'cancelled') {
    return false;
  }
  const now = new Date();
  const appointmentDate = new Date(this.date);
  appointmentDate.setHours(parseInt(this.startTime.split(':')[0]));
  appointmentDate.setMinutes(parseInt(this.startTime.split(':')[1]));
  
  return now > appointmentDate;
});

appointmentSchema.virtual('isToday').get(function() {
  const today = new Date();
  const appointmentDate = new Date(this.date);
  return today.toDateString() === appointmentDate.toDateString();
});

appointmentSchema.virtual('isUpcoming').get(function() {
  if (this.status === 'completed' || this.status === 'cancelled') {
    return false;
  }
  const now = new Date();
  const appointmentDate = new Date(this.date);
  appointmentDate.setHours(parseInt(this.startTime.split(':')[0]));
  appointmentDate.setMinutes(parseInt(this.startTime.split(':')[1]));
  
  return appointmentDate > now;
});

appointmentSchema.virtual('formattedDate').get(function() {
  return this.date.toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
});

appointmentSchema.virtual('formattedTime').get(function() {
  return `${this.startTime} - ${this.endTime}`;
});

appointmentSchema.virtual('durationFormatted').get(function() {
  const hours = Math.floor(this.duration / 60);
  const minutes = this.duration % 60;
  
  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}min`;
  } else if (hours > 0) {
    return `${hours}h`;
  } else {
    return `${minutes}min`;
  }
});

appointmentSchema.virtual('paymentStatusFormatted').get(function() {
  const statusMap = {
    pending: 'Pendiente',
    paid: 'Pagado',
    partially_paid: 'Parcialmente pagado',
    refunded: 'Reembolsado',
    cancelled: 'Cancelado'
  };
  return statusMap[this.payment.status] || this.payment.status;
});

// Métodos de instancia
appointmentSchema.methods.updateStatus = function(newStatus, changedBy, reason = '', notes = '') {
  if (this.status === newStatus) {
    return this;
  }
  
  // Agregar al historial
  this.statusHistory.push({
    status: this.status,
    changedBy,
    changedAt: new Date(),
    reason: 'Estado anterior',
    notes: ''
  });
  
  // Actualizar estado actual
  this.status = newStatus;
  
  // Agregar nuevo estado al historial
  this.statusHistory.push({
    status: newStatus,
    changedBy,
    changedAt: new Date(),
    reason,
    notes
  });
  
  return this.save();
};

appointmentSchema.methods.confirm = function(confirmedBy, notes = '') {
  return this.updateStatus('confirmed', confirmedBy, 'Cita confirmada', notes);
};

appointmentSchema.methods.cancel = function(cancelledBy, reason = '', notes = '') {
  return this.updateStatus('cancelled', cancelledBy, reason, notes);
};

appointmentSchema.methods.complete = function(completedBy, notes = '') {
  return this.updateStatus('completed', completedBy, 'Cita completada', notes);
};

appointmentSchema.methods.markAsNoShow = function(markedBy, notes = '') {
  return this.updateStatus('no_show', markedBy, 'Cliente no se presentó', notes);
};

appointmentSchema.methods.reschedule = function(newDate, newStartTime, newEndTime, rescheduledBy, reason = '', notes = '') {
  // Agregar al historial
  this.statusHistory.push({
    status: this.status,
    changedBy: rescheduledBy,
    changedAt: new Date(),
    reason: 'Reprogramada',
    notes: `De: ${this.date.toDateString()} ${this.startTime}-${this.endTime}`
  });
  
  // Actualizar fecha y hora
  this.date = newDate;
  this.startTime = newStartTime;
  this.endTime = newEndTime;
  this.status = 'confirmed';
  
  // Agregar nuevo estado al historial
  this.statusHistory.push({
    status: 'confirmed',
    changedBy: rescheduledBy,
    changedAt: new Date(),
    reason: 'Reprogramada',
    notes: `A: ${newDate.toDateString()} ${newStartTime}-${newEndTime}. ${reason}`
  });
  
  return this.save();
};

appointmentSchema.methods.updatePayment = function(amount, method, transactionId = null) {
  this.payment.paidAmount = amount;
  this.payment.method = method;
  this.payment.transactionId = transactionId;
  this.payment.paidAt = new Date();
  
  if (amount >= this.payment.amount) {
    this.payment.status = 'paid';
  } else if (amount > 0) {
    this.payment.status = 'partially_paid';
  }
  
  return this.save();
};

appointmentSchema.methods.addReview = function(rating, comment, isPublic = true) {
  this.review = {
    rating,
    comment,
    createdAt: new Date(),
    isPublic
  };
  
  return this.save();
};

appointmentSchema.methods.softDelete = function() {
  this.deletedAt = new Date();
  this.isActive = false;
  return this.save();
};

appointmentSchema.methods.restore = function() {
  this.deletedAt = undefined;
  this.isActive = true;
  return this.save();
};

// Métodos estáticos
appointmentSchema.statics.findByClient = function(clientId) {
  return this.find({ 
    client: clientId, 
    isActive: true, 
    deletedAt: { $exists: false } 
  }).sort({ date: -1 });
};

appointmentSchema.statics.findByProfessional = function(professionalId) {
  return this.find({ 
    professional: professionalId, 
    isActive: true, 
    deletedAt: { $exists: false } 
  }).sort({ date: -1 });
};

appointmentSchema.statics.findByClinic = function(clinicId) {
  return this.find({ 
    clinic: clinicId, 
    isActive: true, 
    deletedAt: { $exists: false } 
  }).sort({ date: -1 });
};

appointmentSchema.statics.findByDateRange = function(startDate, endDate) {
  return this.find({ 
    date: { $gte: startDate, $lte: endDate }, 
    isActive: true, 
    deletedAt: { $exists: false } 
  }).sort({ date: 1, startTime: 1 });
};

appointmentSchema.statics.findByStatus = function(status) {
  return this.find({ 
    status, 
    isActive: true, 
    deletedAt: { $exists: false } 
  }).sort({ date: 1, startTime: 1 });
};

appointmentSchema.statics.findUpcoming = function() {
  const now = new Date();
  return this.find({ 
    date: { $gte: now }, 
    status: { $in: ['pending', 'confirmed'] }, 
    isActive: true, 
    deletedAt: { $exists: false } 
  }).sort({ date: 1, startTime: 1 });
};

appointmentSchema.statics.findOverdue = function() {
  const now = new Date();
  return this.find({ 
    date: { $lt: now }, 
    status: { $in: ['pending', 'confirmed'] }, 
    isActive: true, 
    deletedAt: { $exists: false } 
  }).sort({ date: 1, startTime: 1 });
};

appointmentSchema.statics.findByPaymentStatus = function(paymentStatus) {
  return this.find({ 
    'payment.status': paymentStatus, 
    isActive: true, 
    deletedAt: { $exists: false } 
  }).sort({ date: -1 });
};

// Middleware pre-save
appointmentSchema.pre('save', function(next) {
  // Validar que la fecha sea en el futuro
  if (this.date <= new Date()) {
    return next(new Error('La fecha de la cita debe ser en el futuro'));
  }
  
  // Validar que la hora de fin sea posterior a la de inicio
  const startMinutes = this.parseTime(this.startTime);
  const endMinutes = this.parseTime(this.endTime);
  
  if (endMinutes <= startMinutes) {
    return next(new Error('La hora de fin debe ser posterior a la de inicio'));
  }
  
  // Calcular duración automáticamente si no se proporciona
  if (!this.duration) {
    this.duration = endMinutes - startMinutes;
  }
  
  next();
});

// Middleware pre-find
appointmentSchema.pre(/^find/, function(next) {
  this.find({ deletedAt: { $exists: false } });
  next();
});

// Método helper para parsear tiempo
appointmentSchema.methods.parseTime = function(timeString) {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
};

// Configuración del esquema
appointmentSchema.set('toJSON', { virtuals: true });
appointmentSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Appointment', appointmentSchema);

