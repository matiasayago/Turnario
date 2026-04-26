const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const logger = require('../config/logger');

const userSchema = new mongoose.Schema({
  // Información básica
  email: {
    type: String,
    required: [true, 'El email es requerido'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Email inválido']
  },
  password: {
    type: String,
    required: [true, 'La contraseña es requerida'],
    minlength: [8, 'La contraseña debe tener al menos 8 caracteres'],
    select: false // No incluir en queries por defecto
  },
  fullName: {
    type: String,
    required: [true, 'El nombre completo es requerido'],
    trim: true,
    maxlength: [100, 'El nombre no puede exceder 100 caracteres']
  },
  phone: {
    type: String,
    required: false, // Hacer opcional temporalmente
    trim: true,
    match: [/^[\+]?[1-9][\d]{0,15}$/, 'Número de teléfono inválido']
  },
  
  // Tipo de usuario y estado
  userType: {
    type: String,
    enum: ['client', 'professional', 'admin'],
    required: [true, 'El tipo de usuario es requerido'],
    default: 'client'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  isPhoneVerified: {
    type: Boolean,
    default: false
  },
  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  },
  
  // Información del perfil
  avatar: {
    type: String,
    default: null
  },
  dateOfBirth: {
    type: Date,
    validate: {
      validator: function(v) {
        return v <= new Date();
      },
      message: 'La fecha de nacimiento no puede ser futura'
    }
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other', 'prefer_not_to_say'],
    default: 'prefer_not_to_say'
  },
  
  // Dirección
  address: {
    street: String,
    city: String,
    state: String,
    country: {
      type: String,
      default: 'Argentina'
    },
    postalCode: String,
    coordinates: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number],
        default: [0, 0]
      }
    }
  },
  
  // Preferencias y configuración
  preferences: {
    language: {
      type: String,
      enum: ['es', 'en'],
      default: 'es'
    },
    timezone: {
      type: String,
      default: 'America/Argentina/Buenos_Aires'
    },
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      sms: { type: Boolean, default: false }
    },
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'auto'
    }
  },
  
  // Permisos y roles
  permissions: [{
    type: String,
    enum: [
      'create_appointments',
      'edit_appointments',
      'delete_appointments',
      'view_all_appointments',
      'manage_users',
      'manage_services',
      'manage_clinics',
      'access_analytics',
      'access_all_resources',
      'manage_payments',
      'manage_medical_records'
    ]
  }],
  
  // Información específica del profesional
  professional: {
    license: String,
    specialties: [String],
    experience: {
      years: Number,
      description: String
    },
    education: [{
      degree: String,
      institution: String,
      year: Number,
      description: String
    }],
    certifications: [{
      name: String,
      issuer: String,
      date: Date,
      expiryDate: Date
    }],
    availability: {
      workingDays: [{
        type: String,
        enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
      }],
      workingHours: {
        start: String, // HH:MM
        end: String    // HH:MM
      },
      breakTime: {
        start: String, // HH:MM
        end: String    // HH:MM
      }
    },
    services: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service'
    }],
    clinics: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clinic'
    }]
  },
  
  // Información específica del cliente
  client: {
    emergencyContact: {
      name: String,
      phone: String,
      relationship: String
    },
    medicalInfo: {
      allergies: [String],
      medications: [String],
      conditions: [String],
      bloodType: {
        type: String,
        enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
      }
    },
    preferences: {
      preferredProfessionals: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }],
      preferredClinics: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Clinic'
      }],
      appointmentReminders: {
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
        sms: { type: Boolean, default: false },
        advanceTime: { type: Number, default: 24 } // horas antes
      }
    }
  },
  
  // Metadatos
  lastLogin: {
    type: Date,
    default: null
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date,
    default: null
  },
  passwordChangedAt: {
    type: Date,
    default: null
  },
  passwordResetToken: String,
  passwordResetExpires: Date,
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  phoneVerificationCode: String,
  phoneVerificationExpires: Date,
  refreshTokens: [{
    token: String,
    createdAt: Date,
    expiresAt: Date
  }],
  lastLoginAt: Date,
  loginCount: {
    type: Number,
    default: 0
  },
  emailVerifiedAt: Date,
  deletedAt: Date,
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices
userSchema.index({ email: 1 });
userSchema.index({ phone: 1 });
userSchema.index({ userType: 1, isActive: 1 });
userSchema.index({ 'address.coordinates': '2dsphere' });
userSchema.index({ createdAt: -1 });

// Virtuals
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

userSchema.virtual('age').get(function() {
  if (!this.dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
});

userSchema.virtual('fullAddress').get(function() {
  if (!this.address) return null;
  const parts = [
    this.address.street,
    this.address.city,
    this.address.state,
    this.address.postalCode,
    this.address.country
  ].filter(Boolean);
  
  return parts.join(', ');
});

// Middleware pre-save
userSchema.pre('save', async function(next) {
  try {
    // Solo hashear la contraseña si ha sido modificada
    if (!this.isModified('password')) return next();
    
    // Hashear la contraseña
    const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS) || 12);
    this.password = await bcrypt.hash(this.password, salt);
    
    // Actualizar timestamp de cambio de contraseña
    this.passwordChangedAt = Date.now() - 1000; // 1 segundo antes para evitar problemas de timing
    
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Métodos de instancia
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Error comparando contraseñas');
  }
};

