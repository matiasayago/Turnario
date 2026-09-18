const Appointment = require('../models/Appointment');
const ExpoNotification = require('../models/ExpoNotification');
const User = require('../models/User');
const { parseAppointmentStartMs } = require('../utils/appointmentTime');

const REMINDER_STATUSES = ['confirmed', 'pending_payment'];
const WINDOW_MIN_HOURS = parseFloat(process.env.APPOINTMENT_REMINDER_WINDOW_MIN_HOURS || '0');
const WINDOW_MAX_HOURS = parseFloat(process.env.APPOINTMENT_REMINDER_WINDOW_MAX_HOURS || '25');
const WINDOW_MIN_MS = Math.max(0, WINDOW_MIN_HOURS) * 60 * 60 * 1000;
const WINDOW_MAX_MS = Math.max(WINDOW_MIN_HOURS, WINDOW_MAX_HOURS) * 60 * 60 * 1000;
const QUERY_LIMIT = parseInt(process.env.APPOINTMENT_REMINDER_QUERY_LIMIT || '800', 10);

/**
 * Recordatorio ~24h antes: crea ExpoNotification (y push vía post-save).
 */
async function runAppointment24hReminders() {
  const now = Date.now();
  const low = now + WINDOW_MIN_MS;
  const high = now + WINDOW_MAX_MS;

  const candidates = await Appointment.find({
    status: { $in: REMINDER_STATUSES },
    clientId: { $exists: true, $ne: null },
    $or: [{ reminder24hSentAt: null }, { reminder24hSentAt: { $exists: false } }],
  })
    .limit(Number.isFinite(QUERY_LIMIT) ? QUERY_LIMIT : 800)
    .select(
      'date time clientId professionalId status service professionalName patientName'
    )
    .lean();

  let sent = 0;

  for (const apt of candidates) {
    const startMs = parseAppointmentStartMs(apt.date, apt.time);
    if (startMs == null || startMs < low || startMs > high) continue;

    const clientId = String(apt.clientId);
    const user = await User.findById(clientId)
      .select('preferences fullName')
      .lean();
    if (!user) continue;

    const remindersOff =
      user.preferences &&
      user.preferences.notifications &&
      user.preferences.notifications.appointmentReminders === false;
    if (remindersOff) continue;

    const claimed = await Appointment.findOneAndUpdate(
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
    const hoursToStart = Math.max(0, Math.round((startMs - now) / (60 * 60 * 1000)));
    const isSameDay = String(dateStr) === new Date(now).toISOString().slice(0, 10);
    const message = isSameDay
      ? `Hoy tenés ${svc} con ${profName} (${dateStr} a las ${timeHead}).`
      : `Tenés ${svc} con ${profName} (${dateStr} a las ${timeHead}) en aproximadamente ${hoursToStart} h.`;

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
      sent += 1;
    } catch (e) {
      console.error('appointment24hReminderJob: ExpoNotification.create', e.message || e);
      await Appointment.updateOne({ _id: apt._id }, { $unset: { reminder24hSentAt: 1 } }).catch(
        () => {}
      );
    }
  }

  console.log(
    `📅 appointment24hReminderJob: enviados=${sent}, escaneados=${candidates.length}, ventana=${WINDOW_MIN_HOURS}-${WINDOW_MAX_HOURS}h`
  );
  return { sent, scanned: candidates.length };
}

module.exports = { runAppointment24hReminders };
