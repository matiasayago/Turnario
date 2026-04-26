const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const morgan = require('morgan');
require('dotenv').config();

// Importar servicios
const NotificationSocket = require('./websocket/notificationSocket');
const EmailService = require('./services/emailService');
const MercadoPagoService = require('./services/mercadopagoService');
const GeolocationService = require('./services/geolocationService');

// Importar rutas
const userRoutes = require('./routes/users');
const appointmentRoutes = require('./routes/appointments');
const serviceRoutes = require('./routes/services');
const clinicRoutes = require('./routes/clinics');
const notificationRoutes = require('./routes/notifications');
const calendarRoutes = require('./routes/calendar');
const availabilityRestRoutes = require('./routes/availabilityRest');
const authRoutes = require('./routes/auth');
const dateScheduleRoutes = require('./routes/dateSchedule');
const professionalsDirectoryRoutes = require('./routes/professionalsDirectory');
const expoPaymentsRoutes = require('./routes/expoPayments');
const medicalAuthorizationsRoutes = require('./routes/medicalAuthorizations');
const subscriptionsGooglePlayRoutes = require('./routes/subscriptionsGooglePlay');
const ExpoAppointment = require('./models/ExpoAppointment');
const ExpoNotification = require('./models/ExpoNotification');
const ExpoChatMessage = require('./models/ExpoChatMessage');
const User = require('./models/User');
const { authenticateToken } = require('./middleware/auth');
const { getCorsOriginOption } = require('./config/corsOrigins');
const { parseExpoAppointmentStartMs } = require('./utils/expoAppointmentTime');
const { runAppointment24hReminders } = require('./services/appointment24hReminderJob');
const { notifyClientByWhatsApp } = require('./services/whatsappAppointmentNotify');
const { notifyClientByEmail } = require('./services/emailAppointmentNotify');
const { notifyProfessionalByEmail } = require('./services/emailProfessionalNotify');
const { isEnabled: isWhatsAppCloudEnabled, sendTemplateMessage: sendWhatsAppTemplateMessage } = require('./services/whatsappCloud');
const {
  isEnabled: isTwilioWhatsAppEnabled,
  sendContentTemplateMessage: sendTwilioWhatsAppTemplate,
  sendSessionTextMessage: sendTwilioWhatsAppSessionText,
} = require('./services/twilioWhatsApp');

function escapeRegexPath(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Clave estable para chat 1:1 entre dos ObjectIds. */
function makeExpoChatConversationKey(idA, idB) {
  const a = String(idA);
  const b = String(idB);
  return a < b ? `${a}_${b}` : `${b}_${a}`;
}

const CLIENT_CANCEL_MIN_HOURS_MS = 48 * 60 * 60 * 1000;

const app = express();
const PORT = process.env.PORT || 3001;
/** Escuchar en todas las interfaces para que la app en el teléfono llegue por la IP LAN (p. ej. 192.168.0.11). */
const HOST = process.env.HOST || '0.0.0.0';

// Crear servidor HTTP para WebSockets
const server = require('http').createServer(app);

// Inicializar WebSockets
const notificationSocket = new NotificationSocket(server);

// Inicializar servicios
const emailService = EmailService.getSingleton();
const mercadopagoService = new MercadoPagoService();
const geolocationService = new GeolocationService();

// Middleware de seguridad
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Rate limiting (429). En desarrollo el límite bajo bloqueaba el login tras muchas llamadas /api.
if (process.env.TRUST_PROXY === '1') {
  app.set('trust proxy', 1);
}

const isProd = process.env.NODE_ENV === 'production';
const rateWindowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || String(15 * 60 * 1000), 10);
const rateMaxRaw = process.env.RATE_LIMIT_MAX;
const rateMax = rateMaxRaw
  ? parseInt(rateMaxRaw, 10)
  : isProd
    ? 600
    : 8000;

function shouldSkipGlobalRateLimit(req) {
  const url = `${req.originalUrl || req.url || ''}`;
  if (url.includes('/api/v1/auth')) return true;
  if (/\/api\/v1\/health/i.test(url) || url.startsWith('/api/health')) return true;
  if (process.env.DISABLE_API_RATE_LIMIT === '1') return true;
  return false;
}

const limiter = rateLimit({
  windowMs: rateWindowMs,
  max: rateMax,
  standardHeaders: true,
  legacyHeaders: false,
  skip: shouldSkipGlobalRateLimit,
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      message:
        'Demasiadas peticiones desde esta IP. Esperá unos minutos e intentá de nuevo.',
      error: 'RATE_LIMIT_EXCEEDED',
    });
  },
});

app.use('/api/', limiter);

// Middleware
app.use(compression());
app.use(morgan('combined'));
app.use(
  cors({
    origin: getCorsOriginOption(),
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Conectar a MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/turnario', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ Conectado a MongoDB');
  if (process.env.DISABLE_APPOINTMENT_REMINDER_JOB === '1') {
    console.log('📅 Recordatorios 24h: desactivados (DISABLE_APPOINTMENT_REMINDER_JOB=1)');
    return;
  }
  const rawMs = parseInt(process.env.APPOINTMENT_REMINDER_INTERVAL_MS || `${15 * 60 * 1000}`, 10);
  const intervalMs =
    Number.isFinite(rawMs) && rawMs >= 60 * 1000 ? rawMs : 15 * 60 * 1000;
  const tick = () => {
    runAppointment24hReminders({ notificationSocket, emailService }).catch((err) =>
      console.error('appointment24hReminderJob:', err.message || err)
    );
  };
  setTimeout(tick, 45 * 1000);
  setInterval(tick, intervalMs);
  console.log(
    `📅 Recordatorios 24h: job cada ${Math.round(intervalMs / 60000)} min (ventana ~24h antes del turno)`
  );
})
.catch((error) => {
  console.error('❌ Error conectando a MongoDB:', error);
  process.exit(1);
});

// Middleware para inyectar servicios en req
app.use((req, res, next) => {
  req.notificationSocket = notificationSocket;
  req.emailService = emailService;
  req.mercadopagoService = mercadopagoService;
  req.geolocationService = geolocationService;
  next();
});

// Rutas de la API
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/professionals', professionalsDirectoryRoutes);
app.use('/api/v1/expo-payments', expoPaymentsRoutes);
app.use('/api/users', userRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/clinics', clinicRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/medical-authorizations', medicalAuthorizationsRoutes);
app.use('/api/subscriptions', subscriptionsGooglePlayRoutes);

