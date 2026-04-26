const express = require('express');
const { body, query, param, validationResult } = require('express-validator');
const MedicalHistory = require('../models/MedicalHistory');
const MedicalConsultation = require('../models/MedicalConsultation');
const MedicalDocument = require('../models/MedicalDocument');
const MedicalPrescription = require('../models/MedicalPrescription');
const MedicalTreatment = require('../models/MedicalTreatment');
const User = require('../models/User');
const { authenticateToken, requireRole, requireOwnership } = require('../middleware/auth');
const { catchAsync } = require('../middleware/errorHandler');
const logger = require('../config/logger');

const router = express.Router();

// Middleware de validación
const validateConsultation = [
  body('patientId').isMongoId().withMessage('ID del paciente inválido'),
  body('professionalId').isMongoId().withMessage('ID del profesional inválido'),
  body('consultationType').isIn(['initial', 'follow_up', 'emergency', 'routine', 'specialist']).withMessage('Tipo de consulta inválido'),
  body('symptoms').isString().isLength({ min: 1, max: 1000 }).withMessage('Síntomas debe tener entre 1 y 1000 caracteres'),
  body('diagnosis').optional().isString().isLength({ max: 1000 }),
  body('treatment').optional().isString().isLength({ max: 1000 }),
  body('notes').optional().isString().isLength({ max: 2000 }),
  body('consultationDate').isISO8601().withMessage('Fecha de consulta inválida'),
  body('duration').optional().isInt({ min: 5, max: 480 }).withMessage('Duración debe estar entre 5 y 480 minutos')
];

const validateDocument = [
  body('patientId').isMongoId().withMessage('ID del paciente inválido'),
  body('documentType').isIn(['lab_result', 'imaging', 'prescription', 'medical_report', 'vaccination_record', 'other']).withMessage('Tipo de documento inválido'),
  body('title').isString().isLength({ min: 1, max: 200 }).withMessage('Título debe tener entre 1 y 200 caracteres'),
  body('description').optional().isString().isLength({ max: 1000 }),
  body('fileUrl').isString().isLength({ min: 1 }).withMessage('URL del archivo es requerida'),
  body('fileSize').optional().isInt({ min: 1 }).withMessage('Tamaño del archivo debe ser mayor a 0'),
  body('mimeType').optional().isString().withMessage('Tipo MIME inválido')
];

const validatePrescription = [
  body('patientId').isMongoId().withMessage('ID del paciente inválido'),
  body('professionalId').isMongoId().withMessage('ID del profesional inválido'),
  body('medications').isArray({ min: 1 }).withMessage('Debe haber al menos un medicamento'),
  body('medications.*.name').isString().isLength({ min: 1, max: 200 }).withMessage('Nombre del medicamento es requerido'),
  body('medications.*.dosage').isString().isLength({ min: 1, max: 100 }).withMessage('Dosis es requerida'),
  body('medications.*.frequency').isString().isLength({ min: 1, max: 100 }).withMessage('Frecuencia es requerida'),
  body('medications.*.duration').isString().isLength({ min: 1, max: 100 }).withMessage('Duración es requerida'),
  body('prescriptionDate').isISO8601().withMessage('Fecha de prescripción inválida'),
  body('expiryDate').optional().isISO8601().withMessage('Fecha de expiración inválida'),
  body('notes').optional().isString().isLength({ max: 1000 })
];

const validateTreatment = [
  body('patientId').isMongoId().withMessage('ID del paciente inválido'),
  body('professionalId').isMongoId().withMessage('ID del profesional inválido'),
  body('treatmentType').isIn(['medication', 'therapy', 'surgery', 'lifestyle', 'other']).withMessage('Tipo de tratamiento inválido'),
  body('title').isString().isLength({ min: 1, max: 200 }).withMessage('Título debe tener entre 1 y 200 caracteres'),
  body('description').isString().isLength({ min: 1, max: 1000 }).withMessage('Descripción debe tener entre 1 y 1000 caracteres'),
  body('startDate').isISO8601().withMessage('Fecha de inicio inválida'),
  body('endDate').optional().isISO8601().withMessage('Fecha de fin inválida'),
  body('status').isIn(['active', 'completed', 'discontinued', 'pending']).withMessage('Estado inválido'),
  body('notes').optional().isString().isLength({ max: 1000 })
];

