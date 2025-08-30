const mongoose = require('mongoose');

const clinicSchema = new mongoose.Schema({
  // Información básica
  name: {
    type: String,
    required: [true, 'El nombre es requerido'],
    trim: true,
    maxlength: [100, 'El nombre no puede exceder 100 caracteres']
  },
  businessType: {
    type: String,
    enum: ['medical', 'beauty', 'fitness', 'education', 'consulting', 'repair', 'cleaning', 'transport', 'food', 'retail', 'other'],
    required: true,
    default: 'other'
  },
  businessCategory: {
    type: String,
    trim: true,
    maxlength: [50, 'La categoría del negocio no puede exceder 50 caracteres']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'La descripción no puede exceder 1000 caracteres']
  },
  tagline: {
    type: String,
    trim: true,
    maxlength: [200, 'El slogan no puede exceder 200 caracteres']
  },

  // Información de contacto
  contact: {
    phone: {
      type: String,
      required: [true, 'El teléfono es requerido'],
      match: [/^[\+]?[1-9][\d]{0,15}$/, 'Teléfono inválido']
    },
    email: {
      type: String,
      required: [true, 'El email es requerido'],
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Email inválido']
    },
    website: {
      type: String,
      trim: true,
      match: [/^https?:\/\/.+/, 'La URL debe comenzar con http:// o https://']
    },
    whatsapp: {
      type: String,
      trim: true
    }
  },

  // Dirección
  address: {
    street: {
      type: String,
      required: [true, 'La calle es requerida'],
      trim: true,
      maxlength: [200, 'La calle no puede exceder 200 caracteres']
    },
    city: {
      type: String,
      required: [true, 'La ciudad es requerida'],
      trim: true,
      maxlength: [100, 'La ciudad no puede exceder 100 caracteres']
    },
    state: {
      type: String,
      required: [true, 'El estado/provincia es requerido'],
      trim: true,
      maxlength: [100, 'El estado no puede exceder 100 caracteres']
    },
    zipCode: {
      type: String,
      trim: true,
      maxlength: [20, 'El código postal no puede exceder 20 caracteres']
    },
    country: {
      type: String,
      required: [true, 'El país es requerido'],
      trim: true,
      maxlength: [100, 'El país no puede exceder 100 caracteres']
    },
    coordinates: {
      latitude: {
        type: Number,
        min: -90,
        max: 90
      },
      longitude: {
        type: Number,
        min: -180,
        max: 180
      }
    },
    reference: {
      type: String,
      trim: true,
      maxlength: [200, 'La referencia no puede exceder 200 caracteres']
    }
  },

  // Servicios y especialidades
  services: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service'
  }],
  specialties: [{
    type: String,
    trim: true,
    maxlength: [50, 'Cada especialidad no puede exceder 50 caracteres']
  }],
  expertise: [{
    type: String,
    trim: true,
    maxlength: [100, 'Cada área de experiencia no puede exceder 100 caracteres']
  }],

  // Horarios de atención
  businessHours: {
    monday: {
      open: {
        type: String,
        match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)']
      },
      close: {
        type: String,
        match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)']
      },
      isOpen: {
        type: Boolean,
        default: true
      }
    },
    tuesday: {
      open: {
        type: String,
        match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)']
      },
      close: {
        type: String,
        match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)']
      },
      isOpen: {
        type: Boolean,
        default: true
      }
    },
    wednesday: {
      open: {
        type: String,
        match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)']
      },
      close: {
        type: String,
        match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)']
      },
      isOpen: {
        type: Boolean,
        default: true
      }
    },
    thursday: {
      open: {
        type: String,
        match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)']
      },
      close: {
        type: String,
        match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)']
      },
      isOpen: {
        type: Boolean,
        default: true
      }
    },
    friday: {
      open: {
        type: String,
        match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)']
      },
      close: {
        type: String,
        match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)']
      },
      isOpen: {
        type: Boolean,
        default: true
      }
    },
    saturday: {
      open: {
        type: String,
        match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)']
      },
      close: {
        type: String,
        match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)']
      },
      isOpen: {
        type: Boolean,
        default: false
      }
    },
    sunday: {
      open: {
        type: String,
        match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)']
      },
      close: {
        type: String,
        match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)']
      },
      isOpen: {
        type: Boolean,
        default: false
      }
    }
  },

  // Personal y profesionales
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  professionals: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      trim: true,
      maxlength: [50, 'El rol no puede exceder 50 caracteres']
    },
    joinDate: {
      type: Date,
      default: Date.now
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  staff: [{
    name: {
      type: String,
      trim: true,
      maxlength: [100, 'El nombre no puede exceder 100 caracteres']
    },
    position: {
      type: String,
      trim: true,
      maxlength: [50, 'El puesto no puede exceder 50 caracteres']
    },
    phone: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      trim: true
    }
  }],

  // Configuración de citas
  appointmentSettings: {
    duration: {
      type: Number,
      default: 30,
      min: [15, 'La duración mínima es 15 minutos'],
      max: [480, 'La duración máxima es 8 horas']
    },
    bufferTime: {
      type: Number,
      default: 15,
      min: [0, 'El tiempo de buffer no puede ser negativo'],
      max: [60, 'El tiempo de buffer no puede exceder 60 minutos']
    },
    maxAdvanceBooking: {
      type: Number,
      default: 30,
      min: [1, 'La reserva anticipada mínima es 1 día'],
      max: [365, 'La reserva anticipada máxima es 1 año']
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

  // Información de pago
  paymentInfo: {
    acceptedMethods: [{
      type: String,
      enum: ['cash', 'credit_card', 'debit_card', 'transfer', 'digital_wallet', 'crypto'],
      default: 'cash'
    }],
    currency: {
      type: String,
      default: 'ARS',
      enum: ['ARS', 'USD', 'EUR', 'BRL', 'CLP', 'COP', 'MXN', 'PEN', 'UYU']
    },
    taxRate: {
      type: Number,
      default: 0,
      min: [0, 'La tasa de impuesto no puede ser negativa'],
      max: [100, 'La tasa de impuesto no puede exceder 100%']
    },
    depositRequired: {
      type: Boolean,
      default: false
    },
    depositPercentage: {
      type: Number,
      default: 0,
      min: [0, 'El porcentaje de depósito no puede ser negativo'],
      max: [100, 'El porcentaje de depósito no puede exceder 100%']
    }
  },

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

  // Imágenes y multimedia
  images: {
    logo: {
      type: String,
      trim: true
    },
    cover: {
      type: String,
      trim: true
    },
    gallery: [{
      url: {
        type: String,
        required: true,
        trim: true
      },
      caption: {
        type: String,
        trim: true,
        maxlength: [200, 'La descripción no puede exceder 200 caracteres']
      },
      isPublic: {
        type: Boolean,
        default: true
      }
    }]
  },

  // Configuración de notificaciones
  notifications: {
    emailNotifications: {
      type: Boolean,
      default: true
    },
    smsNotifications: {
      type: Boolean,
      default: true
    },
    pushNotifications: {
      type: Boolean,
      default: true
    },
    reminderSettings: {
      appointmentReminder: {
        type: Boolean,
        default: true
      },
      reminderTime: {
        type: Number,
        default: 24,
        min: [1, 'El tiempo de recordatorio mínimo es 1 hora'],
        max: [168, 'El tiempo de recordatorio máximo es 1 semana']
      }
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

  // Metadatos
  tags: [{
    type: String,
    trim: true,
    maxlength: [30, 'Cada etiqueta no puede exceder 30 caracteres']
  }],
  socialMedia: {
    facebook: {
      type: String,
      trim: true
    },
    instagram: {
      type: String,
      trim: true
    },
    twitter: {
      type: String,
      trim: true
    },
    linkedin: {
      type: String,
      trim: true
    },
    youtube: {
      type: String,
      trim: true
    }
  },

  // Estadísticas
  stats: {
    totalAppointments: {
      type: Number,
      default: 0
    },
    completedAppointments: {
      type: Number,
      default: 0
    },
    cancelledAppointments: {
      type: Number,
      default: 0
    },
    totalRevenue: {
      type: Number,
      default: 0
    },
    averageAppointmentValue: {
      type: Number,
      default: 0
    },
    lastAppointment: Date
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
clinicSchema.index({ name: 'text', description: 'text', 'address.city': 'text' });
clinicSchema.index({ businessType: 1 });
clinicSchema.index({ 'status.isActive': 1 });
clinicSchema.index({ 'status.isVerified': 1 });
clinicSchema.index({ 'address.city': 1 });
clinicSchema.index({ 'address.state': 1 });
clinicSchema.index({ 'address.coordinates': '2dsphere' });
clinicSchema.index({ owner: 1 });
clinicSchema.index({ 'ratings.average': -1 });
clinicSchema.index({ createdAt: -1 });
clinicSchema.index({ deletedAt: 1 });

// Virtuals
clinicSchema.virtual('fullAddress').get(function() {
  const addr = this.address;
  if (!addr.street && !addr.city) return null;
  
  const parts = [addr.street, addr.city, addr.state, addr.zipCode, addr.country];
  return parts.filter(part => part).join(', ');
});

clinicSchema.virtual('isOpen').get(function() {
  const now = new Date();
  const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
  const todayHours = this.businessHours[dayOfWeek];
  
  if (!todayHours || !todayHours.isOpen) return false;
  
  const currentTime = now.getHours() * 60 + now.getMinutes();
  const openTime = todayHours.open ? this.parseTime(todayHours.open) : 0;
  const closeTime = todayHours.close ? this.parseTime(todayHours.close) : 1440;
  
  return currentTime >= openTime && currentTime <= closeTime;
});

clinicSchema.virtual('nextOpenTime').get(function() {
  const now = new Date();
  const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
  
  // Buscar el próximo día abierto
  for (let i = 0; i < 7; i++) {
    const checkDay = (dayOfWeek + i) % 7;
    const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][checkDay];
    const dayHours = this.businessHours[dayName];
    
    if (dayHours && dayHours.isOpen && dayHours.open) {
      if (i === 0) {
        // Hoy, verificar si ya pasó la hora de apertura
        const currentTime = now.getHours() * 60 + now.getMinutes();
        const openTime = this.parseTime(dayHours.open);
        if (currentTime < openTime) {
          return { day: i, time: dayHours.open };
        }
      } else {
        return { day: i, time: dayHours.open };
      }
    }
  }
  
  return null;
});

// Métodos de instancia
clinicSchema.methods.parseTime = function(timeString) {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
};

clinicSchema.methods.getBusinessHoursForDay = function(dayName) {
  return this.businessHours[dayName] || null;
};

clinicSchema.methods.isOpenOnDay = function(dayName) {
  const dayHours = this.businessHours[dayName];
  return dayHours && dayHours.isOpen;
};

clinicSchema.methods.getAvailableSlots = function(date, duration = 30) {
  // Implementar lógica para obtener slots disponibles
  // Esto sería implementado en el servicio de citas
  return [];
};

clinicSchema.methods.updateRating = function(newRating) {
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

clinicSchema.methods.softDelete = function() {
  this.deletedAt = new Date();
  this.status.isActive = false;
  return this.save();
};

clinicSchema.methods.restore = function() {
  this.deletedAt = undefined;
  this.status.isActive = true;
  return this.save();
};

// Métodos estáticos
clinicSchema.statics.findByBusinessType = function(businessType) {
  return this.find({ 
    businessType, 
    'status.isActive': true, 
    deletedAt: { $exists: false } 
  });
};

clinicSchema.statics.findByCity = function(city) {
  return this.find({ 
    'address.city': { $regex: city, $options: 'i' }, 
    'status.isActive': true, 
    deletedAt: { $exists: false } 
  });
};

clinicSchema.statics.findNearby = function(latitude, longitude, maxDistance = 10000) {
  return this.find({
    'address.coordinates': {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        $maxDistance: maxDistance
      }
    },
    'status.isActive': true,
    deletedAt: { $exists: false }
  });
};

clinicSchema.statics.findTopRated = function(limit = 10) {
  return this.find({ 
    'status.isActive': true, 
    deletedAt: { $exists: false } 
  })
  .sort({ 'ratings.average': -1, 'ratings.total': -1 })
  .limit(limit);
};

// Middleware pre-find
clinicSchema.pre(/^find/, function(next) {
  this.find({ deletedAt: { $exists: false } });
  next();
});

// Configuración del esquema
clinicSchema.set('toJSON', { virtuals: true });
clinicSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Clinic', clinicSchema);

