const mongoose = require('mongoose');
const logger = require('../config/logger');

const clinicSchema = new mongoose.Schema({
  // Información básica de la clínica
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
    index: true
  },
  
  businessName: {
    type: String,
    trim: true,
    maxlength: 200
  },
  
  description: {
    type: String,
    maxlength: 2000
  },
  
  shortDescription: {
    type: String,
    maxlength: 500
  },
  
  // Categorización
  businessType: {
    type: String,
    required: true,
    enum: [
      'medical',           // Médico
      'beauty',            // Belleza
      'legal',             // Legal
      'educational',       // Educativo
      'technical',         // Técnico
      'financial',         // Financiero
      'consulting',        // Consultoría
      'other'              // Otro
    ],
    index: true
  },
  
  category: {
    type: String,
    required: true,
    enum: [
      // Clínicas médicas
      'general_medicine',      // Medicina general
      'dental',                // Odontología
      'ophthalmology',         // Oftalmología
      'dermatology',           // Dermatología
      'cardiology',            // Cardiología
      'neurology',             // Neurología
      'orthopedics',           // Ortopedia
      'pediatrics',            // Pediatría
      'gynecology',            // Ginecología
      'psychology',            // Psicología
      'psychiatry',            // Psiquiatría
      'nutrition',             // Nutrición
      'physiotherapy',         // Fisioterapia
      'laboratory',            // Laboratorio
      'imaging',               // Imágenes
      'surgery',               // Cirugía
      'emergency',             // Emergencia
      'veterinary',            // Veterinaria
      
      // Centros de belleza
      'beauty_salon',          // Salón de belleza
      'hair_salon',            // Peluquería
      'nail_salon',            // Salón de uñas
      'spa',                   // Spa
      'massage_center',        // Centro de masajes
      'aesthetic_clinic',      // Clínica estética
      'cosmetic_surgery',      // Cirugía estética
      
      // Estudios legales
      'law_firm',              // Estudio jurídico
      'notary_office',         // Notaría
      'legal_consulting',      // Consultoría legal
      
      // Centros educativos
      'language_school',       // Escuela de idiomas
      'music_school',          // Escuela de música
      'dance_school',          // Escuela de baile
      'art_school',            // Escuela de arte
      'sports_center',         // Centro deportivo
      'tutoring_center',       // Centro de tutoría
      
      // Talleres técnicos
      'computer_repair',       // Reparación de computadoras
      'phone_repair',          // Reparación de teléfonos
      'car_repair',            // Taller mecánico
      'home_repair',           // Reparaciones del hogar
      
      // Otros
      'photography_studio',    // Estudio fotográfico
      'event_venue',           // Salón de eventos
      'consulting_firm',       // Firma consultora
      'other'                  // Otro
    ],
    index: true
  },
  
  subcategory: {
    type: String,
    maxlength: 100
  },
  
  tags: [{
    type: String,
    maxlength: 50
  }],
  
  // Información de contacto
  contact: {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true
    },
    
    phone: {
      type: String,
      required: true,
      maxlength: 20
    },
    
    whatsapp: {
      type: String,
      maxlength: 20
    },
    
    website: {
      type: String,
      maxlength: 200
    },
    
    socialMedia: {
      facebook: String,
      instagram: String,
      twitter: String,
      linkedin: String,
      youtube: String
    }
  },
  
  // Ubicación
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
      index: '2dsphere'
    },
    address: {
      street: {
        type: String,
        required: true,
        maxlength: 200
      },
      number: String,
      apartment: String,
      neighborhood: String,
      city: {
        type: String,
        required: true,
        maxlength: 100
      },
      state: {
        type: String,
        required: true,
        maxlength: 100
      },
      country: {
        type: String,
        required: true,
        maxlength: 100,
        default: 'Argentina'
      },
      postalCode: String
    },
    formattedAddress: String,
    timezone: {
      type: String,
      default: 'America/Argentina/Buenos_Aires'
    }
  },
  
  // Horarios de funcionamiento
  operatingHours: {
    monday: {
      isOpen: { type: Boolean, default: true },
      openTime: { type: String, default: '09:00' },
      closeTime: { type: String, default: '18:00' },
      breakStart: { type: String, default: '12:00' },
      breakEnd: { type: String, default: '13:00' }
    },
    tuesday: {
      isOpen: { type: Boolean, default: true },
      openTime: { type: String, default: '09:00' },
      closeTime: { type: String, default: '18:00' },
      breakStart: { type: String, default: '12:00' },
      breakEnd: { type: String, default: '13:00' }
    },
    wednesday: {
      isOpen: { type: Boolean, default: true },
      openTime: { type: String, default: '09:00' },
      closeTime: { type: String, default: '18:00' },
      breakStart: { type: String, default: '12:00' },
      breakEnd: { type: String, default: '13:00' }
    },
    thursday: {
      isOpen: { type: Boolean, default: true },
      openTime: { type: String, default: '09:00' },
      closeTime: { type: String, default: '18:00' },
      breakStart: { type: String, default: '12:00' },
      breakEnd: { type: String, default: '13:00' }
    },
    friday: {
      isOpen: { type: Boolean, default: true },
      openTime: { type: String, default: '09:00' },
      closeTime: { type: String, default: '18:00' },
      breakStart: { type: String, default: '12:00' },
      breakEnd: { type: String, default: '13:00' }
    },
    saturday: {
      isOpen: { type: Boolean, default: false },
      openTime: { type: String, default: '09:00' },
      closeTime: { type: String, default: '14:00' },
      breakStart: { type: String, default: '12:00' },
      breakEnd: { type: String, default: '13:00' }
    },
    sunday: {
      isOpen: { type: Boolean, default: false },
      openTime: { type: String, default: '09:00' },
      closeTime: { type: String, default: '14:00' },
      breakStart: { type: String, default: '12:00' },
      breakEnd: { type: String, default: '13:00' }
    }
  },
  
  // Información del propietario
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Personal y profesionales
  staff: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: [
        'owner',           // Propietario
        'manager',         // Gerente
        'professional',    // Profesional
        'assistant',       // Asistente
        'receptionist',    // Recepcionista
        'other'            // Otro
      ],
      required: true
    },
    permissions: [{
      type: String,
      enum: [
        'manage_clinic',       // Gestionar clínica
        'manage_staff',        // Gestionar personal
        'manage_services',     // Gestionar servicios
        'manage_appointments', // Gestionar citas
        'view_reports',        // Ver reportes
        'manage_finances',     // Gestionar finanzas
        'manage_settings'      // Gestionar configuración
      ]
    }],
    startDate: {
      type: Date,
      default: Date.now
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  
  // Servicios ofrecidos
  services: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service'
  }],
  
  // Configuración de la clínica
  settings: {
    // Configuración de citas
    appointmentSettings: {
      defaultDuration: {
        type: Number,
        default: 30, // en minutos
        min: 15,
        max: 480
      },
      maxAdvanceBooking: {
        type: Number,
        default: 30, // en días
        min: 1,
        max: 365
      },
      minAdvanceBooking: {
        type: Number,
        default: 24, // en horas
        min: 0,
        max: 168
      },
      allowSameDayBooking: {
        type: Boolean,
        default: true
      },
      allowWalkIns: {
        type: Boolean,
        default: false
      },
      requireDeposit: {
        type: Boolean,
        default: false
      },
      depositPercentage: {
        type: Number,
        default: 20,
        min: 0,
        max: 100
      }
    },
    
    // Configuración de notificaciones
    notificationSettings: {
      emailNotifications: {
        type: Boolean,
        default: true
      },
      smsNotifications: {
        type: Boolean,
        default: true
      },
      pushNotifications: {
        type: Boolean,
        default: true
      },
      reminder24h: {
        type: Boolean,
        default: true
      },
      reminder1h: {
        type: Boolean,
        default: true
      },
      reminder15min: {
        type: Boolean,
        default: true
      },
      followUpReminders: {
        type: Boolean,
        default: false
      }
    },
    
    // Configuración de pagos
    paymentSettings: {
      acceptedMethods: [{
        type: String,
        enum: [
          'cash',         // Efectivo
          'card',         // Tarjeta
          'transfer',     // Transferencia
          'mercadopago',  // MercadoPago
          'other'         // Otro
        ]
      }],
      requirePaymentConfirmation: {
        type: Boolean,
        default: false
      },
      allowPartialPayments: {
        type: Boolean,
        default: false
      },
      autoCancelUnpaid: {
        type: Boolean,
        default: false
      },
      cancelAfterHours: {
        type: Number,
        default: 24,
        min: 1
      }
    },
    
    // Configuración de privacidad
    privacySettings: {
      isPublic: {
        type: Boolean,
        default: true
      },
      showStaffInfo: {
        type: Boolean,
        default: true
      },
      showPricing: {
        type: Boolean,
        default: true
      },
      allowReviews: {
        type: Boolean,
        default: true
      },
      requireReviewApproval: {
        type: Boolean,
        default: false
      }
    }
  },
  
  // Calificaciones y reseñas
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0,
      min: 0
    },
    distribution: {
      '1': { type: Number, default: 0 },
      '2': { type: Number, default: 0 },
      '3': { type: Number, default: 0 },
      '4': { type: Number, default: 0 },
      '5': { type: Number, default: 0 }
    }
  },
  
  // Estadísticas
  stats: {
    totalAppointments: {
      type: Number,
      default: 0
    },
    completedAppointments: {
      type: Number,
      default: 0
    },
    cancelledAppointments: {
      type: Number,
      default: 0
    },
    totalRevenue: {
      type: Number,
      default: 0
    },
    totalClients: {
      type: Number,
      default: 0
    },
    averageRating: {
      type: Number,
      default: 0
    }
  },
  
  // Imágenes y multimedia
  images: [{
    url: String,
    alt: String,
    isPrimary: {
      type: Boolean,
      default: false
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Documentos
  documents: [{
    name: String,
    url: String,
    type: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Información legal
  legal: {
    taxId: String,
    businessLicense: String,
    insurance: String,
    certifications: [String],
    compliance: {
      gdpr: { type: Boolean, default: false },
      hipaa: { type: Boolean, default: false },
      local: { type: Boolean, default: false }
    }
  },
  
  // Metadatos
  seoTitle: {
    type: String,
    maxlength: 60
  },
  
  seoDescription: {
    type: String,
    maxlength: 160
  },
  
  keywords: [{
    type: String,
    maxlength: 50
  }],
  
  // Estado de la clínica
  status: {
    type: String,
    enum: [
      'active',           // Activa
      'inactive',         // Inactiva
      'suspended',        // Suspendida
      'pending_approval', // Pendiente de aprobación
      'closed'            // Cerrada
    ],
    default: 'pending_approval',
    index: true
  },
  
  isVerified: {
    type: Boolean,
    default: false,
    index: true
  },
  
  // Información de auditoría
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Campos de soft delete
  isDeleted: {
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
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices compuestos para consultas eficientes
clinicSchema.index({ owner: 1, status: 1, isDeleted: 1 });
clinicSchema.index({ businessType: 1, category: 1, status: 1 });
clinicSchema.index({ 'location.coordinates': '2dsphere' });
clinicSchema.index({ 'rating.average': -1, 'rating.count': -1 });
clinicSchema.index({ status: 1, isVerified: 1, isDeleted: 1 });

// Índice de texto para búsquedas
clinicSchema.index({
  name: 'text',
  businessName: 'text',
  description: 'text',
  shortDescription: 'text',
  tags: 'text',
  keywords: 'text',
  'contact.email': 'text',
  'location.address.city': 'text',
  'location.address.state': 'text'
});

// Virtuals
clinicSchema.virtual('primaryImage').get(function() {
  const primary = this.images.find(img => img.isPrimary);
  return primary ? primary.url : (this.images.length > 0 ? this.images[0].url : null);
});

clinicSchema.virtual('isOpenToday').get(function() {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'lowercase' });
  return this.operatingHours[today]?.isOpen || false;
});

clinicSchema.virtual('todaySchedule').get(function() {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'lowercase' });
  const schedule = this.operatingHours[today];
  
  if (!schedule || !schedule.isOpen) {
    return null;
  }
  
  return {
    openTime: schedule.openTime,
    closeTime: schedule.closeTime,
    breakStart: schedule.breakStart,
    breakEnd: schedule.breakEnd
  };
});

clinicSchema.virtual('ratingText').get(function() {
  if (this.rating.count === 0) {
    return 'Sin calificaciones';
  }
  
  const rating = this.rating.average;
  if (rating >= 4.5) return 'Excelente';
  if (rating >= 4.0) return 'Muy bueno';
  if (rating >= 3.5) return 'Bueno';
  if (rating >= 3.0) return 'Regular';
  return 'Necesita mejorar';
});

clinicSchema.virtual('formattedAddress').get(function() {
  const addr = this.location.address;
  let formatted = '';
  
  if (addr.street) formatted += addr.street;
  if (addr.number) formatted += ` ${addr.number}`;
  if (addr.apartment) formatted += ` ${addr.apartment}`;
  if (addr.neighborhood) formatted += `, ${addr.neighborhood}`;
  if (addr.city) formatted += `, ${addr.city}`;
  if (addr.state) formatted += `, ${addr.state}`;
  if (addr.postalCode) formatted += ` ${addr.postalCode}`;
  
  return formatted;
});

clinicSchema.virtual('activeStaff').get(function() {
  return this.staff.filter(member => member.isActive);
});

clinicSchema.virtual('professionals').get(function() {
  return this.staff.filter(member => 
    member.isActive && member.role === 'professional'
  );
});

// Middleware pre-save
clinicSchema.pre('save', async function(next) {
  try {
    // Validar que el propietario sea del tipo correcto
    if (this.isModified('owner')) {
      const User = mongoose.model('User');
      const owner = await User.findById(this.owner);
      
      if (!owner || !['professional', 'admin'].includes(owner.userType)) {
        throw new Error('El propietario debe ser un profesional o administrador');
      }
    }
    
    // Validar coordenadas
    if (this.location.coordinates.length !== 2) {
      throw new Error('Las coordenadas deben tener exactamente 2 valores (longitud, latitud)');
    }
    
    const [lng, lat] = this.location.coordinates;
    if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
      throw new Error('Coordenadas geográficas inválidas');
    }
    
    // Validar horarios
    for (const [day, schedule] of Object.entries(this.operatingHours)) {
      if (schedule.isOpen) {
        if (schedule.openTime >= schedule.closeTime) {
          throw new Error(`Horario inválido para ${day}: la hora de apertura debe ser anterior a la de cierre`);
        }
        
        if (schedule.breakStart && schedule.breakEnd) {
          if (schedule.breakStart >= schedule.breakEnd) {
            throw new Error(`Horario de descanso inválido para ${day}`);
          }
          
          if (schedule.breakStart < schedule.openTime || schedule.breakEnd > schedule.closeTime) {
            throw new Error(`El descanso debe estar dentro del horario de funcionamiento para ${day}`);
          }
        }
      }
    }
    
    // Generar dirección formateada
    this.location.formattedAddress = this.formattedAddress;
    
    next();
  } catch (error) {
    next(error);
  }
});

// Métodos de instancia
clinicSchema.methods.addStaffMember = function(userId, role, permissions = []) {
  // Verificar que el usuario no esté ya en el personal
  const existingMember = this.staff.find(member => 
    member.user.toString() === userId.toString()
  );
  
  if (existingMember) {
    throw new Error('El usuario ya es miembro del personal');
  }
  
  this.staff.push({
    user: userId,
    role,
    permissions,
    startDate: new Date(),
    isActive: true
  });
  
  return this.save();
};

clinicSchema.methods.removeStaffMember = function(userId) {
  const memberIndex = this.staff.findIndex(member => 
    member.user.toString() === userId.toString()
  );
  
  if (memberIndex === -1) {
    throw new Error('Usuario no encontrado en el personal');
  }
  
  // No permitir eliminar al propietario
  if (this.staff[memberIndex].role === 'owner') {
    throw new Error('No se puede eliminar al propietario de la clínica');
  }
  
  this.staff.splice(memberIndex, 1);
  return this.save();
};

clinicSchema.methods.updateStaffRole = function(userId, newRole, newPermissions = []) {
  const member = this.staff.find(member => 
    member.user.toString() === userId.toString()
  );
  
  if (!member) {
    throw new Error('Usuario no encontrado en el personal');
  }
  
  // No permitir cambiar el rol del propietario
  if (member.role === 'owner') {
    throw new Error('No se puede cambiar el rol del propietario');
  }
  
  member.role = newRole;
  member.permissions = newPermissions;
  
  return this.save();
};

clinicSchema.methods.isOpenAt = function(date, time) {
  const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'lowercase' });
  const schedule = this.operatingHours[dayOfWeek];
  
  if (!schedule || !schedule.isOpen) {
    return false;
  }
  
  const [hour, minute] = time.split(':').map(Number);
  const timeInMinutes = hour * 60 + minute;
  
  const [openHour, openMinute] = schedule.openTime.split(':').map(Number);
  const openTimeInMinutes = openHour * 60 + openMinute;
  
  const [closeHour, closeMinute] = schedule.closeTime.split(':').map(Number);
  const closeTimeInMinutes = closeHour * 60 + closeMinute;
  
  // Verificar si está dentro del horario de funcionamiento
  if (timeInMinutes < openTimeInMinutes || timeInMinutes >= closeTimeInMinutes) {
    return false;
  }
  
  // Verificar si está en el descanso
  if (schedule.breakStart && schedule.breakEnd) {
    const [breakStartHour, breakStartMinute] = schedule.breakStart.split(':').map(Number);
    const [breakEndHour, breakEndMinute] = schedule.breakEnd.split(':').map(Number);
    
    const breakStartTimeInMinutes = breakStartHour * 60 + breakStartMinute;
    const breakEndTimeInMinutes = breakEndHour * 60 + breakEndMinute;
    
    if (timeInMinutes >= breakStartTimeInMinutes && timeInMinutes < breakEndTimeInMinutes) {
      return false;
    }
  }
  
  return true;
};