// Ruta de pagos con MercadoPago
app.post('/api/payments/create-preference', async (req, res) => {
  try {
    const { appointmentId, amount, description } = req.body;
    
    if (!appointmentId || !amount) {
      return res.status(400).json({ error: 'appointmentId y amount son requeridos' });
    }

    const preference = await mercadopagoService.createPaymentPreference({
      appointmentId,
      amount,
      description
    });

    res.json(preference);
  } catch (error) {
    console.error('Error creating payment preference:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Webhook de MercadoPago (IPN: body JSON o query legacy)
app.post('/api/payments/webhook', async (req, res) => {
  try {
    const b = req.body || {};
    let paymentId = null;
    if (b.type === 'payment' && b.data && b.data.id != null) {
      paymentId = String(b.data.id);
    } else if (req.query && req.query['data.id']) {
      paymentId = String(req.query['data.id']);
    } else if (req.query && req.query.type === 'payment' && req.query['data.id']) {
      paymentId = String(req.query['data.id']);
    } else if (req.query && req.query.topic === 'payment' && req.query.id) {
      paymentId = String(req.query.id);
    } else if (req.query && req.query.type === 'payment' && req.query.data_id) {
      paymentId = String(req.query.data_id);
    }

    if (!paymentId) {
      return res.status(200).send('ok');
    }

    const webhookResult = await mercadopagoService.processPaymentWebhookById(
      paymentId
    );

    if (webhookResult.verified && webhookResult.payment && notificationSocket) {
      const payment = webhookResult.payment;
      const ref = String(payment.externalReference || '');
      if (ref.startsWith('expo_')) {
        const aid = ref.replace(/^expo_/, '');
        const doc = await ExpoAppointment.findById(aid).select('clientId').lean();
        if (doc && doc.clientId) {
          notificationSocket.sendPaymentNotification(
            String(doc.clientId),
            payment.status === 'approved' ? 'payment_successful' : 'payment_failed',
            {
              amount: payment.transactionAmount,
              transactionId: payment.id,
              status: payment.status,
              appointmentId: aid,
            }
          );
        }
      } else if (ref && !ref.startsWith('expo_')) {
        notificationSocket.sendPaymentNotification(
          ref,
          payment.status === 'approved' ? 'payment_successful' : 'payment_failed',
          {
            amount: payment.transactionAmount,
            transactionId: payment.id,
            status: payment.status,
          }
        );
      }
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return res.status(200).send('ok');
  }
});

// Ruta de geolocalización
app.get('/api/geolocation/nearby-clinics', async (req, res) => {
  try {
    const { latitude, longitude, radius, specialty, clinicType, city, state } = req.query;
    
    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'latitude y longitude son requeridos' });
    }

    const location = { latitude: parseFloat(latitude), longitude: parseFloat(longitude) };
    const searchRadius = radius ? parseInt(radius) : null;
    const filters = { specialty, clinicType, city, state };

    const clinics = await geolocationService.findNearbyClinics(location, searchRadius, filters);
    
    res.json({
      success: true,
      data: clinics,
      count: clinics.length,
      location: location,
      radius: searchRadius || geolocationService.defaultRadius
    });
  } catch (error) {
    console.error('Error finding nearby clinics:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Ruta para obtener estadísticas de clínicas por área
app.get('/api/geolocation/clinic-stats', async (req, res) => {
  try {
    const { latitude, longitude, radius } = req.query;
    
    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'latitude y longitude son requeridos' });
    }

    const location = { latitude: parseFloat(latitude), longitude: parseFloat(longitude) };
    const searchRadius = radius ? parseInt(radius) : null;

    const stats = await geolocationService.getClinicStatsByArea(location, searchRadius);
    
    res.json({
      success: true,
      data: stats,
      location: location,
      radius: searchRadius || geolocationService.defaultRadius
    });
  } catch (error) {
    console.error('Error getting clinic stats:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Ruta para geocoding de direcciones
app.post('/api/geolocation/geocode', async (req, res) => {
  try {
    const { address } = req.body;
    
    if (!address) {
      return res.status(400).json({ error: 'address es requerido' });
    }

    const coordinates = await geolocationService.geocodeAddress(address);
    
    if (coordinates) {
      res.json({
        success: true,
        data: coordinates
      });
    } else {
      res.status(404).json({ error: 'No se pudo geocodificar la dirección' });
    }
  } catch (error) {
    console.error('Error geocoding address:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Ruta para enviar emails de prueba (sin JWT; solo entornos controlados / red local)
app.post('/api/email/send-test', async (req, res) => {
  try {
    if (!emailService.transporter) {
      return res.status(503).json({
        success: false,
        error:
          'Email no configurado. En desarrollo: EMAIL_USER + EMAIL_APP_PASSWORD (Gmail). En producción: SMTP_HOST, SMTP_USER, SMTP_PASS. Ver env.example.',
      });
    }
    const { to, template, data } = req.body;

    if (!to || !template) {
      return res.status(400).json({
        success: false,
        error:
          'to y template son requeridos. Ej.: template "welcome" con data: { userName, userType, loginUrl, supportEmail }',
      });
    }

    const result = await emailService.sendEmail(to, 'Email de prueba — Turnario', template, data || {});

    return res.json({
      success: true,
      message: 'Email enviado',
      data: result,
    });
  } catch (error) {
    console.error('Error sending test email:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Error interno del servidor',
    });
  }
});

// Ruta para obtener estadísticas de WebSockets
app.get('/api/websocket/stats', (req, res) => {
  try {
    const stats = notificationSocket.getConnectionStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting WebSocket stats:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Ruta para enviar notificación de prueba
app.post('/api/websocket/send-test', (req, res) => {
  try {
    const { userId, event, data } = req.body;
    
    if (!userId || !event) {
      return res.status(400).json({ error: 'userId y event son requeridos' });
    }

    const sent = notificationSocket.sendToUser(userId, event, data || {});
    
    res.json({
      success: true,
      message: sent ? 'Notificación enviada' : 'Usuario no conectado',
      data: { sent, userId, event }
    });
  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Registrar rutas del calendario
app.use('/api/v1/calendar', calendarRoutes);

// Disponibilidad (CRUD simple usado por la app Expo: settings, index, etc.)
app.use('/api/v1/availability', availabilityRestRoutes);

// Horarios por fecha (gestión de calendario / settings)
app.use('/api/v1/date-schedules', dateScheduleRoutes);

// Crear cita desde Expo (cliente elige profesional; sin exigir serviceId/clinicId del otro router)
app.post('/api/v1/appointments/create', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Base de datos no disponible',
      });
    }

    const {
      professionalId,
      clientId,
      service,
      date,
      time,
      duration,
      patientName,
      patientPhone,
      patientEmail,
      notes,
      status,
      totalAmount,
      professional,
      bookingSource,
    } = req.body;

    if (!professionalId || !date || !time) {
      return res.status(400).json({
        success: false,
        message: 'professionalId, date y time son obligatorios',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(String(professionalId))) {
      return res.status(400).json({
        success: false,
        message: 'professionalId debe ser un ObjectId válido de MongoDB',
      });
    }

    let clientOid = null;
    if (clientId && mongoose.Types.ObjectId.isValid(String(clientId))) {
      clientOid = clientId;
    }

    const dateStr = String(date).split('T')[0];
    const src = String(bookingSource || 'client').toLowerCase();
    /** Reserva hecha por el cliente desde la app → requiere confirmación del profesional */
    const isClientBooking = !!clientOid && src !== 'professional';
    /** Cita creada por el profesional: seña solo si el body la pide y el profesional tiene activo "Reservas online con seña". */
    const requireDepositProf =
      src === 'professional' &&
      clientOid &&
      profRequiresClientDeposit &&
      (req.body.requireDeposit === true || req.body.requireDeposit === 'true');
    /** Preferencia del profesional: seña en reservas online (solo lectura en DB; no se usa el body del cliente). */
    let profRequiresClientDeposit = true;
    try {
      const profUser = await User.findById(professionalId)
        .select('userType clientBookingRequiresDeposit')
        .lean();
      if (profUser && profUser.userType === 'professional') {
        const v = profUser.clientBookingRequiresDeposit;
        const disabled =
          v === false ||
          v === 'false' ||
          v === 0 ||
          v === '0' ||
          String(v).toLowerCase() === 'false';
        profRequiresClientDeposit = !disabled;
      }
    } catch (prefErr) {
      console.warn('appointments/create: preferencia seña profesional:', prefErr);
    }
    /** Cliente reserva desde la app con seña → pago antes de confirmar */
    const requireDepositClient = isClientBooking && profRequiresClientDeposit;
    const requireDeposit = requireDepositProf || requireDepositClient;
    const depositAmountVal = requireDeposit
      ? Math.max(1, Number(req.body.depositAmount) || 2000)
      : 0;

    let finalStatus;
    if (requireDepositProf || requireDepositClient) {
      finalStatus = 'pending_payment';
    } else if (isClientBooking) {
      finalStatus = 'pending_approval';
    } else if (status && String(status).trim()) {
      finalStatus = String(status);
    } else {
      finalStatus = 'confirmed';
    }

    const normalizeExpoTimeKey = (timeStr) => {
      if (!timeStr || typeof timeStr !== 'string') return '';
      const head = timeStr.split(/\s*[-–]\s*/)[0].trim();
      const m = head.match(/^(\d{1,2}):(\d{2})/);
      if (!m) return '';
      const h = String(Math.min(23, parseInt(m[1], 10))).padStart(2, '0');
      const min = String(Math.min(59, parseInt(m[2], 10))).padStart(2, '0');
      return `${h}:${min}`;
    };
    const requestedKey = normalizeExpoTimeKey(String(time));
    if (requestedKey) {
      const sameDay = await ExpoAppointment.find({
        professionalId,
        date: dateStr,
        status: { $nin: ['cancelled', 'rejected'] },
      })
        .select('time')
        .lean();
      const clash = sameDay.some((row) => normalizeExpoTimeKey(row.time) === requestedKey);
      if (clash) {
        return res.status(409).json({
          success: false,
          message: 'Ese horario ya está ocupado. Elegí otro turno.',
        });
      }
    }

    const doc = await ExpoAppointment.create({
      professionalId,
      clientId: clientOid || undefined,
      service: service != null ? String(service) : '',
      date: dateStr,
      time: String(time),
      duration: typeof duration === 'number' && duration > 0 ? duration : 30,
      patientName: patientName != null ? String(patientName) : '',
      patientPhone: patientPhone != null ? String(patientPhone) : '',
      patientEmail: patientEmail != null ? String(patientEmail) : '',
      notes: notes != null ? String(notes) : '',
      status: finalStatus,
      totalAmount: typeof totalAmount === 'number' ? totalAmount : 0,
      professionalName: professional != null ? String(professional) : '',
      depositAmount: depositAmountVal,
      paymentStatus: requireDeposit ? 'pending' : 'not_required',
    });

    if (isClientBooking) {
      try {
        const clientUser = clientOid
          ? await User.findById(clientOid).select('fullName').lean()
          : null;
        const clientName =
          (patientName && String(patientName).trim()) ||
          (clientUser && clientUser.fullName) ||
          'Cliente';
        const svcLabel = service != null ? String(service) : 'turno';
        const profMsg = requireDepositClient
          ? `${clientName} reservó "${svcLabel}" el ${dateStr} a las ${time} con seña ($${depositAmountVal}). La cita se confirma cuando pague en la app.`
          : `${clientName} solicita "${svcLabel}" el ${dateStr} a las ${time}. Confirmá o rechazá en Notificaciones.`;
        await ExpoNotification.create({
          recipientId: professionalId,
          senderId: clientOid,
          type: 'appointment_request',
          title: requireDepositClient ? 'Reserva con seña pendiente de pago' : 'Nueva solicitud de cita',
          message: profMsg,
          data: {
            appointmentId: String(doc._id),
            service: service != null ? String(service) : '',
            date: dateStr,
            time: String(time),
            patientName: clientName,
            notes: notes != null ? String(notes) : '',
            professionalId: String(professionalId),
            clientId: clientOid ? String(clientOid) : '',
          },
        });
        const sock = req.notificationSocket;
        if (sock && typeof sock.sendToUser === 'function') {
          sock.sendToUser(String(professionalId), 'expo_appointment_request', {
            appointmentId: String(doc._id),
            service,
            date: dateStr,
            time,
            patientName: clientName,
          });
        }

        void notifyProfessionalByEmail(emailService, professionalId, 'new_booking_request', doc, {
          clientName: clientName,
          requiresDeposit: requireDepositClient,
          depositAmount: depositAmountVal,
        });

        if (requireDepositClient && clientOid) {
          const profDoc = await User.findById(professionalId).select('fullName').lean();
          const profName =
            (professional && String(professional).trim()) ||
            (profDoc && profDoc.fullName) ||
            'Tu profesional';
          await ExpoNotification.create({
            recipientId: clientOid,
            senderId: professionalId,
            type: 'payment_required',
            title: 'Pago de seña requerido',
            message: `Completá el pago de la seña de $${depositAmountVal} para "${svcLabel}" el ${dateStr} a las ${time} con ${profName}.`,
            data: {
              appointmentId: String(doc._id),
              depositAmount: String(depositAmountVal),
              service: svcLabel,
              date: dateStr,
              time: String(time),
              professionalName: profName,
              professionalId: String(professionalId),
              clientId: String(clientOid),
              patientName: clientName,
              notes: notes != null ? String(notes) : '',
            },
          });
          if (sock && typeof sock.sendToUser === 'function') {
            sock.sendToUser(String(clientOid), 'expo_payment_required', {
              appointmentId: String(doc._id),
              depositAmount: depositAmountVal,
            });
          }
        }
      } catch (notifyErr) {
        console.error('Error creando notificación solicitud de cita:', notifyErr);
      }
    } else if (src === 'professional') {
      // Cita creada por el profesional → pago de seña o cita confirmada
      try {
        let recipientOid = clientOid;
        if (!recipientOid && patientEmail && String(patientEmail).trim()) {
          const emailNorm = String(patientEmail).trim().toLowerCase();
          const u = await User.findOne({
            email: new RegExp(`^${escapeRegexPath(emailNorm)}$`, 'i'),
            userType: 'client',
          })
            .select('_id')
            .lean();
          if (u && u._id) recipientOid = u._id;
        }

        if (recipientOid) {
          const profDoc = await User.findById(professionalId).select('fullName').lean();
          const profName =
            (professional && String(professional).trim()) ||
            (profDoc && profDoc.fullName) ||
            'Tu profesional';
          const svc = service != null ? String(service) : 'turno';

          if (requireDepositProf) {
            await ExpoNotification.create({
              recipientId: recipientOid,
              senderId: professionalId,
              type: 'payment_required',
              title: 'Pago de seña requerido',
              message: `${profName} solicitó el pago de la seña de $${depositAmountVal} para "${svc}" el ${dateStr} a las ${time}. Abrí la app y pagá con Mercado Pago para confirmar.`,
              data: {
                appointmentId: String(doc._id),
                depositAmount: String(depositAmountVal),
                service: svc,
                date: dateStr,
                time: String(time),
                professionalName: profName,
                professionalId: String(professionalId),
                clientId: String(recipientOid),
                patientName: patientName != null ? String(patientName) : '',
                notes: notes != null ? String(notes) : '',
              },
            });
            const sock = req.notificationSocket;
            if (sock && typeof sock.sendToUser === 'function') {
              sock.sendToUser(String(recipientOid), 'expo_payment_required', {
                appointmentId: String(doc._id),
                depositAmount: depositAmountVal,
              });
            }
          } else {
            await ExpoNotification.create({
              recipientId: recipientOid,
              senderId: professionalId,
              type: 'appointment_confirmed',
              title: 'Nueva cita agendada',
              message: `${profName} te agendó "${svc}" el ${dateStr} a las ${time}.`,
              data: {
                appointmentId: String(doc._id),
                service: svc,
                date: dateStr,
                time: String(time),
                professionalName: profName,
                professionalId: String(professionalId),
                clientId: String(recipientOid),
                patientName: patientName != null ? String(patientName) : '',
                notes: notes != null ? String(notes) : '',
              },
            });
            const sock = req.notificationSocket;
            if (sock && typeof sock.sendToUser === 'function') {
              sock.sendToUser(String(recipientOid), 'expo_appointment_created_by_professional', {
                appointmentId: String(doc._id),
                date: dateStr,
                time: String(time),
              });
            }
          }
        }
      } catch (profBookingNotifyErr) {
        console.error('Error notificando cita creada por profesional:', profBookingNotifyErr);
      }
    }

    const createMessage = requireDepositProf
      ? 'Cita registrada; el cliente debe pagar la seña en la app'
      : requireDepositClient
        ? 'Reserva registrada; completá el pago de la seña en la app para confirmar'
        : isClientBooking
          ? 'Solicitud registrada; el profesional debe confirmar'
          : 'Cita registrada';
    return res.status(201).json({
      success: true,
      message: createMessage,
      data: doc,
    });
  } catch (error) {
    console.error('POST /api/v1/appointments/create:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error al registrar la cita',
    });
  }
});

// Notificaciones in-app (Expo)
app.get('/api/v1/expo-notifications', authenticateToken, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ success: false, data: [] });
    }
    const uid = String(req.user._id);
    const list = await ExpoNotification.find({ recipientId: uid })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    return res.json({ success: true, data: list });
  } catch (error) {
    console.error('GET /api/v1/expo-notifications:', error);
    return res.status(500).json({ success: false, data: [] });
  }
});

app.patch('/api/v1/expo-notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    const n = await ExpoNotification.findById(req.params.id);
    if (!n) {
      return res.status(404).json({ success: false, message: 'No encontrada' });
    }
    if (String(n.recipientId) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'No autorizado' });
    }
    n.read = true;
    await n.save();
    return res.json({ success: true });
  } catch (error) {
    console.error('PATCH expo-notifications read:', error);
    return res.status(500).json({ success: false });
  }
});

app.delete('/api/v1/expo-notifications', authenticateToken, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ success: false, message: 'Base de datos no disponible' });
    }
    const uid = String(req.user._id);
    const result = await ExpoNotification.deleteMany({ recipientId: uid });
    return res.json({
      success: true,
      deletedCount: Number(result?.deletedCount || 0),
    });
  } catch (error) {
    console.error('DELETE /api/v1/expo-notifications:', error);
    return res.status(500).json({ success: false, message: 'Error al limpiar notificaciones' });
  }
});

