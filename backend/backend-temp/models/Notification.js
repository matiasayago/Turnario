const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  // Usuario destinatario
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Tipo de notificación
  type: {
    type: String,
    required: true,
    enum: [
      'booking_confirmation',
      'booking_cancellation',
      'booking_reminder',
      'payment_confirmation',
      'payment_failed',
      'review_received',
      'service_update',
      'system_announcement',
      'appointment_confirmation',
      'appointment_cancellation',
      'appointment_reminder',
      'medical_authorization_required',
      'medical_authorization_approved',
      'medical_authorization_rejected'
    ]
  },

  // Título de la notificación
  title: {
    type: String,
    required: true,
    maxlength: 200
  },

  // Mensaje de la notificación
  message: {
    type: String,
    required: true,
    maxlength: 1000
  },

  // Prioridad de la notificación
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },

  // Estado de la notificación
  status: {
    type: String,
    enum: ['unread', 'read', 'archived'],
    default: 'unread',
    index: true
  },

  // Datos adicionales específicos del tipo de notificación
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },

  // Referencias a otros modelos (opcional)
  relatedModel: {
    type: String,
    enum: ['Booking', 'Payment', 'Review', 'Service', 'Appointment', 'MedicalAuthorization']
  },

  relatedId: {
    type: mongoose.Schema.Types.ObjectId
  },

  // Configuración de envío
  sendEmail: {
    type: Boolean,
    default: true
  },

  sendPush: {
    type: Boolean,
    default: false
  },

  sendSMS: {
    type: Boolean,
    default: false
  },

  // Estado de envío
  emailSent: {
    type: Boolean,
    default: false
  },

  pushSent: {
    type: Boolean,
    default: false
  },

  smsSent: {
    type: Boolean,
    default: false
  },

  // Fechas de envío
  emailSentAt: Date,
  pushSentAt: Date,
  smsSentAt: Date,

  // Fecha de lectura
  readAt: Date,

  // Fecha de archivo
  archivedAt: Date,

  // Configuración de programación
  scheduledFor: Date,
  expiresAt: Date,

  // Metadatos
  metadata: {
    type: Map,
    of: String,
    default: new Map()
  }
}, {
  timestamps: true
});

// Índices para optimizar consultas
notificationSchema.index({ recipient: 1, status: 1, createdAt: -1 });
notificationSchema.index({ type: 1, createdAt: -1 });
notificationSchema.index({ priority: 1, createdAt: -1 });
notificationSchema.index({ scheduledFor: 1, status: 1 });
notificationSchema.index({ expiresAt: 1 });

// Métodos de instancia
notificationSchema.methods.markAsRead = function() {
  this.status = 'read';
  this.readAt = new Date();
  return this.save();
};

notificationSchema.methods.markAsArchived = function() {
  this.status = 'archived';
  this.archivedAt = new Date();
  return this.save();
};

notificationSchema.methods.markEmailSent = function() {
  this.emailSent = true;
  this.emailSentAt = new Date();
  return this.save();
};

notificationSchema.methods.markPushSent = function() {
  this.pushSent = true;
  this.pushSentAt = new Date();
  return this.save();
};

notificationSchema.methods.markSMSSent = function() {
  this.smsSent = true;
  this.smsSentAt = new Date();
  return this.save();
};

notificationSchema.methods.isExpired = function() {
  return this.expiresAt && this.expiresAt < new Date();
};

notificationSchema.methods.shouldSend = function() {
  if (!this.scheduledFor) return true;
  return this.scheduledFor <= new Date();
};

// Métodos estáticos
notificationSchema.statics.findUnreadByUser = function(userId) {
  return this.find({
    recipient: userId,
    status: 'unread'
  }).sort({ createdAt: -1 });
};

notificationSchema.statics.findByUser = function(userId, options = {}) {
  const { status, type, limit = 50, skip = 0 } = options;
  
  const query = { recipient: userId };
  if (status) query.status = status;
  if (type) query.type = type;

  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

notificationSchema.statics.markAllAsRead = function(userId) {
  return this.updateMany(
    { recipient: userId, status: 'unread' },
    { 
      status: 'read',
      readAt: new Date()
    }
  );
};

notificationSchema.statics.createBulk = function(notifications) {
  return this.insertMany(notifications);
};

notificationSchema.statics.findPendingEmail = function() {
  return this.find({
    sendEmail: true,
    emailSent: false,
    status: { $ne: 'archived' },
    $or: [
      { scheduledFor: { $exists: false } },
      { scheduledFor: { $lte: new Date() } }
    ],
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: { $gt: new Date() } }
    ]
  });
};

notificationSchema.statics.findPendingPush = function() {
  return this.find({
    sendPush: true,
    pushSent: false,
    status: { $ne: 'archived' },
    $or: [
      { scheduledFor: { $exists: false } },
      { scheduledFor: { $lte: new Date() } }
    ],
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: { $gt: new Date() } }
    ]
  });
};

notificationSchema.statics.findPendingSMS = function() {
  return this.find({
    sendSMS: true,
    smsSent: false,
    status: { $ne: 'archived' },
    $or: [
      { scheduledFor: { $exists: false } },
      { scheduledFor: { $lte: new Date() } }
    ],
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: { $gt: new Date() } }
    ]
  });
};

// Middleware pre-save
notificationSchema.pre('save', function(next) {
  // Si se marca como leída, establecer readAt
  if (this.isModified('status') && this.status === 'read' && !this.readAt) {
    this.readAt = new Date();
  }

  // Si se marca como archivada, establecer archivedAt
  if (this.isModified('status') && this.status === 'archived' && !this.archivedAt) {
    this.archivedAt = new Date();
  }

  next();
});

// Middleware pre-remove (soft delete)
notificationSchema.pre('remove', function(next) {
  // En lugar de eliminar, marcar como archivada
  this.status = 'archived';
  this.archivedAt = new Date();
  this.save().then(() => {
    next();
  }).catch(next);
});

module.exports = mongoose.model('Notification', notificationSchema);
