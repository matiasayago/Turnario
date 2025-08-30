const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  // Información básica
  name: {
    type: String,
    required: [true, 'El nombre del servicio es requerido'],
    trim: true,
    maxlength: [100, 'El nombre no puede exceder 100 caracteres']
  },
  businessType: {
    type: String,
    enum: ['medical', 'beauty', 'fitness', 'education', 'consulting', 'repair', 'cleaning', 'transport', 'food', 'retail', 'other'],
    required: true,
    default: 'other'
  },
  category: {
    type: String,
    required: [true, 'La categoría es requerida'],
    trim: true,
    maxlength: [50, 'La categoría no puede exceder 50 caracteres']
  },
  subcategory: {
    type: String,
    trim: true,
    maxlength: [50, 'La subcategoría no puede exceder 50 caracteres']
  },
  description: {
    type: String,
    required: [true, 'La descripción es requerida'],
    trim: true,
    maxlength: [1000, 'La descripción no puede exceder 1000 caracteres']
  },
  shortDescription: {
    type: String,
    trim: true,
    maxlength: [200, 'La descripción corta no puede exceder 200 caracteres']
  },

  // Detalles del servicio
  duration: {
    type: Number,
    required: [true, 'La duración es requerida'],
    min: [5, 'La duración mínima es 5 minutos'],
    max: [480, 'La duración máxima es 8 horas']
  },
  price: {
    amount: {
      type: Number,
      required: [true, 'El precio es requerido'],
      min: [0, 'El precio no puede ser negativo']
    },
    currency: {
      type: String,
      default: 'ARS',
      enum: ['ARS', 'USD', 'EUR', 'BRL', 'CLP', 'COP', 'MXN', 'PEN', 'UYU']
    },
    originalAmount: {
      type: Number,
      min: [0, 'El precio original no puede ser negativo']
    },
    discountPercentage: {
      type: Number,
      default: 0,
      min: [0, 'El porcentaje de descuento no puede ser negativo'],
      max: [100, 'El porcentaje de descuento no puede exceder 100%']
    },
    isNegotiable: {
      type: Boolean,
      default: false
    }
  },

  // Configuración de disponibilidad
  availability: {
    isActive: {
      type: Boolean,
      default: true
    },
    maxBookingsPerDay: {
      type: Number,
      default: 10,
      min: [1, 'El máximo de reservas por día debe ser al menos 1']
    },
    maxAdvanceBooking: {
      type: Number,
      default: 30,
      min: [1, 'La reserva anticipada mínima es 1 día'],
      max: [365, 'La reserva anticipada máxima es 1 año']
    },
    minNotice: {
      type: Number,
      default: 2,
      min: [0, 'El aviso mínimo no puede ser negativo'],
      max: [168, 'El aviso máximo no puede exceder 1 semana']
    },
    cancellationPolicy: {
      type: String,
      enum: ['flexible', 'moderate', 'strict'],
      default: 'moderate'
    },
    cancellationNotice: {
      type: Number,
      default: 24,
      min: [0, 'El aviso de cancelación no puede ser negativo'],
      max: [168, 'El aviso de cancelación no puede exceder 1 semana']
    }
  },

  // Requisitos y preparación
  requirements: {
    prerequisites: [{
      type: String,
      trim: true,
      maxlength: [200, 'Cada requisito previo no puede exceder 200 caracteres']
    }],
    preparation: [{
      type: String,
      trim: true,
      maxlength: [200, 'Cada instrucción de preparación no puede exceder 200 caracteres']
    }],
    whatToBring: [{
      type: String,
      trim: true,
      maxlength: [200, 'Cada elemento a traer no puede exceder 200 caracteres']
    }],
    restrictions: [{
      type: String,
      trim: true,
      maxlength: [200, 'Cada restricción no puede exceder 200 caracteres']
    }],
    ageRestrictions: {
      minAge: {
        type: Number,
        min: [0, 'La edad mínima no puede ser negativa']
      },
      maxAge: {
        type: Number,
        min: [0, 'La edad máxima no puede ser negativa']
      }
    }
  },

  // Información del profesional
  professional: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  clinic: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Clinic'
  },
  qualifications: [{
    type: String,
    trim: true,
    maxlength: [100, 'Cada calificación no puede exceder 100 caracteres']
  }],
  experience: {
    type: Number,
    min: [0, 'La experiencia no puede ser negativa'],
    max: [50, 'La experiencia no puede exceder 50 años']
  },

  // Horarios disponibles
  schedule: {
    monday: {
      isAvailable: {
        type: Boolean,
        default: true
      },
      timeSlots: [{
        startTime: {
          type: String,
          match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)']
        },
        endTime: {
          type: String,
          match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)']
        },
        maxBookings: {
          type: Number,
          default: 1,
          min: [1, 'El máximo de reservas debe ser al menos 1']
        }
      }]
    },
    tuesday: {
      isAvailable: {
        type: Boolean,
        default: true
      },
      timeSlots: [{
        startTime: {
          type: String,
          match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)']
        },
        endTime: {
          type: String,
          match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)']
        },
        maxBookings: {
          type: Number,
          default: 1,
          min: [1, 'El máximo de reservas debe ser al menos 1']
        }
      }]
    },
    wednesday: {
      isAvailable: {
        type: Boolean,
        default: true
      },
      timeSlots: [{
        startTime: {
          type: String,
          match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)']
        },
        endTime: {
          type: String,
          match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)']
        },
        maxBookings: {
          type: Number,
          default: 1,
          min: [1, 'El máximo de reservas debe ser al menos 1']
        }
      }]
    },
    thursday: {
      isAvailable: {
        type: Boolean,
        default: true
      },
      timeSlots: [{
        startTime: {
          type: String,
          match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)']
        },
        endTime: {
          type: String,
          match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)']
        },
        maxBookings: {
          type: Number,
          default: 1,
          min: [1, 'El máximo de reservas debe ser al menos 1']
        }
      }]
    },
    friday: {
      isAvailable: {
        type: Boolean,
        default: true
      },
      timeSlots: [{
        startTime: {
          type: String,
          match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)']
        },
        endTime: {
          type: String,
          match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)']
        },
        maxBookings: {
          type: Number,
          default: 1,
          min: [1, 'El máximo de reservas debe ser al menos 1']
        }
      }]
    },
    saturday: {
      isAvailable: {
        type: Boolean,
        default: false
      },
      timeSlots: [{
        startTime: {
          type: String,
          match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)']
        },
        endTime: {
          type: String,
          match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)']
        },
        maxBookings: {
          type: Number,
          default: 1,
          min: [1, 'El máximo de reservas debe ser al menos 1']
        }
      }]
    },
    sunday: {
      isAvailable: {
        type: Boolean,
        default: false
      },
      timeSlots: [{
        startTime: {
          type: String,
          match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)']
        },
        endTime: {
          type: String,
          match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)']
        },
        maxBookings: {
          type: Number,
          default: 1,
          min: [1, 'El máximo de reservas debe ser al menos 1']
        }
      }]
    }
  },

  // Imágenes y multimedia
  images: [{
    url: {
      type: String,
      required: true,
      trim: true
    },
    alt: {
      type: String,
      trim: true,
      maxlength: [100, 'El texto alternativo no puede exceder 100 caracteres']
    },
    isPrimary: {
      type: Boolean,
      default: false
    },
    caption: {
      type: String,
      trim: true,
      maxlength: [200, 'La descripción no puede exceder 200 caracteres']
    }
  }],

  // Calificaciones y reseñas
  ratings: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    total: {
      type: Number,
      default: 0
    },
    distribution: {
      1: { type: Number, default: 0 },
      2: { type: Number, default: 0 },
      3: { type: Number, default: 0 },
      4: { type: Number, default: 0 },
      5: { type: Number, default: 0 }
    }
  },

  // Información adicional
  tags: [{
    type: String,
    trim: true,
    maxlength: [30, 'Cada etiqueta no puede exceder 30 caracteres']
  }],
  keywords: [{
    type: String,
    trim: true,
    maxlength: [50, 'Cada palabra clave no puede exceder 50 caracteres']
  }],
  features: [{
    type: String,
    trim: true,
    maxlength: [100, 'Cada característica no puede exceder 100 caracteres']
  }],

  // Configuración de notificaciones
  notifications: {
    reminderEnabled: {
      type: Boolean,
      default: true
    },
    reminderTime: {
      type: Number,
      default: 24,
      min: [1, 'El tiempo de recordatorio mínimo es 1 hora'],
      max: [168, 'El tiempo de recordatorio máximo es 1 semana']
    },
    followUpEnabled: {
      type: Boolean,
      default: false
    },
    followUpDays: {
      type: Number,
      default: 7,
      min: [1, 'Los días de seguimiento mínimo son 1'],
      max: [90, 'Los días de seguimiento máximo son 90']
    }
  },

  // Estado y configuración
  status: {
    isActive: {
      type: Boolean,
      default: true
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    isFeatured: {
      type: Boolean,
      default: false
    },
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending'
    }
  },

  // Estadísticas
  stats: {
    totalBookings: {
      type: Number,
      default: 0
    },
    completedBookings: {
      type: Number,
      default: 0
    },
    cancelledBookings: {
      type: Number,
      default: 0
    },
    totalRevenue: {
      type: Number,
      default: 0
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    lastBooking: Date
  },

  // Configuración de idiomas
  languages: [{
    type: String,
    enum: ['es', 'en', 'pt', 'fr', 'de'],
    default: 'es'
  }],

  // Soft delete
  deletedAt: Date
}, {
  timestamps: true
});

