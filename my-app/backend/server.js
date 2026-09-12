const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const WebSocket = require('ws');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Importar configuración de base de datos
const connectDB = require('./config/database');

// Importar modelos
const User = require('./models/User');
const Appointment = require('./models/Appointment');
const Service = require('./models/Service');
const Clinic = require('./models/Clinic');
const Notification = require('./models/Notification');
const Review = require('./models/Review');
const ProfessionalAvailability = require('./models/ProfessionalAvailability');
const ProfessionalDateSchedule = require('./models/ProfessionalDateSchedule');
const ClinicalSession = require('./models/ClinicalSession');
const emailService = require('./services/emailService');

const app = express();
const PORT = process.env.PORT || 3001;
const HOST_IP = process.env.HOST_IP || '192.168.0.11';

// Conectar a MongoDB
connectDB();

// Middleware
app.use(cors());
// Fotos de perfil llegan como data URI (base64); límite un poco más alto.
app.use(express.json({ limit: '8mb' }));

const PROFILE_UPLOADS_DIR = path.join(__dirname, 'uploads', 'profiles');
try {
  fs.mkdirSync(PROFILE_UPLOADS_DIR, { recursive: true });
} catch (e) {
  console.warn('No se pudo crear uploads/profiles:', e?.message || e);
}
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

/** Guarda data URI de imagen y devuelve path público, o null si hay que borrar. */
function persistProfileImageDataUri(userId, dataUri) {
  if (dataUri === null || dataUri === '') return null;
  if (typeof dataUri !== 'string') {
    throw Object.assign(new Error('Imagen de perfil inválida'), { status: 400 });
  }
  if (dataUri.startsWith('/uploads/') || /^https?:\/\//i.test(dataUri)) {
    return dataUri;
  }
  const m = dataUri.match(/^data:image\/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=\s]+)$/i);
  if (!m) {
    throw Object.assign(new Error('Formato de imagen no soportado (JPEG/PNG/WebP)'), {
      status: 400,
    });
  }
  const ext = m[1].toLowerCase() === 'png' ? 'png' : m[1].toLowerCase() === 'webp' ? 'webp' : 'jpg';
  const buf = Buffer.from(m[2].replace(/\s/g, ''), 'base64');
  if (!buf.length) {
    throw Object.assign(new Error('Imagen vacía'), { status: 400 });
  }
  if (buf.length > 3.5 * 1024 * 1024) {
    throw Object.assign(new Error('La imagen supera 3.5 MB'), { status: 400 });
  }
  const filename = `${String(userId)}.${ext}`;
  fs.writeFileSync(path.join(PROFILE_UPLOADS_DIR, filename), buf);
  return `/uploads/profiles/${filename}?v=${Date.now()}`;
}

// Los datos ahora se obtienen de MongoDB

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/** HH:mm → minutos desde medianoche */
function timeToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const head = timeStr.split(/\s*[-–]\s*/)[0].trim();
  const m = head.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return Math.min(23, parseInt(m[1], 10)) * 60 + Math.min(59, parseInt(m[2], 10));
}

function minutesToTime(total) {
  const h = Math.floor(total / 60);
  const min = total % 60;
  return `${String(Math.min(23, h)).padStart(2, '0')}:${String(Math.min(59, min)).padStart(2, '0')}`;
}

function normalizeDurationMinutes(value, fallback = 30) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 5) return fallback;
  return Math.min(180, Math.round(n));
}

/** Solape de intervalos [start, start+dur) */
function intervalsOverlap(startA, durA, startB, durB) {
  if (startA == null || startB == null) return false;
  return startA < startB + durB && startA + durA > startB;
}

/**
 * Expande una cita a claves HH:mm ocupadas (paso 15) para que 10:00/60min
 * también bloquee 10:15, 10:30, 10:45 ante grillas de 30 min.
 */
function expandOccupiedSlotKeys(startTime, durationMin, step = 15) {
  const start = timeToMinutes(startTime);
  if (start == null) return [];
  const duration = normalizeDurationMinutes(durationMin, 30);
  const end = start + duration;
  const keys = [];
  for (let m = start; m < end; m += step) {
    keys.push(minutesToTime(m));
  }
  return keys;
}

async function getProfessionalAppointmentDuration(professionalId) {
  try {
    if (!professionalId || !mongoose.Types.ObjectId.isValid(String(professionalId))) {
      return 30;
    }
    const availability = await ProfessionalAvailability.findOne({ professionalId }).lean();
    return normalizeDurationMinutes(availability?.appointmentDuration, 30);
  } catch {
    return 30;
  }
}

const ACTIVE_APPOINTMENT_STATUSES = ['pending', 'pending_approval', 'pending_payment', 'confirmed'];

function localDateYmd(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;
}

async function validateProfessionalBookingLimits(professionalId, dateYmd, excludeAppointmentId) {
  if (
    !professionalId ||
    !mongoose.Types.ObjectId.isValid(String(professionalId)) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(String(dateYmd || ''))
  ) {
    return { ok: true };
  }

  const availability = await ProfessionalAvailability.findOne({
    professionalId: String(professionalId),
  })
    .select('maxAppointmentsPerDay advanceBookingDays')
    .lean();
  if (!availability) return { ok: true };

  const today = localDateYmd();
  if (dateYmd < today) {
    return { ok: false, status: 400, message: 'No se pueden reservar citas en fechas pasadas.' };
  }

  const advanceDays = Number(availability.advanceBookingDays);
  if (Number.isFinite(advanceDays) && advanceDays >= 0) {
    const maxDate = new Date();
    maxDate.setHours(12, 0, 0, 0);
    maxDate.setDate(maxDate.getDate() + Math.round(advanceDays));
    if (dateYmd > localDateYmd(maxDate)) {
      return {
        ok: false,
        status: 409,
        message: `El profesional acepta reservas con hasta ${Math.round(advanceDays)} días de anticipación.`,
      };
    }
  }

  const maxPerDay = Number(availability.maxAppointmentsPerDay);
  if (Number.isFinite(maxPerDay) && maxPerDay > 0) {
    const query = {
      professionalId: new mongoose.Types.ObjectId(String(professionalId)),
      date: dateYmd,
      status: { $in: ACTIVE_APPOINTMENT_STATUSES },
    };
    if (excludeAppointmentId && mongoose.Types.ObjectId.isValid(String(excludeAppointmentId))) {
      query._id = { $ne: new mongoose.Types.ObjectId(String(excludeAppointmentId)) };
    }
    const currentCount = await Appointment.countDocuments(query);
    if (currentCount >= Math.round(maxPerDay)) {
      return {
        ok: false,
        status: 409,
        message: `Se alcanzó el máximo de ${Math.round(maxPerDay)} citas para ese día.`,
      };
    }
  }

  return { ok: true };
}

async function saveClinicalSessionForAppointment(appointment, professional, input = {}) {
  const notes = String(input.notes || '').trim();
  const treatmentSummary = String(input.treatmentSummary || '').trim();
  if (!notes && !treatmentSummary) return null;

  return ClinicalSession.findOneAndUpdate(
    { appointmentId: appointment._id },
    {
      $set: {
        patientId: appointment.clientId,
        professionalId: appointment.professionalId,
        professionalName:
          String(input.professionalName || professional?.fullName || appointment.professionalName || '').trim() ||
          'Profesional',
        serviceLabel:
          String(input.serviceLabel || appointment.service || '').trim() || 'Consulta',
        appointmentDateYmd: String(appointment.date || '').slice(0, 10),
        appointmentTime: String(appointment.time || '').trim(),
        notes,
        treatmentSummary,
      },
      $setOnInsert: { recordedAt: new Date() },
    },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );
}

function appointmentIsInFuture(appointment) {
  const date = String(appointment?.date || '').slice(0, 10);
  const timeMatch = String(appointment?.time || '').match(/^(\d{1,2}):(\d{2})/);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !timeMatch) return false;
  const startsAt = new Date(
    `${date}T${String(Number(timeMatch[1])).padStart(2, '0')}:${timeMatch[2]}:00`
  );
  return !Number.isNaN(startsAt.getTime()) && startsAt.getTime() > Date.now();
}

/** Normaliza una cita para la app: nombres de profesional/servicio/paciente siempre presentes */
function serializeAppointment(doc) {
  if (!doc) return null;
  const a = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };

  const prof =
    a.professionalId && typeof a.professionalId === 'object' ? a.professionalId : null;
  const svc = a.serviceId && typeof a.serviceId === 'object' ? a.serviceId : null;
  const client = a.clientId && typeof a.clientId === 'object' ? a.clientId : null;

  const professionalName =
    String(a.professionalName || '').trim() ||
    (prof && prof.fullName) ||
    '';
  const serviceName =
    String(a.service || '').trim() ||
    (svc && svc.name) ||
    (prof && prof.service) ||
    '';
  const patientName =
    String(a.patientName || '').trim() ||
    (client && client.fullName) ||
    '';
  const patientEmail =
    String(a.patientEmail || '').trim() ||
    (client && client.email) ||
    '';
  const patientPhone =
    String(a.patientPhone || '').trim() ||
    (client && client.phone) ||
    '';

  return {
    ...a,
    professionalName,
    service: serviceName,
    patientName,
    patientEmail,
    patientPhone,
    totalAmount: typeof a.totalAmount === 'number' ? a.totalAmount : a.price || 0,
  };
}

