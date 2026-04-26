const Booking = require('../models/Booking');
const Service = require('../models/Service');
const User = require('../models/User');
const Notification = require('../models/Notification');
const logger = require('../config/logger');

class BookingController {
  /**
   * Obtener lista de reservas con filtros
   */
  static async getBookings(req, res) {
    try {
      const {
        status,
        serviceId,
        professionalId,
        clientId,
        dateFrom,
        dateTo,
        sortBy = 'date',
        sortOrder = 'desc',
        page = 1,
        limit = 20
      } = req.query;

      // Construir filtros
      const filters = { isDeleted: false };

      if (status) filters.status = status;
      if (serviceId) filters.serviceId = serviceId;
      if (professionalId) filters.professionalId = professionalId;
      if (clientId) filters.clientId = clientId;
      if (dateFrom || dateTo) {
        filters.date = {};
        if (dateFrom) filters.date.$gte = new Date(dateFrom);
        if (dateTo) filters.date.$lte = new Date(dateTo);
      }

      // Aplicar filtros según el rol del usuario
      if (req.user.userType === 'client') {
        filters.clientId = req.user._id;
      } else if (req.user.userType === 'professional') {
        filters.professionalId = req.user._id;
      }
      // Los administradores pueden ver todas las reservas

      // Calcular paginación
      const skip = (page - 1) * limit;

      const [bookings, total] = await Promise.all([
        Booking.find(filters)
          .populate('serviceId', 'name description price duration currency')
          .populate('professionalId', 'fullName email phone avatar professionalInfo')
          .populate('clientId', 'fullName email phone avatar')
          .sort(sortBy === 'date' ? { date: sortOrder === 'desc' ? -1 : 1 } :
                sortBy === 'startTime' ? { startTime: sortOrder === 'desc' ? -1 : 1 } :
                sortBy === 'status' ? { status: sortOrder === 'desc' ? -1 : 1 } :
                sortBy === 'createdAt' ? { createdAt: sortOrder === 'desc' ? -1 : 1 } :
                { date: sortOrder === 'desc' ? -1 : 1 })
          .skip(skip)
          .limit(parseInt(limit)),
        Booking.countDocuments(filters)
      ]);

      res.json({
        success: true,
        data: bookings,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      logger.error('Error in getBookings:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener reserva específica
   */
  static async getBookingById(req, res) {
    try {
      const booking = await Booking.findById(req.params.id)
        .populate('serviceId', 'name description price duration currency requirements cancellationPolicy')
        .populate('professionalId', 'fullName email phone avatar professionalInfo')
        .populate('clientId', 'fullName email phone avatar clientInfo');

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Reserva no encontrada'
        });
      }

      // Verificar permisos de acceso
      const canAccess = req.user._id.toString() === booking.clientId._id.toString() ||
                       req.user._id.toString() === booking.professionalId._id.toString() ||
                       req.user.userType === 'admin';

      if (!canAccess) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para ver esta reserva'
        });
      }

      res.json({
        success: true,
        data: booking
      });

    } catch (error) {
      logger.error('Error in getBookingById:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Crear nueva reserva
   */
  static async createBooking(req, res) {
    try {
      const {
        serviceId,
        date,
        startTime,
        endTime,
        notes,
        specialRequirements,
        metadata
      } = req.body;

      // Verificar que el servicio exista y esté activo
      const service = await Service.findById(serviceId);
      if (!service || !service.isActive) {
        return res.status(400).json({
          success: false,
          message: 'Servicio no encontrado o inactivo'
        });
      }

      // Verificar que el profesional esté activo
      const professional = await User.findById(service.professionalId);
      if (!professional || !professional.isActive) {
        return res.status(400).json({
          success: false,
          message: 'Profesional no disponible'
        });
      }

      // Verificar que el cliente esté activo
      const client = await User.findById(req.user._id);
      if (!client || !client.isActive) {
        return res.status(400).json({
          success: false,
          message: 'Tu cuenta no está activa'
        });
      }

      // Verificar que no se reserve para el pasado
      const bookingDate = new Date(date);
      const now = new Date();
      if (bookingDate < now.setHours(0, 0, 0, 0)) {
        return res.status(400).json({
          success: false,
          message: 'No se pueden hacer reservas para fechas pasadas'
        });
      }

      // Verificar disponibilidad
      const isAvailable = await BookingController.checkAvailability(
        serviceId,
        date,
        startTime,
        endTime
      );

      if (!isAvailable.available) {
        return res.status(400).json({
          success: false,
          message: 'El horario seleccionado no está disponible',
          data: {
            conflicts: isAvailable.conflicts
          }
        });
      }

      // Crear la reserva
      const bookingData = {
        serviceId,
        professionalId: service.professionalId,
        clientId: req.user._id,
        date: bookingDate,
        startTime,
        endTime,
        notes,
        specialRequirements,
        status: 'pending',
        metadata: metadata || {},
        createdBy: req.user._id
      };

      const booking = new Booking(bookingData);
      await booking.save();

      // Log de la acción
      booking.logAccess(req.user._id, 'booking_created', {
        serviceId,
        date,
        startTime,
        endTime
      });

      // Enviar notificación al profesional
      try {
        await Notification.create({
          recipientId: service.professionalId,
          senderId: req.user._id,
          type: 'booking_request',
          title: 'Nueva solicitud de reserva',
          message: `${client.fullName} ha solicitado una reserva para ${service.name} el ${date} a las ${startTime}`,
          priority: 'normal',
          metadata: {
            bookingId: booking._id,
            serviceId,
            clientId: req.user._id
          }
        });
      } catch (notificationError) {
        logger.error('Error sending notification:', notificationError);
      }

      // Populate para la respuesta
      const createdBooking = await Booking.findById(booking._id)
        .populate('serviceId', 'name description price duration currency')
        .populate('professionalId', 'fullName email phone avatar professionalInfo')
        .populate('clientId', 'fullName email phone avatar');

      res.status(201).json({
        success: true,
        message: 'Reserva creada exitosamente',
        data: createdBooking
      });

    } catch (error) {
      logger.error('Error in createBooking:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Actualizar reserva
   */
  static async updateBooking(req, res) {
    try {
      const booking = await Booking.findById(req.params.id);
      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Reserva no encontrada'
        });
      }

      // Verificar permisos de modificación
      const canModify = req.user._id.toString() === booking.clientId.toString() ||
                       req.user._id.toString() === booking.professionalId.toString() ||
                       req.user.userType === 'admin';

      if (!canModify) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para modificar esta reserva'
        });
      }

      // Verificar que la reserva se pueda modificar
      if (['cancelled', 'completed'].includes(booking.status)) {
        return res.status(400).json({
          success: false,
          message: 'No se puede modificar una reserva cancelada o completada'
        });
      }

      const {
        date,
        startTime,
        endTime,
        notes,
        specialRequirements,
        metadata
      } = req.body;

      // Verificar disponibilidad si se están cambiando fecha/hora
      if (date || startTime || endTime) {
        const newDate = date ? new Date(date) : booking.date;
        const newStartTime = startTime || booking.startTime;
        const newEndTime = endTime || booking.endTime;

        const isAvailable = await BookingController.checkAvailability(
          booking.serviceId,
          newDate,
          newStartTime,
          newEndTime,
          booking._id // Excluir la reserva actual
        );

        if (!isAvailable.available) {
          return res.status(400).json({
            success: false,
            message: 'El horario seleccionado no está disponible',
            data: {
              conflicts: isAvailable.conflicts
            }
          });
        }
      }

      // Actualizar campos permitidos
      const updateFields = [
        'date', 'startTime', 'endTime', 'notes', 'specialRequirements', 'metadata'
      ];

      updateFields.forEach(field => {
        if (req.body[field] !== undefined) {
          if (field === 'date') {
            booking[field] = new Date(req.body[field]);
          } else {
            booking[field] = req.body[field];
          }
        }
      });

      booking.lastModifiedBy = req.user._id;
      booking.lastModifiedAt = new Date();
      await booking.save();

      // Log de la acción
      booking.logAccess(req.user._id, 'booking_updated', {
        changes: req.body
      });

      // Populate para la respuesta
      const updatedBooking = await Booking.findById(req.params.id)
        .populate('serviceId', 'name description price duration currency')
        .populate('professionalId', 'fullName email phone avatar professionalInfo')
        .populate('clientId', 'fullName email phone avatar');

      res.json({
        success: true,
        message: 'Reserva actualizada exitosamente',
        data: updatedBooking
      });

    } catch (error) {
      logger.error('Error in updateBooking:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Cambiar estado de la reserva
   */
  static async updateBookingStatus(req, res) {
    try {
      const { status, reason } = req.body;

      const booking = await Booking.findById(req.params.id);
      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Reserva no encontrada'
        });
      }

      // Verificar permisos
      const canModify = req.user._id.toString() === booking.clientId.toString() ||
                       req.user._id.toString() === booking.professionalId.toString() ||
                       req.user.userType === 'admin';

      if (!canModify) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para modificar esta reserva'
        });
      }

      // Verificar transiciones de estado válidas
      const validTransitions = {
        pending: ['confirmed', 'cancelled'],
        confirmed: ['in_progress', 'cancelled'],
        in_progress: ['completed', 'cancelled'],
        completed: [],
        cancelled: []
      };

      if (!validTransitions[booking.status].includes(status)) {
        return res.status(400).json({
          success: false,
          message: `No se puede cambiar el estado de '${booking.status}' a '${status}'`
        });
      }

      const oldStatus = booking.status;
      booking.status = status;
      booking.lastModifiedBy = req.user._id;
      booking.lastModifiedAt = new Date();

      // Agregar información adicional según el estado
      if (status === 'confirmed') {
        booking.confirmedAt = new Date();
        booking.confirmedBy = req.user._id;
      } else if (status === 'in_progress') {
        booking.startedAt = new Date();
        booking.startedBy = req.user._id;
      } else if (status === 'completed') {
        booking.completedAt = new Date();
        booking.completedBy = req.user._id;
      } else if (status === 'cancelled') {
        booking.cancelledAt = new Date();
        booking.cancelledBy = req.user._id;
        booking.cancellationReason = reason;
      }

      // Agregar razón del cambio de estado
      if (reason) {
        booking.statusHistory = booking.statusHistory || [];
        booking.statusHistory.push({
          status,
          reason,
          changedBy: req.user._id,
          changedAt: new Date()
        });
      }

      await booking.save();

      // Log de la acción
      booking.logAccess(req.user._id, 'booking_status_changed', {
        oldStatus,
        newStatus: status,
        reason
      });

      // Enviar notificaciones según el estado
      await BookingController.sendStatusNotification(booking, oldStatus, status);

      res.json({
        success: true,
        message: `Estado de la reserva cambiado a ${status}`,
        data: {
          bookingId: booking._id,
          oldStatus,
          newStatus: status,
          reason
        }
      });

    } catch (error) {
      logger.error('Error in updateBookingStatus:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Cancelar reserva
   */
  static async cancelBooking(req, res) {
    try {
      const { reason } = req.body;

      const booking = await Booking.findById(req.params.id);
      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Reserva no encontrada'
        });
      }

      // Verificar permisos
      const canCancel = req.user._id.toString() === booking.clientId.toString() ||
                       req.user._id.toString() === booking.professionalId.toString() ||
                       req.user.userType === 'admin';

      if (!canCancel) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para cancelar esta reserva'
        });
      }

      // Verificar que la reserva se pueda cancelar
      if (['cancelled', 'completed'].includes(booking.status)) {
        return res.status(400).json({
          success: false,
          message: 'La reserva ya está cancelada o completada'
        });
      }

      const oldStatus = booking.status;
      booking.status = 'cancelled';
      booking.cancelledAt = new Date();
      booking.cancelledBy = req.user._id;
      booking.cancellationReason = reason;
      booking.lastModifiedBy = req.user._id;
      booking.lastModifiedAt = new Date();

      // Agregar al historial
      booking.statusHistory = booking.statusHistory || [];
      booking.statusHistory.push({
        status: 'cancelled',
        reason,
        changedBy: req.user._id,
        changedAt: new Date()
      });

      await booking.save();

      // Log de la acción
      booking.logAccess(req.user._id, 'booking_cancelled', {
        reason
      });

      // Enviar notificación
      await BookingController.sendStatusNotification(booking, oldStatus, 'cancelled');

      res.json({
        success: true,
        message: 'Reserva cancelada exitosamente',
        data: {
          bookingId: booking._id,
          reason
        }
      });

    } catch (error) {
      logger.error('Error in cancelBooking:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Verificar disponibilidad
   */
  static async checkAvailability(req, res) {
    try {
      const { serviceId, date, startTime, endTime, excludeBookingId } = req.query;

      if (!serviceId || !date || !startTime || !endTime) {
        return res.status(400).json({
          success: false,
          message: 'serviceId, date, startTime y endTime son requeridos'
        });
      }

      const availability = await BookingController.checkAvailability(
        serviceId,
        date,
        startTime,
        endTime,
        excludeBookingId
      );

      res.json({
        success: true,
        data: availability
      });

    } catch (error) {
      logger.error('Error in checkAvailability:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener reservas próximas
   */
  static async getUpcomingBookings(req, res) {
    try {
      const { days = 7, limit = 10 } = req.query;

      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + parseInt(days));

      // Construir filtros
      const filters = {
        isDeleted: false,
        date: { $gte: startDate, $lte: endDate },
        status: { $in: ['pending', 'confirmed', 'in_progress'] }
      };

      // Aplicar filtros según el rol del usuario
      if (req.user.userType === 'client') {
        filters.clientId = req.user._id;
      } else if (req.user.userType === 'professional') {
        filters.professionalId = req.user._id;
      }

      const bookings = await Booking.find(filters)
        .populate('serviceId', 'name description price duration')
        .populate('professionalId', 'fullName email phone avatar')
        .populate('clientId', 'fullName email phone avatar')
        .sort({ date: 1, startTime: 1 })
        .limit(parseInt(limit));

      res.json({
        success: true,
        data: bookings,
        total: bookings.length
      });

    } catch (error) {
      logger.error('Error in getUpcomingBookings:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Método estático para verificar disponibilidad
   */
  static async checkAvailability(serviceId, date, startTime, endTime, excludeBookingId = null) {
    const bookingDate = new Date(date);
    
    // Construir filtros para buscar conflictos
    const filters = {
      serviceId,
      date: bookingDate,
      status: { $in: ['pending', 'confirmed', 'in_progress'] },
      isDeleted: false,
      $or: [
        // Reserva que empieza antes y termina durante el horario solicitado
        {
          startTime: { $lt: endTime },
          endTime: { $gt: startTime }
        },
        // Reserva que empieza durante el horario solicitado
        {
          startTime: { $gte: startTime, $lt: endTime }
        }
      ]
    };

    if (excludeBookingId) {
      filters._id = { $ne: excludeBookingId };
    }

    const conflicts = await Booking.find(filters)
      .populate('clientId', 'fullName')
      .select('startTime endTime clientId');

    return {
      available: conflicts.length === 0,
      conflicts: conflicts.map(conflict => ({
        startTime: conflict.startTime,
        endTime: conflict.endTime,
        clientName: conflict.clientId.fullName
      }))
    };
  }

  /**
   * Método estático para enviar notificaciones de cambio de estado
   */
  static async sendStatusNotification(booking, oldStatus, newStatus) {
    try {
      const statusMessages = {
        confirmed: {
          title: 'Reserva confirmada',
          message: 'Tu reserva ha sido confirmada por el profesional'
        },
        in_progress: {
          title: 'Reserva en progreso',
          message: 'Tu reserva ha comenzado'
        },
        completed: {
          title: 'Reserva completada',
          message: 'Tu reserva ha sido completada'
        },
        cancelled: {
          title: 'Reserva cancelada',
          message: 'Tu reserva ha sido cancelada'
        }
      };

      const message = statusMessages[newStatus];
      if (message) {
        // Notificar al cliente
        await Notification.create({
          recipientId: booking.clientId,
          senderId: booking.professionalId,
          type: `booking_${newStatus}`,
          title: message.title,
          message: message.message,
          priority: newStatus === 'cancelled' ? 'high' : 'normal',
          metadata: {
            bookingId: booking._id,
            oldStatus,
            newStatus
          }
        });
      }
    } catch (error) {
      logger.error('Error sending status notification:', error);
    }
  }

  /**
   * Obtener estadísticas de reservas
   */
  static async getBookingStats(req, res) {
    try {
      const { dateFrom, dateTo, status, professionalId, clientId } = req.query;

      // Construir filtros
      const filters = { isDeleted: false };
      if (status) filters.status = status;
      if (professionalId) filters.professionalId = professionalId;
      if (clientId) filters.clientId = clientId;
      if (dateFrom || dateTo) {
        filters.date = {};
        if (dateFrom) filters.date.$gte = new Date(dateFrom);
        if (dateTo) filters.date.$lte = new Date(dateTo);
      }

      const stats = await Booking.getBookingStats(filters);

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      logger.error('Error in getBookingStats:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
}

module.exports = BookingController;
