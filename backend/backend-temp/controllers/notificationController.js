const Notification = require('../models/Notification');
const User = require('../models/User');
const logger = require('../config/logger');

class NotificationController {
  /**
   * Obtener lista de notificaciones del usuario autenticado
   */
  static async getNotifications(req, res) {
    try {
      const {
        type,
        priority,
        category,
        isRead,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        page = 1,
        limit = 20
      } = req.query;

      // Construir filtros
      const filters = {
        recipientId: req.user._id,
        isDeleted: false
      };

      if (type) filters.type = type;
      if (priority) filters.priority = priority;
      if (category) filters.category = category;
      if (isRead !== undefined) filters.isRead = isRead === 'true';

      // Calcular paginación
      const skip = (page - 1) * limit;

      const [notifications, total] = await Promise.all([
        Notification.find(filters)
          .populate('senderId', 'fullName email avatar')
          .populate('recipientId', 'fullName email')
          .sort(sortBy === 'createdAt' ? { createdAt: sortOrder === 'desc' ? -1 : 1 } :
                sortBy === 'priority' ? { priority: sortOrder === 'desc' ? -1 : 1 } :
                sortBy === 'isRead' ? { isRead: sortOrder === 'desc' ? -1 : 1 } :
                { createdAt: sortOrder === 'desc' ? -1 : 1 })
          .skip(skip)
          .limit(parseInt(limit)),
        Notification.countDocuments(filters)
      ]);

      res.json({
        success: true,
        data: notifications,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      logger.error('Error in getNotifications:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener notificación específica
   */
  static async getNotificationById(req, res) {
    try {
      const notification = await Notification.findById(req.params.id)
        .populate('senderId', 'fullName email avatar')
        .populate('recipientId', 'fullName email');

      if (!notification) {
        return res.status(404).json({
          success: false,
          message: 'Notificación no encontrada'
        });
      }

      // Verificar que el usuario autenticado sea el destinatario
      if (notification.recipientId._id.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para ver esta notificación'
        });
      }

      // Marcar como leída si no lo está
      if (!notification.isRead) {
        notification.isRead = true;
        notification.readAt = new Date();
        await notification.save();
      }

      res.json({
        success: true,
        data: notification
      });

    } catch (error) {
      logger.error('Error in getNotificationById:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Crear nueva notificación
   */
  static async createNotification(req, res) {
    try {
      const {
        recipientId,
        type,
        title,
        message,
        priority = 'normal',
        category = 'general',
        metadata = {}
      } = req.body;

      // Verificar que el destinatario exista
      const recipient = await User.findById(recipientId);
      if (!recipient) {
        return res.status(400).json({
          success: false,
          message: 'Destinatario no encontrado'
        });
      }

      // Verificar permisos para crear notificaciones
      const canCreate = req.user.userType === 'admin' ||
                       req.user._id.toString() === recipientId ||
                       req.user.userType === 'professional';

      if (!canCreate) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para crear notificaciones'
        });
      }

      const notificationData = {
        recipientId,
        senderId: req.user._id,
        type,
        title,
        message,
        priority,
        category,
        metadata,
        createdBy: req.user._id
      };

      const notification = new Notification(notificationData);
      await notification.save();

      // Log de la acción
      notification.logAccess(req.user._id, 'notification_created', {
        recipientId,
        type,
        priority
      });

      // Populate para la respuesta
      const createdNotification = await Notification.findById(notification._id)
        .populate('senderId', 'fullName email avatar')
        .populate('recipientId', 'fullName email');

      res.status(201).json({
        success: true,
        message: 'Notificación creada exitosamente',
        data: createdNotification
      });

    } catch (error) {
      logger.error('Error in createNotification:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Crear múltiples notificaciones
   */
  static async createBulkNotifications(req, res) {
    try {
      const { notifications } = req.body;

      if (!Array.isArray(notifications) || notifications.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Se requiere un array de notificaciones'
        });
      }

      // Verificar permisos
      if (req.user.userType !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Solo los administradores pueden crear notificaciones masivas'
        });
      }

      const createdNotifications = [];
      const errors = [];

      for (let i = 0; i < notifications.length; i++) {
        try {
          const {
            recipientId,
            type,
            title,
            message,
            priority = 'normal',
            category = 'general',
            metadata = {}
          } = notifications[i];

          // Verificar que el destinatario exista
          const recipient = await User.findById(recipientId);
          if (!recipient) {
            errors.push({
              index: i,
              error: 'Destinatario no encontrado',
              recipientId
            });
            continue;
          }

          const notificationData = {
            recipientId,
            senderId: req.user._id,
            type,
            title,
            message,
            priority,
            category,
            metadata,
            createdBy: req.user._id
          };

          const notification = new Notification(notificationData);
          await notification.save();

          // Log de la acción
          notification.logAccess(req.user._id, 'bulk_notification_created', {
            recipientId,
            type,
            priority
          });

          createdNotifications.push(notification);

        } catch (error) {
          errors.push({
            index: i,
            error: error.message,
            data: notifications[i]
          });
        }
      }

      res.status(201).json({
        success: true,
        message: `Se crearon ${createdNotifications.length} notificaciones`,
        data: {
          created: createdNotifications.length,
          errors: errors.length > 0 ? errors : undefined
        }
      });

    } catch (error) {
      logger.error('Error in createBulkNotifications:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Actualizar notificación
   */
  static async updateNotification(req, res) {
    try {
      const notification = await Notification.findById(req.params.id);
      if (!notification) {
        return res.status(404).json({
          success: false,
          message: 'Notificación no encontrada'
        });
      }

      // Verificar permisos
      const canUpdate = req.user.userType === 'admin' ||
                       req.user._id.toString() === notification.senderId.toString();

      if (!canUpdate) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para modificar esta notificación'
        });
      }

      const {
        title,
        message,
        priority,
        category,
        metadata
      } = req.body;

      // Actualizar campos permitidos
      const updateFields = ['title', 'message', 'priority', 'category', 'metadata'];
      updateFields.forEach(field => {
        if (req.body[field] !== undefined) {
          notification[field] = req.body[field];
        }
      });

      notification.lastModifiedBy = req.user._id;
      notification.lastModifiedAt = new Date();
      await notification.save();

      // Log de la acción
      notification.logAccess(req.user._id, 'notification_updated', {
        changes: req.body
      });

      // Populate para la respuesta
      const updatedNotification = await Notification.findById(req.params.id)
        .populate('senderId', 'fullName email avatar')
        .populate('recipientId', 'fullName email');

      res.json({
        success: true,
        message: 'Notificación actualizada exitosamente',
        data: updatedNotification
      });

    } catch (error) {
      logger.error('Error in updateNotification:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Marcar notificación como leída
   */
  static async markAsRead(req, res) {
    try {
      const notification = await Notification.findById(req.params.id);
      if (!notification) {
        return res.status(404).json({
          success: false,
          message: 'Notificación no encontrada'
        });
      }

      // Verificar que el usuario autenticado sea el destinatario
      if (notification.recipientId.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para modificar esta notificación'
        });
      }

      if (!notification.isRead) {
        notification.isRead = true;
        notification.readAt = new Date();
        notification.lastModifiedBy = req.user._id;
        notification.lastModifiedAt = new Date();
        await notification.save();

        // Log de la acción
        notification.logAccess(req.user._id, 'notification_marked_read');
      }

      res.json({
        success: true,
        message: 'Notificación marcada como leída',
        data: {
          notificationId: notification._id,
          isRead: notification.isRead,
          readAt: notification.readAt
        }
      });

    } catch (error) {
      logger.error('Error in markAsRead:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Marcar todas las notificaciones como leídas
   */
  static async markAllAsRead(req, res) {
    try {
      const { type, category } = req.query;

      // Construir filtros
      const filters = {
        recipientId: req.user._id,
        isRead: false,
        isDeleted: false
      };

      if (type) filters.type = type;
      if (category) filters.category = category;

      const result = await Notification.updateMany(
        filters,
        {
          $set: {
            isRead: true,
            readAt: new Date(),
            lastModifiedBy: req.user._id,
            lastModifiedAt: new Date()
          }
        }
      );

      res.json({
        success: true,
        message: `${result.modifiedCount} notificaciones marcadas como leídas`,
        data: {
          modifiedCount: result.modifiedCount
        }
      });

    } catch (error) {
      logger.error('Error in markAllAsRead:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Archivar notificación
   */
  static async archiveNotification(req, res) {
    try {
      const notification = await Notification.findById(req.params.id);
      if (!notification) {
        return res.status(404).json({
          success: false,
          message: 'Notificación no encontrada'
        });
      }

      // Verificar que el usuario autenticado sea el destinatario
      if (notification.recipientId.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para archivar esta notificación'
        });
      }

      notification.isArchived = true;
      notification.archivedAt = new Date();
      notification.lastModifiedBy = req.user._id;
      notification.lastModifiedAt = new Date();
      await notification.save();

      // Log de la acción
      notification.logAccess(req.user._id, 'notification_archived');

      res.json({
        success: true,
        message: 'Notificación archivada exitosamente',
        data: {
          notificationId: notification._id,
          isArchived: notification.isArchived,
          archivedAt: notification.archivedAt
        }
      });

    } catch (error) {
      logger.error('Error in archiveNotification:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Eliminar notificación (soft delete)
   */
  static async deleteNotification(req, res) {
    try {
      const notification = await Notification.findById(req.params.id);
      if (!notification) {
        return res.status(404).json({
          success: false,
          message: 'Notificación no encontrada'
        });
      }

      // Verificar permisos
      const canDelete = req.user.userType === 'admin' ||
                       req.user._id.toString() === notification.recipientId.toString() ||
                       req.user._id.toString() === notification.senderId.toString();

      if (!canDelete) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para eliminar esta notificación'
        });
      }

      notification.isDeleted = true;
      notification.deletedAt = new Date();
      notification.deletedBy = req.user._id;
      notification.lastModifiedBy = req.user._id;
      notification.lastModifiedAt = new Date();
      await notification.save();

      // Log de la acción
      notification.logAccess(req.user._id, 'notification_deleted');

      res.json({
        success: true,
        message: 'Notificación eliminada exitosamente',
        data: {
          notificationId: notification._id
        }
      });

    } catch (error) {
      logger.error('Error in deleteNotification:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener tipos de notificación disponibles
   */
  static async getNotificationTypes(req, res) {
    try {
      const types = [
        { value: 'booking_request', label: 'Solicitud de reserva' },
        { value: 'booking_confirmed', label: 'Reserva confirmada' },
        { value: 'booking_cancelled', label: 'Reserva cancelada' },
        { value: 'booking_reminder', label: 'Recordatorio de reserva' },
        { value: 'payment_success', label: 'Pago exitoso' },
        { value: 'payment_failed', label: 'Pago fallido' },
        { value: 'review_received', label: 'Nueva reseña' },
        { value: 'system_alert', label: 'Alerta del sistema' },
        { value: 'promotion', label: 'Promoción' },
        { value: 'general', label: 'General' }
      ];

      res.json({
        success: true,
        data: types
      });

    } catch (error) {
      logger.error('Error in getNotificationTypes:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener prioridades disponibles
   */
  static async getNotificationPriorities(req, res) {
    try {
      const priorities = [
        { value: 'low', label: 'Baja', color: '#28a745' },
        { value: 'normal', label: 'Normal', color: '#007bff' },
        { value: 'high', label: 'Alta', color: '#ffc107' },
        { value: 'urgent', label: 'Urgente', color: '#dc3545' }
      ];

      res.json({
        success: true,
        data: priorities
      });

    } catch (error) {
      logger.error('Error in getNotificationPriorities:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener estadísticas de notificaciones
   */
  static async getNotificationStats(req, res) {
    try {
      const { dateFrom, dateTo, type, priority } = req.query;

      // Construir filtros
      const filters = {
        recipientId: req.user._id,
        isDeleted: false
      };

      if (type) filters.type = type;
      if (priority) filters.priority = priority;
      if (dateFrom || dateTo) {
        filters.createdAt = {};
        if (dateFrom) filters.createdAt.$gte = new Date(dateFrom);
        if (dateTo) filters.createdAt.$lte = new Date(dateTo);
      }

      const stats = await Notification.getNotificationStats(filters);

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      logger.error('Error in getNotificationStats:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Enviar notificación del sistema
   */
  static async sendSystemNotification(req, res) {
    try {
      const {
        recipientIds,
        title,
        message,
        priority = 'normal',
        category = 'system',
        metadata = {}
      } = req.body;

      // Verificar permisos
      if (req.user.userType !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Solo los administradores pueden enviar notificaciones del sistema'
        });
      }

      if (!Array.isArray(recipientIds) || recipientIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Se requiere un array de IDs de destinatarios'
        });
      }

      const notifications = [];
      const errors = [];

      for (const recipientId of recipientIds) {
        try {
          // Verificar que el usuario exista
          const recipient = await User.findById(recipientId);
          if (!recipient) {
            errors.push({
              recipientId,
              error: 'Usuario no encontrado'
            });
            continue;
          }

          const notificationData = {
            recipientId,
            senderId: req.user._id,
            type: 'system_alert',
            title,
            message,
            priority,
            category,
            metadata,
            createdBy: req.user._id
          };

          const notification = new Notification(notificationData);
          await notification.save();

          // Log de la acción
          notification.logAccess(req.user._id, 'system_notification_sent', {
            recipientId,
            priority
          });

          notifications.push(notification);

        } catch (error) {
          errors.push({
            recipientId,
            error: error.message
          });
        }
      }

      res.status(201).json({
        success: true,
        message: `Se enviaron ${notifications.length} notificaciones del sistema`,
        data: {
          sent: notifications.length,
          errors: errors.length > 0 ? errors : undefined
        }
      });

    } catch (error) {
      logger.error('Error in sendSystemNotification:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
}

module.exports = NotificationController;
