// Tipos de usuario
export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  userType: 'client' | 'professional';
  avatar?: string;
  specialty?: string;
  bio?: string;
  rating?: number;
  reviews?: number;
  price?: number;
  createdAt: Date;
  updatedAt: Date;
}

// Tipos para perfil de usuario
export interface UserProfile extends User {
  // Información personal
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  
  // Información de contacto
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  
  // Preferencias
  language?: 'es' | 'en' | 'pt';
  timezone?: string;
  notifications?: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  
  // Configuración de privacidad
  privacySettings?: {
    showProfile: boolean;
    showContactInfo: boolean;
    allowMessages: boolean;
    showAvailability: boolean;
  };
}

// Tipos para perfil profesional
export interface ProfessionalProfile extends UserProfile {
  // Información profesional
  specialty: string;
  bio: string;
  experience: number; // años de experiencia
  education: string[];
  certifications: string[];
  licenses: string[];
  
  // Servicios y precios
  services: ProfessionalService[];
  pricing: PricingStructure;
  
  // Horarios y disponibilidad
  schedule: ProfessionalSchedule;
  availability: AvailabilitySettings;
  
  // Estadísticas y reputación
  stats: ProfessionalStats;
  clientReviews: Review[]; // Cambiado de 'reviews' a 'clientReviews' para evitar conflicto
  
  // Configuración de negocio
  businessSettings: {
    autoConfirm: boolean;
    cancellationPolicy: string;
    reschedulingPolicy: string;
    depositRequired: boolean;
    depositAmount?: number;
  };
}

// Tipos para perfil de cliente
export interface ClientProfile extends UserProfile {
  // Preferencias de cliente
  preferences: {
    preferredCategories: string[];
    preferredProfessionals: string[];
    preferredTimes: string[];
    preferredLocations: string[];
    budgetRange?: {
      min: number;
      max: number;
    };
  };
  
  // Historial y actividad
  stats: ClientStats;
  favorites: string[]; // IDs de profesionales favoritos
  
  // Configuración de cliente
  clientSettings: {
    autoReminders: boolean;
    reminderTime: number; // horas antes de la cita
    allowMarketing: boolean;
    shareData: boolean;
  };
}

// Tipos para servicios profesionales
export interface ProfessionalService {
  id: string;
  name: string;
  description: string;
  duration: number; // en minutos
  price: number;
  category: string;
  isActive: boolean;
}

// Tipos para estructura de precios
export interface PricingStructure {
  basePrice: number;
  currency: string;
  pricingModel: 'fixed' | 'hourly' | 'session' | 'package';
  discounts?: {
    type: 'percentage' | 'fixed';
    value: number;
    conditions: string;
  }[];
  packages?: {
    name: string;
    services: string[];
    price: number;
    savings: number;
  }[];
}

// Tipos para configuración de disponibilidad
export interface AvailabilitySettings {
  bookingAdvance: number; // días de anticipación
  maxBookingsPerDay: number;
  minNoticeHours: number;
  maxNoticeDays: number;
  allowSameDay: boolean;
  allowWeekends: boolean;
  allowHolidays: boolean;
  blackoutDates: string[]; // fechas no disponibles
}

// Tipos para reseñas
export interface Review {
  id: string;
  clientId: string;
  professionalId: string;
  appointmentId: string;
  rating: number; // 1-5 estrellas
  comment: string;
  createdAt: Date;
  isVerified: boolean; // si la cita se completó
  response?: string; // respuesta del profesional
}

// Tipos de cita
export interface Appointment {
  id: string;
  clientId: string;
  professionalId: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number; // en minutos
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  notes?: string;
  price: number;
  paymentStatus: 'pending' | 'paid' | 'refunded';
  createdAt: Date;
  updatedAt: Date;
}

// Tipos de horario
export interface TimeRange {
  start: string; // formato HH:MM
  end: string;   // formato HH:MM
}