app.patch('/api/v1/appointments/expo/:appointmentId/confirm', authenticateToken, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ success: false, message: 'Base de datos no disponible' });
    }
    const { appointmentId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(String(appointmentId))) {
      return res.status(400).json({ success: false, message: 'ID inválido' });
    }
    if (req.user.userType !== 'professional') {
      return res.status(403).json({ success: false, message: 'Solo profesionales pueden confirmar' });
    }
    const doc = await ExpoAppointment.findById(appointmentId);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Cita no encontrada' });
    }
    if (String(doc.professionalId) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Esta cita no es tuya' });
    }
    if (doc.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'La cita está cancelada' });
    }
    doc.status = 'confirmed';
    await doc.save();

    if (doc.clientId) {
      try {
        const prof = await User.findById(req.user._id).select('fullName').lean();
        const name = prof?.fullName || 'Profesional';
        await ExpoNotification.create({
          recipientId: doc.clientId,
          senderId: req.user._id,
          type: 'appointment_confirmed',
          title: 'Cita confirmada',
          message: `${name} confirmó tu cita del ${doc.date} a las ${doc.time}.`,
          data: {
            appointmentId: String(doc._id),
            service: doc.service,
            date: doc.date,
            time: doc.time,
            professionalName: name,
            professionalId: String(doc.professionalId),
            clientId: String(doc.clientId),
          },
        });
        void notifyClientByWhatsApp(doc.clientId, 'appointment_confirmed', [
          name,
          String(doc.date || ''),
          String(doc.time || ''),
          String(doc.service || 'turno'),
        ]);
        void notifyClientByEmail(emailService, doc.clientId, 'appointment_confirmed', doc, {
          professionalName: name,
        });
        const sock = req.notificationSocket;
        if (sock && typeof sock.sendToUser === 'function') {
          sock.sendToUser(String(doc.clientId), 'expo_appointment_confirmed', {
            appointmentId: String(doc._id),
          });
        }
      } catch (e) {
        console.warn('Notificación confirmación cliente:', e.message);
      }
    }

    return res.json({ success: true, data: doc });
  } catch (error) {
    console.error('PATCH confirm expo appointment:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error' });
  }
});

