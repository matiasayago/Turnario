import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import authService, { User as BackendUser, LoginRequest, RegisterRequest } from '../services/authService';

interface User {
  id: string;
  email: string;
  fullName: string;
  userType: 'client' | 'professional';
  phone: string;
  service?: string; // Campo opcional para profesionales
}

// Función para convertir usuario del backend al formato del frontend
const convertBackendUser = (backendUser: BackendUser): User => ({
  id: backendUser._id,
  email: backendUser.email,
  fullName: backendUser.fullName,
  userType: backendUser.userType === 'admin' ? 'professional' : backendUser.userType,
  phone: backendUser.phone,
  service: backendUser.service,
});

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  loginWithGoogle: () => Promise<boolean>;
  register: (userData: Omit<User, 'id'>) => Promise<boolean>;
  logout: () => Promise<void>;
  toggleUserType: () => void;
  updateUserProfile: (profileData: Partial<User>) => Promise<boolean>;
  loading: boolean;
  checkAuthStatus: () => Promise<void>;
  refreshTokenIfNeeded: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeAuth();
  }, []);

  // Inicializar autenticación al cargar la app
  const initializeAuth = async () => {
    try {
      await checkAuthStatus();
    } catch (error) {
      console.error('Error inicializando autenticación:', error);
    } finally {
      setLoading(false);
    }
  };

  // Verificar token al iniciar la app
  const checkAuthStatus = async () => {
    try {
      const token = await authService.getStoredToken();
      if (token) {
        const isValid = await authService.validateToken();
        if (isValid) {
          const user = await authService.getStoredUser();
          if (user) {
            const frontendUser = convertBackendUser(user);
            setUser(frontendUser);
            console.log('✅ Usuario autenticado restaurado:', frontendUser);
          }
        } else {
          // Token inválido, limpiar datos
          await authService.clearAuthData();
          console.log('❌ Token inválido, sesión limpiada');
        }
      }
    } catch (error) {
      console.error('Error verificando estado de autenticación:', error);
    }
  };

  // Renovar token automáticamente
  const refreshTokenIfNeeded = async () => {
    try {
      const token = await authService.getStoredToken();
      if (token) {
        const newToken = await authService.refreshToken();
        if (newToken) {
          console.log('✅ Token renovado automáticamente');
        }
      }
    } catch (error) {
      console.error('Error renovando token:', error);
    }
  };

  const loginWithGoogle = async (): Promise<boolean> => {
    try {
      setLoading(true);
      
      // Simulación de login con Google (aquí iría la integración real)
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Simular datos del usuario de Google con información más realista
      const googleUser: User = {
        id: `google_${Date.now()}`,
        email: 'usuario.ejemplo@gmail.com',
        fullName: 'Usuario Ejemplo',
        userType: 'client', // Por defecto como cliente
        phone: '+1234567890',
      };
      
      // Guardar en AsyncStorage
      await AsyncStorage.setItem('user_data', JSON.stringify(googleUser));
      setUser(googleUser);
      
      console.log('✅ Login con Google exitoso:', googleUser);
      return true;
      
    } catch (error) {
      console.error('❌ Error durante login con Google:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);
      
      // Intentar login con el backend
      const loginData: LoginRequest = { email, password };
      const response = await authService.login(loginData);
      
      if (response.user && response.token) {
        const frontendUser = convertBackendUser(response.user);
        setUser(frontendUser);
        console.log('✅ Login exitoso con backend:', frontendUser);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Login error:', error);
      
      // Fallback a usuarios predefinidos para testing
      const predefinedUsers: { [key: string]: User } = {
        'cliente@turnario.com': {
          id: 'cliente_001',
          email: 'cliente@turnario.com',
          fullName: 'Juan Pérez',
          userType: 'client',
          phone: '+5491112345678',
        },
        'profesional@turnario.com': {
          id: 'prof_001',
          email: 'profesional@turnario.com',
          fullName: 'Dr. Ana Martínez',
          userType: 'professional',
          phone: '+5491187654321',
          service: 'Psicología Clínica',
        },
        'demo@turnario.com': {
          id: 'demo_001',
          email: 'demo@turnario.com',
          fullName: 'Usuario Demo',
          userType: 'client',
          phone: '+1234567890',
        },
      };
      
      if (predefinedUsers[email]) {
        const user = predefinedUsers[email];
        await AsyncStorage.setItem('user_data', JSON.stringify(user));
        setUser(user);
        console.log('✅ Login con usuario predefinido:', user);
        return true;
      }
      
      return false;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData: Omit<User, 'id'>): Promise<boolean> => {
    try {
      setLoading(true);
      
      // Intentar registro con el backend
      const registerData: RegisterRequest = {
        email: userData.email,
        password: 'password123', // Contraseña temporal
        fullName: userData.fullName,
        userType: userData.userType,
        phone: userData.phone,
        service: userData.service,
      };
      
      const response = await authService.register(registerData);
      
      if (response.user && response.token) {
        const frontendUser = convertBackendUser(response.user);
        setUser(frontendUser);
        console.log('✅ Registro exitoso con backend:', frontendUser);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Register error:', error);
      
      // Fallback a registro local para testing
      const newUser: User = {
        ...userData,
        id: Date.now().toString(),
      };
      
      // Guardar en AsyncStorage
      await AsyncStorage.setItem('user_data', JSON.stringify(newUser));
      setUser(newUser);
      
      return true;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      
      // Logout del backend si hay token
      await authService.logout();
      
      // Limpiar AsyncStorage
      await AsyncStorage.removeItem('user_data');
      setUser(null);
      
      // Redirigir al login
      router.replace('/login');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleUserType = () => {
    if (user) {
      const newUserType = user.userType === 'client' ? 'professional' : 'client';
      const updatedUser = { ...user, userType: newUserType };
      setUser(updatedUser);
      AsyncStorage.setItem('user_data', JSON.stringify(updatedUser));
    }
  };

  const updateUserProfile = async (profileData: Partial<User>): Promise<boolean> => {
    try {
      if (!user) {
        throw new Error('No hay usuario autenticado');
      }

      // Intentar actualizar en el backend
      try {
        const updatedBackendUser = await authService.updateProfile({
          fullName: profileData.fullName,
          phone: profileData.phone,
          service: profileData.service,
        });
        
        const frontendUser = convertBackendUser(updatedBackendUser);
        setUser(frontendUser);
        console.log('✅ Perfil actualizado en backend:', frontendUser);
        return true;
      } catch (backendError) {
        console.error('Error actualizando en backend, usando fallback local:', backendError);
        
        // Fallback a actualización local
        const updatedUser: User = { 
          ...user, 
          ...profileData,
          userType: (profileData.userType as 'client' | 'professional') || user.userType
        };
        await AsyncStorage.setItem('user_data', JSON.stringify(updatedUser));
        setUser(updatedUser);
        console.log('✅ Perfil actualizado localmente:', updatedUser);
        return true;
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      return false;
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    login,
    loginWithGoogle,
    register,
    logout,
    toggleUserType,
    updateUserProfile,
    loading,
    checkAuthStatus,
    refreshTokenIfNeeded,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
