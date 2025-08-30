const express = require('express');
const { body, validationResult } = require('express-validator');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Middleware de autenticación para todas las rutas
router.use(authenticateToken);

// @route   GET /api/notifications
// @desc    Obtener notificaciones del usuario autenticado
// @access  Private
router.get('/', async (req, res) => {
  try {
    const { userId } = req.user;
    const { 
      type, 
      isRead, 
      limit = 50, 
      page = 1,
      sortBy = 'timestamp',
      sortOrder = 'desc'
    } = req.query;
    
    let query = { recipientId: userId };
    
    // Filtrar por tipo de notificación
    if (type) {
      query.type = type;
    }
    
    // Filtrar por estado de lectura
    if (isRead !== undefined) {
      query.isRead = isRead === 'true';
    }

    // Ordenamiento
    let sortOptions = {};
    if (['timestamp', 'type', 'priority', 'isRead'].includes(sortBy)) {
      sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
    } else {
      sortOptions.timestamp = -1; // Ordenamiento por defecto: más recientes primero
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const notifications = await Notification.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('senderId', 'fullName email')
      .populate('recipientId', 'fullName email');
      
    // Obtener total para paginación
    const total = await Notification.countDocuments(query);
    
    // Obtener conteo de no leídas
    const unreadCount = await Notification.countDocuments({ 
      recipientId: userId, 
      isRead: false 
    });
    
    res.json({
      success: true,
      data: notifications,
      unreadCount,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error al obtener notificaciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener notificaciones'
    });
  }
});

// @route   GET /api/notifications/:id
// @desc    Obtener una notificación específica
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;

    const notification = await Notification.findById(id)
      .populate('senderId', 'fullName email')
      .populate('recipientId', 'fullName email');

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notificación no encontrada'
      });
    }

    // Verificar que el usuario solo puede ver sus propias notificaciones
    if (notification.recipientId._id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para ver esta notificación'
      });
    }

    res.json({
      success: true,
      data: notification
    });
  } catch (error) {
    console.error('Error al obtener notificación:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener notificación'
    });
  }
});

// @route   POST /api/notifications
// @desc    Crear una nueva notificación
// @access  Private (Profesionales y Administradores)
router.post('/', requireRole(['professional', 'admin']), [
  body('recipientId')
    .isMongoId()
    .withMessage('ID de destinatario inválido'),
  body('type')
    .isIn(['appointment_request', 'appointment_confirmed', 'appointment_cancelled', 'payment_required', 'reminder', 'system'])
    .withMessage('Tipo de notificación inválido'),
  body('title')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('El título debe tener entre 3 y 100 caracteres'),
  body('message')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('El mensaje debe tener entre 10 y 500 caracteres'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Prioridad inválida'),
  body('appointmentData')
    .optional()
    .isObject()
    .withMessage('Datos de cita deben ser un objeto'),
  body('isRead')
    .optional()
    .isBoolean()
    .withMessage('isRead debe ser un valor booleano')
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

    const { 
      recipientId, 
      type, 
      title, 
      message, 
      priority = 'medium',
      appointmentData,
      isRead = false
    } = req.body;

    // Verificar que el destinatario existe
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(400).json({
        success: false,
        message: 'Destinatario no encontrado'
      });
    }

    // Crear la notificación
    const notificationData = {
      recipientId,
      senderId: req.user.userId,
      type,
      title,
      message,
      priority,
      isRead,
      appointmentData
    };

    const notification = new Notification(notificationData);
    await notification.save();

    // Poblar los datos relacionados
    await notification.populate([
      { path: 'senderId', select: 'fullName email' },
      { path: 'recipientId', select: 'fullName email' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Notificación creada exitosamente',
      data: notification
    });
  } catch (error) {
    console.error('Error al crear notificación:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear notificación'
    });
  }
});

