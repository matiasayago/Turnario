const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

function sessionUserId(req) {
  const u = req.user;
  if (!u) return '';
  if (u._id != null) return u._id.toString();
  return String(u.id || '');
}

/** Igual que en auth/register: acepta "+54 9 11 1234-5678" y lo normaliza a E.164 corto. */
function normalizePhoneToE164(raw) {
  if (raw == null) return { ok: true, value: undefined };
  let phoneNorm = String(raw).trim();
  if (phoneNorm === '') return { ok: true, value: undefined };
  phoneNorm = phoneNorm.replace(/[\s\-\.\(\)]/g, '');
  if (!phoneNorm.startsWith('+')) {
    phoneNorm = '+' + phoneNorm.replace(/\D/g, '').replace(/^0+/, '');
  } else {
    phoneNorm = '+' + phoneNorm.slice(1).replace(/\D/g, '');
  }
  if (!/^\+[1-9]\d{0,15}$/.test(phoneNorm)) {
    return { ok: false, error: 'Número de teléfono inválido' };
  }
  return { ok: true, value: phoneNorm };
}

const BUSINESS_TYPES = new Set([
  'medical',
  'beauty',
  'fitness',
  'education',
  'consulting',
  'repair',
  'cleaning',
  'transport',
  'food',
  'retail',
  'other',
]);

const LANGUAGE_LEVELS = new Set(['basic', 'intermediate', 'advanced', 'native']);

/**
 * Actualiza `setPayload` con claves `businessInfo.*` (solo profesionales).
 * @param {Record<string, unknown>} bi
 * @param {Record<string, unknown>} setPayload
 */
function applyBusinessInfoUpdate(bi, setPayload) {
  if (!bi || typeof bi !== 'object') return;

  if (Object.prototype.hasOwnProperty.call(bi, 'businessName')) {
    setPayload['businessInfo.businessName'] = String(bi.businessName != null ? bi.businessName : '')
      .trim()
      .slice(0, 100);
  }
  if (Object.prototype.hasOwnProperty.call(bi, 'businessType')) {
    const t = String(bi.businessType != null ? bi.businessType : '').trim();
    if (BUSINESS_TYPES.has(t)) {
      setPayload['businessInfo.businessType'] = t;
    }
  }
  if (Object.prototype.hasOwnProperty.call(bi, 'businessCategory')) {
    setPayload['businessInfo.businessCategory'] = String(bi.businessCategory != null ? bi.businessCategory : '')
      .trim()
      .slice(0, 50);
  }
  if (Object.prototype.hasOwnProperty.call(bi, 'license')) {
    setPayload['businessInfo.license'] = String(bi.license != null ? bi.license : '')
      .trim()
      .slice(0, 100);
  }
  if (Object.prototype.hasOwnProperty.call(bi, 'experience')) {
    const n = parseInt(String(bi.experience), 10);
    if (!Number.isNaN(n)) {
      setPayload['businessInfo.experience'] = Math.min(50, Math.max(0, n));
    }
  }
  if (Object.prototype.hasOwnProperty.call(bi, 'specialties')) {
    const arr = Array.isArray(bi.specialties) ? bi.specialties : [];
    setPayload['businessInfo.specialties'] = arr
      .map((s) => String(s != null ? s : '').trim().slice(0, 50))
      .filter(Boolean)
      .slice(0, 30);
  }
  if (Object.prototype.hasOwnProperty.call(bi, 'skills')) {
    const arr = Array.isArray(bi.skills) ? bi.skills : [];
    setPayload['businessInfo.skills'] = arr
      .map((s) => String(s != null ? s : '').trim().slice(0, 50))
      .filter(Boolean)
      .slice(0, 40);
  }
  if (Object.prototype.hasOwnProperty.call(bi, 'languages')) {
    const arr = Array.isArray(bi.languages) ? bi.languages : [];
    setPayload['businessInfo.languages'] = arr
      .slice(0, 15)
      .map((l) => {
        if (!l || typeof l !== 'object') return null;
        const lang = String(l.language != null ? l.language : '')
          .trim()
          .slice(0, 30);
        if (!lang) return null;
        const lv = String(l.level != null ? l.level : 'basic').trim();
        const level = LANGUAGE_LEVELS.has(lv) ? lv : 'basic';
        return { language: lang, level };
      })
      .filter(Boolean);
  }
  if (Object.prototype.hasOwnProperty.call(bi, 'education')) {
    const arr = Array.isArray(bi.education) ? bi.education : [];
    const yMax = new Date().getFullYear() + 5;
    setPayload['businessInfo.education'] = arr
      .slice(0, 15)
      .map((e) => {
        if (!e || typeof e !== 'object') return null;
        const degree = String(e.degree != null ? e.degree : '')
          .trim()
          .slice(0, 100);
        const institution = String(e.institution != null ? e.institution : '')
          .trim()
          .slice(0, 100);
        let year;
        if (e.year != null && e.year !== '') {
          const y = parseInt(String(e.year), 10);
          if (!Number.isNaN(y)) year = Math.min(yMax, Math.max(1900, y));
        }
        if (!degree && !institution && year == null) return null;
        const row = {};
        if (degree) row.degree = degree;
        if (institution) row.institution = institution;
        if (year != null) row.year = year;
        return row;
      })
      .filter(Boolean);
  }
  if (Object.prototype.hasOwnProperty.call(bi, 'certifications')) {
    const arr = Array.isArray(bi.certifications) ? bi.certifications : [];
    setPayload['businessInfo.certifications'] = arr
      .slice(0, 20)
      .map((c) => {
        if (!c || typeof c !== 'object') return null;
        const name = String(c.name != null ? c.name : '')
          .trim()
          .slice(0, 100);
        const issuer = String(c.issuer != null ? c.issuer : '')
          .trim()
          .slice(0, 100);
        const row = {};
        if (name) row.name = name;
        if (issuer) row.issuer = issuer;
        if (c.issueDate) {
          const d = new Date(c.issueDate);
          if (!Number.isNaN(d.getTime())) row.issueDate = d;
        }
        if (c.expiryDate) {
          const d = new Date(c.expiryDate);
          if (!Number.isNaN(d.getTime())) row.expiryDate = d;
        }
        if (!row.name && !row.issuer) return null;
        return row;
      })
      .filter(Boolean);
  }
}

