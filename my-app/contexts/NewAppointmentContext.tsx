import React, { createContext, useContext, useState, ReactNode } from 'react';

interface NewAppointmentContextType {
  shouldOpenNewAppointmentModal: boolean;
  openNewAppointmentModal: () => void;
  closeNewAppointmentModal: () => void;
}

const NewAppointmentContext = createContext<NewAppointmentContextType | undefined>(undefined);

export const useNewAppointment = () => {
  const context = useContext(NewAppointmentContext);
  if (context === undefined) {
    throw new Error('useNewAppointment must be used within a NewAppointmentProvider');
  }
  return context;
};

interface NewAppointmentProviderProps {
  children: ReactNode;
}

export const NewAppointmentProvider: React.FC<NewAppointmentProviderProps> = ({ children }) => {
  const [shouldOpenNewAppointmentModal, setShouldOpenNewAppointmentModal] = useState(false);

  const openNewAppointmentModal = () => {
    console.log('🎯 NewAppointmentContext: openNewAppointmentModal() ejecutado');
    console.log('🎯 NewAppointmentContext: Cambiando shouldOpenNewAppointmentModal a true');
    setShouldOpenNewAppointmentModal(true);
    console.log('🎯 NewAppointmentContext: shouldOpenNewAppointmentModal configurado a true');
  };

  const closeNewAppointmentModal = () => {
    console.log('🎯 NewAppointmentContext: closeNewAppointmentModal() ejecutado');
    setShouldOpenNewAppointmentModal(false);
  };

  return (
    <NewAppointmentContext.Provider
      value={{
        shouldOpenNewAppointmentModal,
        openNewAppointmentModal,
        closeNewAppointmentModal,
      }}
    >
      {children}
    </NewAppointmentContext.Provider>
  );
};

