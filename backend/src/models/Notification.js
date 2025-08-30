const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  // Información básica
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  type: {
    type: String,
    enum: [
      // Citas y reservas
      'appointment_confirmation',
      'appointment_reminder',
      'appointment_cancellation',
      'appointment_reschedule',
      'appointment_completion',
      'appointment_followup',
      
      // Pagos
      'payment_confirmation',
      'payment_reminder',
      'payment_failed',
      'refund_processed',
      
      // Sistema
      'welcome',
      'account_verification',
      'password_reset',
      'profile_update',
      'security_alert',
      
      // Negocio
      'service_update',
      'clinic_update',
      'promotion',
      'newsletter',
      'maintenance',
      
      // Comunicación
      'message_received',
      'review_request',
      'feedback_request',
      'survey_invitation',
      
      // Otros
      'custom',
      'system_alert',
      'maintenance_notice'
    ],
    required: true
  },
  category: {
    type: String,
    enum: ['appointment', 'payment', 'system', 'business', 'communication', 'other'],
    required: true
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },

  // Contenido
  title: {
    type: String,
    required: [true, 'El título es requerido'],
    trim: true,
    maxlength: [200, 'El título no puede exceder 200 caracteres']
  },
  message: {
    type: String,
    required: [true, 'El mensaje es requerido'],
    trim: true,
    maxlength: [1000, 'El mensaje no puede exceder 1000 caracteres']
  },
  shortMessage: {
    type: String,
    trim: true,
    maxlength: [200, 'El mensaje corto no puede exceder 200 caracteres']
  },

  // Datos relacionados
  relatedData: {
    appointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment'
    },
    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service'
    },
    clinic: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clinic'
    },
    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment'
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    customData: mongoose.Schema.Types.Mixed
  },

  // Configuración de entrega
  delivery: {
    channels: [{
      type: String,
      enum: ['in_app', 'email', 'sms', 'push', 'webhook'],
      default: 'in_app'
    }],
    scheduledFor: Date,
    expiresAt: Date,
    retryCount: {
      type: Number,
      default: 0,
      max: [5, 'El máximo de reintentos es 5']
    },
    maxRetries: {
      type: Number,
      default: 3,
      min: [1, 'El mínimo de reintentos es 1'],
      max: [10, 'El máximo de reintentos es 10']
    }
  },

  // Estado de entrega
  deliveryStatus: {
    in_app: {
      sent: {
        type: Boolean,
        default: false
      },
      sentAt: Date,
      read: {
        type: Boolean,
        default: false
      },
      readAt: Date
    },
    email: {
      sent: {
        type: Boolean,
        default: false
      },
      sentAt: Date,
      delivered: {
        type: Boolean,
        default: false
      },
      deliveredAt: Date,
      opened: {
        type: Boolean,
        default: false
      },
      openedAt: Date,
      clicked: {
        type: Boolean,
        default: false
      },
      clickedAt: Date
    },
    sms: {
      sent: {
        type: Boolean,
        default: false
      },
      sentAt: Date,
      delivered: {
        type: Boolean,
        default: false
      },
      deliveredAt: Date
    },
    push: {
      sent: {
        type: Boolean,
        default: false
      },
      sentAt: Date,
      delivered: {
        type: Boolean,
        default: false
      },
      deliveredAt: Date,
      opened: {
        type: Boolean,
        default: false
      },
      openedAt: Date
    }
  },

  // Acciones
  actions: [{
    label: {
      type: String,
      required: true,
      trim: true,
      maxlength: [50, 'La etiqueta de la acción no puede exceder 50 caracteres']
    },
    action: {
      type: String,
      required: true,
      trim: true,
      maxlength: [100, 'La acción no puede exceder 100 caracteres']
    },
    url: {
      type: String,
      trim: true,
      maxlength: [500, 'La URL no puede exceder 500 caracteres']
    },
    method: {
      type: String,
      enum: ['GET', 'POST', 'PUT', 'DELETE'],
      default: 'GET'
    },
    data: mongoose.Schema.Types.Mixed,
    isPrimary: {
      type: Boolean,
      default: false
    }
  }],

  // Metadatos
  metadata: {
    tags: [{
      type: String,
      trim: true,
      maxlength: [30, 'Cada etiqueta no puede exceder 30 caracteres']
    }],
    source: {
      type: String,
      enum: ['system', 'user', 'api', 'webhook', 'scheduled'],
      default: 'system'
    },
    campaign: {
      type: String,
      trim: true,
      maxlength: [100, 'El nombre de la campaña no puede exceder 100 caracteres']
    },
    template: {
      type: String,
      trim: true,
      maxlength: [100, 'El nombre de la plantilla no puede exceder 100 caracteres']
    },
    language: {
      type: String,
      default: 'es',
      enum: ['es', 'en', 'pt', 'fr', 'de']
    },
    timezone: {
      type: String,
      default: 'America/Argentina/Buenos_Aires'
    }
  },

  // Configuración de interacción
  interaction: {
    requiresAction: {
      type: Boolean,
      default: false
    },
    actionRequiredBy: Date,
    isDismissible: {
      type: Boolean,
      default: true
    },
    autoDismissAfter: {
      type: Number,
      default: 0,
      min: [0, 'El tiempo de auto-descarte no puede ser negativo']
    },
    allowReply: {
      type: Boolean,
      default: false
    },
    allowForward: {
      type: Boolean,
      default: false
    }
  },

  // Estado y configuración
  status: {
    isActive: {
      type: Boolean,
      default: true
    },
    isRead: {
      type: Boolean,
      default: false
    },
    isArchived: {
      type: Boolean,
      default: false
    },
    isDeleted: {
      type: Boolean,
      default: false
    }
  },

  // Estadísticas
  stats: {
    openCount: {
      type: Number,
      default: 0
    },
    clickCount: {
      type: Number,
      default: 0
    },
    replyCount: {
      type: Number,
      default: 0
    },
    forwardCount: {
      type: Number,
      default: 0
    },
    lastInteraction: Date
  },

  // Soft delete
  deletedAt: Date
}, {
  timestamps: true
});

