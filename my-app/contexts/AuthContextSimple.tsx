import React, { createContext, useContext, useState, ReactNode } from 'react';

// Tipos simplificados
interface User {
  _id: string;
  fullName: string;
  email: string;
  phone?: string;
  userType: 'client' | 'professional' | 'admin';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  loginWithGoogle: () => Promise<boolean>;
  loginWithApple: () => Promise<boolean>;
  register: (userData: any) => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfile: (userData: Partial<User>) => Promise<void>;
  toggleUserType: () => Promise<void>;
  refreshToken: () => Promise<void>;
  isUserType: (userType: 'client' | 'professional' | 'admin') => boolean;
  isClient: () => boolean;
  isProfessional: () => boolean;
  isAdmin: () => boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const login = async (credentials: LoginCredentials): Promise<void> => {
    setIsLoading(true);
    try {
      // Simular login exitoso
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockUser: User = {
        _id: 'mock_user_id',
        fullName: 'Usuario Demo',
        email: credentials.email,
        userType: 'client',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      setUser(mockUser);
    } catch (error) {
      console.error('Error en login:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async (): Promise<boolean> => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockUser: User = {
        _id: 'google_user_id',
        fullName: 'Usuario Google',
        email: 'usuario@google.com',
        userType: 'client',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      setUser(mockUser);
      return true;
    } catch (error) {
      console.error('Error en login con Google:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithApple = async (): Promise<boolean> => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockUser: User = {
        _id: 'apple_user_id',
        fullName: 'Usuario Apple',
        email: 'usuario@apple.com',
        userType: 'client',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      setUser(mockUser);
      return true;
    } catch (error) {
      console.error('Error en login con Apple:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: any): Promise<void> => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockUser: User = {
        _id: 'new_user_id',
        fullName: userData.fullName,
        email: userData.email,
        userType: userData.userType || 'client',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      setUser(mockUser);
    } catch (error) {
      console.error('Error en registro:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      setUser(null);
    } catch (error) {
      console.error('Error en logout:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateUserProfile = async (userData: Partial<User>): Promise<void> => {
    if (user) {
      setUser({ ...user, ...userData });
    }
  };

  const toggleUserType = async (): Promise<void> => {
    if (user) {
      const newUserType = user.userType === 'client' ? 'professional' : 'client';
      setUser({ ...user, userType: newUserType });
    }
  };

  const refreshToken = async (): Promise<void> => {
    // Simular refresh token
    await new Promise(resolve => setTimeout(resolve, 500));
  };

  const isUserType = (userType: 'client' | 'professional' | 'admin'): boolean => {
    return user?.userType === userType;
  };

  const isClient = (): boolean => {
    return user?.userType === 'client';
  };

  const isProfessional = (): boolean => {
    return user?.userType === 'professional';
  };

  const isAdmin = (): boolean => {
    return user?.userType === 'admin';
  };

  const value: AuthContextType = {
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
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};