// Índices
serviceSchema.index({ name: 'text', description: 'text', category: 'text' });
serviceSchema.index({ businessType: 1 });
serviceSchema.index({ category: 1 });
serviceSchema.index({ subcategory: 1 });
serviceSchema.index({ professional: 1 });
serviceSchema.index({ clinic: 1 });
serviceSchema.index({ 'status.isActive': 1 });
serviceSchema.index({ 'status.isVerified': 1 });
serviceSchema.index({ 'price.amount': 1 });
serviceSchema.index({ 'ratings.average': -1 });
serviceSchema.index({ createdAt: -1 });
serviceSchema.index({ deletedAt: 1 });

// Virtuals
serviceSchema.virtual('finalPrice').get(function() {
  if (this.price.discountPercentage > 0) {
    return this.price.amount * (1 - this.price.discountPercentage / 100);
  }
  return this.price.amount;
});

serviceSchema.virtual('hasDiscount').get(function() {
  return this.price.discountPercentage > 0;
});

serviceSchema.virtual('discountAmount').get(function() {
  if (this.price.discountPercentage > 0) {
    return this.price.amount * (this.price.discountPercentage / 100);
  }
  return 0;
});

serviceSchema.virtual('durationFormatted').get(function() {
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

serviceSchema.virtual('isAvailableToday').get(function() {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'lowercase' });
  return this.schedule[today]?.isAvailable || false;
});

