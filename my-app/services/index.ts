// Servicios de autenticación y usuarios
export { default as authService } from './authService';
export { userService } from './userService';
export type { 
  LoginRequest, 
  RegisterRequest, 
  ProfileUpdateRequest 
} from './authService';
export type { 
  User,
  LoginCredentials,
  RegisterData,
  AuthResponse
} from './userService';

// Servicios de citas
export { default as appointmentService } from './appointmentService';
export type { 
  Appointment, 
  CreateAppointmentRequest, 
  UpdateAppointmentRequest, 
  AppointmentFilters, 
  AvailableSlot, 
  AppointmentStats 
} from './appointmentService';

// Servicios de notificaciones
export { default as notificationService } from './notificationService';
export type { 
  Notification, 
  CreateNotificationRequest, 
  UpdateNotificationRequest, 
  NotificationFilters, 
  NotificationStats, 
  BulkNotificationRequest 
} from './notificationService';

// Servicios de clínicas
export { default as clinicService } from './clinicService';
export type { 
  Clinic, 
  CreateClinicRequest, 
  UpdateClinicRequest, 
  ClinicFilters, 
  ClinicStats, 
  NearbyClinicRequest 
} from './clinicService';

// Servicios médicos
export { default as serviceService } from './serviceService';
export type { 
  Service, 
  CreateServiceRequest, 
  UpdateServiceRequest, 
  ServiceFilters, 
  ServiceStats, 
  ServiceCategory 
} from './serviceService';

// API base y utilidades
export { default as api, ApiError, showApiError } from './api';
