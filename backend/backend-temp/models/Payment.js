const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  // Usuario que realiza el pago
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Reserva asociada al pago
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true,
    index: true
  },

  // Servicio asociado al pago
  serviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: true,
    index: true
  },

  // Clínica asociada al pago
  clinicId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Clinic',
    required: true,
    index: true
  },

  // Monto del pago
  amount: {
    type: Number,
    required: true,
    min: 0
  },

  // Moneda del pago
  currency: {
    type: String,
    default: 'USD',
    enum: ['USD', 'EUR', 'MXN', 'COP', 'ARS', 'CLP', 'PEN', 'BRL']
  },

  // Estado del pago
  status: {
    type: String,
    enum: [
      'pending',
      'processing',
      'completed',
      'failed',
      'cancelled',
      'refunded',
      'partially_refunded',
      'disputed',
      'expired'
    ],
    default: 'pending',
    index: true
  },

  // Método de pago
  paymentMethod: {
    type: String,
    enum: [
      'credit_card',
      'debit_card',
      'bank_transfer',
      'cash',
      'digital_wallet',
      'cryptocurrency',
      'insurance',
      'voucher',
      'other'
    ],
    required: true
  },

  // Información del método de pago
  paymentDetails: {
    // Para tarjetas
    cardType: String,
    last4: String,
    brand: String,
    
    // Para transferencias bancarias
    bankName: String,
    accountNumber: String,
    
    // Para billeteras digitales
    walletType: String,
    walletId: String,
    
    // Para criptomonedas
    cryptoType: String,
    walletAddress: String,
    
    // Para seguros
    insuranceProvider: String,
    policyNumber: String,
    coverageAmount: Number,
    
    // Información general
    transactionId: String,
    authorizationCode: String,
    gatewayResponse: String
  },

  // Información de facturación
  billing: {
    firstName: String,
    lastName: String,
    email: String,
    phone: String,
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String
    },
    taxId: String
  },

  // Información de descuentos
  discounts: [{
    type: {
      type: String,
      enum: ['percentage', 'fixed', 'coupon', 'loyalty', 'insurance']
    },
    code: String,
    description: String,
    amount: Number,
    percentage: Number
  }],

  // Información de impuestos
  taxes: [{
    name: String,
    rate: Number,
    amount: Number,
    type: {
      type: String,
      enum: ['vat', 'sales_tax', 'service_tax', 'other']
    }
  }],

  // Desglose del pago
  breakdown: {
    subtotal: {
      type: Number,
      required: true,
      min: 0
    },
    taxAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    total: {
      type: Number,
      required: true,
      min: 0
    }
  },

  // Información de procesamiento
  processing: {
    gateway: {
      type: String,
      enum: ['stripe', 'paypal', 'mercadopago', 'payu', 'other']
    },
    gatewayTransactionId: String,
    gatewayResponse: mongoose.Schema.Types.Mixed,
    processingFee: Number,
    processingTime: Number, // en milisegundos
    attempts: {
      type: Number,
      default: 0,
      min: 0
    },
    lastAttemptAt: Date
  },

  // Información de reembolso
  refundInfo: {
    amount: Number,
    reason: String,
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    requestedAt: Date,
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    processedAt: Date,
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending'
    },
    gatewayRefundId: String,
    notes: String
  },

  // Información de disputa
  disputeInfo: {
    status: {
      type: String,
      enum: ['none', 'pending', 'under_review', 'resolved', 'lost']
    },
    reason: String,
    evidence: [{
      type: String,
      description: String,
      url: String,
      uploadedAt: Date
    }],
    resolution: String,
    resolvedAt: Date,
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },

  // Configuración de notificaciones
  notifications: {
    paymentConfirmation: {
      type: Boolean,
      default: true
    },
    paymentFailure: {
      type: Boolean,
      default: true
    },
    refundNotification: {
      type: Boolean,
      default: true
    },
    disputeNotification: {
      type: Boolean,
      default: true
    }
  },

  // Estado de notificaciones enviadas
  notificationsSent: {
    paymentConfirmation: {
      type: Boolean,
      default: false
    },
    paymentFailure: {
      type: Boolean,
      default: false
    },
    refundNotification: {
      type: Boolean,
      default: false
    },
    disputeNotification: {
      type: Boolean,
      default: false
    }
  },

  // Fechas importantes
  dates: {
    createdAt: {
      type: Date,
      default: Date.now
    },
    processedAt: Date,
    completedAt: Date,
    failedAt: Date,
    cancelledAt: Date,
    expiredAt: Date,
    refundedAt: Date
  },

  // Metadatos
  metadata: {
    type: Map,
    of: String,
    default: new Map()
  },

  // Soft delete
  deleted: {
    type: Boolean,
    default: false,
    index: true
  },

  deletedAt: Date,
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Índices para optimizar consultas
paymentSchema.index({ userId: 1, createdAt: -1 });
paymentSchema.index({ bookingId: 1 });
paymentSchema.index({ serviceId: 1, createdAt: -1 });
paymentSchema.index({ clinicId: 1, createdAt: -1 });
paymentSchema.index({ status: 1, createdAt: -1 });
paymentSchema.index({ 'processing.gatewayTransactionId': 1 });
paymentSchema.index({ 'paymentDetails.transactionId': 1 });

// Métodos de instancia
paymentSchema.methods.process = function() {
  this.status = 'processing';
  this.dates.processedAt = new Date();
  this.processing.attempts += 1;
  this.processing.lastAttemptAt = new Date();
  return this.save();
};

