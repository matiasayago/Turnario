const express = require('express');
const { body, query, param, validationResult } = require('express-validator');
const Appointment = require('../models/Appointment');
const Service = require('../models/Service');
const Clinic = require('../models/Clinic');
const { authenticateToken, requireRole, requireOwnership } = require('../middleware/auth');
const { catchAsync } = require('../middleware/errorHandler');
const logger = require('../config/logger');

const router = express.Router();

// Middleware de validación
const validateAppointment = [
  body('client').isMongoId().withMessage('ID de cliente inválido'),
  body('professional').isMongoId().withMessage('ID de profesional inválido'),
  body('service').isMongoId().withMessage('ID de servicio inválido'),
  body('clinic').isMongoId().withMessage('ID de clínica inválido'),
  body('date').isISO8601().withMessage('Fecha inválida'),
  body('startTime').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Hora de inicio inválida (HH:MM)'),
  body('endTime').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Hora de fin inválida (HH:MM)'),
  body('amount').isFloat({ min: 0 }).withMessage('Monto debe ser un número positivo'),
  body('duration').optional().isInt({ min: 15, max: 480 }).withMessage('Duración debe estar entre 15 y 480 minutos')
];

const validateAppointmentUpdate = [
  body('date').optional().isISO8601().withMessage('Fecha inválida'),
  body('startTime').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Hora de inicio inválida (HH:MM)'),
  body('endTime').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Hora de fin inválida (HH:MM)'),
  body('amount').optional().isFloat({ min: 0 }).withMessage('Monto debe ser un número positivo'),
  body('status').optional().isIn(['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled']).withMessage('Estado inválido')
];

// GET /api/v1/appointments - Obtener citas con filtros
router.get('/', 
  authenticateToken,
  [
    query('status').optional().isIn(['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled']),
    query('dateFrom').optional().isISO8601(),
    query('dateTo').optional().isISO8601(),
    query('professional').optional().isMongoId(),
    query('client').optional().isMongoId(),
    query('clinic').optional().isMongoId(),
    query('paymentStatus').optional().isIn(['pending', 'partial', 'paid', 'refunded', 'cancelled']),
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
      dateFrom,
      dateTo,
      professional,
      client,
      clinic,
      paymentStatus,
      page = 1,
      limit = 20
    } = req.query;

    // Construir query base
    const query = { isDeleted: false };
    
    // Aplicar filtros según el rol del usuario
    if (req.user.userType === 'professional') {
      query.professional = req.user._id;
    } else if (req.user.userType === 'client') {
      query.client = req.user._id;
    } else if (req.user.userType === 'admin') {
      // Los admins pueden ver todas las citas
    } else {
      // Usuarios con otros roles solo ven citas relacionadas
      if (professional) query.professional = professional;
      if (client) query.client = client;
      if (clinic) query.clinic = clinic;
    }

    // Aplicar filtros adicionales
    if (status) query.status = status;
    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (dateFrom || dateTo) {
      query.date = {};
      if (dateFrom) query.date.$gte = new Date(dateFrom);
      if (dateTo) query.date.$lte = new Date(dateTo);
    }

    // Calcular paginación
    const skip = (page - 1) * limit;
    
    // Ejecutar consulta
    const [appointments, total] = await Promise.all([
      Appointment.find(query)
        .populate('client', 'fullName email phone')
        .populate('professional', 'fullName email phone specialties')
        .populate('service', 'name description price duration')
        .populate('clinic', 'name address')
        .sort({ date: 1, startTime: 1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Appointment.countDocuments(query)
    ]);

    // Calcular estadísticas básicas
    const stats = await Appointment.getAppointmentStats({
      professional: req.user.userType === 'professional' ? req.user._id : undefined,
      client: req.user.userType === 'client' ? req.user._id : undefined,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined
    });

    res.json({
      success: true,
      data: appointments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      stats
    });
  })
);