app.patch('/api/v1/appointments/expo/:appointmentId/reject', authenticateToken, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ success: false, message: 'Base de datos no disponible' });
    }
    const { appointmentId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(String(appointmentId))) {
      return res.status(400).json({ success: false, message: 'ID inválido' });
    }
    if (req.user.userType !== 'professional') {
      return res.status(403).json({ success: false, message: 'Solo profesionales' });
    }
    const doc = await ExpoAppointment.findById(appointmentId);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Cita no encontrada' });
    }
    if (String(doc.professionalId) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Esta cita no es tuya' });
    }
    doc.status = 'cancelled';
    await doc.save();

    if (doc.clientId) {
      try {
        const prof = await User.findById(req.user._id).select('fullName').lean();
        const name = prof?.fullName || 'Profesional';
        await ExpoNotification.create({
          recipientId: doc.clientId,
          senderId: req.user._id,
          type: 'appointment_cancelled',
          title: 'Cita no disponible',
          message: `${name} no pudo confirmar tu solicitud del ${doc.date} a las ${doc.time}.`,
          data: {
            appointmentId: String(doc._id),
            service: doc.service,
            date: doc.date,
            time: doc.time,
            professionalName: name,
            professionalId: String(doc.professionalId),
            clientId: String(doc.clientId),
          },
        });
        void notifyClientByWhatsApp(doc.clientId, 'appointment_rejected', [
          name,
          String(doc.date || ''),
          String(doc.time || ''),
          String(doc.service || 'turno'),
        ]);
        void notifyClientByEmail(emailService, doc.clientId, 'appointment_rejected', doc, {
          professionalName: name,
        });
      } catch (e) {
        console.warn('Notificación rechazo cliente:', e.message);
      }
    }

    return res.json({ success: true, data: doc });
  } catch (error) {
    console.error('PATCH reject expo appointment:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error' });
  }
});

/** Cancelación por el paciente: solo con al menos 48 h de anticipación. */
app.patch(
  '/api/v1/appointments/expo/:appointmentId/cancel-by-client',
  authenticateToken,
  async (req, res) => {
    try {
      if (mongoose.connection.readyState !== 1) {
        return res.status(503).json({ success: false, message: 'Base de datos no disponible' });
      }
      if (req.user.userType !== 'client') {
        return res.status(403).json({
          success: false,
          message: 'Solo los pacientes pueden cancelar con esta acción',
        });
      }
      const { appointmentId } = req.params;
      if (!mongoose.Types.ObjectId.isValid(String(appointmentId))) {
        return res.status(400).json({ success: false, message: 'ID inválido' });
      }
      const doc = await ExpoAppointment.findById(appointmentId);
      if (!doc) {
        return res.status(404).json({ success: false, message: 'Cita no encontrada' });
      }
      if (!doc.clientId || String(doc.clientId) !== String(req.user._id)) {
        return res.status(403).json({
          success: false,
          message: 'Esta cita no está asociada a tu cuenta',
        });
      }
      const st = String(doc.status || '');
      if (['cancelled', 'completed', 'finished', 'rejected'].includes(st)) {
        return res.status(400).json({ success: false, message: 'Esta cita no se puede cancelar' });
      }
      const startMs = parseExpoAppointmentStartMs(doc.date, doc.time);
      if (startMs == null) {
        return res.status(400).json({ success: false, message: 'Fecha u hora del turno inválida' });
      }
      const now = Date.now();
      if (startMs <= now) {
        return res.status(400).json({ success: false, message: 'El turno ya ocurrió' });
      }
      if (startMs - now < CLIENT_CANCEL_MIN_HOURS_MS) {
        return res.status(403).json({
          success: false,
          message:
            'Solo podés cancelar con al menos 48 horas de anticipación respecto del horario del turno.',
          error: 'CANCEL_TOO_LATE',
        });
      }
      doc.status = 'cancelled';
      await doc.save();

      try {
        const client = await User.findById(req.user._id).select('fullName').lean();
        const clientName = client?.fullName || 'Paciente';
        await ExpoNotification.create({
          recipientId: doc.professionalId,
          senderId: req.user._id,
          type: 'appointment_cancelled_by_client',
          title: 'Turno cancelado por el paciente',
          message: `${clientName} canceló la cita del ${doc.date} a las ${doc.time}.`,
          data: {
            appointmentId: String(doc._id),
            service: doc.service,
            date: doc.date,
            time: doc.time,
          },
        });
        const sock = req.notificationSocket;
        if (sock && typeof sock.sendToUser === 'function') {
          sock.sendToUser(String(doc.professionalId), 'expo_appointment_cancelled_by_client', {
            appointmentId: String(doc._id),
            date: doc.date,
            time: doc.time,
          });
        }
        void notifyProfessionalByEmail(
          emailService,
          doc.professionalId,
          'cancelled_by_client',
          doc,
          { clientName: clientName }
        );
      } catch (e) {
        console.warn('Notif cancelación paciente:', e.message);
      }

      return res.json({ success: true, data: doc });
    } catch (error) {
      console.error('PATCH cancel-by-client expo appointment:', error);
      return res.status(500).json({ success: false, message: error.message || 'Error' });
    }
  }
);

