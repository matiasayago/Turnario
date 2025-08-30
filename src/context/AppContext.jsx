import React, { createContext, useContext, useReducer, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

const AppContext = createContext();

const initialState = {
  isLoading: false,
  error: null,
  networkStatus: 'online',
  theme: 'light',
  language: 'es',
  notifications: {
    enabled: true,
    sound: true,
    vibration: true,
  },
  appConfig: {
    maxAppointmentsPerDay: 20,
    minAdvanceBookingHours: 2,
    maxAdvanceBookingDays: 30,
    cancellationPolicyHours: 24,
    reminderNotificationHours: 2,
  },
};

const appReducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    case 'SET_NETWORK_STATUS':
      return { ...state, networkStatus: action.payload };
    case 'SET_THEME':
      return { ...state, theme: action.payload };
    case 'SET_LANGUAGE':
      return { ...state, language: action.payload };
    case 'UPDATE_NOTIFICATIONS':
      return { 
        ...state, 
        notifications: { ...state.notifications, ...action.payload } 
      };
    case 'UPDATE_APP_CONFIG':
      return { 
        ...state, 
        appConfig: { ...state.appConfig, ...action.payload } 
      };
    case 'RESET_STATE':
      return { ...initialState, isLoading: false };
    default:
      return state;
  }
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp debe ser usado dentro de un AppProvider');
  }
  return context;
};

export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Cargar configuración guardada
  useEffect(() => {
    loadStoredConfig();
  }, []);

  // Monitorear estado de red
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      dispatch({ 
        type: 'SET_NETWORK_STATUS', 
        payload: state.isConnected ? 'online' : 'offline' 
      });
    });

    return () => unsubscribe();
  }, []);

  const loadStoredConfig = async () => {
    try {
      const storedConfig = await AsyncStorage.getItem('app_config');
      if (storedConfig) {
        const config = JSON.parse(storedConfig);
        
        if (config.theme) {
          dispatch({ type: 'SET_THEME', payload: config.theme });
        }
        
        if (config.language) {
          dispatch({ type: 'SET_LANGUAGE', payload: config.language });
        }
        
        if (config.notifications) {
          dispatch({ type: 'UPDATE_NOTIFICATIONS', payload: config.notifications });
        }
        
        if (config.appConfig) {
          dispatch({ type: 'UPDATE_APP_CONFIG', payload: config.appConfig });
        }
      }
    } catch (error) {
      console.error('Error cargando configuración de la app:', error);
    }
  };

  const saveConfig = async (config) => {
    try {
      const currentConfig = await AsyncStorage.getItem('app_config');
      const existingConfig = currentConfig ? JSON.parse(currentConfig) : {};
      const newConfig = { ...existingConfig, ...config };
      
      await AsyncStorage.setItem('app_config', JSON.stringify(newConfig));
    } catch (error) {
      console.error('Error guardando configuración:', error);
    }
  };

  const setLoading = (loading) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  };

  const setError = (error) => {
    dispatch({ type: 'SET_ERROR', payload: error });
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const setTheme = async (theme) => {
    dispatch({ type: 'SET_THEME', payload: theme });
    await saveConfig({ theme });
  };

  const setLanguage = async (language) => {
    dispatch({ type: 'SET_LANGUAGE', payload: language });
    await saveConfig({ language });
  };

  const updateNotifications = async (notifications) => {
    dispatch({ type: 'UPDATE_NOTIFICATIONS', payload: notifications });
    await saveConfig({ notifications: { ...state.notifications, ...notifications } });
  };

  const updateAppConfig = async (config) => {
    dispatch({ type: 'UPDATE_APP_CONFIG', payload: config });
    await saveConfig({ appConfig: { ...state.appConfig, ...config } });
  };

  const resetAppState = () => {
    dispatch({ type: 'RESET_STATE' });
  };

  // Función para manejar errores de manera centralizada
  const handleError = (error, context = '') => {
    console.error(`Error en ${context}:`, error);
    
    let errorMessage = 'Ha ocurrido un error inesperado';
    
    if (typeof error === 'string') {
      errorMessage = error;
    } else if (error?.message) {
      errorMessage = error.message;
    } else if (error?.error) {
      errorMessage = error.error;
    }
    
    setError(errorMessage);
    
    // Auto-limpiar error después de 5 segundos
    setTimeout(() => {
      clearError();
    }, 5000);
  };

  // Función para validar conexión a internet
  const checkNetworkConnection = async () => {
    try {
      const netInfo = await NetInfo.fetch();
      return netInfo.isConnected;
    } catch (error) {
      console.error('Error verificando conexión de red:', error);
      return false;
    }
  };

  // Función para mostrar loading con timeout
  const showLoadingWithTimeout = (timeout = 10000) => {
    setLoading(true);
    
    setTimeout(() => {
      setLoading(false);
    }, timeout);
  };

  // Función para manejar operaciones asíncronas con loading
  const withLoading = async (asyncOperation, showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      
      const result = await asyncOperation();
      
      if (showLoading) {
        setLoading(false);
      }
      
      return result;
    } catch (error) {
      if (showLoading) {
        setLoading(false);
      }
      
      handleError(error);
      throw error;
    }
  };

  // Función para validar si la app está en modo offline
  const isOffline = () => {
    return state.networkStatus === 'offline';
  };

  // Función para obtener configuración específica
  const getConfig = (key) => {
    return state.appConfig[key];
  };

  // Función para verificar si las notificaciones están habilitadas
  const areNotificationsEnabled = () => {
    return state.notifications.enabled;
  };

  const value = {
    ...state,
    setLoading,
    setError,
    clearError,
    setTheme,
    setLanguage,
    updateNotifications,
    updateAppConfig,
    resetAppState,
    handleError,
    checkNetworkConnection,
    showLoadingWithTimeout,
    withLoading,
    isOffline,
    getConfig,
    areNotificationsEnabled,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

