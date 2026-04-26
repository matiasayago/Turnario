const mongoose = require('mongoose');
const logger = require('../config/logger');

const appointmentSchema = new mongoose.Schema({
  // Información básica de la cita
  appointmentNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // Relaciones principales
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  professional: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  service: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: true
  },
  
  clinic: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Clinic',
    required: true
  },
  
  // Fecha y hora
  date: {
    type: Date,
    required: true,
    index: true
  },
  
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
  
  duration: {
    type: Number, // en minutos
    required: true,
    min: 15,
    max: 480 // 8 horas máximo
  },
  
  // Estado y tipo
  status: {
    type: String,
    enum: [
      'pending',      // Pendiente de confirmación
      'confirmed',    // Confirmada
      'in_progress',  // En progreso
      'completed',    // Completada
      'cancelled',    // Cancelada
      'no_show',      // No se presentó
      'rescheduled'   // Reprogramada
    ],
    default: 'pending',
    index: true
  },
  
  appointmentType: {
    type: String,
    enum: [
      'regular',      // Regular
      'urgent',       // Urgente
      'follow_up',    // Seguimiento
      'consultation', // Consulta
      'procedure',    // Procedimiento
      'emergency'     // Emergencia
    ],
    default: 'regular'
  },
  
  // Información del cliente
  clientNotes: {
    type: String,
    maxlength: 1000
  },
  
  clientSymptoms: {
    type: String,
    maxlength: 2000
  },
  
  clientAllergies: {
    type: String,
    maxlength: 500
  },
  
  clientMedications: {
    type: String,
    maxlength: 1000
  },
  
  // Información del profesional
  professionalNotes: {
    type: String,
    maxlength: 2000
  },
  
  diagnosis: {
    type: String,
    maxlength: 2000
  },
  
  treatment: {
    type: String,
    maxlength: 2000
  },
  
  prescription: {
    type: String,
    maxlength: 2000
  },
  
  // Información de pago
  paymentStatus: {
    type: String,
    enum: [
      'pending',      // Pendiente
      'partial',      // Parcial
      'paid',         // Pagado
      'refunded',     // Reembolsado
      'cancelled'     // Cancelado
    ],
    default: 'pending',
    index: true
  },
  
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  
  depositAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  
  paymentMethod: {
    type: String,
    enum: [
      'cash',         // Efectivo
      'card',         // Tarjeta
      'transfer',     // Transferencia
      'mercadopago',  // MercadoPago
      'other'         // Otro
    ]
  },
  
  paymentReference: {
    type: String
  },
  
  // Información de ubicación
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: true
    },
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      postalCode: String
    }
  },
  
  // Configuración de recordatorios
  reminders: {
    enabled: {
      type: Boolean,
      default: true
    },
    sent24h: {
      type: Boolean,
      default: false
    },
    sent1h: {
      type: Boolean,
      default: false
    },
    sent15min: {
      type: Boolean,
      default: false
    }
  },
  
  // Historial de cambios
  statusHistory: [{
    status: {
      type: String,
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
    reason: String,
    notes: String
  }],
  
  // Información de cancelación
  cancellation: {
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    cancelledAt: Date,
    reason: String,
    refundAmount: Number,
    refundProcessed: {
      type: Boolean,
      default: false
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
  
  // Archivos adjuntos
  attachments: [{
    filename: String,
    originalName: String,
    mimeType: String,
    size: Number,
    url: String,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    description: String
  }],
  
  // Calificación y reseña
  rating: {
    score: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: {
      type: String,
      maxlength: 1000
    },
    ratedAt: Date
  },
  
  // Configuración de privacidad
  isPrivate: {
    type: Boolean,
    default: false
  },
  
  // Metadatos
  tags: [String],
  
  // Configuración de notificaciones
  notifications: {
    email: {
      type: Boolean,
      default: true
    },
    sms: {
      type: Boolean,
      default: true
    },
    push: {
      type: Boolean,
      default: true
    }
  },
  
  // Información de auditoría
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Campos de soft delete
  isDeleted: {
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
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices compuestos para consultas eficientes
appointmentSchema.index({ professional: 1, date: 1, status: 1 });
appointmentSchema.index({ client: 1, date: 1, status: 1 });
appointmentSchema.index({ clinic: 1, date: 1, status: 1 });
appointmentSchema.index({ date: 1, startTime: 1, endTime: 1 });
appointmentSchema.index({ status: 1, paymentStatus: 1 });
appointmentSchema.index({ 'location.coordinates': '2dsphere' });

// Índice TTL para limpiar citas antiguas (opcional)
appointmentSchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 }); // 1 año

// Virtuals
appointmentSchema.virtual('isOverdue').get(function() {
  if (this.status === 'confirmed' || this.status === 'in_progress') {
    const now = new Date();
    const appointmentDateTime = new Date(this.date);
    const [hours, minutes] = this.startTime.split(':');
    appointmentDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
    return now > appointmentDateTime;
  }
  return false;
});

appointmentSchema.virtual('isToday').get(function() {
  const today = new Date();
  const appointmentDate = new Date(this.date);
  return today.toDateString() === appointmentDate.toDateString();
});

appointmentSchema.virtual('isUpcoming').get(function() {
  if (this.status === 'confirmed') {
    const now = new Date();
    const appointmentDateTime = new Date(this.date);
    const [hours, minutes] = this.startTime.split(':');
    appointmentDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
    return appointmentDateTime > now;
  }
  return false;
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

appointmentSchema.virtual('statusText').get(function() {
  const statusMap = {
    pending: 'Pendiente',
    confirmed: 'Confirmada',
    in_progress: 'En Progreso',
    completed: 'Completada',
    cancelled: 'Cancelada',
    no_show: 'No se Presentó',
    rescheduled: 'Reprogramada'
  };
  return statusMap[this.status] || this.status;
});

appointmentSchema.virtual('paymentStatusText').get(function() {
  const paymentStatusMap = {
    pending: 'Pendiente',
    partial: 'Parcial',
    paid: 'Pagado',
    refunded: 'Reembolsado',
    cancelled: 'Cancelado'
  };
  return paymentStatusMap[this.paymentStatus] || this.paymentStatus;
});

// Middleware pre-save
appointmentSchema.pre('save', async function(next) {
  try {
    // Generar número de cita si no existe
    if (!this.appointmentNumber) {
      this.appointmentNumber = await this.generateAppointmentNumber();
    }
    
    // Validar que la fecha no sea en el pasado
    if (this.date < new Date()) {
      throw new Error('No se puede crear una cita en el pasado');
    }
    
    // Validar que la hora de fin sea posterior a la de inicio
    if (this.startTime >= this.endTime) {
      throw new Error('La hora de fin debe ser posterior a la de inicio');
    }
    
    // Calcular duración si no se proporciona
    if (!this.duration) {
      this.duration = this.calculateDuration();
    }
    
    // Agregar al historial de estado si cambió
    if (this.isModified('status') && this.statusHistory.length > 0) {
      const lastStatus = this.statusHistory[this.statusHistory.length - 1];
      if (lastStatus.status !== this.status) {
        this.statusHistory.push({
          status: this.status,
          changedBy: this.lastModifiedBy || this.createdBy,
          changedAt: new Date(),
          reason: 'Cambio de estado'
        });
      }
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Middleware pre-validate
appointmentSchema.pre('validate', function(next) {
  // Validar que la duración sea consistente con las horas
  if (this.startTime && this.endTime) {
    const calculatedDuration = this.calculateDuration();
    if (this.duration && this.duration !== calculatedDuration) {
      this.duration = calculatedDuration;
    }
  }
  
  next();
});

// Métodos de instancia
appointmentSchema.methods.generateAppointmentNumber = async function() {
  const year = new Date().getFullYear();
  const count = await this.constructor.countDocuments({
    date: { $gte: new Date(year, 0, 1) }
  });
  
  return `TUR-${year}-${String(count + 1).padStart(6, '0')}`;
};

appointmentSchema.methods.calculateDuration = function() {
  if (!this.startTime || !this.endTime) return 0;
  
  const [startHour, startMinute] = this.startTime.split(':').map(Number);
  const [endHour, endMinute] = this.endTime.split(':').map(Number);
  
  const startMinutes = startHour * 60 + startMinute;
  const endMinutes = endHour * 60 + endMinute;
  
  return endMinutes - startMinutes;
};

appointmentSchema.methods.canBeCancelled = function() {
  const now = new Date();
  const appointmentDateTime = new Date(this.date);
  const [hours, minutes] = this.startTime.split(':');
  appointmentDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  
  // Solo se puede cancelar si faltan más de 2 horas
  const twoHoursBefore = new Date(appointmentDateTime.getTime() - 2 * 60 * 60 * 1000);
  
  return this.status === 'confirmed' && now < twoHoursBefore;
};

appointmentSchema.methods.canBeRescheduled = function() {
  const now = new Date();
  const appointmentDateTime = new Date(this.date);
  const [hours, minutes] = this.startTime.split(':');
  appointmentDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  
  // Solo se puede reprogramar si faltan más de 24 horas
  const oneDayBefore = new Date(appointmentDateTime.getTime() - 24 * 60 * 60 * 1000);
  
  return this.status === 'confirmed' && now < oneDayBefore;
};

appointmentSchema.methods.isConflicting = async function() {
  const conflictingAppointment = await this.constructor.findOne({
    _id: { $ne: this._id },
    professional: this.professional,
    date: this.date,
    status: { $in: ['confirmed', 'pending'] },
    $or: [
      {
        startTime: { $lt: this.endTime },
        endTime: { $gt: this.startTime }
      }
    ]
  });
  
  return !!conflictingAppointment;
};

appointmentSchema.methods.addAttachment = function(attachmentData) {
  this.attachments.push(attachmentData);
  return this.save();
};

appointmentSchema.methods.updateStatus = function(newStatus, userId, reason = '', notes = '') {
  this.status = newStatus;
  this.lastModifiedBy = userId;
  
  this.statusHistory.push({
    status: newStatus,
    changedBy: userId,
    changedAt: new Date(),
    reason,
    notes
  });
  
  return this.save();
};

appointmentSchema.methods.cancel = function(userId, reason = '') {
  this.status = 'cancelled';
  this.lastModifiedBy = userId;
  
  this.cancellation = {
    cancelledBy: userId,
    cancelledAt: new Date(),
    reason
  };
  
  this.statusHistory.push({
    status: 'cancelled',
    changedBy: userId,
    changedAt: new Date(),
    reason: 'Cancelación',
    notes: reason
  });
  
  return this.save();
};

appointmentSchema.methods.reschedule = function(newDate, newStartTime, newEndTime, userId, reason = '') {
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
  this.duration = this.calculateDuration();
  this.lastModifiedBy = userId;
  
  this.statusHistory.push({
    status: 'rescheduled',
    changedBy: userId,
    changedAt: new Date(),
    reason: 'Reprogramación',
    notes: reason
  });
  
  return this.save();
};

appointmentSchema.methods.complete = function(userId, diagnosis = '', treatment = '', prescription = '') {
  this.status = 'completed';
  this.lastModifiedBy = userId;
  
  if (diagnosis) this.diagnosis = diagnosis;
  if (treatment) this.treatment = treatment;
  if (prescription) this.prescription = prescription;
  
  this.statusHistory.push({
    status: 'completed',
    changedBy: userId,
    changedAt: new Date(),
    reason: 'Completada'
  });
  
  return this.save();
};

appointmentSchema.methods.markAsNoShow = function(userId, reason = '') {
  this.status = 'no_show';
  this.lastModifiedBy = userId;
  
  this.statusHistory.push({
    status: 'no_show',
    changedBy: userId,
    changedAt: new Date(),
    reason: 'No se presentó',
    notes: reason
  });
  
  return this.save();
};

appointmentSchema.methods.addRating = function(score, comment = '') {
  this.rating = {
    score,
    comment,
    ratedAt: new Date()
  };
  
  return this.save();
};

// Métodos estáticos
appointmentSchema.statics.findByProfessional = function(professionalId, filters = {}) {
  const query = { professional: professionalId, isDeleted: false };
  
  if (filters.status) query.status = filters.status;
  if (filters.dateFrom) query.date = { ...query.date, $gte: filters.dateFrom };
  if (filters.dateTo) query.date = { ...query.date, $lte: filters.dateTo };
  if (filters.paymentStatus) query.paymentStatus = filters.paymentStatus;
  
  return this.find(query)
    .populate('client', 'fullName email phone')
    .populate('service', 'name description price')
    .populate('clinic', 'name address')
    .sort({ date: 1, startTime: 1 });
};

appointmentSchema.statics.findByClient = function(clientId, filters = {}) {
  const query = { client: clientId, isDeleted: false };
  
  if (filters.status) query.status = filters.status;
  if (filters.dateFrom) query.date = { ...query.date, $gte: filters.dateFrom };
  if (filters.dateTo) query.date = { ...query.date, $lte: filters.dateTo };
  
  return this.find(query)
    .populate('professional', 'fullName email phone specialties')
    .populate('service', 'name description price')
    .populate('clinic', 'name address')
    .sort({ date: 1, startTime: 1 });
};

appointmentSchema.statics.findByClinic = function(clinicId, filters = {}) {
  const query = { clinic: clinicId, isDeleted: false };
  
  if (filters.status) query.status = filters.status;
  if (filters.dateFrom) query.date = { ...query.date, $gte: filters.dateFrom };
  if (filters.dateTo) query.date = { ...query.date, $lte: filters.dateTo };
  if (filters.professional) query.professional = filters.professional;
  
  return this.find(query)
    .populate('client', 'fullName email phone')
    .populate('professional', 'fullName email phone')
    .populate('service', 'name description price')
    .sort({ date: 1, startTime: 1 });
};

appointmentSchema.statics.findConflicting = function(professionalId, date, startTime, endTime, excludeId = null) {
  const query = {
    professional: professionalId,
    date: date,
    status: { $in: ['confirmed', 'pending'] },
    isDeleted: false
  };
  
  if (excludeId) {
    query._id = { $ne: excludeId };
  }
  
  return this.find({
    ...query,
    $or: [
      {
        startTime: { $lt: endTime },
        endTime: { $gt: startTime }
      }
    ]
  });
};

appointmentSchema.statics.getUpcomingAppointments = function(userId, userType, limit = 10) {
  const query = {
    isDeleted: false,
    date: { $gte: new Date() },
    status: { $in: ['confirmed', 'pending'] }
  };
  
  if (userType === 'professional') {
    query.professional = userId;
  } else if (userType === 'client') {
    query.client = userId;
  }
  
  return this.find(query)
    .populate('client', 'fullName email phone')
    .populate('professional', 'fullName email phone')
    .populate('service', 'name description price')
    .populate('clinic', 'name address')
    .sort({ date: 1, startTime: 1 })
    .limit(limit);
};

appointmentSchema.statics.getAppointmentStats = async function(filters = {}) {
  const matchStage = { isDeleted: false };
  
  if (filters.professional) matchStage.professional = filters.professional;
  if (filters.client) matchStage.client = filters.client;
  if (filters.clinic) matchStage.clinic = filters.clinic;
  if (filters.status) matchStage.status = filters.status;
  if (filters.dateFrom) matchStage.date = { ...matchStage.date, $gte: filters.dateFrom };
  if (filters.dateTo) matchStage.date = { ...matchStage.date, $lte: filters.dateTo };
  
  const stats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
        confirmed: { $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] } },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
        noShow: { $sum: { $cond: [{ $eq: ['$status', 'no_show'] }, 1, 0] } },
        paid: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, 1, 0] } },
        pendingPayment: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'pending'] }, 1, 0] } }
      }
    }
  ]);
  
  return stats[0] || {
    total: 0,
    totalAmount: 0,
    confirmed: 0,
    completed: 0,
    cancelled: 0,
    noShow: 0,
    paid: 0,
    pendingPayment: 0
  };
};