clinicSchema.methods.getAvailableSlots = function(date, slotDuration = 30) {
  const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'lowercase' });
  const schedule = this.operatingHours[dayOfWeek];
  
  if (!schedule || !schedule.isOpen) {
    return [];
  }
  
  const slots = [];
  const [openHour, openMinute] = schedule.openTime.split(':').map(Number);
  const [closeHour, closeMinute] = schedule.closeTime.split(':').map(Number);
  
  let currentTime = openHour * 60 + openMinute;
  const closeTime = closeHour * 60 + closeMinute;
  
  while (currentTime + slotDuration <= closeTime) {
    const slotStart = new Date(date);
    slotStart.setHours(Math.floor(currentTime / 60), currentTime % 60, 0, 0);
    
    const slotEnd = new Date(slotStart);
    slotEnd.setMinutes(slotEnd.getMinutes() + slotDuration);
    
    // Verificar si el slot está en el descanso
    let isBreakTime = false;
    if (schedule.breakStart && schedule.breakEnd) {
      const [breakStartHour, breakStartMinute] = schedule.breakStart.split(':').map(Number);
      const [breakEndHour, breakEndMinute] = schedule.breakEnd.split(':').map(Number);
      
      const breakStartTime = breakStartHour * 60 + breakStartMinute;
      const breakEndTime = breakEndHour * 60 + breakEndMinute;
      
      if (currentTime >= breakStartTime && currentTime < breakEndTime) {
        isBreakTime = true;
      }
    }
    
    if (!isBreakTime) {
      slots.push({
        startTime: slotStart,
        endTime: slotEnd,
        startTimeString: `${String(Math.floor(currentTime / 60)).padStart(2, '0')}:${String(currentTime % 60).padStart(2, '0')}`,
        endTimeString: `${String(Math.floor((currentTime + slotDuration) / 60)).padStart(2, '0')}:${String((currentTime + slotDuration) % 60).padStart(2, '0')}`
      });
    }
    
    currentTime += slotDuration;
  }
  
  return slots;
};

