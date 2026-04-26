const express = require('express');
const { body } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const ServiceController = require('../controllers/serviceController');

const router = express.Router();

// Validaciones
const createServiceValidation = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres'),
  body('description').trim().isLength({ min: 10, max: 1000 }).withMessage('La descripción debe tener entre 10 y 1000 caracteres'),
  body('price').isFloat({ min: 0 }).withMessage('El precio debe ser un número positivo'),
  body('duration').isInt({ min: 15, max: 480 }).withMessage('La duración debe estar entre 15 y 480 minutos'),
  body('categoryId').isMongoId().withMessage('ID de categoría inválido'),
  body('currency').optional().isIn(['USD', 'EUR', 'COP']).withMessage('Moneda inválida'),
  body('requirements').optional().isArray().withMessage('Los requisitos deben ser un array'),
  body('cancellationPolicy').optional().isString().withMessage('La política de cancelación debe ser texto')
];

const updateServiceValidation = [
  body('name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres'),
  body('description').optional().trim().isLength({ min: 10, max: 1000 }).withMessage('La descripción debe tener entre 10 y 1000 caracteres'),
  body('price').optional().isFloat({ min: 0 }).withMessage('El precio debe ser un número positivo'),
  body('duration').optional().isInt({ min: 15, max: 480 }).withMessage('La duración debe estar entre 15 y 480 minutos'),
  body('categoryId').optional().isMongoId().withMessage('ID de categoría inválido'),
  body('currency').optional().isIn(['USD', 'EUR', 'COP']).withMessage('Moneda inválida'),
  body('requirements').optional().isArray().withMessage('Los requisitos deben ser un array'),
  body('cancellationPolicy').optional().isString().withMessage('La política de cancelación debe ser texto')
];

/**
 * @route   GET /api/services
 * @desc    Obtener lista de servicios
 * @access  Public
 */
router.get('/', ServiceController.getServices);

/**
 * @route   GET /api/services/:id
 * @desc    Obtener servicio específico
 * @access  Public
 */
router.get('/:id', ServiceController.getServiceById);

/**
 * @route   POST /api/services
 * @desc    Crear nuevo servicio
 * @access  Private (Professional, Admin)
 */
router.post('/', authenticateToken, requireRole(['professional', 'admin']), createServiceValidation, validateRequest, ServiceController.createService);

/**
 * @route   PUT /api/services/:id
 * @desc    Actualizar servicio
 * @access  Private (Owner, Admin)
 */
router.put('/:id', authenticateToken, updateServiceValidation, validateRequest, ServiceController.updateService);

/**
 * @route   PATCH /api/services/:id/status
 * @desc    Cambiar estado del servicio
 * @access  Private (Owner, Admin)
 */
router.patch('/:id/status', authenticateToken, ServiceController.updateServiceStatus);

/**
 * @route   DELETE /api/services/:id
 * @desc    Eliminar servicio (soft delete)
 * @access  Private (Owner, Admin)
 */
router.delete('/:id', authenticateToken, ServiceController.deleteService);

/**
 * @route   GET /api/services/search
 * @desc    Buscar servicios
 * @access  Public
 */
router.get('/search', ServiceController.searchServices);

/**
 * @route   GET /api/services/category/:categoryId
 * @desc    Obtener servicios por categoría
 * @access  Public
 */
router.get('/category/:categoryId', ServiceController.getServicesByCategory);

/**
 * @route   GET /api/services/professional/:professionalId
 * @desc    Obtener servicios por profesional
 * @access  Public
 */
router.get('/professional/:professionalId', ServiceController.getServicesByProfessional);

/**
 * @route   GET /api/services/stats/overview
 * @desc    Obtener estadísticas de servicios
 * @access  Private (Admin)
 */
router.get('/stats/overview', authenticateToken, requireRole(['admin']), ServiceController.getServiceStats);

module.exports = router;