// Middleware de autenticación para todas las rutas
router.use(authenticateToken);

// @route   GET /api/users
// @desc    Obtener usuarios según el rol del usuario autenticado
// @access  Private
router.get('/', async (req, res) => {
  try {
    const userType = req.user.userType;
    const userId = sessionUserId(req);
    let users;

    if (userType === 'professional') {
      // Profesionales pueden ver todos los usuarios
      const { role, search, limit = 50, page = 1 } = req.query;
      
      let query = {};
      
      // Filtrar por rol si se especifica
      if (role && ['client', 'professional', 'admin'].includes(role)) {
        query.userType = role;
      }
      
      // Búsqueda por nombre o email
      if (search) {
        query.$or = [
          { fullName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ];
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      users = await User.find(query)
        .select('-password')
        .sort({ fullName: 1 })
        .skip(skip)
        .limit(parseInt(limit));
        
      // Obtener total para paginación
      const total = await User.countDocuments(query);
      
      res.json({
        success: true,
        data: users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      });
    } else {
      // Clientes solo pueden ver su propio perfil
      const user = await User.findById(userId).select('-password');
      res.json({
        success: true,
        data: [user]
      });
    }
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener usuarios'
    });
  }
});

// @route   GET /api/users/profile/me
// @desc    Obtener el perfil del usuario autenticado
// @access  Private
router.get('/profile/me', async (req, res) => {
  try {
    const userId = sessionUserId(req);

    const user = await User.findById(userId).select('-password -expoPushTokens');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error al obtener perfil:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener perfil'
    });
  }
});

