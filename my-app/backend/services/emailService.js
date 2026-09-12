/**
 * Envío de emails para recuperación de contraseña (SMTP / Gmail / Resend).
 */
const nodemailer = require('nodemailer');

function getPrimaryFrontendBaseUrl() {
  const raw = String(process.env.FRONTEND_URL || '').trim();
  if (!raw) return '';
  return raw.split(',')[0].trim().replace(/\/$/, '');
}

function getPublicApiBaseUrl() {
  const explicit = String(
    process.env.RESET_LINK_BASE_URL ||
      process.env.PUBLIC_API_URL ||
      process.env.BACKEND_PUBLIC_URL ||
      ''
  )
    .trim()
    .replace(/\/$/, '');
  if (explicit) return explicit;
  const host = process.env.HOST_IP || '192.168.0.11';
  const port = process.env.PORT || 3001;
  return `http://${host}:${port}`;
}

function buildResetUrls(resetToken) {
  const tokenQ = encodeURIComponent(resetToken);
  const appScheme = String(process.env.EXPO_APP_SCHEME || 'myapp').trim() || 'myapp';
  // Tres barras: host vacío → path /reset-password (mejor con Expo Router / Android)
  const appResetUrl = `${appScheme}:///reset-password?token=${tokenQ}`;
  const appResetUrlAlt = `${appScheme}://reset-password?token=${tokenQ}`;
  const packageName = String(process.env.ANDROID_PACKAGE || 'com.turnariopro.app').trim();
  const androidIntentUrl =
    `intent://reset-password?token=${tokenQ}` +
    `#Intent;scheme=${appScheme};package=${packageName};S.browser_fallback_url=${encodeURIComponent(
      `${getPublicApiBaseUrl()}/api/v1/auth/reset-open?token=${tokenQ}&fallback=1`
    )};end`;

  const apiBase = getPublicApiBaseUrl();
  // Los clientes de email (Gmail, etc.) suelen bloquear myapp:// — el botón debe ser HTTP
  const bridgeUrl = `${apiBase}/api/v1/auth/reset-open?token=${tokenQ}`;

  const webBase = getPrimaryFrontendBaseUrl();
  const webResetUrl = webBase ? `${webBase}/reset-password?token=${tokenQ}` : '';

  return {
    bridgeUrl,
    appResetUrl,
    appResetUrlAlt,
    androidIntentUrl,
    webResetUrl,
    primaryUrl: bridgeUrl,
    secondaryUrl: webResetUrl || appResetUrl,
  };
}

