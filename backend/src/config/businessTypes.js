/**
 * Configuración de tipos de negocios soportados por el sistema
 * Este archivo centraliza la configuración para diferentes rubros
 */

const BUSINESS_TYPES = {
  medical: {
    name: 'Médico',
    name_en: 'Medical',
    description: 'Servicios médicos, consultas, tratamientos y atención sanitaria',
    icon: '🏥',
    color: '#2196F3',
    categories: [
      'Medicina General',
      'Cardiología',
      'Pediatría',
      'Dermatología',
      'Ginecología',
      'Ortopedia',
      'Neurología',
      'Psiquiatría',
      'Psicología',
      'Odontología',
      'Kinesiología',
      'Fisioterapia',
      'Nutrición',
      'Enfermería',
      'Terapias Alternativas',
      'Laboratorio',
      'Imagenología',
      'Emergencias'
    ],
    defaultDuration: 30,
    requiresLicense: true,
    requiresSpecialization: true,
    supportsInsurance: true,
    supportsEmergency: true,
    requiresMedicalHistory: true,
    supportsOnlineConsultation: true,
    paymentMethods: ['cash', 'credit_card', 'debit_card', 'transfer', 'insurance'],
    currencies: ['ARS', 'USD', 'EUR'],
    languages: ['es', 'en', 'pt'],
    timezones: ['America/Argentina/Buenos_Aires', 'America/New_York', 'Europe/Madrid']
  },

  beauty: {
    name: 'Belleza',
    name_en: 'Beauty',
    description: 'Servicios de belleza, estética y cuidado personal',
    icon: '💄',
    color: '#E91E63',
    categories: [
      'Peluquería',
      'Estética',
      'Manicuría',
      'Pedicuría',
      'Maquillaje',
      'Depilación',
      'Tratamientos Faciales',
      'Tratamientos Corporales',
      'Masajes',
      'Spa',
      'Belleza Masculina',
      'Tatuajes',
      'Piercings',
      'Extensiones',
      'Coloración'
    ],
    defaultDuration: 60,
    requiresLicense: false,
    requiresSpecialization: false,
    supportsInsurance: false,
    supportsEmergency: false,
    requiresMedicalHistory: false,
    supportsOnlineConsultation: false,
    paymentMethods: ['cash', 'credit_card', 'debit_card', 'transfer', 'digital_wallet'],
    currencies: ['ARS', 'USD', 'EUR', 'BRL'],
    languages: ['es', 'en', 'pt'],
    timezones: ['America/Argentina/Buenos_Aires', 'America/Sao_Paulo', 'Europe/Madrid']
  },

  fitness: {
    name: 'Fitness',
    name_en: 'Fitness',
    description: 'Servicios de entrenamiento físico, gimnasios y actividades deportivas',
    icon: '💪',
    color: '#4CAF50',
    categories: [
      'Entrenamiento Personal',
      'Yoga',
      'Pilates',
      'CrossFit',
      'Spinning',
      'Zumba',
      'Boxeo',
      'Natación',
      'Running',
      'Ciclismo',
      'Fútbol',
      'Tenis',
      'Golf',
      'Danza',
      'Artes Marciales',
      'Rehabilitación Deportiva'
    ],
    defaultDuration: 60,
    requiresLicense: false,
    requiresSpecialization: true,
    supportsInsurance: false,
    supportsEmergency: false,
    requiresMedicalHistory: true,
    supportsOnlineConsultation: true,
    paymentMethods: ['cash', 'credit_card', 'debit_card', 'transfer', 'digital_wallet'],
    currencies: ['ARS', 'USD', 'EUR', 'BRL'],
    languages: ['es', 'en', 'pt'],
    timezones: ['America/Argentina/Buenos_Aires', 'America/Sao_Paulo', 'Europe/Madrid']
  },

  education: {
    name: 'Educación',
    name_en: 'Education',
    description: 'Servicios educativos, tutorías y capacitación',
    icon: '📚',
    color: '#FF9800',
    categories: [
      'Tutoría Académica',
      'Idiomas',
      'Música',
      'Arte',
      'Cocina',
      'Tecnología',
      'Matemáticas',
      'Ciencias',
      'Historia',
      'Literatura',
      'Filosofía',
      'Psicología',
      'Negocios',
      'Marketing',
      'Programación',
      'Diseño',
      'Fotografía',
      'Videografía'
    ],
    defaultDuration: 60,
    requiresLicense: false,
    requiresSpecialization: true,
    supportsInsurance: false,
    supportsEmergency: false,
    requiresMedicalHistory: false,
    supportsOnlineConsultation: true,
    paymentMethods: ['cash', 'credit_card', 'debit_card', 'transfer', 'digital_wallet'],
    currencies: ['ARS', 'USD', 'EUR', 'BRL'],
    languages: ['es', 'en', 'pt', 'fr', 'de'],
    timezones: ['America/Argentina/Buenos_Aires', 'America/New_York', 'Europe/London', 'Asia/Tokyo']
  },

  consulting: {
    name: 'Consultoría',
    name_en: 'Consulting',
    description: 'Servicios de asesoramiento y consultoría profesional',
    icon: '💼',
    color: '#9C27B0',
    categories: [
      'Consultoría Empresarial',
      'Consultoría Financiera',
      'Consultoría Legal',
      'Consultoría Tecnológica',
      'Consultoría de Marketing',
      'Consultoría de Recursos Humanos',
      'Consultoría Ambiental',
      'Consultoría de Proyectos',
      'Consultoría de Calidad',
      'Consultoría de Seguridad',
      'Consultoría de Logística',
      'Consultoría de Ventas',
      'Consultoría de Estrategia',
      'Consultoría de Innovación',
      'Consultoría de Sostenibilidad'
    ],
    defaultDuration: 90,
    requiresLicense: false,
    requiresSpecialization: true,
    supportsInsurance: false,
    supportsEmergency: false,
    requiresMedicalHistory: false,
    supportsOnlineConsultation: true,
    paymentMethods: ['cash', 'credit_card', 'debit_card', 'transfer', 'digital_wallet'],
    currencies: ['ARS', 'USD', 'EUR', 'BRL'],
    languages: ['es', 'en', 'pt', 'fr', 'de'],
    timezones: ['America/Argentina/Buenos_Aires', 'America/New_York', 'Europe/London', 'Asia/Tokyo']
  },

  repair: {
    name: 'Reparación',
    name_en: 'Repair',
    description: 'Servicios de reparación y mantenimiento técnico',
    icon: '🔧',
    color: '#795548',
    categories: [
      'Reparación de Electrodomésticos',
      'Reparación de Computadoras',
      'Reparación de Celulares',
      'Reparación de Automóviles',
      'Reparación de Bicicletas',
      'Reparación de Calzado',
      'Reparación de Ropa',
      'Reparación de Joyería',
      'Reparación de Muebles',
      'Reparación de Instrumentos Musicales',
      'Reparación de Herramientas',
      'Reparación de Equipos Industriales',
      'Reparación de Sistemas de Aire Acondicionado',
      'Reparación de Sistemas Eléctricos',
      'Reparación de Sistemas de Plomería'
    ],
    defaultDuration: 120,
    requiresLicense: false,
    requiresSpecialization: true,
    supportsInsurance: false,
    supportsEmergency: true,
    requiresMedicalHistory: false,
    supportsOnlineConsultation: false,
    paymentMethods: ['cash', 'credit_card', 'debit_card', 'transfer'],
    currencies: ['ARS', 'USD', 'EUR', 'BRL'],
    languages: ['es', 'en', 'pt'],
    timezones: ['America/Argentina/Buenos_Aires', 'America/Sao_Paulo', 'Europe/Madrid']
  },

  cleaning: {
    name: 'Limpieza',
    name_en: 'Cleaning',
    description: 'Servicios de limpieza y mantenimiento de espacios',
    icon: '🧹',
    color: '#607D8B',
    categories: [
      'Limpieza Residencial',
      'Limpieza Comercial',
      'Limpieza Industrial',
      'Limpieza de Oficinas',
      'Limpieza de Hoteles',
      'Limpieza de Escuelas',
      'Limpieza de Hospitales',
      'Limpieza de Vehículos',
      'Limpieza de Alfombras',
      'Limpieza de Ventanas',
      'Limpieza de Piscinas',
      'Limpieza Post-Obra',
      'Limpieza de Eventos',
      'Limpieza Ecológica',
      'Limpieza de Tanques',
      'Limpieza de Conductos'
    ],
    defaultDuration: 120,
    requiresLicense: false,
    requiresSpecialization: false,
    supportsInsurance: false,
    supportsEmergency: false,
    requiresMedicalHistory: false,
    supportsOnlineConsultation: false,
    paymentMethods: ['cash', 'credit_card', 'debit_card', 'transfer'],
    currencies: ['ARS', 'USD', 'EUR', 'BRL'],
    languages: ['es', 'en', 'pt'],
    timezones: ['America/Argentina/Buenos_Aires', 'America/Sao_Paulo', 'Europe/Madrid']
  },

  transport: {
    name: 'Transporte',
    name_en: 'Transport',
    description: 'Servicios de transporte y movilidad',
    icon: '🚗',
    color: '#FF5722',
    categories: [
      'Taxi',
      'Remis',
      'Transporte Ejecutivo',
      'Transporte Escolar',
      'Transporte de Carga',
      'Mudanzas',
      'Delivery',
      'Mensajería',
      'Transporte Turístico',
      'Transporte Médico',
      'Transporte de Discapacitados',
      'Transporte de Mascotas',
      'Transporte de Motos',
      'Transporte de Bicicletas',
      'Transporte Marítimo',
      'Transporte Aéreo'
    ],
    defaultDuration: 60,
    requiresLicense: true,
    requiresSpecialization: false,
    supportsInsurance: true,
    supportsEmergency: true,
    requiresMedicalHistory: false,
    supportsOnlineConsultation: false,
    paymentMethods: ['cash', 'credit_card', 'debit_card', 'transfer', 'digital_wallet'],
    currencies: ['ARS', 'USD', 'EUR', 'BRL'],
    languages: ['es', 'en', 'pt'],
    timezones: ['America/Argentina/Buenos_Aires', 'America/Sao_Paulo', 'Europe/Madrid']
  },

  food: {
    name: 'Comida',
    name_en: 'Food',
    description: 'Servicios de alimentación y gastronomía',
    icon: '🍕',
    color: '#FFC107',
    categories: [
      'Restaurante',
      'Pizzería',
      'Hamburguesería',
      'Sushi',
      'Comida China',
      'Comida Mexicana',
      'Comida Italiana',
      'Comida Árabe',
      'Comida Vegana',
      'Comida Vegetariana',
      'Pastelería',
      'Panadería',
      'Heladería',
      'Cafetería',
      'Bar',
      'Catering',
      'Food Truck',
      'Delivery de Comida'
    ],
    defaultDuration: 45,
    requiresLicense: true,
    requiresSpecialization: false,
    supportsInsurance: false,
    supportsEmergency: false,
    requiresMedicalHistory: false,
    supportsOnlineConsultation: false,
    paymentMethods: ['cash', 'credit_card', 'debit_card', 'transfer', 'digital_wallet'],
    currencies: ['ARS', 'USD', 'EUR', 'BRL'],
    languages: ['es', 'en', 'pt'],
    timezones: ['America/Argentina/Buenos_Aires', 'America/Sao_Paulo', 'Europe/Madrid']
  },

  retail: {
    name: 'Retail',
    name_en: 'Retail',
    description: 'Comercio minorista y servicios de venta',
    icon: '🛍️',
    color: '#00BCD4',
    categories: [
      'Ropa',
      'Calzado',
      'Accesorios',
      'Electrónica',
      'Hogar',
      'Jardín',
      'Deportes',
      'Juguetes',
      'Libros',
      'Música',
      'Películas',
      'Joyería',
      'Relojes',
      'Óptica',
      'Farmacia',
      'Supermercado',
      'Ferretería',
      'Papelería'
    ],
    defaultDuration: 30,
    requiresLicense: false,
    requiresSpecialization: false,
    supportsInsurance: false,
    supportsEmergency: false,
    requiresMedicalHistory: false,
    supportsOnlineConsultation: false,
    paymentMethods: ['cash', 'credit_card', 'debit_card', 'transfer', 'digital_wallet'],
    currencies: ['ARS', 'USD', 'EUR', 'BRL'],
    languages: ['es', 'en', 'pt'],
    timezones: ['America/Argentina/Buenos_Aires', 'America/Sao_Paulo', 'Europe/Madrid']
  },

  other: {
    name: 'Otros',
    name_en: 'Other',
    description: 'Otros tipos de servicios y negocios',
    icon: '🔧',
    color: '#9E9E9E',
    categories: [
      'Servicios Generales',
      'Servicios Profesionales',
      'Servicios Técnicos',
      'Servicios Creativos',
      'Servicios de Eventos',
      'Servicios de Seguridad',
      'Servicios de Jardinería',
      'Servicios de Mascotas',
      'Servicios de Fotografía',
      'Servicios de Video',
      'Servicios de Traducción',
      'Servicios de Interpretación',
      'Servicios de Escritura',
      'Servicios de Diseño',
      'Servicios de Programación',
      'Servicios de Marketing',
      'Servicios de Publicidad',
      'Servicios de Relaciones Públicas'
    ],
    defaultDuration: 60,
    requiresLicense: false,
    requiresSpecialization: false,
    supportsInsurance: false,
    supportsEmergency: false,
    requiresMedicalHistory: false,
    supportsOnlineConsultation: false,
    paymentMethods: ['cash', 'credit_card', 'debit_card', 'transfer'],
    currencies: ['ARS', 'USD', 'EUR', 'BRL'],
    languages: ['es', 'en', 'pt'],
    timezones: ['America/Argentina/Buenos_Aires', 'America/Sao_Paulo', 'Europe/Madrid']
  }
};

