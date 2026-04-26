import React, { useState, useEffect } from 'react';
import { AppointmentProvider } from './AppointmentContext';
import { TestAppointmentProvider } from './TestAppointmentContext';
import { testAuthService } from '../services/testAuthService';

interface AppointmentProviderWrapperProps {
  children: React.ReactNode;
}

export const AppointmentProviderWrapper: React.FC<AppointmentProviderWrapperProps> = ({ children }) => {
  const [useTestProvider, setUseTestProvider] = useState(true); // Por defecto usar test
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        // Verificar si hay autenticación real
        const isAuthenticated = testAuthService.isAuthenticated();
        
        if (isAuthenticated) {
          console.log('✅ Usuario autenticado, usando AppointmentProvider normal');
          setUseTestProvider(false);
        } else {
          console.log('⚠️ No hay autenticación, usando TestAppointmentProvider');
          setUseTestProvider(true);
        }
      } catch (error) {
        console.error('❌ Error verificando autenticación:', error);
        console.log('⚠️ Usando TestAppointmentProvider por defecto');
        setUseTestProvider(true);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  if (isLoading) {
    // Mostrar loading mientras se verifica la autenticación
    return (
      <TestAppointmentProvider>
        {children}
      </TestAppointmentProvider>
    );
  }

  // Usar el provider apropiado según el estado de autenticación
  if (useTestProvider) {
    return (
      <TestAppointmentProvider>
        {children}
      </TestAppointmentProvider>
    );
  }

  return (
    <AppointmentProvider>
      {children}
    </AppointmentProvider>
  );
};

export default AppointmentProviderWrapper;
