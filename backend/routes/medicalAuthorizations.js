const express = require('express');
const { body, query, param, validationResult } = require('express-validator');
const MedicalAuthorization = require('../models/MedicalAuthorization');
const User = require('../models/User');
const { authenticateToken, requireRole, requireOwnership } = require('../middleware/auth');
const { catchAsync } = require('../middleware/errorHandler');
const { webSocketManager } = require('../websocket/setup');
const emailService = require('../services/emailService');
const logger = require('../config/logger');

const router = express.Router();

// Middleware de validación
const validateAuthorizationRequest = [
  body('professionalId').isMongoId().withMessage('ID del profesional inválido'),
  body('patientId').isMongoId().withMessage('ID del paciente inválido'),
  body('requestType').isIn(['view', 'edit', 'full_access']).withMessage('Tipo de solicitud inválido'),
  body('reason').isString().isLength({ min: 1, max: 500 }).withMessage('Razón debe tener entre 1 y 500 caracteres'),
  body('expiryDate').optional().isISO8601().withMessage('Fecha de expiración inválida'),
  body('permissions').optional().isArray().withMessage('Permisos debe ser un array'),
  body('permissions.*').isIn(['view_consultations', 'view_documents', 'view_prescriptions', 'view_treatments', 'edit_consultations', 'edit_documents', 'edit_prescriptions', 'edit_treatments']).withMessage('Permiso inválido')
];

const validateAuthorizationUpdate = [
  body('status').isIn(['pending', 'approved', 'rejected', 'expired', 'revoked']).withMessage('Estado inválido'),
  body('notes').optional().isString().isLength({ max: 1000 }).withMessage('Notas no pueden exceder 1000 caracteres'),
  body('expiryDate').optional().isISO8601().withMessage('Fecha de expiración inválida'),
  body('permissions').optional().isArray().withMessage('Permisos debe ser un array')
];

// GET /api/v1/medical-authorizations - Obtener autorizaciones médicas
router.get('/',
  authenticateToken,
  [
    query('status').optional().isString(),
    query('requestType').optional().isString(),
    query('professionalId').optional().isMongoId(),
    query('patientId').optional().isMongoId(),
    query('dateFrom').optional().isISO8601(),
    query('dateTo').optional().isISO8601(),
    query('sortBy').optional().isIn(['date', 'status', 'requestType']),
    query('sortOrder').optional().isIn(['asc', 'desc']),
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
      status,
      requestType,
      professionalId,
      patientId,
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
    if (requestType) filters.requestType = requestType;
    if (professionalId) filters.professional = professionalId;
    if (patientId) filters.patient = patientId;
    if (dateFrom || dateTo) {
      filters.createdAt = {};
      if (dateFrom) filters.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filters.createdAt.$lte = new Date(dateTo);
    }

    // Aplicar filtros según el rol del usuario
    if (req.user.userType === 'client') {
      filters.patient = req.user._id;
    } else if (req.user.userType === 'professional') {
      filters.professional = req.user._id;
    }

    // Calcular paginación
    const skip = (page - 1) * limit;

    const [authorizations, total] = await Promise.all([
      MedicalAuthorization.find(filters)
        .populate('professional', 'fullName email phone userType avatar')
        .populate('patient', 'fullName email phone avatar')
        .sort(sortBy === 'date' ? { createdAt: sortOrder === 'desc' ? -1 : 1 } :
              sortBy === 'status' ? { status: sortOrder === 'desc' ? -1 : 1 } :
              { requestType: sortOrder === 'desc' ? -1 : 1 })
        .skip(skip)
        .limit(parseInt(limit)),
      MedicalAuthorization.countDocuments(filters)
    ]);

    res.json({
      success: true,
      data: authorizations,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  })
);

// GET /api/v1/medical-authorizations/:id - Obtener autorización específica
router.get('/:id',
  authenticateToken,
  [
    param('id').isMongoId().withMessage('ID de autorización inválido')
  ],
  catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const authorization = await MedicalAuthorization.findById(req.params.id)
      .populate('professional', 'fullName email phone userType avatar')
      .populate('patient', 'fullName email phone avatar');

    if (!authorization) {
      return res.status(404).json({
        success: false,
        message: 'Autorización médica no encontrada'
      });
    }

    // Verificar permisos de acceso
    const hasAccess = authorization.patient.toString() === req.user._id.toString() ||
                     authorization.professional.toString() === req.user._id.toString() ||
                     req.user.userType === 'admin';

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para ver esta autorización'
      });
    }

    res.json({
      success: true,
      data: authorization
    });
  })
);