/**
 * Obtener todos los tipos de negocios
 */
const getAllBusinessTypes = () => {
  return Object.keys(BUSINESS_TYPES);
};

/**
 * Obtener información de un tipo de negocio específico
 */
const getBusinessTypeInfo = (type) => {
  return BUSINESS_TYPES[type] || null;
};

/**
 * Obtener categorías de un tipo de negocio
 */
const getBusinessTypeCategories = (type) => {
  const businessType = BUSINESS_TYPES[type];
  return businessType ? businessType.categories : [];
};

/**
 * Verificar si un tipo de negocio requiere licencia
 */
const requiresLicense = (type) => {
  const businessType = BUSINESS_TYPES[type];
  return businessType ? businessType.requiresLicense : false;
};

/**
 * Verificar si un tipo de negocio soporta consultas online
 */
const supportsOnlineConsultation = (type) => {
  const businessType = BUSINESS_TYPES[type];
  return businessType ? businessType.supportsOnlineConsultation : false;
};

/**
 * Obtener métodos de pago soportados por un tipo de negocio
 */
const getSupportedPaymentMethods = (type) => {
  const businessType = BUSINESS_TYPES[type];
  return businessType ? businessType.paymentMethods : ['cash'];
};

/**
 * Obtener monedas soportadas por un tipo de negocio
 */