/** Resuelve nombres faltantes desde User/Service (citas existentes sin denormalizar) */
async function enrichAndSerializeAppointments(docs) {
  if (!docs || docs.length === 0) return [];

  const serialized = docs.map(serializeAppointment).filter(Boolean);
  const profIds = new Set();
  const svcIds = new Set();

  for (const row of serialized) {
    if (!row.professionalName) {
      const id = row.professionalId && typeof row.professionalId === 'object'
        ? row.professionalId._id
        : row.professionalId;
      if (id && mongoose.Types.ObjectId.isValid(String(id))) {
        profIds.add(String(id));
      }
    }
    if (!row.service) {
      const id = row.serviceId && typeof row.serviceId === 'object'
        ? row.serviceId._id
        : row.serviceId;
      if (id && mongoose.Types.ObjectId.isValid(String(id))) {
        svcIds.add(String(id));
      }
    }
  }

  const [profRows, svcRows] = await Promise.all([
    profIds.size
      ? User.find({ _id: { $in: [...profIds] } }).select('fullName service').lean()
      : [],
    svcIds.size
      ? Service.find({ _id: { $in: [...svcIds] } }).select('name').lean()
      : [],
  ]);

  const profMap = new Map(profRows.map((u) => [String(u._id), u]));
  const svcMap = new Map(svcRows.map((s) => [String(s._id), s]));
  const toBackfill = [];

  const results = serialized.map((row) => {
    let professionalName = row.professionalName;
    let service = row.service;

    if (!professionalName) {
      const id = String(
        (row.professionalId && typeof row.professionalId === 'object'
          ? row.professionalId._id
          : row.professionalId) || ''
      );
      const u = profMap.get(id);
      if (u && u.fullName) professionalName = u.fullName;
      if (!service && u && u.service) service = String(u.service).trim();
    }

    if (!service) {
      const id = String(
        (row.serviceId && typeof row.serviceId === 'object'
          ? row.serviceId._id
          : row.serviceId) || ''
      );
      const s = svcMap.get(id);
      if (s && s.name) service = s.name;
    }

    if (
      (professionalName && professionalName !== row.professionalName) ||
      (service && service !== row.service)
    ) {
      toBackfill.push({ _id: row._id, professionalName, service });
    }

    return { ...row, professionalName, service };
  });

  if (toBackfill.length) {
    Appointment.bulkWrite(
      toBackfill.map((b) => ({
        updateOne: {
          filter: { _id: b._id },
          update: { $set: { professionalName: b.professionalName, service: b.service } },
        },
      }))
    ).catch((err) => console.warn('Backfill appointment names:', err.message));
  }

  return results;
}

// Middleware de autenticación
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No hay token de autenticación' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido' });
    }
    req.user = user;
    next();
  });
};

// Rutas de autenticación
app.post('/api/v1/auth/login', async (req, res) => {
  try {
    console.log('📨 Login request received:', {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.body
    });
    
    const { email, password } = req.body;
    
    console.log('🔍 Login attempt:', { email, passwordLength: password?.length });
    
    // Buscar usuario en MongoDB
    const user = await User.findOne({ email: email.toLowerCase() });
    console.log('👤 User found:', user ? 'Yes' : 'No', user ? { id: user._id, email: user.email } : '');
    
    if (!user) {
      console.log('❌ User not found');
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Verificar contraseña
    console.log('🔐 Comparing password...');
    const validPassword = await bcrypt.compare(password, user.password);
    console.log('🔐 Password valid:', validPassword);
    
    if (!validPassword) {
      console.log('❌ Invalid password');
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Verificar si el usuario está activo
    if (!user.isActive) {
      return res.status(401).json({ error: 'Cuenta desactivada' });
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email, userType: user.userType },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        service: user.service,
        userType: user.userType,
        isActive: user.isActive,
        isEmailVerified: user.isEmailVerified,
        clientBookingRequiresDeposit: user.clientBookingRequiresDeposit !== false,
        address: user.address,
        preferences: user.preferences,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      },
      token,
      refreshToken: token,
      expiresIn: 86400
    });
  } catch (error) {
    console.error('❌ Error en login:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Verificar si un email ya está registrado
app.get('/api/v1/auth/check-email', async (req, res) => {
  try {
    const email = String(req.query.email || '').trim().toLowerCase();
    if (!email || !email.includes('@')) {
      return res.status(400).json({ taken: false, available: false, error: 'Email inválido' });
    }
    const exists = await User.findOne({ email });
    return res.json({ taken: !!exists, available: !exists });
  } catch (error) {
    console.error('check-email error:', error);
    return res.status(500).json({ taken: false, available: true });
  }
});

function publicUserPayload(user) {
  return {
    _id: user._id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    service: user.service,
    userType: user.userType,
    isActive: user.isActive,
    isEmailVerified: user.isEmailVerified,
    clientBookingRequiresDeposit: user.clientBookingRequiresDeposit !== false,
    googleId: user.googleId || undefined,
    address: user.address,
    preferences: user.preferences,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

// Google: ¿ya existe cuenta con este googleId o email?
app.post('/api/v1/auth/google/check', async (req, res) => {
  try {
    const googleId = String(req.body?.googleId || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!googleId) {
      return res.status(400).json({ success: false, message: 'Google ID es requerido.' });
    }
    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, message: 'Email inválido.' });
    }
    const user = await User.findOne({
      $or: [{ googleId }, { email }],
    })
      .select('_id')
      .lean();
    return res.json({ success: true, exists: Boolean(user) });
  } catch (error) {
    console.error('Error en google/check:', error);
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

// Google: login / registro
app.post('/api/v1/auth/google', async (req, res) => {
  try {
    const googleId = String(req.body?.googleId || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const fullName = String(req.body?.fullName || '').trim() || 'Usuario Google';
    const incomingUserType = req.body?.userType === 'professional' ? 'professional' : 'client';

    if (!googleId) {
      return res.status(400).json({ success: false, message: 'Google ID es requerido.' });
    }
    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, message: 'Email inválido.' });
    }
    if (fullName.length < 2) {
      return res.status(400).json({ success: false, message: 'Nombre inválido.' });
    }

    let user = await User.findOne({
      $or: [{ googleId }, { email }],
    });

    if (user) {
      if (!user.googleId) {
        user.googleId = googleId;
      }
      if (!user.isEmailVerified) {
        user.isEmailVerified = true;
      }
      await user.save();
    } else {
      const randomPassword = `Gg${crypto.randomBytes(18).toString('hex')}!aA1`;
      user = new User({
        googleId,
        email,
        fullName,
        userType: incomingUserType,
        phone: '',
        password: randomPassword,
        isEmailVerified: true,
        isActive: true,
      });
      await user.save();
      console.log('✅ Usuario creado vía Google:', email, incomingUserType);
    }

    if (user.isActive === false) {
      return res.status(401).json({
        success: false,
        message: 'Cuenta desactivada',
        error: 'ACCOUNT_DISABLED',
      });
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email, userType: user.userType },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Mismo contrato que /auth/login (+ success/data para setSessionFromApiSuccess)
    return res.json({
      success: true,
      message: 'Login con Google exitoso',
      user: publicUserPayload(user),
      token,
      refreshToken: token,
      expiresIn: 86400,
      data: {
        user: publicUserPayload(user),
        token,
        refreshToken: token,
        expiresIn: 86400,
      },
    });
  } catch (error) {
    console.error('Error en login con Google:', error);
    if (error && error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Ese email o cuenta de Google ya está registrado.',
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: 'INTERNAL_ERROR',
    });
  }
});

app.post('/api/v1/auth/register', async (req, res) => {
  try {
    const { fullName, email, password, userType, phone } = req.body;
    
    // Verificar si el usuario ya existe
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: 'El usuario ya existe' });
    }

    // Crear nuevo usuario en MongoDB
    const newUser = new User({
      fullName,
      email: email.toLowerCase(),
      password,
      userType: userType || 'client',
      phone: phone || '',
      isActive: true,
      isEmailVerified: false
    });

    await newUser.save();

    const token = jwt.sign(
      { userId: newUser._id, email: newUser.email, userType: newUser.userType },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      user: {
        _id: newUser._id,
        fullName: newUser.fullName,
        email: newUser.email,
        userType: newUser.userType,
        isActive: newUser.isActive,
        isEmailVerified: newUser.isEmailVerified
      },
      token,
      refreshToken: token,
      expiresIn: 86400
    });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Página puente HTTP (clickeable desde Gmail) → abre la app en /reset-password
// También permite cambiar la contraseña desde el navegador si la app no abre.
app.get('/api/v1/auth/reset-open', async (req, res) => {
  try {
    const token = String(req.query.token || '').trim();
    const forceFallback = String(req.query.fallback || '') === '1';
    if (!token || token.length < 16) {
      return res.status(400).send(`<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Enlace inválido</title></head>
<body style="font-family:system-ui;padding:24px;background:#f8fafc;color:#111">
<h1>Enlace inválido</h1>
<p>Pedí uno nuevo desde la app: <strong>Olvidé mi contraseña</strong>.</p>
</body></html>`);
    }

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpiresAt: { $gt: new Date() },
      isActive: { $ne: false },
    }).select('_id email');

    if (!user) {
      return res.status(400).send(`<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Enlace vencido</title></head>
<body style="font-family:system-ui;padding:24px;background:#f8fafc;color:#111">
<h1>Enlace vencido o ya usado</h1>
<p>Volvé a la app y pedí un nuevo enlace de recuperación.</p>
</body></html>`);
    }

    const { buildResetUrls } = require('./services/emailService');
    const urls = buildResetUrls(token);
    const tokenAttr = String(token)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;');
    const deep1 = urls.appResetUrl;
    const deep2 = urls.appResetUrlAlt;
    const intentUrl = urls.androidIntentUrl;
    const apiReset = '/api/v1/auth/reset-password';

    const autoOpenScript = forceFallback
      ? ''
      : `
<script>
(function () {
  var deepA = ${JSON.stringify(deep1)};
  var deepB = ${JSON.stringify(deep2)};
  var intent = ${JSON.stringify(intentUrl)};
  var opened = false;
  function tryOpen(url) {
    try {
      var iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = url;
      document.body.appendChild(iframe);
      setTimeout(function () { try { document.body.removeChild(iframe); } catch (e) {} }, 1500);
    } catch (e) {}
    try { window.location.href = url; } catch (e2) {}
  }
  // Intentar abrir Turnario de inmediato
  tryOpen(deepA);
  setTimeout(function () { if (!opened) tryOpen(deepB); }, 400);
  setTimeout(function () {
    if (!opened && /Android/i.test(navigator.userAgent)) tryOpen(intent);
  }, 900);
})();
</script>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return res.send(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Restablecer contraseña — Turnario</title>
  <style>
    body{margin:0;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#f4f6fb;color:#1f2937}
    .wrap{max-width:440px;margin:0 auto;padding:28px 18px}
    .card{background:#fff;border-radius:16px;padding:24px;box-shadow:0 8px 24px rgba(15,23,42,.08)}
    h1{font-size:22px;margin:0 0 8px}
    p{color:#4b5563;line-height:1.5}
    label{display:block;font-size:13px;font-weight:600;margin:14px 0 6px}
    input{width:100%;box-sizing:border-box;padding:12px 14px;border:1px solid #e5e7eb;border-radius:12px;font-size:16px}
    .btn{display:block;width:100%;box-sizing:border-box;margin-top:12px;padding:14px 16px;border:0;border-radius:12px;font-size:16px;font-weight:600;cursor:pointer;text-align:center;text-decoration:none}
    .btn-primary{background:#4f6bed;color:#fff}
    .btn-secondary{background:#eef2ff;color:#3730a3}
    .msg{margin-top:12px;font-size:14px}
    .ok{color:#047857}.err{color:#b91c1c}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <h1>Restablecer contraseña</h1>
      <p>Te estamos abriendo <strong>Turnario</strong>. Si no se abre, usá el botón o completá el formulario abajo.</p>
      <a class="btn btn-primary" href="${deep1}">Abrir Turnario</a>
      <a class="btn btn-secondary" href="${deep2}">Abrir app (alternativa)</a>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:22px 0" />
      <p style="margin:0 0 4px;font-weight:600;color:#111">O cambiá la contraseña acá</p>
      <form id="resetForm">
        <input type="hidden" name="token" value="${tokenAttr}" />
        <label for="password">Nueva contraseña</label>
        <input id="password" name="password" type="password" minlength="6" required autocomplete="new-password" />
        <label for="confirm">Confirmar contraseña</label>
        <input id="confirm" name="confirm" type="password" minlength="6" required autocomplete="new-password" />
        <button class="btn btn-primary" type="submit">Guardar contraseña</button>
        <div id="msg" class="msg" role="status"></div>
      </form>
    </div>
  </div>
  ${autoOpenScript}
  <script>
  document.getElementById('resetForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    var msg = document.getElementById('msg');
    var password = document.getElementById('password').value;
    var confirm = document.getElementById('confirm').value;
    msg.className = 'msg';
    if (password.length < 6) { msg.className = 'msg err'; msg.textContent = 'Mínimo 6 caracteres.'; return; }
    if (password !== confirm) { msg.className = 'msg err'; msg.textContent = 'Las contraseñas no coinciden.'; return; }
    msg.textContent = 'Guardando…';
    try {
      var res = await fetch(${JSON.stringify(apiReset)}, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ token: ${JSON.stringify(token)}, password: password })
      });
      var body = {};
      try { body = await res.json(); } catch (err) {}
      if (!res.ok) throw new Error(body.message || 'No se pudo actualizar');
      msg.className = 'msg ok';
      msg.textContent = 'Contraseña actualizada. Ya podés iniciar sesión en la app.';
      document.getElementById('password').value = '';
      document.getElementById('confirm').value = '';
    } catch (err) {
      msg.className = 'msg err';
      msg.textContent = err.message || 'Error al guardar';
    }
  });
  </script>
</body>
</html>`);
  } catch (error) {
    console.error('reset-open error:', error);
    return res.status(500).send('Error al abrir el restablecimiento.');
  }
});

