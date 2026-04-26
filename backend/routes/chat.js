const express = require('express');
const { body, query, param, validationResult } = require('express-validator');
const ChatMessage = require('../models/ChatMessage');
const ChatConversation = require('../models/ChatConversation');
const User = require('../models/User');
const { authenticateToken, requireRole, requireOwnership } = require('../middleware/auth');
const { catchAsync } = require('../middleware/errorHandler');
const { webSocketManager } = require('../websocket/setup');
const logger = require('../config/logger');

const router = express.Router();

// Middleware de validación
const validateMessage = [
  body('conversationId').isMongoId().withMessage('ID de conversación inválido'),
  body('content').isString().trim().isLength({ min: 1, max: 2000 }).withMessage('Mensaje debe tener entre 1 y 2000 caracteres'),
  body('messageType').optional().isIn(['text', 'image', 'file', 'location', 'contact', 'audio', 'video']).withMessage('Tipo de mensaje inválido'),
  body('attachments').optional().isArray().withMessage('Adjuntos debe ser un array'),
  body('replyTo').optional().isMongoId().withMessage('ID de mensaje de respuesta inválido')
];

const validateConversation = [
  body('participants').isArray({ min: 2, max: 10 }).withMessage('Debe haber entre 2 y 10 participantes'),
  body('participants.*').isMongoId().withMessage('ID de participante inválido'),
  body('title').optional().isString().trim().isLength({ max: 200 }).withMessage('Título no puede exceder 200 caracteres'),
  body('type').optional().isIn(['direct', 'group', 'support', 'appointment']).withMessage('Tipo de conversación inválido'),
  body('metadata').optional().isObject().withMessage('Metadata debe ser un objeto')
];

// GET /api/v1/chat/conversations - Obtener conversaciones del usuario
router.get('/conversations',
  authenticateToken,
  [
    query('type').optional().isString(),
    query('search').optional().isString(),
    query('sortBy').optional().isIn(['lastMessage', 'createdAt', 'title']),
    query('sortOrder').optional().isIn(['asc', 'desc']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 })
  ],
  catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const {
      type,
      search,
      sortBy = 'lastMessage',
      sortOrder = 'desc',
      page = 1,
      limit = 20
    } = req.query;

    // Construir filtros
    const filters = {
      participants: req.user._id,
      isDeleted: false
    };

    if (type) filters.type = type;

    let conversations;
    let total;

    if (search) {
      // Búsqueda con filtros
      conversations = await ChatConversation.search(search, filters, req.user._id);
      total = conversations.length;
    } else {
      // Consulta directa
      const skip = (page - 1) * limit;
      
      [conversations, total] = await Promise.all([
        ChatConversation.find(filters)
          .populate('participants', 'fullName email phone userType avatar isOnline lastSeen')
          .populate('lastMessage', 'content messageType createdAt sender')
          .populate('lastMessage.sender', 'fullName userType avatar')
          .sort(sortBy === 'lastMessage' ? { 'lastMessage.createdAt': sortOrder === 'desc' ? -1 : 1 } :
                sortBy === 'createdAt' ? { createdAt: sortOrder === 'desc' ? -1 : 1 } :
                { title: sortOrder === 'desc' ? -1 : 1 })
          .skip(skip)
          .limit(parseInt(limit)),
        ChatConversation.countDocuments(filters)
      ]);
    }

    // Calcular información adicional para cada conversación
    const conversationsWithInfo = await Promise.all(
      conversations.map(async (conversation) => {
        const unreadCount = await ChatMessage.countDocuments({
          conversation: conversation._id,
          sender: { $ne: req.user._id },
          isRead: false,
          isDeleted: false
        });

        return {
          ...conversation.toObject(),
          unreadCount,
          isOnline: conversation.participants.some(p => 
            p._id.toString() !== req.user._id.toString() && p.isOnline
          )
        };
      })
    );

    res.json({
      success: true,
      data: conversationsWithInfo,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  })
);

