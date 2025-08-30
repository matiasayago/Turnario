import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface NotificationSettings {
  // Notificaciones generales
  generalNotifications: boolean;
  
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
}

const defaultSettings: NotificationSettings = {
  generalNotifications: true,
  appointmentRequests: true,
  appointmentConfirmations: true,
  appointmentReminders: true,
  appointmentCancellations: true,
  reminderNotifications: true,
  reminderTime: '30min',
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
    // Retornar un objeto por defecto en lugar de lanzar un error
    return {
      settings: {
        pushNotifications: true,
        emailNotifications: false,
        appointmentReminders: true,
        marketingNotifications: false,
      },
      updateSettings: () => console.warn('NotificationSettingsProvider not available'),
      resetToDefaults: () => console.warn('NotificationSettingsProvider not available'),
    };
  }
  return context;
};

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
    console.log('🔔 Configuración de notificaciones actualizada:', updatedSettings);
  };

  const resetToDefaults = async () => {
    setSettings(defaultSettings);
    await saveSettings(defaultSettings);
    console.log('🔔 Configuración de notificaciones restaurada a valores por defecto');
  };

  const getSettingsForUser = async (userId: string): Promise<NotificationSettings> => {
    // En una implementación real, aquí cargarías configuraciones específicas del usuario
    // Por ahora, retornamos la configuración global
    return settings;
  };

  const value: NotificationSettingsContextType = {
    settings,
    updateSettings,
    resetToDefaults,
    getSettingsForUser,
  };

  return (
    <NotificationSettingsContext.Provider value={value}>
      {children}
    </NotificationSettingsContext.Provider>
  );
};
