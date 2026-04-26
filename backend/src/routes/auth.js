const express = require('express');
const mongoose = require('mongoose');
const { body, query, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { getJwtSecret } = require('../config/jwtSecret');
const EmailService = require('../services/emailService');

const router = express.Router();
const emailService = EmailService.getSingleton();

// Generar token JWT
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    getJwtSecret(),
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// @route   GET /api/auth/check-email
// @desc    Indica si el email ya está registrado (consulta MongoDB)
// @access  Public
router.get(
  '/check-email',
  [
    query('email')
      .trim()
      .notEmpty()
      .withMessage('Email requerido')
      .isEmail()
      .withMessage('Email inválido')
      .normalizeEmail(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          available: false,
          message: 'Email inválido',
          errors: errors.array(),
        });
      }

      if (mongoose.connection.readyState !== 1) {
        return res.status(503).json({
          success: false,
          available: null,
          message:
            'Base de datos no disponible. Iniciá MongoDB y revisá MONGODB_URI en .env del backend.',
          error: 'DATABASE_UNAVAILABLE',
        });
      }

      const emailNorm = String(req.query.email || '')
        .trim()
        .toLowerCase();
      const existingUser = await User.findByEmail(emailNorm);
      const taken = !!existingUser;

      return res.json({
        success: true,
        email: emailNorm,
        available: !taken,
        taken,
      });
    } catch (err) {
      console.error('Error en check-email:', err);
      return res.status(500).json({
        success: false,
        available: null,
        message: 'No se pudo verificar el email',
        error: 'INTERNAL_ERROR',
      });
    }
  }
);

// @route   POST /api/auth/register
// @desc    Registrar nuevo usuario
// @access  Public
router.post('/register', [
  body('email')
    .isEmail()
    .withMessage('Email inválido')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('La contraseña debe tener al menos 6 caracteres'),
  body('fullName')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('El nombre debe tener entre 1 y 100 caracteres'),
  body('userType')
    .isIn(['client', 'professional'])
    .withMessage('Tipo de usuario inválido'),
  body('phone')
    .optional()
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage('Número de teléfono inválido')
], async (req, res) => {
  try {
    // Verificar errores de validación
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        errors: errors.array()
      });
    }

    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message:
          'Base de datos no disponible. Iniciá MongoDB (local o Atlas), revisá MONGODB_URI en .env del backend y reiniciá el servidor.',
        error: 'DATABASE_UNAVAILABLE',
        details: `readyState=${mongoose.connection.readyState} (1=conectado)`,
      });
    }

    const { email, password, fullName, userType, phone, dateOfBirth, address } = req.body;
    const emailNorm = String(email || '').trim().toLowerCase();
    if (!emailNorm) {
      return res.status(400).json({
        success: false,
        message: 'El email es requerido',
        error: 'EMAIL_REQUIRED',
      });
    }

    let phoneNorm = phone != null && String(phone).trim() !== '' ? String(phone).trim() : '';
    if (phoneNorm) {
      phoneNorm = phoneNorm.replace(/[\s\-\.\(\)]/g, '');
      if (!phoneNorm.startsWith('+')) {
        phoneNorm = '+' + phoneNorm.replace(/\D/g, '').replace(/^0+/, '');
      } else {
        phoneNorm = '+' + phoneNorm.slice(1).replace(/\D/g, '');
      }
    }
    if (!phoneNorm || !/^\+[1-9]\d{0,15}$/.test(phoneNorm)) {
      phoneNorm = '+10000000001';
    }

    // Verificar si el usuario ya existe (misma normalización que al guardar)
    const existingUser = await User.findByEmail(emailNorm);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'El email ya está registrado. Usá otro correo o iniciá sesión.',
        error: 'EMAIL_EXISTS',
      });
    }

    // Crear nuevo usuario
    const userData = {
      email: emailNorm,
      password,
      fullName,
      userType,
      phone: phoneNorm
    };

    // Agregar campos opcionales si están presentes
    if (dateOfBirth) userData.dateOfBirth = dateOfBirth;
    if (address) userData.address = address;

    const user = new User(userData);
    await user.save();

    // Generar token
    const token = generateToken(user._id);

    // Actualizar último login
    await user.updateLastLogin();

    res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente',
      data: {
        user: user.getPublicProfile(),
        token
      }
    });

  } catch (error) {
    console.error('Error en registro:', error && error.stack ? error.stack : error);
    if (error.name === 'ValidationError') {
      const first = Object.values(error.errors || {})[0];
      const msg = first && first.message ? first.message : 'Datos de usuario inválidos';
      return res.status(400).json({
        success: false,
        message: msg,
        error: 'VALIDATION_ERROR',
      });
    }
    const code = error.code;
    if (code === 11000) {
      const key = error.keyPattern && typeof error.keyPattern === 'object' ? error.keyPattern : {};
      const field = Object.keys(key)[0] || 'email';
      const msg =
        field === 'email' ? 'El email ya está registrado' : `Ya existe un registro con ese ${field}`;
      return res.status(400).json({
        success: false,
        message: msg,
        error: 'DUPLICATE_KEY',
      });
    }
    const safeMsg =
      error instanceof Error && error.message && !/secret|password|key/i.test(error.message)
        ? error.message
        : 'Error interno del servidor';
    const detailStr =
      error instanceof Error ? error.message : error != null ? String(error) : 'unknown';
    res.status(500).json({
      success: false,
      // Misma lógica que safeMsg (sin texto sensible); en producción también sirve para depurar registro sin filtrar a ciegas
      message: safeMsg,
      error: 'INTERNAL_ERROR',
      details: detailStr,
    });
  }
});