// Recuperación de contraseña: envía email con enlace (deep link / web)
app.post('/api/v1/auth/forgot-password', async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    console.log('📩 forgot-password request:', { email });
    if (!email || !email.includes('@')) {
      return res.status(400).json({ message: 'Email inválido.' });
    }

    const genericOk = {
      success: true,
      message: 'Si el email existe, te enviamos un enlace de recuperación. Revisá tu bandeja de entrada y spam.',
    };

    const user = await User.findOne({ email }).select('_id email fullName isActive');
    if (!user || user.isActive === false) {
      // Misma respuesta para no filtrar emails registrados
      return res.json(genericOk);
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          resetPasswordToken: resetToken,
          resetPasswordExpiresAt: expiresAt,
        },
      }
    );

    await emailService.ensureReady();
    const allowLocalToken =
      process.env.ALLOW_LOCAL_RESET_TOKEN === '1' ||
      process.env.ALLOW_LOCAL_RESET_TOKEN === 'true';

    if (!emailService.isConfigured()) {
      console.warn('📩 Email no configurado para forgot-password');
      if (allowLocalToken) {
        console.log('🔐 Token local (solo desarrollo):', resetToken);
        return res.json({
          ...genericOk,
          delivery: 'local_token',
          token: resetToken,
          message:
            'Email no configurado. Token de desarrollo generado (ALLOW_LOCAL_RESET_TOKEN).',
        });
      }
      await User.updateOne(
        { _id: user._id },
        { $unset: { resetPasswordToken: 1, resetPasswordExpiresAt: 1 } }
      ).catch(() => {});
      return res.status(503).json({
        success: false,
        message:
          'El servicio de email no está disponible. Configurá EMAIL_USER + EMAIL_APP_PASSWORD o RESEND_API_KEY en el backend.',
        error: 'EMAIL_SERVICE_UNAVAILABLE',
      });
    }

    try {
      const sent = await emailService.sendPasswordReset(
        { email: user.email, fullName: user.fullName },
        resetToken
      );
      return res.json({
        ...genericOk,
        delivery: sent?.delivery || 'email',
      });
    } catch (sendErr) {
      console.error('📩 Error enviando email de recuperación:', sendErr.message || sendErr);
      await User.updateOne(
        { _id: user._id },
        { $unset: { resetPasswordToken: 1, resetPasswordExpiresAt: 1 } }
      ).catch(() => {});

      if (allowLocalToken) {
        // Regenerar token para poder probar UI local
        await User.updateOne(
          { _id: user._id },
          {
            $set: {
              resetPasswordToken: resetToken,
              resetPasswordExpiresAt: expiresAt,
            },
          }
        );
        return res.json({
          ...genericOk,
          delivery: 'local_token',
          token: resetToken,
          message:
            'No se pudo enviar el email. Token de desarrollo generado (ALLOW_LOCAL_RESET_TOKEN).',
        });
      }

      return res.status(502).json({
        success: false,
        message: 'No se pudo enviar el email de recuperación. Intentá nuevamente en unos minutos.',
        error: 'EMAIL_SEND_FAILED',
      });
    }
  } catch (error) {
    console.error('Error en forgot-password:', error);
    return res.status(500).json({ message: 'No se pudo procesar la recuperación.' });
  }
});

// Recuperación de contraseña: confirmar nueva contraseña con token
app.post('/api/v1/auth/reset-password', async (req, res) => {
  try {
    const token = String(req.body?.token || '').trim();
    const password = String(req.body?.password || '');

    if (!token) {
      return res.status(400).json({ message: 'El enlace de recuperación no es válido.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres.' });
    }

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpiresAt: { $gt: new Date() },
      isActive: { $ne: false },
    });

    if (!user) {
      return res.status(400).json({
        message: 'El enlace expiró o ya fue usado. Pedí uno nuevo desde “Olvidé mi contraseña”.',
      });
    }

    user.password = password;
    user.resetPasswordToken = null;
    user.resetPasswordExpiresAt = null;
    await user.save();

    return res.json({
      success: true,
      message: 'Contraseña restablecida correctamente. Ya podés iniciar sesión.',
    });
  } catch (error) {
    console.error('Error en reset-password:', error);
    return res.status(500).json({ message: 'No se pudo restablecer la contraseña.' });
  }
});

