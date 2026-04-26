// @ts-nocheck � beta
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Notification, NotificationFilters, CreateNotificationData } from './notificationService';

class SimpleNotificationService {
  private notificationsKey = 'notifications_data';

  // Notificaciones mock para desarrollo
  private mockNotifications: Notification[] = [
    {
      _id: '1',
      type: 'appointment_reminder',
      title: 'Recordatorio de Cita',
      message: 'Tienes una cita programada para mañana a las 10:00 AM',
      recipientId: '2',
      data: {
        service: 'Medicina General',
        date: '2024-01-15',
        time: '10:00',
        professional: 'Dr. Carlos Mendoza',
        appointmentId: 'apt_1'
      },
      isRead: false,
      priority: 'medium',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      _id: '2',
      type: 'appointment_confirmed',
      title: 'Cita Confirmada',
      message: 'Tu cita ha sido confirmada exitosamente',
      recipientId: '2',
      data: {
        service: 'Medicina General',
        date: '2024-01-15',
        time: '10:00',
        professional: 'Dr. Carlos Mendoza',
        appointmentId: 'apt_1'
      },
      isRead: true,
      priority: 'high',
      createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hora atrás
      updatedAt: new Date().toISOString()
    },
    {
      _id: '3',
      type: 'system_update',
      title: 'Bienvenido a Turnario',
      message: 'Gracias por usar nuestra aplicación de gestión de citas',
      recipientId: '2',
      data: {},
      isRead: false,
      priority: 'low',
      createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 día atrás
      updatedAt: new Date().toISOString()
    }
  ];

  // Simular delay de red
  private delay(ms: number = 500): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Inicializar servicio
  async initialize(): Promise<void> {
    try {
      console.log('🔄 Inicializando servicio de notificaciones simple...');
      await this.delay(100);
      console.log('✅ Servicio de notificaciones simple inicializado');
    } catch (error) {
      console.error('❌ Error inicializando servicio simple:', error);
      throw error;
    }
  }

  // Obtener notificaciones (alias para getUserNotifications)
  async getUserNotifications(filters: NotificationFilters = {}): Promise<Notification[]> {
    try {
      console.log('🔔 Obteniendo notificaciones del usuario...');
      await this.delay(300);

      // Filtrar notificaciones según los filtros
      let filteredNotifications = [...this.mockNotifications];

      if (filters.recipientId) {
        filteredNotifications = filteredNotifications.filter(n => n.recipientId === filters.recipientId);
      }

      if (filters.type) {
        filteredNotifications = filteredNotifications.filter(n => n.type === filters.type);
      }

      if (filters.isRead !== undefined) {
        filteredNotifications = filteredNotifications.filter(n => n.isRead === filters.isRead);
      }

      // Ordenar por timestamp (más recientes primero)
      filteredNotifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      console.log(`✅ ${filteredNotifications.length} notificaciones obtenidas`);
      return filteredNotifications;
    } catch (error) {
      console.error('❌ Error obteniendo notificaciones:', error);
      return [];
    }
  }

  // Obtener notificaciones con paginación
  async getNotifications(filters: NotificationFilters = {}): Promise<{
    notifications: Notification[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const allNotifications = await this.getUserNotifications(filters);
      
      const page = filters.page || 1;
      const limit = filters.limit || 10;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      
      const paginatedNotifications = allNotifications.slice(startIndex, endIndex);
      const totalPages = Math.ceil(allNotifications.length / limit);

      return {
        notifications: paginatedNotifications,
        total: allNotifications.length,
        page,
        totalPages
      };
    } catch (error) {
      console.error('❌ Error obteniendo notificaciones paginadas:', error);
      return {
        notifications: [],
        total: 0,
        page: 1,
        totalPages: 0
      };
    }
  }

  // Obtener una notificación específica
  async getNotification(notificationId: string): Promise<Notification | null> {
    try {
      console.log('🔔 Obteniendo notificación:', notificationId);
      await this.delay(200);

      const notification = this.mockNotifications.find(n => n._id === notificationId);
      
      if (notification) {
        console.log('✅ Notificación encontrada');
        return notification;
      } else {
        console.log('⚠️ Notificación no encontrada');
        return null;
      }
    } catch (error) {
      console.error('❌ Error obteniendo notificación:', error);
      return null;
    }
  }

