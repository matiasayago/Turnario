const express = require('express');
const { body } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const UserController = require('../controllers/userController');

const router = express.Router();

// Validaciones
const createUserValidation = [
  body('fullName').trim().isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres'),
  body('email').isEmail().normalizeEmail().withMessage('Email inválido'),
  body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
  body('userType').isIn(['client', 'professional', 'admin']).withMessage('Tipo de usuario inválido'),
  body('phone').optional().isMobilePhone().withMessage('Teléfono inválido'),
  body('dateOfBirth').optional().isISO8601().withMessage('Fecha de nacimiento inválida')
];

const updateUserValidation = [
  body('fullName').optional().trim().isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Email inválido'),
  body('phone').optional().isMobilePhone().withMessage('Teléfono inválido'),
  body('dateOfBirth').optional().isISO8601().withMessage('Fecha de nacimiento inválida'),
  body('userType').optional().isIn(['client', 'professional', 'admin']).withMessage('Tipo de usuario inválido')
];

const updateProfileValidation = [
  body('fullName').optional().trim().isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres'),
  body('phone').optional().isMobilePhone().withMessage('Teléfono inválido'),
  body('dateOfBirth').optional().isISO8601().withMessage('Fecha de nacimiento inválida')
];

const changePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('Contraseña actual requerida'),
  body('newPassword').isLength({ min: 6 }).withMessage('La nueva contraseña debe tener al menos 6 caracteres')
];

/**
 * @route   GET /api/users
 * @desc    Obtener lista de usuarios
 * @access  Private (Admin)
 */
router.get('/', authenticateToken, requireRole(['admin']), UserController.getUsers);

/**
 * @route   GET /api/users/:id
 * @desc    Obtener usuario específico
 * @access  Private (Admin, Owner)
 */
router.get('/:id', authenticateToken, UserController.getUserById);

/**
 * @route   POST /api/users
 * @desc    Crear nuevo usuario
 * @access  Private (Admin)
 */
router.post('/', authenticateToken, requireRole(['admin']), createUserValidation, validateRequest, UserController.createUser);

/**
 * @route   PUT /api/users/:id
 * @desc    Actualizar usuario
 * @access  Private (Admin, Owner)
 */
router.put('/:id', authenticateToken, updateUserValidation, validateRequest, UserController.updateUser);

/**
 * @route   PATCH /api/users/:id/status
 * @desc    Cambiar estado del usuario
 * @access  Private (Admin)
 */
router.patch('/:id/status', authenticateToken, requireRole(['admin']), UserController.updateUserStatus);

/**
 * @route   PATCH /api/users/:id/verify
 * @desc    Verificar usuario
 * @access  Private (Admin)
 */
router.patch('/:id/verify', authenticateToken, requireRole(['admin']), UserController.verifyUser);

/**
 * @route   DELETE /api/users/:id
 * @desc    Eliminar usuario (soft delete)
 * @access  Private (Admin)
 */
router.delete('/:id', authenticateToken, requireRole(['admin']), UserController.deleteUser);

/**
 * @route   GET /api/users/profile/me
 * @desc    Obtener perfil del usuario autenticado
 * @access  Private
 */
router.get('/profile/me', authenticateToken, UserController.getProfile);

/**
 * @route   PUT /api/users/profile/me
 * @desc    Actualizar perfil del usuario autenticado
 * @access  Private
 */
router.put('/profile/me', authenticateToken, updateProfileValidation, validateRequest, UserController.updateProfile);

/**
 * @route   POST /api/users/profile/change-password
 * @desc    Cambiar contraseña del usuario autenticado
 * @access  Private
 */
router.post('/profile/change-password', authenticateToken, changePasswordValidation, validateRequest, UserController.changePassword);

/**
 * @route   GET /api/users/stats/overview
 * @desc    Obtener estadísticas de usuarios
 * @access  Private (Admin)
 */
router.get('/stats/overview', authenticateToken, requireRole(['admin']), UserController.getUserStats);

module.exports = router;