// GET /api/v1/medical-history - Obtener historial médico del usuario
router.get('/',
  authenticateToken,
  [
    query('patientId').optional().isMongoId(),
    query('professionalId').optional().isMongoId(),
    query('type').optional().isIn(['consultations', 'documents', 'prescriptions', 'treatments']),
    query('dateFrom').optional().isISO8601(),
    query('dateTo').optional().isISO8601(),
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

    const {
      patientId,
      professionalId,
      type,
      dateFrom,
      dateTo,
      status,
      page = 1,
      limit = 20
    } = req.query;

    // Determinar el paciente
    let targetPatientId = patientId;
    if (!targetPatientId) {
      if (req.user.userType === 'client') {
        targetPatientId = req.user._id;
      } else {
        return res.status(400).json({
          success: false,
          message: 'Se debe especificar un paciente'
        });
      }
    }

    // Verificar permisos de acceso
    if (req.user.userType === 'client' && targetPatientId !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para acceder al historial médico de otros usuarios'
      });
    }

    if (req.user.userType === 'professional') {
      // Verificar que el profesional tenga autorización para acceder al historial
      const hasAccess = await MedicalHistory.checkAccess(targetPatientId, req.user._id);
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'No tienes autorización para acceder a este historial médico'
        });
      }
    }

    // Construir filtros de fecha
    const dateFilters = {};
    if (dateFrom || dateTo) {
      dateFilters.createdAt = {};
      if (dateFrom) dateFilters.createdAt.$gte = new Date(dateFrom);
      if (dateTo) dateFilters.createdAt.$lte = new Date(dateTo);
    }

    let data = {};
    let total = 0;

    // Obtener datos según el tipo especificado
    if (!type || type === 'consultations') {
      const consultationFilters = {
        patient: targetPatientId,
        isDeleted: false,
        ...dateFilters
      };
      if (professionalId) consultationFilters.professional = professionalId;
      if (status) consultationFilters.status = status;

      const [consultations, consultationCount] = await Promise.all([
        MedicalConsultation.find(consultationFilters)
          .populate('professional', 'fullName userType avatar')
          .populate('patient', 'fullName email phone')
          .sort({ consultationDate: -1 })
          .skip((page - 1) * limit)
          .limit(parseInt(limit)),
        MedicalConsultation.countDocuments(consultationFilters)
      ]);

      data.consultations = consultations;
      total = Math.max(total, consultationCount);
    }

    if (!type || type === 'documents') {
      const documentFilters = {
        patient: targetPatientId,
        isDeleted: false,
        ...dateFilters
      };
      if (professionalId) documentFilters.uploadedBy = professionalId;
      if (status) documentFilters.status = status;

      const [documents, documentCount] = await Promise.all([
        MedicalDocument.find(documentFilters)
          .populate('uploadedBy', 'fullName userType avatar')
          .populate('patient', 'fullName email phone')
          .sort({ uploadDate: -1 })
          .skip((page - 1) * limit)
          .limit(parseInt(limit)),
        MedicalDocument.countDocuments(documentFilters)
      ]);

      data.documents = documents;
      total = Math.max(total, documentCount);
    }

    if (!type || type === 'prescriptions') {
      const prescriptionFilters = {
        patient: targetPatientId,
        isDeleted: false,
        ...dateFilters
      };
      if (professionalId) prescriptionFilters.professional = professionalId;
      if (status) prescriptionFilters.status = status;

      const [prescriptions, prescriptionCount] = await Promise.all([
        MedicalPrescription.find(prescriptionFilters)
          .populate('professional', 'fullName userType avatar')
          .populate('patient', 'fullName email phone')
          .sort({ prescriptionDate: -1 })
          .skip((page - 1) * limit)
          .limit(parseInt(limit)),
        MedicalPrescription.countDocuments(prescriptionFilters)
      ]);

      data.prescriptions = prescriptions;
      total = Math.max(total, prescriptionCount);
    }

    if (!type || type === 'treatments') {
      const treatmentFilters = {
        patient: targetPatientId,
        isDeleted: false,
        ...dateFilters
      };
      if (professionalId) treatmentFilters.professional = professionalId;
      if (status) treatmentFilters.status = status;

      const [treatments, treatmentCount] = await Promise.all([
        MedicalTreatment.find(treatmentFilters)
          .populate('professional', 'fullName userType avatar')
          .populate('patient', 'fullName email phone')
          .sort({ startDate: -1 })
          .skip((page - 1) * limit)
          .limit(parseInt(limit)),
        MedicalTreatment.countDocuments(treatmentFilters)
      ]);

      data.treatments = treatments;
      total = Math.max(total, treatmentCount);
    }

    // Log de acceso
    if (req.user.userType === 'professional') {
      await MedicalHistory.logAccess(targetPatientId, req.user._id, 'history_accessed', {
        type: type || 'all',
        filters: { professionalId, dateFrom, dateTo, status }
      });
    }

    res.json({
      success: true,
      data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  })
);

