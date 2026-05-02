const express = require('express');
const mongoose = require('mongoose');
const ExpoAppointment = require('../models/ExpoAppointment');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/health', authenticateToken, async (req, res) => {
  try {
    const mercadopagoService = req.mercadopagoService;
    const dbReady = mongoose.connection.readyState === 1;
    const cfg = mercadopagoService && typeof mercadopagoService.getConfigurationStatus === 'function'
      ? mercadopagoService.getConfigurationStatus()
      : { ok: false, missing: ['mercadopagoService'], backendBaseUrl: '' };

    return res.json({
      success: true,
      data: {
        provider: 'mercadopago',
        dbReady,
        configured: cfg.ok,
        missing: cfg.missing,
        backendBaseUrl: cfg.backendBaseUrl,
      },
    });
  } catch (error) {
    console.error('GET /api/v1/expo-payments/health:', error);
    return res.status(500).json({ success: false, message: 'Error' });
  }
});

/**
 * Pagos de seña (Expo) — montado en /api/v1/expo-payments
 * (registrado pronto en server.js para evitar conflictos con otros routers)
 */
router.post('/create-preference', authenticateToken, async (req, res) => {
  try {
    const mercadopagoService = req.mercadopagoService;
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ success: false, message: 'Base de datos no disponible' });
    }
    if (!mercadopagoService || !mercadopagoService.preference) {
      return res.status(503).json({
        success: false,
        message: 'Mercado Pago no está configurado (MERCADOPAGO_ACCESS_TOKEN)',
      });
    }
    const { appointmentId, amount } = req.body;
    if (!appointmentId || !mongoose.Types.ObjectId.isValid(String(appointmentId))) {
      return res.status(400).json({ success: false, message: 'appointmentId inválido' });
    }
    const doc = await ExpoAppointment.findById(appointmentId);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Cita no encontrada' });
    }
    if (String(doc.clientId) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Solo el cliente de la cita puede pagar' });
    }
    const deposit =
      typeof amount === 'number' && amount > 0
        ? amount
        : doc.depositAmount > 0
          ? doc.depositAmount
          : 2000;
    const pref = await mercadopagoService.createExpoAppointmentPreference({
      expoAppointmentId: String(appointmentId),
      amount: deposit,
      description: req.body.description,
    });
    return res.json({ success: true, data: pref });
  } catch (error) {
    console.error('POST /api/v1/expo-payments/create-preference:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error al crear la preferencia de pago',
    });
  }
});

router.get('/status/:appointmentId', authenticateToken, async (req, res) => {
  try {
    const { appointmentId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(String(appointmentId))) {
      return res.status(400).json({ success: false, message: 'ID inválido' });
    }
    const doc = await ExpoAppointment.findById(appointmentId)
      .select('status paymentStatus depositAmount clientId professionalId service date time')
      .lean();
    if (!doc) {
      return res.status(404).json({ success: false, message: 'No encontrada' });
    }
    const uid = String(req.user._id);
    const okClient = doc.clientId && String(doc.clientId) === uid;
    const okProf =
      doc.professionalId &&
      String(doc.professionalId) === uid &&
      req.user.userType === 'professional';
    if (!okClient && !okProf) {
      return res.status(403).json({ success: false, message: 'No autorizado' });
    }
    return res.json({
      success: true,
      data: {
        status: doc.status,
        paymentStatus: doc.paymentStatus,
        depositAmount: doc.depositAmount,
        service: doc.service,
        date: doc.date,
        time: doc.time,
      },
    });
  } catch (error) {
    console.error('GET /api/v1/expo-payments/status:', error);
    return res.status(500).json({ success: false, message: 'Error' });
  }
});

module.exports = router;
