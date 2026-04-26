const mongoose = require('mongoose');
const logger = require('../config/logger');

const serviceSchema = new mongoose.Schema({
  // Información básica del servicio
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
    index: true
  },
  
  description: {
    type: String,
    required: true,
    maxlength: 2000
  },
  
  shortDescription: {
    type: String,
    maxlength: 500
  },
  
  // Categorización
  category: {
    type: String,
    required: true,
    enum: [
      // Servicios médicos
      'medical_consultation',    // Consulta médica
      'dental',                  // Odontología
      'ophthalmology',           // Oftalmología
      'dermatology',             // Dermatología
      'cardiology',              // Cardiología
      'neurology',               // Neurología
      'orthopedics',             // Ortopedia
      'pediatrics',              // Pediatría
      'gynecology',              // Ginecología
      'psychology',              // Psicología
      'psychiatry',              // Psiquiatría
      'nutrition',                // Nutrición
      'physiotherapy',           // Fisioterapia
      'laboratory',              // Laboratorio
      'imaging',                  // Imágenes
      'surgery',                  // Cirugía
      'emergency',                // Emergencia
      
      // Servicios de belleza
      'haircut',                 // Corte de pelo
      'hair_coloring',           // Coloración
      'hair_styling',            // Peinado
      'manicure',                // Manicura
      'pedicure',                // Pedicura
      'facial',                  // Facial
      'massage',                 // Masaje
      'makeup',                  // Maquillaje
      'waxing',                  // Depilación
      'nails',                   // Uñas
      
      // Servicios legales
      'legal_consultation',      // Consulta legal
      'contract_review',         // Revisión de contratos
      'litigation',              // Litigio
      'notary',                  // Notaría
      'family_law',              // Derecho familiar
      'criminal_law',            // Derecho penal
      'civil_law',               // Derecho civil
      'commercial_law',          // Derecho comercial
      'labor_law',               // Derecho laboral
      
      // Servicios educativos
      'tutoring',                // Tutoría
      'language_lessons',        // Clases de idioma
      'music_lessons',           // Clases de música
      'dance_lessons',           // Clases de baile
      'art_lessons',             // Clases de arte
      'sports_training',         // Entrenamiento deportivo
      'academic_support',        // Apoyo académico
      'test_preparation',        // Preparación de exámenes
      
      // Servicios técnicos
      'computer_repair',         // Reparación de computadoras
      'phone_repair',            // Reparación de teléfonos
      'home_repair',             // Reparación del hogar
      'car_repair',              // Reparación de autos
      'plumbing',                // Plomería
      'electrical',              // Electricidad
      'carpentry',               // Carpintería
      'cleaning',                // Limpieza
      
      // Servicios financieros
      'financial_advice',        // Asesoría financiera
      'tax_consultation',        // Consulta tributaria
      'investment_advice',       // Asesoría de inversión
      'insurance',               // Seguros
      'accounting',              // Contabilidad
      'bookkeeping',             // Teneduría de libros
      
      // Otros servicios
      'photography',             // Fotografía
      'videography',             // Videografía
      'event_planning',          // Planificación de eventos
      'catering',                // Catering
      'transportation',          // Transporte
      'translation',             // Traducción
      'consulting',              // Consultoría
      'other'                    // Otro
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
  
  // Información del negocio
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
  
  // Precios y duración
  basePrice: {
    type: Number,
    required: true,
    min: 0
  },
  
  currency: {
    type: String,
    default: 'ARS',
    enum: ['ARS', 'USD', 'EUR', 'BRL', 'CLP', 'COP', 'MXN', 'PEN', 'UYU']
  },
  
  priceType: {
    type: String,
    enum: [
      'fixed',           // Precio fijo
      'hourly',          // Por hora
      'session',         // Por sesión
      'package',         // Paquete
      'consultation',    // Consulta
      'variable'         // Variable
    ],
    default: 'fixed'
  },
  
  duration: {
    type: Number, // en minutos
    required: true,
    min: 15,
    max: 480 // 8 horas máximo
  },
  
  // Configuración de disponibilidad
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  
  requiresAppointment: {
    type: Boolean,
    default: true
  },
  
  allowsWalkIn: {
    type: Boolean,
    default: false
  },
  
  maxBookingsPerDay: {
    type: Number,
    default: 10,
    min: 1
  },
  
  maxBookingsPerSlot: {
    type: Number,
    default: 1,
    min: 1
  },
  
  // Horarios de disponibilidad
  availability: {
    monday: {
      isAvailable: { type: Boolean, default: true },
      startTime: { type: String, default: '09:00' },
      endTime: { type: String, default: '18:00' },
      breakStart: { type: String, default: '12:00' },
      breakEnd: { type: String, default: '13:00' }
    },
    tuesday: {
      isAvailable: { type: Boolean, default: true },
      startTime: { type: String, default: '09:00' },
      endTime: { type: String, default: '18:00' },
      breakStart: { type: String, default: '12:00' },
      breakEnd: { type: String, default: '13:00' }
    },
    wednesday: {
      isAvailable: { type: Boolean, default: true },
      startTime: { type: String, default: '09:00' },
      endTime: { type: String, default: '18:00' },
      breakStart: { type: String, default: '12:00' },
      breakEnd: { type: String, default: '13:00' }
    },
    thursday: {
      isAvailable: { type: Boolean, default: true },
      startTime: { type: String, default: '09:00' },
      endTime: { type: String, default: '18:00' },
      breakStart: { type: String, default: '12:00' },
      breakEnd: { type: String, default: '13:00' }
    },
    friday: {
      isAvailable: { type: Boolean, default: true },
      startTime: { type: String, default: '09:00' },
      endTime: { type: String, default: '18:00' },
      breakStart: { type: String, default: '12:00' },
      breakEnd: { type: String, default: '13:00' }
    },
    saturday: {
      isAvailable: { type: Boolean, default: false },
      startTime: { type: String, default: '09:00' },
      endTime: { type: String, default: '14:00' },
      breakStart: { type: String, default: '12:00' },
      breakEnd: { type: String, default: '13:00' }
    },
    sunday: {
      isAvailable: { type: Boolean, default: false },
      startTime: { type: String, default: '09:00' },
      endTime: { type: String, default: '14:00' },
      breakStart: { type: String, default: '12:00' },
      breakEnd: { type: String, default: '13:00' }
    }
  },
  
  // Configuración de reservas
  bookingAdvance: {
    type: Number, // en horas
    default: 24,
    min: 0
  },
  
  cancellationPolicy: {
    type: String,
    enum: [
      'flexible',        // Cancelación gratuita hasta 24h antes
      'moderate',        // Cancelación gratuita hasta 12h antes
      'strict',          // Cancelación gratuita hasta 2h antes
      'no_refund'        // Sin reembolso
    ],
    default: 'moderate'
  },
  
  cancellationNotice: {
    type: Number, // en horas
    default: 12,
    min: 0
  },
  
  // Requisitos y preparación
  requirements: [{
    type: String,
    maxlength: 500
  }],
  
  preparation: [{
    type: String,
    maxlength: 500
  }],
  
  contraindications: [{
    type: String,
    maxlength: 500
  }],
  
  // Información del profesional
  professional: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  clinic: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Clinic',
    required: true,
    index: true
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
    totalBookings: {
      type: Number,
      default: 0
    },
    completedBookings: {
      type: Number,
      default: 0
    },
    cancelledBookings: {
      type: Number,
      default: 0
    },
    totalRevenue: {
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
  
  // Configuración de notificaciones
  notifications: {
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
    followUp: {
      type: Boolean,
      default: false
    }
  },
  
  // Configuración de privacidad
  isPrivate: {
    type: Boolean,
    default: false
  },
  
  requiresInsurance: {
    type: Boolean,
    default: false
  },
  
  insuranceAccepted: [{
    type: String,
    maxlength: 100
  }],
  
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
serviceSchema.index({ professional: 1, isActive: 1, category: 1 });
serviceSchema.index({ clinic: 1, isActive: 1, category: 1 });
serviceSchema.index({ businessType: 1, category: 1, isActive: 1 });
serviceSchema.index({ 'rating.average': -1, 'rating.count': -1 });
serviceSchema.index({ basePrice: 1, isActive: 1 });

// Índice de texto para búsquedas
serviceSchema.index({
  name: 'text',
  description: 'text',
  shortDescription: 'text',
  tags: 'text',
  keywords: 'text'
});

// Virtuals
serviceSchema.virtual('primaryImage').get(function() {
  const primary = this.images.find(img => img.isPrimary);
  return primary ? primary.url : (this.images.length > 0 ? this.images[0].url : null);
});

serviceSchema.virtual('formattedPrice').get(function() {
  const currencySymbols = {
    'ARS': '$',
    'USD': 'US$',
    'EUR': '€',
    'BRL': 'R$',
    'CLP': '$',
    'COP': '$',
    'MXN': '$',
    'PEN': 'S/',
    'UYU': '$U'
  };
  
  const symbol = currencySymbols[this.currency] || this.currency;
  
  if (this.priceType === 'hourly') {
    return `${symbol}${this.basePrice}/hora`;
  } else if (this.priceType === 'session') {
    return `${symbol}${this.basePrice}/sesión`;
  } else if (this.priceType === 'package') {
    return `${symbol}${this.basePrice}/paquete`;
  } else {
    return `${symbol}${this.basePrice}`;
  }
});

serviceSchema.virtual('formattedDuration').get(function() {
  if (this.duration < 60) {
    return `${this.duration} min`;
  } else {
    const hours = Math.floor(this.duration / 60);
    const minutes = this.duration % 60;
    if (minutes === 0) {
      return `${hours}h`;
    } else {
      return `${hours}h ${minutes}min`;
    }
  }
});

serviceSchema.virtual('isAvailableToday').get(function() {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'lowercase' });
  return this.availability[today]?.isAvailable || false;
});

serviceSchema.virtual('todaySchedule').get(function() {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'lowercase' });
  const schedule = this.availability[today];
  
  if (!schedule || !schedule.isAvailable) {
    return null;
  }
  
  return {
    startTime: schedule.startTime,
    endTime: schedule.endTime,
    breakStart: schedule.breakStart,
    breakEnd: schedule.breakEnd
  };
});

