const express = require('express');
const { body } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const BookingController = require('../controllers/bookingController');

const router = express.Router();

// Validaciones
const createBookingValidation = [
  body('serviceId').isMongoId().withMessage('ID de servicio inválido'),
  body('date').isISO8601().withMessage('Fecha inválida'),
  body('startTime').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Hora de inicio inválida (formato HH:MM)'),
  body('endTime').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Hora de fin inválida (formato HH:MM)'),
  body('notes').optional().isString().isLength({ max: 500 }).withMessage('Las notas no pueden exceder 500 caracteres'),
  body('specialRequirements').optional().isString().isLength({ max: 1000 }).withMessage('Los requisitos especiales no pueden exceder 1000 caracteres')
];

const updateBookingValidation = [
  body('date').optional().isISO8601().withMessage('Fecha inválida'),
  body('startTime').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Hora de inicio inválida (formato HH:MM)'),
  body('endTime').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Hora de fin inválida (formato HH:MM)'),
  body('notes').optional().isString().isLength({ max: 500 }).withMessage('Las notas no pueden exceder 500 caracteres'),
  body('specialRequirements').optional().isString().isLength({ max: 1000 }).withMessage('Los requisitos especiales no pueden exceder 1000 caracteres')
];

const updateStatusValidation = [
  body('status').isIn(['pending', 'confirmed', 'in_progress', 'completed', 'cancelled']).withMessage('Estado inválido'),
  body('reason').optional().isString().isLength({ max: 500 }).withMessage('La razón no puede exceder 500 caracteres')
];

const cancelBookingValidation = [
  body('reason').optional().isString().isLength({ max: 500 }).withMessage('La razón no puede exceder 500 caracteres')
];

/**
 * @route   GET /api/bookings
 * @desc    Obtener lista de reservas
 * @access  Private
 */
router.get('/', authenticateToken, BookingController.getBookings);

/**
 * @route   GET /api/bookings/:id
 * @desc    Obtener reserva específica
 * @access  Private (Owner, Professional, Admin)
 */
router.get('/:id', authenticateToken, BookingController.getBookingById);

/**
 * @route   POST /api/bookings
 * @desc    Crear nueva reserva
 * @access  Private (Client)
 */
router.post('/', authenticateToken, requireRole(['client']), createBookingValidation, validateRequest, BookingController.createBooking);

/**
 * @route   PUT /api/bookings/:id
 * @desc    Actualizar reserva
 * @access  Private (Owner, Professional, Admin)
 */
router.put('/:id', authenticateToken, updateBookingValidation, validateRequest, BookingController.updateBooking);

/**
 * @route   PATCH /api/bookings/:id/status
 * @desc    Cambiar estado de la reserva
 * @access  Private (Owner, Professional, Admin)
 */
router.patch('/:id/status', authenticateToken, updateStatusValidation, validateRequest, BookingController.updateBookingStatus);

/**
 * @route   POST /api/bookings/:id/cancel
 * @desc    Cancelar reserva
 * @access  Private (Owner, Professional, Admin)
 */
router.post('/:id/cancel', authenticateToken, cancelBookingValidation, validateRequest, BookingController.cancelBooking);

/**
 * @route   GET /api/bookings/availability/check
 * @desc    Verificar disponibilidad
 * @access  Public
 */
router.get('/availability/check', BookingController.checkAvailability);

/**
 * @route   GET /api/bookings/upcoming
 * @desc    Obtener reservas próximas
 * @access  Private
 */
router.get('/upcoming', authenticateToken, BookingController.getUpcomingBookings);

/**
 * @route   GET /api/bookings/stats/overview
 * @desc    Obtener estadísticas de reservas
 * @access  Private (Admin)
 */
router.get('/stats/overview', authenticateToken, requireRole(['admin']), BookingController.getBookingStats);

module.exports = router;
