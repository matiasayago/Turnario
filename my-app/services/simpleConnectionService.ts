import { Alert } from 'react-native';
import { BACKEND_CONFIG } from '../config/backend';

export interface ConnectionStatus {
  isConnected: boolean;
  lastCheck: Date;
  serverUrl: string;
  error?: string;
}

class SimpleConnectionService {
  private connectionStatus: ConnectionStatus = {
    isConnected: false,
    lastCheck: new Date(),
    serverUrl: BACKEND_CONFIG.BASE_URL
  };

  // Verificar conexión con el backend (versión simple)
  async checkConnection(): Promise<ConnectionStatus> {
    try {
      console.log('🔍 Verificando conexión con el backend...');
      
      // Simular verificación de conexión
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Por ahora, asumimos que no hay conexión al backend
      // En una implementación real, aquí se haría la petición HTTP
      console.log('⚠️ Backend no disponible, usando modo offline');
      
      this.connectionStatus = {
        isConnected: false,
        lastCheck: new Date(),
        serverUrl: BACKEND_CONFIG.BASE_URL,
        error: 'Backend no disponible - Modo offline'
      };
      
      return this.connectionStatus;
    } catch (error) {
      console.error('❌ Error de conexión:', error);
      
      this.connectionStatus = {
        isConnected: false,
        lastCheck: new Date(),
        serverUrl: BACKEND_CONFIG.BASE_URL,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
      
      return this.connectionStatus;
    }
  }

  // Verificar conexión con la API (versión simple)
  async checkApiConnection(): Promise<ConnectionStatus> {
    try {
      console.log('🔍 Verificando conexión con la API...');
      
      // Simular verificación de API
      await new Promise(resolve => setTimeout(resolve, 300));
      
      console.log('⚠️ API no disponible, usando modo offline');
      
      this.connectionStatus = {
        isConnected: false,
        lastCheck: new Date(),
        serverUrl: BACKEND_CONFIG.BASE_URL,
        error: 'API no disponible - Modo offline'
      };
      
      return this.connectionStatus;
    } catch (error) {
      console.error('❌ Error de conexión API:', error);
      
      this.connectionStatus = {
        isConnected: false,
        lastCheck: new Date(),
        serverUrl: BACKEND_CONFIG.BASE_URL,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
      
      return this.connectionStatus;
    }
  }

  // Probar login (versión simple)
  async testLogin(): Promise<boolean> {
    try {
      console.log('🔍 Probando login...');
      
      // Simular test de login
      await new Promise(resolve => setTimeout(resolve, 200));
      
      console.log('⚠️ Login no disponible, usando modo offline');
      return false; // No hay backend disponible
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
        'Modo Offline',
        `Aplicación funcionando en modo offline:\n${status.serverUrl}\n\nEstado: ${status.error || 'Sin conexión'}\n\nÚltima verificación: ${status.lastCheck.toLocaleTimeString()}`,
        [{ text: 'OK' }]
      );
    }
  }

  // Verificación completa del sistema (versión simple)
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
      
      // 2. Verificar API
      const apiStatus = await this.checkApiConnection();
      results.api = apiStatus.isConnected;
      
      // 3. Probar login
      results.login = await this.testLogin();

      // Generar resumen
      if (results.server && results.api && results.login) {
        results.summary = '✅ Sistema completamente funcional';
      } else {
        results.summary = '📱 Aplicación funcionando en modo offline';
      }

      console.log('📊 Resultados de verificación:', results);
      return results;
      
    } catch (error) {
      console.error('❌ Error en verificación completa:', error);
      results.summary = '📱 Aplicación funcionando en modo offline';
      return results;
    }
  }

  // Mostrar resultados de verificación completa
  async showFullSystemCheck(): Promise<void> {
    const results = await this.fullSystemCheck();
    
    const details = [
      `Servidor: ${results.server ? '✅' : '📱 Offline'}`,
      `API: ${results.api ? '✅' : '📱 Offline'}`,
      `Login: ${results.login ? '✅' : '📱 Offline'}`,
      '',
      results.summary
    ].join('\n');

    Alert.alert(
      'Estado del Sistema',
      details,
      [{ text: 'OK' }]
    );
  }

  // Verificar si el backend está disponible (sin hacer peticiones)
  async isBackendAvailable(): Promise<boolean> {
    try {
      // Simular verificación rápida
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Por ahora, siempre retornamos false para usar modo offline
      return false;
    } catch (error) {
      console.error('❌ Error verificando disponibilidad del backend:', error);
      return false;
    }
  }

  // Obtener modo de funcionamiento
  getMode(): 'online' | 'offline' {
    return this.connectionStatus.isConnected ? 'online' : 'offline';
  }

  // Verificar si está en modo offline
  isOfflineMode(): boolean {
    return !this.connectionStatus.isConnected;
  }

  // Obtener mensaje de estado
  getStatusMessage(): string {
    if (this.connectionStatus.isConnected) {
      return 'Conectado al servidor';
    } else {
      return 'Modo offline - Datos locales';
    }
  }
}

// Instancia singleton
export const simpleConnectionService = new SimpleConnectionService();

export default simpleConnectionService;
