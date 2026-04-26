const express = require('express');
const { body } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const ReviewController = require('../controllers/reviewController');

const router = express.Router();

// Validaciones
const createReviewValidation = [
  body('serviceId').isMongoId().withMessage('ID de servicio inválido'),
  body('professionalId').isMongoId().withMessage('ID de profesional inválido'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('El rating debe estar entre 1 y 5'),
  body('title').isString().isLength({ min: 1, max: 200 }).withMessage('El título debe tener entre 1 y 200 caracteres'),
  body('comment').isString().isLength({ min: 10, max: 1000 }).withMessage('El comentario debe tener entre 10 y 1000 caracteres'),
  body('pros').optional().isString().isLength({ max: 500 }).withMessage('Los pros no pueden exceder 500 caracteres'),
  body('cons').optional().isString().isLength({ max: 500 }).withMessage('Los contras no pueden exceder 500 caracteres')
];

const updateReviewValidation = [
  body('rating').optional().isInt({ min: 1, max: 5 }).withMessage('El rating debe estar entre 1 y 5'),
  body('title').optional().isString().isLength({ min: 1, max: 200 }).withMessage('El título debe tener entre 1 y 200 caracteres'),
  body('comment').optional().isString().isLength({ min: 10, max: 1000 }).withMessage('El comentario debe tener entre 10 y 1000 caracteres'),
  body('pros').optional().isString().isLength({ max: 500 }).withMessage('Los pros no pueden exceder 500 caracteres'),
  body('cons').optional().isString().isLength({ max: 500 }).withMessage('Los contras no pueden exceder 500 caracteres')
];

const replyToReviewValidation = [
  body('comment').isString().isLength({ min: 10, max: 1000 }).withMessage('El comentario debe tener entre 10 y 1000 caracteres')
];

/**
 * @route   GET /api/reviews
 * @desc    Obtener lista de reseñas
 * @access  Public
 */
router.get('/', ReviewController.getReviews);

/**
 * @route   GET /api/reviews/:id
 * @desc    Obtener reseña específica
 * @access  Public
 */
router.get('/:id', ReviewController.getReviewById);

/**
 * @route   POST /api/reviews
 * @desc    Crear nueva reseña
 * @access  Private (Client)
 */
router.post('/', authenticateToken, requireRole(['client']), createReviewValidation, validateRequest, ReviewController.createReview);

/**
 * @route   PUT /api/reviews/:id
 * @desc    Actualizar reseña
 * @access  Private (Author)
 */
router.put('/:id', authenticateToken, updateReviewValidation, validateRequest, ReviewController.updateReview);

/**
 * @route   DELETE /api/reviews/:id
 * @desc    Eliminar reseña (soft delete)
 * @access  Private (Author, Admin)
 */
router.delete('/:id', authenticateToken, ReviewController.deleteReview);

/**
 * @route   POST /api/reviews/:id/helpful
 * @desc    Marcar reseña como útil
 * @access  Private
 */
router.post('/:id/helpful', authenticateToken, ReviewController.markAsHelpful);

/**
 * @route   POST /api/reviews/:id/reply
 * @desc    Responder a una reseña
 * @access  Private (Professional)
 */
router.post('/:id/reply', authenticateToken, requireRole(['professional']), replyToReviewValidation, validateRequest, ReviewController.replyToReview);

/**
 * @route   GET /api/reviews/service/:serviceId
 * @desc    Obtener reseñas por servicio
 * @access  Public
 */
router.get('/service/:serviceId', ReviewController.getReviewsByService);

/**
 * @route   GET /api/reviews/professional/:professionalId
 * @desc    Obtener reseñas por profesional
 * @access  Public
 */
router.get('/professional/:professionalId', ReviewController.getReviewsByProfessional);

/**
 * @route   GET /api/reviews/stats/overview
 * @desc    Obtener estadísticas de reseñas
 * @access  Private (Admin)
 */
router.get('/stats/overview', authenticateToken, requireRole(['admin']), ReviewController.getReviewStats);

/**
 * @route   PATCH /api/reviews/:id/verify
 * @desc    Verificar reseña
 * @access  Private (Admin)
 */
router.patch('/:id/verify', authenticateToken, requireRole(['admin']), ReviewController.verifyReview);

module.exports = router;
