import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { connectionService, ConnectionStatus } from '../services/connectionService';
import { BACKEND_CONFIG } from '../config/backend';

interface ConnectionTestProps {
  onConnectionChange?: (isConnected: boolean) => void;
}

export const ConnectionTest: React.FC<ConnectionTestProps> = ({ onConnectionChange }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);
  const [testResults, setTestResults] = useState<any>(null);

  const handleCheckConnection = async () => {
    setIsLoading(true);
    try {
      const status = await connectionService.checkConnection();
      setConnectionStatus(status);
      onConnectionChange?.(status.isConnected);
    } catch (error) {
      console.error('Error checking connection:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckApi = async () => {
    setIsLoading(true);
    try {
      const status = await connectionService.checkApiConnection();
      setConnectionStatus(status);
      onConnectionChange?.(status.isConnected);
    } catch (error) {
      console.error('Error checking API:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestLogin = async () => {
    setIsLoading(true);
    try {
      const success = await connectionService.testLogin();
      Alert.alert(
        'Test de Login',
        success ? '✅ Login exitoso' : '❌ Login falló',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error testing login:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFullSystemCheck = async () => {
    setIsLoading(true);
    try {
      const results = await connectionService.fullSystemCheck();
      setTestResults(results);
      connectionService.showConnectionStatus();
    } catch (error) {
      console.error('Error in full system check:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (isConnected: boolean) => {
    return isConnected ? '#4CAF50' : '#F44336';
  };

  const getStatusText = (isConnected: boolean) => {
    return isConnected ? 'Conectado' : 'Desconectado';
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Prueba de Conexión</Text>
        <Text style={styles.subtitle}>Servidor: {BACKEND_CONFIG.BASE_URL}</Text>
      </View>

      {/* Estado actual */}
      {connectionStatus && (
        <View style={styles.statusContainer}>
          <Text style={styles.statusTitle}>Estado Actual:</Text>
          <View style={styles.statusRow}>
            <View 
              style={[
                styles.statusIndicator, 
                { backgroundColor: getStatusColor(connectionStatus.isConnected) }
              ]} 
            />
            <Text style={styles.statusText}>
              {getStatusText(connectionStatus.isConnected)}
            </Text>
          </View>
          <Text style={styles.statusDetails}>
            Última verificación: {connectionStatus.lastCheck.toLocaleTimeString()}
          </Text>
          {connectionStatus.error && (
            <Text style={styles.errorText}>
              Error: {connectionStatus.error}
            </Text>
          )}
        </View>
      )}

      {/* Resultados de pruebas */}
      {testResults && (
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsTitle}>Resultados de Verificación:</Text>
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>Servidor:</Text>
            <Text style={[styles.resultValue, { color: getStatusColor(testResults.server) }]}>
              {testResults.server ? '✅' : '❌'}
            </Text>
          </View>
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>API:</Text>
            <Text style={[styles.resultValue, { color: getStatusColor(testResults.api) }]}>
              {testResults.api ? '✅' : '❌'}
            </Text>
          </View>
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>Login:</Text>
            <Text style={[styles.resultValue, { color: getStatusColor(testResults.login) }]}>
              {testResults.login ? '✅' : '❌'}
            </Text>
          </View>
          <Text style={styles.summaryText}>{testResults.summary}</Text>
        </View>
      )}

      {/* Botones de prueba */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={handleCheckConnection}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Verificar Servidor</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={handleCheckApi}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Verificar API</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.tertiaryButton]}
          onPress={handleTestLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Probar Login</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.accentButton]}
          onPress={handleFullSystemCheck}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Verificación Completa</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Información adicional */}
      <View style={styles.infoContainer}>
        <Text style={styles.infoTitle}>Información:</Text>
        <Text style={styles.infoText}>
          • Verificar Servidor: Comprueba si el backend está ejecutándose
        </Text>
        <Text style={styles.infoText}>
          • Verificar API: Comprueba si la API v1 está disponible
        </Text>
        <Text style={styles.infoText}>
          • Probar Login: Intenta hacer login con credenciales de prueba
        </Text>
        <Text style={styles.infoText}>
          • Verificación Completa: Ejecuta todas las pruebas
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: 16,
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
  },
  statusContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
  },
  statusDetails: {
    fontSize: 14,
    color: '#666666',
    marginTop: 4,
  },
  errorText: {
    fontSize: 14,
    color: '#F44336',
    marginTop: 8,
    fontStyle: 'italic',
  },
  resultsContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 12,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  resultLabel: {
    fontSize: 16,
    color: '#333333',
  },
  resultValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  summaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginTop: 12,
    textAlign: 'center',
  },
  buttonContainer: {
    marginBottom: 16,
  },
  button: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryButton: {
    backgroundColor: '#2196F3',
  },
  secondaryButton: {
    backgroundColor: '#FF9800',
  },
  tertiaryButton: {
    backgroundColor: '#9C27B0',
  },
  accentButton: {
    backgroundColor: '#4CAF50',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  infoContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
    lineHeight: 20,
  },
});

export default ConnectionTest;