// Métodos de validación
appointmentSchema.methods.validateAppointment = function() {
  const errors = [];
  
  // Validar fecha
  if (this.date < new Date()) {
    errors.push('La fecha de la cita no puede ser en el pasado');
  }
  
  // Validar horas
  if (this.startTime >= this.endTime) {
    errors.push('La hora de fin debe ser posterior a la de inicio');
  }
  
  // Validar duración
  if (this.duration < 15) {
    errors.push('La duración mínima de una cita es 15 minutos');
  }
  
  if (this.duration > 480) {
    errors.push('La duración máxima de una cita es 8 horas');
  }
  
  // Validar monto
  if (this.amount < 0) {
    errors.push('El monto no puede ser negativo');
  }
  
  return errors;
};

// Métodos de negocio
appointmentSchema.methods.processPayment = function(paymentData) {
  // Implementar lógica de procesamiento de pago
  this.paymentStatus = paymentData.status;
  this.paymentMethod = paymentData.method;
  this.paymentReference = paymentData.reference;
  
  return this.save();
};

appointmentSchema.methods.sendReminders = function() {
  // Implementar lógica de envío de recordatorios
  const now = new Date();
  const appointmentDateTime = new Date(this.date);
  const [hours, minutes] = this.startTime.split(':');
  appointmentDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  
  const timeDiff = appointmentDateTime.getTime() - now.getTime();
  const hoursDiff = timeDiff / (1000 * 60 * 60);
  
  if (hoursDiff <= 24 && hoursDiff > 23 && !this.reminders.sent24h) {
    this.reminders.sent24h = true;
    // Enviar recordatorio de 24 horas
  } else if (hoursDiff <= 1 && hoursDiff > 0.75 && !this.reminders.sent1h) {
    this.reminders.sent1h = true;
    // Enviar recordatorio de 1 hora
  } else if (hoursDiff <= 0.25 && hoursDiff > 0 && !this.reminders.sent15min) {
    this.reminders.sent15min = true;
    // Enviar recordatorio de 15 minutos
  }
  
  return this.save();
};

