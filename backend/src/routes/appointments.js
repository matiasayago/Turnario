const express = require('express');
const { body, validationResult } = require('express-validator');
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const Service = require('../models/Service');
const Clinic = require('../models/Clinic');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Middleware de autenticación para todas las rutas
router.use(authenticateToken);

// @route   GET /api/appointments
// @desc    Obtener todas las citas del usuario autenticado
// @access  Private
router.get('/', async (req, res) => {
  try {
    const { userType, userId } = req.user;
    let appointments;

    if (userType === 'professional') {
      // Profesionales ven todas las citas de sus clínicas
      appointments = await Appointment.find({})
        .populate('clientId', 'fullName email phone')
        .populate('serviceId', 'name duration price')
        .populate('clinicId', 'name address')
        .populate('professionalId', 'fullName email')
        .sort({ date: 1, time: 1 });
    } else {
      // Clientes ven solo sus propias citas
      appointments = await Appointment.find({ clientId: userId })
        .populate('serviceId', 'name duration price')
        .populate('clinicId', 'name address')
        .populate('professionalId', 'fullName email')
        .sort({ date: 1, time: 1 });
    }

    res.json({
      success: true,
      data: appointments
    });
  } catch (error) {
    console.error('Error al obtener citas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener citas'
    });
  }
});

// @route   GET /api/appointments/:id
// @desc    Obtener una cita específica
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { userType, userId } = req.user;

    const appointment = await Appointment.findById(id)
      .populate('clientId', 'fullName email phone')
      .populate('serviceId', 'name duration price')
      .populate('clinicId', 'name address')
      .populate('professionalId', 'fullName email');

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Cita no encontrada'
      });
    }

    // Verificar permisos
    if (userType === 'client' && appointment.clientId._id.toString() !== userId) {
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
      message: 'Error al obtener cita'
    });
  }
});

// @route   POST /api/appointments
// @desc    Crear una nueva cita
// @access  Private (Clientes y Profesionales)
router.post('/', [
  body('serviceId')
    .isMongoId()
    .withMessage('ID de servicio inválido'),
  body('clinicId')
    .isMongoId()
    .withMessage('ID de clínica inválido'),
  body('date')
    .isISO8601()
    .withMessage('Fecha inválida'),
  body('time')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Hora inválida'),
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Las notas no pueden exceder 500 caracteres')
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

    const { userType, userId } = req.user;
    const { serviceId, clinicId, date, time, notes, clientId } = req.body;

    // Verificar que el servicio existe y está activo
    const service = await Service.findById(serviceId);
    if (!service || !service.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Servicio no válido o inactivo'
      });
    }

    // Verificar que la clínica existe y está activa
    const clinic = await Clinic.findById(clinicId);
    if (!clinic || !clinic.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Clínica no válida o inactiva'
      });
    }

    // Determinar el cliente de la cita
    let appointmentClientId;
    if (userType === 'professional') {
      // Profesionales pueden crear citas para cualquier cliente
      if (!clientId) {
        return res.status(400).json({
          success: false,
          message: 'ID de cliente requerido para profesionales'
        });
      }
      appointmentClientId = clientId;
    } else {
      // Clientes solo pueden crear citas para sí mismos
      appointmentClientId = userId;
    }

    // Verificar disponibilidad del horario
    const existingAppointment = await Appointment.findOne({
      clinicId,
      date,
      time,
      status: { $in: ['pending', 'confirmed'] }
    });

    if (existingAppointment) {
      return res.status(400).json({
        success: false,
        message: 'El horario seleccionado no está disponible'
      });
    }

    // Crear la cita
    const appointmentData = {
      clientId: appointmentClientId,
      serviceId,
      clinicId,
      professionalId: userType === 'professional' ? userId : null,
      date: new Date(date),
      time,
      notes: notes || '',
      status: 'pending',
      paymentStatus: 'pending'
    };

    const appointment = new Appointment(appointmentData);
    await appointment.save();

    // Poblar los datos relacionados
    await appointment.populate([
      { path: 'clientId', select: 'fullName email phone' },
      { path: 'serviceId', select: 'name duration price' },
      { path: 'clinicId', select: 'name address' },
      { path: 'professionalId', select: 'fullName email' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Cita creada exitosamente',
      data: appointment
    });
  } catch (error) {
    console.error('Error al crear cita:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear cita'
    });
  }
});

