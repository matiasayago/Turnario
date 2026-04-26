const express = require('express');
const router = express.Router();
const calendarController = require('../controllers/calendarController');

// GET /api/v1/calendar/monthly/:professionalId/:year/:month
// Obtener calendario mensual completo
router.get('/monthly/:professionalId/:year/:month', calendarController.getMonthlyCalendar);

// GET /api/v1/calendar/day/:professionalId/:date
// Obtener disponibilidad de un día específico
router.get('/day/:professionalId/:date', calendarController.getDayAvailability);

// GET /api/v1/calendar/upcoming/:professionalId
// Obtener próximos días disponibles
router.get('/upcoming/:professionalId', calendarController.getUpcomingAvailability);

module.exports = router;