// Rutas de usuarios
app.get('/api/v1/users', authenticateToken, async (req, res) => {
  try {
    const users = await User.find({ isActive: true }).select('-password');
    res.json({ users });
  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Endpoint sin autenticación para listar usuarios (modo desarrollo)
app.get('/api/v1/users/all', async (req, res) => {
  try {
    const users = await User.find().select('-password');
    console.log(`👥 Encontrados ${users.length} usuarios`);
    res.json({ 
      success: true,
      count: users.length,
      data: users 
    });
  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error interno del servidor' 
    });
  }
});

app.get('/api/v1/users/:id', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json(user);
  } catch (error) {
    console.error('Error obteniendo usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Listado de usuarios para profesionales (catálogo / búsqueda de clientes)
app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    if (req.user.userType !== 'professional' && req.user.userType !== 'admin') {
      return res.status(403).json({ success: false, message: 'No autorizado', data: [] });
    }

    const { role, search, limit = 50 } = req.query;
    const query = { isActive: true };

    if (role && ['client', 'professional', 'admin'].includes(String(role))) {
      query.userType = String(role);
    }

    const term = String(search || '').trim();
    if (term.length > 0) {
      query.$or = [
        { fullName: { $regex: term, $options: 'i' } },
        { email: { $regex: term, $options: 'i' } },
        { phone: { $regex: term, $options: 'i' } },
      ];
    }

    const max = Math.min(parseInt(String(limit), 10) || 50, 100);
    const users = await User.find(query).select('-password').sort({ fullName: 1 }).limit(max);

    res.json({ success: true, data: users, count: users.length });
  } catch (error) {
    console.error('GET /api/users:', error);
    res.status(500).json({ success: false, message: 'Error al obtener usuarios', data: [] });
  }
});

// Perfil del usuario autenticado (app: GET/PUT /api/users/profile/me)
app.get('/api/users/profile/me', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }
    return res.json({
      success: true,
      data: {
        ...user.toObject(),
        clientBookingRequiresDeposit: user.clientBookingRequiresDeposit !== false,
      },
    });
  } catch (error) {
    console.error('GET /api/users/profile/me:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener perfil' });
  }
});

app.put('/api/users/profile/me', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    const body = req.body || {};
    const updateData = {};

    if (body.fullName !== undefined) updateData.fullName = String(body.fullName).trim();
    if (body.phone !== undefined) updateData.phone = String(body.phone).trim();
    if (body.email !== undefined) updateData.email = String(body.email).trim().toLowerCase();
    if (body.service !== undefined) updateData.service = String(body.service).trim();
    if (body.address !== undefined) updateData.address = body.address;
    if (body.preferences !== undefined) updateData.preferences = body.preferences;
    if (body.profileBio !== undefined) updateData.profileBio = body.profileBio;
    if (Object.prototype.hasOwnProperty.call(body, 'clientBookingRequiresDeposit')) {
      if (user.userType !== 'professional' && user.userType !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Solo profesionales pueden configurar la seña online',
        });
      }
      // Importante: aceptar false explícitamente (no usar truthy check)
      updateData.clientBookingRequiresDeposit = body.clientBookingRequiresDeposit === true || body.clientBookingRequiresDeposit === 'true';
    }
    if (Object.prototype.hasOwnProperty.call(body, 'consultationPrice')) {
      if (user.userType !== 'professional' && user.userType !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Solo profesionales pueden configurar el precio de consulta',
        });
      }
      const n = Number(body.consultationPrice);
      if (!Number.isFinite(n) || n < 0) {
        return res.status(400).json({ success: false, message: 'Precio de consulta inválido' });
      }
      updateData.consultationPrice = Math.round(n);
    }
    if (Object.prototype.hasOwnProperty.call(body, 'depositPercentage')) {
      if (user.userType !== 'professional' && user.userType !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Solo profesionales pueden configurar el porcentaje de seña',
        });
      }
      const n = Number(body.depositPercentage);
      if (!Number.isFinite(n) || n < 0 || n > 100) {
        return res.status(400).json({ success: false, message: 'Porcentaje de seña inválido (0–100)' });
      }
      updateData.depositPercentage = Math.round(n);
    }
    if (Object.prototype.hasOwnProperty.call(body, 'profileImage')) {
      try {
        updateData.profileImage = persistProfileImageDataUri(userId, body.profileImage);
      } catch (imgErr) {
        return res.status(imgErr.status || 400).json({
          success: false,
          message: imgErr.message || 'No se pudo guardar la foto de perfil',
        });
      }
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No hay campos para actualizar',
      });
    }

    const updated = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true,
    }).select('-password');

    console.log('✅ Perfil actualizado (/api/users/profile/me):', {
      userId: String(userId),
      clientBookingRequiresDeposit: updated.clientBookingRequiresDeposit,
    });

    return res.json({
      success: true,
      data: {
        ...updated.toObject(),
        clientBookingRequiresDeposit: updated.clientBookingRequiresDeposit !== false,
      },
      message: 'Perfil actualizado exitosamente',
    });
  } catch (error) {
    console.error('PUT /api/users/profile/me:', error);
    return res.status(500).json({ success: false, message: 'Error al actualizar perfil' });
  }
});

// Actualizar datos de un paciente vinculado al profesional
app.put('/api/users/:patientId', authenticateToken, async (req, res) => {
  try {
    const { patientId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(patientId)) {
      return res.status(400).json({ success: false, message: 'ID de paciente inválido' });
    }
    if (!['professional', 'admin'].includes(req.user.userType)) {
      return res.status(403).json({ success: false, message: 'No autorizado' });
    }

    const patient = await User.findOne({ _id: patientId, userType: 'client' });
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Paciente no encontrado' });
    }

    const {
      fullName,
      email,
      phone,
      dateOfBirth,
      gender,
      address,
      emergencyContact,
      medicalHistory,
      allergies,
      notes,
    } = req.body || {};

    if (typeof fullName === 'string' && fullName.trim()) patient.fullName = fullName.trim();
    if (typeof email === 'string' && email.trim()) patient.email = email.trim().toLowerCase();
    if (typeof phone === 'string') patient.phone = phone.trim();
    if (typeof dateOfBirth === 'string') patient.dateOfBirth = dateOfBirth.trim();
    if (typeof gender === 'string') patient.gender = gender.trim();
    if (typeof emergencyContact === 'string') patient.emergencyContact = emergencyContact.trim();
    if (typeof medicalHistory === 'string') patient.medicalHistory = medicalHistory.trim();
    if (typeof allergies === 'string') patient.allergies = allergies.trim();
    if (typeof notes === 'string') patient.clinicalNotes = notes.trim();
    if (typeof address === 'string') patient.address = { street: address.trim() };
    else if (address && typeof address === 'object') patient.address = address;

    await patient.save();

    // Mantener sincronizados los datos denormalizados en las citas
    await Appointment.updateMany(
      { clientId: patient._id },
      {
        $set: {
          patientName: patient.fullName,
          patientEmail: patient.email,
          patientPhone: patient.phone || '',
        },
      }
    );

    return res.json({
      success: true,
      message: 'Paciente actualizado correctamente',
      data: {
        id: String(patient._id),
        fullName: patient.fullName,
        email: patient.email,
        phone: patient.phone || '',
        dateOfBirth: patient.dateOfBirth || '',
        gender: patient.gender || '',
        address: patient.address || {},
        emergencyContact: patient.emergencyContact || '',
        medicalHistory: patient.medicalHistory || '',
        allergies: patient.allergies || '',
        notes: patient.clinicalNotes || '',
      },
    });
  } catch (error) {
    console.error('PUT /api/users/:patientId:', error);
    if (error?.code === 11000) {
      return res.status(409).json({ success: false, message: 'El correo ya está en uso' });
    }
    if (error?.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: error.message });
    }
    return res.status(500).json({ success: false, message: 'No se pudo actualizar el paciente' });
  }
});