export interface DaySchedule {
  enabled: boolean;
  timeRanges: TimeRange[];
  interval: number; // en minutos
}

export interface ProfessionalSchedule {
  [dayId: string]: DaySchedule; // 0 = Domingo, 1 = Lunes, etc.
}

// Tipos de notificación
export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'appointment' | 'payment' | 'reminder' | 'system';
  read: boolean;
  data?: any;
  createdAt: Date;
}

// Tipos de pago
export interface Payment {
  id: string;
  appointmentId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed' | 'refunded';
  paymentMethod: 'card' | 'transfer' | 'cash';
  stripePaymentIntentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Tipos de categoría
export interface Category {
  id: string;
  name: string;
  icon: string;
  description?: string;
  color?: string;
}

// Tipos de búsqueda y filtros
export interface SearchFilters {
  category?: string;
  date?: string;
  time?: string;
  priceRange?: {
    min: number;
    max: number;
  };
  rating?: number;
  location?: string;
}

// Tipos de estado de la aplicación
export interface AppState {
  isLoading: boolean;
  error: string | null;
  networkStatus: 'online' | 'offline';
}

// Tipos de respuesta de API
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Tipos de validación
export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// Tipos de configuración
export interface AppConfig {
  maxAppointmentsPerDay: number;
  minAdvanceBookingHours: number;
  maxAdvanceBookingDays: number;
  cancellationPolicyHours: number;
  reminderNotificationHours: number;
}

// Tipos de estadísticas
export interface ProfessionalStats {
  totalAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  totalEarnings: number;
  averageRating: number;
  totalReviews: number;
  busyHours: string[];
  popularDays: string[];
}

export interface ClientStats {
  totalAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  totalSpent: number;
  favoriteProfessionals: string[];
  upcomingAppointments: number;
}

// Tipos de calendario
export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  color: string;
  data: any;
}

// Tipos de chat/mensajería
export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  type: 'text' | 'image' | 'file';
  read: boolean;
  createdAt: Date;
}

export interface Chat {
  id: string;
  participants: string[];
  lastMessage?: Message;
  unreadCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// Tipos para configuración avanzada de horarios
export interface BreakTime {
  start: string; // formato HH:MM
  end: string;   // formato HH:MM
}

export interface DayScheduleAdvanced extends DaySchedule {
  breaks?: BreakTime[];
  notes?: string;
  isSpecial?: boolean;
  specialDate?: string;
}

export interface ScheduleTemplate {
  key: string;
  name: string;
  description: string;
  schedule: ProfessionalSchedule;
  category: 'business' | 'flexible' | 'weekend' | 'custom';
  estimatedHours: number;
  estimatedCapacity: number;
}

export interface SpecialSchedule {
  date: string; // formato YYYY-MM-DD
  schedule: DayScheduleAdvanced;
  reason?: string;
  isRecurring?: boolean;
  recurringPattern?: 'weekly' | 'monthly' | 'yearly';
}

export interface ScheduleOptimization {
  preferredInterval: number;
  maxHoursPerDay: number;
  minBreakDuration: number;
  preferredStartTime: string;
  preferredEndTime: string;
  avoidDays?: number[]; // IDs de días a evitar
}

export interface ScheduleAnalytics {
  efficiency: number; // porcentaje de eficiencia
  utilization: number; // porcentaje de utilización
  peakHours: string[];
  lowTrafficHours: string[];
  recommendedChanges: string[];
  revenueProjection: {
    weekly: number;
    monthly: number;
    yearly: number;
  };
}

export interface ScheduleConflict {
  type: 'overlap' | 'invalid_time' | 'missing_breaks' | 'inefficient';
  dayId: number;
  description: string;
  severity: 'low' | 'medium' | 'high';
  suggestedFix: string;
}

export interface ScheduleValidation {
  isValid: boolean;
  conflicts: ScheduleConflict[];
  warnings: string[];
  recommendations: string[];
}
