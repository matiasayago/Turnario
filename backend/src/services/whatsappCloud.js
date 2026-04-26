/**
 * Meta WhatsApp Cloud API (Business) — envío de plantillas.
 * Docs: https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-messages
 */

function stripDigits(s) {
  return String(s || '').replace(/\D/g, '');
}

function isEnabled() {
  return String(process.env.WHATSAPP_CLOUD_ENABLED || '').trim() === '1';
}

function getConfig() {
  const token = String(process.env.WHATSAPP_CLOUD_ACCESS_TOKEN || '').trim();
  const phoneNumberId = String(process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim();
  const version = String(process.env.WHATSAPP_GRAPH_API_VERSION || 'v21.0').trim();
  return { token, phoneNumberId, version };
}

/**
 * @param {string} toE164 - Ej. +54911...
 * @param {string} templateName - Nombre exacto aprobado en Meta
 * @param {string} languageCode - Ej. es_AR, es, en_US
 * @param {string[]} bodyParams - Valores para variables {{1}}, {{2}}, ...
 * @returns {Promise<{ ok: boolean, status?: number, body?: unknown, error?: string }>}
 */
async function sendTemplateMessage(toE164, templateName, languageCode, bodyParams = []) {
  if (!isEnabled()) {
    return { ok: false, error: 'WHATSAPP_CLOUD_DISABLED' };
  }
  const { token, phoneNumberId, version } = getConfig();
  if (!token || !phoneNumberId) {
    return { ok: false, error: 'WHATSAPP_CLOUD_NOT_CONFIGURED' };
  }

  const digits = stripDigits(toE164);
  if (!digits || digits.length < 8) {
    return { ok: false, error: 'INVALID_PHONE' };
  }

  const name = String(templateName || '').trim();
  if (!name) {
    return { ok: false, error: 'MISSING_TEMPLATE' };
  }

  const lang = String(languageCode || 'es').trim() || 'es';
  const params = Array.isArray(bodyParams) ? bodyParams.map((p) => ({ type: 'text', text: String(p ?? '') })) : [];

  const url = `https://graph.facebook.com/${encodeURIComponent(version)}/${encodeURIComponent(
    phoneNumberId
  )}/messages`;

  const payload = {
    messaging_product: 'whatsapp',
    to: digits,
    type: 'template',
    template: {
      name,
      language: { code: lang },
      ...(params.length
        ? {
            components: [
              {
                type: 'body',
                parameters: params,
              },
            ],
          }
        : {}),
    },
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg =
        (json && json.error && (json.error.message || json.error.error_user_msg)) ||
        `HTTP_${res.status}`;
      return { ok: false, status: res.status, body: json, error: String(msg) };
    }
    return { ok: true, status: res.status, body: json };
  } catch (e) {
    return { ok: false, error: e && e.message ? String(e.message) : String(e) };
  }
}

module.exports = {
  isEnabled,
  sendTemplateMessage,
  stripDigits,
};
