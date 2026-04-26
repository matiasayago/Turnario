const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs').promises;
const handlebars = require('handlebars');

/** FRONTEND_URL a veces viene con varias URLs separadas por coma; el enlace del mail debe ser una sola base válida. */
function getPrimaryFrontendBaseUrl() {
  const raw = String(process.env.FRONTEND_URL || '').trim();
  if (!raw) return '';
  const first = raw.split(',')[0].trim().replace(/\/$/, '');
  return first;
}

class EmailService {
  constructor() {
    this.transporter = null;
    this.templates = new Map();
    /** Una sola promesa: transporte + plantillas listos antes del primer sendMail */
    this._bootstrapPromise = this.bootstrap();
  }

  /** Esperar a que transporter y plantillas estén listos (evita carreras al arranque). */
  async ensureReady() {
    await this._bootstrapPromise;
  }

  async bootstrap() {
    await Promise.all([this.initializeTransporter(), this.loadEmailTemplates()]);
  }

  /**
   * Instancia única compartida por todo el proceso (auth, citas, recordatorios).
   * Evita dos inicializaciones async distintas y estados inconsistentes.
   */
  static getSingleton() {
    if (!EmailService._singleton) {
      EmailService._singleton = new EmailService();
    }
    return EmailService._singleton;
  }