// @route   POST /api/users/push-token
// @desc    Registrar token Expo Push (recordatorios de citas, etc.)
// @access  Private
router.post('/push-token', async (req, res) => {
  try {
    const raw = req.body?.expoPushToken ?? req.body?.token ?? req.body?.pushToken;
    const token = String(raw != null ? raw : '').trim();
    if (!token || token.length < 24 || token.length > 500) {
      return res.status(400).json({
        success: false,
        message: 'Token de dispositivo inválido',
      });
    }
    const userId = sessionUserId(req);
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }
    const list = Array.isArray(user.expoPushTokens) ? [...user.expoPushTokens] : [];
    const filtered = list.filter((row) => row && String(row.token) !== token);
    filtered.unshift({ token, updatedAt: new Date() });
    user.expoPushTokens = filtered.slice(0, 10);
    await user.save();
    const tokenHint = `${token.slice(0, 14)}…`;
    console.log(
      `Push token registrado: usuario ${String(userId)} (${String(user.email || '').trim() || 'sin email'}) ${tokenHint}`
    );
    return res.json({ success: true });
  } catch (error) {
    console.error('POST /api/users/push-token:', error);
    return res.status(500).json({
      success: false,
      message: 'No se pudo guardar el token',
    });
  }
});

// @route   PUT /api/users/profile/me
// @desc    Actualizar el perfil del usuario autenticado
// @access  Private
router.put('/profile/me', [
  body('fullName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre debe tener entre 2 y 100 caracteres'),
  body('email')
    .optional()
    .trim()
    .normalizeEmail()
    .isEmail()
    .withMessage('Email inválido'),
  body('phone')
    .optional({ values: 'falsy' })
    .isString()
    .trim()
    .isLength({ max: 40 })
    .withMessage('Formato de teléfono no válido'),
  body('dateOfBirth')
    .optional()
    .isISO8601()
    .withMessage('Fecha de nacimiento inválida'),
  body('address')
    .optional()
    .isObject()
    .withMessage('Dirección debe ser un objeto'),
  body('emergencyContact')
    .optional()
    .isObject()
    .withMessage('Contacto de emergencia debe ser un objeto'),
  body('nationalId')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('El documento no puede exceder 20 caracteres'),
  body('gender')
    .optional()
    .isIn(['male', 'female', 'other', 'prefer_not_to_say'])
    .withMessage('Género inválido'),
  body('profileBio')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('La biografía o notas no pueden exceder 500 caracteres'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Las notas no pueden exceder 500 caracteres'),
  body('service')
    .optional()
    .trim()
    .isLength({ max: 150 })
    .withMessage('El servicio no puede exceder 150 caracteres'),
  // Importante: optional() sin opciones trata `false` como “vacío” en express-validator v7 y no persiste la seña desactivada.
  body('clientBookingRequiresDeposit')
    .optional({ values: 'null' })
    .isBoolean()
    .withMessage('clientBookingRequiresDeposit debe ser verdadero o falso'),
  body('businessInfo')
    .optional()
    .isObject()
    .withMessage('businessInfo debe ser un objeto'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const first = errors.array()[0];
      const hint = first && first.msg ? ` — ${first.msg}` : '';
      return res.status(400).json({
        success: false,
        message: `Datos de entrada inválidos${hint}`,
        errors: errors.array()
      });
    }

    const userId = sessionUserId(req);
    const userType = req.user.userType;

    const allowed = [
      'fullName',
      'phone',
      'email',
      'dateOfBirth',
      'address',
      'emergencyContact',
      'nationalId',
      'gender',
      'profileBio',
      'notes',
    ];
    if (userType === 'professional' || userType === 'admin') {
      allowed.push('service');
    }
    if (userType === 'professional') {
      allowed.push('clientBookingRequiresDeposit');
    }

    const updateData = {};
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        updateData[key] = req.body[key];
      }
    }

    if (Object.prototype.hasOwnProperty.call(updateData, 'phone')) {
      const ph = normalizePhoneToE164(updateData.phone);
      if (!ph.ok) {
        return res.status(400).json({
          success: false,
          message: ph.error,
          error: 'INVALID_PHONE'
        });
      }
      if (ph.value === undefined) {
        delete updateData.phone;
      } else {
        updateData.phone = ph.value;
      }
    }

    Object.keys(updateData).forEach((k) => {
      if (updateData[k] === undefined) delete updateData[k];
    });

    if (Object.prototype.hasOwnProperty.call(updateData, 'clientBookingRequiresDeposit')) {
      const v = updateData.clientBookingRequiresDeposit;
      updateData.clientBookingRequiresDeposit =
        v === true || v === 'true' || v === 1 || v === '1';
    }

    /** Campos planos del schema + rutas anidadas que el modelo usa de verdad */
    const setPayload = {};
    for (const k of ['fullName', 'phone', 'email', 'service', 'clientBookingRequiresDeposit']) {
      if (Object.prototype.hasOwnProperty.call(updateData, k)) {
        setPayload[k] = updateData[k];
      }
    }

    if (
      Object.prototype.hasOwnProperty.call(req.body, 'address') &&
      updateData.address != null &&
      typeof updateData.address === 'object'
    ) {
      const a = updateData.address;
      setPayload.address = {
        street: String(a.street != null ? a.street : '').trim().slice(0, 200),
        city: String(a.city != null ? a.city : '').trim().slice(0, 100),
        state: String(a.state != null ? a.state : '').trim().slice(0, 100),
        zipCode: String(a.zipCode != null ? a.zipCode : '').trim().slice(0, 20),
        country: String(a.country != null ? a.country : '').trim().slice(0, 100),
      };
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'dateOfBirth') && updateData.dateOfBirth) {
      const d = new Date(updateData.dateOfBirth);
      if (!Number.isNaN(d.getTime())) {
        setPayload['personalInfo.dateOfBirth'] = d;
      }
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'nationalId')) {
      const nid = String(updateData.nationalId || '').trim().slice(0, 20);
      setPayload['personalInfo.nationalId'] = nid;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'gender') && updateData.gender) {
      setPayload['personalInfo.gender'] = updateData.gender;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'emergencyContact')) {
      const ecIn = updateData.emergencyContact;
      if (ecIn != null && typeof ecIn === 'object') {
        const ec = {
          name: String(ecIn.name != null ? ecIn.name : '').trim().slice(0, 100),
          relationship: String(ecIn.relationship != null ? ecIn.relationship : '').trim().slice(0, 50),
        };
        const rawEcPhone = ecIn.phone != null ? String(ecIn.phone).trim() : '';
        if (rawEcPhone) {
          const phEc = normalizePhoneToE164(rawEcPhone);
          if (!phEc.ok) {
            return res.status(400).json({
              success: false,
              message: `Teléfono de emergencia: ${phEc.error}`,
              error: 'INVALID_EMERGENCY_PHONE',
            });
          }
          if (phEc.value) ec.phone = phEc.value;
        }
        setPayload['personalInfo.emergencyContact'] = ec;
      }
    }

    const bioFromProfile = Object.prototype.hasOwnProperty.call(req.body, 'profileBio');
    const bioFromNotes = Object.prototype.hasOwnProperty.call(req.body, 'notes');
    const bioText = bioFromProfile ? updateData.profileBio : bioFromNotes ? updateData.notes : undefined;
    if (bioFromProfile || bioFromNotes) {
      setPayload['metadata.bio'] = String(bioText || '').trim().slice(0, 500);
    }

    if (userType === 'professional' && req.body.businessInfo != null && typeof req.body.businessInfo === 'object') {
      applyBusinessInfoUpdate(req.body.businessInfo, setPayload);
    }

    Object.keys(setPayload).forEach((k) => {
      if (setPayload[k] === undefined) delete setPayload[k];
    });

    if (Object.keys(setPayload).length === 0) {
      const current = await User.findById(userId).select('-password -expoPushTokens');
      if (!current) {
        return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
      }
      return res.json({
        success: true,
        message: 'Sin cambios',
        data: current
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: setPayload },
      { new: true, runValidators: true }
    ).select('-password -expoPushTokens');

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Perfil actualizado exitosamente',
      data: updatedUser
    });
  } catch (error) {
    console.error('Error al actualizar perfil:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'El email ya está en uso por otra cuenta',
        error: 'EMAIL_EXISTS'
      });
    }
    if (error.name === 'ValidationError') {
      const first = Object.values(error.errors || {})[0];
      const msg = first && first.message ? first.message : 'Datos inválidos';
      return res.status(400).json({
        success: false,
        message: msg,
        error: 'VALIDATION_ERROR'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error al actualizar perfil',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// @route   GET /api/users/professional-clinics
// @desc    Consultorios guardados del profesional autenticado
// @access  Private (solo professional)
// Nota: debe declararse antes de GET /:id para no capturar "professional-clinics" como id.
router.get('/professional-clinics', requireRole('professional'), async (req, res) => {
  try {
    const userId = sessionUserId(req);
    const user = await User.findById(userId).select('professionalClinicsConfig');
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }
    const cfg = user.professionalClinicsConfig;
    if (!cfg || !Array.isArray(cfg.clinics)) {
      return res.json({
        success: true,
        data: { clinics: [], selectedClinicIndex: 0 },
      });
    }
    let idx = parseInt(cfg.selectedClinicIndex, 10);
    if (Number.isNaN(idx)) idx = 0;
    if (cfg.clinics.length === 0) idx = 0;
    else idx = Math.min(Math.max(0, idx), cfg.clinics.length - 1);
    return res.json({
      success: true,
      data: { clinics: cfg.clinics, selectedClinicIndex: idx },
    });
  } catch (error) {
    console.error('Error al obtener consultorios:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener consultorios',
    });
  }
});

// @route   PUT /api/users/professional-clinics
// @desc    Guardar lista de consultorios e índice activo
// @access  Private (solo professional)
router.put('/professional-clinics', requireRole('professional'), async (req, res) => {
  try {
    const { clinics, selectedClinicIndex } = req.body;
    if (!Array.isArray(clinics)) {
      return res.status(400).json({
        success: false,
        message: 'clinics debe ser un array',
      });
    }
    if (clinics.length > 40) {
      return res.status(400).json({
        success: false,
        message: 'Máximo 40 consultorios',
      });
    }
    let idx = parseInt(selectedClinicIndex, 10);
    if (Number.isNaN(idx)) idx = 0;
    if (clinics.length === 0) {
      idx = 0;
    } else {
      idx = Math.min(Math.max(0, idx), clinics.length - 1);
    }
    const userId = sessionUserId(req);
    const updated = await User.findByIdAndUpdate(
      userId,
      { $set: { professionalClinicsConfig: { clinics, selectedClinicIndex: idx } } },
      { new: true, runValidators: false }
    ).select('-password');

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    return res.json({
      success: true,
      message: 'Consultorios guardados',
      data: updated.professionalClinicsConfig || { clinics, selectedClinicIndex: idx },
    });
  } catch (error) {
    console.error('Error al guardar consultorios:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al guardar consultorios',
    });
  }
});

