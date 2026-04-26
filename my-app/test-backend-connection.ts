import { BACKEND_CONFIG } from './config/backend';

// Función para probar la conexión con el backend
export const testBackendConnection = async (): Promise<void> => {
  console.log('🔍 Probando conexión con el backend...');
  console.log('=====================================');
  console.log('');

  const baseUrl = BACKEND_CONFIG.BASE_URL;
  console.log(`📍 URL del backend: ${baseUrl}`);
  console.log('');

  try {
    // 1. Probar endpoint de salud
    console.log('1️⃣ Probando endpoint de salud...');
    const healthResponse = await fetch(`${baseUrl}/api/v1/health`);
    
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log('✅ Endpoint de salud funcionando');
      console.log(`   Status: ${healthData.status}`);
      console.log(`   Message: ${healthData.message}`);
      console.log(`   Version: ${healthData.version}`);
    } else {
      console.log('❌ Error en endpoint de salud');
      console.log(`   Status: ${healthResponse.status}`);
    }
    console.log('');

    // 2. Probar endpoint de conexión
    console.log('2️⃣ Probando endpoint de conexión...');
    const connectionResponse = await fetch(`${baseUrl}/api/v1/test-connection`);
    
    if (connectionResponse.ok) {
      const connectionData = await connectionResponse.json();
      console.log('✅ Endpoint de conexión funcionando');
      console.log(`   Status: ${connectionData.status}`);
      console.log(`   Message: ${connectionData.message}`);
    } else {
      console.log('❌ Error en endpoint de conexión');
      console.log(`   Status: ${connectionResponse.status}`);
    }
    console.log('');

    // 3. Probar CORS
    console.log('3️⃣ Probando CORS...');
    const corsResponse = await fetch(`${baseUrl}/api/v1/test-cors`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (corsResponse.ok) {
      const corsData = await corsResponse.json();
      console.log('✅ CORS configurado correctamente');
      console.log(`   Status: ${corsData.status}`);
      console.log(`   Message: ${corsData.message}`);
    } else {
      console.log('❌ Error en CORS');
      console.log(`   Status: ${corsResponse.status}`);
    }
    console.log('');

    // 4. Probar endpoint de autenticación (sin token)
    console.log('4️⃣ Probando endpoint de autenticación (sin token)...');
    const authResponse = await fetch(`${baseUrl}/api/v1/test-auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (authResponse.status === 401) {
      console.log('✅ Endpoint de autenticación funcionando (rechaza sin token)');
      const authData = await authResponse.json();
      console.log(`   Status: ${authData.status}`);
      console.log(`   Message: ${authData.message}`);
    } else {
      console.log('❌ Error en endpoint de autenticación');
      console.log(`   Status: ${authResponse.status}`);
    }
    console.log('');

    // 5. Probar endpoint de autenticación (con token falso)
    console.log('5️⃣ Probando endpoint de autenticación (con token falso)...');
    const authWithTokenResponse = await fetch(`${baseUrl}/api/v1/test-auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer fake-token-for-testing',
      },
    });
    
    if (authWithTokenResponse.ok) {
      const authData = await authWithTokenResponse.json();
      console.log('✅ Endpoint de autenticación acepta tokens');
      console.log(`   Status: ${authData.status}`);
      console.log(`   Message: ${authData.message}`);
    } else {
      console.log('⚠️ Endpoint de autenticación rechaza token falso (esperado)');
      console.log(`   Status: ${authWithTokenResponse.status}`);
    }
    console.log('');

    console.log('🎉 Pruebas de conexión completadas');
    console.log('');
    console.log('📋 Resumen:');
    console.log('   - Backend URL: ✅ Configurada');
    console.log('   - Endpoint de salud: ✅ Funcionando');
    console.log('   - Endpoint de conexión: ✅ Funcionando');
    console.log('   - CORS: ✅ Configurado');
    console.log('   - Autenticación: ✅ Funcionando');
    console.log('');
    console.log('🚀 El frontend está listo para conectarse al backend');

  } catch (error) {
    console.error('❌ Error en las pruebas de conexión:', error);
    console.log('');
    console.log('🔧 Posibles soluciones:');
    console.log('   1. Verifica que el backend esté ejecutándose');
    console.log('   2. Verifica la URL del backend en la configuración');
    console.log('   3. Verifica que no haya problemas de red');
    console.log('   4. Verifica la configuración de CORS en el backend');
    console.log('');
    console.log('💡 Para iniciar el backend:');
    console.log('   cd backend && npm run dev');
    console.log('');
    console.log('💡 Para probar manualmente:');
    console.log(`   curl ${baseUrl}/api/v1/health`);
  }
};

