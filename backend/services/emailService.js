const nodemailer = require('nodemailer');
const handlebars = require('handlebars');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../config/logger');

class EmailService {
  constructor() {
    this.transporter = null;
    this.templates = {};
    this.initializeTransporter();
    this.loadTemplates();
  }

  async initializeTransporter() {
    try {
      // Solo configurar email si hay credenciales
      if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        logger.warn('⚠️ Credenciales de email no configuradas, servicio de email deshabilitado');
        this.transporter = null;
        return;
      }

      // Configuración del transportador
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: false, // true para 465, false para otros puertos
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      // Verificar conexión
      await this.transporter.verify();
      logger.info('✅ Servicio de email configurado exitosamente');
      
    } catch (error) {
      logger.error('❌ Error configurando servicio de email:', error);
      // No fallar la aplicación si el email no funciona
    }
  }

  async loadTemplates() {
    try {
      const templatesDir = path.join(__dirname, '../templates/emails');
      
      // Cargar plantillas básicas
      const templateFiles = [
        'verification.html',
        'password-reset.html',
        'appointment-confirmation.html',
        'appointment-reminder.html',
        'appointment-cancellation.html',
        'welcome.html',
        'notification.html'
      ];

      for (const file of templateFiles) {
        try {
          const templatePath = path.join(templatesDir, file);
          const templateContent = await fs.readFile(templatePath, 'utf8');
          const templateName = path.basename(file, '.html');
          this.templates[templateName] = handlebars.compile(templateContent);
        } catch (error) {
          // Si no existe la plantilla, usar una básica
          logger.warn(`Plantilla ${file} no encontrada, usando plantilla básica`);
          this.templates[path.basename(file, '.html')] = this.getBasicTemplate();
        }
      }

      logger.info('✅ Plantillas de email cargadas');
      
    } catch (error) {
      logger.error('❌ Error cargando plantillas de email:', error);
      // Usar plantillas básicas si falla la carga
      this.setupBasicTemplates();
    }
  }

  setupBasicTemplates() {
    // Plantillas básicas de respaldo
    this.templates = {
      verification: this.getBasicTemplate(),
      'password-reset': this.getBasicTemplate(),
      'appointment-confirmation': this.getBasicTemplate(),
      'appointment-reminder': this.getBasicTemplate(),
      'appointment-cancellation': this.getBasicTemplate(),
      welcome: this.getBasicTemplate(),
      notification: this.getBasicTemplate()
    };
  }

  getBasicTemplate() {
    return handlebars.compile(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>{{title}}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #007bff; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          .button { display: inline-block; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>{{title}}</h1>
          </div>
          <div class="content">
            <p>{{message}}</p>
            {{#if actionUrl}}
            <p style="text-align: center;">
              <a href="{{actionUrl}}" class="button">{{actionText}}</a>
            </p>
            {{/if}}
          </div>
          <div class="footer">
            <p>Este email fue enviado por Turnario</p>
            <p>Si no solicitaste este email, puedes ignorarlo</p>
          </div>
        </div>
      </body>
      </html>
    `);
  }

  async sendEmail(to, subject, html, text = null) {
    try {
      if (!this.transporter) {
        throw new Error('Transportador de email no configurado');
      }

      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@turnario.com',
        to: to,
        subject: subject,
        html: html,
        text: text || this.htmlToText(html)
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      logger.logEmail('email_sent', to, true, {
        messageId: result.messageId,
        subject
      });

      return result;
      
    } catch (error) {
      logger.logEmail('email_failed', to, false, {
        error: error.message,
        subject
      });
      throw error;
    }
  }

  htmlToText(html) {
    // Conversión básica de HTML a texto plano
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
  }

  // Email de verificación
  async sendEmailVerification(email, token, fullName) {
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${token}`;
    
    const templateData = {
      title: 'Verifica tu email',
      message: `Hola ${fullName}, gracias por registrarte en Turnario. Por favor verifica tu email haciendo clic en el botón de abajo.`,
      actionUrl: verificationUrl,
      actionText: 'Verificar Email'
    };

    const html = this.templates.verification(templateData);
    const subject = 'Verifica tu email - Turnario';

    return this.sendEmail(email, subject, html);
  }

  // Email de reset de contraseña
  async sendPasswordReset(email, token, fullName) {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
    
    const templateData = {
      title: 'Recupera tu contraseña',
      message: `Hola ${fullName}, has solicitado recuperar tu contraseña. Haz clic en el botón de abajo para crear una nueva contraseña.`,
      actionUrl: resetUrl,
      actionText: 'Cambiar Contraseña'
    };

    const html = this.templates['password-reset'](templateData);
    const subject = 'Recupera tu contraseña - Turnario';

    return this.sendEmail(email, subject, html);
  }

  // Email de confirmación de cita
  async sendAppointmentConfirmation(email, fullName, appointmentData) {
    const templateData = {
      title: 'Cita confirmada',
      message: `Hola ${fullName}, tu cita ha sido confirmada exitosamente. Detalles: ${appointmentData.service} el ${appointmentData.date} a las ${appointmentData.time}.`,
      actionUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/appointments/${appointmentData.id}`,
      actionText: 'Ver Cita'
    };

    const html = this.templates['appointment-confirmation'](templateData);
    const subject = 'Cita confirmada - Turnario';

    return this.sendEmail(email, subject, html);
  }

  // Email de recordatorio de cita
  async sendAppointmentReminder(email, fullName, appointmentData) {
    const templateData = {
      title: 'Recordatorio de cita',
      message: `Hola ${fullName}, te recordamos que tienes una cita mañana: ${appointmentData.service} el ${appointmentData.date} a las ${appointmentData.time}.`,
      actionUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/appointments/${appointmentData.id}`,
      actionText: 'Ver Cita'
    };

    const html = this.templates['appointment-reminder'](templateData);
    const subject = 'Recordatorio de cita - Turnario';

    return this.sendEmail(email, subject, html);
  }

  // Email de cancelación de cita
  async sendAppointmentCancellation(email, fullName, appointmentData, reason = '') {
    const templateData = {
      title: 'Cita cancelada',
      message: `Hola ${fullName}, tu cita ha sido cancelada. ${reason ? `Motivo: ${reason}` : ''}`,
      actionUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/appointments`,
      actionText: 'Agendar Nueva Cita'
    };

    const html = this.templates['appointment-cancellation'](templateData);
    const subject = 'Cita cancelada - Turnario';

    return this.sendEmail(email, subject, html);
  }

  // Email de bienvenida
  async sendWelcomeEmail(email, fullName, userType) {
    const templateData = {
      title: '¡Bienvenido a Turnario!',
      message: `Hola ${fullName}, ¡bienvenido a Turnario! Tu cuenta de ${userType} ha sido creada exitosamente.`,
      actionUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard`,
      actionText: 'Ir al Dashboard'
    };

    const html = this.templates.welcome(templateData);
    const subject = '¡Bienvenido a Turnario!';

    return this.sendEmail(email, subject, html);
  }

  // Email de notificación general
  async sendNotification(email, fullName, notificationData) {
    const templateData = {
      title: notificationData.title || 'Nueva notificación',
      message: `Hola ${fullName}, ${notificationData.message}`,
      actionUrl: notificationData.actionUrl || null,
      actionText: notificationData.actionText || null
    };

    const html = this.templates.notification(templateData);
    const subject = notificationData.title || 'Nueva notificación - Turnario';

    return this.sendEmail(email, subject, html);
  }

  // Email de autorización médica
  async sendMedicalAuthorizationRequest(email, fullName, authorizationData) {
    const templateData = {
      title: 'Solicitud de autorización médica',
      message: `Hola ${fullName}, has recibido una solicitud de autorización médica de ${authorizationData.professionalName}.`,
      actionUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/medical-authorizations`,
      actionText: 'Revisar Solicitud'
    };

    const html = this.templates.notification(templateData);
    const subject = 'Solicitud de autorización médica - Turnario';

    return this.sendEmail(email, subject, html);
  }

  // Email de confirmación de autorización médica
  async sendMedicalAuthorizationGranted(email, fullName, authorizationData) {
    const templateData = {
      title: 'Autorización médica aprobada',
      message: `Hola ${fullName}, tu solicitud de autorización médica ha sido aprobada por ${authorizationData.patientName}.`,
      actionUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/medical-history`,
      actionText: 'Ver Historial'
    };

    const html = this.templates.notification(templateData);
    const subject = 'Autorización médica aprobada - Turnario';

    return this.sendEmail(email, subject, html);
  }

  // Email de pago exitoso
  async sendPaymentSuccess(email, fullName, paymentData) {
    const templateData = {
      title: 'Pago exitoso',
      message: `Hola ${fullName}, tu pago de $${paymentData.amount} ha sido procesado exitosamente.`,
      actionUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payments/${paymentData.id}`,
      actionText: 'Ver Recibo'
    };

    const html = this.templates.notification(templateData);
    const subject = 'Pago exitoso - Turnario';

    return this.sendEmail(email, subject, html);
  }

  // Email de pago fallido
  async sendPaymentFailed(email, fullName, paymentData) {
    const templateData = {
      title: 'Pago fallido',
      message: `Hola ${fullName}, tu pago de $${paymentData.amount} no pudo ser procesado. Por favor intenta nuevamente.`,
      actionUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payments/retry/${paymentData.id}`,
      actionText: 'Reintentar Pago'
    };

    const html = this.templates.notification(templateData);
    const subject = 'Pago fallido - Turnario';

    return this.sendEmail(email, subject, html);
  }

  // Email de nueva reseña
  async sendNewReviewNotification(email, fullName, reviewData) {
    const templateData = {
      title: 'Nueva reseña recibida',
      message: `Hola ${fullName}, has recibido una nueva reseña de ${reviewData.clientName} con ${reviewData.rating} estrellas.`,
      actionUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reviews/${reviewData.id}`,
      actionText: 'Ver Reseña'
    };

    const html = this.templates.notification(templateData);
    const subject = 'Nueva reseña - Turnario';

    return this.sendEmail(email, subject, html);
  }

  // Email de chat
  async sendChatNotification(email, fullName, chatData) {
    const templateData = {
      title: 'Nuevo mensaje',
      message: `Hola ${fullName}, tienes un nuevo mensaje de ${chatData.senderName}.`,
      actionUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/chat/${chatData.conversationId}`,
      actionText: 'Ver Mensaje'
    };

    const html = this.templates.notification(templateData);
    const subject = 'Nuevo mensaje - Turnario';

    return this.sendEmail(email, subject, html);
  }

  // Método para enviar emails en lote
  async sendBulkEmails(emails, subject, templateName, templateData) {
    try {
      const template = this.templates[templateName];
      if (!template) {
        throw new Error(`Plantilla ${templateName} no encontrada`);
      }

      const html = template(templateData);
      const promises = emails.map(email => this.sendEmail(email, subject, html));
      
      const results = await Promise.allSettled(promises);
      
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      logger.info(`✅ Emails enviados en lote: ${successful} exitosos, ${failed} fallidos`);
      
      return { successful, failed, results };
      
    } catch (error) {
      logger.error('❌ Error enviando emails en lote:', error);
      throw error;
    }
  }

  // Método para verificar el estado del servicio
  async checkStatus() {
    try {
      if (!this.transporter) {
        return { status: 'not_configured', message: 'Transportador no configurado' };
      }

      await this.transporter.verify();
      return { status: 'healthy', message: 'Servicio funcionando correctamente' };
      
    } catch (error) {
      return { status: 'error', message: error.message };
    }
  }
}

module.exports = new EmailService();