paymentSchema.methods.complete = function(gatewayResponse = null) {
  this.status = 'completed';
  this.dates.completedAt = new Date();
  if (gatewayResponse) {
    this.processing.gatewayResponse = gatewayResponse;
  }
  return this.save();
};

paymentSchema.methods.fail = function(reason = '') {
  this.status = 'failed';
  this.dates.failedAt = new Date();
  this.processing.gatewayResponse = reason;
  return this.save();
};

paymentSchema.methods.cancel = function() {
  this.status = 'cancelled';
  this.dates.cancelledAt = new Date();
  return this.save();
};

paymentSchema.methods.expire = function() {
  this.status = 'expired';
  this.dates.expiredAt = new Date();
  return this.save();
};

paymentSchema.methods.refund = function(amount, reason, requestedBy) {
  this.status = 'refunded';
  this.refundInfo = {
    amount: amount || this.amount,
    reason: reason || '',
    requestedBy: requestedBy,
    requestedAt: new Date()
  };
  this.dates.refundedAt = new Date();
  return this.save();
};

paymentSchema.methods.processRefund = function(processedBy, gatewayRefundId = null) {
  this.refundInfo.processedBy = processedBy;
  this.refundInfo.processedAt = new Date();
  this.refundInfo.status = 'completed';
  if (gatewayRefundId) {
    this.refundInfo.gatewayRefundId = gatewayRefundId;
  }
  return this.save();
};

paymentSchema.methods.dispute = function(reason) {
  this.disputeInfo.status = 'pending';
  this.disputeInfo.reason = reason;
  return this.save();
};

paymentSchema.methods.resolveDispute = function(resolution, resolvedBy) {
  this.disputeInfo.status = 'resolved';
  this.disputeInfo.resolution = resolution;
  this.disputeInfo.resolvedBy = resolvedBy;
  this.disputeInfo.resolvedAt = new Date();
  return this.save();
};

paymentSchema.methods.addDiscount = function(type, code, description, amount, percentage = null) {
  this.discounts.push({
    type,
    code,
    description,
    amount,
    percentage
  });
  return this.save();
};

paymentSchema.methods.addTax = function(name, rate, amount, type) {
  this.taxes.push({
    name,
    rate,
    amount,
    type
  });
  return this.save();
};

paymentSchema.methods.calculateBreakdown = function() {
  const subtotal = this.amount;
  const taxAmount = this.taxes.reduce((sum, tax) => sum + tax.amount, 0);
  const discountAmount = this.discounts.reduce((sum, discount) => sum + (discount.amount || 0), 0);
  
  this.breakdown = {
    subtotal,
    taxAmount,
    discountAmount,
    total: subtotal + taxAmount - discountAmount
  };
  
  return this.save();
};

// Métodos estáticos
paymentSchema.statics.findByUser = function(userId, options = {}) {
  const { status, limit = 50, skip = 0, sort = { createdAt: -1 } } = options;
  
  const query = { userId, deleted: false };
  if (status) query.status = status;

  return this.find(query)
    .populate('bookingId', 'date startTime endTime')
    .populate('serviceId', 'name description price')
    .populate('clinicId', 'name address')
    .sort(sort)
    .limit(limit)
    .skip(skip);
};

paymentSchema.statics.findByBooking = function(bookingId) {
  return this.find({
    bookingId,
    deleted: false
  }).sort({ createdAt: -1 });
};

paymentSchema.statics.findByStatus = function(status, options = {}) {
  const { limit = 50, skip = 0 } = options;
  
  return this.find({
    status,
    deleted: false
  })
  .populate('userId', 'firstName lastName email')
  .populate('bookingId', 'date startTime endTime')
  .populate('serviceId', 'name description')
  .populate('clinicId', 'name address')
  .sort({ createdAt: -1 })
  .limit(limit)
  .skip(skip);
};

paymentSchema.statics.findPending = function() {
  return this.find({
    status: 'pending',
    deleted: false,
    'dates.expiredAt': { $gt: new Date() }
  }).populate('userId', 'email firstName lastName');
};

paymentSchema.statics.findFailed = function() {
  return this.find({
    status: 'failed',
    deleted: false
  }).populate('userId', 'email firstName lastName');
};

paymentSchema.statics.findRefundable = function() {
  return this.find({
    status: 'completed',
    deleted: false,
    'refundInfo.status': { $ne: 'completed' }
  }).populate('userId', 'email firstName lastName');
};

paymentSchema.statics.findDisputed = function() {
  return this.find({
    'disputeInfo.status': { $in: ['pending', 'under_review'] },
    deleted: false
  }).populate('userId', 'email firstName lastName');
};

paymentSchema.statics.getStats = function(userId = null) {
  const match = { deleted: false };
  if (userId) match.userId = userId;

  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' }
      }
    }
  ]);
};

// Middleware pre-save
paymentSchema.pre('save', function(next) {
  // Calcular desglose si no existe
  if (!this.breakdown || !this.breakdown.total) {
    this.calculateBreakdown();
  }

  // Establecer fecha de expiración si es pendiente
  if (this.status === 'pending' && !this.dates.expiredAt) {
    this.dates.expiredAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas
  }

  next();
});

// Middleware pre-remove (soft delete)
paymentSchema.pre('remove', function(next) {
  this.deleted = true;
  this.deletedAt = new Date();
  this.save().then(() => {
    next();
  }).catch(next);
});

module.exports = mongoose.model('Payment', paymentSchema);