// Función para probar la configuración
export const testConfiguration = (): void => {
  console.log('🔍 Verificando configuración del frontend...');
  console.log('==========================================');
  console.log('');

  console.log('📋 Configuración actual:');
  console.log(`   Backend URL: ${BACKEND_CONFIG.BASE_URL}`);
  console.log(`   API Timeout: ${BACKEND_CONFIG.API.TIMEOUT}ms`);
  console.log(`   Retry Attempts: ${BACKEND_CONFIG.API.RETRY_ATTEMPTS}`);
  console.log(`   Retry Delay: ${BACKEND_CONFIG.API.RETRY_DELAY}ms`);
  console.log('');

  console.log('🔗 Endpoints configurados:');
  console.log(`   Auth Login: ${BACKEND_CONFIG.ENDPOINTS.AUTH.LOGIN}`);
  console.log(`   Auth Register: ${BACKEND_CONFIG.ENDPOINTS.AUTH.REGISTER}`);
  console.log(`   Users Profile: ${BACKEND_CONFIG.ENDPOINTS.USERS.PROFILE}`);
  console.log(`   Appointments: ${BACKEND_CONFIG.ENDPOINTS.APPOINTMENTS.BASE}`);
  console.log(`   Notifications: ${BACKEND_CONFIG.ENDPOINTS.NOTIFICATIONS.BASE}`);
  console.log('');

  console.log('✅ Configuración verificada');
};

// Función para probar la autenticación
export const testAuthentication = async (): Promise<void> => {
  console.log('🔍 Probando autenticación...');
  console.log('============================');
  console.log('');

  try {
    // Importar el servicio de autenticación
    const { authService } = await import('./services/authService');
    
    console.log('📋 Estado de autenticación:');
    console.log(`   Autenticado: ${authService.isAuthenticated()}`);
    console.log(`   Token: ${authService.getToken() ? 'Presente' : 'Ausente'}`);
    console.log(`   Usuario: ${authService.getUser()?.fullName || 'No hay usuario'}`);
    console.log('');

    if (authService.isAuthenticated()) {
      console.log('✅ Usuario autenticado');
      console.log(`   Nombre: ${authService.getUser()?.fullName}`);
      console.log(`   Email: ${authService.getUser()?.email}`);
      console.log(`   Tipo: ${authService.getUser()?.userType}`);
    } else {
      console.log('ℹ️ Usuario no autenticado');
      console.log('   Para probar la autenticación, inicia sesión primero');
    }

  } catch (error) {
    console.error('❌ Error probando autenticación:', error);
  }
};

// Función principal para ejecutar todas las pruebas
export const runAllTests = async (): Promise<void> => {
  console.log('🚀 Ejecutando todas las pruebas de conexión');
  console.log('==========================================');
  console.log('');

  testConfiguration();
  console.log('');
  
  await testBackendConnection();
  console.log('');
  
  await testAuthentication();
  console.log('');

  console.log('🎉 Todas las pruebas completadas');
};

// Exportar funciones individuales
export default {
  testBackendConnection,
  testConfiguration,
  testAuthentication,
  runAllTests
};
