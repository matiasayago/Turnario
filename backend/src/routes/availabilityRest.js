const express = require('express');
const router = express.Router();
const availabilityRestController = require('../controllers/availabilityRestController');

// Rutas específicas antes de /:professionalId genérico
router.post(
  '/:professionalId/block-time-slot',
  availabilityRestController.blockTimeSlot
);
router.post(
  '/:professionalId/unblock-time-slot',
  availabilityRestController.unblockTimeSlot
);
router.post(
  '/:professionalId/unblock-appointment',
  availabilityRestController.unblockAppointmentTimeSlots
);
router.get(
  '/:professionalId/blocked-time-slots',
  availabilityRestController.getBlockedTimeSlots
);

router.get('/:professionalId', availabilityRestController.getAvailability);
router.post('/:professionalId', availabilityRestController.saveAvailability);

module.exports = router;
