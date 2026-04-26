const mongoose = require('mongoose');
const User = require('./User');
const { sendExpoPushBatch } = require('../services/expoPush');

/**
 * Notificaciones in-app para la app Expo (solicitudes de cita, confirmaciones).
 * Separado del modelo Notification grande del dominio legacy.
 */
const expoNotificationSchema = new mongoose.Schema(
  {
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    type: {
      type: String,
      required: true,
      enum: [
        'appointment_request',
        'appointment_confirmed',
        'appointment_cancelled',
        'appointment_cancelled_by_client',
        'appointment_rescheduled_by_client',
        'appointment_cancelled_by_professional',
        'appointment_rescheduled_by_professional',
        'reminder',
        'payment_required',
        'chat_message',
        'system',
        'password_reset',
      ],
    },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    read: { type: Boolean, default: false },
    data: {
      appointmentId: { type: String, trim: true },
      service: String,
      date: String,
      time: String,
      patientName: String,
      notes: String,
      professionalId: String,
      professionalName: String,
      clientId: String,
      depositAmount: String,
      chatConversationKey: String,
      chatMessageId: String,
      /** Token de recuperación (solo type password_reset); no mostrar en UI pública */
      resetToken: { type: String, trim: true },
      kind: { type: String, trim: true },
    },
  },
  { timestamps: true }
);

expoNotificationSchema.index({ recipientId: 1, createdAt: -1 });
expoNotificationSchema.index({ recipientId: 1, read: 1 });

/** Enviar push al dispositivo cuando se crea una notificación in-app. */
expoNotificationSchema.post('save', function onExpoNotificationSaved(doc) {
  setImmediate(async () => {
    try {
      if (!doc || !doc.recipientId) return;

      const user = await User.findById(doc.recipientId)
        .select('expoPushTokens preferences.notifications.push')
        .lean();
      if (!user) return;

      const pushEnabled = user.preferences?.notifications?.push !== false;
      if (!pushEnabled) return;

      const tokens = Array.isArray(user.expoPushTokens)
        ? [
            ...new Set(
              user.expoPushTokens
                .map((entry) => (entry && entry.token ? String(entry.token).trim() : ''))
                .filter(Boolean)
            ),
          ]
        : [];
      if (!tokens.length) {
        console.log(
          `Expo push omitido: usuario ${String(doc.recipientId)} sin expoPushTokens`
        );
        return;
      }

      const result = await sendExpoPushBatch({
        tokens,
        title: String(doc.title || 'Turnario'),
        body: String(doc.message || ''),
        data: {
          type: String(doc.type || 'system'),
          notificationId: String(doc._id || ''),
          appointmentId: String(doc.data?.appointmentId || ''),
          chatConversationKey: String(doc.data?.chatConversationKey || ''),
          passwordResetToken: String(doc.data?.resetToken || ''),
          kind: String(doc.data?.kind || ''),
        },
      });
      if (!result?.ok) {
        console.warn(
          `Expo push con errores para usuario ${String(doc.recipientId)}:`,
          result?.errors || result
        );
      } else {
        console.log(
          `Expo push enviado a ${tokens.length} token(s) para usuario ${String(doc.recipientId)}`
        );
      }
    } catch (error) {
      console.warn('ExpoNotification post-save push:', error?.message || error);
    }
  });
});

module.exports =
  mongoose.models.ExpoNotification ||
  mongoose.model('ExpoNotification', expoNotificationSchema);
