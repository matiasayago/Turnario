import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContextSimple';

// Hook seguro que no falla si el contexto no está disponible
export const useSafeAuth = () => {
  const context = useContext(AuthContext);
  
  // Si el contexto no está disponible, devolver valores por defecto
  if (!context) {
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
