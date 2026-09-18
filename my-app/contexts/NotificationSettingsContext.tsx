import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getBackendBaseUrl } from '../config/backend';
import simpleAuthService from '../services/simpleAuthService';
import { registerExpoPushTokenNow } from '../services/pushTokenRegistration';

export interface NotificationSettings {
  // Notificaciones generales
  generalNotifications: boolean;
  messageNotifications: boolean;
  reviewNotifications: boolean;
  
  // Notificaciones de citas
  appointmentRequests: boolean;
  appointmentConfirmations: boolean;
  appointmentReminders: boolean;
  appointmentCancellations: boolean;
  
  // Notificaciones de recordatorios
  reminderNotifications: boolean;
  reminderTime: '15min' | '30min' | '1hour' | '1day';
  
  // Notificaciones de marketing (opcional)
  marketingNotifications: boolean;
  
  // Configuración de sonido y vibración
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  
  // Horarios de notificaciones
  quietHoursEnabled: boolean;
  quietHoursStart: string; // formato "22:00"
  quietHoursEnd: string;   // formato "08:00"
}

interface NotificationSettingsContextType {
  settings: NotificationSettings;
  updateSettings: (newSettings: Partial<NotificationSettings>) => Promise<void>;
  resetToDefaults: () => Promise<void>;
  getSettingsForUser: (userId: string) => Promise<NotificationSettings>;
  enableDeviceNotifications: () => Promise<boolean>;
}

const defaultSettings: NotificationSettings = {
  generalNotifications: true,
  messageNotifications: true,
  reviewNotifications: true,
  appointmentRequests: true,
  appointmentConfirmations: true,
  appointmentReminders: true,
  appointmentCancellations: true,
  reminderNotifications: true,
  reminderTime: '1day',
  marketingNotifications: false,
  soundEnabled: true,
  vibrationEnabled: true,
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
};

const NotificationSettingsContext = createContext<NotificationSettingsContextType | undefined>(undefined);

export const useNotificationSettings = () => {
  const context = useContext(NotificationSettingsContext);
  if (!context) {
    console.error('useNotificationSettings must be used within a NotificationSettingsProvider');
    return {
      settings: defaultSettings,
      updateSettings: async () => console.warn('NotificationSettingsProvider not available'),
      resetToDefaults: async () => console.warn('NotificationSettingsProvider not available'),
      getSettingsForUser: async () => defaultSettings,
      enableDeviceNotifications: async () => false,
    };
  }
  return context;
};

async function syncPreferencesToBackend(settings: NotificationSettings) {
  try {
    const token = await simpleAuthService.getToken();
    if (!token) return;
    const pushEnabled = settings.generalNotifications !== false;
    await fetch(`${getBackendBaseUrl()}/api/users/profile/me`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        preferences: {
          notifications: {
            push: pushEnabled,
            email: true,
            sms: false,
            appointmentReminders:
              settings.appointmentReminders !== false && settings.reminderNotifications !== false,
          },
        },
      }),
    });
  } catch (error) {
    console.warn('No se pudieron sincronizar preferencias de notificación:', error);
  }
}

export const NotificationSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('notification_settings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        setSettings({ ...defaultSettings, ...parsed });
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    }
  };

  const saveSettings = async (newSettings: NotificationSettings) => {
    try {
      await AsyncStorage.setItem('notification_settings', JSON.stringify(newSettings));
    } catch (error) {
      console.error('Error saving notification settings:', error);
    }
  };

  const updateSettings = async (newSettings: Partial<NotificationSettings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    await saveSettings(updatedSettings);
    await syncPreferencesToBackend(updatedSettings);
    if (updatedSettings.generalNotifications) {
      void registerExpoPushTokenNow();
    }
    console.log('🔔 Configuración de notificaciones actualizada:', updatedSettings);
  };

  const resetToDefaults = async () => {
    setSettings(defaultSettings);
    await saveSettings(defaultSettings);
    await syncPreferencesToBackend(defaultSettings);
    console.log('🔔 Configuración de notificaciones restaurada a valores por defecto');
  };

  const enableDeviceNotifications = async () => {
    const ok = await registerExpoPushTokenNow();
    if (ok) {
      await updateSettings({
        generalNotifications: true,
        appointmentRequests: true,
        appointmentConfirmations: true,
        appointmentReminders: true,
        reminderNotifications: true,
        reminderTime: '1day',
      });
    }
    return ok;
  };

  const getSettingsForUser = async (_userId: string): Promise<NotificationSettings> => {
    return settings;
  };

  const value: NotificationSettingsContextType = {
    settings,
    updateSettings,
    resetToDefaults,
    getSettingsForUser,
    enableDeviceNotifications,
  };

  return (
    <NotificationSettingsContext.Provider value={value}>
      {children}
    </NotificationSettingsContext.Provider>
  );
};
