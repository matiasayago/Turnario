import { BACKEND_CONFIG } from '../config/backend';
import { api, showApiError } from './api';
import { simpleAuthService } from './simpleAuthService';

// Tipos para notificaciones
export interface Notification {
  _id: string;
  recipientId: string;
  type: 'appointment_reminder' | 'appointment_confirmed' | 'appointment_cancelled' | 
        'payment_success' | 'payment_failed' | 'review_request' | 'system_update' | 
        'promotion' | 'general';
  title: string;
  message: string;
  data?: any;
  isRead: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  scheduledFor?: string;
  sentAt?: string;
  readAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationFilters {
  type?: string;
  isRead?: boolean;
  priority?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface NotificationStats {
  total: number;
  unread: number;
  byType: Record<string, number>;
  byPriority: Record<string, number>;
}

export interface CreateNotificationData {
  recipientId: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  scheduledFor?: string;
}

class NotificationService {
  // Obtener notificaciones del usuario
  async getNotifications(filters: NotificationFilters = {}): Promise<{
    notifications: Notification[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const headers = simpleAuthService.getAuthHeaders();
      if (!headers) {
        throw new Error('No hay token de autenticación');
      }

      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });

      const response = await api.get<{
        notifications: Notification[];
        total: number;
        page: number;
        totalPages: number;
      }>(
        `${BACKEND_CONFIG.ENDPOINTS.NOTIFICATIONS.BASE}?${queryParams.toString()}`,
        headers
      );

      return response;
    } catch (error) {
      console.error('Error obteniendo notificaciones:', error);
      showApiError(error, 'Error obteniendo notificaciones');
      throw error;
    }
  }

  // Obtener una notificación específica
  async getNotification(notificationId: string): Promise<Notification> {
    try {
      const headers = simpleAuthService.getAuthHeaders();
      if (!headers) {
        throw new Error('No hay token de autenticación');
      }

      const response = await api.get<Notification>(
        `${BACKEND_CONFIG.ENDPOINTS.NOTIFICATIONS.BASE}/${notificationId}`,
        headers
      );

      return response;
    } catch (error) {
      console.error('Error obteniendo notificación:', error);
      showApiError(error, 'Error obteniendo notificación');
      throw error;
    }
  }

  // Marcar notificación como leída
  async markAsRead(notificationId: string): Promise<Notification> {
    try {
      const headers = simpleAuthService.getAuthHeaders();
      if (!headers) {
        throw new Error('No hay token de autenticación');
      }

      const response = await api.patch<Notification>(
        `${BACKEND_CONFIG.ENDPOINTS.NOTIFICATIONS.BASE}/${notificationId}/mark-read`,
        {},
        headers
      );

      return response;
    } catch (error) {
      console.error('Error marcando notificación como leída:', error);
      showApiError(error, 'Error marcando notificación');
      throw error;
    }
  }

  // Marcar notificación como no leída
  async markAsUnread(notificationId: string): Promise<Notification> {
    try {
      const headers = simpleAuthService.getAuthHeaders();
      if (!headers) {
        throw new Error('No hay token de autenticación');
      }

      const response = await api.patch<Notification>(
        `${BACKEND_CONFIG.ENDPOINTS.NOTIFICATIONS.BASE}/${notificationId}/mark-unread`,
        {},
        headers
      );

      return response;
    } catch (error) {
      console.error('Error marcando notificación como no leída:', error);
      showApiError(error, 'Error marcando notificación');
      throw error;
    }
  }

  // Marcar todas las notificaciones como leídas
  async markAllAsRead(): Promise<{ message: string; count: number }> {
    try {
      const headers = simpleAuthService.getAuthHeaders();
      if (!headers) {
        throw new Error('No hay token de autenticación');
      }

      const response = await api.patch<{ message: string; count: number }>(
        BACKEND_CONFIG.ENDPOINTS.NOTIFICATIONS.MARK_ALL_READ,
        {},
        headers
      );

      return response;
    } catch (error) {
      console.error('Error marcando todas las notificaciones como leídas:', error);
      showApiError(error, 'Error marcando notificaciones');
      throw error;
    }
  }

  // Obtener contador de notificaciones no leídas
  async getUnreadCount(): Promise<{ count: number }> {
    try {
      const headers = simpleAuthService.getAuthHeaders();
      if (!headers) {
        throw new Error('No hay token de autenticación');
      }

      const response = await api.get<{ count: number }>(
        BACKEND_CONFIG.ENDPOINTS.NOTIFICATIONS.UNREAD_COUNT,
        headers
      );

      return response;
    } catch (error) {
      console.error('Error obteniendo contador de notificaciones:', error);
      showApiError(error, 'Error obteniendo contador');
      throw error;
    }
  }

