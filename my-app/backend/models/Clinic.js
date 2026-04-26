const mongoose = require('mongoose');

const clinicSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  address: {
    street: {
      type: String,
      required: true,
      trim: true
    },
    city: {
      type: String,
      required: true,
      trim: true
    },
    state: {
      type: String,
      required: true,
      trim: true
    },
    zipCode: {
      type: String,
      required: true,
      trim: true
    },
    country: {
      type: String,
      required: true,
      trim: true,
      default: 'Argentina'
    },
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  website: {
    type: String,
    trim: true
  },
  type: {
    type: String,
    enum: ['hospital', 'clinic', 'medical_center', 'specialized_center'],
    default: 'clinic'
  },
  specialties: [{
    type: String,
    trim: true
  }],
  services: [{
    type: String,
    trim: true
  }],
  operatingHours: {
    monday: {
      open: String,
      close: String,
      closed: { type: Boolean, default: false }
    },
    tuesday: {
      open: String,
      close: String,
      closed: { type: Boolean, default: false }
    },
    wednesday: {
      open: String,
      close: String,
      closed: { type: Boolean, default: false }
    },
    thursday: {
      open: String,
      close: String,
      closed: { type: Boolean, default: false }
    },
    friday: {
      open: String,
      close: String,
      closed: { type: Boolean, default: false }
    },
    saturday: {
      open: String,
      close: String,
      closed: { type: Boolean, default: true }
    },
    sunday: {
      open: String,
      close: String,
      closed: { type: Boolean, default: true }
    }
  },
  amenities: [{
    type: String,
    trim: true
  }],
  insurance: [{
    type: String,
    trim: true
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Índices para optimizar consultas
clinicSchema.index({ name: 1 });
clinicSchema.index({ 'address.city': 1 });
clinicSchema.index({ type: 1 });
clinicSchema.index({ isActive: 1 });

module.exports = mongoose.model('Clinic', clinicSchema);