// @route   POST /api/auth/login
// @desc    Iniciar sesión
// @access  Public
router.post('/login', [
  body('email')
    .isEmail()
    .withMessage('Email inválido')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('La contraseña es requerida')
], async (req, res) => {
  try {
    // Verificar errores de validación
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        errors: errors.array()
      });
    }

    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message:
          'Base de datos no disponible. Iniciá MongoDB y revisá MONGODB_URI en .env del backend.',
        error: 'DATABASE_UNAVAILABLE',
        details: `readyState=${mongoose.connection.readyState}`,
      });
    }

    const { email, password } = req.body;
    const emailNorm = String(email || '').trim().toLowerCase();

    // Buscar usuario por email (incluyendo contraseña), misma normalización que en registro
    const user = await User.findOne({ email: emailNorm }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas',
        error: 'INVALID_CREDENTIALS'
      });
    }

    // Verificar si la cuenta está activa
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Cuenta desactivada',
        error: 'ACCOUNT_DISABLED'
      });
    }

    // Verificar contraseña
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas',
        error: 'INVALID_CREDENTIALS'
      });
    }

    // Generar token
    const token = generateToken(user._id);

    // Actualizar último login
    await user.updateLastLogin();

    res.json({
      success: true,
      message: 'Login exitoso',
      data: {
        user: user.getPublicProfile(),
        token
      }
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: 'INTERNAL_ERROR'
    });
  }
});

// @route   POST /api/auth/google/check
// @desc    Indica si ya existe usuario con este Google ID o email (para pedir cliente/profesional solo al alta)
// @access  Public
router.post('/google/check', [
  body('googleId').notEmpty().withMessage('Google ID es requerido'),
  body('email').isEmail().withMessage('Email inválido').normalizeEmail(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos inválidos',
        errors: errors.array(),
      });
    }
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Base de datos no disponible',
        error: 'DATABASE_UNAVAILABLE',
      });
    }
    const { googleId, email } = req.body;
    const emailNorm = String(email || '').trim().toLowerCase();
    const user = await User.findOne({
      $or: [{ googleId: String(googleId) }, { email: emailNorm }],
    })
      .select('_id')
      .lean();
    return res.json({
      success: true,
      exists: Boolean(user),
    });
  } catch (err) {
    console.error('Error en google/check:', err);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: 'INTERNAL_ERROR',
    });
  }
});

// @route   POST /api/auth/google
// @desc    Login con Google
// @access  Public
router.post('/google', [
  body('googleId')
    .notEmpty()
    .withMessage('Google ID es requerido'),
  body('email')
    .isEmail()
    .withMessage('Email inválido')
    .normalizeEmail(),
  body('fullName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre debe tener entre 2 y 100 caracteres'),
  body('userType')
    .optional()
    .isIn(['client', 'professional'])
    .withMessage('Tipo de usuario inválido (solo client o professional)'),
], async (req, res) => {
  try {
    // Verificar errores de validación
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        errors: errors.array()
      });
    }

    const { googleId, email, fullName, userType: incomingUserType } = req.body;
    const emailNorm = String(email || '').trim().toLowerCase();
    const newUserType =
      incomingUserType === 'professional' ? 'professional' : 'client';

    // Buscar usuario existente por Google ID o email
    let user = await User.findOne({
      $or: [{ googleId }, { email: emailNorm }]
    });

    if (user) {
      // Usuario existe, actualizar Google ID si es necesario
      if (!user.googleId) {
        user.googleId = googleId;
        await user.save();
      }
    } else {
      const randomPassword = `${Math.random().toString(36).slice(-10)}Aa1!`;
      user = new User({
        googleId,
        email: emailNorm,
        fullName,
        userType: newUserType,
        phone: '+10000000001',
        password: randomPassword,
      });
      if (!user.status) user.status = {};
      user.status.emailVerified = true;
      user.status.isVerified = true;
      await user.save();
    }

    // Verificar si la cuenta está activa
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Cuenta desactivada',
        error: 'ACCOUNT_DISABLED'
      });
    }

    // Generar token
    const token = generateToken(user._id);

    // Actualizar último login
    await user.updateLastLogin();

    res.json({
      success: true,
      message: 'Login con Google exitoso',
      data: {
        user: user.getPublicProfile(),
        token
      }
    });

  } catch (error) {
    console.error('Error en login con Google:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: 'INTERNAL_ERROR'
    });
  }
});