  // Obtener tipos de notificaciones disponibles
  async getNotificationTypes(): Promise<{ types: Array<{ value: string; label: string }> }> {
    try {
      const headers = simpleAuthService.getAuthHeaders();
      if (!headers) {
        throw new Error('No hay token de autenticación');
      }

      const response = await api.get<{ types: Array<{ value: string; label: string }> }>(
        BACKEND_CONFIG.ENDPOINTS.NOTIFICATIONS.TYPES,
        headers
      );

      return response;
    } catch (error) {
      console.error('Error obteniendo tipos de notificaciones:', error);
      showApiError(error, 'Error obteniendo tipos');
      throw error;
    }
  }

  // Obtener estadísticas de notificaciones
  async getNotificationStats(): Promise<NotificationStats> {
    try {
      const headers = simpleAuthService.getAuthHeaders();
      if (!headers) {
        throw new Error('No hay token de autenticación');
      }

      const response = await api.get<NotificationStats>(
        BACKEND_CONFIG.ENDPOINTS.NOTIFICATIONS.STATS,
        headers
      );

      return response;
    } catch (error) {
      console.error('Error obteniendo estadísticas de notificaciones:', error);
      showApiError(error, 'Error obteniendo estadísticas');
      throw error;
    }
  }

  // Eliminar notificación
  async deleteNotification(notificationId: string): Promise<{ message: string }> {
    try {
      const headers = simpleAuthService.getAuthHeaders();
      if (!headers) {
        throw new Error('No hay token de autenticación');
      }

      const response = await api.delete<{ message: string }>(
        `${BACKEND_CONFIG.ENDPOINTS.NOTIFICATIONS.BASE}/${notificationId}`,
        headers
      );

      return response;
    } catch (error) {
      console.error('Error eliminando notificación:', error);
      showApiError(error, 'Error eliminando notificación');
      throw error;
    }
  }

  // Limpiar todas las notificaciones
  async clearAllNotifications(): Promise<{ message: string; count: number }> {
    try {
      const headers = simpleAuthService.getAuthHeaders();
      if (!headers) {
        throw new Error('No hay token de autenticación');
      }

      const response = await api.delete<{ message: string; count: number }>(
        BACKEND_CONFIG.ENDPOINTS.NOTIFICATIONS.CLEAR_ALL,
        headers
      );

      return response;
    } catch (error) {
      console.error('Error limpiando notificaciones:', error);
      showApiError(error, 'Error limpiando notificaciones');
      throw error;
    }
  }

  // Obtener notificaciones no leídas
  async getUnreadNotifications(limit: number = 20): Promise<Notification[]> {
    try {
      const response = await this.getNotifications({
        isRead: false,
        limit,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });

      return response.notifications;
    } catch (error) {
      console.error('Error obteniendo notificaciones no leídas:', error);
      showApiError(error, 'Error obteniendo notificaciones');
      throw error;
    }
  }

  // Obtener notificaciones recientes
  async getRecentNotifications(limit: number = 10): Promise<Notification[]> {
    try {
      const response = await this.getNotifications({
        limit,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });

      return response.notifications;
    } catch (error) {
      console.error('Error obteniendo notificaciones recientes:', error);
      showApiError(error, 'Error obteniendo notificaciones');
      throw error;
    }
  }

  // Crear notificación (solo para admins)
  async createNotification(notificationData: CreateNotificationData): Promise<Notification> {
    try {
      const headers = simpleAuthService.getAuthHeaders();
      if (!headers) {
        throw new Error('No hay token de autenticación');
      }

      const response = await api.post<Notification>(
        BACKEND_CONFIG.ENDPOINTS.NOTIFICATIONS.BASE,
        notificationData,
        headers
      );

      return response;
    } catch (error) {
      console.error('Error creando notificación:', error);
      showApiError(error, 'Error creando notificación');
      throw error;
    }
  }

  // Enviar notificación masiva (solo para admins)
  async sendBulkNotification(
    recipientIds: string[],
    notificationData: Omit<CreateNotificationData, 'recipientId'>
  ): Promise<{ message: string; sent: number; failed: number }> {
    try {
      const headers = simpleAuthService.getAuthHeaders();
      if (!headers) {
        throw new Error('No hay token de autenticación');
      }

      const response = await api.post<{ message: string; sent: number; failed: number }>(
        BACKEND_CONFIG.ENDPOINTS.NOTIFICATIONS.BULK_SEND,
        {
          recipientIds,
          ...notificationData
        },
        headers
      );

      return response;
    } catch (error) {
      console.error('Error enviando notificación masiva:', error);
      showApiError(error, 'Error enviando notificación');
      throw error;
    }
  }
}

// Instancia singleton
export const notificationService = new NotificationService();

export default notificationService;