serviceSchema.virtual('ratingText').get(function() {
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

// Middleware pre-save
serviceSchema.pre('save', async function(next) {
  try {
    // Validar que el profesional sea del tipo correcto
    if (this.isModified('professional')) {
      const User = mongoose.model('User');
      const professional = await User.findById(this.professional);
      
      if (!professional || professional.userType !== 'professional') {
        throw new Error('El usuario debe ser un profesional');
      }
    }
    
    // Validar que la clínica exista
    if (this.isModified('clinic')) {
      const Clinic = mongoose.model('Clinic');
      const clinic = await Clinic.findById(this.clinic);
      
      if (!clinic) {
        throw new Error('La clínica no existe');
      }
    }
    
    // Validar precios
    if (this.basePrice < 0) {
      throw new Error('El precio base no puede ser negativo');
    }
    
    // Validar duración
    if (this.duration < 15 || this.duration > 480) {
      throw new Error('La duración debe estar entre 15 minutos y 8 horas');
    }
    
    // Validar horarios
    for (const [day, schedule] of Object.entries(this.availability)) {
      if (schedule.isAvailable) {
        if (schedule.startTime >= schedule.endTime) {
          throw new Error(`Horario inválido para ${day}: la hora de inicio debe ser anterior a la de fin`);
        }
        
        if (schedule.breakStart && schedule.breakEnd) {
          if (schedule.breakStart >= schedule.breakEnd) {
            throw new Error(`Horario de descanso inválido para ${day}`);
          }
          
          if (schedule.breakStart < schedule.startTime || schedule.breakEnd > schedule.endTime) {
            throw new Error(`El descanso debe estar dentro del horario de trabajo para ${day}`);
          }
        }
      }
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Métodos de instancia
serviceSchema.methods.updateRating = function(newRating) {
  const oldRating = this.rating.average;
  const oldCount = this.rating.count;
  
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

serviceSchema.methods.isAvailableAt = function(date, time) {
  const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'lowercase' });
  const schedule = this.availability[dayOfWeek];
  
  if (!schedule || !schedule.isAvailable) {
    return false;
  }
  
  const [hour, minute] = time.split(':').map(Number);
  const timeInMinutes = hour * 60 + minute;
  
  const [startHour, startMinute] = schedule.startTime.split(':').map(Number);
  const startTimeInMinutes = startHour * 60 + startMinute;
  
  const [endHour, endMinute] = schedule.endTime.split(':').map(Number);
  const endTimeInMinutes = endHour * 60 + endMinute;
  
  // Verificar si está dentro del horario de trabajo
  if (timeInMinutes < startTimeInMinutes || timeInMinutes >= endTimeInMinutes) {
    return false;
  }
  
  // Verificar si está en el descanso
  if (schedule.breakStart && schedule.breakEnd) {
    const [breakStartHour, breakStartMinute] = schedule.breakStart.split(':').map(Number);
    const breakStartTimeInMinutes = breakStartHour * 60 + breakStartMinute;
    
    const [breakEndHour, breakEndMinute] = schedule.breakEnd.split(':').map(Number);
    const breakEndTimeInMinutes = breakEndHour * 60 + breakEndMinute;
    
    if (timeInMinutes >= breakStartTimeInMinutes && timeInMinutes < breakEndTimeInMinutes) {
      return false;
    }
  }
  
  return true;
};

serviceSchema.methods.getAvailableSlots = function(date, slotDuration = 30) {
  const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'lowercase' });
  const schedule = this.availability[dayOfWeek];
  
  if (!schedule || !schedule.isAvailable) {
    return [];
  }
  
  const slots = [];
  const [startHour, startMinute] = schedule.startTime.split(':').map(Number);
  const [endHour, endMinute] = schedule.endTime.split(':').map(Number);
  
  let currentTime = startHour * 60 + startMinute;
  const endTime = endHour * 60 + endMinute;
  
  while (currentTime + slotDuration <= endTime) {
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

serviceSchema.methods.canBeBooked = async function(date, time) {
  // Verificar disponibilidad básica
  if (!this.isAvailableAt(date, time)) {
    return { available: false, reason: 'Fuera del horario de trabajo' };
  }
  
  // Verificar anticipación mínima
  const now = new Date();
  const appointmentDate = new Date(date);
  const [hour, minute] = time.split(':').map(Number);
  appointmentDate.setHours(hour, minute, 0, 0);
  
  const timeDiff = appointmentDate.getTime() - now.getTime();
  const hoursDiff = timeDiff / (1000 * 60 * 60);
  
  if (hoursDiff < this.bookingAdvance) {
    return { available: false, reason: `Se requiere reservar con ${this.bookingAdvance} horas de anticipación` };
  }
  
  // Verificar límite de reservas por día
  const Appointment = mongoose.model('Appointment');
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);
  
  const dayBookings = await Appointment.countDocuments({
    service: this._id,
    date: { $gte: dayStart, $lte: dayEnd },
    status: { $in: ['confirmed', 'pending'] }
  });
  
  if (dayBookings >= this.maxBookingsPerDay) {
    return { available: false, reason: 'No hay disponibilidad para este día' };
  }
  
  return { available: true };
};

serviceSchema.methods.addImage = function(imageData) {
  this.images.push(imageData);
  
  // Si es la primera imagen, marcarla como principal
  if (this.images.length === 1) {
    this.images[0].isPrimary = true;
  }
  
  return this.save();
};

serviceSchema.methods.setPrimaryImage = function(imageIndex) {
  if (imageIndex >= 0 && imageIndex < this.images.length) {
    this.images.forEach((img, index) => {
      img.isPrimary = index === imageIndex;
    });
    return this.save();
  }
  throw new Error('Índice de imagen inválido');
};

serviceSchema.methods.removeImage = function(imageIndex) {
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
serviceSchema.statics.findByProfessional = function(professionalId, filters = {}) {
  const query = { professional: professionalId, isDeleted: false };
  
  if (filters.isActive !== undefined) query.isActive = filters.isActive;
  if (filters.category) query.category = filters.category;
  if (filters.businessType) query.businessType = filters.businessType;
  if (filters.priceMin) query.basePrice = { ...query.basePrice, $gte: filters.priceMin };
  if (filters.priceMax) query.basePrice = { ...query.basePrice, $lte: filters.priceMax };
  
  return this.find(query)
    .populate('clinic', 'name address')
    .sort({ name: 1 });
};

serviceSchema.statics.findByClinic = function(clinicId, filters = {}) {
  const query = { clinic: clinicId, isDeleted: false };
  
  if (filters.isActive !== undefined) query.isActive = filters.isActive;
  if (filters.category) query.category = filters.category;
  if (filters.businessType) query.businessType = filters.businessType;
  
  return this.find(query)
    .populate('professional', 'fullName email phone specialties')
    .sort({ name: 1 });
};

serviceSchema.statics.search = function(searchTerm, filters = {}) {
  const query = { isDeleted: false, isActive: true };
  
  if (searchTerm) {
    query.$text = { $search: searchTerm };
  }
  
  if (filters.category) query.category = filters.category;
  if (filters.businessType) query.businessType = filters.businessType;
  if (filters.priceMin) query.basePrice = { ...query.basePrice, $gte: filters.priceMin };
  if (filters.priceMax) query.basePrice = { ...query.basePrice, $lte: filters.priceMax };
  if (filters.location) {
    query['clinic.location'] = {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [filters.location.lng, filters.location.lat]
        },
        $maxDistance: filters.location.radius || 10000 // 10km por defecto
      }
    };
  }
  
  let sort = {};
  if (filters.sortBy === 'price') {
    sort.basePrice = filters.sortOrder === 'desc' ? -1 : 1;
  } else if (filters.sortBy === 'rating') {
    sort['rating.average'] = filters.sortOrder === 'desc' ? -1 : 1;
  } else if (filters.sortBy === 'distance' && filters.location) {
    // Mantener orden por distancia si se especifica ubicación
  } else {
    sort = { 'rating.average': -1, 'rating.count': -1 };
  }
  
  return this.find(query)
    .populate('professional', 'fullName email phone specialties')
    .populate('clinic', 'name address location')
    .sort(sort)
    .limit(filters.limit || 50);
};

serviceSchema.statics.getPopularServices = function(limit = 10, filters = {}) {
  const query = { isDeleted: false, isActive: true };
  
  if (filters.category) query.category = filters.category;
  if (filters.businessType) query.businessType = filters.businessType;
  
  return this.find(query)
    .populate('professional', 'fullName email phone')
    .populate('clinic', 'name address')
    .sort({ 'stats.totalBookings': -1, 'rating.average': -1 })
    .limit(limit);
};

serviceSchema.statics.getServiceStats = async function(filters = {}) {
  const matchStage = { isDeleted: false };
  
  if (filters.professional) matchStage.professional = filters.professional;
  if (filters.clinic) matchStage.clinic = filters.clinic;
  if (filters.category) matchStage.category = filters.category;
  if (filters.businessType) matchStage.businessType = filters.businessType;
  if (filters.isActive !== undefined) matchStage.isActive = filters.isActive;
  
  const stats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalServices: { $sum: 1 },
        activeServices: { $sum: { $cond: ['$isActive', 1, 0] } },
        totalRevenue: { $sum: '$stats.totalRevenue' },
        totalBookings: { $sum: '$stats.totalBookings' },
        averageRating: { $avg: '$rating.average' },
        averagePrice: { $avg: '$basePrice' }
      }
    }
  ]);
  
  return stats[0] || {
    totalServices: 0,
    activeServices: 0,
    totalRevenue: 0,
    totalBookings: 0,
    averageRating: 0,
    averagePrice: 0
  };
};