clinicSchema.methods.updateRating = function(newRating) {
  // Actualizar distribución
  this.rating.distribution[newRating]++;
  
  // Calcular nuevo promedio
  const totalRatings = Object.values(this.rating.distribution).reduce((sum, count) => sum + count, 0);
  const totalScore = Object.entries(this.rating.distribution).reduce((sum, [rating, count]) => sum + (parseInt(rating) * count), 0);
  
  this.rating.average = totalScore / totalRatings;
  this.rating.count = totalRatings;
  
  // Actualizar estadísticas
  this.stats.averageRating = this.rating.average;
  
  return this.save();
};

clinicSchema.methods.addImage = function(imageData) {
  this.images.push(imageData);
  
  // Si es la primera imagen, marcarla como principal
  if (this.images.length === 1) {
    this.images[0].isPrimary = true;
  }
  
  return this.save();
};

clinicSchema.methods.setPrimaryImage = function(imageIndex) {
  if (imageIndex >= 0 && imageIndex < this.images.length) {
    this.images.forEach((img, index) => {
      img.isPrimary = index === imageIndex;
    });
    return this.save();
  }
  throw new Error('Índice de imagen inválido');
};

clinicSchema.methods.removeImage = function(imageIndex) {
  if (imageIndex >= 0 && imageIndex < this.images.length) {
    const removedImage = this.images.splice(imageIndex, 1)[0];
    
    // Si se eliminó la imagen principal y hay otras imágenes, marcar la primera como principal
    if (removedImage.isPrimary && this.images.length > 0) {
      this.images[0].isPrimary = true;
    }
    
    return this.save();
  }
  throw new Error('Índice de imagen inválido');
};

