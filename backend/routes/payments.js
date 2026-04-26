const express = require('express');
const { body } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const PaymentController = require('../controllers/paymentController');

const router = express.Router();

// Validaciones
const createPaymentValidation = [
  body('bookingId').isMongoId().withMessage('ID de reserva inválido'),
  body('amount').isFloat({ min: 0.01 }).withMessage('El monto debe ser mayor a 0'),
  body('currency').optional().isIn(['USD', 'EUR', 'COP']).withMessage('Moneda inválida'),
  body('paymentMethod').isString().isLength({ min: 1, max: 50 }).withMessage('Método de pago inválido'),
  body('description').optional().isString().isLength({ max: 500 }).withMessage('La descripción no puede exceder 500 caracteres')
];

const updatePaymentValidation = [
  body('amount').optional().isFloat({ min: 0.01 }).withMessage('El monto debe ser mayor a 0'),
  body('currency').optional().isIn(['USD', 'EUR', 'COP']).withMessage('Moneda inválida'),
  body('paymentMethod').optional().isString().isLength({ min: 1, max: 50 }).withMessage('Método de pago inválido'),
  body('description').optional().isString().isLength({ max: 500 }).withMessage('La descripción no puede exceder 500 caracteres')
];

const updateStatusValidation = [
  body('status').isIn(['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded']).withMessage('Estado inválido'),
  body('reason').optional().isString().isLength({ max: 500 }).withMessage('La razón no puede exceder 500 caracteres'),
  body('transactionId').optional().isString().isLength({ max: 100 }).withMessage('ID de transacción inválido')
];

const processPaymentValidation = [
  body('transactionId').optional().isString().isLength({ max: 100 }).withMessage('ID de transacción inválido'),
  body('paymentDetails').optional().isObject().withMessage('Detalles de pago inválidos')
];

/**
 * @route   GET /api/payments
 * @desc    Obtener lista de pagos
 * @access  Private
 */
router.get('/', authenticateToken, PaymentController.getPayments);

/**
 * @route   GET /api/payments/:id
 * @desc    Obtener pago específico
 * @access  Private (Owner, Professional, Admin)
 */
router.get('/:id', authenticateToken, PaymentController.getPaymentById);

/**
 * @route   POST /api/payments
 * @desc    Crear nuevo pago
 * @access  Private (Client)
 */
router.post('/', authenticateToken, requireRole(['client']), createPaymentValidation, validateRequest, PaymentController.createPayment);

/**
 * @route   PUT /api/payments/:id
 * @desc    Actualizar pago
 * @access  Private (Owner, Admin)
 */
router.put('/:id', authenticateToken, updatePaymentValidation, validateRequest, PaymentController.updatePayment);

/**
 * @route   PATCH /api/payments/:id/status
 * @desc    Cambiar estado del pago
 * @access  Private (Professional, Admin)
 */
router.patch('/:id/status', authenticateToken, updateStatusValidation, validateRequest, PaymentController.updatePaymentStatus);

/**
 * @route   POST /api/payments/:id/process
 * @desc    Procesar pago
 * @access  Private (Professional, Admin)
 */
router.post('/:id/process', authenticateToken, processPaymentValidation, validateRequest, PaymentController.processPayment);

/**
 * @route   POST /api/payments/:id/complete
 * @desc    Completar pago
 * @access  Private (Professional, Admin)
 */
router.post('/:id/complete', authenticateToken, processPaymentValidation, validateRequest, PaymentController.completePayment);

/**
 * @route   GET /api/payments/pending
 * @desc    Obtener pagos pendientes
 * @access  Private
 */
router.get('/pending', authenticateToken, PaymentController.getPendingPayments);

/**
 * @route   DELETE /api/payments/:id
 * @desc    Eliminar pago (soft delete)
 * @access  Private (Owner, Admin)
 */
router.delete('/:id', authenticateToken, PaymentController.deletePayment);

/**
 * @route   GET /api/payments/stats/overview
 * @desc    Obtener estadísticas de pagos
 * @access  Private (Admin)
 */
router.get('/stats/overview', authenticateToken, requireRole(['admin']), PaymentController.getPaymentStats);

module.exports = router;
