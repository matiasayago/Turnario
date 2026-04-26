const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  // Nombre de la categoría
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
    index: true
  },

  // Descripción de la categoría
  description: {
    type: String,
    maxlength: 500,
    trim: true
  },

  // Slug para URLs amigables
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
    validate: {
      validator: function(v) {
        return /^[a-z0-9-]+$/.test(v);
      },
      message: 'El slug solo puede contener letras minúsculas, números y guiones'
    }
  },

  // Categoría padre (para jerarquías)
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null,
    index: true
  },

  // Nivel en la jerarquía
  level: {
    type: Number,
    default: 0,
    min: 0,
    max: 10
  },

  // Orden de visualización
  order: {
    type: Number,
    default: 0,
    min: 0
  },

  // Icono de la categoría
  icon: {
    type: String,
    maxlength: 50
  },

  // Imagen de la categoría
  image: {
    url: String,
    alt: String,
    caption: String
  },

  // Color de la categoría
  color: {
    type: String,
    validate: {
      validator: function(v) {
        return /^#[0-9A-F]{6}$/i.test(v);
      },
      message: 'El color debe ser un código hexadecimal válido'
    }
  },

  // Estado de la categoría
  status: {
    type: String,
    enum: ['active', 'inactive', 'archived'],
    default: 'active',
    index: true
  },

  // Configuración de visibilidad
  visibility: {
    type: String,
    enum: ['public', 'private', 'restricted'],
    default: 'public'
  },

  // Roles que pueden acceder (si es restringida)
  allowedRoles: [{
    type: String,
    enum: ['admin', 'provider', 'client', 'staff']
  }],

  // Configuración de SEO
  seo: {
    title: {
      type: String,
      maxlength: 60
    },
    description: {
      type: String,
      maxlength: 160
    },
    keywords: [String]
  },

  // Configuración de filtros
  filters: {
    priceRange: {
      min: {
        type: Number,
        min: 0
      },
      max: {
        type: Number,
        min: 0
      }
    },
    duration: {
      min: {
        type: Number,
        min: 0
      },
      max: {
        type: Number,
        min: 0
      }
    },
    availability: {
      type: String,
      enum: ['anytime', 'business_hours', 'weekdays', 'weekends']
    }
  },

  // Estadísticas
  stats: {
    serviceCount: {
      type: Number,
      default: 0,
      min: 0
    },
    bookingCount: {
      type: Number,
      default: 0,
      min: 0
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    totalReviews: {
      type: Number,
      default: 0,
      min: 0
    }
  },

  // Configuración de notificaciones
  notifications: {
    newService: {
      type: Boolean,
      default: true
    },
    serviceUpdate: {
      type: Boolean,
      default: true
    },
    bookingReminder: {
      type: Boolean,
      default: true
    }
  },

  // Configuración de recordatorios
  reminders: {
    enabled: {
      type: Boolean,
      default: true
    },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      default: 'weekly'
    },
    message: {
      type: String,
      maxlength: 200
    }
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
categorySchema.index({ parent: 1, order: 1 });
categorySchema.index({ level: 1, status: 1 });
categorySchema.index({ slug: 1, status: 1 });
categorySchema.index({ 'stats.serviceCount': -1 });
categorySchema.index({ 'stats.averageRating': -1 });

// Métodos de instancia
categorySchema.methods.getChildren = function() {
  return this.model('Category').find({
    parent: this._id,
    status: 'active',
    deleted: false
  }).sort({ order: 1, name: 1 });
};

categorySchema.methods.getAncestors = function() {
  const ancestors = [];
  let current = this;
  
  while (current.parent) {
    current = this.model('Category').findById(current.parent);
    if (current) {
      ancestors.unshift(current);
    } else {
      break;
    }
  }
  
  return ancestors;
};

categorySchema.methods.getDescendants = function() {
  const descendants = [];
  
  const getChildren = async (categoryId) => {
    const children = await this.model('Category').find({
      parent: categoryId,
      status: 'active',
      deleted: false
    });
    
    for (const child of children) {
      descendants.push(child);
      await getChildren(child._id);
    }
  };
  
  return getChildren(this._id).then(() => descendants);
};

categorySchema.methods.updateStats = async function() {
  const Service = mongoose.model('Service');
  const Booking = mongoose.model('Booking');
  const Review = mongoose.model('Review');
  
  // Contar servicios
  const serviceCount = await Service.countDocuments({
    categoryId: this._id,
    status: 'active',
    deleted: false
  });
  
  // Contar reservas
  const bookingCount = await Booking.countDocuments({
    'serviceId': { $in: await Service.find({ categoryId: this._id }).distinct('_id') },
    status: { $in: ['confirmed', 'completed'] },
    deleted: false
  });
  
  // Calcular calificación promedio
  const reviews = await Review.aggregate([
    {
      $lookup: {
        from: 'services',
        localField: 'serviceId',
        foreignField: '_id',
        as: 'service'
      }
    },
    {
      $match: {
        'service.categoryId': this._id,
        rating: { $exists: true, $ne: null }
      }
    },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 }
      }
    }
  ]);
  
  this.stats = {
    serviceCount,
    bookingCount,
    averageRating: reviews.length > 0 ? Math.round(reviews[0].averageRating * 10) / 10 : 0,
    totalReviews: reviews.length > 0 ? reviews[0].totalReviews : 0
  };
  
  return this.save();
};