// GET /api/v1/chat/conversations/:id - Obtener conversación específica
router.get('/conversations/:id',
  authenticateToken,
  [
    param('id').isMongoId().withMessage('ID de conversación inválido')
  ],
  catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const conversation = await ChatConversation.findById(req.params.id)
      .populate('participants', 'fullName email phone userType avatar isOnline lastSeen')
      .populate('lastMessage', 'content messageType createdAt sender')
      .populate('lastMessage.sender', 'fullName userType avatar');

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversación no encontrada'
      });
    }

    // Verificar que el usuario sea participante
    if (!conversation.participants.some(p => p._id.toString() === req.user._id.toString())) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para acceder a esta conversación'
      });
    }

    // Marcar mensajes como leídos
    await ChatMessage.updateMany(
      {
        conversation: conversation._id,
        sender: { $ne: req.user._id },
        isRead: false,
        isDeleted: false
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
          lastModifiedBy: req.user._id,
          lastModifiedAt: new Date()
        }
      }
    );

    // Log de acceso
    conversation.logAccess(req.user._id, 'conversation_accessed', {
      timestamp: new Date()
    });

    res.json({
      success: true,
      data: conversation
    });
  })
);

// POST /api/v1/chat/conversations - Crear nueva conversación
router.post('/conversations',
  authenticateToken,
  validateConversation,
  catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const {
      participants,
      title,
      type = 'direct',
      metadata = {}
    } = req.body;

    // Verificar que el usuario actual esté en los participantes
    if (!participants.includes(req.user._id.toString())) {
      participants.push(req.user._id.toString());
    }

    // Verificar que los participantes existan
    const participantUsers = await User.find({
      _id: { $in: participants }
    }).select('fullName email phone userType avatar');

    if (participantUsers.length !== participants.length) {
      return res.status(400).json({
        success: false,
        message: 'Uno o más participantes no existen'
      });
    }

    // Para conversaciones directas, verificar si ya existe
    if (type === 'direct' && participants.length === 2) {
      const existingConversation = await ChatConversation.findOne({
        type: 'direct',
        participants: { $all: participants },
        isDeleted: false
      });

      if (existingConversation) {
        return res.status(409).json({
          success: false,
          message: 'Ya existe una conversación con estos participantes',
          data: existingConversation
        });
      }
    }

    // Crear la conversación
    const conversation = new ChatConversation({
      participants,
      title: title || (type === 'direct' ? 
        participantUsers.find(p => p._id.toString() !== req.user._id.toString())?.fullName : 
        'Nueva conversación'),
      type,
      metadata: {
        ...metadata,
        createdBy: req.user._id.toString(),
        userType: req.user.userType
      },
      createdBy: req.user._id
    });

    await conversation.save();

    // Log de la acción
    conversation.logAccess(req.user._id, 'conversation_created', {
      participantCount: participants.length,
      type,
      title: conversation.title
    });

    // Populate para la respuesta
    await conversation.populate([
      { path: 'participants', select: 'fullName email phone userType avatar isOnline lastSeen' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Conversación creada exitosamente',
      data: conversation
    });
  })
);

// PUT /api/v1/chat/conversations/:id - Actualizar conversación
router.put('/conversations/:id',
  authenticateToken,
  [
    param('id').isMongoId().withMessage('ID de conversación inválido')
  ],
  catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { title, metadata } = req.body;
    const conversation = await ChatConversation.findById(req.params.id);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversación no encontrada'
      });
    }

    // Verificar que el usuario sea participante
    if (!conversation.participants.includes(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para modificar esta conversación'
      });
    }

    // Solo permitir modificación de conversaciones de grupo
    if (conversation.type === 'direct') {
      return res.status(400).json({
        success: false,
        message: 'No se pueden modificar conversaciones directas'
      });
    }

    // Actualizar campos permitidos
    if (title !== undefined) conversation.title = title;
    if (metadata !== undefined) {
      conversation.metadata = {
        ...conversation.metadata,
        ...metadata,
        lastModifiedBy: req.user._id.toString()
      };
    }

    conversation.lastModifiedBy = req.user._id;
    conversation.lastModifiedAt = new Date();
    await conversation.save();

    // Log de la acción
    conversation.logAccess(req.user._id, 'conversation_updated', {
      changes: req.body
    });

    // Populate para la respuesta
    await conversation.populate([
      { path: 'participants', select: 'fullName email phone userType avatar isOnline lastSeen' }
    ]);

    res.json({
      success: true,
      message: 'Conversación actualizada exitosamente',
      data: conversation
    });
  })
);