// POST /api/v1/medical-authorizations - Solicitar autorización médica
router.post('/',
  authenticateToken,
  requireRole('professional'),
  validateAuthorizationRequest,
  catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const {
      professionalId,
      patientId,
      requestType,
      reason,
      expiryDate,
      permissions = [],
      metadata = {}
    } = req.body;

    // Verificar que el profesional sea el usuario autenticado
    if (professionalId !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Solo puedes solicitar autorizaciones para ti mismo'
      });
    }

    // Verificar que el paciente existe
    const patient = await User.findById(patientId);
    if (!patient || patient.userType !== 'client') {
      return res.status(404).json({
        success: false,
        message: 'Paciente no encontrado'
      });
    }

    // Verificar que no haya una autorización activa o pendiente
    const existingAuthorization = await MedicalAuthorization.findOne({
      professional: professionalId,
      patient: patientId,
      status: { $in: ['pending', 'approved'] },
      isDeleted: false
    });

    if (existingAuthorization) {
      return res.status(409).json({
        success: false,
        message: 'Ya existe una autorización activa o pendiente para este paciente',
        data: existingAuthorization
      });
    }

    // Determinar permisos por defecto según el tipo de solicitud
    let defaultPermissions = [];
    if (requestType === 'view') {
      defaultPermissions = ['view_consultations', 'view_documents', 'view_prescriptions', 'view_treatments'];
    } else if (requestType === 'edit') {
      defaultPermissions = ['view_consultations', 'view_documents', 'view_prescriptions', 'view_treatments', 'edit_consultations', 'edit_documents'];
    } else if (requestType === 'full_access') {
      defaultPermissions = ['view_consultations', 'view_documents', 'view_prescriptions', 'view_treatments', 'edit_consultations', 'edit_documents', 'edit_prescriptions', 'edit_treatments'];
    }

    // Usar permisos personalizados si se proporcionan, sino usar los por defecto
    const finalPermissions = permissions.length > 0 ? permissions : defaultPermissions;

    // Crear la solicitud de autorización
    const authorization = new MedicalAuthorization({
      professional: professionalId,
      patient: patientId,
      requestType,
      reason,
      permissions: finalPermissions,
      expiryDate: expiryDate ? new Date(expiryDate) : undefined,
      status: 'pending',
      metadata: {
        ...metadata,
        createdBy: req.user._id.toString(),
        userType: req.user.userType
      },
      createdBy: req.user._id
    });

    await authorization.save();

    // Log de la acción
    authorization.logAccess(req.user._id, 'authorization_requested', {
      patientId,
      requestType,
      permissionCount: finalPermissions.length
    });

    // Enviar notificación al paciente
    try {
      await emailService.sendMedicalAuthorizationRequest(
        patient.email,
        patient.fullName,
        {
          professionalName: req.user.fullName,
          requestType,
          reason,
          permissions: finalPermissions,
          requestDate: authorization.createdAt
        }
      );
    } catch (error) {
      logger.logEmail('medical_auth_request_failed', patient.email, false, {
        error: error.message,
        authorizationId: authorization._id
      });
    }

    // Enviar notificación por WebSocket
    webSocketManager.sendNotification(patientId, {
      type: 'medical_authorization_request',
      data: {
        id: authorization._id,
        professional: {
          id: req.user._id,
          fullName: req.user.fullName,
          userType: req.user.userType
        },
        requestType,
        reason,
        createdAt: authorization.createdAt
      }
    });

    // Populate para la respuesta
    await authorization.populate([
      { path: 'professional', select: 'fullName email phone userType avatar' },
      { path: 'patient', select: 'fullName email phone avatar' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Solicitud de autorización médica enviada exitosamente',
      data: authorization
    });
  })
);

