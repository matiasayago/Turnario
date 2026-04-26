const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * Acceso a funciones Pro (app).
 * Clientes y admin: siempre acceso completo (no cobran suscripción Turnario).
 * Profesionales: Pro solo si tier === 'pro' y (sin fecha de fin o fecha futura).
 */
function getSubscriptionPayload(doc) {
  const userType = doc && doc.userType;
  const expiresRaw = doc && doc.subscriptionExpiresAt;
  const exp = expiresRaw ? new Date(expiresRaw) : null;
  const validExp = exp && !Number.isNaN(exp.getTime());
  const expiresIso = validExp ? exp.toISOString() : null;

  if (userType !== 'professional') {
    return {
      subscriptionTier: 'free',
      subscriptionExpiresAt: null,
      hasProAccess: true,
    };
  }

  // Sin `subscriptionTier` en documentos viejos = acceso Pro (compatibilidad hasta migración explícita a `free`).
  let tier;
  if (doc.subscriptionTier === 'pro') tier = 'pro';
  else if (doc.subscriptionTier === 'free') tier = 'free';
  else tier = 'pro';

  const hasPro =
    tier === 'pro' && (!validExp || exp.getTime() > Date.now());

  return {
    subscriptionTier: tier,
    subscriptionExpiresAt: expiresIso,
    hasProAccess: hasPro,
  };
}

