const mercadopago = require('mercadopago');
const logger = require('../config/logger');

class PaymentService {
  constructor() {
    this.initializeMercadoPago();
  }

  // Inicializar MercadoPago
  initializeMercadoPago() {
    try {
      mercadopago.configure({
        access_token: process.env.MERCADOPAGO_ACCESS_TOKEN
      });
      
      logger.info('✅ MercadoPago configurado exitosamente');
      
    } catch (error) {
      logger.error('❌ Error configurando MercadoPago:', error);
    }
  }

  // Crear preferencia de pago
  async createPaymentPreference(paymentData) {
    try {
      const {
        appointmentId,
        amount,
        description,
        clientEmail,
        clientName,
        clientPhone,
        professionalName,
        serviceName,
        externalReference
      } = paymentData;

      // Validar datos requeridos
      if (!amount || !description || !clientEmail) {
        throw new Error('Datos de pago incompletos');
      }

      // Crear preferencia de pago
      const preference = {
        items: [
          {
            title: serviceName || 'Servicio Turnario',
            description: description,
            quantity: 1,
            unit_price: parseFloat(amount)
          }
        ],
        payer: {
          name: clientName || 'Cliente',
          email: clientEmail,
          phone: {
            number: clientPhone || ''
          }
        },
        external_reference: externalReference || appointmentId,
        notification_url: `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/v1/payments/webhook`,
        back_urls: {
          success: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/success`,
          failure: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/failure`,
          pending: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/pending`
        },
        auto_return: 'approved',
        expires: true,
        expiration_date_from: new Date().toISOString(),
        expiration_date_to: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 horas
        statement_descriptor: 'TURNARIO',
        binary_mode: true // Solo pagos aprobados o rechazados
      };

      // Crear preferencia en MercadoPago
      const response = await mercadopago.preferences.create(preference);

      logger.logPayment('preference_created', externalReference || appointmentId, amount, 'pending', {
        preferenceId: response.body.id,
        clientEmail,
        professionalName
      });

      return {
        preferenceId: response.body.id,
        initPoint: response.body.init_point,
        sandboxInitPoint: response.body.sandbox_init_point,
        externalReference: externalReference || appointmentId
      };

    } catch (error) {
      logger.error('Error creando preferencia de pago:', error);
      throw new Error('Error creando preferencia de pago');
    }
  }

  // Procesar pago con tarjeta
  async processCardPayment(paymentData) {
    try {
      const {
        amount,
        description,
        cardToken,
        installments,
        paymentMethodId,
        clientEmail,
        clientName,
        externalReference
      } = paymentData;

      // Validar datos requeridos
      if (!amount || !description || !cardToken || !paymentMethodId) {
        throw new Error('Datos de pago con tarjeta incompletos');
      }

      // Crear pago
      const payment = {
        transaction_amount: parseFloat(amount),
        token: cardToken,
        description: description,
        installments: installments || 1,
        payment_method_id: paymentMethodId,
        payer: {
          email: clientEmail || 'cliente@turnario.com',
          identification: {
            type: 'DNI',
            number: '12345678'
          }
        },
        external_reference: externalReference,
        notification_url: `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/v1/payments/webhook`
      };

      // Procesar pago
      const response = await mercadopago.payment.save(payment);

      logger.logPayment('card_payment_processed', externalReference, amount, response.body.status, {
        paymentId: response.body.id,
        clientEmail,
        paymentMethodId
      });

      return {
        paymentId: response.body.id,
        status: response.body.status,
        statusDetail: response.body.status_detail,
        externalReference: response.body.external_reference,
        transactionAmount: response.body.transaction_amount,
        paymentMethodId: response.body.payment_method_id,
        installments: response.body.installments,
        createdAt: response.body.date_created
      };

    } catch (error) {
      logger.error('Error procesando pago con tarjeta:', error);
      throw new Error('Error procesando pago con tarjeta');
    }
  }

  // Procesar pago en efectivo
  async processCashPayment(paymentData) {
    try {
      const {
        amount,
        description,
        paymentMethodId,
        clientEmail,
        clientName,
        externalReference
      } = paymentData;

      // Validar datos requeridos
      if (!amount || !description || !paymentMethodId) {
        throw new Error('Datos de pago en efectivo incompletos');
      }

      // Crear pago en efectivo
      const payment = {
        transaction_amount: parseFloat(amount),
        description: description,
        payment_method_id: paymentMethodId,
        payer: {
          email: clientEmail || 'cliente@turnario.com',
          identification: {
            type: 'DNI',
            number: '12345678'
          }
        },
        external_reference: externalReference,
        notification_url: `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/v1/payments/webhook`
      };

      // Procesar pago
      const response = await mercadopago.payment.save(payment);

      logger.logPayment('cash_payment_processed', externalReference, amount, response.body.status, {
        paymentId: response.body.id,
        clientEmail,
        paymentMethodId
      });

      return {
        paymentId: response.body.id,
        status: response.body.status,
        statusDetail: response.body.status_detail,
        externalReference: response.body.external_reference,
        transactionAmount: response.body.transaction_amount,
        paymentMethodId: response.body.payment_method_id,
        createdAt: response.body.date_created
      };

    } catch (error) {
      logger.error('Error procesando pago en efectivo:', error);
      throw new Error('Error procesando pago en efectivo');
    }
  }

  // Obtener información de un pago
  async getPaymentInfo(paymentId) {
    try {
      const response = await mercadopago.payment.get(paymentId);

      logger.logPayment('payment_info_retrieved', paymentId, response.body.transaction_amount, response.body.status, {
        externalReference: response.body.external_reference
      });

      return {
        paymentId: response.body.id,
        status: response.body.status,
        statusDetail: response.body.status_detail,
        externalReference: response.body.external_reference,
        transactionAmount: response.body.transaction_amount,
        paymentMethodId: response.body.payment_method_id,
        installments: response.body.installments,
        createdAt: response.body.date_created,
        lastModified: response.body.last_modified,
        payer: response.body.payer,
        paymentMethod: response.body.payment_method
      };

    } catch (error) {
      logger.error('Error obteniendo información de pago:', error);
      throw new Error('Error obteniendo información de pago');
    }
  }

  // Reembolsar pago
  async refundPayment(paymentId, amount = null, reason = 'Reembolso solicitado') {
    try {
      let refundData = {};

      if (amount) {
        // Reembolso parcial
        refundData = {
          amount: parseFloat(amount)
        };
      }

      const response = await mercadopago.refund.create(paymentId, refundData);

      logger.logPayment('payment_refunded', paymentId, amount || 'full', 'refunded', {
        refundId: response.body.id,
        reason
      });

      return {
        refundId: response.body.id,
        paymentId: response.body.payment_id,
        amount: response.body.amount,
        status: response.body.status,
        createdAt: response.body.date_created
      };

    } catch (error) {
      logger.error('Error reembolsando pago:', error);
      throw new Error('Error procesando reembolso');
    }
  }

  // Obtener métodos de pago disponibles
  async getPaymentMethods() {
    try {
      const response = await mercadopago.payment_methods.list();

      const paymentMethods = response.body.map(method => ({
        id: method.id,
        name: method.name,
        paymentTypeId: method.payment_type_id,
        status: method.status,
        secureThumbnail: method.secure_thumbnail,
        thumbnail: method.thumbnail,
        minAccreditationDays: method.min_accreditation_days,
        maxAccreditationDays: method.max_accreditation_days
      }));

      logger.info('✅ Métodos de pago obtenidos exitosamente');

      return paymentMethods;

    } catch (error) {
      logger.error('Error obteniendo métodos de pago:', error);
      throw new Error('Error obteniendo métodos de pago');
    }
  }

  // Obtener métodos de pago por tipo
  async getPaymentMethodsByType(paymentTypeId) {
    try {
      const response = await mercadopago.payment_methods.list();

      const filteredMethods = response.body
        .filter(method => method.payment_type_id === paymentTypeId)
        .map(method => ({
          id: method.id,
          name: method.name,
          paymentTypeId: method.payment_type_id,
          status: method.status,
          secureThumbnail: method.secure_thumbnail,
          thumbnail: method.thumbnail,
          minAccreditationDays: method.min_accreditation_days,
          maxAccreditationDays: method.max_accreditation_days
        }));

      return filteredMethods;

    } catch (error) {
      logger.error('Error obteniendo métodos de pago por tipo:', error);
      throw new Error('Error obteniendo métodos de pago por tipo');
    }
  }

  // Obtener información de cuotas
  async getInstallments(paymentMethodId, amount, issuerId = null) {
    try {
      const params = {
        payment_method_id: paymentMethodId,
        amount: parseFloat(amount)
      };

      if (issuerId) {
        params.issuer_id = issuerId;
      }

      const response = await mercadopago.payment_methods.installments(params);

      const installments = response.body.map(installment => ({
        installments: installment.installments,
        amount: installment.installment_amount,
        totalAmount: installment.total_amount,
        installmentRate: installment.installment_rate,
        discountRate: installment.discount_rate,
        labels: installment.labels
      }));

      return installments;

    } catch (error) {
      logger.error('Error obteniendo información de cuotas:', error);
      throw new Error('Error obteniendo información de cuotas');
    }
  }

  // Obtener bancos emisores
  async getCardIssuers(paymentMethodId) {
    try {
      const response = await mercadopago.card_issuers.list(paymentMethodId);

      const issuers = response.body.map(issuer => ({
        id: issuer.id,
        name: issuer.name,
        secureThumbnail: issuer.secure_thumbnail,
        thumbnail: issuer.thumbnail
      }));

      return issuers;

    } catch (error) {
      logger.error('Error obteniendo bancos emisores:', error);
      throw new Error('Error obteniendo bancos emisores');
    }
  }

  // Crear token de tarjeta
  async createCardToken(cardData) {
    try {
      const {
        cardNumber,
        securityCode,
        expirationMonth,
        expirationYear,
        cardholderName,
        identificationType,
        identificationNumber
      } = cardData;

      // Validar datos de tarjeta
      if (!cardNumber || !securityCode || !expirationMonth || !expirationYear || !cardholderName) {
        throw new Error('Datos de tarjeta incompletos');
      }

      // Crear token
      const token = await mercadopago.card_token.create({
        card_number: cardNumber,
        security_code: securityCode,
        expiration_month: expirationMonth,
        expiration_year: expirationYear,
        cardholder: {
          name: cardholderName,
          identification: {
            type: identificationType || 'DNI',
            number: identificationNumber || '12345678'
          }
        }
      });

      logger.info('✅ Token de tarjeta creado exitosamente');

      return {
        tokenId: token.body.id,
        cardId: token.body.card_id,
        lastFourDigits: token.body.last_four_digits,
        expirationMonth: token.body.expiration_month,
        expirationYear: token.body.expiration_year,
        cardholderName: token.body.cardholder.name
      };

    } catch (error) {
      logger.error('Error creando token de tarjeta:', error);
      throw new Error('Error creando token de tarjeta');
    }
  }

  // Validar webhook de MercadoPago
  validateWebhook(data, signature) {
    try {
      // En producción, validar la firma del webhook
      if (process.env.NODE_ENV === 'production') {
        // Implementar validación de firma
        // Por ahora, solo validar que los datos existan
        if (!data || !data.data || !data.data.id) {
          return false;
        }
      }

      return true;

    } catch (error) {
      logger.error('Error validando webhook:', error);
      return false;
    }
  }

  // Procesar webhook de MercadoPago
  async processWebhook(webhookData) {
    try {
      if (!webhookData || !webhookData.data || !webhookData.data.id) {
        throw new Error('Datos de webhook inválidos');
      }

      const paymentId = webhookData.data.id;
      const paymentInfo = await this.getPaymentInfo(paymentId);

      logger.logPayment('webhook_processed', paymentId, paymentInfo.transactionAmount, paymentInfo.status, {
        externalReference: paymentInfo.externalReference,
        webhookType: webhookData.type
      });

      return {
        paymentId,
        status: paymentInfo.status,
        externalReference: paymentInfo.externalReference,
        amount: paymentInfo.transactionAmount,
        processedAt: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Error procesando webhook:', error);
      throw new Error('Error procesando webhook');
    }
  }

  // Obtener estadísticas de pagos
  async getPaymentStats(filters = {}) {
    try {
      // Implementar lógica para obtener estadísticas
      // Por ahora, retornar datos básicos
      return {
        totalPayments: 0,
        totalAmount: 0,
        successfulPayments: 0,
        failedPayments: 0,
        pendingPayments: 0,
        averageAmount: 0
      };

    } catch (error) {
      logger.error('Error obteniendo estadísticas de pagos:', error);
      throw new Error('Error obteniendo estadísticas de pagos');
    }
  }

  // Verificar estado del servicio
  async checkServiceStatus() {
    try {
      // Verificar configuración de MercadoPago
      if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
        return {
          status: 'not_configured',
          message: 'MercadoPago no está configurado'
        };
      }

      // Intentar obtener métodos de pago para verificar conectividad
      await this.getPaymentMethods();

      return {
        status: 'healthy',
        message: 'Servicio de pagos funcionando correctamente'
      };

    } catch (error) {
      return {
        status: 'error',
        message: `Error en servicio de pagos: ${error.message}`
      };
    }
  }
}

module.exports = new PaymentService();
