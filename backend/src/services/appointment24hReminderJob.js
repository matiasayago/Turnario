const ExpoAppointment = require('../models/ExpoAppointment');
const ExpoNotification = require('../models/ExpoNotification');
const User = require('../models/User');
const { parseExpoAppointmentStartMs } = require('../utils/expoAppointmentTime');
const { sendExpoPushBatch } = require('./expoPush');
const { notifyClientByWhatsApp } = require('./whatsappAppointmentNotify');
const { notifyClientByEmail } = require('./emailAppointmentNotify');

/** Citas para las que tiene sentido recordar al cliente (turno “firme” o pendiente de pago de seña). */
const REMINDER_STATUSES = ['confirmed', 'pending_payment'];

/** Ventana ~24 h antes del inicio (margen ±1 h por el intervalo del job). */
const WINDOW_MIN_MS = 23 * 60 * 60 * 1000;
const WINDOW_MAX_MS = 25 * 60 * 60 * 1000;

const QUERY_LIMIT = parseInt(process.env.APPOINTMENT_REMINDER_QUERY_LIMIT || '800', 10);

/**
 * Busca citas Expo con inicio entre now+23h y now+25h, respeta preferencias del cliente,
 * marca idempotencia y crea ExpoNotification + push opcional.
 * @param {{ notificationSocket?: { sendToUser?: (uid: string, ev: string, data: unknown) => boolean }, emailService?: { transporter?: unknown, sendAppointmentReminder?: Function } }} ctx
 */
async function runAppointment24hReminders(ctx) {
  const notificationSocket = ctx && ctx.notificationSocket;
  const emailService = ctx && ctx.emailService;
  const now = Date.now();
  const low = now + WINDOW_MIN_MS;
  const high = now + WINDOW_MAX_MS;

  const candidates = await ExpoAppointment.find({
    status: { $in: REMINDER_STATUSES },
    clientId: { $exists: true, $ne: null },
    $or: [{ reminder24hSentAt: null }, { reminder24hSentAt: { $exists: false } }],
  })
    .limit(Number.isFinite(QUERY_LIMIT) ? QUERY_LIMIT : 800)
    .select(
      'date time clientId professionalId status service professionalName patientName depositAmount'
    )
    .lean();

  let sent = 0;

  for (const apt of candidates) {
    const startMs = parseExpoAppointmentStartMs(apt.date, apt.time);
    if (startMs == null || startMs < low || startMs > high) continue;

    const clientId = String(apt.clientId);
    const user = await User.findById(clientId)
      .select('preferences fullName phone expoPushTokens')
      .lean();
    if (!user) continue;

    const remindersOff =
      user.preferences &&
      user.preferences.notifications &&
      user.preferences.notifications.appointmentReminders === false;
    if (remindersOff) continue;

    const pushOff =
      user.preferences &&
      user.preferences.notifications &&
      user.preferences.notifications.push === false;

    const claimed = await ExpoAppointment.findOneAndUpdate(
      {
        _id: apt._id,
        $or: [{ reminder24hSentAt: null }, { reminder24hSentAt: { $exists: false } }],
      },
      { $set: { reminder24hSentAt: new Date() } },
      { new: true }
    );
    if (!claimed) continue;

    const svc = String(apt.service || 'tu turno');
    const profName = String(apt.professionalName || 'tu profesional');
    const dateStr = String(apt.date || '').split('T')[0];
    const timeHead = String(apt.time || '').split(/\s+/)[0];
    const title = 'Recordatorio de cita';
    const message = `Mañana tenés ${svc} con ${profName} (${dateStr} a las ${timeHead}).`;

    try {
      await ExpoNotification.create({
        recipientId: apt.clientId,
        senderId: apt.professionalId,
        type: 'reminder',
        title,
        message,
        data: {
          appointmentId: String(apt._id),
          service: svc,
          date: dateStr,
          time: timeHead,
          professionalName: profName,
          professionalId: String(apt.professionalId || ''),
          clientId,
        },
      });
      void notifyClientByWhatsApp(apt.clientId, 'reminder_24h', [svc, profName, dateStr, timeHead]);
      void notifyClientByEmail(emailService, apt.clientId, 'reminder_24h', apt, {
        professionalName: profName,
      });
    } catch (e) {
      console.error('appointment24hReminderJob: ExpoNotification.create', e.message || e);
      await ExpoAppointment.updateOne({ _id: apt._id }, { $unset: { reminder24hSentAt: 1 } }).catch(
        () => {}
      );
      continue;
    }

    if (notificationSocket && typeof notificationSocket.sendToUser === 'function') {
      notificationSocket.sendToUser(clientId, 'expo_notification_refresh', {
        type: 'reminder',
        appointmentId: String(apt._id),
      });
    }

    const tokens = Array.isArray(user.expoPushTokens)
      ? [...new Set(user.expoPushTokens.map((t) => (t && t.token ? String(t.token) : '')).filter(Boolean))]
      : [];
    if (tokens.length && !pushOff) {
      await sendExpoPushBatch({
        tokens,
        title,
        body: message,
        data: {
          type: 'reminder',
          appointmentId: String(apt._id),
        },
      });
    }

    sent += 1;
  }

  if (sent > 0) {
    console.log(`📅 appointment24hReminderJob: ${sent} recordatorio(s) 24h enviados`);
  }
  return { sent, scanned: candidates.length };
}

module.exports = { runAppointment24hReminders };
