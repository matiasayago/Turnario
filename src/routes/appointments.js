const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const Service = require('../models/Service');
const Clinic = require('../models/Clinic');
const { authenticateToken, requireRole, requireOwnership } = require('../middleware/auth');

const router = express.Router();

// Middleware para validar ObjectId
const validateObjectId = (value) => {
  return /^[0-9a-fA-F]{24}$/.test(value);
};

// POST /api/appointments - Crear nueva cita
router.post('/', [
  authenticateToken,
  requireRole(['client', 'professional']),
  body('client').custom(validateObjectId),
  body('professional').custom(validateObjectId),
  body('service').custom(validateObjectId),
  body('clinic').custom(validateObjectId),
  body('date').isISO8601(),
  body('startTime').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('endTime').matches(/^([01]?[0-3]):[0-5][0-9]$/),
  body('duration').isInt({ min: 15, max: 480 }),
  body('notes.client').optional().isString(),
  body('notes.professional').optional().isString(),
  body('symptoms').optional().isArray(),
  body('source').optional().isIn(['web', 'mobile', 'phone', 'walk_in'])
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
      client,
      professional,
      service,
      clinic,
      date,
      startTime,
      endTime,
      duration,
      notes,
      symptoms,
      source = 'mobile'
    } = req.body;

    // Verificar que la fecha sea futura
    const appointmentDate = new Date(date);
    if (appointmentDate <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'La fecha de la cita debe ser futura'
      });
    }

    // Verificar disponibilidad
    const isAvailable = await Appointment.checkAvailability(
      professional,
      clinic,
      appointmentDate,
      startTime,
      endTime
    );

    if (!isAvailable) {
      return res.status(409).json({
        success: false,
        message: 'El horario seleccionado no está disponible'
      });
    }

    // Verificar que el cliente y profesional existan y estén activos
    const [clientUser, professionalUser] = await Promise.all([
      User.findById(client).where({ userType: 'client', isActive: true }),
      User.findById(professional).where({ userType: 'professional', isActive: true })
    ]);

    if (!clientUser) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado o inactivo'
      });
    }

    if (!professionalUser) {
      return res.status(404).json({
        success: false,
        message: 'Profesional no encontrado o inactivo'
      });
    }

    // Verificar que el servicio y consultorio existan
    const [serviceDoc, clinicDoc] = await Promise.all([
      Service.findById(service).where({ isActive: true }),
      Clinic.findById(clinic).where({ isActive: true })
    ]);

    if (!serviceDoc) {
      return res.status(404).json({
        success: false,
        message: 'Servicio no encontrado o inactivo'
      });
    }

    if (!clinicDoc) {
      return res.status(404).json({
        success: false,
        message: 'Consultorio no encontrado o inactivo'
      });
    }

    // Crear la cita
    const appointment = new Appointment({
      client,
      professional,
      service,
      clinic,
      date: appointmentDate,
      startTime,
      endTime,
      duration,
      notes,
      symptoms,
      source,
      billing: {
        amount: serviceDoc.price.amount,
        currency: serviceDoc.price.currency
      }
    });

    await appointment.save();

    // Poblar referencias para la respuesta
    await appointment.populate([
      { path: 'client', select: 'fullName email phone' },
      { path: 'professional', select: 'fullName email phone' },
      { path: 'service', select: 'name duration price' },
      { path: 'clinic', select: 'name address' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Cita creada correctamente',
      data: appointment
    });

  } catch (error) {
    console.error('Error al crear cita:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET /api/appointments - Obtener lista de citas (con filtros)
router.get('/', [
  authenticateToken,
  query('client').optional().custom(validateObjectId),
  query('professional').optional().custom(validateObjectId),
  query('clinic').optional().custom(validateObjectId),
  query('status').optional().isIn(['pending', 'confirmed', 'completed', 'cancelled', 'no_show']),
  query('date').optional().isISO8601(),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
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
      client,
      professional,
      clinic,
      status,
      date,
      startDate,
      endDate,
      page = 1,
      limit = 20
    } = req.query;

    // Construir filtros
    const filters = {};

    // Solo mostrar citas del usuario autenticado (a menos que sea admin)
    if (req.user.userType === 'client') {
      filters.client = req.user._id;
    } else if (req.user.userType === 'professional') {
      filters.professional = req.user._id;
    } else if (req.user.userType !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para ver estas citas'
      });
    }

    if (client) filters.client = client;
    if (professional) filters.professional = professional;
    if (clinic) filters.clinic = clinic;
    if (status) filters.status = status;

    // Filtros de fecha
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      filters.date = { $gte: startOfDay, $lte: endOfDay };
    } else if (startDate && endDate) {
      filters.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const skip = (page - 1) * limit;
    
    const appointments = await Appointment.find(filters)
      .populate([
        { path: 'client', select: 'fullName email phone' },
        { path: 'professional', select: 'fullName email phone' },
        { path: 'service', select: 'name duration price' },
        { path: 'clinic', select: 'name address' }
      ])
      .sort({ date: 1, startTime: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Appointment.countDocuments(filters);

    res.json({
      success: true,
      data: appointments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error al obtener citas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET /api/appointments/:id - Obtener cita específica
router.get('/:id', [
  authenticateToken,
  body('id').custom(validateObjectId)
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'ID de cita inválido',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    
    const appointment = await Appointment.findById(id)
      .populate([
        { path: 'client', select: 'fullName email phone dateOfBirth medicalHistory' },
        { path: 'professional', select: 'fullName email phone professionalInfo' },
        { path: 'service', select: 'name description duration price requirements' },
        { path: 'clinic', select: 'name address contact' }
      ]);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Cita no encontrada'
      });
    }

    // Verificar permisos
    if (req.user.userType !== 'admin' && 
        req.user._id.toString() !== appointment.client.toString() && 
        req.user._id.toString() !== appointment.professional.toString()) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para ver esta cita'
      });
    }

    res.json({
      success: true,
      data: appointment
    });

  } catch (error) {
    console.error('Error al obtener cita:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// PUT /api/appointments/:id - Actualizar cita
router.put('/:id', [
  authenticateToken,
  requireOwnership(Appointment, 'id'),
  body('notes.client').optional().isString(),
  body('notes.professional').optional().isString(),
  body('notes.internal').optional().isString(),
  body('symptoms').optional().isArray(),
  body('diagnosis').optional().isString(),
  body('treatment').optional().isString(),
  body('prescription').optional().isArray(),
  body('followUp.required').optional().isBoolean(),
  body('followUp.date').optional().isISO8601(),
  body('followUp.notes').optional().isString()
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
    const updateData = req.body;

    // Campos que no se pueden modificar
    delete updateData.client;
    delete updateData.professional;
    delete updateData.service;
    delete updateData.clinic;
    delete updateData.date;
    delete updateData.startTime;
    delete updateData.endTime;
    delete updateData.duration;
    delete updateData.status;

    const appointment = await Appointment.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate([
      { path: 'client', select: 'fullName email phone' },
      { path: 'professional', select: 'fullName email phone' },
      { path: 'service', select: 'name duration price' },
      { path: 'clinic', select: 'name address' }
    ]);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Cita no encontrada'
      });
    }

    res.json({
      success: true,
      message: 'Cita actualizada correctamente',
      data: appointment
    });

  } catch (error) {
    console.error('Error al actualizar cita:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// POST /api/appointments/:id/confirm - Confirmar cita
router.post('/:id/confirm', [
  authenticateToken,
  requireOwnership(Appointment, 'id'),
  requireRole('professional')
], async (req, res) => {
  try {
    const { id } = req.params;
    
    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Cita no encontrada'
      });
    }

    if (appointment.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Solo se pueden confirmar citas pendientes'
      });
    }

    appointment.confirm();
    await appointment.save();

    await appointment.populate([
      { path: 'client', select: 'fullName email phone' },
      { path: 'professional', select: 'fullName email phone' },
      { path: 'service', select: 'name duration price' },
      { path: 'clinic', select: 'name address' }
    ]);

    res.json({
      success: true,
      message: 'Cita confirmada correctamente',
      data: appointment
    });

  } catch (error) {
    console.error('Error al confirmar cita:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// POST /api/appointments/:id/cancel - Cancelar cita
router.post('/:id/cancel', [
  authenticateToken,
  requireOwnership(Appointment, 'id'),
  body('reason').isString().isLength({ min: 1, max: 500 }),
  body('cancelledBy').isIn(['client', 'professional', 'system'])
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
    const { reason, cancelledBy } = req.body;
    
    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Cita no encontrada'
      });
    }

    if (appointment.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'La cita ya está cancelada'
      });
    }

    if (appointment.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'No se puede cancelar una cita completada'
      });
    }

    appointment.cancel(reason, cancelledBy);
    await appointment.save();

    await appointment.populate([
      { path: 'client', select: 'fullName email phone' },
      { path: 'professional', select: 'fullName email phone' },
      { path: 'service', select: 'name duration price' },
      { path: 'clinic', select: 'name address' }
    ]);

    res.json({
      success: true,
      message: 'Cita cancelada correctamente',
      data: appointment
    });

  } catch (error) {
    console.error('Error al cancelar cita:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// POST /api/appointments/:id/complete - Completar cita
router.post('/:id/complete', [
  authenticateToken,
  requireOwnership(Appointment, 'id'),
  requireRole('professional'),
  body('diagnosis').optional().isString(),
  body('treatment').optional().isString(),
  body('prescription').optional().isArray(),
  body('followUp.required').optional().isBoolean(),
  body('followUp.date').optional().isISO8601(),
  body('followUp.notes').optional().isString()
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
    const { diagnosis, treatment, prescription, followUp } = req.body;
    
    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Cita no encontrada'
      });
    }

    if (appointment.status !== 'confirmed') {
      return res.status(400).json({
        success: false,
        message: 'Solo se pueden completar citas confirmadas'
      });
    }

    appointment.complete();
    
    // Actualizar campos médicos si se proporcionan
    if (diagnosis) appointment.diagnosis = diagnosis;
    if (treatment) appointment.treatment = treatment;
    if (prescription) appointment.prescription = prescription;
    if (followUp) appointment.followUp = followUp;

    await appointment.save();

    await appointment.populate([
      { path: 'client', select: 'fullName email phone' },
      { path: 'professional', select: 'fullName email phone' },
      { path: 'service', select: 'name duration price' },
      { path: 'clinic', select: 'name address' }
    ]);

    res.json({
      success: true,
      message: 'Cita completada correctamente',
      data: appointment
    });

  } catch (error) {
    console.error('Error al completar cita:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// POST /api/appointments/:id/no-show - Marcar como no presentado
router.post('/:id/no-show', [
  authenticateToken,
  requireOwnership(Appointment, 'id'),
  requireRole('professional')
], async (req, res) => {
  try {
    const { id } = req.params;
    
    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Cita no encontrada'
      });
    }

    if (appointment.status !== 'confirmed') {
      return res.status(400).json({
        success: false,
        message: 'Solo se pueden marcar como no presentadas las citas confirmadas'
      });
    }

    appointment.markAsNoShow();
    await appointment.save();

    await appointment.populate([
      { path: 'client', select: 'fullName email phone' },
      { path: 'professional', select: 'fullName email phone' },
      { path: 'service', select: 'name duration price' },
      { path: 'clinic', select: 'name address' }
    ]);

    res.json({
      success: true,
      message: 'Cita marcada como no presentada',
      data: appointment
    });

  } catch (error) {
    console.error('Error al marcar cita como no presentada:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// POST /api/appointments/:id/rating - Agregar calificación
router.post('/:id/rating', [
  authenticateToken,
  requireOwnership(Appointment, 'id'),
  requireRole('client'),
  body('score').isInt({ min: 1, max: 5 }),
  body('comment').optional().isString().isLength({ max: 1000 })
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
    const { score, comment } = req.body;
    
    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Cita no encontrada'
      });
    }

    if (appointment.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Solo se pueden calificar citas completadas'
      });
    }

    if (appointment.rating.score) {
      return res.status(400).json({
        success: false,
        message: 'Esta cita ya ha sido calificada'
      });
    }

    appointment.addRating(score, comment);
    await appointment.save();

    // Actualizar estadísticas del profesional
    const professional = await User.findById(appointment.professional);
    if (professional) {
      const totalReviews = professional.professionalInfo.rating.totalReviews + 1;
      const newAverage = (
        (professional.professionalInfo.rating.average * professional.professionalInfo.rating.totalReviews + score) / totalReviews
      );
      
      professional.professionalInfo.rating.average = newAverage;
      professional.professionalInfo.rating.totalReviews = totalReviews;
      await professional.save();
    }

    await appointment.populate([
      { path: 'client', select: 'fullName email phone' },
      { path: 'professional', select: 'fullName email phone' },
      { path: 'service', select: 'name duration price' },
      { path: 'clinic', select: 'name address' }
    ]);

    res.json({
      success: true,
      message: 'Calificación agregada correctamente',
      data: appointment
    });

  } catch (error) {
    console.error('Error al agregar calificación:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET /api/appointments/availability/check - Verificar disponibilidad
router.get('/availability/check', [
  query('professional').custom(validateObjectId),
  query('clinic').custom(validateObjectId),
  query('date').isISO8601(),
  query('startTime').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  query('endTime').matches(/^([01]?[0-3]):[0-5][0-9]$/)
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

    const { professional, clinic, date, startTime, endTime } = req.query;

    const isAvailable = await Appointment.checkAvailability(
      professional,
      clinic,
      new Date(date),
      startTime,
      endTime
    );

    res.json({
      success: true,
      data: {
        available: isAvailable,
        professional,
        clinic,
        date,
        startTime,
        endTime
      }
    });

  } catch (error) {
    console.error('Error al verificar disponibilidad:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

module.exports = router;