// Métodos de validación
serviceSchema.methods.validateService = function() {
  const errors = [];
  
  // Validar nombre
  if (!this.name || this.name.trim().length === 0) {
    errors.push('El nombre del servicio es requerido');
  }
  
  // Validar descripción
  if (!this.description || this.description.trim().length === 0) {
    errors.push('La descripción del servicio es requerida');
  }
  
  // Validar precio
  if (this.basePrice < 0) {
    errors.push('El precio base no puede ser negativo');
  }
  
  // Validar duración
  if (this.duration < 15 || this.duration > 480) {
    errors.push('La duración debe estar entre 15 minutos y 8 horas');
  }
  
  // Validar horarios
  for (const [day, schedule] of Object.entries(this.availability)) {
    if (schedule.isAvailable) {
      if (schedule.startTime >= schedule.endTime) {
        errors.push(`Horario inválido para ${day}: la hora de inicio debe ser anterior a la de fin`);
      }
    }
  }
  
  return errors;
};

// Métodos de negocio
serviceSchema.methods.updateStats = function(bookingData) {
  this.stats.totalBookings++;
  
  if (bookingData.status === 'completed') {
    this.stats.completedBookings++;
  } else if (bookingData.status === 'cancelled') {
    this.stats.cancelledBookings++;
  }
  
  if (bookingData.amount) {
    this.stats.totalRevenue += bookingData.amount;
  }
  
  return this.save();
};

// Métodos de limpieza
serviceSchema.methods.softDelete = function(userId) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = userId;
  
  return this.save();
};

serviceSchema.methods.restore = function() {
  this.isDeleted = false;
  this.deletedAt = undefined;
  this.deletedBy = undefined;
  
  return this.save();
};

// Métodos de exportación
serviceSchema.methods.toPublicJSON = function() {
  const service = this.toObject();
  
  // Remover información sensible
  delete service.requirements;
  delete service.preparation;
  delete service.contraindications;
  delete service.documents;
  delete service.isDeleted;
  delete service.deletedAt;
  delete service.deletedBy;
  
  return service;
};

// Métodos de auditoría
serviceSchema.methods.logAccess = function(userId, action, details = {}) {
  logger.logSystemEvent('service_access', {
    ...details,
    serviceId: this._id,
    serviceName: this.name,
    professional: this.professional,
    clinic: this.clinic,
    userId
  });
};

// Configuración del esquema
serviceSchema.set('autoIndex', false);

module.exports = mongoose.model('Service', serviceSchema);
