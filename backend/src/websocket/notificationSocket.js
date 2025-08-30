const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Notification = require('../models/Notification');

class NotificationSocket {
  constructor(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      }
    });
    
    this.connectedUsers = new Map(); // userId -> socketId
    this.userSockets = new Map(); // socketId -> userId
    
    this.setupMiddleware();
    this.setupEventHandlers();
    
    console.log('🚀 WebSocket server initialized');
  }

  // Middleware para autenticación JWT
  setupMiddleware() {
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Authentication error: No token provided'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId).select('_id email fullName userType');
        
        if (!user) {
          return next(new Error('Authentication error: User not found'));
        }

        socket.userId = user._id.toString();
        socket.user = user;
        next();
      } catch (error) {
        console.error('WebSocket authentication error:', error);
        next(new Error('Authentication error: Invalid token'));
      }
    });
  }

  // Configurar manejadores de eventos
  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`🔌 User connected: ${socket.user.fullName} (${socket.userId})`);
      
      // Registrar usuario conectado
      this.connectedUsers.set(socket.userId, socket.id);
      this.userSockets.set(socket.id, socket.userId);
      
      // Unir a sala personal del usuario
      socket.join(`user_${socket.userId}`);
      
      // Unir a salas según tipo de usuario
      if (socket.user.userType === 'professional') {
        socket.join('professionals');
      } else if (socket.user.userType === 'admin') {
        socket.join('admins');
      }
      
      // Evento de desconexión
      socket.on('disconnect', () => {
        console.log(`🔌 User disconnected: ${socket.user.fullName} (${socket.userId})`);
        this.connectedUsers.delete(socket.userId);
        this.userSockets.delete(socket.id);
      });
      
      // Evento de typing en chat (futuro)
      socket.on('typing', (data) => {
        socket.to(`user_${data.recipientId}`).emit('user_typing', {
          userId: socket.userId,
          userName: socket.user.fullName
        });
      });
      
      // Evento de stop typing
      socket.on('stop_typing', (data) => {
        socket.to(`user_${data.recipientId}`).emit('user_stop_typing', {
          userId: socket.userId
        });
      });
      
      // Evento de confirmación de lectura de notificación
      socket.on('notification_read', async (data) => {
        try {
          await Notification.findByIdAndUpdate(data.notificationId, { isRead: true });
          console.log(`📖 Notification marked as read: ${data.notificationId}`);
        } catch (error) {
          console.error('Error marking notification as read:', error);
        }
      });
      
      // Evento de ping para mantener conexión activa
      socket.on('ping', () => {
        socket.emit('pong');
      });
    });
  }

  // Enviar notificación a usuario específico
  sendToUser(userId, event, data) {
    const socketId = this.connectedUsers.get(userId);
    if (socketId) {
      this.io.to(socketId).emit(event, data);
      console.log(`📤 Notification sent to user ${userId}: ${event}`);
      return true;
    }
    console.log(`⚠️ User ${userId} not connected, notification queued`);
    return false;
  }

  // Enviar notificación a múltiples usuarios
  sendToUsers(userIds, event, data) {
    const connectedUsers = [];
    const offlineUsers = [];
    
    userIds.forEach(userId => {
      if (this.connectedUsers.has(userId)) {
        connectedUsers.push(userId);
      } else {
        offlineUsers.push(userId);
      }
    });
    
    // Enviar a usuarios conectados
    if (connectedUsers.length > 0) {
      this.io.to(connectedUsers.map(id => `user_${id}`)).emit(event, data);
      console.log(`📤 Notification sent to ${connectedUsers.length} connected users: ${event}`);
    }
    
    // Retornar usuarios offline para procesamiento posterior
    return offlineUsers;
  }

  // Enviar notificación a todos los profesionales
  sendToProfessionals(event, data) {
    this.io.to('professionals').emit(event, data);
    console.log(`📤 Notification sent to all professionals: ${event}`);
  }

  // Enviar notificación a todos los administradores
  sendToAdmins(event, data) {
    this.io.to('admins').emit(event, data);
    console.log(`📤 Notification sent to all admins: ${event}`);
  }

  // Enviar notificación de nueva cita
  sendAppointmentNotification(appointment, type) {
    const notificationData = {
      type: type,
      title: this.getAppointmentTitle(type),
      message: this.getAppointmentMessage(type, appointment),
      appointmentData: {
        appointmentId: appointment._id,
        service: appointment.service?.name || 'Servicio',
        date: appointment.date,
        time: appointment.time,
        professional: appointment.professional?.fullName || 'Profesional',
        clinic: appointment.clinic?.name || 'Clínica'
      },
      timestamp: new Date(),
      priority: 'high'
    };

    // Enviar al cliente
    this.sendToUser(appointment.clientId, 'new_appointment', notificationData);
    
    // Enviar al profesional
    this.sendToUser(appointment.professionalId, 'new_appointment_request', notificationData);
    
    // Enviar a administradores si es necesario
    if (type === 'appointment_cancelled' || type === 'appointment_confirmed') {
      this.sendToAdmins('appointment_status_changed', {
        ...notificationData,
        appointmentId: appointment._id
      });
    }
  }

  // Enviar notificación de recordatorio
  sendReminderNotification(appointment) {
    const reminderData = {
      type: 'reminder',
      title: 'Recordatorio de Cita',
      message: `Tienes una cita programada para mañana a las ${appointment.time}`,
      appointmentData: {
        appointmentId: appointment._id,
        service: appointment.service?.name || 'Servicio',
        date: appointment.date,
        time: appointment.time,
        professional: appointment.professional?.fullName || 'Profesional'
      },
      timestamp: new Date(),
      priority: 'medium'
    };

    // Enviar recordatorio al cliente
    this.sendToUser(appointment.clientId, 'appointment_reminder', reminderData);
    
    // Enviar recordatorio al profesional
    this.sendToUser(appointment.professionalId, 'appointment_reminder', reminderData);
  }

  // Enviar notificación de pago
  sendPaymentNotification(userId, type, paymentData) {
    const notificationData = {
      type: type,
      title: this.getPaymentTitle(type),
      message: this.getPaymentMessage(type, paymentData),
      paymentData: paymentData,
      timestamp: new Date(),
      priority: 'high'
    };

    this.sendToUser(userId, 'payment_update', notificationData);
  }

  // Enviar notificación de sistema
  sendSystemNotification(userIds, title, message, priority = 'medium') {
    const notificationData = {
      type: 'system',
      title: title,
      message: message,
      timestamp: new Date(),
      priority: priority
    };

    this.sendToUsers(userIds, 'system_notification', notificationData);
  }

  // Títulos para diferentes tipos de citas
  getAppointmentTitle(type) {
    const titles = {
      'appointment_request': 'Nueva Solicitud de Cita',
      'appointment_confirmed': 'Cita Confirmada',
      'appointment_cancelled': 'Cita Cancelada',
      'appointment_reminder': 'Recordatorio de Cita',
      'appointment_completed': 'Cita Completada'
    };
    return titles[type] || 'Actualización de Cita';
  }

  // Mensajes para diferentes tipos de citas
  getAppointmentMessage(type, appointment) {
    const serviceName = appointment.service?.name || 'servicio';
    const date = new Date(appointment.date).toLocaleDateString('es-ES');
    const time = appointment.time;
    
    const messages = {
      'appointment_request': `Nueva solicitud de cita para ${serviceName} el ${date} a las ${time}`,
      'appointment_confirmed': `Tu cita para ${serviceName} el ${date} a las ${time} ha sido confirmada`,
      'appointment_cancelled': `Tu cita para ${serviceName} el ${date} a las ${time} ha sido cancelada`,
      'appointment_reminder': `Recordatorio: Tienes cita para ${serviceName} mañana a las ${time}`,
      'appointment_completed': `Tu cita para ${serviceName} el ${date} a las ${time} ha sido completada`
    };
    return messages[type] || 'Actualización de cita';
  }

  // Títulos para diferentes tipos de pagos
  getPaymentTitle(type) {
    const titles = {
      'payment_required': 'Pago Requerido',
      'payment_successful': 'Pago Exitoso',
      'payment_failed': 'Pago Fallido',
      'payment_refunded': 'Reembolso Procesado'
    };
    return titles[type] || 'Actualización de Pago';
  }

  // Mensajes para diferentes tipos de pagos
  getPaymentMessage(type, paymentData) {
    const amount = paymentData.amount ? `$${paymentData.amount}` : '';
    
    const messages = {
      'payment_required': `Se requiere un pago de ${amount} para confirmar tu cita`,
      'payment_successful': `Tu pago de ${amount} ha sido procesado exitosamente`,
      'payment_failed': `Tu pago de ${amount} no pudo ser procesado`,
      'payment_refunded': `Se ha procesado un reembolso de ${amount}`
    };
    return messages[type] || 'Actualización de pago';
  }

  // Obtener estadísticas de conexiones
  getConnectionStats() {
    return {
      totalConnected: this.connectedUsers.size,
      totalSockets: this.userSockets.size,
      connectedUsers: Array.from(this.connectedUsers.keys())
    };
  }

  // Verificar si un usuario está conectado
  isUserConnected(userId) {
    return this.connectedUsers.has(userId);
  }

  // Obtener socket ID de un usuario
  getUserSocketId(userId) {
    return this.connectedUsers.get(userId);
  }
}

module.exports = NotificationSocket;
