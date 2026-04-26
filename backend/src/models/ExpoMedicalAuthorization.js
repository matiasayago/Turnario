const mongoose = require('mongoose');

const scopeSchema = new mongoose.Schema(
  {
    consultations: { type: Boolean, default: true },
    documents: { type: Boolean, default: false },
    prescriptions: { type: Boolean, default: false },
    treatments: { type: Boolean, default: false },
    labResults: { type: Boolean, default: false },
    imaging: { type: Boolean, default: false },
  },
  { _id: false }
);

const expoMedicalAuthorizationSchema = new mongoose.Schema(
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
    professionalName: { type: String, default: '', trim: true },
    patientName: { type: String, default: '', trim: true },
    authorizationType: {
      type: String,
      enum: ['full_access', 'limited_access', 'consultation_only'],
      default: 'limited_access',
    },
    status: {
      type: String,
      enum: ['pending', 'granted', 'revoked'],
      default: 'pending',
    },
    grantedBy: {
      type: String,
      enum: ['patient', 'system', 'admin'],
      default: 'patient',
    },
    scope: { type: scopeSchema, default: () => ({}) },
    notes: { type: String, maxlength: 1000 },
    grantedAt: Date,
    revokedAt: Date,
    expiresAt: Date,
    isActive: { type: Boolean, default: false },
  },
  { timestamps: true }
);

expoMedicalAuthorizationSchema.index(
  { professionalId: 1, patientId: 1, status: 1 },
  { name: 'expo_med_auth_prof_patient_status' }
);

module.exports = mongoose.model('ExpoMedicalAuthorization', expoMedicalAuthorizationSchema);
