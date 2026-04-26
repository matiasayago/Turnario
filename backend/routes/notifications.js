const express = require('express');
const { body } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const NotificationController = require('../controllers/notificationController');

const router = express.Router();

// Validaciones
const createNotificationValidation = [
  body('recipientId').isMongoId().withMessage('ID de destinatario inválido'),
  body('type').isString().isLength({ min: 1, max: 50 }).withMessage('Tipo de notificación inválido'),
  body('title').isString().isLength({ min: 1, max: 200 }).withMessage('El título debe tener entre 1 y 200 caracteres'),
  body('message').isString().isLength({ min: 1, max: 1000 }).withMessage('El mensaje debe tener entre 1 y 1000 caracteres'),
  body('priority').optional().isIn(['low', 'normal', 'high', 'urgent']).withMessage('Prioridad inválida'),
  body('category').optional().isString().isLength({ max: 50 }).withMessage('Categoría inválida')
];

const createBulkNotificationValidation = [
  body('notifications').isArray({ min: 1 }).withMessage('Se requiere al menos una notificación'),
  body('notifications.*.recipientId').isMongoId().withMessage('ID de destinatario inválido'),
  body('notifications.*.type').isString().isLength({ min: 1, max: 50 }).withMessage('Tipo de notificación inválido'),
  body('notifications.*.title').isString().isLength({ min: 1, max: 200 }).withMessage('El título debe tener entre 1 y 200 caracteres'),
  body('notifications.*.message').isString().isLength({ min: 1, max: 1000 }).withMessage('El mensaje debe tener entre 1 y 1000 caracteres')
];

const updateNotificationValidation = [
  body('title').optional().isString().isLength({ min: 1, max: 200 }).withMessage('El título debe tener entre 1 y 200 caracteres'),
  body('message').optional().isString().isLength({ min: 1, max: 1000 }).withMessage('El mensaje debe tener entre 1 y 1000 caracteres'),
  body('priority').optional().isIn(['low', 'normal', 'high', 'urgent']).withMessage('Prioridad inválida'),
  body('category').optional().isString().isLength({ max: 50 }).withMessage('Categoría inválida')
];

const sendSystemNotificationValidation = [
  body('recipientIds').isArray({ min: 1 }).withMessage('Se requiere al menos un destinatario'),
  body('recipientIds.*').isMongoId().withMessage('ID de destinatario inválido'),
  body('title').isString().isLength({ min: 1, max: 200 }).withMessage('El título debe tener entre 1 y 200 caracteres'),
  body('message').isString().isLength({ min: 1, max: 1000 }).withMessage('El mensaje debe tener entre 1 y 1000 caracteres'),
  body('priority').optional().isIn(['low', 'normal', 'high', 'urgent']).withMessage('Prioridad inválida')
];

/**
 * @route   GET /api/notifications
 * @desc    Obtener lista de notificaciones del usuario autenticado
 * @access  Private
 */
router.get('/', authenticateToken, NotificationController.getNotifications);

/**
 * @route   GET /api/notifications/:id
 * @desc    Obtener notificación específica
 * @access  Private (Recipient)
 */
router.get('/:id', authenticateToken, NotificationController.getNotificationById);

/**
 * @route   POST /api/notifications
 * @desc    Crear nueva notificación
 * @access  Private (Admin, Professional)
 */
router.post('/', authenticateToken, requireRole(['admin', 'professional']), createNotificationValidation, validateRequest, NotificationController.createNotification);

/**
 * @route   POST /api/notifications/bulk
 * @desc    Crear múltiples notificaciones
 * @access  Private (Admin)
 */
router.post('/bulk', authenticateToken, requireRole(['admin']), createBulkNotificationValidation, validateRequest, NotificationController.createBulkNotifications);

/**
 * @route   PUT /api/notifications/:id
 * @desc    Actualizar notificación
 * @access  Private (Sender, Admin)
 */
router.put('/:id', authenticateToken, updateNotificationValidation, validateRequest, NotificationController.updateNotification);

/**
 * @route   PATCH /api/notifications/:id/read
 * @desc    Marcar notificación como leída
 * @access  Private (Recipient)
 */
router.patch('/:id/read', authenticateToken, NotificationController.markAsRead);

/**
 * @route   PATCH /api/notifications/read-all
 * @desc    Marcar todas las notificaciones como leídas
 * @access  Private
 */
router.patch('/read-all', authenticateToken, NotificationController.markAllAsRead);

/**
 * @route   PATCH /api/notifications/:id/archive
 * @desc    Archivar notificación
 * @access  Private (Recipient)
 */
router.patch('/:id/archive', authenticateToken, NotificationController.archiveNotification);

/**
 * @route   DELETE /api/notifications/:id
 * @desc    Eliminar notificación (soft delete)
 * @access  Private (Recipient, Sender, Admin)
 */
router.delete('/:id', authenticateToken, NotificationController.deleteNotification);

/**
 * @route   GET /api/notifications/types
 * @desc    Obtener tipos de notificación disponibles
 * @access  Public
 */
router.get('/types', NotificationController.getNotificationTypes);

/**
 * @route   GET /api/notifications/priorities
 * @desc    Obtener prioridades disponibles
 * @access  Public
 */
router.get('/priorities', NotificationController.getNotificationPriorities);

/**
 * @route   GET /api/notifications/stats/overview
 * @desc    Obtener estadísticas de notificaciones
 * @access  Private
 */
router.get('/stats/overview', authenticateToken, NotificationController.getNotificationStats);

/**
 * @route   POST /api/notifications/system/send
 * @desc    Enviar notificación del sistema
 * @access  Private (Admin)
 */
router.post('/system/send', authenticateToken, requireRole(['admin']), sendSystemNotificationValidation, validateRequest, NotificationController.sendSystemNotification);

module.exports = router;
