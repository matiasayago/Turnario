const User = require('../models/User');
const cloud = require('./whatsappCloud');
const twilio = require('./twilioWhatsApp');

function requireOptIn() {
  return String(process.env.WHATSAPP_REQUIRE_OPT_IN || '1').trim() !== '0';
}

function userAllowsWhatsApp(user) {
  if (!requireOptIn()) return true;
  const w = user && user.preferences && user.preferences.notifications && user.preferences.notifications.whatsapp;
  return w === true;
}

/** Meta: nombre de plantilla. Twilio: ContentSid (HX…) en las mismas variables WHATSAPP_TEMPLATE_*. */
function templateFor(kind) {
  const k = String(kind || '').trim();
  const map = {
    appointment_confirmed: process.env.WHATSAPP_TEMPLATE_CONFIRMED,
    appointment_cancelled: process.env.WHATSAPP_TEMPLATE_CANCELLED,
    appointment_cancelled_by_professional: process.env.WHATSAPP_TEMPLATE_CANCELLED_PRO,
    appointment_rejected: process.env.WHATSAPP_TEMPLATE_REJECTED,
    reminder_24h: process.env.WHATSAPP_TEMPLATE_REMINDER_24H,
  };
  const name = (map[k] && String(map[k]).trim()) || '';
  return name;
}

const DEFAULT_LANG = () => String(process.env.WHATSAPP_TEMPLATE_LANG || 'es').trim() || 'es';

function isWhatsAppDeliveryEnabled() {
  return twilio.isEnabled() || cloud.isEnabled();
}

/**
 * Envía WhatsApp al cliente si corresponde (Twilio o Meta Cloud + opt-in + teléfono).
 * @param {string|import('mongoose').Types.ObjectId} clientUserId
 * @param {'appointment_confirmed'|'appointment_cancelled'|'appointment_cancelled_by_professional'|'appointment_rejected'|'reminder_24h'} kind
 * @param {string[]} bodyParams
 */
async function notifyClientByWhatsApp(clientUserId, kind, bodyParams) {
  if (!isWhatsAppDeliveryEnabled()) return;
  const uid = clientUserId != null ? String(clientUserId) : '';
  if (!uid) return;

  try {
    const user = await User.findById(uid).select('phone preferences').lean();
    if (!user || !user.phone) return;
    if (!userAllowsWhatsApp(user)) return;

    const templateRef = templateFor(kind);
    if (!templateRef) {
      console.warn(`WhatsApp: sin plantilla para kind=${kind} (definí WHATSAPP_TEMPLATE_*)`);
      return;
    }

    let result;
    if (twilio.isEnabled()) {
      result = await twilio.sendContentTemplateMessage(user.phone, templateRef, bodyParams);
    } else {
      result = await cloud.sendTemplateMessage(
        user.phone,
        templateRef,
        DEFAULT_LANG(),
        bodyParams
      );
    }
    if (!result.ok) {
      console.warn(
        `WhatsApp falló (${kind}) user=${uid} ref=${templateRef}:`,
        result.error || result.status || result.body
      );
    } else {
      console.log(`WhatsApp enviado (${kind}) user=${uid} ref=${templateRef}`);
    }
  } catch (e) {
    console.warn(`WhatsApp notifyClientByWhatsApp (${kind}):`, e && e.message ? e.message : e);
  }
}

module.exports = {
  notifyClientByWhatsApp,
  userAllowsWhatsApp,
  isWhatsAppDeliveryEnabled,
};