// GET /api/v1/appointments/:id - Obtener cita específica
router.get('/:id',
  authenticateToken,
  [
    param('id').isMongoId().withMessage('ID de cita inválido')
  ],
  catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const appointment = await Appointment.findById(req.params.id)
      .populate('client', 'fullName email phone')
      .populate('professional', 'fullName email phone specialties')
      .populate('service', 'name description price duration')
      .populate('clinic', 'name address')
      .populate('createdBy', 'fullName email')
      .populate('lastModifiedBy', 'fullName email');

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Cita no encontrada'
      });
    }

    // Verificar permisos de acceso
    if (req.user.userType === 'client' && appointment.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para ver esta cita'
      });
    }

    if (req.user.userType === 'professional' && appointment.professional.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para ver esta cita'
      });
    }

    res.json({
      success: true,
      data: appointment
    });
  })
);

// POST /api/v1/appointments - Crear nueva cita
router.post('/',
  authenticateToken,
  validateAppointment,
  catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
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
      amount,
      duration,
      clientNotes,
      appointmentType = 'regular'
    } = req.body;

    // Verificar que el usuario sea el cliente o tenga permisos
    if (req.user.userType === 'client' && client !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Solo puedes crear citas para ti mismo'
      });
    }

    // Verificar que el servicio exista y esté activo
    const serviceDoc = await Service.findById(service);
    if (!serviceDoc || !serviceDoc.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Servicio no encontrado o inactivo'
      });
    }

    // Verificar que la clínica exista y esté activa
    const clinicDoc = await Clinic.findById(clinic);
    if (!clinicDoc || clinicDoc.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Clínica no encontrada o inactiva'
      });
    }

    // Verificar disponibilidad del profesional
    const conflictingAppointments = await Appointment.findConflicting(
      professional,
      new Date(date),
      startTime,
      endTime
    );

    if (conflictingAppointments.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'El profesional no está disponible en ese horario'
      });
    }

    // Crear la cita
    const appointment = new Appointment({
      client,
      professional,
      service,
      clinic,
      date: new Date(date),
      startTime,
      endTime,
      amount,
      duration: duration || serviceDoc.duration,
      clientNotes,
      appointmentType,
      createdBy: req.user._id
    });

    // Validar la cita antes de guardar
    const validationErrors = appointment.validateAppointment();
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Datos de cita inválidos',
        errors: validationErrors
      });
    }

    await appointment.save();

    // Log de la acción
    appointment.logAccess(req.user._id, 'appointment_created', {
      appointmentNumber: appointment.appointmentNumber,
      date: appointment.date,
      amount: appointment.amount
    });

    // Populate para la respuesta
    await appointment.populate([
      { path: 'client', select: 'fullName email phone' },
      { path: 'professional', select: 'fullName email phone' },
      { path: 'service', select: 'name description price' },
      { path: 'clinic', select: 'name address' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Cita creada exitosamente',
      data: appointment
    });
  })
);

// PUT /api/v1/appointments/:id - Actualizar cita
router.put('/:id',
  authenticateToken,
  [
    param('id').isMongoId().withMessage('ID de cita inválido')
  ],
  validateAppointmentUpdate,
  catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Cita no encontrada'
      });
    }

    // Verificar permisos de modificación
    if (req.user.userType === 'client' && appointment.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para modificar esta cita'
      });
    }

    if (req.user.userType === 'professional' && appointment.professional.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para modificar esta cita'
      });
    }

    // Verificar que la cita no esté completada o cancelada
    if (['completed', 'cancelled'].includes(appointment.status)) {
      return res.status(400).json({
        success: false,
        message: 'No se puede modificar una cita completada o cancelada'
      });
    }

    // Actualizar campos permitidos
    const updateFields = ['date', 'startTime', 'endTime', 'amount', 'clientNotes', 'professionalNotes'];
    updateFields.forEach(field => {
      if (req.body[field] !== undefined) {
        appointment[field] = req.body[field];
      }
    });

    // Si se cambia la fecha/hora, verificar disponibilidad
    if (req.body.date || req.body.startTime || req.body.endTime) {
      const newDate = req.body.date ? new Date(req.body.date) : appointment.date;
      const newStartTime = req.body.startTime || appointment.startTime;
      const newEndTime = req.body.endTime || appointment.endTime;

      const conflictingAppointments = await Appointment.findConflicting(
        appointment.professional,
        newDate,
        newStartTime,
        newEndTime,
        appointment._id
      );

      if (conflictingAppointments.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'El profesional no está disponible en ese horario'
        });
      }
    }

    appointment.lastModifiedBy = req.user._id;
    await appointment.save();

    // Log de la acción
    appointment.logAccess(req.user._id, 'appointment_updated', {
      appointmentNumber: appointment.appointmentNumber,
      changes: req.body
    });

    // Populate para la respuesta
    await appointment.populate([
      { path: 'client', select: 'fullName email phone' },
      { path: 'professional', select: 'fullName email phone' },
      { path: 'service', select: 'name description price' },
      { path: 'clinic', select: 'name address' }
    ]);

    res.json({
      success: true,
      message: 'Cita actualizada exitosamente',
      data: appointment
    });
  })
);

