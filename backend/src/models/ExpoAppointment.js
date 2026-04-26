const mongoose = require('mongoose');

/**
 * Citas creadas desde la app Expo (cliente/profesional) con payload flexible.
 * No reemplaza el modelo Appointment completo del dominio.
 */
const expoAppointmentSchema = new mongoose.Schema(
  {
    professionalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    service: { type: String, trim: true, default: '' },
    date: { type: String, required: true },
    time: { type: String, required: true },
    duration: { type: Number, default: 30 },
    patientName: { type: String, default: '' },
    patientPhone: { type: String, default: '' },
    patientEmail: { type: String, default: '' },
    notes: { type: String, default: '' },
    status: { type: String, default: 'confirmed' },
    totalAmount: { type: Number, default: 0 },
    professionalName: { type: String, default: '' },
    /** Seña / Mercado Pago */
    depositAmount: { type: Number, default: 0 },
    paymentStatus: {
      type: String,
      default: 'not_required',
      enum: [
        'not_required',
        'pending',
        'approved',
        'rejected',
        'cancelled',
        'in_process',
      ],
    },
    mpPreferenceId: { type: String, default: '' },
    mpPaymentId: { type: String, default: '' },
    /** Seteado cuando el job de recordatorio 24 h ya notificó al cliente (idempotencia). */
    reminder24hSentAt: { type: Date, default: null },
  },
  { timestamps: true }
);

expoAppointmentSchema.index({ reminder24hSentAt: 1, status: 1, date: 1 });

module.exports =
  mongoose.models.ExpoAppointment ||
  mongoose.model('ExpoAppointment', expoAppointmentSchema);
