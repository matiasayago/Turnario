const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs').promises;
const handlebars = require('handlebars');

class EmailService {
  constructor() {
    this.transporter = null;
    this.templates = new Map();
    this.initializeTransporter();
    this.loadEmailTemplates();
  }

  // Inicializar el transportador de emails
  async initializeTransporter() {
    try {
      // Configuración para desarrollo (Gmail)
      if (process.env.NODE_ENV === 'development') {
        this.transporter = nodemailer.createTransporter({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_APP_PASSWORD // Contraseña de aplicación de Gmail
          }
        });
      } else {
        // Configuración para producción (SMTP)
        this.transporter = nodemailer.createTransporter({
          host: process.env.SMTP_HOST,
          port: process.env.SMTP_PORT || 587,
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
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
        'password_reset': this.getPasswordResetTemplate(),
        'payment_confirmation': this.getPaymentConfirmationTemplate(),
        'professional_welcome': this.getProfessionalWelcomeTemplate()
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
      if (!this.transporter) {
        throw new Error('Email service not initialized');
      }

      const template = this.templates.get(templateName);
      if (!template) {
        throw new Error(`Email template '${templateName}' not found`);
      }

      // Renderizar plantilla
      const htmlContent = template(data);
      
      // Configurar opciones del email
      const mailOptions = {
        from: `"${process.env.EMAIL_FROM_NAME || 'Turnario'}" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
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
      rescheduleUrl: `${process.env.FRONTEND_URL}/appointments/new`
    };

    return await this.sendEmail(user.email, subject, 'appointment_cancellation', data);
  }

  // Enviar reset de contraseña
  async sendPasswordReset(user, resetToken) {
    const subject = 'Restablecimiento de contraseña';
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    
    const data = {
      userName: user.fullName,
      resetUrl: resetUrl,
      expiryHours: 24,
      supportEmail: process.env.SUPPORT_EMAIL || 'soporte@turnario.com'
    };

    return await this.sendEmail(user.email, subject, 'password_reset', data);
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

module.exports = EmailService;
