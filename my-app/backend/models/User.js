const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  dateOfBirth: {
    type: String,
    trim: true,
    default: ''
  },
  gender: {
    type: String,
    trim: true,
    default: ''
  },
  emergencyContact: {
    type: String,
    trim: true,
    default: ''
  },
  medicalHistory: {
    type: String,
    trim: true,
    default: ''
  },
  allergies: {
    type: String,
    trim: true,
    default: ''
  },
  clinicalNotes: {
    type: String,
    trim: true,
    default: ''
  },
  /** OAuth Google: sub del id_token */
  googleId: {
    type: String,
    trim: true,
    sparse: true,
    unique: true,
    default: undefined,
  },
  /** OAuth Apple */
  appleId: {
    type: String,
    trim: true,
    sparse: true,
    unique: true,
    default: undefined,
  },
  userType: {
    type: String,
    enum: ['client', 'professional', 'admin'],
    default: 'client'
  },
  service: {
    type: String,
    trim: true
  },
  /** Precio de consulta que ve el cliente al reservar (ARS). */
  consultationPrice: {
    type: Number,
    default: 10000,
    min: 0,
  },
  /** Porcentaje de seña sobre consultationPrice (0–100). */
  depositPercentage: {
    type: Number,
    default: 20,
    min: 0,
    max: 100,
  },
  /** Si false, el cliente reserva sin seña online. Default true. */
  clientBookingRequiresDeposit: {
    type: Boolean,
    default: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  profileImage: {
    type: String,
    default: null
  },
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    postalCode: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  preferences: {
    language: {
      type: String,
      default: 'es'
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
      push: {
        type: Boolean,
        default: true
      },
      sms: {
        type: Boolean,
        default: false
      }
    }
  },
  resetPasswordToken: {
    type: String,
    default: null
  },
  resetPasswordExpiresAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Middleware para hashear la contraseña antes de guardar
userSchema.pre('save', async function(next) {
  // Solo hashear si la contraseña ha sido modificada
  if (!this.isModified('password')) return next();
  
  try {
    // Hashear la contraseña con un salt de 12 rondas
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Método para comparar contraseñas
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Índices para optimizar consultas
userSchema.index({ email: 1 });
userSchema.index({ userType: 1 });
userSchema.index({ isActive: 1 });

module.exports = mongoose.model('User', userSchema);
