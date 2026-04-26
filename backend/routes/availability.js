const express = require('express');
const router = express.Router();
const availabilityController = require('../controllers/availabilityController');
const auth = require('../middleware/auth');
const { body, param, query } = require('express-validator');

// Middleware de validación
const validateProfessionalId = [
  param('professionalId').isMongoId().withMessage('ID de profesional inválido')
];

const validateAvailabilityData = [
  body('daysOfWeek').isObject().withMessage('daysOfWeek debe ser un objeto'),
  body('daysOfWeek.monday').isBoolean().withMessage('monday debe ser booleano'),
  body('daysOfWeek.tuesday').isBoolean().withMessage('tuesday debe ser booleano'),
  body('daysOfWeek.wednesday').isBoolean().withMessage('wednesday debe ser booleano'),
  body('daysOfWeek.thursday').isBoolean().withMessage('thursday debe ser booleano'),
  body('daysOfWeek.friday').isBoolean().withMessage('friday debe ser booleano'),
  body('daysOfWeek.saturday').isBoolean().withMessage('saturday debe ser booleano'),
  body('daysOfWeek.sunday').isBoolean().withMessage('sunday debe ser booleano'),
  body('timeSlots').isArray().withMessage('timeSlots debe ser un array'),
  body('timeSlots.*').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Formato de horario inválido (HH:MM)'),
  body('workingHours').isObject().withMessage('workingHours debe ser un objeto'),
  body('workingHours.start').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Formato de horario de inicio inválido'),
  body('workingHours.end').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Formato de horario de fin inválido'),
  body('isActive').optional().isBoolean().withMessage('isActive debe ser booleano')
];

const validateDateQuery = [
  query('date').isISO8601().withMessage('Formato de fecha inválido (ISO 8601)')
];

const validateTimeSlotQuery = [
  query('date').isISO8601().withMessage('Formato de fecha inválido (ISO 8601)'),
  query('timeSlot').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Formato de horario inválido (HH:MM)')
];

const validateSpecialDate = [
  body('date').isISO8601().withMessage('Formato de fecha inválido (ISO 8601)'),
  body('isAvailable').isBoolean().withMessage('isAvailable debe ser booleano'),
  body('customTimeSlots').optional().isArray().withMessage('customTimeSlots debe ser un array'),
  body('customTimeSlots.*').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Formato de horario inválido (HH:MM)'),
  body('reason').optional().isString().withMessage('reason debe ser string')
];

const validateRecurringException = [
  body('dayOfWeek').isInt({ min: 0, max: 6 }).withMessage('dayOfWeek debe ser un número entre 0 y 6'),
  body('startDate').isISO8601().withMessage('Formato de fecha de inicio inválido (ISO 8601)'),
  body('endDate').isISO8601().withMessage('Formato de fecha de fin inválido (ISO 8601)'),
  body('isAvailable').isBoolean().withMessage('isAvailable debe ser booleano'),
  body('reason').optional().isString().withMessage('reason debe ser string')
];

const validateBlockTimeSlot = [
  body('date').isISO8601().withMessage('Formato de fecha inválido (ISO 8601)'),
  body('timeSlot').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Formato de horario inválido (HH:MM)'),
  body('appointmentId').isMongoId().withMessage('ID de cita inválido'),
  body('reason').optional().isString().withMessage('reason debe ser string')
];

const validateUnblockTimeSlot = [
  body('date').isISO8601().withMessage('Formato de fecha inválido (ISO 8601)'),
  body('timeSlot').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Formato de horario inválido (HH:MM)'),
  body('appointmentId').isMongoId().withMessage('ID de cita inválido')
];

const validateUnblockAppointment = [
  body('appointmentId').isMongoId().withMessage('ID de cita inválido')
];

// Rutas públicas (no requieren autenticación)
router.get('/professionals/available', validateDateQuery, availabilityController.getAvailableProfessionals);
router.get('/:professionalId/check-date', validateDateQuery, availabilityController.checkDateAvailability);
router.get('/:professionalId/time-slots', validateDateQuery, availabilityController.getAvailableTimeSlots);
router.get('/:professionalId/check-time-slot', validateTimeSlotQuery, availabilityController.checkTimeSlotAvailability);

// Rutas protegidas (requieren autenticación)
router.get('/:professionalId', auth, validateProfessionalId, availabilityController.getAvailabilityByProfessional);
router.post('/:professionalId', auth, validateProfessionalId, validateAvailabilityData, availabilityController.createOrUpdateAvailability);
router.put('/:professionalId', auth, validateProfessionalId, validateAvailabilityData, availabilityController.createOrUpdateAvailability);

// Rutas para excepciones (solo profesionales)
router.post('/:professionalId/special-date', auth, validateProfessionalId, validateSpecialDate, availabilityController.addSpecialDate);
router.post('/:professionalId/recurring-exception', auth, validateProfessionalId, validateRecurringException, availabilityController.addRecurringException);

// Rutas para bloqueo de horarios
router.post('/:professionalId/block-time-slot', auth, validateProfessionalId, validateBlockTimeSlot, availabilityController.blockTimeSlot);
router.post('/:professionalId/unblock-time-slot', auth, validateProfessionalId, validateUnblockTimeSlot, availabilityController.unblockTimeSlot);
router.post('/:professionalId/unblock-appointment', auth, validateProfessionalId, validateUnblockAppointment, availabilityController.unblockAppointmentTimeSlots);
router.get('/:professionalId/blocked-time-slots', auth, validateProfessionalId, validateDateQuery, availabilityController.getBlockedTimeSlots);

// Rutas administrativas (solo admin)
router.get('/', auth, availabilityController.getAllAvailabilities);
router.delete('/:professionalId', auth, validateProfessionalId, availabilityController.deleteAvailability);

module.exports = router;
