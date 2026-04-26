const express = require('express');
const { body } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const AuthController = require('../controllers/authController');

const router = express.Router();

// Validaciones
const registerValidation = [
  body('fullName').trim().isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres'),
  body('email').isEmail().normalizeEmail().withMessage('Email inválido'),
  body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
  body('userType').isIn(['client', 'professional', 'admin']).withMessage('Tipo de usuario inválido'),
  body('phone').optional().isMobilePhone().withMessage('Teléfono inválido'),
  body('dateOfBirth').optional().isISO8601().withMessage('Fecha de nacimiento inválida')
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Email inválido'),
  body('password').notEmpty().withMessage('Contraseña requerida')
];

const forgotPasswordValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Email inválido')
];

const resetPasswordValidation = [
  body('token').notEmpty().withMessage('Token requerido'),
  body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres')
];

const changePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('Contraseña actual requerida'),
  body('newPassword').isLength({ min: 6 }).withMessage('La nueva contraseña debe tener al menos 6 caracteres')
];

/**
 * @route   POST /api/authenticateToken/register
 * @desc    Registrar un nuevo usuario
 * @access  Public
 */
router.post('/register', registerValidation, validateRequest, AuthController.register);

/**
 * @route   POST /api/authenticateToken/login
 * @desc    Iniciar sesión
 * @access  Public
 */
router.post('/login', loginValidation, validateRequest, AuthController.login);

/**
 * @route   POST /api/authenticateToken/refresh-token
 * @desc    Renovar token
 * @access  Public
 */
router.post('/refresh-token', AuthController.refreshToken);

/**
 * @route   POST /api/authenticateToken/logout
 * @desc    Cerrar sesión
 * @access  Private
 */
router.post('/logout', authenticateToken, AuthController.logout);

/**
 * @route   POST /api/authenticateToken/forgot-password
 * @desc    Solicitar recuperación de contraseña
 * @access  Public
 */
router.post('/forgot-password', forgotPasswordValidation, validateRequest, AuthController.forgotPassword);

/**
 * @route   POST /api/authenticateToken/reset-password
 * @desc    Restablecer contraseña
 * @access  Public
 */
router.post('/reset-password', resetPasswordValidation, validateRequest, AuthController.resetPassword);

/**
 * @route   GET /api/authenticateToken/verify-email/:token
 * @desc    Verificar email
 * @access  Public
 */
router.get('/verify-email/:token', AuthController.verifyEmail);

/**
 * @route   POST /api/authenticateToken/resend-verification
 * @desc    Reenviar email de verificación
 * @access  Public
 */
router.post('/resend-verification', forgotPasswordValidation, validateRequest, AuthController.resendVerificationEmail);

/**
 * @route   GET /api/authenticateToken/profile
 * @desc    Obtener información del usuario autenticado
 * @access  Private
 */
router.get('/profile', authenticateToken, AuthController.getProfile);

/**
 * @route   POST /api/authenticateToken/change-password
 * @desc    Cambiar contraseña del usuario autenticado
 * @access  Private
 */
router.post('/change-password', authenticateToken, changePasswordValidation, validateRequest, AuthController.changePassword);

module.exports = router;
