const mongoose = require('mongoose');

const clinicalSessionSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    professionalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      required: true,
      unique: true,
      index: true,
    },
    professionalName: {
      type: String,
      trim: true,
      default: 'Profesional',
    },
    serviceLabel: {
      type: String,
      trim: true,
      default: 'Consulta',
    },
    appointmentDateYmd: {
      type: String,
      required: true,
      trim: true,
    },
    appointmentTime: {
      type: String,
      trim: true,
      default: '',
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    treatmentSummary: {
      type: String,
      trim: true,
      default: '',
    },
    recordedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

clinicalSessionSchema.index({ patientId: 1, appointmentDateYmd: -1, recordedAt: -1 });
clinicalSessionSchema.index({ professionalId: 1, patientId: 1 });

module.exports = mongoose.model('ClinicalSession', clinicalSessionSchema);