// Índices
notificationSchema.index({ recipient: 1 });
notificationSchema.index({ sender: 1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ category: 1 });
notificationSchema.index({ priority: 1 });
notificationSchema.index({ 'status.isRead': 1 });
notificationSchema.index({ 'status.isActive': 1 });
notificationSchema.index({ 'delivery.scheduledFor': 1 });
notificationSchema.index({ 'delivery.expiresAt': 1 });
notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ deletedAt: 1 });
notificationSchema.index({ recipient: 1, 'status.isRead': 1 });
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ type: 1, createdAt: -1 });

// Virtuals
notificationSchema.virtual('isExpired').get(function() {
  if (!this.delivery.expiresAt) return false;
  return new Date() > this.delivery.expiresAt;
});

notificationSchema.virtual('isScheduled').get(function() {
  return this.delivery.scheduledFor && new Date() < this.delivery.scheduledFor;
});

notificationSchema.virtual('isDelivered').get(function() {
  const channels = Object.keys(this.deliveryStatus);
  return channels.some(channel => this.deliveryStatus[channel].sent);
});

notificationSchema.virtual('isRead').get(function() {
  return this.status.isRead || this.deliveryStatus.in_app.read;
});

notificationSchema.virtual('deliveryProgress').get(function() {
  const channels = Object.keys(this.deliveryStatus);
  const totalChannels = channels.length;
  const deliveredChannels = channels.filter(channel => 
    this.deliveryStatus[channel].sent
  ).length;
  
  return totalChannels > 0 ? (deliveredChannels / totalChannels) * 100 : 0;
});

notificationSchema.virtual('timeUntilExpiry').get(function() {
  if (!this.delivery.expiresAt) return null;
  const now = new Date();
  const expiry = new Date(this.delivery.expiresAt);
  const diff = expiry - now;
  
  if (diff <= 0) return 0;
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
});

// Métodos de instancia
notificationSchema.methods.markAsRead = function() {
  this.status.isRead = true;
  this.deliveryStatus.in_app.read = true;
  this.deliveryStatus.in_app.readAt = new Date();
  this.stats.lastInteraction = new Date();
  return this.save();
};

notificationSchema.methods.markAsUnread = function() {
  this.status.isRead = false;
  this.deliveryStatus.in_app.read = false;
  this.deliveryStatus.in_app.readAt = undefined;
  return this.save();
};

notificationSchema.methods.archive = function() {
  this.status.isArchived = true;
  return this.save();
};

notificationSchema.methods.unarchive = function() {
  this.status.isArchived = false;
  return this.save();
};

notificationSchema.methods.markAsDelivered = function(channel) {
  if (this.deliveryStatus[channel]) {
    this.deliveryStatus[channel].sent = true;
    this.deliveryStatus[channel].sentAt = new Date();
  }
  return this.save();
};

notificationSchema.methods.markAsOpened = function(channel) {
  if (this.deliveryStatus[channel]) {
    this.deliveryStatus[channel].opened = true;
    this.deliveryStatus[channel].openedAt = new Date();
    this.stats.openCount += 1;
    this.stats.lastInteraction = new Date();
  }
  return this.save();
};