const userSchema = new mongoose.Schema({
  // Información básica
  email: {
    type: String,
    required: [true, 'El email es requerido'],
    unique: true,
    lowercase: true,
    trim: true,
    maxlength: [254, 'Email demasiado largo'],
    // Validación estricta en express-validator (register/login); evitar rechazos 500 por regex desalineado (+ en local, TLD largos, etc.)
  },
  password: {
    type: String,
    required: [true, 'La contraseña es requerida'],
    // Alineado con POST /api/v1/auth/register (express-validator min 6) y la app
    minlength: [6, 'La contraseña debe tener al menos 6 caracteres'],
    select: false
  },
  fullName: {
    type: String,
    required: [true, 'El nombre completo es requerido'],
    trim: true,
    maxlength: [100, 'El nombre no puede exceder 100 caracteres']
  },
  userType: {
    type: String,
    enum: ['client', 'professional', 'admin'],
    required: true,
    default: 'client'
  },
  phone: {
    type: String,
    required: [true, 'El teléfono es requerido'],
    match: [/^[\+]?[1-9][\d]{0,15}$/, 'Teléfono inválido']
  },

  /** OAuth: ID de cuenta de Google (sub del id_token) */
  googleId: {
    type: String,
    trim: true,
    sparse: true,
    unique: true,
  },
  /** OAuth: ID estable de Sign in with Apple (credential.user) */
  appleId: {
    type: String,
    trim: true,
    sparse: true,
    unique: true,
  },

  /** Servicio principal que ofrece el profesional (catálogo en la app, ej. "Consulta Psicológica") */
  service: {
    type: String,
    trim: true,
    maxlength: [150, 'El servicio no puede exceder 150 caracteres'],
    default: '',
  },

  /**
   * Reservas que hacen los clientes desde la app hacia este profesional.
   * true = deben pagar seña (Mercado Pago) antes de confirmar; false = solo solicitud (pending_approval).
   */
  clientBookingRequiresDeposit: {
    type: Boolean,
    default: true,
  },

  // Información profesional (para profesionales y admins)
  businessInfo: {
    businessName: {
      type: String,
      trim: true,
      maxlength: [100, 'El nombre del negocio no puede exceder 100 caracteres']
    },
    businessType: {
      type: String,
      enum: ['medical', 'beauty', 'fitness', 'education', 'consulting', 'repair', 'cleaning', 'transport', 'food', 'retail', 'other'],
      default: 'other'
    },
    businessCategory: {
      type: String,
      trim: true,
      maxlength: [50, 'La categoría del negocio no puede exceder 50 caracteres']
    },
    license: {
      type: String,
      trim: true,
      maxlength: [100, 'La licencia no puede exceder 100 caracteres']
    },
    specialties: [{
      type: String,
      trim: true,
      maxlength: [50, 'Cada especialidad no puede exceder 50 caracteres']
    }],
    experience: {
      type: Number,
      min: [0, 'La experiencia no puede ser negativa'],
      max: [50, 'La experiencia no puede exceder 50 años']
    },
    education: [{
      degree: {
        type: String,
        trim: true,
        maxlength: [100, 'El título no puede exceder 100 caracteres']
      },
      institution: {
        type: String,
        trim: true,
        maxlength: [100, 'La institución no puede exceder 100 caracteres']
      },
      year: {
        type: Number,
        min: [1900, 'El año no puede ser anterior a 1900'],
        max: [new Date().getFullYear() + 5, 'El año no puede ser posterior a 5 años en el futuro']
      }
    }],
    certifications: [{
      name: {
        type: String,
        trim: true,
        maxlength: [100, 'El nombre de la certificación no puede exceder 100 caracteres']
      },
      issuer: {
        type: String,
        trim: true,
        maxlength: [100, 'El emisor no puede exceder 100 caracteres']
      },
      issueDate: Date,
      expiryDate: Date
    }],
    skills: [{
      type: String,
      trim: true,
      maxlength: [50, 'Cada habilidad no puede exceder 50 caracteres']
    }],
    languages: [{
      language: {
        type: String,
        trim: true,
        maxlength: [30, 'El idioma no puede exceder 30 caracteres']
      },
      level: {
        type: String,
        enum: ['basic', 'intermediate', 'advanced', 'native'],
        default: 'basic'
      }
    }]
  },

  // Información personal
  personalInfo: {
    dateOfBirth: {
      type: Date,
      validate: {
        validator: function(v) {
          return v <= new Date();
        },
        message: 'La fecha de nacimiento no puede ser en el futuro'
      }
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer_not_to_say'],
      default: 'prefer_not_to_say'
    },
    nationalId: {
      type: String,
      trim: true,
      maxlength: [20, 'El documento de identidad no puede exceder 20 caracteres']
    },
    emergencyContact: {
      name: {
        type: String,
        trim: true,
        maxlength: [100, 'El nombre del contacto de emergencia no puede exceder 100 caracteres']
      },
      phone: {
        type: String,
        match: [/^[\+]?[1-9][\d]{0,15}$/, 'Teléfono inválido']
      },
      relationship: {
        type: String,
        trim: true,
        maxlength: [50, 'La relación no puede exceder 50 caracteres']
      }
    }
  },

  // Dirección
  address: {
    street: {
      type: String,
      trim: true,
      maxlength: [200, 'La calle no puede exceder 200 caracteres']
    },
    city: {
      type: String,
      trim: true,
      maxlength: [100, 'La ciudad no puede exceder 100 caracteres']
    },
    state: {
      type: String,
      trim: true,
      maxlength: [100, 'El estado/provincia no puede exceder 100 caracteres']
    },
    zipCode: {
      type: String,
      trim: true,
      maxlength: [20, 'El código postal no puede exceder 20 caracteres']
    },
    country: {
      type: String,
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
    }
  },

  // Preferencias
  preferences: {
    language: {
      type: String,
      default: 'es',
      enum: ['es', 'en', 'pt', 'fr', 'de']
    },
    timezone: {
      type: String,
      default: 'America/Argentina/Buenos_Aires'
    },
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      sms: {
        type: Boolean,
        default: true
      },
      /** Avisos por WhatsApp (Twilio o Meta Cloud). Requiere opt-in explícito salvo WHATSAPP_REQUIRE_OPT_IN=0 */
      whatsapp: {
        type: Boolean,
        default: false
      },
      push: {
        type: Boolean,
        default: true
      },
      appointmentReminders: {
        type: Boolean,
        default: true
      },
      marketing: {
        type: Boolean,
        default: false
      }
    },
    privacy: {
      profileVisible: {
        type: Boolean,
        default: true
      },
      showContactInfo: {
        type: Boolean,
        default: true
      },
      allowMessages: {
        type: Boolean,
        default: true
      }
    }
  },

  /**
   * Tokens de Expo Push (Expo Go / dev build / standalone) para recordatorios.
   * Máximo ~10 entradas; deduplicación en el endpoint de registro.
   */
  expoPushTokens: {
    type: [
      {
        token: { type: String, trim: true, maxlength: 512 },
        updatedAt: { type: Date, default: Date.now },
      },
    ],
    default: [],
  },

  // Estado y verificación
  status: {
    isActive: {
      type: Boolean,
      default: true
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    emailVerified: {
      type: Boolean,
        default: false
    },
    phoneVerified: {
      type: Boolean,
      default: false
    },
    verificationToken: String,
    verificationExpires: Date
  },

  // Seguridad
  security: {
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    /** Hash bcrypt del código SMS de 6 dígitos (recuperación sin depender del correo) */
    passwordResetOtpHash: { type: String, select: false },
    loginAttempts: {
      type: Number,
      default: 0
    },
    lockUntil: Date
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
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    totalReviews: {
      type: Number,
      default: 0
    },
    totalSpent: {
      type: Number,
      default: 0
    },
    lastAppointment: Date
  },

  // Metadatos
  metadata: {
    profilePicture: {
      type: String,
      trim: true
    },
    bio: {
      type: String,
      trim: true,
      maxlength: [500, 'La biografía no puede exceder 500 caracteres']
    },
    tags: [{
      type: String,
      trim: true,
      maxlength: [30, 'Cada etiqueta no puede exceder 30 caracteres']
    }],
    socialMedia: {
      website: {
        type: String,
        trim: true,
        match: [/^https?:\/\/.+/, 'La URL debe comenzar con http:// o https://']
      },
      facebook: {
        type: String,
        trim: true
      },
      instagram: {
        type: String,
        trim: true
      },
      linkedin: {
        type: String,
        trim: true
      },
      twitter: {
        type: String,
        trim: true
      }
    }
  },

  /**
   * Configuración de consultorios del profesional (app Turnario).
   * Forma: { clinics: Array, selectedClinicIndex: number } — estructura flexible (Mixed).
   */
  professionalClinicsConfig: {
    type: mongoose.Schema.Types.Mixed,
    default: undefined,
  },

  /** Suscripción (facturación Play/App Store o manual). Solo reglas de negocio para profesionales. */
  subscriptionTier: {
    type: String,
    enum: ['free', 'pro'],
    default: 'free',
  },
  subscriptionExpiresAt: {
    type: Date,
    default: null,
  },
  subscriptionProvider: {
    type: String,
    trim: true,
    maxlength: [40, 'Proveedor de suscripción demasiado largo'],
    default: '',
  },

  /**
   * Cuenta tipo “super profesional”: el directorio público marca el flag y la app
   * considera que puede recibir reservas para cualquier servicio del catálogo.
   * Solo usar en desarrollo / cuentas internas.
   */
  offersAllCatalogServices: {
    type: Boolean,
    default: false,
  },

  deletedAt: Date
}, {
  timestamps: true
});