// @route   PUT /api/appointments/:id
// @desc    Actualizar una cita existente
// @access  Private
router.put('/:id', [
  body('date')
    .optional()
    .isISO8601()
    .withMessage('Fecha inválida'),
  body('time')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Hora inválida'),
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Las notas no pueden exceder 500 caracteres'),
  body('status')
    .optional()
    .isIn(['pending', 'confirmed', 'cancelled', 'completed'])
    .withMessage('Estado inválido')
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
    const { userType, userId } = req.user;
    const updateData = req.body;

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Cita no encontrada'
      });
    }

    // Verificar permisos
    if (userType === 'client' && appointment.clientId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para modificar esta cita'
      });
    }

    // Solo profesionales pueden cambiar el estado
    if (updateData.status && userType === 'client') {
      delete updateData.status;
    }

    // Verificar disponibilidad si se cambia fecha/hora
    if (updateData.date || updateData.time) {
      const checkDate = updateData.date || appointment.date;
      const checkTime = updateData.time || appointment.time;

      const existingAppointment = await Appointment.findOne({
        _id: { $ne: id },
        clinicId: appointment.clinicId,
        date: checkDate,
        time: checkTime,
        status: { $in: ['pending', 'confirmed'] }
      });

      if (existingAppointment) {
        return res.status(400).json({
          success: false,
          message: 'El horario seleccionado no está disponible'
        });
      }
    }

    // Actualizar la cita
    const updatedAppointment = await Appointment.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate([
      { path: 'clientId', select: 'fullName email phone' },
      { path: 'serviceId', select: 'name duration price' },
      { path: 'clinicId', select: 'name address' },
      { path: 'professionalId', select: 'fullName email' }
    ]);

    res.json({
      success: true,
      message: 'Cita actualizada exitosamente',
      data: updatedAppointment
    });
  } catch (error) {
    console.error('Error al actualizar cita:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar cita'
    });
  }
});

// @route   DELETE /api/appointments/:id
// @desc    Cancelar una cita
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { userType, userId } = req.user;

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Cita no encontrada'
      });
    }

    // Verificar permisos
    if (userType === 'client' && appointment.clientId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para cancelar esta cita'
      });
    }

    // Solo se pueden cancelar citas pendientes o confirmadas
    if (!['pending', 'confirmed'].includes(appointment.status)) {
      return res.status(400).json({
        success: false,
        message: 'No se puede cancelar una cita en este estado'
      });
    }

    // Cambiar estado a cancelado
    appointment.status = 'cancelled';
    appointment.cancelledAt = new Date();
    appointment.cancelledBy = userId;
    await appointment.save();

    res.json({
      success: true,
      message: 'Cita cancelada exitosamente'
    });
  } catch (error) {
    console.error('Error al cancelar cita:', error);
    res.status(500).json({
      success: false,
      message: 'Error al cancelar cita'
    });
  }
});

// @route   POST /api/appointments/:id/confirm
// @desc    Confirmar una cita (solo profesionales)
// @access  Private (Profesionales)
router.post('/:id/confirm', requireRole('professional'), async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;

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

    appointment.status = 'confirmed';
    appointment.confirmedAt = new Date();
    appointment.confirmedBy = userId;
    await appointment.save();

    res.json({
      success: true,
      message: 'Cita confirmada exitosamente'
    });
  } catch (error) {
    console.error('Error al confirmar cita:', error);
    res.status(500).json({
      success: false,
      message: 'Error al confirmar cita'
    });
  }
});

// @route   POST /api/appointments/:id/reject
// @desc    Rechazar una cita (solo profesionales)
// @access  Private (Profesionales)
router.post('/:id/reject', requireRole('professional'), async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;
    const { reason } = req.body;

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
        message: 'Solo se pueden rechazar citas pendientes'
      });
    }

    appointment.status = 'rejected';
    appointment.rejectedAt = new Date();
    appointment.rejectedBy = userId;
    appointment.rejectionReason = reason || 'Sin motivo especificado';
    await appointment.save();

    res.json({
      success: true,
      message: 'Cita rechazada exitosamente'
    });
  } catch (error) {
    console.error('Error al rechazar cita:', error);
    res.status(500).json({
      success: false,
      message: 'Error al rechazar cita'
    });
  }
});

// @route   GET /api/appointments/available-slots
// @desc    Obtener horarios disponibles para una fecha y clínica
// @access  Private
router.get('/available-slots', async (req, res) => {
  try {
    const { date, clinicId, serviceId } = req.query;

    if (!date || !clinicId) {
      return res.status(400).json({
        success: false,
        message: 'Fecha y ID de clínica son requeridos'
      });
    }

    // Obtener el servicio para conocer la duración
    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(400).json({
        success: false,
        message: 'Servicio no válido'
      });
    }

    // Horarios de trabajo (9:00 AM a 6:00 PM)
    const workHours = [];
    for (let hour = 9; hour <= 18; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        if (hour === 18 && minute > 0) break; // No después de 6:00 PM
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        workHours.push(time);
      }
    }

    // Obtener citas existentes para esa fecha y clínica
    const existingAppointments = await Appointment.find({
      clinicId,
      date: new Date(date),
      status: { $in: ['pending', 'confirmed'] }
    });

    // Filtrar horarios ocupados
    const occupiedSlots = existingAppointments.map(apt => apt.time);
    const availableSlots = workHours.filter(time => !occupiedSlots.includes(time));

    res.json({
      success: true,
      data: {
        date,
        clinicId,
        serviceId,
        availableSlots,
        serviceDuration: service.duration
      }
    });
  } catch (error) {
    console.error('Error al obtener horarios disponibles:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener horarios disponibles'
    });
  }
});

module.exports = router;
