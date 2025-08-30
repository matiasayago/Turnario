import api, { createAuthHeaders } from './api';
import authService from './authService';

export interface Notification {
  _id: string;
  recipientId: string;
  senderId?: string;
  type: 'appointment_request' | 'appointment_confirmed' | 'appointment_cancelled' | 'payment_required' | 'reminder' | 'system';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  isRead: boolean;
  readAt?: string;
  appointmentData?: {
    appointmentId: string;
    service: string;
    date: string;
    time: string;
    professional: string;
    clinic: string;
  };
  metadata?: Record<string, any>;
  actionUrl?: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  expiresAt?: string;
  timestamp: string;
  createdAt: string;
  updatedAt: string;
  // Campos populados
  recipient?: {
    _id: string;
    fullName: string;
    email: string;
  };
  sender?: {
    _id: string;
    fullName: string;
    email: string;
  };
}

export interface CreateNotificationRequest {
  recipientId: string;
  type: Notification['type'];
  title: string;
  message: string;
  priority?: Notification['priority'];
  appointmentData?: Notification['appointmentData'];
  metadata?: Record<string, any>;
  actionUrl?: string;
  expiresAt?: string;
}

export interface UpdateNotificationRequest {
  title?: string;
  message?: string;
  priority?: Notification['priority'];
  metadata?: Record<string, any>;
  actionUrl?: string;
  expiresAt?: string;
}

export interface NotificationFilters {
  type?: string;
  priority?: string;
  isRead?: boolean;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface NotificationStats {
  total: number;
  unread: number;
  read: number;
  byType: Record<string, number>;
  byPriority: Record<string, number>;
}

export interface BulkNotificationRequest {
  recipientIds: string[];
  type: Notification['type'];
  title: string;
  message: string;
  priority?: Notification['priority'];
  metadata?: Record<string, any>;
  actionUrl?: string;
}

class NotificationService {
  // Obtener todas las notificaciones del usuario
  async getUserNotifications(filters: NotificationFilters = {}): Promise<Notification[]> {
    try {
      const token = await authService.getStoredToken();
      
      // Si hay token, intentar obtener del backend
      if (token) {
        try {
          const queryParams = new URLSearchParams();
          Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
              queryParams.append(key, value.toString());
            }
          });

          const endpoint = `/notifications/user?${queryParams.toString()}`;
          const response = await api.get<Notification[]>(endpoint, createAuthHeaders(token));
          return response;
        } catch (backendError) {
          console.warn('Error obteniendo notificaciones del backend, usando fallback:', backendError);
        }
      }