// Métodos estáticos
clinicSchema.statics.findByOwner = function(ownerId, filters = {}) {
  const query = { owner: ownerId, isDeleted: false };
  
  if (filters.status) query.status = filters.status;
  if (filters.businessType) query.businessType = filters.businessType;
  if (filters.category) query.category = filters.category;
  
  return this.find(query)
    .populate('staff.user', 'fullName email phone')
    .sort({ name: 1 });
};

clinicSchema.statics.findByLocation = function(latitude, longitude, radius = 10000, filters = {}) {
  const query = {
    isDeleted: false,
    status: 'active',
    'location.coordinates': {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        $maxDistance: radius
      }
    }
  };
  
  if (filters.businessType) query.businessType = filters.businessType;
  if (filters.category) query.category = filters.category;
  if (filters.isVerified !== undefined) query.isVerified = filters.isVerified;
  
  return this.find(query)
    .populate('owner', 'fullName email phone')
    .populate('staff.user', 'fullName email phone')
    .sort({ 'rating.average': -1, 'rating.count': -1 });
};

clinicSchema.statics.search = function(searchTerm, filters = {}) {
  const query = { isDeleted: false, status: 'active' };
  
  if (searchTerm) {
    query.$text = { $search: searchTerm };
  }
  
  if (filters.businessType) query.businessType = filters.businessType;
  if (filters.category) query.category = filters.category;
  if (filters.isVerified !== undefined) query.isVerified = filters.isVerified;
  if (filters.location) {
    query['location.coordinates'] = {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [filters.location.lng, filters.location.lat]
        },
        $maxDistance: filters.location.radius || 10000
      }
    };
  }
  
  let sort = {};
  if (filters.sortBy === 'rating') {
    sort['rating.average'] = filters.sortOrder === 'desc' ? -1 : 1;
  } else if (filters.sortBy === 'distance' && filters.location) {
    // Mantener orden por distancia si se especifica ubicación
  } else {
    sort = { 'rating.average': -1, 'rating.count': -1 };
  }
  
  return this.find(query)
    .populate('owner', 'fullName email phone')
    .populate('staff.user', 'fullName email phone')
    .sort(sort)
    .limit(filters.limit || 50);
};