// Métodos de limpieza
appointmentSchema.methods.softDelete = function(userId) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = userId;
  
  return this.save();
};

appointmentSchema.methods.restore = function() {
  this.isDeleted = false;
  this.deletedAt = undefined;
  this.deletedBy = undefined;
  
  return this.save();
};

// Métodos de exportación
appointmentSchema.methods.toPublicJSON = function() {
  const appointment = this.toObject();
  
  // Remover información sensible
  delete appointment.clientNotes;
  delete appointment.clientSymptoms;
  delete appointment.clientAllergies;
  delete appointment.clientMedications;
  delete appointment.professionalNotes;
  delete appointment.diagnosis;
  delete appointment.treatment;
  delete appointment.prescription;
  delete appointment.attachments;
  delete appointment.isDeleted;
  delete appointment.deletedAt;
  delete appointment.deletedBy;
  
  return appointment;
};

// Métodos de auditoría
appointmentSchema.methods.logAccess = function(userId, action, details = {}) {
  logger.logAppointment(action, this._id, this.professional, this.client, {
    ...details,
    appointmentNumber: this.appointmentNumber,
    date: this.date,
    status: this.status
  });
};

// Configuración del esquema
appointmentSchema.set('autoIndex', false);

module.exports = mongoose.model('Appointment', appointmentSchema);