// @route   POST /api/auth/apple
// @desc    Login / registro con Sign in with Apple (appleUserId = credential.user)
// @access  Public
router.post('/apple', [
  body('appleUserId')
    .trim()
    .notEmpty()
    .withMessage('appleUserId es requerido'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Email inválido')
    .normalizeEmail(),
  body('fullName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Nombre inválido'),
  body('userType')
    .optional()
    .isIn(['client', 'professional', 'admin'])
    .withMessage('Tipo de usuario inválido'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        errors: errors.array(),
      });
    }

    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message:
          'Base de datos no disponible. Iniciá MongoDB y revisá MONGODB_URI en .env del backend.',
        error: 'DATABASE_UNAVAILABLE',
      });
    }

    const { appleUserId, email, fullName, userType = 'client' } = req.body;
    const emailNorm = email != null && String(email).trim() !== '' ? String(email).trim().toLowerCase() : '';

    let user = await User.findOne({ appleId: appleUserId });
    if (!user && emailNorm) {
      user = await User.findOne({ email: emailNorm });
    }

    if (user) {
      if (!user.appleId) {
        user.appleId = appleUserId;
        await user.save();
      }
    } else {
      const safeId = String(appleUserId).replace(/[^a-zA-Z0-9]/g, '').slice(0, 80) || 'user';
      const syntheticEmail = emailNorm || `apple_${safeId}@users.turnario.app`;
      const name = (fullName && String(fullName).trim()) || 'Usuario Apple';
      const randomPassword = `${Math.random().toString(36).slice(-10)}Aa1!`;
      user = new User({
        appleId: appleUserId,
        email: syntheticEmail,
        fullName: name,
        userType,
        phone: '+10000000001',
        password: randomPassword,
      });
      if (!user.status) user.status = {};
      user.status.emailVerified = !!emailNorm;
      user.status.isVerified = true;
      await user.save();
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Cuenta desactivada',
        error: 'ACCOUNT_DISABLED',
      });
    }

    const token = generateToken(user._id);
    await user.updateLastLogin();

    res.json({
      success: true,
      message: 'Login con Apple exitoso',
      data: {
        user: user.getPublicProfile(),
        token,
      },
    });
  } catch (error) {
    console.error('Error en login con Apple:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe una cuenta con esos datos. Probá iniciar sesión con email.',
        error: 'DUPLICATE_KEY',
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: 'INTERNAL_ERROR',
    });
  }
});

// @route   POST /api/auth/refresh
// @desc    Refrescar token
// @access  Private
router.post('/refresh', authenticateToken, async (req, res) => {
  try {
    // Generar nuevo token
    const token = generateToken(req.user._id);

    res.json({
      success: true,
      message: 'Token refrescado exitosamente',
      data: {
        user: req.user.getPublicProfile(),
        token
      }
    });

  } catch (error) {
    console.error('Error al refrescar token:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: 'INTERNAL_ERROR'
    });
  }
});

// @route   POST /api/auth/logout
// @desc    Cerrar sesión
// @access  Private
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // En una implementación real, aquí se invalidaría el token
    // Por ahora, solo respondemos con éxito
    
    res.json({
      success: true,
      message: 'Logout exitoso'
    });

  } catch (error) {
    console.error('Error en logout:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: 'INTERNAL_ERROR'
    });
  }
});

// @route   GET /api/auth/me
// @desc    Obtener perfil del usuario autenticado
// @access  Private
router.get('/me', authenticateToken, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        user: req.user.getPublicProfile()
      }
    });

  } catch (error) {
    console.error('Error al obtener perfil:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: 'INTERNAL_ERROR'
    });
  }
});

