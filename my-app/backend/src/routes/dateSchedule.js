const express = require('express');
const router = express.Router();
const {
  getDateSchedule,
  createOrUpdateDateSchedule,
  getMonthlySchedules,
  getDateRangeSchedules,
  bulkApplyWeeklyTemplate,
  deleteDateSchedule
} = require('../controllers/dateScheduleController');

// Rutas más específicas primero (evita que "month", "range" o "bulk-weekly" se tomen como :date)
router.get('/:professionalId/month/:year/:month', getMonthlySchedules);
router.get('/:professionalId/range', getDateRangeSchedules);
router.post('/:professionalId/bulk-weekly', bulkApplyWeeklyTemplate);
router.post('/:professionalId', createOrUpdateDateSchedule);
router.get('/:professionalId/:date', getDateSchedule);
router.delete('/:professionalId/:date', deleteDateSchedule);

module.exports = router;