  // Inicializar el transportador de emails
  async initializeTransporter() {
    try {
      const emailUser = process.env.EMAIL_USER || process.env.SMTP_USER;
      const emailPass = process.env.EMAIL_APP_PASSWORD || process.env.SMTP_PASS;

      // Verificar si hay configuración de email
      if (!emailUser || !emailPass) {
        console.log('⚠️ No email configuration found, email service disabled');
        this.transporter = null;
        return;
      }

      const smtpHost = process.env.SMTP_HOST && String(process.env.SMTP_HOST).trim();

      if (smtpHost) {
        this.transporter = nodemailer.createTransport({
          host: smtpHost,
          port: parseInt(String(process.env.SMTP_PORT || '587'), 10) || 587,
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: emailUser,
            pass: emailPass,
          },
        });
      } else {
        if (process.env.NODE_ENV && process.env.NODE_ENV !== 'development') {
          console.log(
            '📧 SMTP_HOST no definido: usando transporte Gmail (service: gmail). Definí SMTP_HOST para otro proveedor.'
          );
        }
        this.transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: emailUser,
            pass: emailPass,
          },
        });
      }

      // Verificar conexión
      await this.transporter.verify();
      console.log('✅ Email service initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing email service:', error);
      this.transporter = null;
    }
  }

  // Cargar plantillas de email
  async loadEmailTemplates() {
    try {
      const templatesDir = path.join(__dirname, '../templates/emails');
      
      // Plantillas básicas integradas
      const basicTemplates = {
        'welcome': this.getWelcomeTemplate(),
        'appointment_confirmation': this.getAppointmentConfirmationTemplate(),
        'appointment_reminder': this.getAppointmentReminderTemplate(),
        'appointment_cancellation': this.getAppointmentCancellationTemplate(),
        'appointment_rejection': this.getAppointmentRejectionTemplate(),
        'password_reset': this.getPasswordResetTemplate(),
        'payment_confirmation': this.getPaymentConfirmationTemplate(),
        'professional_welcome': this.getProfessionalWelcomeTemplate(),
        'professional_new_booking': this.getProfessionalNewBookingTemplate(),
        'professional_patient_cancelled': this.getProfessionalPatientCancelledTemplate(),
        'professional_patient_rescheduled': this.getProfessionalPatientRescheduledTemplate(),
      };

      // Cargar plantillas personalizadas si existen
      try {
        const files = await fs.readdir(templatesDir);
        for (const file of files) {
          if (file.endsWith('.hbs')) {
            const templateName = path.basename(file, '.hbs');
            const templateContent = await fs.readFile(path.join(templatesDir, file), 'utf8');
            this.templates.set(templateName, handlebars.compile(templateContent));
          }
        }
      } catch (error) {
        console.log('No custom email templates found, using built-in templates');
      }

      // Agregar plantillas básicas
      Object.entries(basicTemplates).forEach(([name, template]) => {
        this.templates.set(name, handlebars.compile(template));
      });

      console.log(`📧 Loaded ${this.templates.size} email templates`);
    } catch (error) {
      console.error('Error loading email templates:', error);
    }
  }

  // Enviar email
  async sendEmail(to, subject, templateName, data = {}) {
    try {
      await this.ensureReady();

      if (!this.transporter) {
        throw new Error('Email service not initialized');
      }

      const template = this.templates.get(templateName);
      if (!template) {
        throw new Error(`Email template '${templateName}' not found`);
      }

      // Renderizar plantilla
      const htmlContent = template(data);
      
      const fromEmail =
        String(process.env.EMAIL_FROM || process.env.EMAIL_USER || process.env.SMTP_USER || '')
          .trim();
      if (!fromEmail) {
        throw new Error('Falta EMAIL_FROM, EMAIL_USER o SMTP_USER para el remitente del correo');
      }

      // Configurar opciones del email
      const mailOptions = {
        from: `"${process.env.EMAIL_FROM_NAME || 'Turnario'}" <${fromEmail}>`,
        to: to,
        subject: subject,
        html: htmlContent,
        text: this.htmlToText(htmlContent) // Versión de texto plano
      };

      // Enviar email
      const result = await this.transporter.sendMail(mailOptions);
      console.log(`📧 Email sent successfully to ${to}: ${subject}`);
      
      return {
        success: true,
        messageId: result.messageId,
        to: to,
        subject: subject
      };

    } catch (error) {
      console.error('❌ Error sending email:', error);
      throw error;
    }
  }

  // Enviar email de bienvenida
  async sendWelcomeEmail(user) {
    const subject = '¡Bienvenido a Turnario!';
    const data = {
      userName: user.fullName,
      userType: user.userType === 'client' ? 'cliente' : 'profesional',
      loginUrl: `${process.env.FRONTEND_URL}/login`,
      supportEmail: process.env.SUPPORT_EMAIL || 'soporte@turnario.com'
    };

    return await this.sendEmail(user.email, subject, 'welcome', data);
  }

  // Enviar confirmación de cita
  async sendAppointmentConfirmation(appointment, user) {
    const subject = 'Tu cita ha sido confirmada';
    const data = {
      userName: user.fullName,
      serviceName: appointment.service?.name || 'Servicio',
      professionalName: appointment.professional?.fullName || 'Profesional',
      clinicName: appointment.clinic?.name || 'Clínica',
      date: new Date(appointment.date).toLocaleDateString('es-ES'),
      time: appointment.time,
      address: appointment.clinic?.address || 'Dirección no disponible',
      phone: appointment.clinic?.phone || 'Teléfono no disponible',
      notes: appointment.notes || 'Sin notas adicionales'
    };

    return await this.sendEmail(user.email, subject, 'appointment_confirmation', data);
  }

  // Enviar recordatorio de cita
  async sendAppointmentReminder(appointment, user) {
    const subject = 'Recordatorio: Tienes una cita mañana';
    const data = {
      userName: user.fullName,
      serviceName: appointment.service?.name || 'Servicio',
      professionalName: appointment.professional?.fullName || 'Profesional',
      clinicName: appointment.clinic?.name || 'Clínica',
      date: new Date(appointment.date).toLocaleDateString('es-ES'),
      time: appointment.time,
      address: appointment.clinic?.address || 'Dirección no disponible',
      phone: appointment.clinic?.phone || 'Teléfono no disponible'
    };

    return await this.sendEmail(user.email, subject, 'appointment_reminder', data);
  }

  // Enviar cancelación de cita
  async sendAppointmentCancellation(appointment, user, reason = '') {
    const subject = 'Tu cita ha sido cancelada';
    const data = {
      userName: user.fullName,
      serviceName: appointment.service?.name || 'Servicio',
      professionalName: appointment.professional?.fullName || 'Profesional',
      date: new Date(appointment.date).toLocaleDateString('es-ES'),
      time: appointment.time,
      reason: reason || 'Sin motivo especificado',
      rescheduleUrl: `${process.env.FRONTEND_URL || ''}/appointments/new`
    };

    return await this.sendEmail(user.email, subject, 'appointment_cancellation', data);
  }

  /** Solicitud rechazada por el profesional (cita no confirmada). */
  async sendAppointmentRejection(appointment, user) {
    const subject = 'Tu solicitud de cita no pudo ser confirmada';
    const data = {
      userName: user.fullName,
      serviceName: appointment.service?.name || 'Servicio',
      professionalName: appointment.professional?.fullName || 'Profesional',
      date: new Date(appointment.date).toLocaleDateString('es-ES'),
      time: appointment.time,
      rescheduleUrl: `${process.env.FRONTEND_URL || ''}/appointments/new`
    };

    return await this.sendEmail(user.email, subject, 'appointment_rejection', data);
  }

  /** Paciente solicita turno (misma alerta que notificación in-app al profesional). */
  async sendProfessionalNewBookingEmail(proUser, detail) {
    const requiresDeposit = Boolean(detail.requiresDeposit);
    const subject = requiresDeposit
      ? 'Nueva reserva con seña pendiente — Turnario'
      : 'Nueva solicitud de cita — Turnario';
    const data = {
      professionalName: proUser.fullName || 'Profesional',
      patientName: detail.patientName || 'Paciente',
      serviceName: detail.service || 'Servicio',
      date: detail.date || '',
      time: detail.time || '',
      notes: detail.notes || '',
      requiresDeposit,
      depositAmount: detail.depositAmount != null ? String(detail.depositAmount) : '',
      appointmentId: detail.appointmentId || '',
    };
    return await this.sendEmail(proUser.email, subject, 'professional_new_booking', data);
  }

  async sendProfessionalPatientCancelledEmail(proUser, detail) {
    const subject = 'Turno cancelado por el paciente — Turnario';
    const data = {
      professionalName: proUser.fullName || 'Profesional',
      patientName: detail.patientName || 'Paciente',
      serviceName: detail.service || 'Servicio',
      date: detail.date || '',
      time: detail.time || '',
    };
    return await this.sendEmail(proUser.email, subject, 'professional_patient_cancelled', data);
  }

  async sendProfessionalPatientRescheduledEmail(proUser, detail) {
    const subject = 'Turno reprogramado por el paciente — Turnario';
    const data = {
      professionalName: proUser.fullName || 'Profesional',
      patientName: detail.patientName || 'Paciente',
      serviceName: detail.service || 'Servicio',
      previousDate: detail.previousDate || '',
      previousTime: detail.previousTime || '',
      newDate: detail.newDate || '',
      newTime: detail.newTime || '',
    };
    return await this.sendEmail(proUser.email, subject, 'professional_patient_rescheduled', data);
  }

  // Enviar reset de contraseña
  async sendPasswordReset(user, resetToken) {
    const subject = 'Restablecimiento de contraseña';
    const to = String(user && user.email ? user.email : '')
      .trim()
      .toLowerCase();
    if (!to) {
      throw new Error('Usuario sin email válido para enviar restablecimiento');
    }

    const appScheme = String(process.env.EXPO_APP_SCHEME || 'myapp').trim();
    const appResetUrl = `${appScheme}://reset-password?token=${encodeURIComponent(resetToken)}`;
    const webBase = getPrimaryFrontendBaseUrl();
    const resetUrl = webBase
      ? `${webBase}/reset-password?token=${encodeURIComponent(resetToken)}`
      : appResetUrl;

    const data = {
      userName: user.fullName || 'Usuario',
      resetUrl: resetUrl,
      expiryHours: 24,
      supportEmail: process.env.SUPPORT_EMAIL || 'soporte@turnario.com'
    };

    return await this.sendEmail(to, subject, 'password_reset', data);
  }

  // Enviar confirmación de pago
  async sendPaymentConfirmation(user, paymentData) {
    const subject = 'Confirmación de pago';
    const data = {
      userName: user.fullName,
      amount: paymentData.amount,
      currency: paymentData.currency || 'ARS',
      paymentMethod: paymentData.paymentMethod || 'MercadoPago',
      transactionId: paymentData.transactionId,
      date: new Date().toLocaleDateString('es-ES'),
      serviceName: paymentData.serviceName || 'Servicio',
      appointmentDate: paymentData.appointmentDate ? new Date(paymentData.appointmentDate).toLocaleDateString('es-ES') : 'N/A'
    };

    return await this.sendEmail(user.email, subject, 'payment_confirmation', data);
  }

  // Enviar email de bienvenida para profesionales
  async sendProfessionalWelcomeEmail(user) {
    const subject = '¡Bienvenido como profesional a Turnario!';
    const data = {
      userName: user.fullName,
      service: user.service || 'Servicio',
      dashboardUrl: `${process.env.FRONTEND_URL}/professional/dashboard`,
      supportEmail: process.env.SUPPORT_EMAIL || 'soporte@turnario.com'
    };

    return await this.sendEmail(user.email, subject, 'professional_welcome', data);
  }

  // Enviar email masivo
  async sendBulkEmail(users, subject, templateName, data = {}) {
    const results = [];
    
    for (const user of users) {
      try {
        const userData = { ...data, userName: user.fullName };
        const result = await this.sendEmail(user.email, subject, templateName, userData);
        results.push({ success: true, user: user.email, result });
      } catch (error) {
        results.push({ success: false, user: user.email, error: error.message });
      }
    }

    return results;
  }

  // Convertir HTML a texto plano
  htmlToText(html) {
    return html
      .replace(/<[^>]*>/g, '') // Remover tags HTML
      .replace(/&nbsp;/g, ' ') // Reemplazar espacios no separables
      .replace(/&amp;/g, '&') // Reemplazar entidades HTML
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
  }

  // Plantillas HTML integradas
  getWelcomeTemplate() {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4CAF50; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          .button { display: inline-block; padding: 10px 20px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 ¡Bienvenido a Turnario!</h1>
          </div>
          <div class="content">
            <h2>Hola {{userName}},</h2>
            <p>¡Nos alegra que te hayas unido a Turnario!</p>
            <p>Como {{userType}}, ahora puedes:</p>
            <ul>
              <li>Gestionar tus citas médicas</li>
              <li>Acceder a tu historial completo</li>
              <li>Recibir notificaciones en tiempo real</li>
              <li>Conectarte con profesionales de la salud</li>
            </ul>
            <p style="text-align: center;">
              <a href="{{loginUrl}}" class="button">Acceder a mi cuenta</a>
            </p>
            <p>Si tienes alguna pregunta, no dudes en contactarnos.</p>
          </div>
          <div class="footer">
            <p>Este es un email automático de Turnario. No respondas a este mensaje.</p>
            <p>Soporte: <a href="mailto:{{supportEmail}}">{{supportEmail}}</a></p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getAppointmentConfirmationTemplate() {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2196F3; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .appointment-details { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #2196F3; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Cita Confirmada</h1>
          </div>
          <div class="content">
            <h2>Hola {{userName}},</h2>
            <p>Tu cita ha sido confirmada exitosamente.</p>
            
            <div class="appointment-details">
              <h3>📅 Detalles de la cita:</h3>
              <p><strong>Servicio:</strong> {{serviceName}}</p>
              <p><strong>Profesional:</strong> {{professionalName}}</p>
              <p><strong>Clínica:</strong> {{clinicName}}</p>
              <p><strong>Fecha:</strong> {{date}}</p>
              <p><strong>Hora:</strong> {{time}}</p>
              <p><strong>Dirección:</strong> {{address}}</p>
              <p><strong>Teléfono:</strong> {{phone}}</p>
              {{#if notes}}
              <p><strong>Notas:</strong> {{notes}}</p>
              {{/if}}
            </div>
            
            <p><strong>Recuerda:</strong></p>
            <ul>
              <li>Llega 10 minutos antes de tu cita</li>
              <li>Trae tu documento de identidad</li>
              <li>Si necesitas cancelar, hazlo con al menos 24 horas de anticipación</li>
            </ul>
          </div>
          <div class="footer">
            <p>Este es un email automático de Turnario. No respondas a este mensaje.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getAppointmentReminderTemplate() {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #FF9800; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .reminder-box { background: #FFF3E0; padding: 15px; margin: 15px 0; border: 1px solid #FF9800; border-radius: 5px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⏰ Recordatorio de Cita</h1>
          </div>
          <div class="content">
            <h2>Hola {{userName}},</h2>
            <p>Te recordamos que tienes una cita programada para mañana.</p>
            
            <div class="reminder-box">
              <h3>📅 Tu cita:</h3>
              <p><strong>Servicio:</strong> {{serviceName}}</p>
              <p><strong>Profesional:</strong> {{professionalName}}</p>
              <p><strong>Clínica:</strong> {{clinicName}}</p>
              <p><strong>Fecha:</strong> {{date}}</p>
              <p><strong>Hora:</strong> {{time}}</p>
              <p><strong>Dirección:</strong> {{address}}</p>
              <p><strong>Teléfono:</strong> {{phone}}</p>
            </div>
            
            <p><strong>Preparación:</strong></p>
            <ul>
              <li>Revisa la dirección de la clínica</li>
              <li>Calcula el tiempo de viaje</li>
              <li>Prepara tu documentación</li>
              <li>Llega 10 minutos antes</li>
            </ul>
          </div>
          <div class="footer">
            <p>Este es un email automático de Turnario. No respondas a este mensaje.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getAppointmentCancellationTemplate() {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #F44336; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .cancellation-box { background: #FFEBEE; padding: 15px; margin: 15px 0; border: 1px solid #F44336; border-radius: 5px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>❌ Cita Cancelada</h1>
          </div>
          <div class="content">
            <h2>Hola {{userName}},</h2>
            <p>Tu cita ha sido cancelada.</p>
            
            <div class="cancellation-box">
              <h3>📅 Cita cancelada:</h3>
              <p><strong>Servicio:</strong> {{serviceName}}</p>
              <p><strong>Profesional:</strong> {{professionalName}}</p>
              <p><strong>Fecha:</strong> {{date}}</p>
              <p><strong>Hora:</strong> {{time}}</p>
              <p><strong>Motivo:</strong> {{reason}}</p>
            </div>
            
            <p>Si deseas reprogramar tu cita, puedes hacerlo desde tu cuenta:</p>
            <p style="text-align: center;">
              <a href="{{rescheduleUrl}}" style="display: inline-block; padding: 10px 20px; background: #2196F3; color: white; text-decoration: none; border-radius: 5px;">Reprogramar Cita</a>
            </p>
            
            <p>Si tienes alguna pregunta, no dudes en contactarnos.</p>
          </div>
          <div class="footer">
            <p>Este es un email automático de Turnario. No respondas a este mensaje.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getAppointmentRejectionTemplate() {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #795548; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .box { background: #EFEBE9; padding: 15px; margin: 15px 0; border: 1px solid #795548; border-radius: 5px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Solicitud no confirmada</h1>
          </div>
          <div class="content">
            <h2>Hola {{userName}},</h2>
            <p>El profesional no pudo confirmar tu solicitud para el siguiente turno:</p>
            <div class="box">
              <p><strong>Servicio:</strong> {{serviceName}}</p>
              <p><strong>Profesional:</strong> {{professionalName}}</p>
              <p><strong>Fecha:</strong> {{date}}</p>
              <p><strong>Hora:</strong> {{time}}</p>
            </div>
            <p>Podés buscar otro horario o profesional desde tu cuenta.</p>
            <p style="text-align: center;">
              <a href="{{rescheduleUrl}}" style="display: inline-block; padding: 10px 20px; background: #2196F3; color: white; text-decoration: none; border-radius: 5px;">Nueva reserva</a>
            </p>
          </div>
          <div class="footer">
            <p>Este es un email automático de Turnario. No respondas a este mensaje.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getPasswordResetTemplate() {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #9C27B0; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .reset-box { background: #F3E5F5; padding: 15px; margin: 15px 0; border: 1px solid #9C27B0; border-radius: 5px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Restablecimiento de Contraseña</h1>
          </div>
          <div class="content">
            <h2>Hola {{userName}},</h2>
            <p>Has solicitado restablecer tu contraseña.</p>
            
            <div class="reset-box">
              <p>Para continuar con el proceso, haz clic en el siguiente enlace:</p>
              <p style="text-align: center;">
                <a href="{{resetUrl}}" style="display: inline-block; padding: 10px 20px; background: #9C27B0; color: white; text-decoration: none; border-radius: 5px;">Restablecer Contraseña</a>
              </p>
              <p><strong>Importante:</strong> Este enlace expirará en {{expiryHours}} horas.</p>
            </div>
            
            <p>Si no solicitaste este cambio, puedes ignorar este email.</p>
            <p>Si tienes problemas, contacta a nuestro equipo de soporte.</p>
          </div>
          <div class="footer">
            <p>Este es un email automático de Turnario. No respondas a este mensaje.</p>
            <p>Soporte: <a href="mailto:{{supportEmail}}">{{supportEmail}}</a></p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getPaymentConfirmationTemplate() {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4CAF50; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .payment-box { background: #E8F5E8; padding: 15px; margin: 15px 0; border: 1px solid #4CAF50; border-radius: 5px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>💳 Confirmación de Pago</h1>
          </div>
          <div class="content">
            <h2>Hola {{userName}},</h2>
            <p>Tu pago ha sido procesado exitosamente.</p>
            
            <div class="payment-box">
              <h3>📊 Detalles del pago:</h3>
              <p><strong>Monto:</strong> {{currency}} {{amount}}</p>
              <p><strong>Método de pago:</strong> {{paymentMethod}}</p>
              <p><strong>ID de transacción:</strong> {{transactionId}}</p>
              <p><strong>Fecha:</strong> {{date}}</p>
              {{#if serviceName}}
              <p><strong>Servicio:</strong> {{serviceName}}</p>
              {{/if}}
              {{#if appointmentDate}}
              <p><strong>Fecha de cita:</strong> {{appointmentDate}}</p>
              {{/if}}
            </div>
            
            <p>Tu cita ha sido confirmada. Recibirás un recordatorio 24 horas antes.</p>
            <p>Gracias por confiar en Turnario.</p>
          </div>
          <div class="footer">
            <p>Este es un email automático de Turnario. No respondas a este mensaje.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getProfessionalNewBookingTemplate() {
    return `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #5C6BC0; color: white; padding: 20px; text-align: center; }
          .box { background: #fff; padding: 16px; margin: 12px 0; border-left: 4px solid #5C6BC0; }
          .footer { text-align: center; padding: 16px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header"><h1>Nueva solicitud de cita</h1></div>
          <div class="content">
            <p>Hola {{professionalName}},</p>
            <p><strong>{{patientName}}</strong> solicitó un turno:</p>
            <div class="box">
              <p><strong>Servicio:</strong> {{serviceName}}</p>
              <p><strong>Fecha:</strong> {{date}}</p>
              <p><strong>Hora:</strong> {{time}}</p>
              {{#if notes}}<p><strong>Notas:</strong> {{notes}}</p>{{/if}}
            </div>
            {{#if requiresDeposit}}
            <p>La reserva incluye seña de <strong>\${{depositAmount}}</strong>. El turno se confirma cuando el paciente pague en la app.</p>
            {{else}}
            <p>Ingresá a Turnario → <strong>Notificaciones</strong> para confirmar o rechazar la solicitud.</p>
            {{/if}}
          </div>
          <div class="footer">Email automático de Turnario.</div>
        </div>
      </body>
      </html>
    `;
  }

  getProfessionalPatientCancelledTemplate() {
    return `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #E53935; color: white; padding: 20px; text-align: center; }
          .box { background: #FFEBEE; padding: 16px; margin: 12px 0; border-radius: 6px; }
          .footer { text-align: center; padding: 16px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header"><h1>Turno cancelado por el paciente</h1></div>
          <div class="content">
            <p>Hola {{professionalName}},</p>
            <p><strong>{{patientName}}</strong> canceló esta cita:</p>
            <div class="box">
              <p><strong>Servicio:</strong> {{serviceName}}</p>
              <p><strong>Fecha:</strong> {{date}}</p>
              <p><strong>Hora:</strong> {{time}}</p>
            </div>
          </div>
          <div class="footer">Email automático de Turnario.</div>
        </div>
      </body>
      </html>
    `;
  }

  getProfessionalPatientRescheduledTemplate() {
    return `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #FB8C00; color: white; padding: 20px; text-align: center; }
          .box { background: #FFF3E0; padding: 16px; margin: 12px 0; border-radius: 6px; }
          .footer { text-align: center; padding: 16px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header"><h1>Turno reprogramado por el paciente</h1></div>
          <div class="content">
            <p>Hola {{professionalName}},</p>
            <p><strong>{{patientName}}</strong> cambió la fecha/hora del servicio <strong>{{serviceName}}</strong>:</p>
            <div class="box">
              <p><strong>Antes:</strong> {{previousDate}} — {{previousTime}}</p>
              <p><strong>Ahora:</strong> {{newDate}} — {{newTime}}</p>
            </div>
          </div>
          <div class="footer">Email automático de Turnario.</div>
        </div>
      </body>
      </html>
    `;
  }

  getProfessionalWelcomeTemplate() {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2196F3; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>👨‍⚕️ ¡Bienvenido como Profesional!</h1>
          </div>
          <div class="content">
            <h2>Hola {{userName}},</h2>
            <p>¡Felicitaciones! Has sido aprobado como profesional en Turnario.</p>
            
            <p><strong>Tu especialidad:</strong> {{service}}</p>
            
            <p>Como profesional, ahora puedes:</p>
            <ul>
              <li>Gestionar tu agenda de citas</li>
              <li>Recibir solicitudes de pacientes</li>
              <li>Confirmar o cancelar citas</li>
              <li>Acceder a tu panel profesional</li>
              <li>Gestionar tu perfil y disponibilidad</li>
            </ul>
            
            <p style="text-align: center;">
              <a href="{{dashboardUrl}}" style="display: inline-block; padding: 10px 20px; background: #2196F3; color: white; text-decoration: none; border-radius: 5px;">Acceder al Panel</a>
            </p>
            
            <p>Si tienes alguna pregunta sobre el funcionamiento, no dudes en contactarnos.</p>
          </div>
          <div class="footer">
            <p>Este es un email automático de Turnario. No respondas a este mensaje.</p>
            <p>Soporte: <a href="mailto:{{supportEmail}}">{{supportEmail}}</a></p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

EmailService._singleton = null;

module.exports = EmailService;