// @route   GET /api/users/stats/overview
// @desc    Obtener estadísticas generales de usuarios (solo administradores)
// @access  Private (Solo administradores)
router.get('/stats/overview', requireRole('admin'), async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const inactiveUsers = await User.countDocuments({ isActive: false });

    const usersByType = await User.aggregate([
      {
        $group: {
          _id: '$userType',
          count: { $sum: 1 }
        }
      }
    ]);

    const recentUsers = await User.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .select('fullName email userType createdAt');

    res.json({
      success: true,
      data: {
        total: totalUsers,
        active: activeUsers,
        inactive: inactiveUsers,
        byType: usersByType,
        recent: recentUsers
      }
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas'
    });
  }
});

// @route   GET /api/users/:id
// @desc    Obtener un usuario específico
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userType = req.user.userType;
    const userId = sessionUserId(req);

    // Verificar permisos
    if (userType === 'client' && id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para ver este usuario'
      });
    }

    const user = await User.findById(id).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener usuario'
    });
  }
});

// @route   PUT /api/users/:id
// @desc    Actualizar un usuario
// @access  Private
router.put('/:id', [
  body('fullName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre debe tener entre 2 y 100 caracteres'),
  body('phone')
    .optional()
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage('Número de teléfono inválido'),
  body('dateOfBirth')
    .optional()
    .isISO8601()
    .withMessage('Fecha de nacimiento inválida'),
  body('address')
    .optional()
    .isObject()
    .withMessage('Dirección debe ser un objeto'),
  body('address.street')
    .optional()
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Calle debe tener entre 5 y 200 caracteres'),
  body('address.city')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Ciudad debe tener entre 2 y 100 caracteres'),
  body('address.state')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Estado debe tener entre 2 y 100 caracteres'),
  body('address.zipCode')
    .optional()
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('Código postal debe tener entre 3 y 20 caracteres'),
  body('address.country')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('País debe tener entre 2 y 100 caracteres'),
  body('emergencyContact')
    .optional()
    .isObject()
    .withMessage('Contacto de emergencia debe ser un objeto'),
  body('emergencyContact.name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Nombre del contacto de emergencia debe tener entre 2 y 100 caracteres'),
  body('emergencyContact.phone')
    .optional()
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage('Teléfono del contacto de emergencia inválido'),
  body('emergencyContact.relationship')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Relación debe tener entre 2 y 50 caracteres'),
  body('medicalHistory')
    .optional()
    .isArray()
    .withMessage('Historial médico debe ser un array'),
  body('allergies')
    .optional()
    .isArray()
    .withMessage('Alergias debe ser un array'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Las notas no pueden exceder 1000 caracteres')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const userType = req.user.userType;
    const userId = sessionUserId(req);
    const updateData = req.body;

    // Verificar permisos
    if (userType === 'client' && id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para modificar este usuario'
      });
    }

    // Solo administradores pueden cambiar el tipo de usuario
    if (updateData.userType && userType !== 'admin') {
      delete updateData.userType;
    }

    // Solo administradores pueden cambiar el estado
    if (updateData.isActive !== undefined && userType !== 'admin') {
      delete updateData.isActive;
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Usuario actualizado exitosamente',
      data: updatedUser
    });
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar usuario'
    });
  }
});