// PATCH /api/v1/appointments/:id/status - Cambiar estado de la cita
router.patch('/:id/status',
  authenticateToken,
  [
    param('id').isMongoId().withMessage('ID de cita inválido'),
    body('status').isIn(['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled']).withMessage('Estado inválido'),
    body('reason').optional().isString().isLength({ max: 500 }),
    body('notes').optional().isString().isLength({ max: 1000 })
  ],
  catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { status, reason, notes } = req.body;
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Cita no encontrada'
      });
    }

    // Verificar permisos
    if (req.user.userType === 'client' && appointment.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para modificar esta cita'
      });
    }

    if (req.user.userType === 'professional' && appointment.professional.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para modificar esta cita'
      });
    }

    // Aplicar cambio de estado
    await appointment.updateStatus(status, req.user._id, reason, notes);

    // Log de la acción
    appointment.logAccess(req.user._id, 'appointment_status_changed', {
      appointmentNumber: appointment.appointmentNumber,
      oldStatus: appointment.statusHistory[appointment.statusHistory.length - 2]?.status,
      newStatus: status,
      reason
    });

    res.json({
      success: true,
      message: `Estado de la cita cambiado a ${status}`,
      data: appointment
    });
  })
);

// POST /api/v1/appointments/:id/cancel - Cancelar cita
router.post('/:id/cancel',
  authenticateToken,
  [
    param('id').isMongoId().withMessage('ID de cita inválido'),
    body('reason').optional().isString().isLength({ max: 500 })
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
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Cita no encontrada'
      });
    }

    // Verificar permisos
    if (req.user.userType === 'client' && appointment.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para cancelar esta cita'
      });
    }

    if (req.user.userType === 'professional' && appointment.professional.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para cancelar esta cita'
      });
    }

    // Verificar que se pueda cancelar
    if (!appointment.canBeCancelled()) {
      return res.status(400).json({
        success: false,
        message: 'No se puede cancelar esta cita (muy próxima al horario)'
      });
    }

    // Cancelar la cita
    await appointment.cancel(req.user._id, reason);

    // Log de la acción
    appointment.logAccess(req.user._id, 'appointment_cancelled', {
      appointmentNumber: appointment.appointmentNumber,
      reason
    });

    res.json({
      success: true,
      message: 'Cita cancelada exitosamente',
      data: appointment
    });
  })
);

// POST /api/v1/appointments/:id/reschedule - Reprogramar cita
router.post('/:id/reschedule',
  authenticateToken,
  [
    param('id').isMongoId().withMessage('ID de cita inválido'),
    body('newDate').isISO8601().withMessage('Nueva fecha inválida'),
    body('newStartTime').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Nueva hora de inicio inválida'),
    body('newEndTime').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Nueva hora de fin inválida'),
    body('reason').optional().isString().isLength({ max: 500 })
  ],
  catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { newDate, newStartTime, newEndTime, reason } = req.body;
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Cita no encontrada'
      });
    }

    // Verificar permisos
    if (req.user.userType === 'client' && appointment.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para reprogramar esta cita'
      });
    }

    if (req.user.userType === 'professional' && appointment.professional.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para reprogramar esta cita'
      });
    }

    // Verificar que se pueda reprogramar
    if (!appointment.canBeRescheduled()) {
      return res.status(400).json({
        success: false,
        message: 'No se puede reprogramar esta cita (muy próxima al horario)'
      });
    }

    // Verificar disponibilidad en el nuevo horario
    const conflictingAppointments = await Appointment.findConflicting(
      appointment.professional,
      new Date(newDate),
      newStartTime,
      newEndTime,
      appointment._id
    );

    if (conflictingAppointments.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'El profesional no está disponible en el nuevo horario'
      });
    }

    // Reprogramar la cita
    await appointment.reschedule(new Date(newDate), newStartTime, newEndTime, req.user._id, reason);

    // Log de la acción
    appointment.logAccess(req.user._id, 'appointment_rescheduled', {
      appointmentNumber: appointment.appointmentNumber,
      newDate,
      newStartTime,
      newEndTime,
      reason
    });

    res.json({
      success: true,
      message: 'Cita reprogramada exitosamente',
      data: appointment
    });
  })
);