/** Reprogramación por paciente: misma ventana 48 h que cancelar; notifica al profesional. */
app.patch(
  '/api/v1/appointments/expo/:appointmentId/reschedule-by-client',
  authenticateToken,
  async (req, res) => {
    try {
      if (mongoose.connection.readyState !== 1) {
        return res.status(503).json({ success: false, message: 'Base de datos no disponible' });
      }
      if (req.user.userType !== 'client') {
        return res.status(403).json({
          success: false,
          message: 'Solo los pacientes pueden reprogramar con esta acción',
        });
      }
      const { appointmentId } = req.params;
      if (!mongoose.Types.ObjectId.isValid(String(appointmentId))) {
        return res.status(400).json({ success: false, message: 'ID inválido' });
      }
      const newDate = req.body?.newDate != null ? String(req.body.newDate).trim() : '';
      const newTime = req.body?.newTime != null ? String(req.body.newTime).trim() : '';
      if (!newDate || !newTime) {
        return res.status(400).json({ success: false, message: 'newDate y newTime son obligatorios' });
      }
      const doc = await ExpoAppointment.findById(appointmentId);
      if (!doc) {
        return res.status(404).json({ success: false, message: 'Cita no encontrada' });
      }
      if (!doc.clientId || String(doc.clientId) !== String(req.user._id)) {
        return res.status(403).json({
          success: false,
          message: 'Esta cita no está asociada a tu cuenta',
        });
      }
      const st = String(doc.status || '');
      if (['cancelled', 'completed', 'finished', 'rejected'].includes(st)) {
        return res.status(400).json({ success: false, message: 'Esta cita no se puede reprogramar' });
      }
      const startMs = parseExpoAppointmentStartMs(doc.date, doc.time);
      if (startMs == null) {
        return res.status(400).json({ success: false, message: 'Fecha u hora del turno inválida' });
      }
      const now = Date.now();
      if (startMs <= now) {
        return res.status(400).json({ success: false, message: 'El turno ya ocurrió' });
      }
      if (startMs - now < CLIENT_CANCEL_MIN_HOURS_MS) {
        return res.status(403).json({
          success: false,
          message:
            'Solo podés reprogramar con al menos 48 horas de anticipación respecto del horario del turno.',
          error: 'RESCHEDULE_TOO_LATE',
        });
      }
      const prevDate = doc.date;
      const prevTime = doc.time;
      if (String(prevDate) === newDate && String(prevTime) === newTime) {
        return res.status(400).json({ success: false, message: 'La fecha y hora no cambiaron' });
      }
      doc.date = newDate;
      doc.time = newTime;
      doc.reminder24hSentAt = null;
      await doc.save();

      try {
        const client = await User.findById(req.user._id).select('fullName').lean();
        const clientName = client?.fullName || 'Paciente';
        await ExpoNotification.create({
          recipientId: doc.professionalId,
          senderId: req.user._id,
          type: 'appointment_rescheduled_by_client',
          title: 'Turno reprogramado por el paciente',
          message: `${clientName} movió la cita de "${doc.service}" del ${prevDate} ${prevTime} al ${newDate} ${newTime}.`,
          data: {
            appointmentId: String(doc._id),
            service: doc.service,
            date: newDate,
            time: newTime,
            patientName: clientName,
            professionalId: String(doc.professionalId),
            clientId: String(doc.clientId),
          },
        });
        const sock = req.notificationSocket;
        if (sock && typeof sock.sendToUser === 'function') {
          sock.sendToUser(String(doc.professionalId), 'expo_appointment_rescheduled_by_client', {
            appointmentId: String(doc._id),
            previousDate: prevDate,
            previousTime: prevTime,
            date: newDate,
            time: newTime,
          });
        }
        void notifyProfessionalByEmail(
          emailService,
          doc.professionalId,
          'rescheduled_by_client',
          doc,
          {
            clientName: clientName,
            previousDate: String(prevDate),
            previousTime: String(prevTime),
            newDate,
            newTime,
          }
        );
      } catch (e) {
        console.warn('Notif reprogramación paciente:', e.message);
      }

      return res.json({ success: true, data: doc });
    } catch (error) {
      console.error('PATCH reschedule-by-client expo appointment:', error);
      return res.status(500).json({ success: false, message: error.message || 'Error' });
    }
  }
);

/** Cancelación por el profesional; notifica al paciente si tiene cuenta. */
app.patch(
  '/api/v1/appointments/expo/:appointmentId/cancel-by-professional',
  authenticateToken,
  async (req, res) => {
    try {
      if (mongoose.connection.readyState !== 1) {
        return res.status(503).json({ success: false, message: 'Base de datos no disponible' });
      }
      if (req.user.userType !== 'professional') {
        return res.status(403).json({
          success: false,
          message: 'Solo los profesionales pueden cancelar con esta acción',
        });
      }
      const { appointmentId } = req.params;
      if (!mongoose.Types.ObjectId.isValid(String(appointmentId))) {
        return res.status(400).json({ success: false, message: 'ID inválido' });
      }
      const doc = await ExpoAppointment.findById(appointmentId);
      if (!doc) {
        return res.status(404).json({ success: false, message: 'Cita no encontrada' });
      }
      if (String(doc.professionalId) !== String(req.user._id)) {
        return res.status(403).json({ success: false, message: 'Esta cita no es tuya' });
      }
      const st = String(doc.status || '');
      if (['cancelled', 'completed', 'finished', 'rejected'].includes(st)) {
        return res.status(400).json({ success: false, message: 'Esta cita no se puede cancelar' });
      }
      doc.status = 'cancelled';
      await doc.save();

      try {
        const prof = await User.findById(req.user._id).select('fullName').lean();
        const profName = prof?.fullName || 'Tu profesional';
        if (doc.clientId) {
          await ExpoNotification.create({
            recipientId: doc.clientId,
            senderId: req.user._id,
            type: 'appointment_cancelled_by_professional',
            title: 'Turno cancelado',
            message: `${profName} canceló tu cita de "${doc.service}" del ${doc.date} a las ${doc.time}.`,
            data: {
              appointmentId: String(doc._id),
              service: doc.service,
              date: doc.date,
              time: doc.time,
              professionalName: profName,
              professionalId: String(doc.professionalId),
              clientId: String(doc.clientId),
            },
          });
          void notifyClientByWhatsApp(doc.clientId, 'appointment_cancelled_by_professional', [
            profName,
            String(doc.service || 'turno'),
            String(doc.date || ''),
            String(doc.time || ''),
          ]);
          void notifyClientByEmail(
            emailService,
            doc.clientId,
            'appointment_cancelled_by_professional',
            doc,
            { professionalName: profName }
          );
        }
        const sock = req.notificationSocket;
        if (sock && typeof sock.sendToUser === 'function' && doc.clientId) {
          sock.sendToUser(String(doc.clientId), 'expo_appointment_cancelled_by_professional', {
            appointmentId: String(doc._id),
            date: doc.date,
            time: doc.time,
          });
        }
      } catch (e) {
        console.warn('Notif cancelación profesional:', e.message);
      }

      return res.json({ success: true, data: doc });
    } catch (error) {
      console.error('PATCH cancel-by-professional expo appointment:', error);
      return res.status(500).json({ success: false, message: error.message || 'Error' });
    }
  }
);

/** Reprogramación por el profesional; notifica al paciente. */
app.patch(
  '/api/v1/appointments/expo/:appointmentId/reschedule-by-professional',
  authenticateToken,
  async (req, res) => {
    try {
      if (mongoose.connection.readyState !== 1) {
        return res.status(503).json({ success: false, message: 'Base de datos no disponible' });
      }
      if (req.user.userType !== 'professional') {
        return res.status(403).json({
          success: false,
          message: 'Solo los profesionales pueden reprogramar con esta acción',
        });
      }
      const { appointmentId } = req.params;
      if (!mongoose.Types.ObjectId.isValid(String(appointmentId))) {
        return res.status(400).json({ success: false, message: 'ID inválido' });
      }
      const newDate = req.body?.newDate != null ? String(req.body.newDate).trim() : '';
      const newTime = req.body?.newTime != null ? String(req.body.newTime).trim() : '';
      if (!newDate || !newTime) {
        return res.status(400).json({ success: false, message: 'newDate y newTime son obligatorios' });
      }
      const doc = await ExpoAppointment.findById(appointmentId);
      if (!doc) {
        return res.status(404).json({ success: false, message: 'Cita no encontrada' });
      }
      if (String(doc.professionalId) !== String(req.user._id)) {
        return res.status(403).json({ success: false, message: 'Esta cita no es tuya' });
      }
      const st = String(doc.status || '');
      if (['cancelled', 'completed', 'finished', 'rejected'].includes(st)) {
        return res.status(400).json({ success: false, message: 'Esta cita no se puede reprogramar' });
      }
      const prevDate = doc.date;
      const prevTime = doc.time;
      if (String(prevDate) === newDate && String(prevTime) === newTime) {
        return res.status(400).json({ success: false, message: 'La fecha y hora no cambiaron' });
      }
      doc.date = newDate;
      doc.time = newTime;
      doc.reminder24hSentAt = null;
      await doc.save();

      try {
        const prof = await User.findById(req.user._id).select('fullName').lean();
        const profName = prof?.fullName || 'Tu profesional';
        if (doc.clientId) {
          await ExpoNotification.create({
            recipientId: doc.clientId,
            senderId: req.user._id,
            type: 'appointment_rescheduled_by_professional',
            title: 'Turno reprogramado',
            message: `${profName} movió tu cita de "${doc.service}" del ${prevDate} ${prevTime} al ${newDate} ${newTime}.`,
            data: {
              appointmentId: String(doc._id),
              service: doc.service,
              date: newDate,
              time: newTime,
              professionalName: profName,
              professionalId: String(doc.professionalId),
              clientId: String(doc.clientId),
            },
          });
        }
        const sock = req.notificationSocket;
        if (sock && typeof sock.sendToUser === 'function' && doc.clientId) {
          sock.sendToUser(String(doc.clientId), 'expo_appointment_rescheduled_by_professional', {
            appointmentId: String(doc._id),
            previousDate: prevDate,
            previousTime: prevTime,
            date: newDate,
            time: newTime,
          });
        }
      } catch (e) {
        console.warn('Notif reprogramación profesional:', e.message);
      }

      return res.json({ success: true, data: doc });
    } catch (error) {
      console.error('PATCH reschedule-by-professional expo appointment:', error);
      return res.status(500).json({ success: false, message: error.message || 'Error' });
    }
  }
);

