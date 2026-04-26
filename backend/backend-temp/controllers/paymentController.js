const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const User = require('../models/User');
const Notification = require('../models/Notification');
const logger = require('../config/logger');

class PaymentController {
  /**
   * Obtener lista de pagos con filtros
   */
  static async getPayments(req, res) {
    try {
      const {
        status,
        paymentMethod,
        bookingId,
        clientId,
        professionalId,
        dateFrom,
        dateTo,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        page = 1,
        limit = 20
      } = req.query;

      // Construir filtros
      const filters = { isDeleted: false };

      if (status) filters.status = status;
      if (paymentMethod) filters.paymentMethod = paymentMethod;
      if (bookingId) filters.bookingId = bookingId;
      if (clientId) filters.clientId = clientId;
      if (professionalId) filters.professionalId = professionalId;
      if (dateFrom || dateTo) {
        filters.createdAt = {};
        if (dateFrom) filters.createdAt.$gte = new Date(dateFrom);
        if (dateTo) filters.createdAt.$lte = new Date(dateTo);
      }

      // Aplicar filtros según el rol del usuario
      if (req.user.userType === 'client') {
        filters.clientId = req.user._id;
      } else if (req.user.userType === 'professional') {
        filters.professionalId = req.user._id;
      }
      // Los administradores pueden ver todos los pagos

      // Calcular paginación
      const skip = (page - 1) * limit;

      const [payments, total] = await Promise.all([
        Payment.find(filters)
          .populate('bookingId', 'date startTime endTime notes')
          .populate('clientId', 'fullName email phone avatar')
          .populate('professionalId', 'fullName email phone avatar professionalInfo')
          .sort(sortBy === 'createdAt' ? { createdAt: sortOrder === 'desc' ? -1 : 1 } :
                sortBy === 'amount' ? { amount: sortOrder === 'desc' ? -1 : 1 } :
                sortBy === 'status' ? { status: sortOrder === 'desc' ? -1 : 1 } :
                sortBy === 'paymentDate' ? { paymentDate: sortOrder === 'desc' ? -1 : 1 } :
                { createdAt: sortOrder === 'desc' ? -1 : 1 })
          .skip(skip)
          .limit(parseInt(limit)),
        Payment.countDocuments(filters)
      ]);

      res.json({
        success: true,
        data: payments,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      logger.error('Error in getPayments:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener pago específico
   */
  static async getPaymentById(req, res) {
    try {
      const payment = await Payment.findById(req.params.id)
        .populate('bookingId', 'date startTime endTime notes serviceId')
        .populate('clientId', 'fullName email phone avatar clientInfo')
        .populate('professionalId', 'fullName email phone avatar professionalInfo');

      if (!payment) {
        return res.status(404).json({
          success: false,
          message: 'Pago no encontrado'
        });
      }

      // Verificar permisos de acceso
      const canAccess = req.user._id.toString() === payment.clientId._id.toString() ||
                       req.user._id.toString() === payment.professionalId._id.toString() ||
                       req.user.userType === 'admin';

      if (!canAccess) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para ver este pago'
        });
      }

      res.json({
        success: true,
        data: payment
      });

    } catch (error) {
      logger.error('Error in getPaymentById:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Crear nuevo pago
   */
  static async createPayment(req, res) {
    try {
      const {
        bookingId,
        amount,
        currency = 'USD',
        paymentMethod,
        description,
        metadata = {}
      } = req.body;

      // Verificar que la reserva exista y esté activa
      const booking = await Booking.findById(bookingId);
      if (!booking || booking.isDeleted) {
        return res.status(400).json({
          success: false,
          message: 'Reserva no encontrada'
        });
      }

      // Verificar que el usuario autenticado sea el cliente de la reserva
      if (booking.clientId.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Solo puedes crear pagos para tus propias reservas'
        });
      }

      // Verificar que no haya un pago previo para esta reserva
      const existingPayment = await Payment.findOne({
        bookingId,
        isDeleted: false
      });

      if (existingPayment) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe un pago para esta reserva'
        });
      }

      // Validar monto
      if (!amount || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'El monto debe ser mayor a 0'
        });
      }

      const paymentData = {
        bookingId,
        clientId: req.user._id,
        professionalId: booking.professionalId,
        amount,
        currency,
        paymentMethod,
        description: description || `Pago por reserva del ${booking.date}`,
        status: 'pending',
        metadata,
        createdBy: req.user._id
      };

      const payment = new Payment(paymentData);
      await payment.save();

      // Log de la acción
      payment.logAccess(req.user._id, 'payment_created', {
        bookingId,
        amount,
        currency,
        paymentMethod
      });