notificationSchema.methods.markAsClicked = function(channel) {
  if (this.deliveryStatus[channel]) {
    this.deliveryStatus[channel].clicked = true;
    this.deliveryStatus[channel].clickedAt = new Date();
    this.stats.clickCount += 1;
    this.stats.lastInteraction = new Date();
  }
  return this.save();
};

notificationSchema.methods.incrementRetryCount = function() {
  this.delivery.retryCount += 1;
  return this.save();
};

notificationSchema.methods.resetRetryCount = function() {
  this.delivery.retryCount = 0;
  return this.save();
};

notificationSchema.methods.canRetry = function() {
  return this.delivery.retryCount < this.delivery.maxRetries;
};

notificationSchema.methods.softDelete = function() {
  this.deletedAt = new Date();
  this.status.isDeleted = true;
  this.status.isActive = false;
  return this.save();
};

notificationSchema.methods.restore = function() {
  this.deletedAt = undefined;
  this.status.isDeleted = false;
  this.status.isActive = true;
  return this.save();
};

// Métodos estáticos
notificationSchema.statics.findByRecipient = function(recipientId) {
  return this.find({ 
    recipient: recipientId, 
    'status.isDeleted': false 
  }).sort({ createdAt: -1 });
};

notificationSchema.statics.findUnreadByRecipient = function(recipientId) {
  return this.find({ 
    recipient: recipientId, 
    'status.isRead': false, 
    'status.isDeleted': false 
  }).sort({ createdAt: -1 });
};

notificationSchema.statics.findByType = function(type) {
  return this.find({ 
    type, 
    'status.isActive': true, 
    'status.isDeleted': false 
  }).sort({ createdAt: -1 });
};

notificationSchema.statics.findByCategory = function(category) {
  return this.find({ 
    category, 
    'status.isActive': true, 
    'status.isDeleted': false 
  }).sort({ createdAt: -1 });
};

notificationSchema.statics.findScheduled = function() {
  const now = new Date();
  return this.find({ 
    'delivery.scheduledFor': { $lte: now }, 
    'status.isActive': true, 
    'status.isDeleted': false 
  });
};

notificationSchema.statics.findExpired = function() {
  const now = new Date();
  return this.find({ 
    'delivery.expiresAt': { $lt: now }, 
    'status.isActive': true, 
    'status.isDeleted': false 
  });
};

notificationSchema.statics.findByPriority = function(priority) {
  return this.find({ 
    priority, 
    'status.isActive': true, 
    'status.isDeleted': false 
  }).sort({ createdAt: -1 });
};

notificationSchema.statics.findFailedDeliveries = function() {
  return this.find({ 
    'delivery.retryCount': { $gte: '$delivery.maxRetries' }, 
    'status.isActive': true, 
    'status.isDeleted': false 
  });
};

notificationSchema.statics.createBulk = function(notifications) {
  return this.insertMany(notifications);
};

notificationSchema.statics.markMultipleAsRead = function(notificationIds, recipientId) {
  return this.updateMany(
    { 
      _id: { $in: notificationIds }, 
      recipient: recipientId 
    },
    { 
      'status.isRead': true,
      'deliveryStatus.in_app.read': true,
      'deliveryStatus.in_app.readAt': new Date()
    }
  );
};

// Middleware pre-save
notificationSchema.pre('save', function(next) {
  // Validar que al menos un canal de entrega esté configurado
  if (!this.delivery.channels || this.delivery.channels.length === 0) {
    this.delivery.channels = ['in_app'];
  }
  
  // Validar que el tiempo de expiración sea en el futuro si se especifica
  if (this.delivery.expiresAt && this.delivery.expiresAt <= new Date()) {
    return next(new Error('La fecha de expiración debe ser en el futuro'));
  }
  
  // Validar que la fecha programada sea en el futuro si se especifica
  if (this.delivery.scheduledFor && this.delivery.scheduledFor <= new Date()) {
    return next(new Error('La fecha programada debe ser en el futuro'));
  }
  
  // Establecer fecha de expiración por defecto si no se especifica
  if (!this.delivery.expiresAt) {
    const defaultExpiry = new Date();
    defaultExpiry.setDate(defaultExpiry.getDate() + 30); // 30 días por defecto
    this.delivery.expiresAt = defaultExpiry;
  }
  
  next();
});

// Middleware pre-find
notificationSchema.pre(/^find/, function(next) {
  this.find({ 'status.isDeleted': false });
  next();
});

// Configuración del esquema
notificationSchema.set('toJSON', { virtuals: true });
notificationSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Notification', notificationSchema);
