const {
  MercadoPagoConfig,
  Preference,
  Payment,
  PaymentRefund,
  PaymentMethod,
} = require('mercadopago');
const mongoose = require('mongoose');
const Appointment = require('../models/Appointment');
const ExpoAppointment = require('../models/ExpoAppointment');
const ExpoNotification = require('../models/ExpoNotification');
const User = require('../models/User');
const Clinic = require('../models/Clinic');

class MercadoPagoService {
  constructor() {
    this.accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN || '';
    this.config = null;
    this.preference = null;
    this.payment = null;
    this.paymentRefund = null;
    this.paymentMethod = null;

    if (!this.accessToken) {
      return;
    }

    try {
      this.config = new MercadoPagoConfig({ accessToken: this.accessToken });
      this.preference = new Preference(this.config);
      this.payment = new Payment(this.config);
      this.paymentRefund = new PaymentRefund(this.config);
      this.paymentMethod = new PaymentMethod(this.config);
      console.log('✅ MercadoPago service initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing MercadoPago:', error);
      this.config = null;
      this.preference = null;
      this.payment = null;
      this.paymentRefund = null;
      this.paymentMethod = null;
    }
  }

  assertReady() {
    if (!this.preference || !this.payment) {
      throw new Error('MercadoPago no está configurado (falta MERCADOPAGO_ACCESS_TOKEN)');
    }
  }

  // Crear preferencia de pago
  async createPaymentPreference(paymentData) {
    this.assertReady();
    try {
      const {
        appointmentId,
        clientId,
        professionalId,
        serviceId,
        amount,
        description,
        externalReference,
      } = paymentData;

      const appointment = await Appointment.findById(appointmentId)
        .populate('client', 'fullName email')
        .populate('professional', 'fullName')
        .populate('service', 'name')
        .populate('clinic', 'name');

      if (!appointment) {
        throw new Error('Appointment not found');
      }

      const preferenceBody = {
        items: [
          {
            id: appointmentId,
            title: `Cita - ${appointment.service?.name || 'Servicio'}`,
            description:
              description ||
              `Cita con ${appointment.professional?.fullName || 'Profesional'}`,
            quantity: 1,
            unit_price: parseFloat(amount),
            currency_id: 'ARS',
            category_id: 'health',
          },
        ],
        payer: {
          name: appointment.client?.fullName || 'Cliente',
          email: appointment.client?.email || 'cliente@turnario.com',
        },
        external_reference: externalReference || appointmentId,
        notification_url: `${process.env.BACKEND_URL}/api/payments/webhook`,
        back_urls: {
          success: `${process.env.FRONTEND_URL}/payment/success?appointment_id=${appointmentId}`,
          failure: `${process.env.FRONTEND_URL}/payment/failure?appointment_id=${appointmentId}`,
          pending: `${process.env.FRONTEND_URL}/payment/pending?appointment_id=${appointmentId}`,
        },
        auto_return: 'approved',
        expires: true,
        expiration_date_from: new Date().toISOString(),
        expiration_date_to: new Date(
          Date.now() + 24 * 60 * 60 * 1000
        ).toISOString(),
        statement_descriptor: 'TURNARIO',
        binary_mode: true,
        payment_methods: {
          excluded_payment_types: [{ id: 'ticket' }],
          installments: 12,
        },
      };

      const response = await this.preference.create({ body: preferenceBody });

      console.log('✅ Payment preference created:', response.id);

      return {
        preferenceId: response.id,
        initPoint: response.init_point,
        sandboxInitPoint: response.sandbox_init_point,
        appointmentId,
        amount,
        status: 'pending',
      };
    } catch (error) {
      console.error('❌ Error creating payment preference:', error);
      throw error;
    }
  }

  async processCardPayment(paymentData) {
    this.assertReady();
    try {
      const {
        appointmentId,
        cardToken,
        installments,
        paymentMethodId,
        transactionAmount,
        description,
        payerEmail,
      } = paymentData;

      const body = {
        transaction_amount: parseFloat(transactionAmount),
        token: cardToken,
        description: description || `Pago de cita ${appointmentId}`,
        installments: parseInt(installments, 10) || 1,
        payment_method_id: paymentMethodId,
        payer: { email: payerEmail },
        external_reference: appointmentId,
        notification_url: `${process.env.BACKEND_URL}/api/payments/webhook`,
      };

      const response = await this.payment.create({ body });

      console.log('✅ Card payment processed:', response.id);

      return {
        paymentId: response.id,
        status: response.status,
        statusDetail: response.status_detail,
        transactionAmount: response.transaction_amount,
        appointmentId,
      };
    } catch (error) {
      console.error('❌ Error processing card payment:', error);
      throw error;
    }
  }