  // Crear notificación
  async createNotification(data: CreateNotificationData): Promise<Notification> {
    try {
      console.log('📝 Creando notificación...');
      await this.delay(500);

      const newNotification: Notification = {
        _id: `notif_${Date.now()}`,
        type: data.type as any,
        title: data.title,
        message: data.message,
        recipientId: data.recipientId,
        data: data.data || {},
        isRead: false,
        priority: data.priority || 'medium',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Agregar a la lista mock
      this.mockNotifications.unshift(newNotification);

      console.log('✅ Notificación creada:', newNotification._id);
      return newNotification;
    } catch (error) {
      console.error('❌ Error creando notificación:', error);
      throw error;
    }
  }

  // Marcar como leída
  async markAsRead(notificationId: string): Promise<Notification | null> {
    try {
      console.log('👁️ Marcando notificación como leída:', notificationId);
      await this.delay(300);

      const notification = this.mockNotifications.find(n => n._id === notificationId);
      
      if (notification) {
        notification.isRead = true;
        notification.updatedAt = new Date().toISOString();
        console.log('✅ Notificación marcada como leída');
        return notification;
      } else {
        console.log('⚠️ Notificación no encontrada');
        return null;
      }
    } catch (error) {
      console.error('❌ Error marcando notificación como leída:', error);
      return null;
    }
  }

  // Marcar como no leída
  async markAsUnread(notificationId: string): Promise<Notification | null> {
    try {
      console.log('👁️ Marcando notificación como no leída:', notificationId);
      await this.delay(300);

      const notification = this.mockNotifications.find(n => n._id === notificationId);
      
      if (notification) {
        notification.isRead = false;
        notification.updatedAt = new Date().toISOString();
        console.log('✅ Notificación marcada como no leída');
        return notification;
      } else {
        console.log('⚠️ Notificación no encontrada');
        return null;
      }
    } catch (error) {
      console.error('❌ Error marcando notificación como no leída:', error);
      return null;
    }
  }

  // Eliminar notificación
  async deleteNotification(notificationId: string): Promise<boolean> {
    try {
      console.log('🗑️ Eliminando notificación:', notificationId);
      await this.delay(300);

      const index = this.mockNotifications.findIndex(n => n._id === notificationId);
      
      if (index !== -1) {
        this.mockNotifications.splice(index, 1);
        console.log('✅ Notificación eliminada');
        return true;
      } else {
        console.log('⚠️ Notificación no encontrada');
        return false;
      }
    } catch (error) {
      console.error('❌ Error eliminando notificación:', error);
      return false;
    }
  }

  // Limpiar todas las notificaciones
  async clearAllNotifications(): Promise<{ message: string; count: number }> {
    try {
      console.log('🧹 Limpiando todas las notificaciones...');
      await this.delay(500);

      const count = this.mockNotifications.length;
      this.mockNotifications = [];

      console.log(`✅ ${count} notificaciones eliminadas`);
      return {
        message: `${count} notificaciones eliminadas`,
        count
      };
    } catch (error) {
      console.error('❌ Error limpiando notificaciones:', error);
      throw error;
    }
  }

  // Obtener contador de notificaciones no leídas
  async getUnreadCount(userId: string): Promise<number> {
    try {
      console.log('🔢 Obteniendo contador de notificaciones no leídas...');
      await this.delay(200);

      const unreadCount = this.mockNotifications.filter(n => 
        n.recipientId === userId && !n.isRead
      ).length;

      console.log(`✅ ${unreadCount} notificaciones no leídas`);
      return unreadCount;
    } catch (error) {
      console.error('❌ Error obteniendo contador:', error);
      return 0;
    }
  }

  // Obtener todas las notificaciones
  async getAllNotifications(): Promise<Notification[]> {
    try {
      console.log('📋 Obteniendo todas las notificaciones...');
      await this.delay(300);
      return [...this.mockNotifications];
    } catch (error) {
      console.error('❌ Error obteniendo todas las notificaciones:', error);
      return [];
    }
  }
}

// Instancia singleton
export const simpleNotificationService = new SimpleNotificationService();

export default simpleNotificationService;
