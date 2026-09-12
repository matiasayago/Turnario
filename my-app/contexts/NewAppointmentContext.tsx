import React, { createContext, useContext, useState, ReactNode } from 'react';

interface NewAppointmentContextType {
  shouldOpenNewAppointmentModal: boolean;
  openNewAppointmentModal: () => void;
  closeNewAppointmentModal: () => void;
  /** Cliente: abrir el formulario de Reservar Cita de la pestaña Hoy */
  shouldOpenHoyBookingForm: boolean;
  openHoyBookingForm: () => void;
  closeHoyBookingForm: () => void;
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
  const [shouldOpenHoyBookingForm, setShouldOpenHoyBookingForm] = useState(false);

  const openNewAppointmentModal = () => {
    setShouldOpenNewAppointmentModal(true);
  };

  const closeNewAppointmentModal = () => {
    setShouldOpenNewAppointmentModal(false);
  };

  const openHoyBookingForm = () => {
    setShouldOpenHoyBookingForm(true);
  };

  const closeHoyBookingForm = () => {
    setShouldOpenHoyBookingForm(false);
  };

  return (
    <NewAppointmentContext.Provider
      value={{
        shouldOpenNewAppointmentModal,
        openNewAppointmentModal,
        closeNewAppointmentModal,
        shouldOpenHoyBookingForm,
        openHoyBookingForm,
        closeHoyBookingForm,
      }}
    >
      {children}
    </NewAppointmentContext.Provider>
  );
};