// Pacientes vinculados al profesional según citas previas
app.get(
  '/api/v1/appointments/expo/professional/:professionalId/patients',
  authenticateToken,
  async (req, res) => {
    try {
      const { professionalId } = req.params;
      if (!mongoose.Types.ObjectId.isValid(String(professionalId))) {
        return res.status(400).json({ success: false, data: [], message: 'professionalId inválido' });
      }

      const sessionId = String(req.user.userId || req.user._id || '');
      if (req.user.userType !== 'professional' || sessionId !== String(professionalId)) {
        return res.status(403).json({ success: false, data: [], message: 'No autorizado' });
      }

      const list = await Appointment.find({
        professionalId,
        status: { $nin: ['cancelled', 'rejected'] },
      })
        .populate(
          'clientId',
          'fullName email phone dateOfBirth gender address emergencyContact medicalHistory allergies clinicalNotes isActive'
        )
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

        const key =
          (cid && /^[a-fA-F0-9]{24}$/.test(cid) ? cid : '') ||
          `appt:${String(doc._id)}`;
        if (byKey.has(key)) continue;

        const name =
          (populated && typeof populated === 'object' && populated.fullName) ||
          doc.patientName ||
          'Paciente';
        const email =
          (populated && typeof populated === 'object' && populated.email) ||
          doc.patientEmail ||
          '';
        const phone =
          (populated && typeof populated === 'object' && populated.phone) ||
          doc.patientPhone ||
          '';

        byKey.set(key, {
          rowKey: key,
          clientId: /^[a-fA-F0-9]{24}$/.test(cid) ? cid : null,
          name,
          email,
          phone,
          lastVisit: doc.date,
          dateOfBirth:
            (populated && typeof populated === 'object' && populated.dateOfBirth) || '',
          gender: (populated && typeof populated === 'object' && populated.gender) || '',
          address:
            populated && typeof populated === 'object' && populated.address
              ? typeof populated.address === 'string'
                ? populated.address
                : populated.address.street || ''
              : '',
          emergencyContact:
            (populated && typeof populated === 'object' && populated.emergencyContact) || '',
          medicalHistory:
            (populated && typeof populated === 'object' && populated.medicalHistory) || '',
          allergies: (populated && typeof populated === 'object' && populated.allergies) || '',
          notes: (populated && typeof populated === 'object' && populated.clinicalNotes) || '',
          status:
            populated && typeof populated === 'object' && populated.isActive === false
              ? 'inactive'
              : 'active',
        });
      }

      res.json({ success: true, data: Array.from(byKey.values()) });
    } catch (error) {
      console.error('GET expo professional patients:', error);
      res.status(500).json({ success: false, data: [], message: error.message || 'Error' });
    }
  }
);