// DELETE /api/v1/chat/conversations/:id - Eliminar conversación (soft delete)
router.delete('/conversations/:id',
  authenticateToken,
  [
    param('id').isMongoId().withMessage('ID de conversación inválido')
  ],
  catchAsync(async (req, res) => {
    const conversation = await ChatConversation.findById(req.params.id);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversación no encontrada'
      });
    }

    // Verificar que el usuario sea participante
    if (!conversation.participants.includes(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para eliminar esta conversación'
      });
    }

    // Soft delete
    await conversation.softDelete(req.user._id);

    // Log de la acción
    conversation.logAccess(req.user._id, 'conversation_deleted', {
      reason: 'user_deletion'
    });

    res.json({
      success: true,
      message: 'Conversación eliminada exitosamente'
    });
  })
);

// GET /api/v1/chat/conversations/:id/messages - Obtener mensajes de una conversación
router.get('/conversations/:id/messages',
  authenticateToken,
  [
    param('id').isMongoId().withMessage('ID de conversación inválido'),
    query('before').optional().isISO8601(),
    query('after').optional().isISO8601(),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('messageType').optional().isString(),
    query('search').optional().isString()
  ],
  catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const {
      before,
      after,
      limit = 50,
      messageType,
      search
    } = req.query;

    // Verificar que la conversación existe y el usuario es participante
    const conversation = await ChatConversation.findById(req.params.id);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversación no encontrada'
      });
    }

    if (!conversation.participants.includes(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para acceder a esta conversación'
      });
    }

    // Construir filtros
    const filters = {
      conversation: req.params.id,
      isDeleted: false
    };

    if (messageType) filters.messageType = messageType;
    if (before) filters.createdAt = { $lt: new Date(before) };
    if (after) filters.createdAt = { $gt: new Date(after) };
    if (search) {
      filters.$text = { $search: search };
    }

    // Obtener mensajes
    const messages = await ChatMessage.find(filters)
      .populate('sender', 'fullName userType avatar')
      .populate('replyTo', 'content messageType sender')
      .populate('replyTo.sender', 'fullName userType avatar')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    // Marcar mensajes como leídos si no lo están
    const unreadMessages = messages.filter(m => 
      !m.isRead && m.sender._id.toString() !== req.user._id.toString()
    );

    if (unreadMessages.length > 0) {
      await ChatMessage.updateMany(
        { _id: { $in: unreadMessages.map(m => m._id) } },
        {
          $set: {
            isRead: true,
            readAt: new Date(),
            lastModifiedBy: req.user._id,
            lastModifiedAt: new Date()
          }
        }
      );
    }

    res.json({
      success: true,
      data: messages.reverse(), // Ordenar cronológicamente
      pagination: {
        limit: parseInt(limit),
        hasMore: messages.length === parseInt(limit),
        before: messages.length > 0 ? messages[0].createdAt : null,
        after: messages.length > 0 ? messages[messages.length - 1].createdAt : null
      }
    });
  })
);

// POST /api/v1/chat/conversations/:id/messages - Enviar mensaje
router.post('/conversations/:id/messages',
  authenticateToken,
  [
    param('id').isMongoId().withMessage('ID de conversación inválido')
  ],
  validateMessage,
  catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const {
      content,
      messageType = 'text',
      attachments = [],
      replyTo
    } = req.body;

    // Verificar que la conversación existe y el usuario es participante
    const conversation = await ChatConversation.findById(req.params.id);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversación no encontrada'
      });
    }

    if (!conversation.participants.includes(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para enviar mensajes en esta conversación'
      });
    }

    // Verificar mensaje de respuesta si existe
    if (replyTo) {
      const replyMessage = await ChatMessage.findById(replyTo);
      if (!replyMessage || replyMessage.conversation.toString() !== req.params.id) {
        return res.status(400).json({
          success: false,
          message: 'Mensaje de respuesta inválido'
        });
      }
    }

    // Crear el mensaje
    const message = new ChatMessage({
      conversation: req.params.id,
      sender: req.user._id,
      content,
      messageType,
      attachments,
      replyTo,
      metadata: {
        userType: req.user.userType,
        deviceInfo: req.headers['user-agent'] || 'unknown'
      },
      createdBy: req.user._id
    });

    await message.save();

    // Actualizar última actividad de la conversación
    conversation.lastMessage = message._id;
    conversation.lastActivity = new Date();
    conversation.lastModifiedBy = req.user._id;
    conversation.lastModifiedAt = new Date();
    await conversation.save();

    // Log de la acción
    message.logAccess(req.user._id, 'message_sent', {
      conversationId: req.params.id,
      messageType,
      hasAttachments: attachments.length > 0
    });

    // Enviar por WebSocket a todos los participantes
    conversation.participants.forEach(participantId => {
      if (participantId.toString() !== req.user._id.toString()) {
        webSocketManager.sendChatMessage(req.params.id, {
          type: 'new_message',
          message: {
            id: message._id,
            content: message.content,
            messageType: message.messageType,
            sender: {
              id: req.user._id,
              fullName: req.user.fullName,
              userType: req.user.userType,
              avatar: req.user.avatar
            },
            createdAt: message.createdAt,
            replyTo: message.replyTo
          }
        });
      }
    });

    // Populate para la respuesta
    await message.populate([
      { path: 'sender', select: 'fullName userType avatar' },
      { path: 'replyTo', select: 'content messageType sender' },
      { path: 'replyTo.sender', select: 'fullName userType avatar' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Mensaje enviado exitosamente',
      data: message
    });
  })
);

