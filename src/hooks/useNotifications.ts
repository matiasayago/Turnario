import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Notification } from '../types';

export const useNotifications = (userId: string) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permission, setPermission] = useState<boolean>(false);

  // Solicitar permisos de notificación
  const requestPermission = useCallback(async () => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      setPermission(status === 'granted');
      return status === 'granted';
    } catch (err) {
      console.error('Error requesting notification permission:', err);
      return false;
    }
  }, []);

  // Configurar notificaciones
  const setupNotifications = useCallback(async () => {
    try {
      await Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });
    } catch (err) {
      console.error('Error setting up notifications:', err);
    }
  }, []);

  // Cargar notificaciones desde AsyncStorage
  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const stored = await AsyncStorage.getItem(`notifications_${userId}`);
      if (stored) {
        const userNotifications: Notification[] = JSON.parse(stored);
        setNotifications(userNotifications);
      }
    } catch (err) {
      setError('Error al cargar las notificaciones');
      console.error('Error loading notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Crear nueva notificación
  const createNotification = useCallback(async (notificationData: Omit<Notification, 'id' | 'createdAt' | 'read'>) => {
    try {
      const newNotification: Notification = {
        ...notificationData,
        id: Date.now().toString(),
        read: false,
        createdAt: new Date(),
      };

      const stored = await AsyncStorage.getItem(`notifications_${userId}`);
      const userNotifications: Notification[] = stored ? JSON.parse(stored) : [];
      userNotifications.unshift(newNotification); // Agregar al inicio
      
      await AsyncStorage.setItem(`notifications_${userId}`, JSON.stringify(userNotifications));
      setNotifications(prev => [newNotification, ...prev]);

      // Enviar notificación push si está permitido
      if (permission) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: newNotification.title,
            body: newNotification.message,
            data: newNotification.data,
          },
          trigger: null, // Notificación inmediata
        });
      }

      return newNotification;
    } catch (err) {
      setError('Error al crear la notificación');
      throw err;
    }
  }, [userId, permission]);

  // Marcar notificación como leída
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const updatedNotifications = notifications.map(notif => 
        notif.id === notificationId 
          ? { ...notif, read: true }
          : notif
      );
      
      await AsyncStorage.setItem(`notifications_${userId}`, JSON.stringify(updatedNotifications));
      setNotifications(updatedNotifications);
    } catch (err) {
      setError('Error al marcar la notificación como leída');
      throw err;
    }
  }, [notifications, userId]);

  // Marcar todas como leídas
  const markAllAsRead = useCallback(async () => {
    try {
      const updatedNotifications = notifications.map(notif => ({ ...notif, read: true }));
      await AsyncStorage.setItem(`notifications_${userId}`, JSON.stringify(updatedNotifications));
      setNotifications(updatedNotifications);
    } catch (err) {
      setError('Error al marcar todas las notificaciones como leídas');
      throw err;
    }
  }, [notifications, userId]);

  // Eliminar notificación
  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      const updatedNotifications = notifications.filter(notif => notif.id !== notificationId);
      await AsyncStorage.setItem(`notifications_${userId}`, JSON.stringify(updatedNotifications));
      setNotifications(updatedNotifications);
    } catch (err) {
      setError('Error al eliminar la notificación');
      throw err;
    }
  }, [notifications, userId]);

  // Limpiar todas las notificaciones
  const clearAllNotifications = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(`notifications_${userId}`);
      setNotifications([]);
    } catch (err) {
      setError('Error al limpiar las notificaciones');
      throw err;
    }
  }, [userId]);

  // Obtener notificaciones no leídas
  const getUnreadCount = useCallback(() => {
    return notifications.filter(notif => !notif.read).length;
  }, [notifications]);

  // Obtener notificaciones por tipo
  const getNotificationsByType = useCallback((type: Notification['type']) => {
    return notifications.filter(notif => notif.type === type);
  }, [notifications]);

  // Programar notificación de recordatorio
  const scheduleReminder = useCallback(async (
    title: string,
    message: string,
    date: Date,
    data?: any
  ) => {
    try {
      if (!permission) {
        throw new Error('Permisos de notificación no concedidos');
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body: message,
          data,
        },
        trigger: {
          date,
        },
      });

      // Crear notificación local también
      await createNotification({
        userId,
        title,
        message,
        type: 'reminder',
        data,
      });

      return true;
    } catch (err) {
      setError('Error al programar el recordatorio');
      throw err;
    }
  }, [permission, userId, createNotification]);

  // Cancelar notificación programada
  const cancelScheduledNotification = useCallback(async (notificationId: string) => {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (err) {
      console.error('Error canceling scheduled notification:', err);
    }
  }, []);

  useEffect(() => {
    setupNotifications();
    requestPermission();
    loadNotifications();
  }, [setupNotifications, requestPermission, loadNotifications]);

  return {
    notifications,
    loading,
    error,
    permission,
    createNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    getUnreadCount,
    getNotificationsByType,
    scheduleReminder,
    cancelScheduledNotification,
    refresh: loadNotifications,
  };
};

