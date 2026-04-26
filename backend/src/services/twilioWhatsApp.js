/**
 * Twilio WhatsApp — plantillas aprobadas vía ContentSid + ContentVariables.
 * https://www.twilio.com/docs/whatsapp/tutorial/send-whatsapp-notification-messages-templates
 */

function stripDigits(s) {
  return String(s || '').replace(/\D/g, '');
}

function isEnabled() {
  return String(process.env.TWILIO_WHATSAPP_ENABLED || '').trim() === '1';
}

function getConfig() {
  const accountSid = String(process.env.TWILIO_ACCOUNT_SID || '').trim();
  const authToken = String(process.env.TWILIO_AUTH_TOKEN || '').trim();
  let from = String(process.env.TWILIO_WHATSAPP_FROM || '').trim();
  if (from && !from.startsWith('whatsapp:')) {
    const d = stripDigits(from);
    if (d) from = `whatsapp:+${d}`;
  }
  return { accountSid, authToken, from };
}

function toE164(toRaw) {
  const raw = String(toRaw || '').trim();
  if (!raw) return '';
  const d = stripDigits(raw);
  if (!d || d.length < 8) return '';
  return `+${d}`;
}

/**
 * @param {string} toRaw - +E.164 o dígitos
 * @param {string} contentSid - Content SID en Twilio Console (suele empezar por HX)
 * @param {string[]} bodyParams - Valores para variables {{1}}, {{2}}, ...
 * @returns {Promise<{ ok: boolean, status?: number, body?: unknown, error?: string }>}
 */
async function sendContentTemplateMessage(toRaw, contentSid, bodyParams = []) {
  if (!isEnabled()) {
    return { ok: false, error: 'TWILIO_WHATSAPP_DISABLED' };
  }
  const { accountSid, authToken, from } = getConfig();
  if (!accountSid || !authToken || !from) {
    return { ok: false, error: 'TWILIO_WHATSAPP_NOT_CONFIGURED' };
  }

  const sid = String(contentSid || '').trim();
  if (!sid) {
    return { ok: false, error: 'MISSING_CONTENT_SID' };
  }

  const e164 = toE164(toRaw);
  if (!e164) {
    return { ok: false, error: 'INVALID_PHONE' };
  }

  const params = Array.isArray(bodyParams) ? bodyParams : [];
  const vars = {};
  params.forEach((p, i) => {
    vars[String(i + 1)] = String(p ?? '');
  });

  const form = new URLSearchParams();
  form.set('From', from);
  form.set('To', `whatsapp:${e164}`);
  form.set('ContentSid', sid);
  if (Object.keys(vars).length > 0) {
    form.set('ContentVariables', JSON.stringify(vars));
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(
    accountSid
  )}/Messages.json`;
  const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg =
        (json && (json.message || json.error_message)) || `HTTP_${res.status}`;
      return { ok: false, status: res.status, body: json, error: String(msg) };
    }
    return { ok: true, status: res.status, body: json };
  } catch (e) {
    return { ok: false, error: e && e.message ? String(e.message) : String(e) };
  }
}

/**
 * Texto libre (solo si el usuario escribió en las últimas 24h o en sandbox tras el join).
 */
async function sendSessionTextMessage(toRaw, bodyText) {
  if (!isEnabled()) {
    return { ok: false, error: 'TWILIO_WHATSAPP_DISABLED' };
  }
  if (String(process.env.TWILIO_WHATSAPP_ALLOW_BODY || '').trim() !== '1') {
    return { ok: false, error: 'TWILIO_WHATSAPP_BODY_NOT_ALLOWED' };
  }
  const { accountSid, authToken, from } = getConfig();
  if (!accountSid || !authToken || !from) {
    return { ok: false, error: 'TWILIO_WHATSAPP_NOT_CONFIGURED' };
  }
  const text = String(bodyText || '').trim();
  if (!text) {
    return { ok: false, error: 'MISSING_BODY' };
  }
  const e164 = toE164(toRaw);
  if (!e164) {
    return { ok: false, error: 'INVALID_PHONE' };
  }

  const form = new URLSearchParams();
  form.set('From', from);
  form.set('To', `whatsapp:${e164}`);
  form.set('Body', text);

  const url = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(
    accountSid
  )}/Messages.json`;
  const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg =
        (json && (json.message || json.error_message)) || `HTTP_${res.status}`;
      return { ok: false, status: res.status, body: json, error: String(msg) };
    }
    return { ok: true, status: res.status, body: json };
  } catch (e) {
    return { ok: false, error: e && e.message ? String(e.message) : String(e) };
  }
}

module.exports = {
  isEnabled,
  sendContentTemplateMessage,
  sendSessionTextMessage,
  stripDigits,
  toE164,
};