// GET /api/v1/medical-history/consultations - Obtener consultas médicas
router.get('/consultations',
  authenticateToken,
  [
    query('patientId').optional().isMongoId(),
    query('professionalId').optional().isMongoId(),
    query('consultationType').optional().isString(),
    query('status').optional().isString(),
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
      patientId,
      professionalId,
      consultationType,
      status,
      dateFrom,
      dateTo,
      page = 1,
      limit = 20
    } = req.query;

    // Determinar el paciente
    let targetPatientId = patientId;
    if (!targetPatientId) {
      if (req.user.userType === 'client') {
        targetPatientId = req.user._id;
      } else {
        return res.status(400).json({
          success: false,
          message: 'Se debe especificar un paciente'
        });
      }
    }

    // Verificar permisos
    if (req.user.userType === 'client' && targetPatientId !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para acceder a consultas de otros usuarios'
      });
    }

    if (req.user.userType === 'professional') {
      const hasAccess = await MedicalHistory.checkAccess(targetPatientId, req.user._id);
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'No tienes autorización para acceder a estas consultas'
        });
      }
    }

    // Construir filtros
    const filters = {
      patient: targetPatientId,
      isDeleted: false
    };

    if (professionalId) filters.professional = professionalId;
    if (consultationType) filters.consultationType = consultationType;
    if (status) filters.status = status;
    if (dateFrom || dateTo) {
      filters.consultationDate = {};
      if (dateFrom) filters.consultationDate.$gte = new Date(dateFrom);
      if (dateTo) filters.consultationDate.$lte = new Date(dateTo);
    }

    // Calcular paginación
    const skip = (page - 1) * limit;

    const [consultations, total] = await Promise.all([
      MedicalConsultation.find(filters)
        .populate('professional', 'fullName userType avatar')
        .populate('patient', 'fullName email phone')
        .sort({ consultationDate: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      MedicalConsultation.countDocuments(filters)
    ]);

    res.json({
      success: true,
      data: consultations,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  })
);

// POST /api/v1/medical-history/consultations - Crear nueva consulta médica
router.post('/consultations',
  authenticateToken,
  requireRole('professional'),
  validateConsultation,
  catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const {
      patientId,
      professionalId,
      consultationType,
      symptoms,
      diagnosis,
      treatment,
      notes,
      consultationDate,
      duration,
      metadata = {}
    } = req.body;

    // Verificar que el profesional sea el usuario autenticado
    if (professionalId !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Solo puedes crear consultas para ti mismo'
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

    // Verificar autorización para acceder al historial del paciente
    const hasAccess = await MedicalHistory.checkAccess(patientId, req.user._id);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'No tienes autorización para acceder al historial médico de este paciente'
      });
    }

    // Crear la consulta
    const consultation = new MedicalConsultation({
      patient: patientId,
      professional: professionalId,
      consultationType,
      symptoms,
      diagnosis: diagnosis || '',
      treatment: treatment || '',
      notes: notes || '',
      consultationDate: new Date(consultationDate),
      duration: duration || 30,
      metadata: {
        ...metadata,
        createdBy: req.user._id.toString(),
        userType: req.user.userType
      },
      createdBy: req.user._id
    });

    await consultation.save();

    // Log de la acción
    consultation.logAccess(req.user._id, 'consultation_created', {
      patientId,
      consultationType,
      hasDiagnosis: !!diagnosis,
      hasTreatment: !!treatment
    });

    // Populate para la respuesta
    await consultation.populate([
      { path: 'professional', select: 'fullName userType avatar' },
      { path: 'patient', select: 'fullName email phone' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Consulta médica creada exitosamente',
      data: consultation
    });
  })
);