categorySchema.methods.activate = function() {
  this.status = 'active';
  return this.save();
};

categorySchema.methods.deactivate = function() {
  this.status = 'inactive';
  return this.save();
};

categorySchema.methods.archive = function() {
  this.status = 'archived';
  return this.save();
};

// Métodos estáticos
categorySchema.statics.findRootCategories = function() {
  return this.find({
    parent: null,
    status: 'active',
    deleted: false
  }).sort({ order: 1, name: 1 });
};

categorySchema.statics.findBySlug = function(slug) {
  return this.findOne({
    slug,
    status: 'active',
    deleted: false
  });
};

categorySchema.statics.findByLevel = function(level) {
  return this.find({
    level,
    status: 'active',
    deleted: false
  }).sort({ order: 1, name: 1 });
};

categorySchema.statics.findHierarchy = function() {
  return this.aggregate([
    {
      $match: {
        status: 'active',
        deleted: false
      }
    },
    {
      $sort: { level: 1, order: 1, name: 1 }
    },
    {
      $lookup: {
        from: 'categories',
        localField: '_id',
        foreignField: 'parent',
        as: 'children'
      }
    }
  ]);
};

categorySchema.statics.findPopular = function(limit = 10) {
  return this.find({
    status: 'active',
    deleted: false,
    'stats.serviceCount': { $gt: 0 }
  })
  .sort({ 'stats.serviceCount': -1, 'stats.averageRating': -1 })
  .limit(limit);
};

categorySchema.statics.findByServiceCount = function(minCount = 1) {
  return this.find({
    status: 'active',
    deleted: false,
    'stats.serviceCount': { $gte: minCount }
  }).sort({ 'stats.serviceCount': -1 });
};

categorySchema.statics.updateAllStats = async function() {
  const categories = await this.find({ deleted: false });
  
  for (const category of categories) {
    await category.updateStats();
  }
  
  return categories.length;
};

// Middleware pre-save
categorySchema.pre('save', function(next) {
  // Generar slug si no existe
  if (!this.slug && this.name) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-');
  }
  
  // Calcular nivel si hay padre
  if (this.parent) {
    this.model('Category').findById(this.parent).then(parent => {
      if (parent) {
        this.level = parent.level + 1;
      }
    }).catch(next);
  } else {
    this.level = 0;
  }
  
  next();
});

// Middleware pre-remove (soft delete)
categorySchema.pre('remove', function(next) {
  this.deleted = true;
  this.deletedAt = new Date();
  this.save().then(() => {
    next();
  }).catch(next);
});

// Middleware post-save
categorySchema.post('save', function() {
  // Actualizar estadísticas de la categoría padre si existe
  if (this.parent) {
    this.model('Category').findById(this.parent).then(parent => {
      if (parent) {
        parent.updateStats();
      }
    });
  }
});

module.exports = mongoose.model('Category', categorySchema);