app.patch('/api/v1/appointments/expo/:appointmentId/complete', authenticateToken, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ success: false, message: 'Base de datos no disponible' });
    }
    const { appointmentId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(String(appointmentId))) {
      return res.status(400).json({ success: false, message: 'ID inválido' });
    }
    if (req.user.userType !== 'professional') {
      return res.status(403).json({ success: false, message: 'Solo profesionales pueden marcar citas como completadas' });
    }
    const doc = await ExpoAppointment.findById(appointmentId);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Cita no encontrada' });
    }
    if (String(doc.professionalId) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Esta cita no es tuya' });
    }
    if (doc.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'La cita está cancelada' });
    }
    if (doc.status === 'completed') {
      return res.json({ success: true, data: doc, message: 'Ya estaba completada' });
    }
    doc.status = 'completed';
    await doc.save();

    if (doc.clientId) {
      try {
        const prof = await User.findById(req.user._id).select('fullName').lean();
        const name = prof?.fullName || 'Profesional';
        await ExpoNotification.create({
          recipientId: doc.clientId,
          senderId: req.user._id,
          type: 'appointment_completed',
          title: 'Cita completada',
          message: `${name} registró como completada tu cita del ${doc.date} a las ${doc.time}.`,
          data: {
            appointmentId: String(doc._id),
            service: doc.service,
            date: doc.date,
            time: doc.time,
            professionalName: name,
            professionalId: String(doc.professionalId),
            clientId: String(doc.clientId),
          },
        });
        const sock = req.notificationSocket;
        if (sock && typeof sock.sendToUser === 'function') {
          sock.sendToUser(String(doc.clientId), 'expo_appointment_completed', {
            appointmentId: String(doc._id),
          });
        }
      } catch (e) {
        console.warn('Notificación cita completada cliente:', e.message);
      }
    }

    return res.json({ success: true, data: doc });
  } catch (error) {
    console.error('PATCH complete expo appointment:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error' });
  }
});

// Horarios ya tomados (Expo) para un día — cliente autenticado puede consultar al reservar
app.get(
  '/api/v1/appointments/expo/occupied-times/:professionalId/:date',
  authenticateToken,
  async (req, res) => {
    try {
      if (mongoose.connection.readyState !== 1) {
        return res.json({ success: true, data: { times: [] } });
      }
      const { professionalId, date } = req.params;
      const dateYmd = String(date).slice(0, 10);
      if (!mongoose.Types.ObjectId.isValid(String(professionalId))) {
        return res.json({ success: true, data: { times: [] } });
      }
      const list = await ExpoAppointment.find({
        professionalId,
        date: dateYmd,
        status: { $nin: ['cancelled', 'rejected'] },
      })
        .select('time')
        .lean();
      const toKey = (timeStr) => {
        if (!timeStr || typeof timeStr !== 'string') return null;
        const head = timeStr.split(/\s*[-–]\s*/)[0].trim();
        const m = head.match(/^(\d{1,2}):(\d{2})/);
        if (!m) return null;
        const h = String(Math.min(23, parseInt(m[1], 10))).padStart(2, '0');
        const min = String(Math.min(59, parseInt(m[2], 10))).padStart(2, '0');
        return `${h}:${min}`;
      };
      const keys = list.map((d) => toKey(d.time)).filter(Boolean);
      return res.json({ success: true, data: { times: [...new Set(keys)] } });
    } catch (error) {
      console.error('GET expo occupied-times:', error);
      return res.status(500).json({ success: false, message: error.message || 'Error' });
    }
  }
);

// Listar citas Expo por profesional (misma colección que POST /create)
app.get(
  '/api/v1/appointments/professional/:professionalId',
  authenticateToken,
  async (req, res) => {
    try {
      if (mongoose.connection.readyState !== 1) {
        return res.status(503).json({
          success: false,
          message: 'Base de datos no disponible',
          data: [],
          count: 0,
        });
      }
      const { professionalId } = req.params;
      if (!mongoose.Types.ObjectId.isValid(String(professionalId))) {
        return res.status(400).json({
          success: false,
          message: 'professionalId inválido',
          data: [],
          count: 0,
        });
      }
      if (
        req.user.userType !== 'professional' ||
        String(req.user._id) !== String(professionalId)
      ) {
        return res.status(403).json({
          success: false,
          message: 'Solo podés ver tus propias citas',
          data: [],
          count: 0,
        });
      }
      const list = await ExpoAppointment.find({ professionalId })
        .populate('clientId', 'fullName email phone')
        .sort({ date: 1, time: 1 })
        .lean();
      return res.json({ success: true, data: list, count: list.length });
    } catch (error) {
      console.error('GET /api/v1/appointments/professional/:professionalId:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Error al listar citas',
        data: [],
        count: 0,
      });
    }
  }
);

// Pacientes del profesional (únicos por cliente o email) según citas Expo previas
app.get(
  '/api/v1/appointments/expo/professional/:professionalId/patients',
  authenticateToken,
  async (req, res) => {
    try {
      if (mongoose.connection.readyState !== 1) {
        return res.json({ success: true, data: [] });
      }
      const { professionalId } = req.params;
      if (!mongoose.Types.ObjectId.isValid(String(professionalId))) {
        return res.status(400).json({ success: false, data: [], message: 'professionalId inválido' });
      }
      if (
        req.user.userType !== 'professional' ||
        String(req.user._id) !== String(professionalId)
      ) {
        return res.status(403).json({ success: false, data: [], message: 'No autorizado' });
      }

      // Todas las citas del profesional (menos canceladas): muchas solo tienen nombre/teléfono, sin clientId ni email.
      const list = await ExpoAppointment.find({
        professionalId,
        status: { $nin: ['cancelled', 'rejected'] },
      })
        .populate('clientId', 'fullName email phone')
        .sort({ date: -1, time: -1 })
        .lean();

      const byKey = new Map();
      for (const doc of list) {
        const populated = doc.clientId;
        let cid = '';
        if (populated && typeof populated === 'object' && populated._id) {
          cid = String(populated._id);
        } else if (doc.clientId) {
          cid = String(doc.clientId);
        }

        const emailNorm = String(doc.patientEmail || '')
          .trim()
          .toLowerCase();
        const nameNorm = String(doc.patientName || '')
          .trim()
          .toLowerCase()
          .replace(/\s+/g, ' ')
          .slice(0, 80);
        const phoneNorm = String(doc.patientPhone || '').replace(/\D/g, '');

        const key =
          (cid && /^[a-fA-F0-9]{24}$/.test(cid) ? cid : '') ||
          (emailNorm.length > 2 ? `email:${emailNorm}` : '') ||
          (phoneNorm.length >= 7 ? `phone:${phoneNorm}` : '') ||
          (nameNorm.length > 0 ? `name:${nameNorm}` : '') ||
          `appt:${String(doc._id)}`;

        if (byKey.has(key)) continue;

        const name =
          (populated && typeof populated === 'object' && populated.fullName) ||
          (doc.patientName && String(doc.patientName).trim()) ||
          'Paciente';
        const email =
          (populated && typeof populated === 'object' && populated.email) ||
          (doc.patientEmail && String(doc.patientEmail).trim()) ||
          '';
        const phone =
          (populated && typeof populated === 'object' && populated.phone) ||
          (doc.patientPhone && String(doc.patientPhone).trim()) ||
          '';

        byKey.set(key, {
          rowKey: key,
          clientId: /^[a-fA-F0-9]{24}$/.test(cid) ? cid : null,
          name,
          email,
          phone,
          lastVisit: doc.date,
        });
      }

      return res.json({ success: true, data: Array.from(byKey.values()) });
    } catch (error) {
      console.error('GET expo professional patients:', error);
      return res.status(500).json({ success: false, data: [], message: error.message || 'Error' });
    }
  }
);

