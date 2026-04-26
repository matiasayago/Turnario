// @ts-nocheck � beta
import React, { ReactNode, createContext, useContext, useEffect, useState } from 'react';
import { LoginCredentials, RegisterData, User, authService } from '../services/authService';

// Tipos para el contexto
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  loginWithGoogle: () => Promise<boolean>;
  loginWithApple: () => Promise<boolean>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfile: (userData: Partial<User>) => Promise<void>;
  toggleUserType: () => Promise<void>;
  refreshToken: () => Promise<void>;
  isUserType: (userType: 'client' | 'professional' | 'admin') => boolean;
  isClient: () => boolean;
  isProfessional: () => boolean;
  isAdmin: () => boolean;
}

// Crear el contexto
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Hook para usar el contexto
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    // En lugar de lanzar un error, retornar un contexto por defecto
    console.warn('useAuth está siendo usado fuera de un AuthProvider, usando valores por defecto');
    return {
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: async () => {},
      loginWithGoogle: async () => false,
      loginWithApple: async () => false,
      register: async () => {},
      logout: async () => {},
      updateUserProfile: async () => {},
      toggleUserType: async () => {},
      refreshToken: async () => {},
      isUserType: () => false,
      isClient: () => false,
      isProfessional: () => false,
      isAdmin: () => false,
    };
  }
  return context;
};

// Props del provider
interface AuthProviderProps {
  children: ReactNode;
}

// Provider del contexto
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Inicializar el servicio de autenticación
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        await authService.initialize();
        const currentUser = authService.getUser();
        setUser(currentUser);
      } catch (error) {
        console.error('Error inicializando autenticación:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Función de login
  const login = async (credentials: LoginCredentials): Promise<void> => {
    try {
      setIsLoading(true);
      await authService.login(credentials);
      const loggedUser = authService.getUser();
      setUser(loggedUser);
    } catch (error) {
      console.error('Error en login:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Login con Google
  const loginWithGoogle = async (): Promise<boolean> => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const googleUser: User = {
      _id: 'google_user',
      email: 'usuario.google@gmail.com',
      fullName: 'Usuario Google',
      userType: 'client',
      phone: '+54 11 9876-5432',
      service: 'Medicina General',
      isActive: true,
      isEmailVerified: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    setUser(googleUser);
    return true;
  };

  // Login con Apple
  const loginWithApple = async (): Promise<boolean> => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const appleUser: User = {
      _id: 'apple_user',
      email: 'usuario.apple@icloud.com',
      fullName: 'Usuario Apple',
      userType: 'client',
      phone: '+54 11 9876-5432',
      service: 'Medicina General',
      isActive: true,
      isEmailVerified: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    setUser(appleUser);
    return true;
  };

  // Registro
  const register = async (userData: RegisterData): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const newUser: User = {
      _id: `user_${Date.now()}`,
      email: userData.email,
      fullName: userData.fullName,
      userType: userData.userType || 'client',
      phone: userData.phone || '+54 11 9876-5432',
      service: userData.service || 'Medicina General',
      isActive: true,
      isEmailVerified: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    setUser(newUser);
  };

  // Cerrar sesión
  const logout = async (): Promise<void> => {
    try {
      setIsLoading(true);
      await authService.logout();
      setUser(null);
    } catch (error) {
      console.error('Error en logout:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Actualizar perfil de usuario
  const updateUserProfile = async (userData: Partial<User>): Promise<void> => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
    }
  };

  // Cambiar tipo de usuario
  const toggleUserType = async (): Promise<void> => {
    if (user) {
      const newUserType = user.userType === 'professional' ? 'client' : 'professional';
      const updatedUser = { ...user, userType: newUserType };
      setUser(updatedUser);
    }
  };

  // Refrescar token
  const refreshToken = async (): Promise<void> => {
    // No hacer nada
  };

  // Verificar tipo de usuario
  const isUserType = (userType: 'client' | 'professional' | 'admin'): boolean => {
    return user?.userType === userType;
  };

  const isClient = (): boolean => isUserType('client');
  const isProfessional = (): boolean => isUserType('professional');
  const isAdmin = (): boolean => isUserType('admin');

  const contextValue: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    loginWithGoogle,
    loginWithApple,
    register,
    logout,
    updateUserProfile,
    toggleUserType,
    refreshToken,
    isUserType,
    isClient,
    isProfessional,
    isAdmin,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};
