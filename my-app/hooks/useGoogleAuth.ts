import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { initializeGoogleSignIn, getGoogleUserInfo } from '../config/googleAuth';

interface GoogleUser {
  id: string;
  email: string;
  fullName: string;
  firstName: string;
  lastName: string;
  picture: string;
  locale: string;
}

interface UseGoogleAuthReturn {
  isInitialized: boolean;
  isSigningIn: boolean;
  signIn: () => Promise<GoogleUser | null>;
  signOut: () => Promise<void>;
  getCurrentUser: () => GoogleUser | null;
}

export const useGoogleAuth = (): UseGoogleAuthReturn => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<GoogleUser | null>(null);

  useEffect(() => {
    initializeGoogleSignIn().then(() => {
      setIsInitialized(true);
    });
  }, []);

  const signIn = async (): Promise<GoogleUser | null> => {
    if (!isInitialized) {
      console.warn('⚠️ Google Sign-In no está inicializado');
      return null;
    }

    setIsSigningIn(true);
    
    try {
      // Simulación del proceso de login con Google
      console.log('🔐 Iniciando login con Google...');
      
      // Simular delay de autenticación
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simular usuario de Google (en producción esto vendría de la API real)
      const mockGoogleUser: GoogleUser = {
        id: `google_${Date.now()}`,
        email: 'usuario.ejemplo@gmail.com',
        fullName: 'Usuario Ejemplo',
        firstName: 'Usuario',
        lastName: 'Ejemplo',
        picture: 'https://via.placeholder.com/150',
        locale: 'es'
      };
      
      setCurrentUser(mockGoogleUser);
      console.log('✅ Login con Google exitoso:', mockGoogleUser);
      
      return mockGoogleUser;
      
    } catch (error) {
      console.error('❌ Error en login con Google:', error);
      return null;
    } finally {
      setIsSigningIn(false);
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      // Simular logout
      console.log('🚪 Cerrando sesión de Google...');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setCurrentUser(null);
      console.log('✅ Sesión de Google cerrada');
      
    } catch (error) {
      console.error('❌ Error cerrando sesión de Google:', error);
    }
  };

  const getCurrentUser = (): GoogleUser | null => {
    return currentUser;
  };

  return {
    isInitialized,
    isSigningIn,
    signIn,
    signOut,
    getCurrentUser
  };
};

export default useGoogleAuth;