// Listar citas Expo del cliente autenticado
app.get(
  '/api/v1/appointments/client/:clientId',
  authenticateToken,
  async (req, res) => {
    try {
      if (mongoose.connection.readyState !== 1) {
        return res.status(503).json({
          success: false,
          message: 'Base de datos no disponible',
          data: [],
          count: 0,
        });
      }
      const { clientId } = req.params;
      if (!mongoose.Types.ObjectId.isValid(String(clientId))) {
        return res.status(400).json({
          success: false,
          message: 'clientId inválido',
          data: [],
          count: 0,
        });
      }
      if (req.user.userType !== 'client' || String(req.user._id) !== String(clientId)) {
        return res.status(403).json({
          success: false,
          message: 'Solo podés ver tus propias citas',
          data: [],
          count: 0,
        });
      }
      const oid = new mongoose.Types.ObjectId(clientId);
      const emailNorm = String(req.user.email || '')
        .trim()
        .toLowerCase();
      const orClause = [{ clientId: oid }];
      if (emailNorm.length > 3) {
        orClause.push({
          patientEmail: new RegExp(`^${escapeRegexPath(emailNorm)}$`, 'i'),
        });
      }
      const list = await ExpoAppointment.find({ $or: orClause })
        .sort({ date: 1, time: 1 })
        .lean();
      return res.json({ success: true, data: list, count: list.length });
    } catch (error) {
      console.error('GET /api/v1/appointments/client/:clientId:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Error al listar citas',
        data: [],
        count: 0,
      });
    }
  }
);

// ——— Chat Expo (mensajes entre usuarios + notificación al destinatario) ———
app.post('/api/v1/expo-chat/messages', authenticateToken, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ success: false, message: 'Base de datos no disponible' });
    }
    const receiverId = req.body?.receiverId != null ? String(req.body.receiverId).trim() : '';
    const content =
      req.body?.content != null ? String(req.body.content).trim() : '';
    const messageType = ['text', 'image', 'file', 'system'].includes(req.body?.messageType)
      ? req.body.messageType
      : 'text';
    if (!receiverId || !mongoose.Types.ObjectId.isValid(receiverId)) {
      return res.status(400).json({ success: false, message: 'receiverId inválido' });
    }
    if (!content) {
      return res.status(400).json({ success: false, message: 'El mensaje no puede estar vacío' });
    }
    if (String(receiverId) === String(req.user._id)) {
      return res.status(400).json({ success: false, message: 'No podés enviarte mensajes a vos mismo' });
    }
    const receiver = await User.findById(receiverId).select('fullName userType').lean();
    if (!receiver) {
      return res.status(404).json({ success: false, message: 'Usuario destinatario no encontrado' });
    }
    const conversationKey = makeExpoChatConversationKey(req.user._id, receiverId);
    const doc = await ExpoChatMessage.create({
      conversationKey,
      senderId: req.user._id,
      receiverId,
      senderName: req.user.fullName || 'Usuario',
      receiverName: receiver.fullName || 'Usuario',
      senderType: req.user.userType || 'client',
      receiverType: receiver.userType || 'client',
      content,
      messageType,
      readByReceiver: false,
    });

    const preview = content.length > 140 ? `${content.slice(0, 140)}…` : content;
    try {
      await ExpoNotification.create({
        recipientId: receiverId,
        senderId: req.user._id,
        type: 'chat_message',
        title: `Mensaje de ${req.user.fullName || 'Usuario'}`,
        message: preview,
        data: {
          chatConversationKey: conversationKey,
          chatMessageId: String(doc._id),
          patientName: req.user.fullName,
          professionalName: req.user.fullName,
        },
      });
      const sock = req.notificationSocket;
      if (sock && typeof sock.sendToUser === 'function') {
        sock.sendToUser(String(receiverId), 'expo_chat_message', {
          conversationKey,
          messageId: String(doc._id),
          senderId: String(req.user._id),
        });
      }
    } catch (e) {
      console.warn('Notif chat mensaje:', e.message);
    }

    return res.status(201).json({ success: true, data: doc });
  } catch (error) {
    console.error('POST expo-chat/messages:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error' });
  }
});

app.get('/api/v1/expo-chat/conversations', authenticateToken, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.json({ success: true, data: [] });
    }
    const uid = String(req.user._id);
    const keys = await ExpoChatMessage.distinct('conversationKey', {
      $or: [{ senderId: req.user._id }, { receiverId: req.user._id }],
    });
    const rows = [];
    for (const key of keys) {
      const parts = String(key).split('_');
      if (parts.length !== 2) continue;
      const otherId = parts[0] === uid ? parts[1] : parts[0];
      if (!mongoose.Types.ObjectId.isValid(otherId)) continue;
      const last = await ExpoChatMessage.findOne({ conversationKey: key })
        .sort({ createdAt: -1 })
        .lean();
      const unread = await ExpoChatMessage.countDocuments({
        conversationKey: key,
        receiverId: req.user._id,
        readByReceiver: false,
      });
      const otherUser = await User.findById(otherId).select('fullName userType').lean();
      rows.push({
        conversationKey: key,
        otherUserId: otherId,
        otherUserName: otherUser?.fullName || 'Usuario',
        otherUserType: otherUser?.userType || 'client',
        lastMessage: last
          ? {
              content: last.content,
              createdAt: last.createdAt,
              senderId: String(last.senderId),
              messageType: last.messageType,
            }
          : null,
        unreadCount: unread,
      });
    }
    rows.sort(
      (a, b) =>
        new Date(b.lastMessage?.createdAt || 0).getTime() -
        new Date(a.lastMessage?.createdAt || 0).getTime()
    );
    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error('GET expo-chat/conversations:', error);
    return res.status(500).json({ success: false, data: [], message: error.message || 'Error' });
  }
});

app.get(
  '/api/v1/expo-chat/conversations/:conversationKey/messages',
  authenticateToken,
  async (req, res) => {
    try {
      if (mongoose.connection.readyState !== 1) {
        return res.json({ success: true, data: [] });
      }
      const { conversationKey } = req.params;
      const key = String(conversationKey || '').trim();
      const parts = key.split('_');
      if (parts.length !== 2) {
        return res.status(400).json({ success: false, message: 'conversationKey inválido' });
      }
      const uid = String(req.user._id);
      if (!parts.includes(uid)) {
        return res.status(403).json({ success: false, message: 'No autorizado' });
      }
      const list = await ExpoChatMessage.find({ conversationKey: key })
        .sort({ createdAt: 1 })
        .limit(200)
        .lean();
      return res.json({ success: true, data: list });
    } catch (error) {
      console.error('GET expo-chat messages:', error);
      return res.status(500).json({ success: false, data: [], message: error.message || 'Error' });
    }
  }
);

app.patch(
  '/api/v1/expo-chat/conversations/:conversationKey/read',
  authenticateToken,
  async (req, res) => {
    try {
      if (mongoose.connection.readyState !== 1) {
        return res.json({ success: true, modified: 0 });
      }
      const key = String(req.params.conversationKey || '').trim();
      const parts = key.split('_');
      if (parts.length !== 2 || !parts.includes(String(req.user._id))) {
        return res.status(403).json({ success: false, message: 'No autorizado' });
      }
      const r = await ExpoChatMessage.updateMany(
        { conversationKey: key, receiverId: req.user._id, readByReceiver: false },
        { $set: { readByReceiver: true } }
      );
      return res.json({ success: true, modified: r.modifiedCount });
    } catch (error) {
      console.error('PATCH expo-chat read:', error);
      return res.status(500).json({ success: false, message: error.message || 'Error' });
    }
  }
);

