const mercadopago = require('mercadopago');
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const Clinic = require('../models/Clinic');

class MercadoPagoService {
  constructor() {
    this.initializeMercadoPago();
  }

  // Inicializar MercadoPago
  initializeMercadoPago() {
    try {
      mercadopago.configure({
        access_token: process.env.MERCADOPAGO_ACCESS_TOKEN
      });
      console.log('✅ MercadoPago service initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing MercadoPago:', error);
    }
  }

  // Crear preferencia de pago
  async createPaymentPreference(paymentData) {
    try {
      const {
        appointmentId,
        clientId,
        professionalId,
        serviceId,
        amount,
        description,
        externalReference
      } = paymentData;

      // Obtener información de la cita
      const appointment = await Appointment.findById(appointmentId)
        .populate('client', 'fullName email')
        .populate('professional', 'fullName')
        .populate('service', 'name')
        .populate('clinic', 'name');

      if (!appointment) {
        throw new Error('Appointment not found');
      }

      // Crear preferencia de pago
      const preference = {
        items: [
          {
            id: appointmentId,
            title: `Cita - ${appointment.service?.name || 'Servicio'}`,
            description: description || `Cita con ${appointment.professional?.fullName || 'Profesional'}`,
            quantity: 1,
            unit_price: parseFloat(amount),
            currency_id: 'ARS',
            category_id: 'health'
          }
        ],
        payer: {
          name: appointment.client?.fullName || 'Cliente',
          email: appointment.client?.email || 'cliente@turnario.com'
        },
        external_reference: externalReference || appointmentId,
        notification_url: `${process.env.BACKEND_URL}/api/payments/webhook`,
        back_urls: {
          success: `${process.env.FRONTEND_URL}/payment/success?appointment_id=${appointmentId}`,
          failure: `${process.env.FRONTEND_URL}/payment/failure?appointment_id=${appointmentId}`,
          pending: `${process.env.FRONTEND_URL}/payment/pending?appointment_id=${appointmentId}`
        },
        auto_return: 'approved',
        expires: true,
        expiration_date_from: new Date().toISOString(),
        expiration_date_to: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 horas
        statement_descriptor: 'TURNARIO',
        binary_mode: true, // Solo pagos aprobados o rechazados
        payment_methods: {
          excluded_payment_types: [
            { id: 'ticket' } // Excluir pagos en efectivo por defecto
          ],
          installments: 12 // Máximo 12 cuotas
        }
      };

      const response = await mercadopago.preferences.create(preference);
      
      console.log('✅ Payment preference created:', response.id);
      
      return {
        preferenceId: response.id,
        initPoint: response.init_point,
        sandboxInitPoint: response.sandbox_init_point,
        appointmentId: appointmentId,
        amount: amount,
        status: 'pending'
      };

    } catch (error) {
      console.error('❌ Error creating payment preference:', error);
      throw error;
    }
  }

  // Procesar pago con tarjeta
  async processCardPayment(paymentData) {
    try {
      const {
        appointmentId,
        cardToken,
        installments,
        paymentMethodId,
        transactionAmount,
        description,
        payerEmail
      } = paymentData;

      // Crear pago
      const payment = {
        transaction_amount: parseFloat(transactionAmount),
        token: cardToken,
        description: description || `Pago de cita ${appointmentId}`,
        installments: parseInt(installments) || 1,
        payment_method_id: paymentMethodId,
        payer: {
          email: payerEmail
        },
        external_reference: appointmentId,
        notification_url: `${process.env.BACKEND_URL}/api/payments/webhook`
      };

      const response = await mercadopago.payment.save(payment);
      
      console.log('✅ Card payment processed:', response.id);
      
      return {
        paymentId: response.id,
        status: response.status,
        statusDetail: response.status_detail,
        transactionAmount: response.transaction_amount,
        appointmentId: appointmentId
      };

    } catch (error) {
      console.error('❌ Error processing card payment:', error);
      throw error;
    }
  }