userSchema.methods.incrementLoginAttempts = async function() {
  try {
    // Si ya está bloqueado y el bloqueo expiró, resetear
    if (this.lockUntil && this.lockUntil < Date.now()) {
      await this.updateOne({
        $unset: { lockUntil: 1 },
        $set: { loginAttempts: 1 }
      });
      return;
    }
    
    // Incrementar intentos
    const updates = { $inc: { loginAttempts: 1 } };
    
    // Bloquear después de 5 intentos por 2 horas
    if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
      updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 };
    }
    
    await this.updateOne(updates);
  } catch (error) {
    logger.error('Error incrementando intentos de login:', error);
  }
};

userSchema.methods.resetLoginAttempts = async function() {
  try {
    await this.updateOne({
      $unset: { lockUntil: 1, loginAttempts: 1 }
    });
  } catch (error) {
    logger.error('Error reseteando intentos de login:', error);
  }
};

userSchema.methods.updateLastLogin = async function() {
  try {
    await this.updateOne({
      lastLogin: new Date()
    });
  } catch (error) {
    logger.error('Error actualizando último login:', error);
  }
};

userSchema.methods.hasPermission = function(permission) {
  return this.permissions.includes(permission);
};

userSchema.methods.hasRole = function(role) {
  return this.userType === role;
};

userSchema.methods.isProfessional = function() {
  return this.userType === 'professional';
};

userSchema.methods.isClient = function() {
  return this.userType === 'client';
};

userSchema.methods.isAdmin = function() {
  return this.userType === 'admin';
};

// Métodos estáticos
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

userSchema.statics.findActiveProfessionals = function() {
  return this.find({
    userType: 'professional',
    isActive: true,
    'isEmailVerified': true
  });
};

userSchema.statics.findByLocation = function(coordinates, maxDistance = 10000) {
  return this.find({
    'address.coordinates': {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: coordinates
        },
        $maxDistance: maxDistance
      }
    },
    userType: 'professional',
    isActive: true
  });
};

userSchema.statics.findBySpecialty = function(specialty) {
  return this.find({
    'professional.specialties': specialty,
    userType: 'professional',
    isActive: true
  });
};

// Métodos de validación
userSchema.methods.validatePassword = function(password) {
  // Mínimo 8 caracteres, al menos una letra y un número
  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

userSchema.methods.validatePhone = function(phone) {
  // Formato internacional básico
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone);
};

// Métodos de negocio
userSchema.methods.canCreateAppointment = function() {
  return this.isActive && this.isEmailVerified;
};

userSchema.methods.canAcceptAppointments = function() {
  return this.isActive && this.isEmailVerified && this.isProfessional();
};

userSchema.methods.getAvailableSlots = function(date) {
  if (!this.isProfessional()) return [];
  
  // Implementar lógica para obtener slots disponibles
  // Por ahora retornar array vacío
  return [];
};

// Métodos de seguridad
userSchema.methods.generatePasswordResetToken = function() {
  const resetToken = require('crypto').randomBytes(32).toString('hex');
  
  this.passwordResetToken = require('crypto')
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  
  this.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos
  
  return resetToken;
};

userSchema.methods.generateEmailVerificationToken = function() {
  const verificationToken = require('crypto').randomBytes(32).toString('hex');
  
  this.emailVerificationToken = require('crypto')
    .createHash('sha256')
    .update(verificationToken)
    .digest('hex');
  
  this.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas
  
  return verificationToken;
};

userSchema.methods.generatePhoneVerificationCode = function() {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  
  this.phoneVerificationCode = code;
  this.phoneVerificationExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos
  
  return code;
};

// Métodos de limpieza
userSchema.methods.softDelete = async function() {
  try {
    await this.updateOne({
      isActive: false,
      isDeleted: true,
      deletedAt: new Date()
    });
  } catch (error) {
    logger.error('Error en soft delete:', error);
    throw error;
  }
};

userSchema.methods.restore = async function() {
  try {
    await this.updateOne({
      isActive: true,
      isDeleted: false,
      $unset: { deletedAt: 1 }
    });
  } catch (error) {
    logger.error('Error restaurando usuario:', error);
    throw error;
  }
};

// Métodos de logging
userSchema.methods.logAccess = function(userId, action, details = {}) {
  // Por ahora, solo loggear a la consola
  logger.info(`User action logged: ${action}`, {
    userId: userId || this._id,
    action,
    details,
    timestamp: new Date().toISOString()
  });
};

// Métodos de exportación
userSchema.methods.toPublicProfile = function() {
  const user = this.toObject();
  
  // Remover información sensible
  delete user.password;
  delete user.passwordResetToken;
  delete user.passwordResetExpires;
  delete user.emailVerificationToken;
  delete user.emailVerificationExpires;
  delete user.phoneVerificationCode;
  delete user.phoneVerificationExpires;
  delete user.loginAttempts;
  delete user.lockUntil;
  
  return user;
};

userSchema.methods.toProfessionalProfile = function() {
  const user = this.toPublicProfile();
  
  // Solo incluir información profesional relevante
  return {
    id: user._id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    avatar: user.avatar,
    professional: user.professional,
    address: user.address,
    isActive: user.isActive,
    isEmailVerified: user.isEmailVerified,
    createdAt: user.createdAt
  };
};

module.exports = mongoose.model('User', userSchema);
