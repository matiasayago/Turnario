// @ts-nocheck ? beta
import AsyncStorage from '@react-native-async-storage/async-storage';
import { formatBackendConnectionError, getBackendBaseUrl } from '../config/backend';
import { buildLoginFailureMessage } from '../utils/loginErrorMessage';
import { AuthResponse, LoginCredentials, RegisterData, User } from './authService';
import { profileService } from './profileService';

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Reintentos ante cortes típicos de Wi‑Fi / LAN (sin afectar errores HTTP del servidor). */
async function fetchWithNetworkRetry(url: string, init: RequestInit, attempts = 3): Promise<Response> {
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fetch(url, init);
    } catch (e) {
      last = e;
      if (i < attempts - 1) await sleep(500 * (i + 1));
    }
  }
  throw last;
}

class SimpleAuthService {
  private tokenKey = 'auth_token';
  private userKey = 'user_data';

  // Usuarios mock para desarrollo
  private mockUsers: User[] = [
    {
      _id: '1',
      email: 'dr.carlos.mendoza@turnario.com',
      fullName: 'Dr. Carlos Mendoza',
      userType: 'professional',
      phone: '+54 11 1234-5678',
      service: 'Medicina General',
      isActive: true,
      isEmailVerified: true,
      hasProAccess: true,
      subscriptionTier: 'pro',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z'
    },
    {
      _id: '2',
      email: 'profesional@turnario.com',
      fullName: 'Dr. Ana Mart?nez',
      userType: 'professional',
      phone: '+54 11 9876-5432',
      service: 'Medicina General',
      isActive: true,
      isEmailVerified: true,
      hasProAccess: true,
      subscriptionTier: 'pro',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z'
    },
    {
      _id: '3',
      email: 'carlos.mendoza@turnario.com',
      fullName: 'Dr. Carlos Mendoza',
      userType: 'professional',
      phone: '+54 11 1234-5678',
      service: 'Medicina General',
      isActive: true,
      isEmailVerified: true,
      hasProAccess: true,
      subscriptionTier: 'pro',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z'
    },
    {
      _id: '4',
      email: 'ana.martinez@turnario.com',
      fullName: 'Ana Mart?nez',
      userType: 'client',
      phone: '+54 11 9876-5432',
      isActive: true,
      isEmailVerified: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z'
    },
    {
      _id: '5',
      email: 'ana.martinez@email.com',
      fullName: 'Ana Mart?nez',
      userType: 'client',
      phone: '+5491187654321',
      isActive: true,
      isEmailVerified: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z'
    },
    {
      _id: '6',
      email: 'cliente@turnario.com',
      fullName: 'Juan P?rez',
      userType: 'client',
      phone: '+5491112345678',
      isActive: true,
      isEmailVerified: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z'
    },
    {
      _id: '7',
      email: 'demo@turnario.com',
      fullName: 'Usuario Demo',
      userType: 'client',
      phone: '+1234567890',
      isActive: true,
      isEmailVerified: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z'
    },
    {
      _id: '8',
      email: 'test@turnario.com',
      fullName: 'Usuario Test',
      userType: 'client',
      phone: '+56912345678',
      isActive: true,
      isEmailVerified: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z'
    },
    {
      _id: '9',
      email: 'maria.gonzalez@email.com',
      fullName: 'Mar?a Gonz?lez',
      userType: 'client',
      phone: '+5491134567890',
      isActive: true,
      isEmailVerified: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z'
    },
    {
      _id: '10',
      email: 'carlos.rodriguez@email.com',
      fullName: 'Carlos Rodr?guez',
      userType: 'client',
      phone: '+5491145678901',
      isActive: true,
      isEmailVerified: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z'
    }
  ];

  // Simular delay de red
  private delay(ms: number = 500): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Inicializar servicio
  async initialize(): Promise<void> {
    try {
      console.log('?? Inicializando servicio de autenticaci?n simple...');
      await this.delay(100);
      console.log('? Servicio de autenticaci?n simple inicializado');
    } catch (error) {
      console.error('? Error inicializando servicio simple:', error);
      throw error;
    }
  }

  // Iniciar sesi?n (siempre valida contra el backend; sin login mock por error 401)
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    console.log('?? Iniciando sesi?n con:', credentials.email);

    if (!credentials.email || !credentials.password) {
      throw new Error('Email y contrase?a son requeridos');
    }

    const loginUrl = `${getBackendBaseUrl()}/api/v1/auth/login`;