// PUT /api/v1/chat/messages/:id - Actualizar mensaje
router.put('/messages/:id',
  authenticateToken,
  [
    param('id').isMongoId().withMessage('ID de mensaje inválido'),
    body('content').isString().trim().isLength({ min: 1, max: 2000 }).withMessage('Mensaje debe tener entre 1 y 2000 caracteres')
  ],
  catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { content } = req.body;
    const message = await ChatMessage.findById(req.params.id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Mensaje no encontrado'
      });
    }

    // Verificar que el usuario sea el remitente
    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'No puedes modificar mensajes de otros usuarios'
      });
    }

    // Solo permitir edición de mensajes recientes (ej: últimos 5 minutos)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    if (message.createdAt < fiveMinutesAgo) {
      return res.status(400).json({
        success: false,
        message: 'Solo se pueden editar mensajes recientes'
      });
    }

    // Actualizar mensaje
    message.content = content;
    message.isEdited = true;
    message.editedAt = new Date();
    message.lastModifiedBy = req.user._id;
    message.lastModifiedAt = new Date();
    await message.save();

    // Log de la acción
    message.logAccess(req.user._id, 'message_edited', {
      originalContent: message.content,
      newContent: content
    });

    // Enviar actualización por WebSocket
    webSocketManager.sendChatMessage(message.conversation.toString(), {
      type: 'message_updated',
      message: {
        id: message._id,
        content: message.content,
        isEdited: true,
        editedAt: message.editedAt
      }
    });

    // Populate para la respuesta
    await message.populate([
      { path: 'sender', select: 'fullName userType avatar' },
      { path: 'replyTo', select: 'content messageType sender' },
      { path: 'replyTo.sender', select: 'fullName userType avatar' }
    ]);

    res.json({
      success: true,
      message: 'Mensaje actualizado exitosamente',
      data: message
    });
  })
);

// DELETE /api/v1/chat/messages/:id - Eliminar mensaje (soft delete)
router.delete('/messages/:id',
  authenticateToken,
  [
    param('id').isMongoId().withMessage('ID de mensaje inválido')
  ],
  catchAsync(async (req, res) => {
    const message = await ChatMessage.findById(req.params.id);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Mensaje no encontrado'
      });
    }

    // Verificar que el usuario sea el remitente o admin
    const canDelete = message.sender.toString() === req.user._id.toString() ||
                     req.user.userType === 'admin';

    if (!canDelete) {
      return res.status(403).json({
        success: false,
        message: 'No puedes eliminar mensajes de otros usuarios'
      });
    }

    // Soft delete
    await message.softDelete(req.user._id);

    // Log de la acción
    message.logAccess(req.user._id, 'message_deleted', {
      reason: 'user_deletion'
    });

    // Enviar notificación por WebSocket
    webSocketManager.sendChatMessage(message.conversation.toString(), {
      type: 'message_deleted',
      message: {
        id: message._id,
        deletedAt: new Date()
      }
    });

    res.json({
      success: true,
      message: 'Mensaje eliminado exitosamente'
    });
  })
);