// Actualizar perfil del usuario
app.put('/api/v1/users/profile', authenticateToken, async (req, res) => {
  try {
    console.log('📝 Actualizando perfil del usuario:', req.user.userId);
    console.log('📝 Datos recibidos:', req.body);
    
    const { fullName, phone, service, address, preferences } = req.body;
    
    // Validar que al menos un campo esté presente
    if (!fullName && !phone && !service && !address && !preferences) {
      return res.status(400).json({ error: 'Al menos un campo debe ser proporcionado para actualizar' });
    }
    
    // Buscar el usuario
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    // Actualizar solo los campos proporcionados
    const updateData = {};
    if (fullName !== undefined) updateData.fullName = fullName;
    if (phone !== undefined) updateData.phone = phone;
    if (service !== undefined) updateData.service = service;
    if (address !== undefined) updateData.address = address;
    if (preferences !== undefined) updateData.preferences = preferences;
    
    updateData.updatedAt = new Date();
    
    // Actualizar en la base de datos
    const updatedUser = await User.findByIdAndUpdate(
      req.user.userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');
    
    console.log('✅ Perfil actualizado en la base de datos:', updatedUser);
    
    res.json({
      message: 'Perfil actualizado exitosamente',
      user: updatedUser
    });
  } catch (error) {
    console.error('❌ Error actualizando perfil:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Rutas de citas
app.get('/api/v1/appointments', authenticateToken, async (req, res) => {
  try {
    const appointments = await Appointment.find()
      .populate('clientId', 'fullName email phone')
      .populate('professionalId', 'fullName email phone service')
      .populate('serviceId', 'name description price duration')
      .populate('clinicId', 'name address phone')
      .sort({ createdAt: -1 });
    
    res.json({ appointments });
  } catch (error) {
    console.error('Error obteniendo citas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.post('/api/v1/appointments', authenticateToken, async (req, res) => {
  try {
    console.log('📅 Creando cita:', req.body);
    console.log('👤 Usuario autenticado:', req.user);
    
    // Convertir strings a ObjectIds si es necesario
    const appointmentData = {
      ...req.body,
      clientId: req.user.userId,
      professionalId: req.body.professionalId ? new mongoose.Types.ObjectId(req.body.professionalId) : undefined,
      serviceId: req.body.serviceId ? new mongoose.Types.ObjectId(req.body.serviceId) : undefined,
      clinicId: req.body.clinicId ? new mongoose.Types.ObjectId(req.body.clinicId) : undefined
    };

    const dateYmd = String(appointmentData.date || '').slice(0, 10);
    const limits = await validateProfessionalBookingLimits(
      appointmentData.professionalId,
      dateYmd
    );
    if (!limits.ok) {
      return res.status(limits.status).json({ success: false, error: limits.message });
    }
    
    const newAppointment = new Appointment(appointmentData);

    console.log('📅 Objeto de cita creado:', newAppointment);
    await newAppointment.save();
    console.log('✅ Cita guardada en la base de datos');
    
    // Poblar los datos relacionados
    await newAppointment.populate([
      { path: 'clientId', select: 'fullName email phone' },
      { path: 'professionalId', select: 'fullName email phone service' },
      { path: 'serviceId', select: 'name description price duration' },
      { path: 'clinicId', select: 'name address phone' }
    ]);

    res.status(201).json(newAppointment);
  } catch (error) {
    console.error('Error creando cita:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Endpoint para listar todas las citas (sin autenticación - modo desarrollo)
app.get('/api/v1/appointments/all', async (req, res) => {
  try {
    const appointments = await Appointment.find()
      .populate('clientId', 'fullName email phone')
      .populate('professionalId', 'fullName email phone service')
      .populate('serviceId', 'name description price duration')
      .sort({ date: 1, time: 1 });

    const data = await enrichAndSerializeAppointments(appointments);
    console.log(`📋 Encontradas ${data.length} citas en la base de datos`);

    res.json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    console.error('Error obteniendo citas:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    });
  }
});

// Endpoint para obtener citas de un profesional específico (sin autenticación - modo desarrollo)
app.get('/api/v1/appointments/professional/:professionalId', async (req, res) => {
  try {
    const { professionalId } = req.params;
    console.log(`📋 Buscando citas del profesional: ${professionalId}`);
    
    let professionalObjectId;
    
    // Si professionalId es un número o string simple como "3", buscar por email
    if (professionalId === '3' || professionalId === 'prof_unknown') {
      console.log('🔍 Buscando profesional por email (carlos.mendoza@turnario.com)...');
      const professional = await User.findOne({ 
        email: 'carlos.mendoza@turnario.com',
        userType: 'professional'
      });
      
      if (professional) {
        professionalObjectId = professional._id;
        console.log(`✅ Profesional encontrado por email: ${professionalObjectId}`);
      }
    } else if (mongoose.Types.ObjectId.isValid(professionalId)) {
      // Si es un ObjectId válido, usarlo directamente
      professionalObjectId = new mongoose.Types.ObjectId(professionalId);
      console.log(`✅ Usando ObjectId directamente: ${professionalObjectId}`);
    } else {
      // Buscar por email o userId
      const professional = await User.findOne({
        $or: [
          { email: professionalId },
          { userId: professionalId }
        ],
        userType: 'professional'
      });
      
      if (professional) {
        professionalObjectId = professional._id;
        console.log(`✅ Profesional encontrado: ${professionalObjectId}`);
      }
    }
    
    if (!professionalObjectId) {
      console.log(`⚠️ Profesional no encontrado: ${professionalId}`);
      return res.json({ 
        success: true,
        count: 0,
        data: [] 
      });
    }
    
    const appointments = await Appointment.find({
      professionalId: professionalObjectId
    })
      .populate('clientId', 'fullName email phone')
      .populate('professionalId', 'fullName email phone service')
      .populate('serviceId', 'name description price duration')
      .sort({ date: 1, time: 1 });
    
    console.log(`📋 Encontradas ${appointments.length} citas para el profesional ${professionalObjectId}`);

    const data = await enrichAndSerializeAppointments(appointments);
    
    res.json({ 
      success: true,
      count: data.length,
      data
    });
  } catch (error) {
    console.error('Error obteniendo citas del profesional:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error interno del servidor' 
    });
  }
});

// Citas de un cliente (sin autenticación — modo desarrollo, igual que professional)
app.get('/api/v1/appointments/client/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;
    console.log(`📋 Buscando citas del cliente: ${clientId}`);

    if (!mongoose.Types.ObjectId.isValid(String(clientId))) {
      return res.json({ success: true, count: 0, data: [] });
    }

    const appointments = await Appointment.find({
      clientId: new mongoose.Types.ObjectId(clientId),
    })
      .populate('clientId', 'fullName email phone')
      .populate('professionalId', 'fullName email phone service')
      .populate('serviceId', 'name description price duration')
      .sort({ date: 1, time: 1 });

    const data = await enrichAndSerializeAppointments(appointments);
    console.log(`📋 Encontradas ${data.length} citas para el cliente ${clientId}`);

    res.json({ success: true, count: data.length, data });
  } catch (error) {
    console.error('Error obteniendo citas del cliente:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});

// Endpoint sin autenticación para crear citas (modo desarrollo/profesionales)
app.post('/api/v1/appointments/create', async (req, res) => {
  try {
    console.log('📅 Creando cita (sin autenticación):', req.body);
    
    // 1. Buscar o crear usuario cliente
    let clientId = req.body.clientId;
    if (!clientId) {
      if (req.body.patientEmail) {
        // Buscar cliente por email
        const existingClient = await User.findOne({ email: req.body.patientEmail });
        if (existingClient) {
          clientId = existingClient._id;
          console.log('✅ Cliente encontrado por email:', clientId);
        } else {
          // Crear cliente temporal
          const tempClient = new User({
            fullName: req.body.patientName || 'Cliente Temporal',
            email: req.body.patientEmail,
            phone: req.body.patientPhone || '',
            userType: 'client',
            password: 'temp123' // Password temporal
          });
          await tempClient.save();
          clientId = tempClient._id;
          console.log('✅ Cliente temporal creado:', clientId);
        }
      } else {
        // Si no hay email, buscar un cliente genérico
        const genericClient = await User.findOne({ userType: 'client' });
        clientId = genericClient ? genericClient._id : null;
        console.log('⚠️ Usando cliente genérico:', clientId);
      }
    }
    
    // 2. Obtener professionalId
    let professionalId = req.body.professionalId;
    let professionalDoc = null;
    if (professionalId && mongoose.Types.ObjectId.isValid(professionalId)) {
      professionalDoc = await User.findById(professionalId).select('fullName service');
    }
    if (
      professionalId &&
      mongoose.Types.ObjectId.isValid(professionalId) &&
      !professionalDoc
    ) {
      professionalDoc = await User.findOne({
        _id: new mongoose.Types.ObjectId(professionalId),
        userType: 'professional',
      }).select('fullName service');
    }
    if (!professionalId || !mongoose.Types.ObjectId.isValid(professionalId)) {
      professionalDoc = await User.findOne({ userType: 'professional' }).select('fullName service');
      professionalId = professionalDoc ? professionalDoc._id : null;
      console.log('⚠️ Usando profesional por defecto:', professionalId);
    }
    
    // 3. Obtener serviceId (opcional) + nombre de servicio
    let serviceId = req.body.serviceId;
    let serviceName = String(req.body.service || '').trim();
    if (serviceId && mongoose.Types.ObjectId.isValid(serviceId)) {
      const svcDoc = await Service.findById(serviceId).select('name');
      if (svcDoc && !serviceName) serviceName = svcDoc.name;
    } else if (!serviceId || !mongoose.Types.ObjectId.isValid(serviceId)) {
      if (serviceName) {
        // Intentar resolver servicio por nombre
        const byName = await Service.findOne({ name: serviceName });
        serviceId = byName ? byName._id : null;
      } else {
        const service = await Service.findOne();
        serviceId = service ? service._id : null;
        if (service && !serviceName) serviceName = service.name;
        console.log('⚠️ Usando servicio por defecto:', serviceId);
      }
    }

    const professionalName =
      String(req.body.professionalName || '').trim() ||
      String(req.body.professional || '').trim() ||
      (professionalDoc && professionalDoc.fullName) ||
      '';

    if (!serviceName && professionalDoc && professionalDoc.service) {
      serviceName = String(professionalDoc.service).trim();
    }
    
    // Validar IDs mínimos
    if (!clientId || !professionalId) {
      return res.status(400).json({
        success: false,
        error: 'Faltan IDs requeridos (clientId, professionalId)',
        details: { clientId, professionalId, serviceId}
      });
    }

    // Evitar turnos superpuestos: confirmar / por confirmar / pago pendiente ya ocupan el slot
    const dateYmd = String(req.body.date || '').slice(0, 10);
    const timeRaw = String(req.body.time || '').trim();
    const timeKeyMatch = timeRaw.match(/^(\d{1,2}):(\d{2})/);
    const timeKey = timeKeyMatch
      ? `${String(Math.min(23, parseInt(timeKeyMatch[1], 10))).padStart(2, '0')}:${String(Math.min(59, parseInt(timeKeyMatch[2], 10))).padStart(2, '0')}`
      : timeRaw;

    const defaultProfDuration = await getProfessionalAppointmentDuration(professionalId);
    const newDuration = normalizeDurationMinutes(
      req.body.duration != null ? req.body.duration : defaultProfDuration,
      defaultProfDuration
    );
    const newStartMin = timeToMinutes(timeKey);

    const limits = await validateProfessionalBookingLimits(professionalId, dateYmd);
    if (!limits.ok) {
      return res.status(limits.status).json({ success: false, error: limits.message });
    }

    if (dateYmd && timeKey && newStartMin != null) {
      const sameDay = await Appointment.find({
        professionalId: new mongoose.Types.ObjectId(professionalId),
        date: dateYmd,
        status: { $nin: ['cancelled', 'rejected', 'no_show'] },
      }).select('time status duration').lean();

      const taken = sameDay.some((apt) => {
        const aptStart = timeToMinutes(String(apt.time || ''));
        const aptDur = normalizeDurationMinutes(apt.duration, defaultProfDuration);
        return intervalsOverlap(newStartMin, newDuration, aptStart, aptDur);
      });

      if (taken) {
        return res.status(409).json({
          success: false,
          error: 'Ese horario se solapa con otra cita (confirmada o pendiente). Elegí otro turno.',
        });
      }
    }
    
    const appointmentData = {
      clientId: new mongoose.Types.ObjectId(clientId),
      professionalId: new mongoose.Types.ObjectId(professionalId),
      serviceId: serviceId && mongoose.Types.ObjectId.isValid(serviceId)
        ? new mongoose.Types.ObjectId(serviceId)
        : null,
      clinicId: req.body.clinicId ? new mongoose.Types.ObjectId(req.body.clinicId) : null,
      date: dateYmd || req.body.date,
      time: timeKey || req.body.time,
      duration: newDuration,
      status: req.body.status || 'confirmed',
      notes: req.body.notes || '',
      price: req.body.totalAmount || 10000,
      paymentStatus: req.body.paymentStatus || 'pending',
      service: serviceName || '',
      professionalName: professionalName || '',
      patientName: String(req.body.patientName || '').trim(),
      patientEmail: String(req.body.patientEmail || '').trim().toLowerCase(),
      patientPhone: String(req.body.patientPhone || '').trim(),
    };
    
    console.log('📅 Datos de cita preparados:', appointmentData);
    const newAppointment = new Appointment(appointmentData);
    await newAppointment.save();
    console.log('✅ Cita guardada en la base de datos con ID:', newAppointment._id);

    const populated = await Appointment.findById(newAppointment._id)
      .populate('clientId', 'fullName email phone')
      .populate('professionalId', 'fullName email phone service')
      .populate('serviceId', 'name description price duration');

    res.status(201).json({
      success: true,
      data: serializeAppointment(populated),
      message: 'Cita creada exitosamente'
    });
  } catch (error) {
    console.error('❌ Error creando cita:', error);
    console.error('❌ Stack:', error.stack);
    res.status(500).json({ 
      success: false,
      error: 'Error interno del servidor',
      details: error.message
    });
  }
});

// Horarios ya tomados (confirmadas + por confirmar + pago pendiente, etc.)
app.get('/api/v1/appointments/expo/occupied-times/:professionalId/:date', async (req, res) => {
  try {
    const { professionalId, date } = req.params;
    const dateYmd = String(date || '').slice(0, 10);
    if (!mongoose.Types.ObjectId.isValid(String(professionalId)) || !dateYmd) {
      return res.json({ success: true, data: { times: [] } });
    }

    const defaultDuration = await getProfessionalAppointmentDuration(professionalId);
    const list = await Appointment.find({
      professionalId,
      date: dateYmd,
      status: { $nin: ['cancelled', 'rejected', 'no_show'] },
    })
      .select('time status duration')
      .lean();

    const keys = [];
    const appointments = list.map((d) => {
      const duration = normalizeDurationMinutes(d.duration, defaultDuration);
      const startKey =
        expandOccupiedSlotKeys(String(d.time || ''), duration, 15)[0] ||
        String(d.time || '').slice(0, 5);
      keys.push(...expandOccupiedSlotKeys(String(d.time || ''), duration, 15));
      return { time: startKey, duration };
    });

    const uniqueKeys = [...new Set(keys.filter(Boolean))];
    console.log(`🔒 occupied-times ${professionalId} ${dateYmd}:`, uniqueKeys, appointments);
    return res.json({
      success: true,
      data: { times: uniqueKeys, appointments, appointmentDuration: defaultDuration },
    });
  } catch (error) {
    console.error('GET occupied-times:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error', data: { times: [] } });
  }
});

// Confirmar cita (profesional)
app.patch('/api/v1/appointments/expo/:appointmentId/confirm', authenticateToken, async (req, res) => {
  try {
    const { appointmentId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(String(appointmentId))) {
      return res.status(400).json({ success: false, message: 'ID inválido' });
    }
    if (req.user.userType !== 'professional') {
      return res.status(403).json({ success: false, message: 'Solo profesionales pueden confirmar' });
    }

    const doc = await Appointment.findById(appointmentId);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Cita no encontrada' });
    }
    if (String(doc.professionalId) !== String(req.user.userId || req.user._id)) {
      return res.status(403).json({ success: false, message: 'Esta cita no es tuya' });
    }
    if (doc.status === 'cancelled' || doc.status === 'rejected') {
      return res.status(400).json({ success: false, message: 'La cita está cancelada' });
    }

    doc.status = 'confirmed';
    await doc.save();
    console.log('✅ Cita confirmada:', appointmentId);
    return res.json({ success: true, data: doc });
  } catch (error) {
    console.error('PATCH confirm appointment:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error' });
  }
});

// Completar cita y, opcionalmente, registrar notas/tratamiento de la sesión.
app.patch('/api/v1/appointments/expo/:appointmentId/complete', authenticateToken, async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const requesterId = String(req.user.userId || req.user._id || '');
    if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
      return res.status(400).json({ success: false, message: 'ID de cita inválido' });
    }
    if (req.user.userType !== 'professional' && req.user.userType !== 'admin') {
      return res.status(403).json({ success: false, message: 'Solo profesionales pueden completar citas' });
    }

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Cita no encontrada' });
    }
    if (
      req.user.userType !== 'admin' &&
      String(appointment.professionalId) !== requesterId
    ) {
      return res.status(403).json({ success: false, message: 'Esta cita no pertenece al profesional' });
    }
    if (['cancelled', 'rejected', 'no_show'].includes(String(appointment.status))) {
      return res.status(409).json({
        success: false,
        message: 'Una cita cancelada, rechazada o ausente no puede marcarse como completada',
      });
    }
    if (String(appointment.status) !== 'confirmed' && String(appointment.status) !== 'completed') {
      return res.status(409).json({
        success: false,
        message: 'Solo una cita confirmada puede marcarse como completada',
      });
    }
    if (appointmentIsInFuture(appointment)) {
      return res.status(409).json({
        success: false,
        message: 'La cita todavía no comenzó y no puede marcarse como completada',
      });
    }

    const professional = await User.findById(appointment.professionalId)
      .select('fullName')
      .lean();
    const clinicalSession = await saveClinicalSessionForAppointment(
      appointment,
      professional,
      req.body || {}
    );

    appointment.status = 'completed';
    await appointment.save();
    return res.json({ success: true, data: appointment, clinicalSession });
  } catch (error) {
    console.error('PATCH complete appointment:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'No se pudo completar la cita',
    });
  }
});

// Rechazar cita (profesional)
app.patch('/api/v1/appointments/expo/:appointmentId/reject', authenticateToken, async (req, res) => {
  try {
    const { appointmentId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(String(appointmentId))) {
      return res.status(400).json({ success: false, message: 'ID inválido' });
    }
    if (req.user.userType !== 'professional') {
      return res.status(403).json({ success: false, message: 'Solo profesionales' });
    }

    const doc = await Appointment.findById(appointmentId);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Cita no encontrada' });
    }
    if (String(doc.professionalId) !== String(req.user.userId || req.user._id)) {
      return res.status(403).json({ success: false, message: 'Esta cita no es tuya' });
    }

    doc.status = 'cancelled';
    await doc.save();
    console.log('❌ Cita rechazada:', appointmentId);
    return res.json({ success: true, data: doc });
  } catch (error) {
    console.error('PATCH reject appointment:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error' });
  }
});

app.post('/api/v1/medical-history/session', authenticateToken, async (req, res) => {
  try {
    const requesterId = String(req.user.userId || req.user._id || '');
    if (req.user.userType !== 'professional' && req.user.userType !== 'admin') {
      return res.status(403).json({ success: false, message: 'Solo profesionales pueden registrar sesiones' });
    }
    const appointmentId = String(req.body?.appointmentId || '');
    if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
      return res.status(400).json({ success: false, message: 'La sesión requiere una cita válida' });
    }
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Cita no encontrada' });
    }
    if (
      req.user.userType !== 'admin' &&
      String(appointment.professionalId) !== requesterId
    ) {
      return res.status(403).json({ success: false, message: 'Esta cita no pertenece al profesional' });
    }
    if (!['confirmed', 'completed'].includes(String(appointment.status))) {
      return res.status(409).json({
        success: false,
        message: 'Solo se pueden registrar notas de una cita confirmada o completada',
      });
    }
    if (appointmentIsInFuture(appointment)) {
      return res.status(409).json({
        success: false,
        message: 'La sesión todavía no comenzó',
      });
    }
    if (!String(req.body?.notes || '').trim() && !String(req.body?.treatmentSummary || '').trim()) {
      return res.status(400).json({ success: false, message: 'Agregá una nota y/o tratamiento' });
    }
    const professional = await User.findById(appointment.professionalId)
      .select('fullName')
      .lean();
    const session = await saveClinicalSessionForAppointment(
      appointment,
      professional,
      req.body || {}
    );
    return res.status(201).json({ success: true, data: session });
  } catch (error) {
    console.error('POST medical-history/session:', error);
    return res.status(500).json({ success: false, message: error.message || 'No se pudo guardar la sesión' });
  }
});

app.get('/api/v1/medical-history/patient/:patientId', authenticateToken, async (req, res) => {
  try {
    const { patientId } = req.params;
    const requesterId = String(req.user.userId || req.user._id || '');
    if (!mongoose.Types.ObjectId.isValid(patientId)) {
      return res.status(400).json({ success: false, message: 'ID de paciente inválido' });
    }
    const isOwnHistory = requesterId === String(patientId);
    if (!isOwnHistory && req.user.userType !== 'professional' && req.user.userType !== 'admin') {
      return res.status(403).json({ success: false, message: 'No autorizado para consultar este historial' });
    }
    if (!isOwnHistory && req.user.userType === 'professional') {
      const hasRelationship = await Appointment.exists({
        clientId: new mongoose.Types.ObjectId(patientId),
        professionalId: new mongoose.Types.ObjectId(requesterId),
      });
      if (!hasRelationship) {
        return res.status(403).json({ success: false, message: 'El paciente no está vinculado a este profesional' });
      }
    }

    const sessions = await ClinicalSession.find({ patientId })
      .sort({ appointmentDateYmd: -1, appointmentTime: -1, recordedAt: -1 })
      .lean();
    return res.json({ success: true, data: sessions });
  } catch (error) {
    console.error('GET medical-history/patient:', error);
    return res.status(500).json({ success: false, message: 'No se pudo cargar el historial' });
  }
});

// Obtener horarios disponibles para un profesional en una fecha específica
app.get('/api/v1/appointments/available-slots', async (req, res) => {
  try {
    const { professionalId, date, clinicId, serviceId } = req.query;

    if (!professionalId || !date) {
      return res.status(400).json({ 
        success: false, 
        error: 'professionalId y date son requeridos' 
      });
    }

    // Buscar disponibilidad del profesional
    const availability = await ProfessionalAvailability.findOne({ 
      professionalId: professionalId 
    });

    if (!availability || !availability.isActive) {
      return res.json({ 
        success: true, 
        data: { availableSlots: [] } 
      });
    }

    const limits = await validateProfessionalBookingLimits(
      professionalId,
      String(date).slice(0, 10)
    );
    if (!limits.ok) {
      return res.json({
        success: true,
        data: {
          availableSlots: [],
          totalSlots: 0,
          occupiedSlots: [],
          appointmentDuration: normalizeDurationMinutes(availability.appointmentDuration, 30),
          unavailableReason: limits.message,
        },
      });
    }

    const slotDuration = normalizeDurationMinutes(availability.appointmentDuration, 30);

    // Obtener citas existentes para esa fecha (cualquier estado activo bloquea el horario)
    const existingAppointments = await Appointment.find({
      professionalId: professionalId,
      date: date,
      status: { $nin: ['cancelled', 'rejected', 'no_show'] }
    }).select('time duration').lean();

    const occupiedBlocks = existingAppointments.map((apt) => ({
      start: timeToMinutes(String(apt.time || '')),
      duration: normalizeDurationMinutes(apt.duration, slotDuration),
    })).filter((b) => b.start != null);

    const isSlotFree = (time) => {
      const start = timeToMinutes(time);
      if (start == null) return false;
      return !occupiedBlocks.some((b) =>
        intervalsOverlap(start, slotDuration, b.start, b.duration)
      );
    };

    // Generar horarios disponibles basados en la configuración del profesional
    const availableSlots = [];
    const timeSlots = availability.timeSlots || [];
    const workingHours = availability.workingHours || { start: '09:00', end: '17:00' };

    // Si no hay timeSlots configurados, generar horarios por defecto
    if (timeSlots.length === 0) {
      const startMin = timeToMinutes(workingHours.start) ?? 9 * 60;
      const endMin = timeToMinutes(workingHours.end) ?? 17 * 60;

      for (let m = startMin; m + slotDuration <= endMin; m += slotDuration) {
        const time = minutesToTime(m);
        if (isSlotFree(time)) {
          availableSlots.push(time);
        }
      }
    } else {
      // Usar horarios configurados
      timeSlots.forEach((time) => {
        if (isSlotFree(String(time))) {
          availableSlots.push(String(time));
        }
      });
    }

    const occupiedSlots = existingAppointments.flatMap((apt) =>
      expandOccupiedSlotKeys(String(apt.time || ''), normalizeDurationMinutes(apt.duration, slotDuration), 15)
    );

    res.json({ 
      success: true, 
      data: { 
        availableSlots: availableSlots.sort(),
        totalSlots: availableSlots.length,
        occupiedSlots: [...new Set(occupiedSlots)],
        appointmentDuration: slotDuration,
      } 
    });

  } catch (error) {
    console.error('Error obteniendo horarios disponibles:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
});

// Endpoint de prueba simple
app.get('/api/v1/test-availability', async (req, res) => {
  try {
    console.log('🧪 Endpoint de prueba ejecutándose...');
    
    // Probar conexión a MongoDB
    const count = await ProfessionalAvailability.countDocuments();
    console.log('📊 Total de documentos en la colección:', count);
    
    // Probar búsqueda simple
    const availability = await ProfessionalAvailability.findOne({ 
      professionalId: '1' 
    });
    
    console.log('📊 Disponibilidad encontrada:', availability ? 'Sí' : 'No');
    
    res.json({
      success: true,
      message: 'Endpoint de prueba funcionando',
      count: count,
      hasAvailability: !!availability,
      availability: availability
    });

  } catch (error) {
    console.error('❌ Error en endpoint de prueba:', error);
    console.error('❌ Stack trace:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Error en endpoint de prueba',
      details: error.message,
      stack: error.stack
    });
  }
});

// Endpoint para obtener configuración de disponibilidad de un profesional
app.get('/api/v1/availability/:professionalId', async (req, res) => {
  try {
    const { professionalId } = req.params;

    if (!professionalId) {
      return res.status(400).json({
        success: false,
        error: 'professionalId es requerido'
      });
    }

    console.log('🔍 Buscando disponibilidad para professionalId:', professionalId);

    // Buscar configuración de disponibilidad del profesional
    let availability = await ProfessionalAvailability.findOne({ 
      professionalId: professionalId 
    });

    console.log('📊 Disponibilidad encontrada:', availability ? 'Sí' : 'No');

    if (!availability) {
      return res.status(404).json({
        success: false,
        error: 'No se encontró configuración de disponibilidad para este profesional'
      });
    }

    res.json({
      success: true,
      data: availability
    });

  } catch (error) {
    console.error('❌ Error obteniendo configuración de disponibilidad:', error);
    console.error('❌ Stack trace:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: error.message
    });
  }
});

// Endpoint para crear o actualizar configuración de disponibilidad
app.post('/api/v1/availability/:professionalId', async (req, res) => {
  try {
    const { professionalId } = req.params;
    const availabilityData = req.body;

    if (!professionalId) {
      return res.status(400).json({
        success: false,
        error: 'professionalId es requerido'
      });
    }

    console.log('💾 Guardando disponibilidad para professionalId:', professionalId);
    console.log('📊 Datos recibidos:', JSON.stringify(availabilityData, null, 2));

    // Buscar si ya existe configuración
    let availability = await ProfessionalAvailability.findOne({ 
      professionalId: professionalId 
    });

    if (availability) {
      console.log('🔄 Actualizando configuración existente');
      // Actualizar configuración existente
      availability = await ProfessionalAvailability.findOneAndUpdate(
        { professionalId: professionalId },
        { 
          ...availabilityData,
          updatedAt: new Date()
        },
        { new: true, runValidators: true }
      );
    } else {
      console.log('➕ Creando nueva configuración');
      // Crear nueva configuración
      availability = new ProfessionalAvailability({
        professionalId: professionalId,
        ...availabilityData
      });
      await availability.save();
    }

    console.log('✅ Disponibilidad guardada exitosamente:', availability);

    res.json({
      success: true,
      data: availability
    });

  } catch (error) {
    console.error('❌ Error guardando configuración de disponibilidad:', error);
    console.error('❌ Stack trace:', error.stack);
    if (error?.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: 'Configuración de horarios inválida',
        details: error.message
      });
    }
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: error.message
    });
  }
});

