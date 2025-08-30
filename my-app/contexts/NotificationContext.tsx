import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import notificationService from '../services/notificationService';
import { useAuth } from './AuthContext';

export interface NotificationItem {
  id: string;
  type: 'appointment_request' | 'appointment_confirmed' | 'appointment_cancelled' | 'reminder' | 'payment_required' | 'payment_successful';
  title: string;
  message: string;
  recipientId: string;
  senderId: string;
  senderName: string;
  appointmentData?: {
    service: string;
    date: string;
    time: string;
    notes?: string;
    professional?: string;
    professionalId?: string;
    depositAmount?: number;
    totalAmount?: number;
  };
  timestamp: Date;
  read: boolean;
}

interface NotificationContextType {
  notifications: NotificationItem[];
  addNotification: (notification: Omit<NotificationItem, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (notificationId: string) => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  getUnreadCount: (userId: string) => number;
  getNotificationsForUser: (userId: string) => NotificationItem[];
  clearAllNotifications: (userId: string) => Promise<void>;
  refreshNotifications: () => Promise<void>;
  loading: boolean;
  error: string | null;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    console.error('useNotifications must be used within a NotificationProvider');
    // Retornar un objeto por defecto en lugar de lanzar un error
    return {
      notifications: [],
      addNotification: () => console.warn('NotificationProvider not available'),
      markAsRead: async () => console.warn('NotificationProvider not available'),
      deleteNotification: async () => console.warn('NotificationProvider not available'),
      getUnreadCount: () => 0,
      getNotificationsForUser: () => [],
      clearAllNotifications: async () => console.warn('NotificationProvider not available'),
      refreshNotifications: async () => console.warn('NotificationProvider not available'),
      loading: false,
      error: null,
    };
  }
  return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Cargar notificaciones al iniciar
  useEffect(() => {
    if (user) {
      loadNotifications();
    }
  }, [user]);

  // Cargar notificaciones del backend
  const loadNotifications = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Intentar cargar del backend
      try {
        const backendNotifications = await notificationService.getUserNotifications();
        
        // Convertir notificaciones del backend al formato del frontend
        const convertedNotifications: NotificationItem[] = backendNotifications.map(notif => ({
          id: notif._id,
          type: notif.type as any,
          title: notif.title,
          message: notif.message,
          recipientId: notif.recipientId,
          senderId: notif.senderId || '',
          senderName: notif.sender?.fullName || 'Sistema',
          appointmentData: notif.appointmentData ? {
            service: notif.appointmentData.service,
            date: notif.appointmentData.date,
            time: notif.appointmentData.time,
            professional: notif.appointmentData.professional,
            professionalId: notif.appointmentData.appointmentId,
          } : undefined,
          timestamp: new Date(notif.timestamp),
          read: notif.isRead,
        }));
        
        setNotifications(convertedNotifications);
        console.log('✅ Notificaciones cargadas del backend:', convertedNotifications.length);
        
        // Guardar en AsyncStorage como respaldo
        await AsyncStorage.setItem('notifications', JSON.stringify(convertedNotifications));
        
      } catch (backendError) {
        console.error('Error cargando del backend, usando respaldo local:', backendError);
        
        // Fallback a notificaciones locales
        const savedNotifications = await AsyncStorage.getItem('notifications');
        if (savedNotifications) {
          const parsed = JSON.parse(savedNotifications);
          const notificationsWithDates = parsed.map((n: any) => ({
            ...n,
            timestamp: new Date(n.timestamp),
          }));
          setNotifications(notificationsWithDates);
        }
      }
      
    } catch (error) {
      console.error('Error loading notifications:', error);
      setError('Error al cargar notificaciones');
    } finally {
      setLoading(false);
    }
  };

  // Refrescar notificaciones
  const refreshNotifications = async () => {
    await loadNotifications();
  };

  // Guardar notificaciones en AsyncStorage
  const saveNotifications = async (newNotifications: NotificationItem[]) => {
    try {
      await AsyncStorage.setItem('notifications', JSON.stringify(newNotifications));
    } catch (error) {
      console.error('Error saving notifications:', error);
    }
  };

  // Agregar notificación (local y backend)
  const addNotification = async (notificationData: Omit<NotificationItem, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: NotificationItem = {
      ...notificationData,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      read: false,
    };

    const updatedNotifications = [newNotification, ...notifications];
    setNotifications(updatedNotifications);
    saveNotifications(updatedNotifications);

    // Intentar enviar al backend
    if (user) {
      try {
        await notificationService.createNotification({
          recipientId: notificationData.recipientId,
          type: notificationData.type as any,
          title: notificationData.title,
          message: notificationData.message,
          priority: 'medium',
          appointmentData: notificationData.appointmentData ? {
            appointmentId: notificationData.appointmentData.professionalId || '',
            service: notificationData.appointmentData.service,
            date: notificationData.appointmentData.date,
            time: notificationData.appointmentData.time,
            professional: notificationData.appointmentData.professional || '',
            clinic: '',
          } : undefined,
        });
        console.log('✅ Notificación enviada al backend');
      } catch (error) {
        console.error('Error enviando notificación al backend:', error);
      }
    }

    console.log('🔔 Nueva notificación creada:', newNotification);
  };

  // Marcar como leída (backend y local)
  const markAsRead = async (notificationId: string) => {
    try {
      // Actualizar en el backend
      try {
        await notificationService.markAsRead(notificationId);
        console.log('✅ Notificación marcada como leída en backend');
      } catch (backendError) {
        console.error('Error marcando como leída en backend:', backendError);
      }
      
      // Actualizar localmente
      const updatedNotifications = notifications.map(notification =>
        notification.id === notificationId ? { ...notification, read: true } : notification
      );
      setNotifications(updatedNotifications);
      saveNotifications(updatedNotifications);
      
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Eliminar notificación (backend y local)
  const deleteNotification = async (notificationId: string) => {
    try {
      // Eliminar del backend
      try {
        await notificationService.deleteNotification(notificationId);
        console.log('✅ Notificación eliminada del backend');
      } catch (backendError) {
        console.error('Error eliminando del backend:', backendError);
      }
      
      // Eliminar localmente
      const updatedNotifications = notifications.filter(notification => notification.id !== notificationId);
      setNotifications(updatedNotifications);
      saveNotifications(updatedNotifications);
      
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  // Obtener conteo de no leídas
  const getUnreadCount = (userId: string) => {
    return notifications.filter(notification => 
      notification.recipientId === userId && !notification.read
    ).length;
  };

  // Obtener notificaciones del usuario
  const getNotificationsForUser = (userId: string) => {
    const userNotifications = notifications.filter(notification => 
      notification.recipientId === userId
    ).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    return userNotifications;
  };

  // Limpiar todas las notificaciones
  const clearAllNotifications = async (userId: string) => {
    try {
      // Limpiar del backend
      try {
        await notificationService.clearAllNotifications();
        console.log('✅ Todas las notificaciones limpiadas del backend');
      } catch (backendError) {
        console.error('Error limpiando del backend:', backendError);
      }
      
      // Limpiar localmente
      const updatedNotifications = notifications.filter(notification => 
        notification.recipientId !== userId
      );
      setNotifications(updatedNotifications);
      saveNotifications(updatedNotifications);
      
    } catch (error) {
      console.error('Error clearing all notifications:', error);
    }
  };

  const value: NotificationContextType = {
    notifications,
    addNotification,
    markAsRead,
    deleteNotification,
    getUnreadCount,
    getNotificationsForUser,
    clearAllNotifications,
    refreshNotifications,
    loading,
    error,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