// PUT /api/v1/medical-authorizations/:id - Actualizar autorización médica
router.put('/:id',
  authenticateToken,
  [
    param('id').isMongoId().withMessage('ID de autorización inválido')
  ],
  validateAuthorizationUpdate,
  catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { status, notes, expiryDate, permissions } = req.body;
    const authorization = await MedicalAuthorization.findById(req.params.id);

    if (!authorization) {
      return res.status(404).json({
        success: false,
        message: 'Autorización médica no encontrada'
      });
    }

    // Verificar permisos de modificación
    const canModify = authorization.patient.toString() === req.user._id.toString() ||
                     req.user.userType === 'admin';

    if (!canModify) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para modificar esta autorización'
      });
    }

    // Solo permitir cambios si la autorización está pendiente
    if (authorization.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Solo se pueden modificar autorizaciones pendientes'
      });
    }

    // Actualizar campos
    if (status) authorization.status = status;
    if (notes !== undefined) authorization.notes = notes;
    if (expiryDate) authorization.expiryDate = new Date(expiryDate);
    if (permissions) authorization.permissions = permissions;

    // Si se aprueba, establecer fecha de aprobación
    if (status === 'approved') {
      authorization.approvedAt = new Date();
      authorization.approvedBy = req.user._id;
    }

    // Si se rechaza, establecer fecha de rechazo
    if (status === 'rejected') {
      authorization.rejectedAt = new Date();
      authorization.rejectedBy = req.user._id;
    }

    authorization.lastModifiedBy = req.user._id;
    authorization.lastModifiedAt = new Date();
    await authorization.save();

    // Log de la acción
    authorization.logAccess(req.user._id, 'authorization_updated', {
      newStatus: status,
      changes: req.body
    });

    // Enviar notificación al profesional
    if (status === 'approved' || status === 'rejected') {
      try {
        const professional = await User.findById(authorization.professional);
        if (professional) {
          if (status === 'approved') {
            await emailService.sendMedicalAuthorizationGranted(
              professional.email,
              professional.fullName,
              {
                patientName: req.user.fullName,
                requestType: authorization.requestType,
                permissions: authorization.permissions,
                approvedDate: authorization.approvedAt
              }
            );
          } else {
            await emailService.sendMedicalAuthorizationRequest(
              professional.email,
              professional.fullName,
              {
                patientName: req.user.fullName,
                requestType: authorization.requestType,
                reason: authorization.reason,
                status: 'rejected',
                notes: notes || 'Sin comentarios'
              }
            );
          }
        }
      } catch (error) {
        logger.logEmail('medical_auth_update_failed', authorization.professional, false, {
          error: error.message,
          authorizationId: authorization._id,
          status
        });
      }

      // Enviar notificación por WebSocket
      webSocketManager.sendNotification(authorization.professional, {
        type: `medical_authorization_${status}`,
        data: {
          id: authorization._id,
          patient: {
            id: req.user._id,
            fullName: req.user.fullName
          },
          status,
          requestType: authorization.requestType,
          updatedAt: authorization.lastModifiedAt
        }
      });
    }

    // Populate para la respuesta
    await authorization.populate([
      { path: 'professional', select: 'fullName email phone userType avatar' },
      { path: 'patient', select: 'fullName email phone avatar' }
    ]);

    res.json({
      success: true,
      message: `Autorización médica ${status === 'approved' ? 'aprobada' : status === 'rejected' ? 'rechazada' : 'actualizada'} exitosamente`,
      data: authorization
    });
  })
);