// PUT /api/v1/medical-history/consultations/:id - Actualizar consulta médica
router.put('/consultations/:id',
  authenticateToken,
  requireRole('professional'),
  [
    param('id').isMongoId().withMessage('ID de consulta inválido')
  ],
  catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const consultation = await MedicalConsultation.findById(req.params.id);
    if (!consultation) {
      return res.status(404).json({
        success: false,
        message: 'Consulta médica no encontrada'
      });
    }

    // Verificar que el profesional sea el autor de la consulta
    if (consultation.professional.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'No puedes modificar consultas de otros profesionales'
      });
    }

    // Actualizar campos permitidos
    const updateFields = ['symptoms', 'diagnosis', 'treatment', 'notes', 'duration', 'metadata'];
    updateFields.forEach(field => {
      if (req.body[field] !== undefined) {
        consultation[field] = req.body[field];
      }
    });

    consultation.isEdited = true;
    consultation.editedAt = new Date();
    consultation.lastModifiedBy = req.user._id;
    consultation.lastModifiedAt = new Date();
    await consultation.save();

    // Log de la acción
    consultation.logAccess(req.user._id, 'consultation_updated', {
      changes: req.body
    });

    // Populate para la respuesta
    await consultation.populate([
      { path: 'professional', select: 'fullName userType avatar' },
      { path: 'patient', select: 'fullName email phone' }
    ]);

    res.json({
      success: true,
      message: 'Consulta médica actualizada exitosamente',
      data: consultation
    });
  })
);

// DELETE /api/v1/medical-history/consultations/:id - Eliminar consulta médica
router.delete('/consultations/:id',
  authenticateToken,
  requireRole('professional'),
  [
    param('id').isMongoId().withMessage('ID de consulta inválido')
  ],
  catchAsync(async (req, res) => {
    const consultation = await MedicalConsultation.findById(req.params.id);
    if (!consultation) {
      return res.status(404).json({
        success: false,
        message: 'Consulta médica no encontrada'
      });
    }

    // Verificar que el profesional sea el autor de la consulta
    if (consultation.professional.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'No puedes eliminar consultas de otros profesionales'
      });
    }

    // Soft delete
    await consultation.softDelete(req.user._id);

    // Log de la acción
    consultation.logAccess(req.user._id, 'consultation_deleted', {
      reason: 'professional_deletion'
    });

    res.json({
      success: true,
      message: 'Consulta médica eliminada exitosamente'
    });
  })
);