// Importar rutas
const dateScheduleRoutes = require('./src/routes/dateSchedule');
const medicalAuthorizationsRoutes = require('./routes/medicalAuthorizations');

// Registrar rutas
app.use('/api/v1/date-schedules', dateScheduleRoutes);
// Misma ruta que TurnarioApp/backend/src/server.js (servicio Expo medicalAuthorizationService)
app.use('/api/medical-authorizations', authenticateToken, medicalAuthorizationsRoutes);

// Rutas de servicios
app.get('/api/v1/services', async (req, res) => {
  try {
    const services = await Service.find({ isActive: true }).sort({ name: 1 });
    res.json({ services });
  } catch (error) {
    console.error('Error obteniendo servicios:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Rutas de clínicas
app.get('/api/v1/clinics', async (req, res) => {
  try {
    const clinics = await Clinic.find({ isActive: true }).sort({ name: 1 });
    res.json({ clinics });
  } catch (error) {
    console.error('Error obteniendo clínicas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Rutas de notificaciones
app.get('/api/v1/notifications', authenticateToken, async (req, res) => {
  try {
    const notifications = await Notification.find({ recipientId: req.user.userId })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ notifications });
  } catch (error) {
    console.error('Error obteniendo notificaciones:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Listado público de profesionales (Reservar cita / filtros)
app.get('/api/v1/professionals', async (req, res) => {
  try {
    const search = String(req.query.search || '').trim();
    const consultorio = String(req.query.consultorio || '').trim().toLowerCase();

    const q = {
      userType: 'professional',
      isActive: { $ne: false },
    };

    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const rx = new RegExp(escaped, 'i');
      q.$or = [{ fullName: rx }, { service: rx }, { email: rx }];
    }

    const list = await User.find(q)
      .select(
        'fullName service phone isActive email clientBookingRequiresDeposit consultationPrice depositPercentage profileImage'
      )
      .sort({ fullName: 1 })
      .limit(100)
      .lean();

    let data = list.map((u) => {
      const name = u.fullName || 'Profesional';
      const svc = String(u.service || '').trim();
      const initials =
        name
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 2)
          .map((p) => (p[0] ? p[0].toUpperCase() : ''))
          .join('') || 'P';

      const offersAllCatalogServices =
        /multi[- ]?rubro|turnario\s*[—\-]\s*multi|super\.professional/i.test(
          `${svc} ${u.email || ''}`
        );

      const rawPrice = Number(u.consultationPrice);
      const price =
        Number.isFinite(rawPrice) && rawPrice > 0 ? Math.round(rawPrice) : 10000;
      const rawPct = Number(u.depositPercentage);
      const depositPercentage =
        Number.isFinite(rawPct) && rawPct >= 0 && rawPct <= 100 ? Math.round(rawPct) : 20;
      const profileImage =
        u.profileImage && typeof u.profileImage === 'string' ? String(u.profileImage) : '';

      return {
        id: String(u._id),
        name,
        specialty: svc || 'Profesional',
        services: svc ? [svc] : [],
        offersAllCatalogServices,
        rating: 4.5,
        reviews: 0,
        price,
        depositPercentage,
        duration: 50,
        isAvailable: true,
        location: '',
        clinicNames: [],
        avatar: initials,
        image: profileImage || undefined,
        profileImage: profileImage || undefined,
        experience: '',
        phone: u.phone ? String(u.phone).trim() : '',
        clientBookingRequiresDeposit: u.clientBookingRequiresDeposit !== false,
      };
    });

    if (consultorio) {
      data = data.filter((p) => {
        const loc = (p.location || '').toLowerCase();
        const clinics = Array.isArray(p.clinicNames) ? p.clinicNames : [];
        return (
          loc.includes(consultorio) ||
          clinics.some((n) => String(n).toLowerCase().includes(consultorio))
        );
      });
    }

    console.log(`👥 GET /api/v1/professionals → ${data.length} (search="${search}")`);
    return res.json({ success: true, data });
  } catch (error) {
    console.error('GET /api/v1/professionals:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al listar profesionales',
      data: [],
    });
  }
});

// Health check
app.get('/api/v1/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Backend funcionando correctamente con MongoDB',
    timestamp: new Date().toISOString(),
    database: 'MongoDB - turnario'
  });
});

// Iniciar servidor
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor backend ejecutándose en puerto ${PORT}`);
  console.log(`📡 Local: http://localhost:${PORT}`);
  console.log(`📡 Red local: http://${HOST_IP}:${PORT}`);
  console.log(`📡 Health check: http://${HOST_IP}:${PORT}/api/v1/health`);
  console.log(`🔗 WebSocket: ws://${HOST_IP}:${PORT}`);
  console.warn(
    '⚠️  Este server (my-app/backend) no incluye /api/v1/expo-payments (Mercado Pago). Para pagos MP usá: TurnarioApp/backend → npm start'
  );
  console.log('📋 Autorizaciones médicas: GET/POST /api/medical-authorizations');
});

// WebSocket para notificaciones en tiempo real
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('🔌 Cliente WebSocket conectado');
  
  ws.on('message', (message) => {
    console.log('📨 Mensaje recibido:', message.toString());
  });
  
  ws.on('close', () => {
    console.log('🔌 Cliente WebSocket desconectado');
  });
});

module.exports = app;