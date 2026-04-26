import React from 'react';
import { AppointmentProviderWrapper } from './AppointmentProviderWrapper';
import { AuthProvider } from './AuthContext';
import { AvailabilityProvider } from './AvailabilityContext';
import { CalendarProvider } from './CalendarContext';
import { MedicalAuthorizationProvider } from './MedicalAuthorizationContext';
import { MedicalHistoryProvider } from './MedicalHistoryContext';
import { NewAppointmentProvider } from './NewAppointmentContext';
import { NotificationProvider } from './NotificationContext';
import { NotificationSettingsProvider } from './NotificationSettingsContext';
import { DepositPaymentHost } from '../components/DepositPaymentHost';
import { ReservaConSenaProvider } from './ReservaConSenaContext';
import { ReviewProvider } from './ReviewContext';
import { UserProfileProvider } from './UserProfileContext';

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <AuthProvider>
      <AvailabilityProvider>
        <AppointmentProviderWrapper>
          <CalendarProvider>
            <UserProfileProvider>
            <NotificationProvider>
              <MedicalAuthorizationProvider>
                <MedicalHistoryProvider>
                  <ReviewProvider>
                    <ReservaConSenaProvider>
                      <DepositPaymentHost />
                      <NewAppointmentProvider>
                        <NotificationSettingsProvider>
                          {children}
                        </NotificationSettingsProvider>
                      </NewAppointmentProvider>
                    </ReservaConSenaProvider>
                  </ReviewProvider>
                </MedicalHistoryProvider>
              </MedicalAuthorizationProvider>
            </NotificationProvider>
            </UserProfileProvider>
          </CalendarProvider>
        </AppointmentProviderWrapper>
      </AvailabilityProvider>
    </AuthProvider>
  );
}