// Índices
userSchema.index({ email: 1 });
userSchema.index({ userType: 1 });
userSchema.index({ 'status.isActive': 1 });
userSchema.index({ 'address.city': 1 });
userSchema.index({ 'address.coordinates': '2dsphere' });
userSchema.index({ createdAt: -1 });
userSchema.index({ deletedAt: 1 });

// Virtuals: capa plana para rutas legacy que usan user.isActive
userSchema
  .virtual('isActive')
  .get(function () {
    return this.status?.isActive !== false;
  })
  .set(function (v) {
    if (!this.status) this.status = {};
    this.status.isActive = !!v;
  });

userSchema.virtual('age').get(function() {
  if (this.personalInfo.dateOfBirth) {
    const today = new Date();
    const birthDate = new Date(this.personalInfo.dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }
  return null;
});

userSchema.virtual('fullAddress').get(function() {
  const addr = this.address;
  if (!addr.street && !addr.city) return null;
  
  const parts = [addr.street, addr.city, addr.state, addr.zipCode, addr.country];
  return parts.filter(part => part).join(', ');
});

userSchema.virtual('isLocked').get(function() {
  return !!(this.security.lockUntil && this.security.lockUntil > Date.now());
});

userSchema.virtual('hasProAccess').get(function () {
  return getSubscriptionPayload(this).hasProAccess;
});

// Métodos de instancia
userSchema.methods.correctPassword = async function(candidatePassword, userPassword) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

/** Compatibilidad con rutas auth/users (verifica contra el hash almacenado). */
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!candidatePassword || !this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.getPublicProfile = function () {
  const doc = typeof this.toObject === 'function' ? this.toObject({ virtuals: true }) : this;
  const base = {
    _id: this._id.toString(),
    id: this._id.toString(),
    fullName: doc.fullName,
    email: doc.email,
    phone: doc.phone,
    userType: doc.userType,
    service: doc.service || '',
    isActive: doc.status?.isActive !== false,
    isEmailVerified: !!(doc.status && doc.status.emailVerified),
    profileImage: doc.metadata && doc.metadata.profilePicture,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
  if (doc.userType === 'professional') {
    base.clientBookingRequiresDeposit = doc.clientBookingRequiresDeposit !== false;
  }
  const addr = doc.address;
  if (addr && (addr.street || addr.city || addr.state || addr.zipCode || addr.country)) {
    base.address = {
      street: addr.street || '',
      city: addr.city || '',
      state: addr.state || '',
      zipCode: addr.zipCode || '',
      country: addr.country || '',
    };
  }
  const pi = doc.personalInfo;
  if (pi && typeof pi === 'object') {
    if (pi.dateOfBirth) {
      base.dateOfBirth = new Date(pi.dateOfBirth).toISOString().slice(0, 10);
    }
    if (pi.nationalId != null && String(pi.nationalId).trim() !== '') {
      base.nationalId = String(pi.nationalId).trim();
    }
    if (pi.gender != null && String(pi.gender).trim() !== '') {
      base.gender = pi.gender;
    }
    const ec = pi.emergencyContact;
    if (ec && typeof ec === 'object' && (ec.name || ec.phone || ec.relationship)) {
      base.emergencyContact = {
        name: ec.name || '',
        phone: ec.phone || '',
        relationship: ec.relationship || '',
      };
    }
  }
  if (doc.metadata && doc.metadata.bio != null && String(doc.metadata.bio).trim() !== '') {
    base.profileBio = String(doc.metadata.bio).trim();
  }
  const sub = getSubscriptionPayload(doc);
  base.subscriptionTier = sub.subscriptionTier;
  base.subscriptionExpiresAt = sub.subscriptionExpiresAt;
  base.hasProAccess = sub.hasProAccess;
  return base;
};

userSchema.methods.updateLastLogin = function () {
  return Promise.resolve(this);
};

userSchema.methods.updateActivity = function () {
  return Promise.resolve(this);
};

userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
  if (this.security.passwordChangedAt) {
    const changedTimestamp = parseInt(this.security.passwordChangedAt.getTime() / 1000, 10);
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

userSchema.methods.incrementLoginAttempts = function() {
  if (this.security.lockUntil && this.security.lockUntil > Date.now()) {
    throw new Error('La cuenta está bloqueada temporalmente');
  }
  
  this.security.loginAttempts += 1;
  
  if (this.security.loginAttempts >= 5) {
    this.security.lockUntil = Date.now() + 2 * 60 * 60 * 1000; // 2 horas
  }
  
  return this.save();
};

userSchema.methods.resetLoginAttempts = function() {
  this.security.loginAttempts = 0;
  this.security.lockUntil = undefined;
  return this.save();
};

userSchema.methods.softDelete = function() {
  this.deletedAt = new Date();
  this.status.isActive = false;
  return this.save();
};

userSchema.methods.restore = function() {
  this.deletedAt = undefined;
  this.status.isActive = true;
  return this.save();
};

// Métodos estáticos
userSchema.statics.findByEmail = function (email) {
  const e = String(email || '')
    .trim()
    .toLowerCase();
  if (!e) return Promise.resolve(null);
  return this.findOne({ email: e, deletedAt: { $exists: false } });
};

userSchema.statics.findActiveUsers = function() {
  return this.find({ 
    'status.isActive': true, 
    deletedAt: { $exists: false } 
  });
};

userSchema.statics.findByUserType = function(userType) {
  return this.find({ 
    userType, 
    'status.isActive': true, 
    deletedAt: { $exists: false } 
  });
};

// Middleware pre-save
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();

  if (!this.security) this.security = {};
  this.security.passwordChangedAt = Date.now() - 1000;
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.pre('save', function(next) {
  if (this.isModified('fullName')) {
    this.fullName = this.fullName
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
  next();
});

// Middleware pre-find
userSchema.pre(/^find/, function(next) {
  this.find({ deletedAt: { $exists: false } });
  next();
});

// Configuración del esquema
userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('User', userSchema);

