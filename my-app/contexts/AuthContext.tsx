import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { router } from 'expo-router';
import { Alert, AppState, AppStateStatus } from 'react-native';
import { AuthResponse, LoginCredentials, RegisterData, User } from '../services/authService';
import { profileService } from '../services/profileService';
import { registerExpoPushTokenNow } from '../services/pushTokenRegistration';
import { simpleAuthService } from '../services/simpleAuthService';
import { simpleConnectionService } from '../services/simpleConnectionService';
import { isProfessionalUser } from '../utils/userType';

// Tipos para el contexto
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  /** Tras login social exitoso (token ya guardado en AsyncStorage por simpleAuthService). */
  applyAuthResponse: (response: AuthResponse) => void;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  updateUserProfile: (profileData: Partial<User>) => Promise<boolean>;
  isUserType: (userType: 'client' | 'professional' | 'admin') => boolean;
  isClient: () => boolean;
  isProfessional: () => boolean;
  isAdmin: () => boolean;
  /** Cliente/admin: siempre true. Profesional: según suscripción en servidor. */
  hasProAccess: () => boolean;
  /** Recarga perfil desde GET /api/users/profile/me y actualiza estado local. */
  refreshUserFromBackend: () => Promise<void>;
  markUserActivity: () => void;
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

const parsePositiveNumber = (rawValue: string | undefined, fallback: number): number => {
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
};