  // Procesar pago con PIX (Brasil)
  async processPixPayment(paymentData) {
    try {
      const {
        appointmentId,
        transactionAmount,
        description,
        payerEmail,
        payerFirstName,
        payerLastName,
        payerIdentification
      } = paymentData;

      const payment = {
        transaction_amount: parseFloat(transactionAmount),
        description: description || `Pago de cita ${appointmentId}`,
        payment_method_id: 'pix',
        payer: {
          email: payerEmail,
          first_name: payerFirstName,
          last_name: payerLastName,
          identification: {
            type: payerIdentification.type || 'CPF',
            number: payerIdentification.number
          }
        },
        external_reference: appointmentId,
        notification_url: `${process.env.BACKEND_URL}/api/payments/webhook`
      };

      const response = await mercadopago.payment.save(payment);
      
      console.log('✅ PIX payment processed:', response.id);
      
      return {
        paymentId: response.id,
        status: response.status,
        qrCode: response.point_of_interaction?.transaction_data?.qr_code,
        qrCodeBase64: response.point_of_interaction?.transaction_data?.qr_code_base64,
        appointmentId: appointmentId
      };

    } catch (error) {
      console.error('❌ Error processing PIX payment:', error);
      throw error;
    }
  }

  // Obtener información de un pago
  async getPaymentInfo(paymentId) {
    try {
      const payment = await mercadopago.payment.findById(paymentId);
      
      return {
        id: payment.id,
        status: payment.status,
        statusDetail: payment.status_detail,
        transactionAmount: payment.transaction_amount,
        transactionDetails: payment.transaction_details,
        externalReference: payment.external_reference,
        paymentMethod: payment.payment_method,
        payer: payment.payer,
        created: payment.date_created,
        lastModified: payment.date_last_updated
      };

    } catch (error) {
      console.error('❌ Error getting payment info:', error);
      throw error;
    }
  }

  // Obtener pagos de una cita
  async getAppointmentPayments(appointmentId) {
    try {
      const payments = await mercadopago.payment.search({
        external_reference: appointmentId
      });

      return payments.results.map(payment => ({
        id: payment.id,
        status: payment.status,
        statusDetail: payment.status_detail,
        transactionAmount: payment.transaction_amount,
        paymentMethod: payment.payment_method,
        created: payment.date_created
      }));

    } catch (error) {
      console.error('❌ Error getting appointment payments:', error);
      throw error;
    }
  }

  // Reembolsar pago
  async refundPayment(paymentId, amount = null, reason = '') {
    try {
      const refundData = {
        amount: amount ? parseFloat(amount) : undefined
      };

      const refund = await mercadopago.refund.create(paymentId, refundData);
      
      console.log('✅ Payment refunded:', refund.id);
      
      return {
        refundId: refund.id,
        amount: refund.amount,
        status: refund.status,
        reason: reason
      };

    } catch (error) {
      console.error('❌ Error refunding payment:', error);
      throw error;
    }
  }

  // Obtener métodos de pago disponibles
  async getAvailablePaymentMethods() {
    try {
      const paymentMethods = await mercadopago.payment_methods.list();
      
      return paymentMethods.map(method => ({
        id: method.id,
        name: method.name,
        paymentTypeId: method.payment_type_id,
        status: method.status,
        secureThumbnail: method.secure_thumbnail,
        thumbnail: method.thumbnail,
        minAccreditationDays: method.min_accreditation_days,
        maxAccreditationDays: method.max_accreditation_days
      }));

    } catch (error) {
      console.error('❌ Error getting payment methods:', error);
      throw error;
    }
  }

  // Obtener información de cuotas
  async getInstallments(paymentMethodId, amount, issuerId = null) {
    try {
      const installments = await mercadopago.payment_methods.installments({
        payment_method_id: paymentMethodId,
        amount: parseFloat(amount),
        issuer_id: issuerId
      });

      return installments.map(installment => ({
        installments: installment.installments,
        amount: installment.installment_amount,
        totalAmount: installment.total_amount,
        installmentRate: installment.installment_rate,
        discountRate: installment.discount_rate
      }));

    } catch (error) {
      console.error('❌ Error getting installments:', error);
      throw error;
    }
  }

