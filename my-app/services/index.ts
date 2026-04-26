// Servicios de autenticación y usuarios
export { default as authService } from './authService';
export { default as hybridAuthService } from './hybridAuthService';
export { default as mockAuthService } from './mockAuthService';
export { userService } from './userService';
export type {
  User,
  LoginCredentials,
  RegisterData,
  AuthResponse,
  RefreshTokenResponse,
} from './authService';
export type {
  UserProfile,
  UpdateProfileData,
  ChangePasswordData,
  UserStats,
} from './userService';

// Servicios de citas
export { default as appointmentService } from './appointmentService';
export { default as hybridAppointmentService } from './hybridAppointmentService';
export { default as mockAppointmentService } from './mockAppointmentService';
export type {
  Appointment,
  CreateAppointmentData,
  UpdateAppointmentData,
  AppointmentFilters,
  AvailableSlot,
  AppointmentStats,
} from './appointmentService';

// Servicios de notificaciones
export { default as notificationService } from './notificationService';
export type {
  Notification,
  CreateNotificationData,
  NotificationFilters,
  NotificationStats,
} from './notificationService';

// Servicios de clínicas
export { default as clinicService } from './clinicService';
export {
  fetchProfessionalClinicsFromBackend,
  saveProfessionalClinicsToBackend,
} from './professionalClinicsService';
export type { ProfessionalClinicPayload } from './professionalClinicsService';
export type {
  Clinic,
  CreateClinicRequest,
  UpdateClinicRequest,
  ClinicFilters,
  ClinicStats,
  NearbyClinicRequest,
} from './clinicService';

// Servicios médicos
export { default as serviceService } from './serviceService';
export type {
  Service,
  CreateServiceRequest,
  UpdateServiceRequest,
  ServiceFilters,
  ServiceStats,
  ServiceCategory,
} from './serviceService';

// Chat Expo (API /api/v1/expo-chat)
export {
  fetchExpoChatConversations,
  fetchExpoChatMessages,
  sendExpoChatMessage,
  markExpoChatConversationRead,
  makeExpoChatConversationKey,
} from './expoChatService';
export type {
  ExpoChatConversationRow,
  ExpoChatMessageDoc,
} from './expoChatService';

// Servicios de chat (legacy)
export { chatService } from './chatService';
export type {
  SendMessageRequest,
  CreateConversationRequest,
  UpdateConversationRequest,
  SearchMessagesRequest,
  ChatNotification,
} from './chatService';

// API base y utilidades
export { default as api, ApiError, showApiError } from './api';