// Provider del contexto
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const autoLogoutMinutes = parsePositiveNumber(
    process.env.EXPO_PUBLIC_AUTO_LOGOUT_MINUTES,
    20
  );
  const warningSeconds = parsePositiveNumber(
    process.env.EXPO_PUBLIC_AUTO_LOGOUT_WARNING_SECONDS,
    30
  );
  const inactivityMs = Math.max(1, autoLogoutMinutes) * 60 * 1000;
  const warningMs = Math.max(5, warningSeconds) * 1000;
  const lastActivityRef = useRef<number>(Date.now());
  const backgroundAtRef = useRef<number | null>(null);
  const autoLogoutRunningRef = useRef(false);
  const warningShownRef = useRef(false);
  const warningHandlingRef = useRef(false);

  const markUserActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    warningShownRef.current = false;
  }, []);

  const performAutoLogout = useCallback(async () => {
    if (autoLogoutRunningRef.current) return;
    autoLogoutRunningRef.current = true;
    try {
      await simpleAuthService.logout();
      setUser(null);
      try {
        router.replace('/login');
      } catch {
        /* router puede no estar listo en arranque muy temprano */
      }
      Alert.alert(
        'Sesión finalizada',
        `Por seguridad, cerramos tu sesión tras ${autoLogoutMinutes} min de inactividad.`
      );
    } finally {
      autoLogoutRunningRef.current = false;
    }
  }, [autoLogoutMinutes]);

  // Inicializar el servicio de autenticación
  useEffect(() => {
    console.log('🔄 useEffect del AuthContext ejecutándose...');
    const initializeAuth = async () => {
      try {
        console.log('🚀 Iniciando AuthContext...');
        setIsLoading(true);
        
        // Verificar conexión primero
        console.log('🔗 Verificando conexión...');
        try {
          await simpleConnectionService.checkConnection();
          console.log('✅ Conexión verificada');
        } catch (error) {
          console.log('⚠️ Error de conexión, continuando en modo offline:', error);
        }
        
        // Inicializar servicio de autenticación
        console.log('🔧 Inicializando servicio de autenticación...');
        await simpleAuthService.initialize();
        
        // Verificar si hay un usuario guardado en AsyncStorage
        console.log('🔍 Verificando usuario guardado...');
        try {
          const savedUser = await simpleAuthService.getCurrentUser();
          const token = await simpleAuthService.getToken();
          // Exigir JWT: sin token no hay sesión válida (evita "usuario" en contexto sin poder llamar al API ni registrar push).
          if (savedUser && token) {
            console.log('✅ Usuario encontrado en AsyncStorage:', savedUser.fullName, savedUser.userType);
            console.log('📱 Datos completos del usuario:', JSON.stringify(savedUser, null, 2));
            setUser(savedUser);
            markUserActivity();
            void registerExpoPushTokenNow();
            simpleAuthService.refreshUserFromBackend().then((fresh) => {
              if (fresh) setUser(fresh);
            });
          } else if (savedUser && !token) {
            console.log(
              'ℹ️ Hay perfil guardado pero no hay token (sesión cerrada o expirada). Iniciá sesión de nuevo.'
            );
          } else {
            console.log('ℹ️ No hay usuario guardado, mostrando pantalla de login');
          }
        } catch (error) {
          console.error('❌ Error verificando usuario guardado:', error);
        }
        
        console.log('✅ Autenticación inicializada correctamente');
        console.log('🔍 Estado final del usuario:', user);
      } catch (error) {
        console.error('Error inicializando autenticación:', error);
        // En caso de error, continuar con modo offline
        console.log('📱 Continuando en modo offline');
      } finally {
        setIsLoading(false);
        console.log('🏁 AuthContext terminado, isLoading:', false);
      }
    };

    initializeAuth();
  }, []);

  useEffect(() => {
    const onAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'background' || nextState === 'inactive') {
        if (user) {
          backgroundAtRef.current = Date.now();
        }
        return;
      }
      if (nextState === 'active') {
        if (!user) {
          backgroundAtRef.current = null;
          return;
        }
        const now = Date.now();
        if (backgroundAtRef.current != null) {
          const awayFor = now - backgroundAtRef.current;
          if (awayFor >= inactivityMs) {
            backgroundAtRef.current = null;
            void performAutoLogout();
            return;
          }
        }
        const idleFor = now - lastActivityRef.current;
        if (idleFor >= inactivityMs) {
          backgroundAtRef.current = null;
          void performAutoLogout();
          return;
        }
        backgroundAtRef.current = null;
        markUserActivity();
      }
    };

    const sub = AppState.addEventListener('change', onAppStateChange);
    return () => sub.remove();
  }, [inactivityMs, markUserActivity, performAutoLogout, user]);

  useEffect(() => {
    const id = setInterval(() => {
      if (!user) return;
      const idleForMs = Date.now() - lastActivityRef.current;
      const remainingMs = inactivityMs - idleForMs;

      // Aviso previo estilo banca: permitir extender sesión explícitamente.
      if (
        remainingMs > 0 &&
        remainingMs <= warningMs &&
        !warningShownRef.current &&
        !warningHandlingRef.current
      ) {
        warningShownRef.current = true;
        warningHandlingRef.current = true;
        Alert.alert(
          'Tu sesión está por vencer',
          `Por seguridad, tu sesión se cerrará en menos de ${Math.ceil(
            warningMs / 1000
          )} segundos por inactividad.`,
          [
            {
              text: 'Cerrar sesión ahora',
              style: 'destructive',
              onPress: () => {
                warningHandlingRef.current = false;
                void performAutoLogout();
              },
            },
            {
              text: 'Seguir conectado',
              onPress: () => {
                markUserActivity();
                warningHandlingRef.current = false;
              },
            },
          ],
          { cancelable: false }
        );
      }

      if (idleForMs >= inactivityMs) {
        void performAutoLogout();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [inactivityMs, markUserActivity, performAutoLogout, user, warningMs]);

  // Función de login
  const login = async (credentials: LoginCredentials): Promise<void> => {
    try {
      // No usar isLoading global: AuthGuard ocultaría toda la pantalla de login.
      console.log('🔐 Iniciando proceso de login...');
      const response = await simpleAuthService.login(credentials);
      console.log('✅ Login exitoso, usuario:', response.user.email);
      setUser(response.user);
      markUserActivity();
      void registerExpoPushTokenNow();
      console.log('👤 Usuario establecido en contexto, disparando carga de perfil...');
    } catch (error) {
      console.error('❌ Error en login:', error);
      throw error;
    }
  };

  const applyAuthResponse = (response: AuthResponse): void => {
    setUser(response.user);
    markUserActivity();
    void registerExpoPushTokenNow();
  };

  // Función de registro
  const register = async (userData: RegisterData): Promise<void> => {
    try {
      console.log('📝 Iniciando proceso de registro...');
      const response = await simpleAuthService.register(userData);
      console.log('✅ Registro exitoso, usuario:', response.user.email);
      setUser(response.user);
      markUserActivity();
      void registerExpoPushTokenNow();
      console.log('👤 Usuario establecido en contexto, disparando carga de perfil...');
    } catch (error) {
      console.error('❌ Error en registro:', error);
      throw error;
    }
  };

  // Función de logout
  const logout = async (): Promise<void> => {
    try {
      console.log('🚪 Iniciando logout...');
      await simpleAuthService.logout();
      console.log('🗑️ Datos de usuario eliminados del servicio');
      setUser(null);
      warningShownRef.current = false;
      warningHandlingRef.current = false;
      lastActivityRef.current = Date.now();
      try {
        router.replace('/login');
      } catch {
        // no-op: router puede no estar listo en edge cases
      }
      console.log('✅ Usuario establecido como null, isAuthenticated debería ser false');
    } catch (error) {
      console.error('💥 Error en logout:', error);
      setUser(null);
      warningShownRef.current = false;
      warningHandlingRef.current = false;
      lastActivityRef.current = Date.now();
      try {
        router.replace('/login');
      } catch {
        // no-op
      }
      console.log('✅ Usuario establecido como null después del error');
    }
  };

  // Función para actualizar el perfil del usuario
  const updateUserProfile = async (profileData: Partial<User>): Promise<boolean> => {
    console.log('📝 Actualizando perfil del usuario...', profileData);

    if (!user) {
      console.log('❌ No hay usuario autenticado');
      return false;
    }

    const previousUser = user;
    const updatedUser = { ...user, ...profileData, updatedAt: new Date().toISOString() };
    setUser(updatedUser);
    await simpleAuthService.updateUser(updatedUser);

    try {
      const token = await simpleAuthService.getToken();
      if (token) {
        console.log('🌐 Sincronizando perfil con el backend...');
        const backendUser = await profileService.updateProfile(profileData, token);
        let finalUser: User = { ...updatedUser, ...backendUser };
        try {
          const hydrated = await profileService.fetchProfileMe(token, { mergeBase: updatedUser });
          finalUser = { ...updatedUser, ...hydrated };
        } catch (hydrateErr) {
          console.warn('No se pudo rehidratar con GET /profile/me tras PUT:', hydrateErr);
          if (profileData.businessInfo && typeof profileData.businessInfo === 'object') {
            finalUser = {
              ...finalUser,
              businessInfo: {
                ...(updatedUser.businessInfo || {}),
                ...(backendUser.businessInfo || {}),
                ...profileData.businessInfo,
              },
            };
          }
          if (profileData.profileBio !== undefined) {
            finalUser.profileBio = backendUser.profileBio ?? profileData.profileBio;
          }
          if (profileData.address && typeof profileData.address === 'object') {
            finalUser.address = {
              ...(updatedUser.address || {}),
              ...(backendUser.address || {}),
              ...profileData.address,
            };
          }
        }
        setUser(finalUser);
        await simpleAuthService.updateUser(finalUser);
        console.log('✅ Perfil actualizado en el backend');
      } else {
        console.log('⚠️ Sin token: solo actualización local');
      }
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('❌ Error al actualizar perfil en el servidor:', msg);
      setUser(previousUser);
      await simpleAuthService.updateUser(previousUser);
      throw new Error(msg);
    }
  };

  // Función para renovar token
  const refreshToken = async (): Promise<void> => {
    try {
      await simpleAuthService.refreshAuthToken();
      const currentUser = await simpleAuthService.getUser();
      setUser(currentUser);
    } catch (error) {
      console.error('Error renovando token:', error);
      // Si falla la renovación, hacer logout
      await logout();
    }
  };

  // Funciones helper para verificar tipo de usuario
  const isUserType = (userType: 'client' | 'professional' | 'admin'): boolean => {
    return simpleAuthService.isUserType(userType);
  };

  const isClient = (): boolean => {
    return simpleAuthService.isClient();
  };

  const isProfessional = (): boolean => {
    return simpleAuthService.isProfessional();
  };

  const isAdmin = (): boolean => {
    return simpleAuthService.isAdmin();
  };

  const hasProAccess = (): boolean => {
    const u = user;
    if (!u) return false;
    if (!isProfessionalUser(u)) return true;
    if (typeof u.hasProAccess === 'boolean') return u.hasProAccess;
    if (u.subscriptionTier === 'free') return false;
    if (u.subscriptionTier === 'pro') {
      if (u.subscriptionExpiresAt == null || u.subscriptionExpiresAt === '') return true;
      const end = new Date(u.subscriptionExpiresAt);
      return !Number.isNaN(end.getTime()) && end.getTime() > Date.now();
    }
    return true;
  };

  const refreshUserFromBackend = useCallback(async (): Promise<void> => {
    try {
      const fresh = await simpleAuthService.refreshUserFromBackend();
      if (fresh) setUser(fresh);
    } catch (e) {
      console.error('refreshUserFromBackend:', e);
    }
  }, []);

  // Valor del contexto
  const contextValue: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    applyAuthResponse,
    register,
    logout,
    refreshToken,
    updateUserProfile,
    isUserType,
    isClient,
    isProfessional,
    isAdmin,
    hasProAccess,
    refreshUserFromBackend,
    markUserActivity,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook para verificar si el usuario está autenticado
export const useRequireAuth = (): User => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    throw new Promise(() => {}); // Suspender mientras carga
  }

  if (!isAuthenticated || !user) {
    throw new Error('Usuario no autenticado');
  }

  return user;
};

// Hook para verificar si el usuario es de un tipo específico
export const useRequireUserType = (userType: 'client' | 'professional' | 'admin'): User => {
  const user = useRequireAuth();
  const { isUserType } = useAuth();

  if (!isUserType(userType)) {
    throw new Error(`Acceso denegado. Se requiere tipo de usuario: ${userType}`);
  }

  return user;
};

// Hook para verificar si el usuario es cliente
export const useRequireClient = (): User => {
  return useRequireUserType('client');
};

// Hook para verificar si el usuario es profesional
export const useRequireProfessional = (): User => {
  return useRequireUserType('professional');
};

// Hook para verificar si el usuario es admin
export const useRequireAdmin = (): User => {
  return useRequireUserType('admin');
};

export default AuthContext;