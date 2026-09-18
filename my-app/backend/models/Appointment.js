const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  professionalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  serviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: false,
    default: null
  },
  /** Nombre del servicio (denormalizado para listados de la app) */
  service: {
    type: String,
    trim: true,
    default: ''
  },
  /** Nombre del profesional (denormalizado) */
  professionalName: {
    type: String,
    trim: true,
    default: ''
  },
  patientName: {
    type: String,
    trim: true,
    default: ''
  },
  patientEmail: {
    type: String,
    trim: true,
    default: ''
  },
  patientPhone: {
    type: String,
    trim: true,
    default: ''
  },
  clinicId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Clinic',
    default: null
  },
  date: {
    type: String,
    required: true
  },
  time: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    required: true,
    default: 30 // minutos
  },
  status: {
    type: String,
    enum: [
      'pending',
      'pending_approval',
      'pending_payment',
      'confirmed',
      'completed',
      'cancelled',
      'no_show',
      'rejected',
    ],
    default: 'pending'
  },
  notes: {
    type: String,
    default: ''
  },
  clientNotes: {
    type: String,
    default: ''
  },
  professionalNotes: {
    type: String,
    default: ''
  },
  price: {
    type: Number,
    required: true,
    default: 0
  },
  /** Seña a abonar (ARS) cuando status = pending_payment */
  depositAmount: {
    type: Number,
    default: 0,
    min: 0,
  },
  paymentStatus: {
    type: String,
    enum: [
      'pending',
      'paid',
      'approved',
      'refunded',
      'rejected',
      'cancelled',
      'failure',
      'in_process',
      'not_required',
    ],
    default: 'pending'
  },
  paymentId: {
    type: String,
    default: null
  },
  mpPaymentId: {
    type: String,
    default: null,
  },
  mpPreferenceId: {
    type: String,
    default: null,
  },
  /** Idempotencia del recordatorio ~24h al cliente */
  reminder24hSentAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true
});

// Índices para optimizar consultas
appointmentSchema.index({ clientId: 1 });
appointmentSchema.index({ professionalId: 1 });
appointmentSchema.index({ date: 1 });
appointmentSchema.index({ status: 1 });
appointmentSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Appointment', appointmentSchema);