// DELETE /api/v1/medical-authorizations/:id - Revocar autorización médica
router.delete('/:id',
  authenticateToken,
  [
    param('id').isMongoId().withMessage('ID de autorización inválido'),
    body('reason').optional().isString().isLength({ max: 500 }).withMessage('Razón no puede exceder 500 caracteres')
  ],
  catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { reason } = req.body;
    const authorization = await MedicalAuthorization.findById(req.params.id);

    if (!authorization) {
      return res.status(404).json({
        success: false,
        message: 'Autorización médica no encontrada'
      });
    }

    // Verificar permisos de revocación
    const canRevoke = authorization.patient.toString() === req.user._id.toString() ||
                      authorization.professional.toString() === req.user._id.toString() ||
                      req.user.userType === 'admin';

    if (!canRevoke) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para revocar esta autorización'
      });
    }

    // Solo permitir revocación de autorizaciones aprobadas
    if (authorization.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Solo se pueden revocar autorizaciones aprobadas'
      });
    }

    // Revocar la autorización
    authorization.status = 'revoked';
    authorization.revokedAt = new Date();
    authorization.revokedBy = req.user._id;
    authorization.revocationReason = reason || 'Revocada por el usuario';
    authorization.lastModifiedBy = req.user._id;
    authorization.lastModifiedAt = new Date();
    await authorization.save();

    // Log de la acción
    authorization.logAccess(req.user._id, 'authorization_revoked', {
      reason: reason || 'Sin razón especificada'
    });

    // Enviar notificación al otro usuario
    const notificationRecipient = req.user._id.toString() === authorization.patient.toString() 
      ? authorization.professional 
      : authorization.patient;

    try {
      const recipient = await User.findById(notificationRecipient);
      if (recipient) {
        await emailService.sendMedicalAuthorizationRequest(
          recipient.email,
          recipient.fullName,
          {
            professionalName: req.user.fullName,
            requestType: authorization.requestType,
            status: 'revoked',
            reason: reason || 'Sin razón especificada',
            revokedDate: authorization.revokedAt
          }
        );
      }
    } catch (error) {
      logger.logEmail('medical_auth_revocation_failed', notificationRecipient, false, {
        error: error.message,
        authorizationId: authorization._id
      });
    }

    // Enviar notificación por WebSocket
    webSocketManager.sendNotification(notificationRecipient, {
      type: 'medical_authorization_revoked',
      data: {
        id: authorization._id,
        revokedBy: {
          id: req.user._id,
          fullName: req.user.fullName,
          userType: req.user.userType
        },
        requestType: authorization.requestType,
        reason: reason || 'Sin razón especificada',
        revokedAt: authorization.revokedAt
      }
    });

    res.json({
      success: true,
      message: 'Autorización médica revocada exitosamente',
      data: authorization
    });
  })
);

// GET /api/v1/medical-authorizations/patient/:patientId - Obtener autorizaciones de un paciente
router.get('/patient/:patientId',
  authenticateToken,
  [
    param('patientId').isMongoId().withMessage('ID del paciente inválido'),
    query('status').optional().isString(),
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

    const { patientId } = req.params;
    const { status, page = 1, limit = 20 } = req.query;

    // Verificar permisos
    if (req.user.userType === 'client' && patientId !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para ver autorizaciones de otros pacientes'
      });
    }

    if (req.user.userType === 'professional') {
      // Verificar que el profesional tenga autorización para acceder al historial del paciente
      const hasAccess = await MedicalAuthorization.checkAccess(patientId, req.user._id);
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'No tienes autorización para acceder a las autorizaciones de este paciente'
        });
      }
    }

    // Construir filtros
    const filters = {
      patient: patientId,
      isDeleted: false
    };

    if (status) filters.status = status;

    // Calcular paginación
    const skip = (page - 1) * limit;

    const [authorizations, total] = await Promise.all([
      MedicalAuthorization.find(filters)
        .populate('professional', 'fullName email phone userType avatar')
        .populate('patient', 'fullName email phone avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      MedicalAuthorization.countDocuments(filters)
    ]);

    res.json({
      success: true,
      data: authorizations,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  })
);

// GET /api/v1/medical-authorizations/professional/:professionalId - Obtener autorizaciones de un profesional
router.get('/professional/:professionalId',
  authenticateToken,
  [
    param('professionalId').isMongoId().withMessage('ID del profesional inválido'),
    query('status').optional().isString(),
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

    const { professionalId } = req.params;
    const { status, page = 1, limit = 20 } = req.query;

    // Verificar permisos
    if (req.user.userType === 'professional' && professionalId !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para ver autorizaciones de otros profesionales'
      });
    }

    // Construir filtros
    const filters = {
      professional: professionalId,
      isDeleted: false
    };

    if (status) filters.status = status;

    // Calcular paginación
    const skip = (page - 1) * limit;

    const [authorizations, total] = await Promise.all([
      MedicalAuthorization.find(filters)
        .populate('professional', 'fullName email phone userType avatar')
        .populate('patient', 'fullName email phone avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      MedicalAuthorization.countDocuments(filters)
    ]);

    res.json({
      success: true,
      data: authorizations,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  })
);

