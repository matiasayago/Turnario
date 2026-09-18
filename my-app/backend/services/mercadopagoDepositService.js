const {
  MercadoPagoConfig,
  Preference,
  Payment,
} = require('mercadopago');
const mongoose = require('mongoose');
const Appointment = require('../models/Appointment');
const ExpoNotification = require('../models/ExpoNotification');
const User = require('../models/User');

function getBackendPublicBaseUrl() {
  const candidates = [
    process.env.BACKEND_URL,
    process.env.PUBLIC_BACKEND_URL,
    process.env.EXPO_PUBLIC_BACKEND_URL,
  ]
    .map((v) => String(v || '').trim().replace(/\/$/, ''))
    .filter(Boolean);
  if (candidates.length > 0) return candidates[0];
  const port = String(process.env.PORT || '3001').trim();
  const host = String(process.env.HOST_IP || 'localhost').trim();
  return `http://${host}:${port}`;
}

/** MP exige URL pública HTTPS para webhooks; LAN/localhost no sirven. */
function getMercadoPagoNotificationUrl() {
  const base = getBackendPublicBaseUrl();
  if (!/^https:\/\//i.test(base)) return null;
  if (
    /localhost|127\.0\.0\.1|0\.0\.0\.0|192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\./i.test(
      base
    )
  ) {
    return null;
  }
  return `${base}/api/payments/webhook`;
}

class MercadoPagoDepositService {
  constructor() {
    this.accessToken = String(process.env.MERCADOPAGO_ACCESS_TOKEN || '').trim();
    this.publicKey = String(process.env.MERCADOPAGO_PUBLIC_KEY || '').trim();
    this.preference = null;
    this.payment = null;

    if (
      !this.accessToken ||
      /^(TU_TOKEN|YOUR_|xxx+|REPLACE)/i.test(this.accessToken) ||
      /xxxxxxxx/i.test(this.accessToken)
    ) {
      console.warn('⚠️ Mercado Pago: falta MERCADOPAGO_ACCESS_TOKEN real');
      return;
    }

    try {
      const config = new MercadoPagoConfig({ accessToken: this.accessToken });
      this.preference = new Preference(config);
      this.payment = new Payment(config);
      console.log('✅ Mercado Pago (señas) inicializado');
    } catch (error) {
      console.error('❌ Error inicializando Mercado Pago:', error?.message || error);
    }
  }

  isReady() {
    return Boolean(this.preference && this.payment);
  }

  getConfigurationStatus() {
    const missing = [];
    if (!this.accessToken) missing.push('MERCADOPAGO_ACCESS_TOKEN');
    if (!this.publicKey) missing.push('MERCADOPAGO_PUBLIC_KEY');
    return {
      ok: this.isReady() && missing.length === 0,
      missing,
      backendBaseUrl: getBackendPublicBaseUrl(),
    };
  }

  assertReady() {
    if (!this.isReady()) {
      throw new Error('Mercado Pago no está configurado (MERCADOPAGO_ACCESS_TOKEN)');
    }
  }

  /**
   * Crea preferencia Checkout Pro para seña de una Appointment.
   */
  async createAppointmentDepositPreference({ appointmentId, amount, description }) {
    this.assertReady();
    if (!mongoose.Types.ObjectId.isValid(String(appointmentId))) {
      throw new Error('appointmentId inválido');
    }

    const appointment = await Appointment.findById(appointmentId)
      .populate('clientId', 'fullName email')
      .populate('professionalId', 'fullName');
    if (!appointment) {
      throw new Error('Cita no encontrada');
    }

    const amt =
      typeof amount === 'number' && amount > 0
        ? amount
        : Number(appointment.depositAmount) > 0
          ? Number(appointment.depositAmount)
          : 0;
    if (!(amt > 0)) {
      throw new Error('Monto de seña inválido');
    }

    const scheme = process.env.EXPO_APP_SCHEME || 'myapp';
    const ret = `${scheme}://payment-result`;
    const notificationUrl = getMercadoPagoNotificationUrl();
    const externalRef = `expo_${appointmentId}`;

    const client = appointment.clientId;
    const payerName =
      (client && client.fullName) || appointment.patientName || 'Cliente';
    const payerEmail =
      (client && client.email) || appointment.patientEmail || 'cliente@turnario.com';

    const preferenceBody = {
      items: [
        {
          id: String(appointmentId),
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
      back_urls: {
        success: `${ret}?expo_appointment_id=${appointmentId}&mp_status=approved`,
        failure: `${ret}?expo_appointment_id=${appointmentId}&mp_status=failure`,
        pending: `${ret}?expo_appointment_id=${appointmentId}&mp_status=pending`,
      },
      auto_return: 'approved',
      binary_mode: true,
      statement_descriptor: 'TURNARIO',
    };

    if (notificationUrl) {
      preferenceBody.notification_url = notificationUrl;
    } else {
      console.warn(
        '⚠️ MP: sin notification_url pública (BACKEND_URL es local). Usá “Verificar pago” tras abonar.'
      );
    }

    const response = await this.preference.create({ body: preferenceBody });

    appointment.mpPreferenceId = String(response.id || '');
    appointment.depositAmount = amt;
    if (!appointment.paymentStatus || appointment.paymentStatus === 'not_required') {
      appointment.paymentStatus = 'pending';
    }
    if (appointment.status !== 'pending_payment' && appointment.status !== 'confirmed') {
      appointment.status = 'pending_payment';
    }
    await appointment.save();

    return {
      preferenceId: response.id,
      initPoint: response.init_point,
      sandboxInitPoint: response.sandbox_init_point,
      appointmentId: String(appointmentId),
      amount: amt,
      externalReference: externalRef,
    };
  }

  async getPaymentInfo(paymentId) {
    this.assertReady();
    const response = await this.payment.get({ id: paymentId });
    return {
      id: response.id,
      status: response.status,
      statusDetail: response.status_detail,
      transactionAmount: response.transaction_amount,
      externalReference: response.external_reference,
    };
  }

  async applyDepositPayment(externalReference, paymentStatus, mpPaymentId, payment) {
    const raw = String(externalReference || '').replace(/^expo_/, '');
    if (!mongoose.Types.ObjectId.isValid(raw)) {
      console.warn('MP applyDepositPayment: id inválido', externalReference);
      return;
    }
    const doc = await Appointment.findById(raw);
    if (!doc) {
      console.warn('MP applyDepositPayment: cita no encontrada', raw);
      return;
    }

    const previousPaymentStatus = String(doc.paymentStatus || '');
    const previousPaymentId = String(doc.mpPaymentId || doc.paymentId || '');
    const incomingPaymentId =
      mpPaymentId != null && mpPaymentId !== '' ? String(mpPaymentId) : '';
    const incomingStatus = String(paymentStatus || '');

    if (
      incomingPaymentId &&
      previousPaymentId === incomingPaymentId &&
      previousPaymentStatus === incomingStatus
    ) {
      return;
    }

    doc.paymentStatus = incomingStatus === 'approved' ? 'approved' : incomingStatus;
    if (incomingPaymentId) {
      doc.mpPaymentId = incomingPaymentId;
      doc.paymentId = incomingPaymentId;
    }
    if (paymentStatus === 'approved') {
      doc.status = 'confirmed';
    }
    await doc.save();

    const alreadyNotified =
      previousPaymentStatus === 'approved' && previousPaymentId === incomingPaymentId;
    if (paymentStatus === 'approved' && doc.clientId && !alreadyNotified) {
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
            date: String(doc.date || ''),
            time: String(doc.time || ''),
            professionalName: name,
            professionalId: String(doc.professionalId),
            clientId: String(doc.clientId),
            depositAmount: String(doc.depositAmount || payment?.transactionAmount || ''),
          },
        });
      } catch (e) {
        console.warn('Notificación post-pago:', e?.message || e);
      }
    }

    console.log(`✅ Appointment ${raw} payment ${paymentStatus} (mp ${mpPaymentId})`);
  }

  async processPaymentWebhookById(paymentId) {
    this.assertReady();
    const payment = await this.getPaymentInfo(paymentId);
    const ref = payment.externalReference != null ? String(payment.externalReference) : '';
    if (!ref) {
      return { verified: false, payment, message: 'Sin external_reference' };
    }
    await this.applyDepositPayment(ref, payment.status, payment.id, payment);
    return { verified: true, payment, kind: 'deposit' };
  }
}

module.exports = { MercadoPagoDepositService, getBackendPublicBaseUrl };