// GET /api/v1/medical-history/documents - Obtener documentos médicos
router.get('/documents',
  authenticateToken,
  [
    query('patientId').optional().isMongoId(),
    query('documentType').optional().isString(),
    query('status').optional().isString(),
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
      patientId,
      documentType,
      status,
      dateFrom,
      dateTo,
      page = 1,
      limit = 20
    } = req.query;

    // Determinar el paciente
    let targetPatientId = patientId;
    if (!targetPatientId) {
      if (req.user.userType === 'client') {
        targetPatientId = req.user._id;
      } else {
        return res.status(400).json({
          success: false,
          message: 'Se debe especificar un paciente'
        });
      }
    }

    // Verificar permisos
    if (req.user.userType === 'client' && targetPatientId !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para acceder a documentos de otros usuarios'
      });
    }

    if (req.user.userType === 'professional') {
      const hasAccess = await MedicalHistory.checkAccess(targetPatientId, req.user._id);
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'No tienes autorización para acceder a estos documentos'
        });
      }
    }

    // Construir filtros
    const filters = {
      patient: targetPatientId,
      isDeleted: false
    };

    if (documentType) filters.documentType = documentType;
    if (status) filters.status = status;
    if (dateFrom || dateTo) {
      filters.uploadDate = {};
      if (dateFrom) filters.uploadDate.$gte = new Date(dateFrom);
      if (dateTo) filters.uploadDate.$lte = new Date(dateTo);
    }

    // Calcular paginación
    const skip = (page - 1) * limit;

    const [documents, total] = await Promise.all([
      MedicalDocument.find(filters)
        .populate('uploadedBy', 'fullName userType avatar')
        .populate('patient', 'fullName email phone')
        .sort({ uploadDate: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      MedicalDocument.countDocuments(filters)
    ]);

    res.json({
      success: true,
      data: documents,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  })
);

// POST /api/v1/medical-history/documents - Subir documento médico
router.post('/documents',
  authenticateToken,
  requireRole('professional'),
  validateDocument,
  catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const {
      patientId,
      documentType,
      title,
      description,
      fileUrl,
      fileSize,
      mimeType,
      metadata = {}
    } = req.body;

    // Verificar que el paciente existe
    const patient = await User.findById(patientId);
    if (!patient || patient.userType !== 'client') {
      return res.status(404).json({
        success: false,
        message: 'Paciente no encontrado'
      });
    }

    // Verificar autorización para acceder al historial del paciente
    const hasAccess = await MedicalHistory.checkAccess(patientId, req.user._id);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'No tienes autorización para acceder al historial médico de este paciente'
      });
    }

    // Crear el documento
    const document = new MedicalDocument({
      patient: patientId,
      documentType,
      title,
      description: description || '',
      fileUrl,
      fileSize: fileSize || 0,
      mimeType: mimeType || 'application/octet-stream',
      uploadedBy: req.user._id,
      metadata: {
        ...metadata,
        createdBy: req.user._id.toString(),
        userType: req.user.userType
      },
      createdBy: req.user._id
    });

    await document.save();

    // Log de la acción
    document.logAccess(req.user._id, 'document_uploaded', {
      patientId,
      documentType,
      fileSize: document.fileSize
    });

    // Populate para la respuesta
    await document.populate([
      { path: 'uploadedBy', select: 'fullName userType avatar' },
      { path: 'patient', select: 'fullName email phone' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Documento médico subido exitosamente',
      data: document
    });
  })
);

