const mongoose = require('mongoose');

const mercadoPagoWebhookEventSchema = new mongoose.Schema(
  {
    paymentId: { type: String, required: true, index: true },
    topic: { type: String, default: 'payment' },
    externalReference: { type: String, default: '' },
    status: { type: String, default: '' },
    statusDetail: { type: String, default: '' },
    transactionAmount: { type: Number, default: 0 },
    processed: { type: Boolean, default: false },
    error: { type: String, default: '' },
    rawBody: { type: mongoose.Schema.Types.Mixed, default: null },
    rawQuery: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

mercadoPagoWebhookEventSchema.index({ paymentId: 1, createdAt: -1 });

module.exports =
  mongoose.models.MercadoPagoWebhookEvent ||
  mongoose.model('MercadoPagoWebhookEvent', mercadoPagoWebhookEventSchema);