// POST /api/v1/appointments/:id/complete - Completar cita
router.post('/:id/complete',
  authenticateToken,
  [
    param('id').isMongoId().withMessage('ID de cita inválido'),
    body('diagnosis').optional().isString().isLength({ max: 2000 }),
    body('treatment').optional().isString().isLength({ max: 2000 }),
    body('prescription').optional().isString().isLength({ max: 2000 })
  ],
  catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { diagnosis, treatment, prescription } = req.body;
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Cita no encontrada'
      });
    }

    // Solo el profesional puede completar la cita
    if (appointment.professional.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Solo el profesional puede completar la cita'
      });
    }

    // Completar la cita
    await appointment.complete(req.user._id, diagnosis, treatment, prescription);

    // Log de la acción
    appointment.logAccess(req.user._id, 'appointment_completed', {
      appointmentNumber: appointment.appointmentNumber,
      diagnosis: !!diagnosis,
      treatment: !!treatment,
      prescription: !!prescription
    });

    res.json({
      success: true,
      message: 'Cita completada exitosamente',
      data: appointment
    });
  })
);

// DELETE /api/v1/appointments/:id - Eliminar cita (soft delete)
router.delete('/:id',
  authenticateToken,
  [
    param('id').isMongoId().withMessage('ID de cita inválido')
  ],
  catchAsync(async (req, res) => {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Cita no encontrada'
      });
    }

    // Verificar permisos
    if (req.user.userType === 'client' && appointment.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para eliminar esta cita'
      });
    }

    if (req.user.userType === 'professional' && appointment.professional.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para eliminar esta cita'
      });
    }

    // Solo se pueden eliminar citas pendientes o canceladas
    if (!['pending', 'cancelled'].includes(appointment.status)) {
      return res.status(400).json({
        success: false,
        message: 'Solo se pueden eliminar citas pendientes o canceladas'
      });
    }

    // Soft delete
    await appointment.softDelete(req.user._id);

    // Log de la acción
    appointment.logAccess(req.user._id, 'appointment_deleted', {
      appointmentNumber: appointment.appointmentNumber
    });

    res.json({
      success: true,
      message: 'Cita eliminada exitosamente'
    });
  })
);

// GET /api/v1/appointments/upcoming - Obtener citas próximas
router.get('/upcoming',
  authenticateToken,
  [
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

    const { limit = 10 } = req.query;
    const appointments = await Appointment.getUpcomingAppointments(
      req.user._id,
      req.user.userType,
      parseInt(limit)
    );

    res.json({
      success: true,
      data: appointments
    });
  })
);

// GET /api/v1/appointments/stats - Obtener estadísticas
router.get('/stats',
  authenticateToken,
  [
    query('dateFrom').optional().isISO8601(),
    query('dateTo').optional().isISO8601(),
    query('professional').optional().isMongoId(),
    query('client').optional().isMongoId(),
    query('clinic').optional().isMongoId()
  ],
  catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const filters = {
      dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom) : undefined,
      dateTo: req.query.dateTo ? new Date(req.query.dateTo) : undefined,
      professional: req.query.professional,
      client: req.query.client,
      clinic: req.query.clinic
    };

    // Aplicar filtros según el rol del usuario
    if (req.user.userType === 'professional') {
      filters.professional = req.user._id;
    } else if (req.user.userType === 'client') {
      filters.client = req.user._id;
    }

    const stats = await Appointment.getAppointmentStats(filters);

    res.json({
      success: true,
      data: stats
    });
  })
);

module.exports = router;