clinicSchema.statics.getPopularClinics = function(limit = 10, filters = {}) {
  const query = { isDeleted: false, status: 'active' };
  
  if (filters.businessType) query.businessType = filters.businessType;
  if (filters.category) query.category = filters.category;
  
  return this.find(query)
    .populate('owner', 'fullName email phone')
    .sort({ 'stats.totalAppointments': -1, 'rating.average': -1 })
    .limit(limit);
};

clinicSchema.statics.getClinicStats = async function(filters = {}) {
  const matchStage = { isDeleted: false };
  
  if (filters.owner) matchStage.owner = filters.owner;
  if (filters.businessType) matchStage.businessType = filters.businessType;
  if (filters.category) matchStage.category = filters.category;
  if (filters.status) matchStage.status = filters.status;
  if (filters.isVerified !== undefined) matchStage.isVerified = filters.isVerified;
  
  const stats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalClinics: { $sum: 1 },
        activeClinics: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
        verifiedClinics: { $sum: { $cond: ['$isVerified', 1, 0] } },
        totalRevenue: { $sum: '$stats.totalRevenue' },
        totalAppointments: { $sum: '$stats.totalAppointments' },
        averageRating: { $avg: '$rating.average' }
      }
    }
  ]);
  
  return stats[0] || {
    totalClinics: 0,
    activeClinics: 0,
    verifiedClinics: 0,
    totalRevenue: 0,
    totalAppointments: 0,
    averageRating: 0
  };
};

