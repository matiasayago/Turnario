const User = require('../models/User');

/**
 * Los documentos Mongoose no exponen los paths al usar `{...doc}`; fecha/hora/servicio quedan undefined y el mail falla.
 * @param {unknown} doc
 * @returns {Record<string, unknown>}
 */
function toPlainAppointmentDoc(doc) {
  if (!doc || typeof doc !== 'object') return {};
  if (typeof doc.toObject === 'function') {
    try {
      return doc.toObject({ virtuals: false });
    } catch {
      /* continuar */
    }
  }
  if (typeof doc.toJSON === 'function') {
    try {
      return doc.toJSON();
    } catch {
      /* continuar */
    }
  }
  return { ...doc };
}

/**
 * @param {import('../services/emailService')} emailService
 * @param {Record<string, unknown>} doc - ExpoAppointment (date, time, service, notes, professionalName, …)
 * @param {string} professionalName
 */
function toAppointmentRecord(doc, professionalName) {
  const clinicNameRaw =
    doc && doc.clinicName != null && String(doc.clinicName).trim()
      ? String(doc.clinicName).trim()
      : process.env.EMAIL_DEFAULT_CLINIC_NAME || 'Turnario';
  const clinicAddressRaw =
    doc && doc.clinicAddress != null && String(doc.clinicAddress).trim()
      ? String(doc.clinicAddress).trim()
      : process.env.EMAIL_DEFAULT_CLINIC_ADDRESS || '—';
  const clinicPhoneRaw =
    doc && doc.clinicPhone != null && String(doc.clinicPhone).trim()
      ? String(doc.clinicPhone).trim()
      : process.env.EMAIL_DEFAULT_CLINIC_PHONE || '—';
  return {
    service: { name: String(doc.service || 'Servicio') },
    professional: {
      fullName: String(professionalName || doc.professionalName || 'Profesional'),
    },
    clinic: {
      name: clinicNameRaw,
      address: clinicAddressRaw,
      phone: clinicPhoneRaw,
    },
    date: doc.date,
    time: doc.time,
    notes: doc.notes || '',
  };
}

function formatAddress(addressObj) {
  if (!addressObj || typeof addressObj !== 'object') return '';
  const parts = [
    addressObj.street,
    addressObj.city,
    addressObj.state,
    addressObj.zipCode,
    addressObj.country,
  ]
    .map((v) => (v == null ? '' : String(v).trim()))
    .filter(Boolean);
  return parts.join(', ');
}

function appointmentEmailsGloballyEnabled() {
  return String(process.env.EMAIL_APPOINTMENT_NOTIFICATIONS || '1').trim() !== '0';
}

/**
 * Misma familia de eventos que WhatsApp: confirma, rechazo, cancelación por profesional, recordatorio ~24h.
 * Respeta preferences.notifications.email y, en recordatorio, appointmentReminders.
 *
 * @param {import('../services/emailService')} emailService
 * @param {string|import('mongoose').Types.ObjectId} clientUserId
 * @param {'appointment_confirmed'|'appointment_rejected'|'appointment_cancelled_by_professional'|'reminder_24h'} kind
 * @param {Record<string, unknown>} doc
 * @param {{ professionalName?: string }} [options]
 */
async function notifyClientByEmail(emailService, clientUserId, kind, doc, options = {}) {
  if (!appointmentEmailsGloballyEnabled()) return;
  if (!emailService || !emailService.transporter) return;

  const uid = clientUserId != null ? String(clientUserId) : '';
  if (!uid) return;

  const plainDoc = toPlainAppointmentDoc(doc);

  try {
    const user = await User.findById(uid).select('email preferences fullName').lean();
    if (!user) return;

    const emailPref =
      user.preferences && user.preferences.notifications && user.preferences.notifications.email;
    if (emailPref === false) return;

    if (kind === 'reminder_24h') {
      const remindersOff =
        user.preferences &&
        user.preferences.notifications &&
        user.preferences.notifications.appointmentReminders === false;
      if (remindersOff) return;
    }

    const fromProfile = user.email && String(user.email).trim();
    const fromBooking =
      plainDoc && plainDoc.patientEmail != null && String(plainDoc.patientEmail).trim()
        ? String(plainDoc.patientEmail).trim()
        : '';
    const destEmail = fromProfile || fromBooking;
    if (!destEmail) return;

    const recipient = { ...user, email: destEmail };

    const professionalName = options.professionalName || plainDoc.professionalName;

    let professionalClinicName = '';
    let professionalClinicAddress = '';
    let professionalClinicPhone = '';
    if (plainDoc && plainDoc.professionalId) {
      const professional = await User.findById(String(plainDoc.professionalId))
        .select('fullName phone businessInfo.businessName address')
        .lean();
      if (professional) {
        professionalClinicName =
          professional.businessInfo &&
          professional.businessInfo.businessName != null &&
          String(professional.businessInfo.businessName).trim()
            ? String(professional.businessInfo.businessName).trim()
            : '';
        professionalClinicAddress = formatAddress(professional.address);
        professionalClinicPhone =
          professional.phone != null && String(professional.phone).trim()
            ? String(professional.phone).trim()
            : '';
      }
    }

    const appointment = toAppointmentRecord(
      {
        ...plainDoc,
        clinicName: professionalClinicName,
        clinicAddress: professionalClinicAddress,
        clinicPhone: professionalClinicPhone,
      },
      professionalName
    );

    switch (kind) {
      case 'appointment_confirmed':
        await emailService.sendAppointmentConfirmation(appointment, recipient);
        break;
      case 'appointment_rejected':
        await emailService.sendAppointmentRejection(appointment, recipient);
        break;
      case 'appointment_cancelled_by_professional':
        await emailService.sendAppointmentCancellation(
          appointment,
          recipient,
          'El profesional canceló esta cita.'
        );
        break;
      case 'reminder_24h':
        await emailService.sendAppointmentReminder(appointment, recipient);
        break;
      default:
        return;
    }
  } catch (e) {
    console.warn(
      `Email notifyClientByEmail (${kind}):`,
      e && e.message ? e.message : e
    );
  }
}

module.exports = {
  notifyClientByEmail,
  appointmentEmailsGloballyEnabled,
};
