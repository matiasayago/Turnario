// @ts-nocheck � beta
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, AppStateStatus } from 'react-native';
import { getBackendBaseUrl } from '../config/backend';
import { simpleNotificationService } from '../services/simpleNotificationService';
import simpleAuthService from '../services/simpleAuthService';
import { useAuth } from './AuthContext';
import { useRegisterExpoPushToken } from '../hooks/useRegisterExpoPushToken';

export interface NotificationItem {
  id: string;
  type:
    | 'appointment_request'
    | 'appointment_confirmed'
    | 'appointment_cancelled'
    | 'appointment_cancelled_by_client'
    | 'appointment_rescheduled_by_client'
    | 'appointment_cancelled_by_professional'
    | 'appointment_rescheduled_by_professional'
    | 'reminder'
    | 'payment_required'
    | 'payment_successful'
    | 'chat_message'
    | 'system'
    | 'password_reset';
  title: string;
  message: string;
  recipientId: string;
  senderId: string;
  senderName: string;
  appointmentData?: {
    /** _id Mongo de ExpoAppointment */
    appointmentId?: string;
    service?: string;
    date?: string;
    time?: string;
    notes?: string;
    professional?: string;
    professionalId?: string;
    professionalName?: string;
    depositAmount?: number;
    totalAmount?: number;
    /** Deep link al chat (clave idA_idB) */
    chatConversationKey?: string;
    chatMessageId?: string;
  };
  /** Datos para recuperación de contraseña (notificación in-app / push) */
  passwordReset?: { resetToken?: string };
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
  const pushUserId = user ? String((user as { _id?: string })._id || (user as { id?: string }).id || '') : undefined;
  useRegisterExpoPushToken(pushUserId);

  // Cargar notificaciones al iniciar
  useEffect(() => {
    if (user) {
      loadNotifications();
    }
  }, [user]);

  // Refresco al volver a la app y polling liviano (push + in-app)
  useEffect(() => {
    if (!user) return;

    const onAppState = (next: AppStateStatus) => {
      if (next === 'active') {
        loadNotifications();
      }
    };
    const sub = AppState.addEventListener('change', onAppState);
    const interval = setInterval(() => {
      if (AppState.currentState === 'active') {
        loadNotifications();
      }
    }, 45_000);

    return () => {
      sub.remove();
      clearInterval(interval);
    };
  }, [user]);