// POST /api/v1/chat/messages/:id/read - Marcar mensaje como leído
router.post('/messages/:id/read',
  authenticateToken,
  [
    param('id').isMongoId().withMessage('ID de mensaje inválido')
  ],
  catchAsync(async (req, res) => {
    const message = await ChatMessage.findById(req.params.id);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Mensaje no encontrado'
      });
    }

    // Verificar que el usuario sea destinatario
    if (message.sender.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'No puedes marcar como leído tu propio mensaje'
      });
    }

    // Marcar como leído si no lo está
    if (!message.isRead) {
      message.isRead = true;
      message.readAt = new Date();
      message.lastModifiedBy = req.user._id;
      message.lastModifiedAt = new Date();
      await message.save();

      // Log de la acción
      message.logAccess(req.user._id, 'message_read', {
        timestamp: new Date()
      });
    }

    res.json({
      success: true,
      message: 'Mensaje marcado como leído',
      data: {
        messageId: message._id,
        isRead: message.isRead,
        readAt: message.readAt
      }
    });
  })
);

// GET /api/v1/chat/search - Buscar en mensajes
router.get('/search',
  authenticateToken,
  [
    query('q').isString().isLength({ min: 1 }).withMessage('Término de búsqueda es requerido'),
    query('conversationId').optional().isMongoId(),
    query('messageType').optional().isString(),
    query('dateFrom').optional().isISO8601(),
    query('dateTo').optional().isISO8601(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const {
      q: searchTerm,
      conversationId,
      messageType,
      dateFrom,
      dateTo,
      page = 1,
      limit = 20
    } = req.query;

    // Construir filtros
    const filters = {
      $text: { $search: searchTerm },
      isDeleted: false
    };

    if (conversationId) filters.conversation = conversationId;
    if (messageType) filters.messageType = messageType;
    if (dateFrom || dateTo) {
      filters.createdAt = {};
      if (dateFrom) filters.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filters.createdAt.$lte = new Date(dateTo);
    }

    // Obtener conversaciones del usuario para filtrar
    const userConversations = await ChatConversation.find({
      participants: req.user._id,
      isDeleted: false
    }).select('_id');

    filters.conversation = { $in: userConversations.map(c => c._id) };

    // Calcular paginación
    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      ChatMessage.find(filters)
        .populate('conversation', 'title type participants')
        .populate('sender', 'fullName userType avatar')
        .sort({ score: { $meta: 'textScore' } })
        .skip(skip)
        .limit(parseInt(limit)),
      ChatMessage.countDocuments(filters)
    ]);

    res.json({
      success: true,
      data: messages,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  })
);

// GET /api/v1/chat/stats - Obtener estadísticas del chat
router.get('/stats',
  authenticateToken,
  [
    query('conversationId').optional().isMongoId(),
    query('dateFrom').optional().isISO8601(),
    query('dateTo').optional().isISO8601()
  ],
  catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { conversationId, dateFrom, dateTo } = req.query;

    // Construir filtros
    const filters = {
      isDeleted: false
    };

    if (conversationId) filters.conversation = conversationId;
    if (dateFrom || dateTo) {
      filters.createdAt = {};
      if (dateFrom) filters.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filters.createdAt.$lte = new Date(dateTo);
    }

    // Obtener conversaciones del usuario para filtrar
    const userConversations = await ChatConversation.find({
      participants: req.user._id,
      isDeleted: false
    }).select('_id');

    filters.conversation = { $in: userConversations.map(c => c._id) };

    const stats = await ChatMessage.getChatStats(filters);

    res.json({
      success: true,
      data: stats
    });
  })
);

// POST /api/v1/chat/typing - Indicar que el usuario está escribiendo
router.post('/typing',
  authenticateToken,
  [
    body('conversationId').isMongoId().withMessage('ID de conversación inválido'),
    body('isTyping').isBoolean().withMessage('isTyping debe ser un booleano')
  ],
  catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { conversationId, isTyping } = req.body;

    // Verificar que la conversación existe y el usuario es participante
    const conversation = await ChatConversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversación no encontrada'
      });
    }

    if (!conversation.participants.includes(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para acceder a esta conversación'
      });
    }

    // Enviar notificación de escritura por WebSocket
    conversation.participants.forEach(participantId => {
      if (participantId.toString() !== req.user._id.toString()) {
        webSocketManager.sendChatMessage(conversationId, {
          type: isTyping ? 'typing_start' : 'typing_stop',
          user: {
            id: req.user._id,
            fullName: req.user.fullName,
            userType: req.user.userType
          }
        });
      }
    });

    res.json({
      success: true,
      message: `Estado de escritura ${isTyping ? 'iniciado' : 'detenido'}`,
      data: {
        conversationId,
        isTyping,
        userId: req.user._id
      }
    });
  })
);

module.exports = router;