// Métodos de instancia
serviceSchema.methods.updateRating = function(newRating) {
  if (newRating < 1 || newRating > 5) {
    throw new Error('La calificación debe estar entre 1 y 5');
  }
  
  const oldRating = this.ratings.average;
  const totalRatings = this.ratings.total;
  
  // Actualizar distribución
  this.ratings.distribution[Math.ceil(newRating)]++;
  
  // Calcular nueva calificación promedio
  this.ratings.average = ((oldRating * totalRatings) + newRating) / (totalRatings + 1);
  this.ratings.total = totalRatings + 1;
  
  return this.save();
};

serviceSchema.methods.checkAvailability = function(date, time) {
  const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'lowercase' });
  const daySchedule = this.schedule[dayOfWeek];
  
  if (!daySchedule || !daySchedule.isAvailable) {
    return { available: false, reason: 'Servicio no disponible en este día' };
  }
  
  const requestedTime = this.parseTime(time);
  
  // Verificar si hay slots disponibles
  for (const slot of daySchedule.timeSlots) {
    const slotStart = this.parseTime(slot.startTime);
    const slotEnd = this.parseTime(slot.endTime);
    
    if (requestedTime >= slotStart && requestedTime < slotEnd) {
      // Verificar disponibilidad en este slot
      return { available: true, slot };
    }
  }
  
  return { available: false, reason: 'No hay slots disponibles en este horario' };
};

serviceSchema.methods.parseTime = function(timeString) {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
};

serviceSchema.methods.getAvailableSlots = function(date) {
  const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'lowercase' });
  const daySchedule = this.schedule[dayOfWeek];
  
  if (!daySchedule || !daySchedule.isAvailable) {
    return [];
  }
  
  return daySchedule.timeSlots.map(slot => ({
    startTime: slot.startTime,
    endTime: slot.endTime,
    maxBookings: slot.maxBookings
  }));
};

serviceSchema.methods.softDelete = function() {
  this.deletedAt = new Date();
  this.status.isActive = false;
  return this.save();
};

serviceSchema.methods.restore = function() {
  this.deletedAt = undefined;
  this.status.isActive = true;
  return this.save();
};

// Métodos estáticos
serviceSchema.statics.findByBusinessType = function(businessType) {
  return this.find({ 
    businessType, 
    'status.isActive': true, 
    deletedAt: { $exists: false } 
  });
};

serviceSchema.statics.findByCategory = function(category) {
  return this.find({ 
    category, 
    'status.isActive': true, 
    deletedAt: { $exists: false } 
  });
};

serviceSchema.statics.findByProfessional = function(professionalId) {
  return this.find({ 
    professional: professionalId, 
    'status.isActive': true, 
    deletedAt: { $exists: false } 
  });
};

serviceSchema.statics.findByClinic = function(clinicId) {
  return this.find({ 
    clinic: clinicId, 
    'status.isActive': true, 
    deletedAt: { $exists: false } 
  });
};

serviceSchema.statics.findByPriceRange = function(minPrice, maxPrice) {
  return this.find({ 
    'price.amount': { $gte: minPrice, $lte: maxPrice }, 
    'status.isActive': true, 
    deletedAt: { $exists: false } 
  });
};

serviceSchema.statics.findTopRated = function(limit = 10) {
  return this.find({ 
    'status.isActive': true, 
    deletedAt: { $exists: false } 
  })
  .sort({ 'ratings.average': -1, 'ratings.total': -1 })
  .limit(limit);
};

// Middleware pre-find
serviceSchema.pre(/^find/, function(next) {
  this.find({ deletedAt: { $exists: false } });
  next();
});

// Configuración del esquema
serviceSchema.set('toJSON', { virtuals: true });
serviceSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Service', serviceSchema);