// GET /api/v1/medical-authorizations/check-access - Verificar acceso a historial médico
router.get('/check-access',
  authenticateToken,
  requireRole('professional'),
  [
    query('patientId').isMongoId().withMessage('ID del paciente es requerido')
  ],
  catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { patientId } = req.query;

    // Verificar que el paciente existe
    const patient = await User.findById(patientId);
    if (!patient || patient.userType !== 'client') {
      return res.status(404).json({
        success: false,
        message: 'Paciente no encontrado'
      });
    }

    // Verificar acceso
    const hasAccess = await MedicalAuthorization.checkAccess(patientId, req.user._id);
    const accessDetails = await MedicalAuthorization.getAccessDetails(patientId, req.user._id);

    res.json({
      success: true,
      data: {
        hasAccess,
        accessDetails,
        patient: {
          id: patient._id,
          fullName: patient.fullName,
          email: patient.email
        }
      }
    });
  })
);

// GET /api/v1/medical-authorizations/stats - Obtener estadísticas de autorizaciones
router.get('/stats',
  authenticateToken,
  [
    query('dateFrom').optional().isISO8601(),
    query('dateTo').optional().isISO8601(),
    query('status').optional().isString()
  ],
  catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { dateFrom, dateTo, status } = req.query;

    // Construir filtros
    const filters = {
      isDeleted: false
    };

    if (status) filters.status = status;
    if (dateFrom || dateTo) {
      filters.createdAt = {};
      if (dateFrom) filters.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filters.createdAt.$lte = new Date(dateTo);
    }

    // Aplicar filtros según el rol del usuario
    if (req.user.userType === 'client') {
      filters.patient = req.user._id;
    } else if (req.user.userType === 'professional') {
      filters.professional = req.user._id;
    }

    const stats = await MedicalAuthorization.getAuthorizationStats(filters);

    res.json({
      success: true,
      data: stats
    });
  })
);

// POST /api/v1/medical-authorizations/:id/extend - Extender autorización médica
router.post('/:id/extend',
  authenticateToken,
  [
    param('id').isMongoId().withMessage('ID de autorización inválido'),
    body('newExpiryDate').isISO8601().withMessage('Nueva fecha de expiración inválida'),
    body('reason').optional().isString().isLength({ max: 500 }).withMessage('Razón no puede exceder 500 caracteres')
  ],
  catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { newExpiryDate, reason } = req.body;
    const authorization = await MedicalAuthorization.findById(req.params.id);

    if (!authorization) {
      return res.status(404).json({
        success: false,
        message: 'Autorización médica no encontrada'
      });
    }

    // Verificar permisos de extensión
    const canExtend = authorization.patient.toString() === req.user._id.toString() ||
                     req.user.userType === 'admin';

    if (!canExtend) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para extender esta autorización'
      });
    }

    // Solo permitir extensión de autorizaciones aprobadas
    if (authorization.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Solo se pueden extender autorizaciones aprobadas'
      });
    }

    // Verificar que la nueva fecha sea posterior a la actual
    const newExpiry = new Date(newExpiryDate);
    if (newExpiry <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'La nueva fecha de expiración debe ser posterior a la fecha actual'
      });
    }

    // Extender la autorización
    const oldExpiryDate = authorization.expiryDate;
    authorization.expiryDate = newExpiry;
    authorization.lastModifiedBy = req.user._id;
    authorization.lastModifiedAt = new Date();
    await authorization.save();

    // Log de la acción
    authorization.logAccess(req.user._id, 'authorization_extended', {
      oldExpiryDate,
      newExpiryDate: newExpiry,
      reason: reason || 'Sin razón especificada'
    });

    // Enviar notificación al profesional
    try {
      const professional = await User.findById(authorization.professional);
      if (professional) {
        await emailService.sendMedicalAuthorizationRequest(
          professional.email,
          professional.fullName,
          {
            patientName: req.user.fullName,
            requestType: authorization.requestType,
            status: 'extended',
            newExpiryDate: newExpiry,
            reason: reason || 'Sin razón especificada'
          }
        );
      }
    } catch (error) {
      logger.logEmail('medical_auth_extension_failed', authorization.professional, false, {
        error: error.message,
        authorizationId: authorization._id
      });
    }

    // Enviar notificación por WebSocket
    webSocketManager.sendNotification(authorization.professional, {
      type: 'medical_authorization_extended',
      data: {
        id: authorization._id,
        patient: {
          id: req.user._id,
          fullName: req.user.fullName
        },
        newExpiryDate: newExpiry,
        reason: reason || 'Sin razón especificada',
        extendedAt: authorization.lastModifiedAt
      }
    });

    res.json({
      success: true,
      message: 'Autorización médica extendida exitosamente',
      data: authorization
    });
  })
);

module.exports = router;