      // Enviar notificación al profesional
      try {
        await Notification.create({
          recipientId: booking.professionalId,
          senderId: req.user._id,
          type: 'payment_created',
          title: 'Nuevo pago recibido',
          message: `Se ha creado un pago de ${amount} ${currency} para la reserva del ${booking.date}`,
          priority: 'normal',
          metadata: {
            paymentId: payment._id,
            bookingId,
            amount,
            currency
          }
        });
      } catch (notificationError) {
        logger.error('Error sending notification:', notificationError);
      }

      // Populate para la respuesta
      const createdPayment = await Payment.findById(payment._id)
        .populate('bookingId', 'date startTime endTime notes')
        .populate('clientId', 'fullName email phone avatar')
        .populate('professionalId', 'fullName email phone avatar professionalInfo');

      res.status(201).json({
        success: true,
        message: 'Pago creado exitosamente',
        data: createdPayment
      });

    } catch (error) {
      logger.error('Error in createPayment:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Actualizar pago
   */
  static async updatePayment(req, res) {
    try {
      const payment = await Payment.findById(req.params.id);
      if (!payment) {
        return res.status(404).json({
          success: false,
          message: 'Pago no encontrado'
        });
      }

      // Verificar permisos de modificación
      const canModify = req.user._id.toString() === payment.clientId.toString() ||
                       req.user.userType === 'admin';

      if (!canModify) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para modificar este pago'
        });
      }

      // Verificar que el pago se pueda modificar
      if (['completed', 'failed', 'refunded'].includes(payment.status)) {
        return res.status(400).json({
          success: false,
          message: 'No se puede modificar un pago completado, fallido o reembolsado'
        });
      }

      const {
        amount,
        currency,
        paymentMethod,
        description,
        metadata
      } = req.body;

      // Validar monto si se está actualizando
      if (amount !== undefined && amount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'El monto debe ser mayor a 0'
        });
      }

      // Actualizar campos permitidos
      const updateFields = ['amount', 'currency', 'paymentMethod', 'description', 'metadata'];
      updateFields.forEach(field => {
        if (req.body[field] !== undefined) {
          payment[field] = req.body[field];
        }
      });

      payment.lastModifiedBy = req.user._id;
      payment.lastModifiedAt = new Date();
      await payment.save();

      // Log de la acción
      payment.logAccess(req.user._id, 'payment_updated', {
        changes: req.body
      });

      // Populate para la respuesta
      const updatedPayment = await Payment.findById(req.params.id)
        .populate('bookingId', 'date startTime endTime notes')
        .populate('clientId', 'fullName email phone avatar')
        .populate('professionalId', 'fullName email phone avatar professionalInfo');

      res.json({
        success: true,
        message: 'Pago actualizado exitosamente',
        data: updatedPayment
      });

    } catch (error) {
      logger.error('Error in updatePayment:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Cambiar estado del pago
   */
  static async updatePaymentStatus(req, res) {
    try {
      const { status, reason, transactionId } = req.body;

      const payment = await Payment.findById(req.params.id);
      if (!payment) {
        return res.status(404).json({
          success: false,
          message: 'Pago no encontrado'
        });
      }

      // Verificar permisos
      const canModify = req.user.userType === 'admin' ||
                       req.user._id.toString() === payment.professionalId.toString();

      if (!canModify) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para modificar este pago'
        });
      }

      // Verificar transiciones de estado válidas
      const validTransitions = {
        pending: ['processing', 'cancelled'],
        processing: ['completed', 'failed'],
        completed: ['refunded'],
        failed: ['pending'],
        cancelled: [],
        refunded: []
      };

      if (!validTransitions[payment.status].includes(status)) {
        return res.status(400).json({
          success: false,
          message: `No se puede cambiar el estado de '${payment.status}' a '${status}'`
        });
      }

      const oldStatus = payment.status;
      payment.status = status;
      payment.lastModifiedBy = req.user._id;
      payment.lastModifiedAt = new Date();

      // Agregar información adicional según el estado
      if (status === 'processing') {
        payment.processingAt = new Date();
        payment.processingBy = req.user._id;
      } else if (status === 'completed') {
        payment.completedAt = new Date();
        payment.completedBy = req.user._id;
        payment.transactionId = transactionId;
      } else if (status === 'failed') {
        payment.failedAt = new Date();
        payment.failedBy = req.user._id;
        payment.failureReason = reason;
      } else if (status === 'cancelled') {
        payment.cancelledAt = new Date();
        payment.cancelledBy = req.user._id;
        payment.cancellationReason = reason;
      } else if (status === 'refunded') {
        payment.refundedAt = new Date();
        payment.refundedBy = req.user._id;
        payment.refundReason = reason;
      }

      // Agregar razón del cambio de estado
      if (reason) {
        payment.statusHistory = payment.statusHistory || [];
        payment.statusHistory.push({
          status,
          reason,
          changedBy: req.user._id,
          changedAt: new Date()
        });
      }

      await payment.save();

      // Log de la acción
      payment.logAccess(req.user._id, 'payment_status_changed', {
        oldStatus,
        newStatus: status,
        reason
      });

      // Enviar notificaciones según el estado
      await PaymentController.sendStatusNotification(payment, oldStatus, status);

      res.json({
        success: true,
        message: `Estado del pago cambiado a ${status}`,
        data: {
          paymentId: payment._id,
          oldStatus,
          newStatus: status,
          reason
        }
      });

    } catch (error) {
      logger.error('Error in updatePaymentStatus:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Procesar pago
   */
  static async processPayment(req, res) {
    try {
      const { transactionId, paymentDetails } = req.body;

      const payment = await Payment.findById(req.params.id);
      if (!payment) {
        return res.status(404).json({
          success: false,
          message: 'Pago no encontrado'
        });
      }

      // Verificar que el pago esté pendiente
      if (payment.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: 'Solo se pueden procesar pagos pendientes'
        });
      }

      // Verificar permisos
      const canProcess = req.user.userType === 'admin' ||
                        req.user._id.toString() === payment.professionalId.toString();

      if (!canProcess) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para procesar este pago'
        });
      }

      // Simular procesamiento del pago (aquí se integraría con el gateway de pago)
      try {
        // TODO: Integrar con gateway de pago real (Stripe, PayPal, etc.)
        // const paymentResult = await paymentGateway.process(payment, paymentDetails);
        
        // Por ahora, simulamos un procesamiento exitoso
        const isSuccessful = Math.random() > 0.1; // 90% de éxito

        if (isSuccessful) {
          payment.status = 'completed';
          payment.completedAt = new Date();
          payment.completedBy = req.user._id;
          payment.transactionId = transactionId || `TXN_${Date.now()}`;
          payment.paymentDetails = paymentDetails || {};
        } else {
          payment.status = 'failed';
          payment.failedAt = new Date();
          payment.failedBy = req.user._id;
          payment.failureReason = 'Error en el procesamiento del pago';
        }

        payment.lastModifiedBy = req.user._id;
        payment.lastModifiedAt = new Date();

        // Agregar al historial
        payment.statusHistory = payment.statusHistory || [];
        payment.statusHistory.push({
          status: payment.status,
          reason: payment.status === 'failed' ? payment.failureReason : 'Pago procesado exitosamente',
          changedBy: req.user._id,
          changedAt: new Date()
        });

        await payment.save();

        // Log de la acción
        payment.logAccess(req.user._id, 'payment_processed', {
          status: payment.status,
          transactionId: payment.transactionId
        });

        // Enviar notificación
        await PaymentController.sendStatusNotification(payment, 'pending', payment.status);

        res.json({
          success: true,
          message: `Pago ${payment.status === 'completed' ? 'procesado exitosamente' : 'falló'}`,
          data: {
            paymentId: payment._id,
            status: payment.status,
            transactionId: payment.transactionId
          }
        });

      } catch (processingError) {
        logger.error('Payment processing error:', processingError);
        
        payment.status = 'failed';
        payment.failedAt = new Date();
        payment.failedBy = req.user._id;
        payment.failureReason = 'Error en el procesamiento del pago';
        payment.lastModifiedBy = req.user._id;
        payment.lastModifiedAt = new Date();
        await payment.save();

        res.status(500).json({
          success: false,
          message: 'Error al procesar el pago',
          data: {
            paymentId: payment._id,
            status: 'failed'
          }
        });
      }

    } catch (error) {
      logger.error('Error in processPayment:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Completar pago
   */
  static async completePayment(req, res) {
    try {
      const { transactionId, paymentDetails } = req.body;

      const payment = await Payment.findById(req.params.id);
      if (!payment) {
        return res.status(404).json({
          success: false,
          message: 'Pago no encontrado'
        });
      }

      // Verificar que el pago esté en procesamiento
      if (payment.status !== 'processing') {
        return res.status(400).json({
          success: false,
          message: 'Solo se pueden completar pagos en procesamiento'
        });
      }

      // Verificar permisos
      const canComplete = req.user.userType === 'admin' ||
                         req.user._id.toString() === payment.professionalId.toString();

      if (!canComplete) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para completar este pago'
        });
      }

      const oldStatus = payment.status;
      payment.status = 'completed';
      payment.completedAt = new Date();
      payment.completedBy = req.user._id;
      payment.transactionId = transactionId || payment.transactionId;
      payment.paymentDetails = paymentDetails || payment.paymentDetails;
      payment.lastModifiedBy = req.user._id;
      payment.lastModifiedAt = new Date();

      // Agregar al historial
      payment.statusHistory = payment.statusHistory || [];
      payment.statusHistory.push({
        status: 'completed',
        reason: 'Pago completado manualmente',
        changedBy: req.user._id,
        changedAt: new Date()
      });

      await payment.save();

      // Log de la acción
      payment.logAccess(req.user._id, 'payment_completed', {
        transactionId: payment.transactionId
      });

      // Enviar notificación
      await PaymentController.sendStatusNotification(payment, oldStatus, 'completed');

      res.json({
        success: true,
        message: 'Pago completado exitosamente',
        data: {
          paymentId: payment._id,
          status: payment.status,
          transactionId: payment.transactionId
        }
      });

    } catch (error) {
      logger.error('Error in completePayment:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener pagos pendientes
   */
  static async getPendingPayments(req, res) {
    try {
      const { limit = 10 } = req.query;

      // Construir filtros
      const filters = {
        status: { $in: ['pending', 'processing'] },
        isDeleted: false
      };

      // Aplicar filtros según el rol del usuario
      if (req.user.userType === 'client') {
        filters.clientId = req.user._id;
      } else if (req.user.userType === 'professional') {
        filters.professionalId = req.user._id;
      }

      const payments = await Payment.find(filters)
        .populate('bookingId', 'date startTime endTime notes')
        .populate('clientId', 'fullName email phone avatar')
        .populate('professionalId', 'fullName email phone avatar professionalInfo')
        .sort({ createdAt: 1 })
        .limit(parseInt(limit));

      res.json({
        success: true,
        data: payments,
        total: payments.length
      });

    } catch (error) {
      logger.error('Error in getPendingPayments:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Eliminar pago (soft delete)
   */
  static async deletePayment(req, res) {
    try {
      const payment = await Payment.findById(req.params.id);
      if (!payment) {
        return res.status(404).json({
          success: false,
          message: 'Pago no encontrado'
        });
      }

      // Verificar permisos
      const canDelete = req.user._id.toString() === payment.clientId.toString() ||
                       req.user.userType === 'admin';

      if (!canDelete) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para eliminar este pago'
        });
      }

      // Verificar que el pago se pueda eliminar
      if (['completed', 'processing'].includes(payment.status)) {
        return res.status(400).json({
          success: false,
          message: 'No se puede eliminar un pago completado o en procesamiento'
        });
      }

      payment.isDeleted = true;
      payment.deletedAt = new Date();
      payment.deletedBy = req.user._id;
      payment.lastModifiedBy = req.user._id;
      payment.lastModifiedAt = new Date();
      await payment.save();

      // Log de la acción
      payment.logAccess(req.user._id, 'payment_deleted');

      res.json({
        success: true,
        message: 'Pago eliminado exitosamente',
        data: {
          paymentId: payment._id
        }
      });

    } catch (error) {
      logger.error('Error in deletePayment:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Método estático para enviar notificaciones de cambio de estado
   */
  static async sendStatusNotification(payment, oldStatus, newStatus) {
    try {
      const statusMessages = {
        processing: {
          title: 'Pago en procesamiento',
          message: 'Tu pago está siendo procesado'
        },
        completed: {
          title: 'Pago completado',
          message: 'Tu pago ha sido procesado exitosamente'
        },
        failed: {
          title: 'Pago fallido',
          message: 'Tu pago no pudo ser procesado'
        },
        cancelled: {
          title: 'Pago cancelado',
          message: 'Tu pago ha sido cancelado'
        },
        refunded: {
          title: 'Pago reembolsado',
          message: 'Tu pago ha sido reembolsado'
        }
      };

      const message = statusMessages[newStatus];
      if (message) {
        // Notificar al cliente
        await Notification.create({
          recipientId: payment.clientId,
          senderId: payment.professionalId,
          type: `payment_${newStatus}`,
          title: message.title,
          message: message.message,
          priority: newStatus === 'failed' ? 'high' : 'normal',
          metadata: {
            paymentId: payment._id,
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
   * Obtener estadísticas de pagos
   */
  static async getPaymentStats(req, res) {
    try {
      const { dateFrom, dateTo, status, professionalId, clientId } = req.query;

      // Construir filtros
      const filters = { isDeleted: false };
      if (status) filters.status = status;
      if (professionalId) filters.professionalId = professionalId;
      if (clientId) filters.clientId = clientId;
      if (dateFrom || dateTo) {
        filters.createdAt = {};
        if (dateFrom) filters.createdAt.$gte = new Date(dateFrom);
        if (dateTo) filters.createdAt.$lte = new Date(dateTo);
      }

      const stats = await Payment.getPaymentStats(filters);

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      logger.error('Error in getPaymentStats:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
}

module.exports = PaymentController;
