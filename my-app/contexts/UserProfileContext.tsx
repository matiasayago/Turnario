// @ts-nocheck ? beta
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { Appointment } from '../services/appointmentService';
import { User } from '../services/authService';
import { profileService } from '../services/profileService';
import { simpleAuthService } from '../services/simpleAuthService';
import { useAppointments } from './AppointmentContext';
import { useAuth } from './AuthContext';
import { ProfessionalAvailability, useAvailability } from './AvailabilityContext';

// Tipos para el perfil completo del usuario
export interface UserProfile {
  user: User;
  availability?: ProfessionalAvailability;
  appointments: Appointment[];
  stats: {
    totalAppointments: number;
    upcomingAppointments: number;
    completedAppointments: number;
    cancelledAppointments: number;
  };
  isLoading: boolean;
  lastUpdated: string;
}

// Tipos para el contexto
interface UserProfileContextType {
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => void;
  clearProfile: () => void;
}

// Crear el contexto
const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined);

// Hook para usar el contexto
export const useUserProfile = (): UserProfileContextType => {
  const context = useContext(UserProfileContext);
  if (!context) {
    throw new Error('useUserProfile debe ser usado dentro de un UserProfileProvider');
  }
  return context;
};

// Props del provider
interface UserProfileProviderProps {
  children: ReactNode;
}

// Provider del contexto
export const UserProfileProvider: React.FC<UserProfileProviderProps> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const availabilityContext = useAvailability();
  const appointmentContext = useAppointments();

  const appointments = appointmentContext?.appointments || [];
  const loadAppointments = appointmentContext?.loadAppointments;
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar perfil completo cuando el usuario se autentica
  useEffect(() => {
    if (isAuthenticated && user) {
      console.log('?? Usuario autenticado, cargando perfil completo...');
      loadCompleteProfile();
    } else {
      console.log('?? Usuario no autenticado, limpiando perfil...');
      clearProfile();
    }
  }, [isAuthenticated, user]);

  // Cargar perfil completo del usuario
  const loadCompleteProfile = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);
      console.log('?? Cargando perfil completo para:', user.email);

      let userForProfile: User = user;
      try {
        const token = await simpleAuthService.getToken();
        if (token) {
          const fromDb = await profileService.fetchProfileMe(token, { mergeBase: user });
          userForProfile = { ...user, ...fromDb };
        }
      } catch (e) {
        console.warn('UserProfile: no se pudo hidratar perfil desde API:', e);
      }

      // 1. Cargar disponibilidad si es profesional
      let availability: ProfessionalAvailability | undefined;
      if (userForProfile.userType === 'professional') {
        console.log('????? Cargando disponibilidad del profesional...');
        try {
          const { getAvailabilityByProfessional, syncWithBackend, createAvailabilityForUser } = availabilityContext;
          
          // Intentar sincronizar con backend primero
          const syncedAvailability = await syncWithBackend(userForProfile._id || userForProfile.id);
          if (syncedAvailability) {
            availability = syncedAvailability;
            console.log('? Disponibilidad sincronizada desde backend');
          } else {
            // Fallback: buscar localmente
            availability = getAvailabilityByProfessional(userForProfile._id || userForProfile.id);
            console.log('?? Disponibilidad cargada localmente');
            
            // Si no existe localmente, crear una nueva
            if (!availability) {
              console.log('? Creando disponibilidad de prueba para profesional...');
              availability = await createAvailabilityForUser(
                userForProfile._id || userForProfile.id,
                userForProfile.fullName || userForProfile.email
              );
              console.log('? Disponibilidad de prueba creada');
            }
          }
        } catch (error) {
          console.warn('?? Error cargando disponibilidad, creando datos de prueba:', error);
          // En caso de error, crear datos de prueba
          try {
            const { createAvailabilityForUser } = availabilityContext;
            availability = await createAvailabilityForUser(
              userForProfile._id || userForProfile.id,
              userForProfile.fullName || userForProfile.email
            );
            console.log('? Disponibilidad de prueba creada como fallback');
          } catch (createError) {
            console.error('? Error creando disponibilidad de prueba:', createError);
          }
        }
      }

      // 2. Cargar citas del usuario
      console.log('?? Cargando citas del usuario...');
      try {
        if (loadAppointments && typeof loadAppointments === 'function') {
          await loadAppointments();
          console.log('? Citas cargadas:', appointments.length);
        } else {
          console.warn('?? loadAppointments no est? disponible, usando citas existentes');
        }
      } catch (error) {
        console.warn('?? Error cargando citas, continuando sin ellas:', error);
      }

      // 3. Calcular estad?sticas
      const stats = calculateUserStats(appointments, userForProfile);

      // 4. Crear perfil completo
      const completeProfile: UserProfile = {
        user: userForProfile,
        availability,
        appointments,
        stats,
        isLoading: false,
        lastUpdated: new Date().toISOString(),
      };

      setProfile(completeProfile);
      console.log('? Perfil completo cargado:', {
        user: user.email,
        hasAvailability: !!availability,
        appointmentsCount: appointments.length,
        stats,
      });

    } catch (error) {
      console.error('? Error cargando perfil completo:', error);
      setError(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  };

  // Calcular estad?sticas del usuario
  const calculateUserStats = (userAppointments: Appointment[], userData: User) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const stats = {
      totalAppointments: userAppointments.length,
      upcomingAppointments: 0,
      completedAppointments: 0,
      cancelledAppointments: 0,
    };

    userAppointments.forEach(appointment => {
      const appointmentDate = new Date(appointment.date);
      const isUpcoming = appointmentDate >= today && 
                        (appointment.status === 'confirmed' || appointment.status === 'pending');
      const isCompleted = appointment.status === 'completed';
      const isCancelled = appointment.status === 'cancelled';

      if (isUpcoming) stats.upcomingAppointments++;
      if (isCompleted) stats.completedAppointments++;
      if (isCancelled) stats.cancelledAppointments++;
    });

    return stats;
  };

  // Actualizar perfil
  const updateProfile = (updates: Partial<UserProfile>) => {
    if (profile) {
      setProfile({
        ...profile,
        ...updates,
        lastUpdated: new Date().toISOString(),
      });
    }
  };

  // Refrescar perfil
  const refreshProfile = async () => {
    if (user) {
      await loadCompleteProfile();
    }
  };

  // Limpiar perfil
  const clearProfile = () => {
    setProfile(null);
    setError(null);
    console.log('?? Perfil limpiado');
  };

  // Valor del contexto
  const contextValue: UserProfileContextType = {
    profile,
    isLoading,
    error,
    refreshProfile,
    updateProfile,
    clearProfile,
  };

  return (
    <UserProfileContext.Provider value={contextValue}>
      {children}
    </UserProfileContext.Provider>
  );
};

export default UserProfileContext;