// @route   PUT /api/auth/me
// @desc    Actualizar perfil del usuario autenticado
// @access  Private
router.put('/me', [
  authenticateToken,
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
    .withMessage('Fecha de nacimiento inválida')
], async (req, res) => {
  try {
    // Verificar errores de validación
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        errors: errors.array()
      });
    }

    const { fullName, phone, dateOfBirth, address } = req.body;

    // Actualizar campos permitidos
    if (fullName) req.user.fullName = fullName;
    if (phone) req.user.phone = phone;
    if (dateOfBirth) req.user.dateOfBirth = dateOfBirth;
    if (address) req.user.address = address;

    await req.user.save();

    res.json({
      success: true,
      message: 'Perfil actualizado exitosamente',
      data: {
        user: req.user.getPublicProfile()
      }
    });

  } catch (error) {
    console.error('Error al actualizar perfil:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: 'INTERNAL_ERROR'
    });
  }
});

// @route   POST /api/auth/change-password
// @desc    Cambiar contraseña
// @access  Private
router.post('/change-password', [
  authenticateToken,
  body('currentPassword')
    .notEmpty()
    .withMessage('La contraseña actual es requerida'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('La nueva contraseña debe tener al menos 6 caracteres')
], async (req, res) => {
  try {
    // Verificar errores de validación
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        errors: errors.array()
      });
    }

    const { currentPassword, newPassword } = req.body;

    // Obtener usuario con contraseña
    const user = await User.findById(req.user._id).select('+password');

    // Verificar contraseña actual
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'La contraseña actual es incorrecta',
        error: 'INVALID_CURRENT_PASSWORD'
      });
    }

    // Actualizar contraseña
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
      message: 'Error interno del servidor',
      error: 'INTERNAL_ERROR'
    });
  }
});

// @route   POST /api/auth/forgot-password
// @desc    Solicitar restablecimiento de contraseña por email con token
// @access  Public
router.post('/forgot-password', [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Email inválido')
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

    const email = String(req.body.email || '').trim().toLowerCase();
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    const user = await User.findOne({
      email,
      deletedAt: { $exists: false },
    }).select('_id email fullName').lean();

    if (user && user._id) {
      await User.updateOne(
        { _id: user._id },
        {
          $set: {
            'security.passwordResetToken': resetToken,
            'security.passwordResetExpires': expiresAt,
          },
          $unset: {
            'security.passwordResetOtpHash': 1,
          },
        }
      );

      await emailService.ensureReady();
      if (!emailService.transporter) {
        return res.status(503).json({
          success: false,
          message: 'El servicio de email no está disponible.',
          error: 'EMAIL_SERVICE_UNAVAILABLE',
        });
      }

      try {
        await emailService.sendPasswordReset(user, resetToken);
      } catch (sendErr) {
        await User.updateOne(
          { _id: user._id },
          { $unset: { 'security.passwordResetToken': 1, 'security.passwordResetExpires': 1 } }
        ).catch(() => {});
        return res.status(502).json({
          success: false,
          message: 'No se pudo enviar el email de recuperación. Intentá nuevamente.',
          error: 'EMAIL_SEND_FAILED',
        });
      }
    }

    return res.json({
      success: true,
      message: 'Si el email existe, se enviará un enlace de restablecimiento',
    });
  } catch (error) {
    console.error('Error en forgot password:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: 'INTERNAL_ERROR'
    });
  }
});

// @route   POST /api/auth/reset-password
// @desc    Restablecer contraseña con token
// @access  Public
router.post('/reset-password', [
  body('token')
    .trim()
    .notEmpty()
    .withMessage('Token requerido'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('La contraseña debe tener al menos 6 caracteres'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        errors: errors.array(),
      });
    }

    const token = String(req.body.token || '').trim();
    const newPassword = String(req.body.password || '');
    const now = new Date();

    const user = await User.findOne({
      'security.passwordResetToken': token,
      'security.passwordResetExpires': { $gt: now },
    }).select('+password');

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Token inválido o expirado',
        error: 'INVALID_RESET_TOKEN',
      });
    }

    user.password = newPassword;
    user.security.passwordResetToken = undefined;
    user.security.passwordResetExpires = undefined;
    user.security.passwordResetOtpHash = undefined;
    await user.save();

    return res.json({
      success: true,
      message: 'Contraseña restablecida exitosamente',
    });
  } catch (error) {
    console.error('Error en reset password:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: 'INTERNAL_ERROR',
    });
  }
});

module.exports = router;

