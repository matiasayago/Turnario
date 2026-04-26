import { Alert } from 'react-native';
import { BACKEND_CONFIG } from '../config/backend';
import { fetchBackendHealth } from './backendHealth';

export interface ConnectionStatus {
  isConnected: boolean;
  lastCheck: Date;
  serverUrl: string;
  error?: string;
}

class ConnectionService {
  private connectionStatus: ConnectionStatus = {
    isConnected: false,
    lastCheck: new Date(),
    serverUrl: BACKEND_CONFIG.BASE_URL
  };

  // Verificar conexión con el backend
  async checkConnection(): Promise<ConnectionStatus> {
    try {
      console.log('🔍 Verificando conexión con el backend...');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      let data: Record<string, unknown>;
      try {
        ({ data } = await fetchBackendHealth(BACKEND_CONFIG.BASE_URL, controller.signal));
      } finally {
        clearTimeout(timeoutId);
      }

      console.log('✅ Conexión exitosa:', data);

      this.connectionStatus = {
        isConnected: true,
        lastCheck: new Date(),
        serverUrl: BACKEND_CONFIG.BASE_URL,
      };

      return this.connectionStatus;
    } catch (error) {
      console.error('❌ Error de conexión:', error);

      this.connectionStatus = {
        isConnected: false,
        lastCheck: new Date(),
        serverUrl: BACKEND_CONFIG.BASE_URL,
        error: error instanceof Error ? error.message : 'Error desconocido',
      };

      return this.connectionStatus;
    }
  }

  // Verificar conexión con la API
  async checkApiConnection(): Promise<ConnectionStatus> {
    console.log('🔍 Verificando conexión con la API...');
    return this.checkConnection();
  }

  // Probar login con credenciales de prueba
  async testLogin(): Promise<boolean> {
    try {
      console.log('🔍 Probando login...');
      
      // Crear AbortController para timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${BACKEND_CONFIG.BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@turnario.com',
          password: 'test123'
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Login exitoso:', data);
        return true;
      } else {
        const errorData = await response.json();
        console.log('⚠️  Login falló:', errorData);
        return false;
      }
    } catch (error) {
      console.error('❌ Error en test de login:', error);
      return false;
    }
  }

  // Obtener estado actual de la conexión
  getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  // Verificar si está conectado
  isConnected(): boolean {
    return this.connectionStatus.isConnected;
  }

  // Obtener URL del servidor
  getServerUrl(): string {
    return this.connectionStatus.serverUrl;
  }

  // Mostrar estado de conexión al usuario
  showConnectionStatus(): void {
    const status = this.getConnectionStatus();
    
    if (status.isConnected) {
      Alert.alert(
        'Conexión Exitosa',
        `Conectado al servidor:\n${status.serverUrl}\n\nÚltima verificación: ${status.lastCheck.toLocaleTimeString()}`,
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert(
        'Error de Conexión',
        `No se pudo conectar al servidor:\n${status.serverUrl}\n\nError: ${status.error || 'Desconocido'}\n\nÚltima verificación: ${status.lastCheck.toLocaleTimeString()}`,
        [{ text: 'OK' }]
      );
    }
  }

  // Verificación completa del sistema
  async fullSystemCheck(): Promise<{
    server: boolean;
    api: boolean;
    login: boolean;
    summary: string;
  }> {
    console.log('🔍 Iniciando verificación completa del sistema...');
    
    const results = {
      server: false,
      api: false,
      login: false,
      summary: ''
    };

    try {
      // 1. Verificar servidor
      const serverStatus = await this.checkConnection();
      results.server = serverStatus.isConnected;
      
      if (results.server) {
        // 2. Verificar API
        const apiStatus = await this.checkApiConnection();
        results.api = apiStatus.isConnected;
        
        if (results.api) {
          // 3. Probar login
          results.login = await this.testLogin();
        }
      }

      // Generar resumen
      if (results.server && results.api && results.login) {
        results.summary = '✅ Sistema completamente funcional';
      } else if (results.server && results.api) {
        results.summary = '⚠️ Servidor y API funcionando, problemas con autenticación';
      } else if (results.server) {
        results.summary = '⚠️ Servidor funcionando, problemas con API';
      } else {
        results.summary = '❌ Servidor no disponible';
      }

      console.log('📊 Resultados de verificación:', results);
      return results;
      
    } catch (error) {
      console.error('❌ Error en verificación completa:', error);
      results.summary = '❌ Error durante la verificación';
      return results;
    }
  }

  // Mostrar resultados de verificación completa
  async showFullSystemCheck(): Promise<void> {
    const results = await this.fullSystemCheck();
    
    const details = [
      `Servidor: ${results.server ? '✅' : '❌'}`,
      `API: ${results.api ? '✅' : '❌'}`,
      `Login: ${results.login ? '✅' : '❌'}`,
      '',
      results.summary
    ].join('\n');

    Alert.alert(
      'Verificación del Sistema',
      details,
      [{ text: 'OK' }]
    );
  }
}

// Instancia singleton
export const connectionService = new ConnectionService();

export default connectionService;