// @route   PUT /api/notifications/:id
// @desc    Actualizar una notificación existente
// @access  Private
router.put('/:id', [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('El título debe tener entre 3 y 100 caracteres'),
  body('message')
    .optional()
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('El mensaje debe tener entre 10 y 500 caracteres'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Prioridad inválida'),
  body('isRead')
    .optional()
    .isBoolean()
    .withMessage('isRead debe ser un valor booleano')
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
    const { userId } = req.user;
    const updateData = req.body;

    const notification = await Notification.findById(id);
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notificación no encontrada'
      });
    }

    // Verificar que el usuario solo puede modificar sus propias notificaciones
    if (notification.recipientId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para modificar esta notificación'
      });
    }

    // Solo se pueden modificar ciertos campos
    const allowedUpdates = ['title', 'message', 'priority', 'isRead'];
    const filteredUpdates = {};
    
    allowedUpdates.forEach(field => {
      if (updateData[field] !== undefined) {
        filteredUpdates[field] = updateData[field];
      }
    });

    // Actualizar la notificación
    const updatedNotification = await Notification.findByIdAndUpdate(
      id,
      filteredUpdates,
      { new: true, runValidators: true }
    ).populate([
      { path: 'senderId', select: 'fullName email' },
      { path: 'recipientId', select: 'fullName email' }
    ]);

    res.json({
      success: true,
      message: 'Notificación actualizada exitosamente',
      data: updatedNotification
    });
  } catch (error) {
    console.error('Error al actualizar notificación:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar notificación'
    });
  }
});

// @route   DELETE /api/notifications/:id
// @desc    Eliminar una notificación
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;

    const notification = await Notification.findById(id);
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notificación no encontrada'
      });
    }

    // Verificar que el usuario solo puede eliminar sus propias notificaciones
    if (notification.recipientId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para eliminar esta notificación'
      });
    }

    await Notification.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Notificación eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar notificación:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar notificación'
    });
  }
});

// @route   POST /api/notifications/:id/mark-read
// @desc    Marcar una notificación como leída
// @access  Private
router.post('/:id/mark-read', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;

    const notification = await Notification.findById(id);
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notificación no encontrada'
      });
    }

    // Verificar que el usuario solo puede marcar sus propias notificaciones
    if (notification.recipientId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para modificar esta notificación'
      });
    }

    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();

    res.json({
      success: true,
      message: 'Notificación marcada como leída'
    });
  } catch (error) {
    console.error('Error al marcar notificación como leída:', error);
    res.status(500).json({
      success: false,
      message: 'Error al marcar notificación como leída'
    });
  }
});

// @route   POST /api/notifications/:id/mark-unread
// @desc    Marcar una notificación como no leída
// @access  Private
router.post('/:id/mark-unread', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;

    const notification = await Notification.findById(id);
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notificación no encontrada'
      });
    }

    // Verificar que el usuario solo puede modificar sus propias notificaciones
    if (notification.recipientId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para modificar esta notificación'
      });
    }

    notification.isRead = false;
    notification.readAt = undefined;
    await notification.save();

    res.json({
      success: true,
      message: 'Notificación marcada como no leída'
    });
  } catch (error) {
    console.error('Error al marcar notificación como no leída:', error);
    res.status(500).json({
      success: false,
      message: 'Error al marcar notificación como no leída'
    });
  }
});

// @route   POST /api/notifications/mark-all-read
// @desc    Marcar todas las notificaciones del usuario como leídas
// @access  Private
router.post('/mark-all-read', async (req, res) => {
  try {
    const { userId } = req.user;

    const result = await Notification.updateMany(
      { recipientId: userId, isRead: false },
      { 
        isRead: true, 
        readAt: new Date() 
      }
    );

    res.json({
      success: true,
      message: `${result.modifiedCount} notificaciones marcadas como leídas`
    });
  } catch (error) {
    console.error('Error al marcar todas las notificaciones como leídas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al marcar notificaciones como leídas'
    });
  }
});

// @route   DELETE /api/notifications/clear-all
// @desc    Eliminar todas las notificaciones del usuario
// @access  Private
router.delete('/clear-all', async (req, res) => {
  try {
    const { userId } = req.user;

    const result = await Notification.deleteMany({ recipientId: userId });

    res.json({
      success: true,
      message: `${result.deletedCount} notificaciones eliminadas`
    });
  } catch (error) {
    console.error('Error al eliminar todas las notificaciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar notificaciones'
    });
  }
});