  // Crear pago de prueba (sandbox)
  async createTestPayment(appointmentId, amount) {
    try {
      // Tarjeta de prueba de MercadoPago
      const testCard = {
        card_number: '4509 9535 6623 3704',
        security_code: '123',
        expiration_month: '11',
        expiration_year: '2025',
        cardholder: {
          name: 'APRO',
          identification: {
            type: 'DNI',
            number: '12345678'
          }
        }
      };

      const payment = {
        transaction_amount: parseFloat(amount),
        token: testCard,
        description: `Pago de prueba - Cita ${appointmentId}`,
        installments: 1,
        payment_method_id: 'master',
        payer: {
          email: 'test@turnario.com'
        },
        external_reference: appointmentId
      };

      const response = await mercadopago.payment.save(payment);
      
      console.log('✅ Test payment created:', response.id);
      
      return {
        paymentId: response.id,
        status: response.status,
        appointmentId: appointmentId
      };

    } catch (error) {
      console.error('❌ Error creating test payment:', error);
      throw error;
    }
  }

  // Verificar webhook de MercadoPago
  async verifyWebhook(query) {
    try {
      const { type, data_id } = query;
      
      if (type === 'payment') {
        const payment = await this.getPaymentInfo(data_id);
        
        // Actualizar estado de la cita según el pago
        if (payment.externalReference) {
          await this.updateAppointmentPaymentStatus(payment.externalReference, payment.status);
        }
        
        return {
          verified: true,
          payment: payment,
          type: type
        };
      }
      
      return {
        verified: false,
        message: 'Invalid webhook type'
      };

    } catch (error) {
      console.error('❌ Error verifying webhook:', error);
      throw error;
    }
  }

  // Actualizar estado de pago de la cita
  async updateAppointmentPaymentStatus(appointmentId, paymentStatus) {
    try {
      let appointmentStatus = 'pending';
      
      switch (paymentStatus) {
        case 'approved':
          appointmentStatus = 'confirmed';
          break;
        case 'rejected':
        case 'cancelled':
          appointmentStatus = 'cancelled';
          break;
        case 'pending':
        case 'in_process':
          appointmentStatus = 'pending';
          break;
        default:
          appointmentStatus = 'pending';
      }
      
      await Appointment.findByIdAndUpdate(appointmentId, {
        status: appointmentStatus,
        paymentStatus: paymentStatus,
        updatedAt: new Date()
      });
      
      console.log(`✅ Appointment ${appointmentId} payment status updated to ${appointmentStatus}`);
      
    } catch (error) {
      console.error('❌ Error updating appointment payment status:', error);
      throw error;
    }
  }

  // Obtener estadísticas de pagos
  async getPaymentStats(filters = {}) {
    try {
      const { dateFrom, dateTo, status } = filters;
      
      let searchParams = {};
      
      if (dateFrom || dateTo) {
        searchParams.date_created = {};
        if (dateFrom) searchParams.date_created.from = dateFrom;
        if (dateTo) searchParams.date_created.to = dateTo;
      }
      
      if (status) {
        searchParams.status = status;
      }
      
      const payments = await mercadopago.payment.search(searchParams);
      
      const stats = {
        total: payments.paging.total,
        approved: 0,
        pending: 0,
        rejected: 0,
        cancelled: 0,
        totalAmount: 0,
        averageAmount: 0
      };
      
      payments.results.forEach(payment => {
        stats[payment.status]++;
        stats.totalAmount += payment.transaction_amount;
      });
      
      stats.averageAmount = stats.total > 0 ? stats.totalAmount / stats.total : 0;
      
      return stats;

    } catch (error) {
      console.error('❌ Error getting payment stats:', error);
      throw error;
    }
  }

  // Validar configuración de MercadoPago
  validateConfiguration() {
    const requiredEnvVars = [
      'MERCADOPAGO_ACCESS_TOKEN',
      'MERCADOPAGO_PUBLIC_KEY'
    ];
    
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.error('❌ Missing MercadoPago environment variables:', missingVars);
      return false;
    }
    
    return true;
  }
}

module.exports = MercadoPagoService;
