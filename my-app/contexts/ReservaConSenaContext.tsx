import React, { createContext, useContext, useState, ReactNode } from 'react';

// Tipo para el contexto de reserva con seña
interface ReservaConSenaContextType {
  shouldOpenReservaConSenaModal: boolean;
  appointmentData?: any; // Datos de la cita para pre-llenar el formulario
  openReservaConSenaModal: (appointmentData?: any) => void;
  closeReservaConSenaModal: () => void;
}

// Crear el contexto
const ReservaConSenaContext = createContext<ReservaConSenaContextType | undefined>(undefined);

// Hook personalizado para usar el contexto
export const useReservaConSena = () => {
  const context = useContext(ReservaConSenaContext);
  if (context === undefined) {
    throw new Error('useReservaConSena debe ser usado dentro de un ReservaConSenaProvider');
  }
  console.log('🎯 Hook - useReservaConSena retornando:', context.shouldOpenReservaConSenaModal);
  return context;
};

// Proveedor del contexto
interface ReservaConSenaProviderProps {
  children: ReactNode;
}

export const ReservaConSenaProvider: React.FC<ReservaConSenaProviderProps> = ({ children }) => {
  const [shouldOpenReservaConSenaModal, setShouldOpenReservaConSenaModal] = useState(false);
  const [appointmentData, setAppointmentData] = useState<any>(null);

  const openReservaConSenaModal = (data?: any) => {
    console.log('🎯 Contexto - openReservaConSenaModal llamado');
    console.log('🎯 Contexto - Estado anterior:', shouldOpenReservaConSenaModal);
    if (data) {
      setAppointmentData(data);
    }
    setShouldOpenReservaConSenaModal(true);
    console.log('🎯 Contexto - Estado después de setState:', true);
  };

  const closeReservaConSenaModal = () => {
    setShouldOpenReservaConSenaModal(false);
    setAppointmentData(null); // Limpiar datos al cerrar
  };

  const value: ReservaConSenaContextType = {
    shouldOpenReservaConSenaModal,
    appointmentData,
    openReservaConSenaModal,
    closeReservaConSenaModal,
  };

  console.log('🎯 Contexto - Renderizando provider con estado:', shouldOpenReservaConSenaModal);

  return (
    <ReservaConSenaContext.Provider value={value}>
      {children}
    </ReservaConSenaContext.Provider>
  );
};
