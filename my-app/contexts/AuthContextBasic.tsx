// @ts-nocheck � beta
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { User, LoginCredentials, RegisterData } from '../services/authService';

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
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
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
  const [isLoading, setIsLoading] = useState(false);

  // Función de login
  const login = async (credentials: LoginCredentials): Promise<void> => {
    console.log('🔐 Login con:', credentials.email);
    
    // Simular delay de red
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Crear usuario basado en las credenciales
    const loginUser: User = {
      _id: 'logged_user',
      email: credentials.email,
      fullName: credentials.email.includes('profesional') ? 'Dr. Ana Martínez' : 'Usuario Cliente',
      userType: credentials.email.includes('profesional') ? 'professional' : 'client',
      phone: '+54 11 9876-5432',
      service: 'Medicina General',
      isActive: true,
      isEmailVerified: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    console.log('✅ Login exitoso:', loginUser);
    setUser(loginUser);
  };

  // Login con Google
  const loginWithGoogle = async (): Promise<boolean> => {
    console.log('🔐 Login con Google');
    
    // Simular delay de red
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Crear usuario de Google
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
    
    console.log('✅ Login con Google exitoso:', googleUser);
    setUser(googleUser);
    return true;
  };

  // Login con Apple
  const loginWithApple = async (): Promise<boolean> => {
    console.log('🔐 Login con Apple');
    
    // Simular delay de red
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Crear usuario de Apple
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
    
    console.log('✅ Login con Apple exitoso:', appleUser);
    setUser(appleUser);
    return true;
  };

  // Registro
  const register = async (userData: RegisterData): Promise<void> => {
    console.log('📝 Registro con:', userData.email);
    
    // Simular delay de red
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Crear usuario basado en los datos de registro
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
    
    console.log('✅ Registro exitoso:', newUser);
    setUser(newUser);
  };

  // Cerrar sesión
  const logout = async (): Promise<void> => {
    console.log('🚪 Logout');
    setUser(null);
  };

  // Refrescar token
  const refreshToken = async (): Promise<void> => {
    console.log('🔄 Refrescar token');
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