      // Fallback: datos de notificaciones para testing
      console.log('📱 Usando notificaciones de fallback para testing');
      return this.getFallbackNotifications(filters);
      
    } catch (error) {
      console.error('Get user notifications error:', error);
      // En caso de error, devolver notificaciones de fallback
      return this.getFallbackNotifications(filters);
    }
  }

  // Obtener notificación por ID
  async getNotificationById(notificationId: string): Promise<Notification> {
    try {
      const token = await authService.getStoredToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await api.get<Notification>(`/notifications/${notificationId}`, createAuthHeaders(token));
      return response;
    } catch (error) {
      console.error('Get notification error:', error);
      throw error;
    }
  }

  // Crear nueva notificación
  async createNotification(notificationData: CreateNotificationRequest): Promise<Notification> {
    try {
      const token = await authService.getStoredToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await api.post<Notification>('/notifications', notificationData, createAuthHeaders(token));
      return response;
    } catch (error) {
      console.error('Create notification error:', error);
      throw error;
    }
  }

  // Actualizar notificación
  async updateNotification(notificationId: string, updateData: UpdateNotificationRequest): Promise<Notification> {
    try {
      const token = await authService.getStoredToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await api.put<Notification>(`/notifications/${notificationId}`, updateData, createAuthHeaders(token));
      return response;
    } catch (error) {
      console.error('Update notification error:', error);
      throw error;
    }
  }

  // Marcar como leída
  async markAsRead(notificationId: string): Promise<{ message: string }> {
    try {
      const token = await authService.getStoredToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await api.post<{ message: string }>(`/notifications/${notificationId}/read`, {}, createAuthHeaders(token));
      return response;
    } catch (error) {
      console.error('Mark as read error:', error);
      throw error;
    }
  }

  // Marcar como no leída
  async markAsUnread(notificationId: string): Promise<{ message: string }> {
    try {
      const token = await authService.getStoredToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await api.post<{ message: string }>(`/notifications/${notificationId}/unread`, {}, createAuthHeaders(token));
      return response;
    } catch (error) {
      console.error('Mark as unread error:', error);
      throw error;
    }
  }

  // Marcar todas las notificaciones como leídas
  async markAllAsRead(): Promise<{ message: string; updatedCount: number }> {
    try {
      const token = await authService.getStoredToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await api.post<{ message: string; updatedCount: number }>('/notifications/mark-all-read', {}, createAuthHeaders(token));

      return response;
    } catch (error) {
      console.error('Mark all as read error:', error);
      throw error;
    }
  }

  // Eliminar notificación
  async deleteNotification(notificationId: string): Promise<{ message: string }> {
    try {
      const token = await authService.getStoredToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await api.delete<{ message: string }>(`/notifications/${notificationId}`, createAuthHeaders(token));

      return response;
    } catch (error) {
      console.error('Delete notification error:', error);
      throw error;
    }
  }

  // Limpiar todas las notificaciones del usuario
  async clearAllNotifications(): Promise<{ message: string; deletedCount: number }> {
    try {
      const token = await authService.getStoredToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await api.delete<{ message: string; deletedCount: number }>('/notifications/clear-all', createAuthHeaders(token));

      return response;
    } catch (error) {
      console.error('Clear all notifications error:', error);
      throw error;
    }
  }

  // Obtener conteo de notificaciones no leídas
  async getUnreadCount(): Promise<number> {
    try {
      const token = await authService.getStoredToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await api.get<{ unreadCount: number }>('/notifications/unread-count', createAuthHeaders(token));

      return response.unreadCount;
    } catch (error) {
      console.error('Get unread count error:', error);
      throw error;
    }
  }

  // Obtener estadísticas de notificaciones
  async getNotificationStats(): Promise<NotificationStats> {
    try {
      const token = await authService.getStoredToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await api.get<NotificationStats>('/notifications/stats', createAuthHeaders(token));
      return response;
    } catch (error) {
      console.error('Get notification stats error:', error);
      throw error;
    }
  }

  // Obtener tipos de notificaciones disponibles
  async getNotificationTypes(): Promise<string[]> {
    try {
      const token = await authService.getStoredToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await api.get<{ types: string[] }>('/notifications/types/list', createAuthHeaders(token));

      return response.types;
    } catch (error) {
      console.error('Get notification types error:', error);
      throw error;
    }
  }

  // Enviar notificación masiva
  async sendBulkNotification(bulkData: BulkNotificationRequest): Promise<{ message: string; sentCount: number; failedCount: number }> {
    try {
      const token = await authService.getStoredToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await api.post<{ message: string; sentCount: number; failedCount: number }>('/notifications/bulk', bulkData, createAuthHeaders(token));
      return response;
    } catch (error) {
      console.error('Send bulk notification error:', error);
      throw error;
    }
  }

  // Obtener notificaciones por tipo
  async getNotificationsByType(type: Notification['type'], filters: Omit<NotificationFilters, 'type'> = {}): Promise<Notification[]> {
    try {
      const token = await authService.getStoredToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const queryParams = new URLSearchParams({ type });
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });

      const endpoint = `/notifications/type?${queryParams.toString()}`;
      const response = await api.get<Notification[]>(endpoint, createAuthHeaders(token));
      return response;
    } catch (error) {
      console.error('Get notifications by type error:', error);
      throw error;
    }
  }

  // Obtener notificaciones por prioridad
  async getNotificationsByPriority(priority: Notification['priority'], filters: Omit<NotificationFilters, 'priority'> = {}): Promise<Notification[]> {
    try {
      const token = await authService.getStoredToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const queryParams = new URLSearchParams({ priority });
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });

      const endpoint = `/notifications/priority?${queryParams.toString()}`;
      const response = await api.get<Notification[]>(endpoint, createAuthHeaders(token));
      return response;
    } catch (error) {
      console.error('Get notifications by priority error:', error);
      throw error;
    }
  }

  // Archivar notificación
  async archiveNotification(notificationId: string): Promise<{ message: string }> {
    try {
      const token = await authService.getStoredToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await api.post<{ message: string }>(`/notifications/${notificationId}/archive`, {}, createAuthHeaders(token));

      return response;
    } catch (error) {
      console.error('Archive notification error:', error);
      throw error;
    }
  }

  // Método privado para obtener notificaciones de fallback
  private getFallbackNotifications(filters: NotificationFilters = {}): Notification[] {
    const fallbackNotifications: Notification[] = [
      {
        _id: 'notification_001',
        recipientId: 'client_001',
        senderId: 'prof_001',
        type: 'appointment_request',
        title: 'Nueva solicitud de cita',
        message: 'Dr. Ana Martínez ha solicitado una cita para el 15 de enero a las 15:30',
        priority: 'medium',
        isRead: false,
        readAt: undefined,
        appointmentData: {
          appointmentId: 'appointment_001',
          service: 'Consulta Psicológica',
          date: '2024-01-15',
          time: '15:30',
          professional: 'Dr. Ana Martínez',
          clinic: 'Centro de Salud Mental'
        },
        metadata: {},
        actionUrl: '/appointments/appointment_001',
        status: 'delivered',
        expiresAt: '2024-01-20T00:00:00.000Z',
        timestamp: '2024-01-10T10:00:00.000Z',
        createdAt: '2024-01-10T10:00:00.000Z',
        updatedAt: '2024-01-10T10:00:00.000Z',
        recipient: {
          _id: 'client_001',
          fullName: 'Juan Pérez',
          email: 'juan.perez@email.com'
        },
        sender: {
          _id: 'prof_001',
          fullName: 'Dr. Ana Martínez',
          email: 'ana.martinez@clinic.com'
        }
      },
      {
        _id: 'notification_002',
        recipientId: 'client_002',
        senderId: 'system',
        type: 'reminder',
        title: 'Recordatorio de cita',
        message: 'Tu cita médica está programada para mañana a las 10:00',
        priority: 'high',
        isRead: true,
        readAt: '2024-01-11T14:00:00.000Z',
        appointmentData: {
          appointmentId: 'appointment_002',
          service: 'Consulta Médica General',
          date: '2024-01-16',
          time: '10:00',
          professional: 'Dr. Carlos López',
          clinic: 'Clínica San Martín'
        },
        metadata: {},
        actionUrl: '/appointments/appointment_002',
        status: 'read',
        expiresAt: '2024-01-17T00:00:00.000Z',
        timestamp: '2024-01-11T14:00:00.000Z',
        createdAt: '2024-01-11T14:00:00.000Z',
        updatedAt: '2024-01-11T14:00:00.000Z',
        recipient: {
          _id: 'client_002',
          fullName: 'María González',
          email: 'maria.gonzalez@email.com'
        },
        sender: {
          _id: 'system',
          fullName: 'Sistema',
          email: 'system@turnario.com'
        }
      },
      {
        _id: 'notification_003',
        recipientId: 'client_003',
        senderId: 'prof_003',
        type: 'appointment_confirmed',
        title: 'Cita confirmada',
        message: 'Tu cita de peluquería ha sido confirmada para el 17 de enero a las 16:00',
        priority: 'low',
        isRead: false,
        readAt: undefined,
        appointmentData: {
          appointmentId: 'appointment_003',
          service: 'Corte de Cabello',
          date: '2024-01-17',
          time: '16:00',
          professional: 'Sofía Rodríguez',
          clinic: 'Salón de Belleza Elegante'
        },
        metadata: {},
        actionUrl: '/appointments/appointment_003',
        status: 'delivered',
        expiresAt: '2024-01-24T00:00:00.000Z',
        timestamp: '2024-01-12T09:00:00.000Z',
        createdAt: '2024-01-12T09:00:00.000Z',
        updatedAt: '2024-01-12T09:00:00.000Z',
        recipient: {
          _id: 'client_003',
          fullName: 'Laura Fernández',
          email: 'laura.fernandez@email.com'
        },
        sender: {
          _id: 'prof_003',
          fullName: 'Sofía Rodríguez',
          email: 'sofia.rodriguez@salon.com'
        }
      },
      {
        _id: 'notification_004',
        recipientId: 'client_001',
        senderId: 'system',
        type: 'payment_required',
        title: 'Pago requerido',
        message: 'Se requiere el pago de seña para confirmar tu cita psicológica',
        priority: 'high',
        isRead: false,
        readAt: undefined,
        appointmentData: {
          appointmentId: 'appointment_001',
          service: 'Consulta Psicológica',
          date: '2024-01-15',
          time: '15:30',
          professional: 'Dr. Ana Martínez',
          clinic: 'Centro de Salud Mental'
        },
        metadata: { amount: 1000, currency: 'ARS' },
        actionUrl: '/payments/appointment_001',
        status: 'delivered',
        expiresAt: '2024-01-13T00:00:00.000Z',
        timestamp: '2024-01-10T11:00:00.000Z',
        createdAt: '2024-01-10T11:00:00.000Z',
        updatedAt: '2024-01-10T11:00:00.000Z',
        recipient: {
          _id: 'client_001',
          fullName: 'Juan Pérez',
          email: 'juan.perez@email.com'
        },
        sender: {
          _id: 'system',
          fullName: 'Sistema',
          email: 'system@turnario.com'
        }
      }
    ];

    // Aplicar filtros básicos
    let filteredNotifications = fallbackNotifications;

    if (filters.type) {
      filteredNotifications = filteredNotifications.filter(n => n.type === filters.type);
    }

    if (filters.priority) {
      filteredNotifications = filteredNotifications.filter(n => n.priority === filters.priority);
    }

    if (filters.isRead !== undefined) {
      filteredNotifications = filteredNotifications.filter(n => n.isRead === filters.isRead);
    }

    if (filters.status) {
      filteredNotifications = filteredNotifications.filter(n => n.status === filters.status);
    }

    if (filters.dateFrom) {
      filteredNotifications = filteredNotifications.filter(n => n.timestamp >= filters.dateFrom!);
    }

    if (filters.dateTo) {
      filteredNotifications = filteredNotifications.filter(n => n.timestamp <= filters.dateTo!);
    }

    return filteredNotifications;
  }
}

export default new NotificationService();