// GET /api/v1/medical-history/prescriptions - Obtener prescripciones médicas
router.get('/prescriptions',
  authenticateToken,
  [
    query('patientId').optional().isMongoId(),
    query('professionalId').optional().isMongoId(),
    query('status').optional().isString(),
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
      patientId,
      professionalId,
      status,
      dateFrom,
      dateTo,
      page = 1,
      limit = 20
    } = req.query;

    // Determinar el paciente
    let targetPatientId = patientId;
    if (!targetPatientId) {
      if (req.user.userType === 'client') {
        targetPatientId = req.user._id;
      } else {
        return res.status(400).json({
          success: false,
          message: 'Se debe especificar un paciente'
        });
      }
    }

    // Verificar permisos
    if (req.user.userType === 'client' && targetPatientId !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para acceder a prescripciones de otros usuarios'
      });
    }

    if (req.user.userType === 'professional') {
      const hasAccess = await MedicalHistory.checkAccess(targetPatientId, req.user._id);
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'No tienes autorización para acceder a estas prescripciones'
        });
      }
    }

    // Construir filtros
    const filters = {
      patient: targetPatientId,
      isDeleted: false
    };

    if (professionalId) filters.professional = professionalId;
    if (status) filters.status = status;
    if (dateFrom || dateTo) {
      filters.prescriptionDate = {};
      if (dateFrom) filters.prescriptionDate.$gte = new Date(dateFrom);
      if (dateTo) filters.prescriptionDate.$lte = new Date(dateTo);
    }

    // Calcular paginación
    const skip = (page - 1) * limit;

    const [prescriptions, total] = await Promise.all([
      MedicalPrescription.find(filters)
        .populate('professional', 'fullName userType avatar')
        .populate('patient', 'fullName email phone')
        .sort({ prescriptionDate: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      MedicalPrescription.countDocuments(filters)
    ]);

    res.json({
      success: true,
      data: prescriptions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  })
);

// POST /api/v1/medical-history/prescriptions - Crear nueva prescripción
router.post('/prescriptions',
  authenticateToken,
  requireRole('professional'),
  validatePrescription,
  catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const {
      patientId,
      professionalId,
      medications,
      prescriptionDate,
      expiryDate,
      notes,
      metadata = {}
    } = req.body;

    // Verificar que el profesional sea el usuario autenticado
    if (professionalId !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Solo puedes crear prescripciones para ti mismo'
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

    // Verificar autorización para acceder al historial del paciente
    const hasAccess = await MedicalHistory.checkAccess(patientId, req.user._id);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'No tienes autorización para acceder al historial médico de este paciente'
      });
    }

    // Crear la prescripción
    const prescription = new MedicalPrescription({
      patient: patientId,
      professional: professionalId,
      medications: medications.map(med => ({
        name: med.name,
        dosage: med.dosage,
        frequency: med.frequency,
        duration: med.duration
      })),
      prescriptionDate: new Date(prescriptionDate),
      expiryDate: expiryDate ? new Date(expiryDate) : undefined,
      notes: notes || '',
      metadata: {
        ...metadata,
        createdBy: req.user._id.toString(),
        userType: req.user.userType
      },
      createdBy: req.user._id
    });

    await prescription.save();

    // Log de la acción
    prescription.logAccess(req.user._id, 'prescription_created', {
      patientId,
      medicationCount: medications.length,
      hasExpiryDate: !!expiryDate
    });

    // Populate para la respuesta
    await prescription.populate([
      { path: 'professional', select: 'fullName userType avatar' },
      { path: 'patient', select: 'fullName email phone' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Prescripción médica creada exitosamente',
      data: prescription
    });
  })
);