// Rutas de salud (/api/v1/health la usa la app Expo; /api/health compatibilidad)
app.post('/api/v1/push-debug', (req, res) => {
  try {
    const payload = req.body && typeof req.body === 'object' ? req.body : {};
    const event = payload.event ? String(payload.event) : 'unknown';
    const userId = payload.userId ? String(payload.userId) : '';
    const details = payload.details ? String(payload.details) : '';
    const env = payload.executionEnvironment ? String(payload.executionEnvironment) : '';
    console.log(
      `[push-debug] event=${event} user=${userId || '-'} env=${env || '-'} details=${details.slice(0, 300)}`
    );
    return res.json({ success: true });
  } catch (error) {
    console.warn('POST /api/v1/push-debug:', error?.message || error);
    return res.status(200).json({ success: false });
  }
});

/**
 * Webhook Meta WhatsApp Cloud (estado de mensajes).
 * Configurá la misma URL en Meta: GET verify + POST eventos.
 */
app.get('/api/v1/whatsapp/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  const expected = String(process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || '').trim();
  if (mode === 'subscribe' && expected && token === expected) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

app.post('/api/v1/whatsapp/webhook', express.json({ limit: '1mb' }), (req, res) => {
  try {
    const snippet = JSON.stringify(req.body || {}).slice(0, 500);
    console.log('[whatsapp-webhook]', snippet);
  } catch {
    console.log('[whatsapp-webhook] (body no serializable)');
  }
  return res.sendStatus(200);
});

/**
 * Prueba manual: envía una plantilla al teléfono del usuario autenticado (o `to` E.164 en body).
 * Body: { templateName?: string, languageCode?: string, bodyParams?: string[], to?: string }
 */
app.post('/api/v1/whatsapp/send-test', authenticateToken, express.json(), async (req, res) => {
  try {
    const twilioOn = isTwilioWhatsAppEnabled();
    const metaOn = isWhatsAppCloudEnabled();
    if (!twilioOn && !metaOn) {
      return res.status(503).json({
        success: false,
        message:
          'WhatsApp deshabilitado. Activá TWILIO_WHATSAPP_ENABLED=1 o WHATSAPP_CLOUD_ENABLED=1',
      });
    }
    const u = req.user;
    const toRaw =
      req.body && req.body.to != null && String(req.body.to).trim()
        ? String(req.body.to).trim()
        : u.phone;
    const bodyParams = Array.isArray(req.body && req.body.bodyParams) ? req.body.bodyParams : [];
    const textBody =
      req.body && req.body.text != null && String(req.body.text).trim()
        ? String(req.body.text).trim()
        : '';

    if (twilioOn && textBody) {
      const result = await sendTwilioWhatsAppSessionText(toRaw, textBody);
      if (!result.ok) {
        return res.status(502).json({
          success: false,
          message: result.error || 'Error enviando WhatsApp (Twilio Body)',
          details: result.body || null,
        });
      }
      return res.json({ success: true, provider: 'twilio', mode: 'body', data: result.body || null });
    }

    const templateName =
      (req.body && req.body.templateName && String(req.body.templateName).trim()) ||
      String(process.env.WHATSAPP_TEMPLATE_TEST || '').trim();
    if (!templateName) {
      return res.status(400).json({
        success: false,
        message:
          'Definí templateName / ContentSid en body o WHATSAPP_TEMPLATE_TEST en .env (Twilio: HX…)',
      });
    }
    const languageCode =
      (req.body && req.body.languageCode && String(req.body.languageCode).trim()) ||
      String(process.env.WHATSAPP_TEMPLATE_LANG || 'es').trim() ||
      'es';

    let result;
    if (twilioOn) {
      result = await sendTwilioWhatsAppTemplate(toRaw, templateName, bodyParams);
    } else {
      result = await sendWhatsAppTemplateMessage(toRaw, templateName, languageCode, bodyParams);
    }
    if (!result.ok) {
      return res.status(502).json({
        success: false,
        message: result.error || 'Error enviando WhatsApp',
        details: result.body || null,
      });
    }
    return res.json({
      success: true,
      provider: twilioOn ? 'twilio' : 'meta',
      data: result.body || null,
    });
  } catch (error) {
    console.error('POST /api/v1/whatsapp/send-test:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error' });
  }
});

/**
 * Opt-in / opt-out WhatsApp (guarda en User.preferences.notifications.whatsapp).
 * Body: { enabled: boolean }
 */
app.post('/api/v1/whatsapp/preferences', authenticateToken, express.json(), async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ success: false, message: 'Base de datos no disponible' });
    }
    const enabled = !!(req.body && req.body.enabled);
    const uid = req.user._id;
    await User.updateOne(
      { _id: uid },
      { $set: { 'preferences.notifications.whatsapp': enabled } }
    );
    return res.json({ success: true, whatsapp: enabled });
  } catch (error) {
    console.error('POST /api/v1/whatsapp/preferences:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error' });
  }
});

const sendHealth = (req, res) => {
  const health = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    services: {
      database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      websocket: notificationSocket ? 'active' : 'inactive',
      email: emailService.transporter ? 'active' : 'inactive',
      mercadopago: mercadopagoService.validateConfiguration(),
      geolocation: 'active'
    },
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development'
  };

  res.json(health);
};
app.get('/api/health', sendHealth);
app.get('/api/v1/health', sendHealth);

// Ruta raíz
app.get('/', (req, res) => {
  res.json({
    message: '🚀 Turnario Backend API',
    version: '2.0.0',
    features: [
      'WebSockets para notificaciones en tiempo real',
      'Sistema de emails automáticos',
      'Integración con MercadoPago',
      'Geolocalización para clínicas cercanas',
      'API RESTful completa',
      'Autenticación JWT',
      'Base de datos MongoDB'
    ],
    endpoints: {
      auth: '/api/users',
      appointments: '/api/appointments',
      services: '/api/services',
      clinics: '/api/clinics',
      notifications: '/api/notifications',
      payments: '/api/payments',
      geolocation: '/api/geolocation',
      email: '/api/email',
      websocket: '/api/websocket',
      health: '/api/health'
    },
    documentation: '/api/docs',
    support: process.env.SUPPORT_EMAIL || 'soporte@turnario.com'
  });
});

// Middleware de manejo de errores
app.use((error, req, res, next) => {
  console.error('❌ Error no manejado:', error);
  
  res.status(error.status || 500).json({
    error: {
      message: error.message || 'Error interno del servidor',
      status: error.status || 500,
      timestamp: new Date().toISOString()
    }
  });
});

// Middleware para rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    error: {
      message: 'Ruta no encontrada',
      status: 404,
      path: req.originalUrl,
      timestamp: new Date().toISOString()
    }
  });
});

// Iniciar servidor
server.listen(PORT, HOST, () => {
  console.log(`🚀 Servidor Turnario ejecutándose en ${HOST}:${PORT} (accesible en la red local por la IP de esta PC)`);
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  console.log(`📧 Email Service: ${emailService.transporter ? '✅ Activo' : '❌ Inactivo'}`);
  console.log(`💳 MercadoPago: ${mercadopagoService.validateConfiguration() ? '✅ Configurado' : '❌ No configurado'}`);
  console.log(`📍 Geolocalización: ✅ Activo`);
  console.log(`🔌 WebSockets: ✅ Activo`);
  console.log(`📊 Base de datos: ${mongoose.connection.readyState === 1 ? '✅ Conectada' : '❌ Desconectada'}`);
  console.log(`💳 Pagos Expo (app móvil): POST /api/v1/expo-payments/create-preference`);
});

// Manejo de señales de terminación
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM recibido, cerrando servidor...');
  server.close(() => {
    console.log('✅ Servidor cerrado');
    mongoose.connection.close();
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT recibido, cerrando servidor...');
  server.close(() => {
    console.log('✅ Servidor cerrado');
    mongoose.connection.close();
    process.exit(0);
  });
});

// Exportar para testing
module.exports = { app, server, notificationSocket };