    let response: Response;
    try {
      response = await fetchWithNetworkRetry(
        loginUrl,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            email: credentials.email.trim(),
            password: credentials.password,
          }),
        },
        3
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('Login: sin conexion al backend:', loginUrl, msg);
      throw new Error(formatBackendConnectionError(loginUrl, msg));
    }

    let body: Record<string, unknown> = {};
    try {
      body = (await response.json()) as Record<string, unknown>;
    } catch {
      /* respuesta no JSON */
    }

    if (!response.ok) {
      let messageFromServer = buildLoginFailureMessage(response.status, body);
      const det = typeof body.details === 'string' ? body.details.trim() : '';
      if (
        det &&
        !messageFromServer.includes(det) &&
        response.status !== 401 &&
        response.status !== 400
      ) {
        messageFromServer = `${messageFromServer}\n${det}`;
      }
      console.log('Login rechazado por el servidor:', response.status, messageFromServer);
      throw new Error(messageFromServer);
    }

    const inner = (body.data as Record<string, unknown> | undefined) || body;
    const user = inner.user as User | undefined;
    const token = inner.token as string | undefined;

    if (!user || !token) {
      throw new Error('Respuesta del servidor inv?lida (falta usuario o token).');
    }

    await AsyncStorage.setItem(this.tokenKey, token);
    let userToStore = user as User;
    try {
      const fromDb = await profileService.fetchProfileMe(token, { mergeBase: userToStore });
      userToStore = { ...userToStore, ...fromDb };
    } catch (e) {
      console.warn(
        'Login: no se pudo cargar perfil completo desde el servidor, se usan datos del login:',
        e instanceof Error ? e.message : e
      );
    }
    await AsyncStorage.setItem(this.userKey, JSON.stringify(userToStore));

    console.log('? Login exitoso:', userToStore.email);

    return {
      user: userToStore,
      token,
      refreshToken: (typeof inner.refreshToken === 'string' ? inner.refreshToken : '') || '',
      expiresIn: typeof inner.expiresIn === 'number' ? inner.expiresIn : 0,
    };
  }

  /**
   * Persiste token y usuario tras login social (Google / Apple), mismo formato que /auth/login.
   */
  async setSessionFromApiSuccess(body: Record<string, unknown>): Promise<AuthResponse> {
    const inner = (body.data as Record<string, unknown> | undefined) || body;
    const user = inner.user as User | undefined;
    const token = inner.token as string | undefined;
    if (!user || !token) {
      throw new Error('Respuesta del servidor inválida (falta usuario o token).');
    }
    await AsyncStorage.setItem(this.tokenKey, token);
    let userToStore = user as User;
    try {
      const fromDb = await profileService.fetchProfileMe(token, { mergeBase: userToStore });
      userToStore = { ...userToStore, ...fromDb };
    } catch (e) {
      console.warn(
        'OAuth: no se pudo hidratar perfil completo:',
        e instanceof Error ? e.message : e
      );
    }
    await AsyncStorage.setItem(this.userKey, JSON.stringify(userToStore));
    return {
      user: userToStore,
      token,
      refreshToken: (typeof inner.refreshToken === 'string' ? inner.refreshToken : '') || '',
      expiresIn: typeof inner.expiresIn === 'number' ? inner.expiresIn : 0,
    };
  }

  /**
   * Consulta al backend si el email ya existe en la base (GET /auth/check-email).
   * Si la petici?n falla, devuelve false: el POST /register sigue siendo la validaci?n definitiva.
   */
  async isEmailAlreadyRegistered(email: string): Promise<boolean> {
    const trimmed = String(email || '').trim();
    if (!trimmed || !trimmed.includes('@')) {
      return false;
    }
    try {
      const url = `${getBackendBaseUrl()}/api/v1/auth/check-email?email=${encodeURIComponent(trimmed)}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) {
        return false;
      }
      const data = (await response.json()) as { taken?: boolean; available?: boolean };
      if (typeof data.taken === 'boolean') return data.taken;
      if (typeof data.available === 'boolean') return !data.available;
      return false;
    } catch {
      return false;
    }
  }

  // Registrar usuario (mismo contrato que el login: API v1 + AsyncStorage)
  async register(userData: RegisterData): Promise<AuthResponse> {
    if (!userData.email || !userData.password || !userData.fullName) {
      throw new Error('Email, nombre y contrase?a son obligatorios');
    }

    const registerUrl = `${getBackendBaseUrl()}/api/v1/auth/register`;

    let response;
    try {
      response = await fetch(registerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          email: userData.email.trim().toLowerCase(),
          password: userData.password,
          fullName: userData.fullName.trim(),
          userType: userData.userType,
          phone: (userData.phone && userData.phone.trim()) || '+5491111111111',
        }),
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('Registro: sin conexion al backend:', registerUrl, msg);
      throw new Error(formatBackendConnectionError(registerUrl, msg));
    }

    let body = {};
    try {
      body = await response.json();
    } catch {
      /* no JSON */
    }

    if (!response.ok) {
      const b = body as Record<string, unknown>;
      const errCode = typeof b.error === 'string' ? b.error : '';
      const firstValidator =
        Array.isArray(b.errors) && b.errors[0] && typeof (b.errors[0] as { msg?: string }).msg === 'string'
          ? (b.errors[0] as { msg: string }).msg
          : '';
      let messageFromServer =
        (typeof b.message === 'string' && b.message) || firstValidator || `Error ${response.status}`;
      if (errCode === 'EMAIL_EXISTS' || errCode === 'DUPLICATE_KEY') {
        messageFromServer =
          (typeof b.message === 'string' && b.message.trim()) ||
          'Este correo ya est? registrado. Inici? sesi?n o us? otro email.';
      }
      if (typeof b.details === 'string' && b.details.trim() && !messageFromServer.includes(b.details)) {
        messageFromServer = `${messageFromServer}\n${b.details.trim()}`;
      }
      console.log('Registro rechazado por el servidor:', response.status, messageFromServer);
      throw new Error(messageFromServer);
    }

    const inner = ((body as Record<string, unknown>).data !== undefined
      ? (body as Record<string, unknown>).data
      : body) as Record<string, unknown> || {};
    const user = inner.user;
    const token = inner.token;

    if (!user || !token) {
      throw new Error('Respuesta del servidor inv?lida (falta usuario o token).');
    }

    await AsyncStorage.setItem(this.tokenKey, token);
    let userToStore = user as User;
    try {
      const fromDb = await profileService.fetchProfileMe(token, { mergeBase: userToStore });
      userToStore = { ...userToStore, ...fromDb };
    } catch (e) {
      console.warn(
        'Registro: no se pudo hidratar perfil completo:',
        e instanceof Error ? e.message : e
      );
    }
    await AsyncStorage.setItem(this.userKey, JSON.stringify(userToStore));

    console.log('Registro exitoso:', userToStore.email);

    return {
      user: userToStore,
      token,
      refreshToken: typeof inner.refreshToken === 'string' ? inner.refreshToken : '',
      expiresIn: typeof inner.expiresIn === 'number' ? inner.expiresIn : 0,
    };
  }

  /**
   * Sincroniza usuario en AsyncStorage con GET /api/users/profile/me (misma fuente que tras login).
   */
  async refreshUserFromBackend(): Promise<User | null> {
    const token = await this.getToken();
    const saved = await this.getUser();
    if (!token || !saved) return saved;
    try {
      const fromDb = await profileService.fetchProfileMe(token, { mergeBase: saved });
      const merged = { ...saved, ...fromDb };
      await this.updateUser(merged);
      return merged;
    } catch (e) {
      console.warn('refreshUserFromBackend:', e instanceof Error ? e.message : e);
      return saved;
    }
  }

  // Cerrar sesi?n
  async logout(): Promise<void> {
    try {
      console.log('?? Cerrando sesi?n...');
      await this.delay(500);

      // Solo limpiar el token, mantener los datos del usuario para la pr?xima sesi?n
      await AsyncStorage.removeItem(this.tokenKey);
      // NO eliminar this.userKey para mantener los datos del perfil

      console.log('? Sesi?n cerrada (datos del usuario mantenidos)');
    } catch (error) {
      console.error('? Error cerrando sesi?n:', error);
      throw error;
    }
  }

  // Obtener usuario actual
  async getUser(): Promise<User | null> {
    try {
      console.log('?? Obteniendo usuario desde AsyncStorage...');
      const userData = await AsyncStorage.getItem(this.userKey);
      
      if (userData) {
        const user = JSON.parse(userData);
        console.log('? Usuario encontrado en AsyncStorage:', user.fullName, user.userType);
        return user;
      } else {
        console.log('? No hay usuario guardado en AsyncStorage');
        return null;
      }
    } catch (error) {
      console.error('? Error obteniendo usuario:', error);
      return null;
    }
  }

  // Obtener token de autenticaci?n
  async getToken(): Promise<string | null> {
    try {
      const token = await AsyncStorage.getItem(this.tokenKey);
      return token;
    } catch (error) {
      console.error('? Error obteniendo token:', error);
      return null;
    }
  }

  // Alias para getCurrentUser (m?s claro)
  async getCurrentUser(): Promise<User | null> {
    return this.getUser();
  }

  // Verificar si est? autenticado
  async isAuthenticated(): Promise<boolean> {
    try {
      const user = await this.getUser();
      const token = await AsyncStorage.getItem(this.tokenKey);
      // Requerir tanto usuario como token para estar autenticado
      return user !== null && token !== null;
    } catch (error) {
      console.error('? Error verificando autenticaci?n:', error);
      return false;
    }
  }

  // Crear usuario de prueba para desarrollo
  async createTestUser(): Promise<User> {
    try {
      console.log('?? Creando usuario de prueba...');
      
      const testUser: User = {
        _id: 'test_professional',
        email: 'test.professional@turnario.com',
        fullName: 'Dr. Ana Mart?nez',
        userType: 'professional',
        phone: '+54 11 9876-5432',
        service: 'Medicina General',
        isActive: true,
        isEmailVerified: true,
        hasProAccess: true,
        subscriptionTier: 'pro',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Simular token JWT
      const token = `mock_token_${testUser._id}_${Date.now()}`;

      // Guardar en AsyncStorage
      await AsyncStorage.setItem(this.tokenKey, token);
      await AsyncStorage.setItem(this.userKey, JSON.stringify(testUser));

      console.log('? Usuario de prueba creado:', testUser.fullName);
      return testUser;
    } catch (error) {
      console.error('? Error creando usuario de prueba:', error);
      throw error;
    }
  }

  // Obtener headers de autenticaci?n
  getAuthHeaders(): Record<string, string> | null {
    try {
      // En una implementaci?n real, esto vendr?a del token almacenado
      return {
        'Authorization': 'Bearer mock_token',
        'Content-Type': 'application/json'
      };
    } catch (error) {
      console.error('? Error obteniendo headers:', error);
      return null;
    }
  }

  // Actualizar perfil
  async updateProfile(profileData: any): Promise<User> {
    try {
      console.log('?? Actualizando perfil...');
      await this.delay(1000);

      // Simular actualizaci?n
      const updatedUser: User = {
        _id: '1',
        email: 'dr.carlos.mendoza@turnario.com',
        fullName: profileData.fullName || 'Dr. Carlos Mendoza',
        userType: 'professional',
        phone: profileData.phone || '+54 11 1234-5678',
        service: profileData.service || 'Medicina General',
        isActive: true,
        isEmailVerified: true,
        hasProAccess: true,
        subscriptionTier: 'pro',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: new Date().toISOString()
      };

      console.log('? Perfil actualizado');
      return updatedUser;
    } catch (error) {
      console.error('? Error actualizando perfil:', error);
      throw error;
    }
  }

  // Actualizar usuario (wrapper para updateProfile)
  async updateUser(userData: User): Promise<void> {
    try {
      console.log('?? Actualizando usuario...', userData);
      
      // Guardar en AsyncStorage
      await AsyncStorage.setItem(this.userKey, JSON.stringify(userData));
      
      console.log('? Usuario actualizado en AsyncStorage');
    } catch (error) {
      console.error('? Error actualizando usuario:', error);
      throw error;
    }
  }

  // Obtener perfil
  async getProfile(): Promise<User> {
    try {
      console.log('?? Obteniendo perfil...');
      await this.delay(500);

      // Simular obtenci?n de perfil
      const user: User = {
        _id: '1',
        email: 'dr.carlos.mendoza@turnario.com',
        fullName: 'Dr. Carlos Mendoza',
        userType: 'professional',
        phone: '+54 11 1234-5678',
        service: 'Medicina General',
        isActive: true,
        isEmailVerified: true,
        hasProAccess: true,
        subscriptionTier: 'pro',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      };

      return user;
    } catch (error) {
      console.error('? Error obteniendo perfil:', error);
      throw error;
    }
  }

  // Validar token
  async validateToken(): Promise<boolean> {
    try {
      console.log('?? Validando token...');
      await this.delay(500);
      return true; // Simular token v?lido
    } catch (error) {
      console.error('? Error validando token:', error);
      return false;
    }
  }

  // Renovar token
  async refreshAuthToken(): Promise<void> {
    try {
      console.log('?? Renovando token...');
      await this.delay(500);
      console.log('? Token renovado');
    } catch (error) {
      console.error('? Error renovando token:', error);
      throw error;
    }
  }

  // Verificar tipo de usuario
  isUserType(userType: 'client' | 'professional' | 'admin'): boolean {
    try {
      const user = this.getUser();
      return user?.userType === userType;
    } catch (error) {
      console.error('? Error verificando tipo de usuario:', error);
      return false;
    }
  }

  isClient(): boolean {
    return this.isUserType('client');
  }

  isProfessional(): boolean {
    return this.isUserType('professional');
  }

  isAdmin(): boolean {
    return this.isUserType('admin');
  }

  // Obtener todos los usuarios
  async getAllUsers(): Promise<User[]> {
    try {
      console.log('?? Obteniendo todos los usuarios...');
      await this.delay(500);
      return this.mockUsers;
    } catch (error) {
      console.error('? Error obteniendo usuarios:', error);
      return [];
    }
  }
}

// Instancia singleton
export const simpleAuthService = new SimpleAuthService();

export default simpleAuthService;
