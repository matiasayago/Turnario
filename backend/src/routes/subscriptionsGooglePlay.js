const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');
const { verifyGooglePlaySubscription } = require('../services/googlePlaySubscriptionVerify');

const router = express.Router();

function sessionUserId(req) {
  const u = req.user;
  if (!u) return '';
  if (u._id != null) return u._id.toString();
  return String(u.id || '');
}

function allowedSubscriptionSkus() {
  const raw = process.env.GOOGLE_PLAY_SUBSCRIPTION_SKUS || 'turnario_pro_monthly';
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * POST /api/subscriptions/google-play/confirm
 * Tras compra exitosa en la app (expo-iap), verifica con Google y marca Pro en Mongo.
 */
router.post(
  '/google-play/confirm',
  authenticateToken,
  [
    body('purchaseToken').trim().isLength({ min: 10 }).withMessage('purchaseToken inválido'),
    body('productId').trim().isLength({ min: 1 }).withMessage('productId requerido'),
    body('packageName').optional().trim().isLength({ max: 200 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const first = errors.array()[0];
        return res.status(400).json({
          success: false,
          message: first && first.msg ? first.msg : 'Datos inválidos',
        });
      }

      if (req.user.userType !== 'professional') {
        return res.status(403).json({
          success: false,
          message: 'Solo cuentas profesionales pueden activar Turnario Pro con Google Play.',
        });
      }

      const allowed = allowedSubscriptionSkus();
      const { purchaseToken, productId } = req.body;
      if (!allowed.includes(productId)) {
        return res.status(400).json({
          success: false,
          message: 'El producto no está habilitado en el servidor.',
        });
      }

      const packageName =
        (req.body.packageName && String(req.body.packageName).trim()) ||
        process.env.ANDROID_PACKAGE_NAME ||
        'com.turnariopro.app';

      const v = await verifyGooglePlaySubscription({
        packageName,
        purchaseToken,
        productId,
      });

      if (!v.ok) {
        return res.status(400).json({
          success: false,
          message: v.message || 'No se pudo verificar la compra',
          code: v.code,
        });
      }

      const uid = sessionUserId(req);
      const user = await User.findById(uid);
      if (!user) {
        return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
      }

      user.subscriptionTier = 'pro';
      user.subscriptionExpiresAt = v.expiresAt || null;
      user.subscriptionProvider = v.devBypass ? 'google_play_dev_bypass' : 'google_play';
      await user.save();

      return res.json({
        success: true,
        data: {
          user: user.getPublicProfile(),
        },
      });
    } catch (err) {
      console.error('POST /google-play/confirm:', err);
      return res.status(500).json({
        success: false,
        message: err && err.message ? err.message : 'Error interno',
      });
    }
  }
);

module.exports = router;