// Métodos de validación
clinicSchema.methods.validateClinic = function() {
  const errors = [];
  
  // Validar nombre
  if (!this.name || this.name.trim().length === 0) {
    errors.push('El nombre de la clínica es requerido');
  }
  
  // Validar email
  if (!this.contact.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.contact.email)) {
    errors.push('Email de contacto válido es requerido');
  }
  
  // Validar teléfono
  if (!this.contact.phone) {
    errors.push('Teléfono de contacto es requerido');
  }
  
  // Validar dirección
  if (!this.location.address.street || !this.location.address.city || !this.location.address.state) {
    errors.push('Dirección completa es requerida');
  }
  
  // Validar coordenadas
  if (!this.location.coordinates || this.location.coordinates.length !== 2) {
    errors.push('Coordenadas geográficas son requeridas');
  }
  
  return errors;
};

// Métodos de negocio
clinicSchema.methods.updateStats = function(appointmentData) {
  this.stats.totalAppointments++;
  
  if (appointmentData.status === 'completed') {
    this.stats.completedAppointments++;
  } else if (appointmentData.status === 'cancelled') {
    this.stats.cancelledAppointments++;
  }
  
  if (appointmentData.amount) {
    this.stats.totalRevenue += appointmentData.amount;
  }
  
  return this.save();
};

// Métodos de limpieza
clinicSchema.methods.softDelete = function(userId) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = userId;
  
  return this.save();
};

clinicSchema.methods.restore = function() {
  this.isDeleted = false;
  this.deletedAt = undefined;
  this.deletedBy = undefined;
  
  return this.save();
};

// Métodos de exportación
clinicSchema.methods.toPublicJSON = function() {
  const clinic = this.toObject();
  
  // Remover información sensible
  delete clinic.staff;
  delete clinic.documents;
  delete clinic.legal;
  delete clinic.settings;
  delete clinic.isDeleted;
  delete clinic.deletedAt;
  delete clinic.deletedBy;
  
  return clinic;
};

// Métodos de auditoría
clinicSchema.methods.logAccess = function(userId, action, details = {}) {
  logger.logSystemEvent('clinic_access', {
    ...details,
    clinicId: this._id,
    clinicName: this.name,
    owner: this.owner,
    userId
  });
};

// Configuración del esquema
clinicSchema.set('autoIndex', false);

module.exports = mongoose.model('Clinic', clinicSchema);