  async processPixPayment(paymentData) {
    this.assertReady();
    try {
      const {
        appointmentId,
        transactionAmount,
        description,
        payerEmail,
        payerFirstName,
        payerLastName,
        payerIdentification,
      } = paymentData;

      const body = {
        transaction_amount: parseFloat(transactionAmount),
        description: description || `Pago de cita ${appointmentId}`,
        payment_method_id: 'pix',
        payer: {
          email: payerEmail,
          first_name: payerFirstName,
          last_name: payerLastName,
          identification: {
            type: payerIdentification.type || 'CPF',
            number: payerIdentification.number,
          },
        },
        external_reference: appointmentId,
        notification_url: `${process.env.BACKEND_URL}/api/payments/webhook`,
      };

      const response = await this.payment.create({ body });

      console.log('✅ PIX payment processed:', response.id);

      return {
        paymentId: response.id,
        status: response.status,
        qrCode: response.point_of_interaction?.transaction_data?.qr_code,
        qrCodeBase64:
          response.point_of_interaction?.transaction_data?.qr_code_base64,
        appointmentId,
      };
    } catch (error) {
      console.error('❌ Error processing PIX payment:', error);
      throw error;
    }
  }

  async getPaymentInfo(paymentId) {
    this.assertReady();
    try {
      const payment = await this.payment.get({ id: String(paymentId) });

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
        lastModified: payment.date_last_updated,
      };
    } catch (error) {
      console.error('❌ Error getting payment info:', error);
      throw error;
    }
  }

  async getAppointmentPayments(appointmentId) {
    this.assertReady();
    try {
      const search = await this.payment.search({
        options: { external_reference: String(appointmentId) },
      });
      const results = search.results || [];

      return results.map((payment) => ({
        id: payment.id,
        status: payment.status,
        statusDetail: payment.status_detail,
        transactionAmount: payment.transaction_amount,
        paymentMethod: payment.payment_method,
        created: payment.date_created,
      }));
    } catch (error) {
      console.error('❌ Error getting appointment payments:', error);
      throw error;
    }
  }

  async refundPayment(paymentId, amount = null, reason = '') {
    this.assertReady();
    try {
      const body =
        amount != null && amount !== ''
          ? { amount: parseFloat(amount) }
          : undefined;

      const refund = await this.paymentRefund.create({
        payment_id: paymentId,
        body,
      });

      console.log('✅ Payment refunded:', refund.id);

      return {
        refundId: refund.id,
        amount: refund.amount,
        status: refund.status,
        reason,
      };
    } catch (error) {
      console.error('❌ Error refunding payment:', error);
      throw error;
    }
  }

  async getAvailablePaymentMethods() {
    this.assertReady();
    try {
      const methods = await this.paymentMethod.get();

      return (methods || []).map((method) => ({
        id: method.id,
        name: method.name,
        paymentTypeId: method.payment_type_id,
        status: method.status,
        secureThumbnail: method.secure_thumbnail,
        thumbnail: method.thumbnail,
        minAccreditationDays: method.min_accreditation_days,
        maxAccreditationDays: method.max_accreditation_days,
      }));
    } catch (error) {
      console.error('❌ Error getting payment methods:', error);
      throw error;
    }
  }

  async getInstallments(paymentMethodId, amount, issuerId = null) {
    if (!this.accessToken) {
      throw new Error('MercadoPago no está configurado');
    }
    try {
      const params = new URLSearchParams({
        payment_method_id: paymentMethodId,
        amount: String(parseFloat(amount)),
      });
      if (issuerId) params.set('issuer_id', String(issuerId));

      const res = await fetch(
        `https://api.mercadopago.com/v1/payment_methods/installments?${params}`,
        {
          headers: { Authorization: `Bearer ${this.accessToken}` },
        }
      );

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Installments API ${res.status}: ${text}`);
      }

      const installments = await res.json();

      return (Array.isArray(installments) ? installments : []).map(
        (installment) => ({
          installments: installment.installments,
          amount: installment.installment_amount,
          totalAmount: installment.total_amount,
          installmentRate: installment.installment_rate,
          discountRate: installment.discount_rate,
        })
      );
    } catch (error) {
      console.error('❌ Error getting installments:', error);
      throw error;
    }
  }

  async createTestPayment(appointmentId, amount) {
    this.assertReady();
    try {
      const testCard = {
        card_number: '4509 9535 6623 3704',
        security_code: '123',
        expiration_month: '11',
        expiration_year: '2025',
        cardholder: {
          name: 'APRO',
          identification: { type: 'DNI', number: '12345678' },
        },
      };

      const body = {
        transaction_amount: parseFloat(amount),
        token: testCard,
        description: `Pago de prueba - Cita ${appointmentId}`,
        installments: 1,
        payment_method_id: 'master',
        payer: { email: 'test@turnario.com' },
        external_reference: appointmentId,
      };

      const response = await this.payment.create({ body });

      console.log('✅ Test payment created:', response.id);

      return {
        paymentId: response.id,
        status: response.status,
        appointmentId,
      };
    } catch (error) {
      console.error('❌ Error creating test payment:', error);
      throw error;
    }
  }

  /**
   * Procesa la notificación de un pago (IPN/webhook) por id de pago de Mercado Pago.
   * external_reference "expo_<mongoId>" → ExpoAppointment; si no, modelo Appointment legacy.
   */
  async processPaymentWebhookById(paymentId) {
    this.assertReady();
    const payment = await this.getPaymentInfo(paymentId);
    const ref =
      payment.externalReference != null ? String(payment.externalReference) : '';
    if (!ref) {
      return { verified: false, payment, message: 'Sin external_reference' };
    }
    if (ref.startsWith('expo_')) {
      await this.applyExpoMercadoPagoPayment(ref, payment.status, payment.id, payment);
      return { verified: true, payment, kind: 'expo' };
    }
    await this.updateAppointmentPaymentStatus(ref, payment.status);
    return { verified: true, payment, kind: 'legacy' };
  }

  async applyExpoMercadoPagoPayment(
    externalReference,
    paymentStatus,
    mpPaymentId,
    payment
  ) {
    const raw = String(externalReference || '').replace(/^expo_/, '');
    if (!mongoose.Types.ObjectId.isValid(raw)) {
      console.warn('applyExpoMercadoPagoPayment: id inválido', externalReference);
      return;
    }
    const doc = await ExpoAppointment.findById(raw);
    if (!doc) {
      console.warn('applyExpoMercadoPagoPayment: cita no encontrada', raw);
      return;
    }
    doc.paymentStatus = paymentStatus;
    if (mpPaymentId != null && mpPaymentId !== '') {
      doc.mpPaymentId = String(mpPaymentId);
    }
    if (paymentStatus === 'approved') {
      doc.status = 'confirmed';
    }
    await doc.save();

    if (paymentStatus === 'approved' && doc.clientId) {
      try {
        const prof = await User.findById(doc.professionalId).select('fullName').lean();
        const name = prof?.fullName || 'Profesional';
        await ExpoNotification.create({
          recipientId: doc.clientId,
          senderId: doc.professionalId,
          type: 'appointment_confirmed',
          title: 'Pago recibido — cita confirmada',
          message: `Se acreditó la seña. Tu cita "${doc.service || 'turno'}" el ${doc.date} a las ${doc.time} con ${name} quedó confirmada.`,
          data: {
            appointmentId: String(doc._id),
            service: doc.service || '',
            date: doc.date,
            time: doc.time,
            professionalName: name,
            professionalId: String(doc.professionalId),
            clientId: String(doc.clientId),
            depositAmount: String(doc.depositAmount || payment.transactionAmount || ''),
          },
        });
      } catch (e) {
        console.warn('Notificación post-pago Expo:', e.message);
      }
    }

    console.log(
      `✅ ExpoAppointment ${raw} payment ${paymentStatus} (mp ${mpPaymentId})`
    );
  }

  async createExpoAppointmentPreference({ expoAppointmentId, amount, description }) {
    this.assertReady();
    const appointment = await ExpoAppointment.findById(expoAppointmentId)
      .populate('clientId', 'fullName email')
      .populate('professionalId', 'fullName');
    if (!appointment) {
      throw new Error('Cita no encontrada');
    }
    const amt = parseFloat(amount);
    if (!(amt > 0)) {
      throw new Error('Monto inválido');
    }

    const scheme = process.env.EXPO_APP_SCHEME || 'myapp';
    const ret = `${scheme}://payment-result`;
    const backendBase = (process.env.BACKEND_URL || 'http://localhost:3000').replace(
      /\/$/,
      ''
    );
    const externalRef = `expo_${expoAppointmentId}`;

    const client = appointment.clientId;
    const payerName =
      (client && client.fullName) ||
      appointment.patientName ||
      'Cliente';
    const payerEmail =
      (client && client.email) ||
      appointment.patientEmail ||
      'cliente@turnario.com';

    const preferenceBody = {
      items: [
        {
          id: String(expoAppointmentId),
          title: `Seña — ${appointment.service || 'Turnario'}`,
          description:
            description ||
            `Reserva ${appointment.date} ${appointment.time}`.slice(0, 200),
          quantity: 1,
          unit_price: amt,
          currency_id: 'ARS',
          category_id: 'others',
        },
      ],
      payer: {
        name: payerName,
        email: payerEmail,
      },
      external_reference: externalRef,
      notification_url: `${backendBase}/api/payments/webhook`,
      back_urls: {
        success: `${ret}?expo_appointment_id=${expoAppointmentId}&mp_status=approved`,
        failure: `${ret}?expo_appointment_id=${expoAppointmentId}&mp_status=failure`,
        pending: `${ret}?expo_appointment_id=${expoAppointmentId}&mp_status=pending`,
      },
      auto_return: 'approved',
      binary_mode: true,
      statement_descriptor: 'TURNARIO',
    };

    const response = await this.preference.create({ body: preferenceBody });

    appointment.mpPreferenceId = String(response.id);
    if (!appointment.depositAmount || appointment.depositAmount <= 0) {
      appointment.depositAmount = amt;
    }
    if (
      appointment.paymentStatus === 'not_required' ||
      !appointment.paymentStatus
    ) {
      appointment.paymentStatus = 'pending';
    }
    await appointment.save();

    return {
      preferenceId: response.id,
      initPoint: response.init_point,
      sandboxInitPoint: response.sandbox_init_point,
      appointmentId: expoAppointmentId,
      amount: amt,
      externalReference: externalRef,
    };
  }

  async verifyWebhook(query) {
    try {
      const { type, data_id } = query;

      if (type === 'payment' && data_id) {
        return this.processPaymentWebhookById(data_id);
      }

      return { verified: false, message: 'Invalid webhook type' };
    } catch (error) {
      console.error('❌ Error verifying webhook:', error);
      throw error;
    }
  }

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
        paymentStatus,
        updatedAt: new Date(),
      });

      console.log(
        `✅ Appointment ${appointmentId} payment status updated to ${appointmentStatus}`
      );
    } catch (error) {
      console.error('❌ Error updating appointment payment status:', error);
      throw error;
    }
  }

  async getPaymentStats(filters = {}) {
    this.assertReady();
    try {
      const { dateFrom, dateTo, status } = filters;
      const options = {};

      if (status) options.status = status;
      if (dateFrom || dateTo) {
        options.range = 'date_created';
        if (dateFrom) options.begin_date = dateFrom;
        if (dateTo) options.end_date = dateTo;
      }

      const search = await this.payment.search({ options });
      const results = search.results || [];
      const total = search.paging?.total ?? results.length;

      const stats = {
        total,
        approved: 0,
        pending: 0,
        rejected: 0,
        cancelled: 0,
        totalAmount: 0,
        averageAmount: 0,
      };

      results.forEach((payment) => {
        const s = payment.status;
        if (s && Object.prototype.hasOwnProperty.call(stats, s)) {
          stats[s] += 1;
        }
        stats.totalAmount += payment.transaction_amount || 0;
      });

      stats.averageAmount =
        results.length > 0 ? stats.totalAmount / results.length : 0;

      return stats;
    } catch (error) {
      console.error('❌ Error getting payment stats:', error);
      throw error;
    }
  }

  validateConfiguration() {
    const requiredEnvVars = [
      'MERCADOPAGO_ACCESS_TOKEN',
      'MERCADOPAGO_PUBLIC_KEY',
    ];
    const missingVars = requiredEnvVars.filter((v) => !process.env[v]);

    if (missingVars.length > 0) {
      console.error(
        '❌ Missing MercadoPago environment variables:',
        missingVars
      );
      return false;
    }
    return true;
  }
}

module.exports = MercadoPagoService;