const getSupportedCurrencies = (type) => {
  const businessType = BUSINESS_TYPES[type];
  return businessType ? businessType.currencies : ['ARS'];
};

/**
 * Obtener idiomas soportados por un tipo de negocio
 */
const getSupportedLanguages = (type) => {
  const businessType = BUSINESS_TYPES[type];
  return businessType ? businessType.languages : ['es'];
};

/**
 * Obtener zonas horarias soportadas por un tipo de negocio
 */
const getSupportedTimezones = (type) => {
  const businessType = BUSINESS_TYPES[type];
  return businessType ? businessType.timezones : ['America/Argentina/Buenos_Aires'];
};

/**
 * Obtener duración por defecto para un tipo de negocio
 */
const getDefaultDuration = (type) => {
  const businessType = BUSINESS_TYPES[type];
  return businessType ? businessType.defaultDuration : 60;
};

/**
 * Obtener configuración completa para un tipo de negocio
 */
const getBusinessTypeConfig = (type) => {
  const businessType = BUSINESS_TYPES[type];
  if (!businessType) return null;

  return {
    ...businessType,
    supportedPaymentMethods: businessType.paymentMethods,
    supportedCurrencies: businessType.currencies,
    supportedLanguages: businessType.languages,
    supportedTimezones: businessType.timezones,
    defaultDuration: businessType.defaultDuration
  };
};

/**
 * Validar si un tipo de negocio es válido
 */
const isValidBusinessType = (type) => {
  return Object.keys(BUSINESS_TYPES).includes(type);
};

/**
 * Obtener tipos de negocios que soportan consultas online
 */
const getOnlineConsultationSupportedTypes = () => {
  return Object.keys(BUSINESS_TYPES).filter(type => 
    BUSINESS_TYPES[type].supportsOnlineConsultation
  );
};

/**
 * Obtener tipos de negocios que requieren licencia
 */
const getLicenseRequiredTypes = () => {
  return Object.keys(BUSINESS_TYPES).filter(type => 
    BUSINESS_TYPES[type].requiresLicense
  );
};

module.exports = {
  BUSINESS_TYPES,
  getAllBusinessTypes,
  getBusinessTypeInfo,
  getBusinessTypeCategories,
  requiresLicense,
  supportsOnlineConsultation,
  getSupportedPaymentMethods,
  getSupportedCurrencies,
  getSupportedLanguages,
  getSupportedTimezones,
  getDefaultDuration,
  getBusinessTypeConfig,
  isValidBusinessType,
  getOnlineConsultationSupportedTypes,
  getLicenseRequiredTypes
};