// GET /api/v1/medical-history/treatments - Obtener tratamientos médicos
router.get('/treatments',
  authenticateToken,
  [
    query('patientId').optional().isMongoId(),
    query('professionalId').optional().isMongoId(),
    query('treatmentType').optional().isString(),
    query('status').optional().isString(),
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
      patientId,
      professionalId,
      treatmentType,
      status,
      dateFrom,
      dateTo,
      page = 1,
      limit = 20
    } = req.query;

    // Determinar el paciente
    let targetPatientId = patientId;
    if (!targetPatientId) {
      if (req.user.userType === 'client') {
        targetPatientId = req.user._id;
      } else {
        return res.status(400).json({
          success: false,
          message: 'Se debe especificar un paciente'
        });
      }
    }

    // Verificar permisos
    if (req.user.userType === 'client' && targetPatientId !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para acceder a tratamientos de otros usuarios'
      });
    }

    if (req.user.userType === 'professional') {
      const hasAccess = await MedicalHistory.checkAccess(targetPatientId, req.user._id);
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'No tienes autorización para acceder a estos tratamientos'
        });
      }
    }

    // Construir filtros
    const filters = {
      patient: targetPatientId,
      isDeleted: false
    };

    if (professionalId) filters.professional = professionalId;
    if (treatmentType) filters.treatmentType = treatmentType;
    if (status) filters.status = status;
    if (dateFrom || dateTo) {
      filters.startDate = {};
      if (dateFrom) filters.startDate.$gte = new Date(dateFrom);
      if (dateTo) filters.startDate.$lte = new Date(dateTo);
    }

    // Calcular paginación
    const skip = (page - 1) * limit;

    const [treatments, total] = await Promise.all([
      MedicalTreatment.find(filters)
        .populate('professional', 'fullName userType avatar')
        .populate('patient', 'fullName email phone')
        .sort({ startDate: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      MedicalTreatment.countDocuments(filters)
    ]);

    res.json({
      success: true,
      data: treatments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  })
);

// POST /api/v1/medical-history/treatments - Crear nuevo tratamiento
router.post('/treatments',
  authenticateToken,
  requireRole('professional'),
  validateTreatment,
  catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const {
      patientId,
      professionalId,
      treatmentType,
      title,
      description,
      startDate,
      endDate,
      status,
      notes,
      metadata = {}
    } = req.body;

    // Verificar que el profesional sea el usuario autenticado
    if (professionalId !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Solo puedes crear tratamientos para ti mismo'
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

    // Verificar autorización para acceder al historial del paciente
    const hasAccess = await MedicalHistory.checkAccess(patientId, req.user._id);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'No tienes autorización para acceder al historial médico de este paciente'
      });
    }

    // Crear el tratamiento
    const treatment = new MedicalTreatment({
      patient: patientId,
      professional: professionalId,
      treatmentType,
      title,
      description,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : undefined,
      status,
      notes: notes || '',
      metadata: {
        ...metadata,
        createdBy: req.user._id.toString(),
        userType: req.user.userType
      },
      createdBy: req.user._id
    });

    await treatment.save();

    // Log de la acción
    treatment.logAccess(req.user._id, 'treatment_created', {
      patientId,
      treatmentType,
      status,
      hasEndDate: !!endDate
    });

    // Populate para la respuesta
    await treatment.populate([
      { path: 'professional', select: 'fullName userType avatar' },
      { path: 'patient', select: 'fullName email phone' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Tratamiento médico creado exitosamente',
      data: treatment
    });
  })
);

// GET /api/v1/medical-history/stats - Obtener estadísticas del historial médico
router.get('/stats',
  authenticateToken,
  [
    query('patientId').optional().isMongoId(),
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

    const { patientId, dateFrom, dateTo } = req.query;

    // Determinar el paciente
    let targetPatientId = patientId;
    if (!targetPatientId) {
      if (req.user.userType === 'client') {
        targetPatientId = req.user._id;
      } else {
        return res.status(400).json({
          success: false,
          message: 'Se debe especificar un paciente'
        });
      }
    }

    // Verificar permisos
    if (req.user.userType === 'client' && targetPatientId !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para acceder a estadísticas de otros usuarios'
      });
    }

    if (req.user.userType === 'professional') {
      const hasAccess = await MedicalHistory.checkAccess(targetPatientId, req.user._id);
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'No tienes autorización para acceder a estas estadísticas'
        });
      }
    }

    // Construir filtros de fecha
    const dateFilters = {};
    if (dateFrom || dateTo) {
      dateFilters.createdAt = {};
      if (dateFrom) dateFilters.createdAt.$gte = new Date(dateFrom);
      if (dateTo) dateFilters.createdAt.$lte = new Date(dateTo);
    }

    // Obtener estadísticas
    const stats = await MedicalHistory.getMedicalHistoryStats(targetPatientId, dateFilters);

    res.json({
      success: true,
      data: stats
    });
  })
);

module.exports = router;