// @route   GET /api/notifications/unread-count
// @desc    Obtener el conteo de notificaciones no leídas
// @access  Private
router.get('/unread-count', async (req, res) => {
  try {
    const { userId } = req.user;

    const unreadCount = await Notification.countDocuments({ 
      recipientId: userId, 
      isRead: false 
    });

    res.json({
      success: true,
      data: { unreadCount }
    });
  } catch (error) {
    console.error('Error al obtener conteo de notificaciones no leídas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener conteo de notificaciones'
    });
  }
});

// @route   GET /api/notifications/types/list
// @desc    Obtener lista de todos los tipos de notificación disponibles
// @access  Private
router.get('/types/list', async (req, res) => {
  try {
    const types = await Notification.distinct('type');
    
    res.json({
      success: true,
      data: types.sort()
    });
  } catch (error) {
    console.error('Error al obtener tipos de notificación:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener tipos de notificación'
    });
  }
});

// @route   GET /api/notifications/stats/overview
// @desc    Obtener estadísticas generales de notificaciones (solo profesionales y administradores)
// @access  Private (Profesionales y Administradores)
router.get('/stats/overview', requireRole(['professional', 'admin']), async (req, res) => {
  try {
    const totalNotifications = await Notification.countDocuments();
    const readNotifications = await Notification.countDocuments({ isRead: true });
    const unreadNotifications = await Notification.countDocuments({ isRead: false });
    
    const notificationsByType = await Notification.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          readCount: { $sum: { $cond: ['$isRead', 1, 0] } },
          unreadCount: { $sum: { $cond: ['$isRead', 0, 1] } }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    const notificationsByPriority = await Notification.aggregate([
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    const recentNotifications = await Notification.find({})
      .sort({ timestamp: -1 })
      .limit(10)
      .select('type title recipientId isRead timestamp')
      .populate('recipientId', 'fullName email');

    res.json({
      success: true,
      data: {
        total: totalNotifications,
        read: readNotifications,
        unread: unreadNotifications,
        byType: notificationsByType,
        byPriority: notificationsByPriority,
        recent: recentNotifications
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

// @route   POST /api/notifications/bulk-send
// @desc    Enviar notificaciones en lote (solo administradores)
// @access  Private (Solo Administradores)
router.post('/bulk-send', requireRole('admin'), [
  body('recipients')
    .isArray({ min: 1 })
    .withMessage('Debe especificar al menos un destinatario'),
  body('recipients.*')
    .isMongoId()
    .withMessage('ID de destinatario inválido'),
  body('type')
    .isIn(['appointment_request', 'appointment_confirmed', 'appointment_cancelled', 'payment_required', 'reminder', 'system'])
    .withMessage('Tipo de notificación inválido'),
  body('title')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('El título debe tener entre 3 y 100 caracteres'),
  body('message')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('El mensaje debe tener entre 10 y 500 caracteres'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Prioridad inválida')
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

    const { recipients, type, title, message, priority = 'medium' } = req.body;

    // Verificar que todos los destinatarios existen
    const existingUsers = await User.find({ _id: { $in: recipients } });
    if (existingUsers.length !== recipients.length) {
      return res.status(400).json({
        success: false,
        message: 'Algunos destinatarios no existen'
      });
    }

    // Crear notificaciones en lote
    const notifications = recipients.map(recipientId => ({
      recipientId,
      senderId: req.user.userId,
      type,
      title,
      message,
      priority
    }));

    const createdNotifications = await Notification.insertMany(notifications);

    res.status(201).json({
      success: true,
      message: `${createdNotifications.length} notificaciones enviadas exitosamente`,
      data: { count: createdNotifications.length }
    });
  } catch (error) {
    console.error('Error al enviar notificaciones en lote:', error);
    res.status(500).json({
      success: false,
      message: 'Error al enviar notificaciones en lote'
    });
  }
});

module.exports = router;