  // Cargar notificaciones del backend
  const loadNotifications = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);

      // Cargar notificaciones reales desde API Expo
      try {
        const token = await simpleAuthService.getToken();
        let convertedNotifications: NotificationItem[] = [];
        let expoFetchSucceeded = false;

        if (token) {
          const res = await fetch(`${getBackendBaseUrl()}/api/v1/expo-notifications`, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
          if (res.ok) {
            expoFetchSucceeded = true;
            const json = await res.json();
            const rows = Array.isArray(json.data) ? json.data : [];
            convertedNotifications = rows.map((n: Record<string, unknown>) => {
              const d = (n.data as Record<string, string> | undefined) || {};
              const sender =
                (n.senderId && String(n.senderId)) || 'system';
              const isChat = n.type === 'chat_message';
              return {
                id: String(n._id),
                type: n.type as NotificationItem['type'],
                title: String(n.title || ''),
                message: String(n.message || ''),
                recipientId: String(n.recipientId),
                senderId: sender,
                senderName:
                  (d.patientName as string) ||
                  (d.professionalName as string) ||
                  (isChat ? 'Chat' : 'Cliente'),
                appointmentData: {
                  appointmentId: d.appointmentId,
                  service: String(d.service || ''),
                  date: String(d.date || ''),
                  time: String(d.time || ''),
                  notes: d.notes,
                  professional: d.professionalName,
                  professionalName: d.professionalName,
                  professionalId: d.professionalId,
                  depositAmount:
                    d.depositAmount != null && d.depositAmount !== ''
                      ? Number(d.depositAmount)
                      : undefined,
                  chatConversationKey: d.chatConversationKey,
                  chatMessageId: d.chatMessageId,
                },
                passwordReset:
                  n.type === 'password_reset' && d.resetToken
                    ? { resetToken: String(d.resetToken) }
                    : undefined,
                timestamp: new Date(
                  (n.createdAt as string) || (n.updatedAt as string) || Date.now()
                ),
                read: Boolean(n.read),
              };
            });
          }
        }

        const myId = String(user._id || user.id || '').trim();
        if (myId) {
          convertedNotifications = convertedNotifications.filter(
            (n) => String(n.recipientId) === myId
          );
        }

        // Solo usar fallback legacy/mock cuando la API expo falló.
        // Si la API respondió OK pero vacía, debemos respetar "sin notificaciones".
        if (!expoFetchSucceeded && convertedNotifications.length === 0) {
          const backendNotifications = await simpleNotificationService.getUserNotifications();
          convertedNotifications = backendNotifications.map((notif) => ({
            id: notif._id,
            type: notif.type as NotificationItem['type'],
            title: notif.title,
            message: notif.message,
            recipientId: notif.recipientId,
            senderId: 'system',
            senderName: 'Sistema',
            appointmentData: notif.data
              ? {
                  service: notif.data.service,
                  date: notif.data.date,
                  time: notif.data.time,
                  professional: notif.data.professional,
                  professionalId: notif.data.appointmentId,
                }
              : undefined,
            timestamp: new Date(notif.createdAt),
            read: notif.isRead,
          }));
          if (myId) {
            convertedNotifications = convertedNotifications.filter(
              (n) => String(n.recipientId) === myId
            );
          }
        }

        setNotifications(convertedNotifications);
        console.log('✅ Notificaciones cargadas:', convertedNotifications.length);

        await AsyncStorage.setItem('notifications', JSON.stringify(convertedNotifications));
      } catch (backendError) {
        console.error('Error cargando del backend, usando respaldo local:', backendError);
        
        // Fallback a notificaciones locales
        const savedNotifications = await AsyncStorage.getItem('notifications');
        if (savedNotifications) {
          const parsed = JSON.parse(savedNotifications);
          const uid = String(user._id || user.id || '').trim();
          const notificationsWithDates = parsed
            .map((n: NotificationItem) => ({
              ...n,
              timestamp: new Date(n.timestamp),
            }))
            .filter((n: NotificationItem) => !uid || String(n.recipientId) === uid);
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
        await simpleNotificationService.createNotification({
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
      try {
        const token = await simpleAuthService.getToken();
        if (token && /^[a-fA-F0-9]{24}$/.test(notificationId)) {
          await fetch(
            `${getBackendBaseUrl()}/api/v1/expo-notifications/${notificationId}/read`,
            {
              method: 'PATCH',
              headers: { Authorization: `Bearer ${token}` },
            }
          );
        }
      } catch (e) {
        console.warn('expo-notifications read:', e);
      }
      try {
        await simpleNotificationService.markAsRead(notificationId);
      } catch (backendError) {
        console.error('Error marcando como leída (legacy):', backendError);
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
        await simpleNotificationService.deleteNotification(notificationId);
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
    const uid = String(userId);
    return notifications.filter(
      (notification) => String(notification.recipientId) === uid && !notification.read
    ).length;
  };

  // Obtener notificaciones del usuario
  const getNotificationsForUser = (userId: string) => {
    const uid = String(userId);
    const userNotifications = notifications
      .filter((notification) => String(notification.recipientId) === uid)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    return userNotifications;
  };

  // Limpiar todas las notificaciones
  const clearAllNotifications = async (userId: string) => {
    try {
      const token = await simpleAuthService.getToken();

      // Limpiar del backend (API Expo real)
      try {
        if (token) {
          await fetch(`${getBackendBaseUrl()}/api/v1/expo-notifications`, {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
          console.log('✅ Todas las expo-notifications limpiadas del backend');
        }
      } catch (expoBackendError) {
        console.error('Error limpiando expo-notifications del backend:', expoBackendError);
      }

      // Compatibilidad con backend legacy (si existe en algunos entornos)
      try {
        await simpleNotificationService.clearAllNotifications();
      } catch (legacyBackendError) {
        console.warn('clearAllNotifications legacy:', legacyBackendError);
      }
      
      // Limpiar localmente
      const uid = String(userId);
      const updatedNotifications = notifications.filter(
        (notification) => String(notification.recipientId) !== uid
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
