const User = require('../models/User');

function transactionalEmailsEnabled() {
  return String(process.env.EMAIL_APPOINTMENT_NOTIFICATIONS || '1').trim() !== '0';
}

/**
 * @param {import('./emailService')} emailService
 * @param {string|import('mongoose').Types.ObjectId} professionalUserId
 * @param {'new_booking_request'|'cancelled_by_client'|'rescheduled_by_client'} kind
 * @param {Record<string, unknown>} doc - ExpoAppointment
 * @param {Record<string, unknown>} [options]
 */
async function notifyProfessionalByEmail(emailService, professionalUserId, kind, doc, options = {}) {
  if (!transactionalEmailsEnabled()) return;
  if (!emailService || !emailService.transporter) return;

  const pid = professionalUserId != null ? String(professionalUserId) : '';
  if (!pid) return;

  try {
    const pro = await User.findById(pid).select('email preferences fullName').lean();
    if (!pro || !pro.email) return;

    const emailPref =
      pro.preferences && pro.preferences.notifications && pro.preferences.notifications.email;
    if (emailPref === false) return;

    const patientName = String(options.clientName || doc.patientName || 'Paciente');
    const service = String(doc.service || options.service || 'Servicio');
    const dateStr = String(doc.date || options.date || '');
    const timeStr = String(doc.time || options.time || '');

    switch (kind) {
      case 'new_booking_request':
        await emailService.sendProfessionalNewBookingEmail(pro, {
          patientName,
          service,
          date: dateStr,
          time: timeStr,
          notes: doc.notes != null ? String(doc.notes) : '',
          requiresDeposit: Boolean(options.requiresDeposit),
          depositAmount: options.depositAmount,
          appointmentId: String(doc._id || ''),
        });
        break;
      case 'cancelled_by_client':
        await emailService.sendProfessionalPatientCancelledEmail(pro, {
          patientName,
          service,
          date: dateStr,
          time: timeStr,
        });
        break;
      case 'rescheduled_by_client':
        await emailService.sendProfessionalPatientRescheduledEmail(pro, {
          patientName,
          service,
          previousDate: String(options.previousDate || ''),
          previousTime: String(options.previousTime || ''),
          newDate: String(options.newDate || dateStr),
          newTime: String(options.newTime || timeStr),
        });
        break;
      default:
        return;
    }
  } catch (e) {
    console.warn(`Email notifyProfessionalByEmail (${kind}):`, e && e.message ? e.message : e);
  }
}

module.exports = {
  notifyProfessionalByEmail,
  transactionalEmailsEnabled,
};