function passwordResetHtml({ userName, resetUrl, secondaryUrl, expiryHours, supportEmail }) {
  const safeName = String(userName || 'Usuario').replace(/[<>&]/g, '');
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1f2937;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f6fb;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 24px rgba(15,23,42,0.08);">
        <tr><td style="background:#4f6bed;padding:24px 28px;">
          <div style="font-size:22px;font-weight:700;color:#fff;">Turnario</div>
          <div style="margin-top:6px;color:#e0e7ff;font-size:14px;">Restablecimiento de contraseña</div>
        </td></tr>
        <tr><td style="padding:28px;">
          <p style="margin:0 0 12px;font-size:16px;">Hola <strong>${safeName}</strong>,</p>
          <p style="margin:0 0 20px;line-height:1.5;color:#4b5563;">
            Tocá el botón para abrir Turnario y elegir tu nueva contraseña.
            El enlace vence en <strong>${expiryHours} hora(s)</strong>.
          </p>
          <p style="text-align:center;margin:28px 0;">
            <a href="${resetUrl}" style="display:inline-block;background:#4f6bed;color:#fff;text-decoration:none;padding:14px 24px;border-radius:10px;font-weight:600;">
              Restablecer contraseña
            </a>
          </p>
          <p style="margin:0 0 12px;font-size:13px;line-height:1.5;color:#6b7280;">
            Si el botón no responde, abrí este enlace en el navegador del celular:
          </p>
          <p style="margin:0 0 8px;font-size:12px;word-break:break-all;color:#4f6bed;">
            <a href="${resetUrl}" style="color:#4f6bed;">${resetUrl}</a>
          </p>
          <p style="margin:20px 0 0;font-size:13px;color:#9ca3af;">
            Si no pediste este cambio, ignorá este correo. Soporte: ${supportEmail}.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function passwordResetText({ userName, resetUrl, secondaryUrl, expiryHours, supportEmail }) {
  return `Hola ${userName || 'Usuario'},

Para restablecer tu contraseña en Turnario abrí este enlace (vence en ${expiryHours} hora/s):

${resetUrl}

Si no pediste este cambio, ignorá este mensaje.
Soporte: ${supportEmail}
`;
}

class EmailService {
  constructor() {
    this.transporter = null;
    this._ready = this.initialize();
  }

  static getSingleton() {
    if (!EmailService._singleton) {
      EmailService._singleton = new EmailService();
    }
    return EmailService._singleton;
  }

  async ensureReady() {
    await this._ready;
  }

  async initialize() {
    const emailUser = process.env.EMAIL_USER || process.env.SMTP_USER;
    const emailPass = process.env.EMAIL_APP_PASSWORD || process.env.SMTP_PASS;
    const smtpHost = process.env.SMTP_HOST && String(process.env.SMTP_HOST).trim();

    if (!emailUser || !emailPass) {
      if (!process.env.RESEND_API_KEY) {
        console.warn(
          '📧 Email no configurado. Definí EMAIL_USER + EMAIL_APP_PASSWORD (Gmail) o SMTP_* / RESEND_API_KEY.'
        );
      }
      this.transporter = null;
      return;
    }

    try {
      if (smtpHost) {
        this.transporter = nodemailer.createTransport({
          host: smtpHost,
          port: parseInt(String(process.env.SMTP_PORT || '587'), 10) || 587,
          secure: process.env.SMTP_SECURE === 'true',
          auth: { user: emailUser, pass: emailPass },
        });
      } else {
        console.log('📧 Usando transporte Gmail (service: gmail).');
        this.transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: { user: emailUser, pass: emailPass },
        });
      }
      await this.transporter.verify();
      console.log('📧 Servicio de email listo (SMTP).');
    } catch (err) {
      console.error('📧 Error configurando SMTP:', err.message || err);
      this.transporter = null;
    }
  }

  getFromAddress() {
    const from =
      process.env.RESEND_FROM ||
      process.env.EMAIL_FROM ||
      process.env.EMAIL_USER ||
      process.env.SMTP_USER ||
      '';
    const name = process.env.EMAIL_FROM_NAME || 'Turnario';
    const addr = String(from).trim();
    if (!addr) return null;
    if (addr.includes('<')) return addr;
    return `${name} <${addr}>`;
  }

  isConfigured() {
    return Boolean(this.transporter) || Boolean(String(process.env.RESEND_API_KEY || '').trim());
  }

  async sendViaResend({ to, subject, html, text }) {
    const apiKey = String(process.env.RESEND_API_KEY || '').trim();
    if (!apiKey) throw new Error('RESEND_API_KEY no configurada');
    const from = this.getFromAddress() || process.env.RESEND_FROM;
    if (!from) throw new Error('Falta RESEND_FROM / EMAIL_FROM');

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to: [to], subject, html, text }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(body.message || body.error || `Resend HTTP ${res.status}`);
    }
    return body;
  }

  async sendViaSmtp({ to, subject, html, text }) {
    if (!this.transporter) throw new Error('SMTP no disponible');
    const from = this.getFromAddress();
    if (!from) throw new Error('Falta EMAIL_FROM / EMAIL_USER');
    return this.transporter.sendMail({ from, to, subject, html, text });
  }

  async sendPasswordReset(user, resetToken) {
    const to = String(user?.email || '')
      .trim()
      .toLowerCase();
    if (!to) throw new Error('Usuario sin email válido');

    const { primaryUrl, secondaryUrl } = buildResetUrls(resetToken);
    const expiryHours = 1;
    const supportEmail = process.env.SUPPORT_EMAIL || 'soporte@turnario.com';
    const payload = {
      userName: user.fullName || 'Usuario',
      resetUrl: primaryUrl,
      secondaryUrl,
      expiryHours,
      supportEmail,
    };
    console.log('📧 Reset link (bridge HTTP):', primaryUrl);
    const subject = 'Restablecé tu contraseña — Turnario';
    const html = passwordResetHtml(payload);
    const text = passwordResetText(payload);

    const preferResend = Boolean(String(process.env.RESEND_API_KEY || '').trim());
    if (preferResend) {
      try {
        await this.sendViaResend({ to, subject, html, text });
        console.log('📧 Password reset enviado via Resend a', to);
        return { delivery: 'resend' };
      } catch (err) {
        console.warn('📧 Resend falló, intento SMTP:', err.message || err);
      }
    }

    if (this.transporter) {
      await this.sendViaSmtp({ to, subject, html, text });
      console.log('📧 Password reset enviado via SMTP a', to);
      return { delivery: 'smtp' };
    }

    throw new Error('No hay proveedor de email configurado');
  }
}

module.exports = EmailService.getSingleton();
module.exports.buildResetUrls = buildResetUrls;
module.exports.getPublicApiBaseUrl = getPublicApiBaseUrl;
