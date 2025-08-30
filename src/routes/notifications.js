const express = require('express');
const { body, validationResult, query } = require('express-validator');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const { authenticateToken, requireOwnership } = require('../middleware/auth');

const router = express.Router();

// Middleware para validar ObjectId
const validateObjectId = (value) => {
  return /^[0-9a-fA-F]{24}$/.test(value);
};

// GET /api/notifications - Obtener notificaciones del usuario
router.get('/', [
  authenticateToken,
  query('type').optional().isIn(['appointment', 'reminder', 'confirmation', 'cancellation', 'system', 'general']),
  query('isRead').optional().isBoolean(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
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
      type,
      isRead,
      page = 1,
      limit = 20
    } = req.query;

    // Construir filtros
    const filters = { recipient: req.user._id };

    if (type) {
      filters.type = type;
    }

    if (isRead !== undefined) {
      filters.isRead = isRead;
    }

    const skip = (page - 1) * limit;
    
    // Obtener notificaciones del usuario
    const notifications = await User.findById(req.user._id)
      .select('notifications')
      .populate('notifications.appointment', 'date startTime endTime status')
      .populate('notifications.sender', 'fullName');

    if (!notifications) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    let userNotifications = notifications.notifications || [];

    // Aplicar filtros
    if (type) {
      userNotifications = userNotifications.filter(n => n.type === type);
    }

    if (isRead !== undefined) {
      userNotifications = userNotifications.filter(n => n.isRead === isRead);
    }

    // Ordenar por fecha de creación (más recientes primero)
    userNotifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Aplicar paginación
    const total = userNotifications.length;
    const paginatedNotifications = userNotifications.slice(skip, skip + parseInt(limit));

    res.json({
      success: true,
      data: paginatedNotifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error al obtener notificaciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET /api/notifications/:id - Obtener notificación específica
router.get('/:id', [
  authenticateToken,
  body('id').custom(validateObjectId)
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'ID de notificación inválido',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    
    const user = await User.findById(req.user._id)
      .select('notifications')
      .populate('notifications.appointment', 'date startTime endTime status service clinic')
      .populate('notifications.sender', 'fullName email phone');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    const notification = user.notifications.find(n => n._id.toString() === id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notificación no encontrada'
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
      message: 'Error interno del servidor'
    });
  }
});

// PUT /api/notifications/:id/read - Marcar notificación como leída
router.put('/:id/read', [
  authenticateToken,
  body('id').custom(validateObjectId)
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'ID de notificación inválido',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    const notification = user.notifications.find(n => n._id.toString() === id);
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notificación no encontrada'
      });
    }

    notification.isRead = true;
    notification.readAt = new Date();
    await user.save();

    res.json({
      success: true,
      message: 'Notificación marcada como leída',
      data: notification
    });

  } catch (error) {
    console.error('Error al marcar notificación como leída:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// PUT /api/notifications/:id/unread - Marcar notificación como no leída
router.put('/:id/unread', [
  authenticateToken,
  body('id').custom(validateObjectId)
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'ID de notificación inválido',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    const notification = user.notifications.find(n => n._id.toString() === id);
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notificación no encontrada'
      });
    }

    notification.isRead = false;
    notification.readAt = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Notificación marcada como no leída',
      data: notification
    });

  } catch (error) {
    console.error('Error al marcar notificación como no leída:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// PUT /api/notifications/read-all - Marcar todas las notificaciones como leídas
router.put('/read-all', [
  authenticateToken
], async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    const unreadNotifications = user.notifications.filter(n => !n.isRead);
    
    if (unreadNotifications.length === 0) {
      return res.json({
        success: true,
        message: 'No hay notificaciones sin leer',
        data: { count: 0 }
      });
    }

    // Marcar todas como leídas
    unreadNotifications.forEach(notification => {
      notification.isRead = true;
      notification.readAt = new Date();
    });

    await user.save();

    res.json({
      success: true,
      message: `${unreadNotifications.length} notificaciones marcadas como leídas`,
      data: { count: unreadNotifications.length }
    });

  } catch (error) {
    console.error('Error al marcar todas las notificaciones como leídas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// DELETE /api/notifications/:id - Eliminar notificación
router.delete('/:id', [
  authenticateToken,
  body('id').custom(validateObjectId)
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'ID de notificación inválido',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    const notificationIndex = user.notifications.findIndex(n => n._id.toString() === id);
    if (notificationIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Notificación no encontrada'
      });
    }

    const deletedNotification = user.notifications.splice(notificationIndex, 1)[0];
    await user.save();

    res.json({
      success: true,
      message: 'Notificación eliminada correctamente',
      data: deletedNotification
    });

  } catch (error) {
    console.error('Error al eliminar notificación:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// DELETE /api/notifications/clear-all - Eliminar todas las notificaciones
router.delete('/clear-all', [
  authenticateToken
], async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    const notificationCount = user.notifications.length;
    
    if (notificationCount === 0) {
      return res.json({
        success: true,
        message: 'No hay notificaciones para eliminar',
        data: { count: 0 }
      });
    }

    user.notifications = [];
    await user.save();

    res.json({
      success: true,
      message: `${notificationCount} notificaciones eliminadas`,
      data: { count: notificationCount }
    });

  } catch (error) {
    console.error('Error al eliminar todas las notificaciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET /api/notifications/unread-count - Obtener conteo de notificaciones sin leer
router.get('/unread-count', [
  authenticateToken
], async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('notifications');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    const unreadCount = user.notifications.filter(n => !n.isRead).length;

    res.json({
      success: true,
      data: { unreadCount }
    });

  } catch (error) {
    console.error('Error al obtener conteo de notificaciones sin leer:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// POST /api/notifications/send - Enviar notificación (solo para profesionales o sistema)
router.post('/send', [
  authenticateToken,
  requireOwnership(User, 'recipientId'),
  body('recipientId').custom(validateObjectId),
  body('type').isIn(['appointment', 'reminder', 'confirmation', 'cancellation', 'system', 'general']),
  body('title').isLength({ min: 1, max: 100 }).trim(),
  body('message').isLength({ min: 1, max: 500 }).trim(),
  body('appointmentId').optional().custom(validateObjectId),
  body('senderId').optional().custom(validateObjectId),
  body('priority').optional().isIn(['low', 'normal', 'high', 'urgent']),
  body('expiresAt').optional().isISO8601()
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
      appointmentId,
      senderId,
      priority = 'normal',
      expiresAt
    } = req.body;

    // Verificar que el destinatario existe
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({
        success: false,
        message: 'Destinatario no encontrado'
      });
    }

    // Verificar que la cita existe si se especifica
    if (appointmentId) {
      const appointment = await Appointment.findById(appointmentId);
      if (!appointment) {
        return res.status(404).json({
          success: false,
          message: 'Cita no encontrada'
        });
      }
    }

    // Crear la notificación
    const notification = {
      type,
      title,
      message,
      priority,
      isRead: false,
      createdAt: new Date(),
      expiresAt: expiresAt ? new Date(expiresAt) : undefined
    };

    if (appointmentId) {
      notification.appointment = appointmentId;
    }

    if (senderId) {
      notification.sender = senderId;
    }

    // Agregar la notificación al usuario
    recipient.notifications.push(notification);
    await recipient.save();

    // Poblar referencias para la respuesta
    await recipient.populate('notifications.appointment', 'date startTime endTime status');
    await recipient.populate('notifications.sender', 'fullName');

    const newNotification = recipient.notifications[recipient.notifications.length - 1];

    res.status(201).json({
      success: true,
      message: 'Notificación enviada correctamente',
      data: newNotification
    });

  } catch (error) {
    console.error('Error al enviar notificación:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// POST /api/notifications/send-bulk - Enviar notificaciones masivas (solo para sistema)
router.post('/send-bulk', [
  authenticateToken,
  requireOwnership(User, 'recipientIds'),
  body('recipientIds').isArray({ min: 1 }),
  body('recipientIds.*').custom(validateObjectId),
  body('type').isIn(['appointment', 'reminder', 'confirmation', 'cancellation', 'system', 'general']),
  body('title').isLength({ min: 1, max: 100 }).trim(),
  body('message').isLength({ min: 1, max: 500 }).trim(),
  body('priority').optional().isIn(['low', 'normal', 'high', 'urgent']),
  body('expiresAt').optional().isISO8601()
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
      recipientIds,
      type,
      title,
      message,
      priority = 'normal',
      expiresAt
    } = req.body;

    // Verificar que todos los destinatarios existen
    const recipients = await User.find({ _id: { $in: recipientIds } });
    if (recipients.length !== recipientIds.length) {
      return res.status(400).json({
        success: false,
        message: 'Algunos destinatarios no fueron encontrados'
      });
    }

    // Crear la notificación base
    const baseNotification = {
      type,
      title,
      message,
      priority,
      isRead: false,
      createdAt: new Date(),
      expiresAt: expiresAt ? new Date(expiresAt) : undefined
    };

    // Agregar notificaciones a todos los destinatarios
    const bulkOps = recipients.map(recipient => ({
      updateOne: {
        filter: { _id: recipient._id },
        update: { $push: { notifications: baseNotification } }
      }
    }));

    await User.bulkWrite(bulkOps);

    res.json({
      success: true,
      message: `Notificaciones enviadas a ${recipients.length} usuarios`,
      data: { recipientCount: recipients.length }
    });

  } catch (error) {
    console.error('Error al enviar notificaciones masivas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET /api/notifications/preferences - Obtener preferencias de notificaciones
router.get('/preferences', [
  authenticateToken
], async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('preferences.notifications');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    res.json({
      success: true,
      data: user.preferences.notifications
    });

  } catch (error) {
    console.error('Error al obtener preferencias de notificaciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// PUT /api/notifications/preferences - Actualizar preferencias de notificaciones
router.put('/preferences', [
  authenticateToken,
  body('email').optional().isBoolean(),
  body('push').optional().isBoolean(),
  body('sms').optional().isBoolean(),
  body('appointmentReminders').optional().isBoolean(),
  body('confirmations').optional().isBoolean(),
  body('cancellations').optional().isBoolean(),
  body('systemUpdates').optional().isBoolean(),
  body('marketing').optional().isBoolean()
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

    const updateData = req.body;
    
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Actualizar preferencias
    if (updateData.email !== undefined) {
      user.preferences.notifications.email = updateData.email;
    }
    if (updateData.push !== undefined) {
      user.preferences.notifications.push = updateData.push;
    }
    if (updateData.sms !== undefined) {
      user.preferences.notifications.sms = updateData.sms;
    }

    // Actualizar preferencias específicas por tipo
    if (updateData.appointmentReminders !== undefined) {
      user.preferences.notifications.appointmentReminders = updateData.appointmentReminders;
    }
    if (updateData.confirmations !== undefined) {
      user.preferences.notifications.confirmations = updateData.confirmations;
    }
    if (updateData.cancellations !== undefined) {
      user.preferences.notifications.cancellations = updateData.cancellations;
    }
    if (updateData.systemUpdates !== undefined) {
      user.preferences.notifications.systemUpdates = updateData.systemUpdates;
    }
    if (updateData.marketing !== undefined) {
      user.preferences.notifications.marketing = updateData.marketing;
    }

    await user.save();

    res.json({
      success: true,
      message: 'Preferencias de notificaciones actualizadas correctamente',
      data: user.preferences.notifications
    });

  } catch (error) {
    console.error('Error al actualizar preferencias de notificaciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

module.exports = router;