// @route   DELETE /api/users/:id
// @desc    Desactivar un usuario (soft delete)
// @access  Private (Solo administradores)
router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // No permitir desactivar administradores
    if (user.userType === 'admin') {
      return res.status(400).json({
        success: false,
        message: 'No se puede desactivar un administrador'
      });
    }

    user.isActive = false;
    user.deactivatedAt = new Date();
    user.deactivatedBy = sessionUserId(req);
    await user.save();

    res.json({
      success: true,
      message: 'Usuario desactivado exitosamente'
    });
  } catch (error) {
    console.error('Error al desactivar usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al desactivar usuario'
    });
  }
});

// @route   POST /api/users/:id/reactivate
// @desc    Reactivar un usuario desactivado
// @access  Private (Solo administradores)
router.post('/:id/reactivate', requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    user.isActive = true;
    user.deactivatedAt = undefined;
    user.deactivatedBy = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Usuario reactivado exitosamente'
    });
  } catch (error) {
    console.error('Error al reactivar usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al reactivar usuario'
    });
  }
});

// @route   POST /api/users/:id/change-password
// @desc    Cambiar contraseña de un usuario
// @access  Private
router.post('/:id/change-password', [
  body('currentPassword')
    .isLength({ min: 6 })
    .withMessage('La contraseña actual debe tener al menos 6 caracteres'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('La nueva contraseña debe tener al menos 6 caracteres')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const userType = req.user.userType;
    const userId = sessionUserId(req);
    const { currentPassword, newPassword } = req.body;

    // Verificar permisos
    if (userType === 'client' && id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para cambiar la contraseña de este usuario'
      });
    }

    const user = await User.findById(id).select('+password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Verificar contraseña actual
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Contraseña actual incorrecta'
      });
    }

    // Cambiar contraseña
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Contraseña cambiada exitosamente'
    });
  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    res.status(500).json({
      success: false,
      message: 'Error al cambiar contraseña'
    });
  }
});

module.exports = router;
