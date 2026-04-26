const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const logger = require('../config/logger');

class WebSocketManager {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // userId -> socketId
    this.userSockets = new Map(); // socketId -> userId
  }

  setup(server) {
    try {
      // Crear servidor Socket.IO
      this.io = new Server(server, {
        cors: {
          origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000', 'http://localhost:8081'],
          methods: ['GET', 'POST'],
          credentials: true
        },
        transports: ['websocket', 'polling'],
        pingTimeout: 60000,
        pingInterval: 25000
      });

      // Middleware de autenticación
      this.io.use(this.authenticateSocket.bind(this));

      // Manejar conexiones
      this.io.on('connection', this.handleConnection.bind(this));

      logger.info('✅ WebSocket configurado exitosamente');
      
    } catch (error) {
      logger.error('❌ Error configurando WebSocket:', error);
    }
  }

  // Autenticar conexión WebSocket
  authenticateSocket(socket, next) {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization;
      
      if (!token) {
        return next(new Error('Token de autenticación requerido'));
      }

      // Remover 'Bearer ' si está presente
      const cleanToken = token.replace('Bearer ', '');
      
      // Verificar token
      const decoded = jwt.verify(cleanToken, process.env.JWT_SECRET);
      
      // Agregar información del usuario al socket
      socket.userId = decoded.id;
      socket.userType = decoded.userType;
      
      next();
      
    } catch (error) {
      logger.warn('WebSocket authentication failed:', {
        socketId: socket.id,
        error: error.message
      });
      next(new Error('Token inválido'));
    }
  }

  // Manejar nueva conexión
  handleConnection(socket) {
    try {
      const userId = socket.userId;
      const userType = socket.userType;

      // Registrar usuario conectado
      this.connectedUsers.set(userId, socket.id);
      this.userSockets.set(socket.id, userId);

      logger.logWebSocket('user_connected', userId, true, {
        socketId: socket.id,
        userType
      });

      // Unir a salas específicas
      socket.join(`user_${userId}`);
      socket.join(`type_${userType}`);

      // Eventos de chat
      this.setupChatEvents(socket);

      // Eventos de notificaciones
      this.setupNotificationEvents(socket);

      // Eventos de citas
      this.setupAppointmentEvents(socket);

      // Eventos de pagos
      this.setupPaymentEvents(socket);

      // Manejar desconexión
      socket.on('disconnect', () => {
        this.handleDisconnection(socket);
      });

      // Manejar errores
      socket.on('error', (error) => {
        logger.error('WebSocket error:', error);
      });

    } catch (error) {
      logger.error('Error en handleConnection:', error);
    }
  }

  // Configurar eventos de chat
  setupChatEvents(socket) {
    // Unirse a conversación
    socket.on('join_conversation', (conversationId) => {
      socket.join(`conversation_${conversationId}`);
      logger.logWebSocket('conversation_joined', socket.userId, true, {
        conversationId,
        socketId: socket.id
      });
    });

    // Salir de conversación
    socket.on('leave_conversation', (conversationId) => {
      socket.leave(`conversation_${conversationId}`);
      logger.logWebSocket('conversation_left', socket.userId, true, {
        conversationId,
        socketId: socket.id
      });
    });

    // Mensaje de chat
    socket.on('send_message', (data) => {
      this.handleChatMessage(socket, data);
    });

    // Marcar mensaje como leído
    socket.on('mark_read', (data) => {
      this.handleMarkRead(socket, data);
    });

    // Escribiendo...
    socket.on('typing_start', (data) => {
      this.handleTypingStart(socket, data);
    });

    socket.on('typing_stop', (data) => {
      this.handleTypingStop(socket, data);
    });
  }

  // Configurar eventos de notificaciones
  setupNotificationEvents(socket) {
    // Suscribirse a notificaciones
    socket.on('subscribe_notifications', (data) => {
      socket.join(`notifications_${socket.userId}`);
      logger.logWebSocket('notifications_subscribed', socket.userId, true, {
        socketId: socket.id
      });
    });

    // Desuscribirse de notificaciones
    socket.on('unsubscribe_notifications', (data) => {
      socket.leave(`notifications_${socket.userId}`);
      logger.logWebSocket('notifications_unsubscribed', socket.userId, true, {
        socketId: socket.id
      });
    });
  }

  // Configurar eventos de citas
  setupAppointmentEvents(socket) {
    // Suscribirse a actualizaciones de citas
    socket.on('subscribe_appointments', (data) => {
      socket.join(`appointments_${socket.userId}`);
      logger.logWebSocket('appointments_subscribed', socket.userId, true, {
        socketId: socket.id
      });
    });

    // Desuscribirse de actualizaciones de citas
    socket.on('unsubscribe_appointments', (data) => {
      socket.leave(`appointments_${socket.userId}`);
      logger.logWebSocket('appointments_unsubscribed', socket.userId, true, {
        socketId: socket.id
      });
    });
  }

  // Configurar eventos de pagos
  setupPaymentEvents(socket) {
    // Suscribirse a actualizaciones de pagos
    socket.on('subscribe_payments', (data) => {
      socket.join(`payments_${socket.userId}`);
      logger.logWebSocket('payments_subscribed', socket.userId, true, {
        socketId: socket.id
      });
    });

    // Desuscribirse de actualizaciones de pagos
    socket.on('unsubscribe_payments', (data) => {
      socket.leave(`payments_${socket.userId}`);
      logger.logWebSocket('payments_unsubscribed', socket.userId, true, {
        socketId: socket.id
      });
    });
  }

  // Manejar mensaje de chat
  handleChatMessage(socket, data) {
    try {
      const { conversationId, content, messageType, attachments } = data;
      
      // Validar datos
      if (!conversationId || !content) {
        socket.emit('chat_error', { message: 'Datos incompletos' });
        return;
      }

      // Emitir mensaje a la conversación
      this.io.to(`conversation_${conversationId}`).emit('new_message', {
        conversationId,
        senderId: socket.userId,
        content,
        messageType: messageType || 'text',
        attachments: attachments || [],
        timestamp: new Date().toISOString()
      });

      logger.logWebSocket('message_sent', socket.userId, true, {
        conversationId,
        messageType
      });

    } catch (error) {
      logger.error('Error en handleChatMessage:', error);
      socket.emit('chat_error', { message: 'Error enviando mensaje' });
    }
  }

  // Manejar marcado como leído
  handleMarkRead(socket, data) {
    try {
      const { conversationId, messageId } = data;
      
      // Emitir evento de mensaje leído
      this.io.to(`conversation_${conversationId}`).emit('message_read', {
        conversationId,
        messageId,
        readBy: socket.userId,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error en handleMarkRead:', error);
    }
  }

  // Manejar inicio de escritura
  handleTypingStart(socket, data) {
    try {
      const { conversationId } = data;
      
      // Emitir evento de escritura
      socket.to(`conversation_${conversationId}`).emit('typing_start', {
        conversationId,
        userId: socket.userId
      });

    } catch (error) {
      logger.error('Error en handleTypingStart:', error);
    }
  }

  // Manejar fin de escritura
  handleTypingStop(socket, data) {
    try {
      const { conversationId } = data;
      
      // Emitir evento de fin de escritura
      socket.to(`conversation_${conversationId}`).emit('typing_stop', {
        conversationId,
        userId: socket.userId
      });

    } catch (error) {
      logger.error('Error en handleTypingStop:', error);
    }
  }

  // Manejar desconexión
  handleDisconnection(socket) {
    try {
      const userId = socket.userId;
      const socketId = socket.id;

      // Remover de registros
      this.connectedUsers.delete(userId);
      this.userSockets.delete(socketId);

      logger.logWebSocket('user_disconnected', userId, true, {
        socketId
      });

    } catch (error) {
      logger.error('Error en handleDisconnection:', error);
    }
  }

  // Enviar notificación a usuario específico
  sendNotification(userId, notification) {
    try {
      const socketId = this.connectedUsers.get(userId);
      
      if (socketId) {
        this.io.to(socketId).emit('new_notification', notification);
        logger.logWebSocket('notification_sent', userId, true, {
          notificationId: notification.id,
          type: notification.type
        });
      }
      
    } catch (error) {
      logger.error('Error enviando notificación:', error);
    }
  }

  // Enviar notificación a múltiples usuarios
  sendNotificationToUsers(userIds, notification) {
    try {
      userIds.forEach(userId => {
        this.sendNotification(userId, notification);
      });
      
    } catch (error) {
      logger.error('Error enviando notificaciones múltiples:', error);
    }
  }

  // Enviar actualización de cita
  sendAppointmentUpdate(userId, appointment) {
    try {
      const socketId = this.connectedUsers.get(userId);
      
      if (socketId) {
        this.io.to(socketId).emit('appointment_updated', appointment);
        logger.logWebSocket('appointment_update_sent', userId, true, {
          appointmentId: appointment.id,
          status: appointment.status
        });
      }
      
    } catch (error) {
      logger.error('Error enviando actualización de cita:', error);
    }
  }

  // Enviar actualización de pago
  sendPaymentUpdate(userId, payment) {
    try {
      const socketId = this.connectedUsers.get(userId);
      
      if (socketId) {
        this.io.to(socketId).emit('payment_updated', payment);
        logger.logWebSocket('payment_update_sent', userId, true, {
          paymentId: payment.id,
          status: payment.status
        });
      }
      
    } catch (error) {
      logger.error('Error enviando actualización de pago:', error);
    }
  }

  // Enviar mensaje de chat
  sendChatMessage(conversationId, message) {
    try {
      this.io.to(`conversation_${conversationId}`).emit('new_message', message);
      
      logger.logWebSocket('chat_message_sent', message.senderId, true, {
        conversationId,
        messageId: message.id
      });
      
    } catch (error) {
      logger.error('Error enviando mensaje de chat:', error);
    }
  }

  // Obtener usuarios conectados
  getConnectedUsers() {
    return Array.from(this.connectedUsers.keys());
  }

  // Verificar si un usuario está conectado
  isUserConnected(userId) {
    return this.connectedUsers.has(userId);
  }

  // Obtener socket ID de un usuario
  getUserSocketId(userId) {
    return this.connectedUsers.get(userId);
  }

  // Obtener estadísticas de conexiones
  getConnectionStats() {
    return {
      totalConnections: this.io.engine.clientsCount,
      connectedUsers: this.connectedUsers.size,
      userSockets: this.userSockets.size
    };
  }

  // Desconectar usuario específico
  disconnectUser(userId) {
    try {
      const socketId = this.connectedUsers.get(userId);
      
      if (socketId) {
        const socket = this.io.sockets.sockets.get(socketId);
        if (socket) {
          socket.disconnect(true);
          logger.logWebSocket('user_force_disconnected', userId, true, {
            socketId
          });
        }
      }
      
    } catch (error) {
      logger.error('Error desconectando usuario:', error);
    }
  }

  // Broadcast a todos los usuarios
  broadcastToAll(event, data) {
    try {
      this.io.emit(event, data);
      logger.info(`Broadcast enviado a todos los usuarios: ${event}`);
      
    } catch (error) {
      logger.error('Error en broadcast:', error);
    }
  }

  // Broadcast a usuarios de un tipo específico
  broadcastToUserType(userType, event, data) {
    try {
      this.io.to(`type_${userType}`).emit(event, data);
      logger.info(`Broadcast enviado a usuarios tipo ${userType}: ${event}`);
      
    } catch (error) {
      logger.error('Error en broadcast por tipo:', error);
    }
  }
}

// Crear instancia global
const webSocketManager = new WebSocketManager();

// Función de setup para usar en server.js
const setupWebSocket = (server) => {
  webSocketManager.setup(server);
};

module.exports = {
  setupWebSocket,
  webSocketManager
};
