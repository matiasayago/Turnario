const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  // Usuario que escribe la reseña
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Servicio reseñado
  serviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: true,
    index: true
  },

  // Clínica reseñada
  clinicId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Clinic',
    required: true,
    index: true
  },

  // Reserva asociada a la reseña
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true,
    index: true
  },

  // Calificación general (1-5 estrellas)
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
    validate: {
      validator: Number.isInteger,
      message: 'La calificación debe ser un número entero'
    }
  },

  // Calificaciones específicas
  ratings: {
    service: {
      type: Number,
      min: 1,
      max: 5,
      validate: {
        validator: Number.isInteger,
        message: 'La calificación debe ser un número entero'
      }
    },
    staff: {
      type: Number,
      min: 1,
      max: 5,
      validate: {
        validator: Number.isInteger,
        message: 'La calificación debe ser un número entero'
      }
    },
    cleanliness: {
      type: Number,
      min: 1,
      max: 5,
      validate: {
        validator: Number.isInteger,
        message: 'La calificación debe ser un número entero'
      }
    },
    punctuality: {
      type: Number,
      min: 1,
      max: 5,
      validate: {
        validator: Number.isInteger,
        message: 'La calificación debe ser un número entero'
      }
    },
    value: {
      type: Number,
      min: 1,
      max: 5,
      validate: {
        validator: Number.isInteger,
        message: 'La calificación debe ser un número entero'
      }
    }
  },

  // Título de la reseña
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },

  // Contenido de la reseña
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },

  // Estado de la reseña
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'flagged'],
    default: 'pending',
    index: true
  },

  // Tipo de reseña
  type: {
    type: String,
    enum: ['verified', 'unverified', 'anonymous'],
    default: 'verified'
  },

  // Información de verificación
  verification: {
    verified: {
      type: Boolean,
      default: false
    },
    verifiedAt: Date,
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    verificationMethod: {
      type: String,
      enum: ['booking', 'email', 'phone', 'manual']
    }
  },

  // Información de moderación
  moderation: {
    moderated: {
      type: Boolean,
      default: false
    },
    moderatedAt: Date,
    moderatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    moderationNotes: String,
    moderationReason: {
      type: String,
      enum: [
        'inappropriate_content',
        'spam',
        'fake_review',
        'duplicate',
        'offensive_language',
        'irrelevant',
        'other'
      ]
    }
  },

  // Respuestas a la reseña
  replies: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    content: {
      type: String,
      required: true,
      maxlength: 1000
    },
    isOfficial: {
      type: Boolean,
      default: false
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: Date
  }],

  // Información de utilidad
  helpfulness: {
    helpful: {
      type: Number,
      default: 0,
      min: 0
    },
    notHelpful: {
      type: Number,
      default: 0,
      min: 0
    },
    helpfulVotes: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      isHelpful: Boolean,
      votedAt: {
        type: Date,
        default: Date.now
      }
    }]
  },

  // Información de reportes
  reports: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: {
      type: String,
      enum: [
        'inappropriate_content',
        'spam',
        'fake_review',
        'offensive_language',
        'irrelevant',
        'duplicate',
        'other'
      ]
    },
    description: String,
    reportedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'resolved'],
      default: 'pending'
    }
  }],

  // Etiquetas de la reseña
  tags: [{
    type: String,
    enum: [
      'excellent_service',
      'professional_staff',
      'clean_facility',
      'good_value',
      'convenient_location',
      'long_wait_time',
      'rude_staff',
      'dirty_facility',
      'expensive',
      'inconvenient_location',
      'recommended',
      'not_recommended'
    ]
  }],

  // Información de recomendación
  recommendation: {
    wouldRecommend: {
      type: Boolean,
      default: null
    },
    reason: String
  },

  // Información de experiencia
  experience: {
    waitTime: {
      type: Number, // en minutos
      min: 0
    },
    appointmentDuration: {
      type: Number, // en minutos
      min: 0
    },
    followUpRequired: {
      type: Boolean,
      default: false
    },
    followUpDate: Date
  },

  // Configuración de notificaciones
  notifications: {
    replyNotification: {
      type: Boolean,
      default: true
    },
    helpfulnessNotification: {
      type: Boolean,
      default: true
    },
    moderationNotification: {
      type: Boolean,
      default: true
    }
  },

  // Estado de notificaciones enviadas
  notificationsSent: {
    replyNotification: {
      type: Boolean,
      default: false
    },
    helpfulnessNotification: {
      type: Boolean,
      default: false
    },
    moderationNotification: {
      type: Boolean,
      default: false
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
reviewSchema.index({ userId: 1, createdAt: -1 });
reviewSchema.index({ serviceId: 1, createdAt: -1 });
reviewSchema.index({ clinicId: 1, createdAt: -1 });
reviewSchema.index({ bookingId: 1 });
reviewSchema.index({ status: 1, createdAt: -1 });
reviewSchema.index({ rating: -1, createdAt: -1 });
reviewSchema.index({ 'helpfulness.helpful': -1 });

// Métodos de instancia
reviewSchema.methods.approve = function(moderatedBy) {
  this.status = 'approved';
  this.moderation.moderated = true;
  this.moderation.moderatedAt = new Date();
  this.moderation.moderatedBy = moderatedBy;
  return this.save();
};

reviewSchema.methods.reject = function(moderatedBy, reason, notes = '') {
  this.status = 'rejected';
  this.moderation.moderated = true;
  this.moderation.moderatedAt = new Date();
  this.moderation.moderatedBy = moderatedBy;
  this.moderation.moderationReason = reason;
  this.moderation.moderationNotes = notes;
  return this.save();
};

reviewSchema.methods.flag = function() {
  this.status = 'flagged';
  return this.save();
};

reviewSchema.methods.addReply = function(userId, content, isOfficial = false) {
  this.replies.push({
    userId,
    content,
    isOfficial,
    createdAt: new Date()
  });
  return this.save();
};

reviewSchema.methods.voteHelpful = function(userId, isHelpful) {
  // Verificar si el usuario ya votó
  const existingVote = this.helpfulness.helpfulVotes.find(
    vote => vote.userId.toString() === userId.toString()
  );

  if (existingVote) {
    // Actualizar voto existente
    if (existingVote.isHelpful !== isHelpful) {
      if (existingVote.isHelpful) {
        this.helpfulness.helpful--;
      } else {
        this.helpfulness.notHelpful--;
      }
      
      existingVote.isHelpful = isHelpful;
      existingVote.votedAt = new Date();
      
      if (isHelpful) {
        this.helpfulness.helpful++;
      } else {
        this.helpfulness.notHelpful++;
      }
    }
  } else {
    // Agregar nuevo voto
    this.helpfulness.helpfulVotes.push({
      userId,
      isHelpful,
      votedAt: new Date()
    });
    
    if (isHelpful) {
      this.helpfulness.helpful++;
    } else {
      this.helpfulness.notHelpful++;
    }
  }
  
  return this.save();
};

reviewSchema.methods.report = function(userId, reason, description = '') {
  this.reports.push({
    userId,
    reason,
    description,
    reportedAt: new Date()
  });
  
  // Si hay muchos reportes, marcar como flagged
  if (this.reports.length >= 3) {
    this.status = 'flagged';
  }
  
  return this.save();
};

reviewSchema.methods.calculateAverageRating = function() {
  const ratings = [
    this.ratings.service,
    this.ratings.staff,
    this.ratings.cleanliness,
    this.ratings.punctuality,
    this.ratings.value
  ].filter(rating => rating !== undefined && rating !== null);
  
  if (ratings.length === 0) {
    return this.rating;
  }
  
  return Math.round(ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length);
};

reviewSchema.methods.getHelpfulnessScore = function() {
  const total = this.helpfulness.helpful + this.helpfulness.notHelpful;
  if (total === 0) return 0;
  return Math.round((this.helpfulness.helpful / total) * 100);
};

// Métodos estáticos
reviewSchema.statics.findByUser = function(userId, options = {}) {
  const { status, limit = 50, skip = 0, sort = { createdAt: -1 } } = options;
  
  const query = { userId, deleted: false };
  if (status) query.status = status;

  return this.find(query)
    .populate('serviceId', 'name description')
    .populate('clinicId', 'name address')
    .populate('bookingId', 'date startTime endTime')
    .sort(sort)
    .limit(limit)
    .skip(skip);
};

reviewSchema.statics.findByService = function(serviceId, options = {}) {
  const { status, rating, limit = 50, skip = 0, sort = { createdAt: -1 } } = options;
  
  const query = { serviceId, deleted: false };
  if (status) query.status = status;
  if (rating) query.rating = rating;

  return this.find(query)
    .populate('userId', 'firstName lastName avatar')
    .populate('clinicId', 'name address')
    .populate('bookingId', 'date startTime endTime')
    .sort(sort)
    .limit(limit)
    .skip(skip);
};

reviewSchema.statics.findByClinic = function(clinicId, options = {}) {
  const { status, rating, limit = 50, skip = 0, sort = { createdAt: -1 } } = options;
  
  const query = { clinicId, deleted: false };
  if (status) query.status = status;
  if (rating) query.rating = rating;

  return this.find(query)
    .populate('userId', 'firstName lastName avatar')
    .populate('serviceId', 'name description')
    .populate('bookingId', 'date startTime endTime')
    .sort(sort)
    .limit(limit)
    .skip(skip);
};

reviewSchema.statics.findPending = function() {
  return this.find({
    status: 'pending',
    deleted: false
  })
  .populate('userId', 'firstName lastName email')
  .populate('serviceId', 'name description')
  .populate('clinicId', 'name address')
  .sort({ createdAt: 1 });
};

reviewSchema.statics.findFlagged = function() {
  return this.find({
    status: 'flagged',
    deleted: false
  })
  .populate('userId', 'firstName lastName email')
  .populate('serviceId', 'name description')
  .populate('clinicId', 'name address')
  .sort({ createdAt: 1 });
};

reviewSchema.statics.findReported = function() {
  return this.find({
    'reports.status': 'pending',
    deleted: false
  })
  .populate('userId', 'firstName lastName email')
  .populate('serviceId', 'name description')
  .populate('clinicId', 'name address')
  .sort({ createdAt: 1 });
};

reviewSchema.statics.getAverageRating = function(serviceId = null, clinicId = null) {
  const match = { status: 'approved', deleted: false };
  if (serviceId) match.serviceId = serviceId;
  if (clinicId) match.clinicId = clinicId;

  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 },
        ratingDistribution: {
          $push: '$rating'
        }
      }
    }
  ]);
};

reviewSchema.statics.getRatingDistribution = function(serviceId = null, clinicId = null) {
  const match = { status: 'approved', deleted: false };
  if (serviceId) match.serviceId = serviceId;
  if (clinicId) match.clinicId = clinicId;

  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$rating',
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: -1 } }
  ]);
};

// Middleware pre-save
reviewSchema.pre('save', function(next) {
  // Calcular calificación promedio si no existe
  if (!this.rating && this.ratings) {
    this.rating = this.calculateAverageRating();
  }

  // Verificar si la reseña es verificada basada en la reserva
  if (this.bookingId && !this.verification.verified) {
    this.verification.verified = true;
    this.verification.verifiedAt = new Date();
    this.verification.verificationMethod = 'booking';
    this.type = 'verified';
  }

  next();
});

// Middleware pre-remove (soft delete)
reviewSchema.pre('remove', function(next) {
  this.deleted = true;
  this.deletedAt = new Date();
  this.save().then(() => {
    next();
  }).catch(next);
});

module.exports = mongoose.model('Review', reviewSchema);
