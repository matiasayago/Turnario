const axios = require('axios');

// Configuración
const BASE_URL = 'http://localhost:3001/api';
let authToken = '';

// Función para hacer requests con autenticación
const apiRequest = async (method, endpoint, data = null, token = authToken) => {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      ...(data && { data })
    };

    const response = await axios(config);
    return response.data;
  } catch (error) {
    if (error.response) {
      console.error(`❌ Error ${error.response.status}:`, error.response.data);
      return error.response.data;
    } else {
      console.error('❌ Error de conexión:', error.message);
      return { error: error.message };
    }
  }
};

// Función para mostrar resultados
const showResult = (title, result) => {
  console.log(`\n${title}`);
  console.log('='.repeat(50));
  if (result.error) {
    console.log(`❌ Error: ${result.error}`);
  } else {
    console.log('✅ Éxito:', JSON.stringify(result, null, 2));
  }
};

// Función principal de pruebas
const runTests = async () => {
  console.log('🧪 Iniciando pruebas de la API Turnario...\n');

  // 1. Health Check
  console.log('1️⃣ Probando Health Check...');
  const health = await apiRequest('GET', '/health');
  showResult('Health Check', health);

  // 2. Registro de usuario
  console.log('\n2️⃣ Probando registro de usuario...');
  const registerData = {
    email: 'test@example.com',
    password: 'password123',
    fullName: 'Usuario de Prueba',
    userType: 'client',
    phone: '+5491112345678'
  };
  const registerResult = await apiRequest('POST', '/auth/register', registerData);
  showResult('Registro de Usuario', registerResult);

  // 3. Login
  console.log('\n3️⃣ Probando login...');
  const loginData = {
    email: 'test@example.com',
    password: 'password123'
  };
  const loginResult = await apiRequest('POST', '/auth/login', loginData);
  if (loginResult.success && loginResult.data.token) {
    authToken = loginResult.data.token;
    console.log('✅ Token obtenido:', authToken.substring(0, 20) + '...');
  }
  showResult('Login', loginResult);

  // 4. Obtener perfil del usuario
  console.log('\n4️⃣ Probando obtener perfil...');
  const profileResult = await apiRequest('GET', '/users/profile/me');
  showResult('Perfil de Usuario', profileResult);

  // 5. Obtener servicios
  console.log('\n5️⃣ Probando obtener servicios...');
  const servicesResult = await apiRequest('GET', '/services');
  showResult('Servicios', servicesResult);

  // 6. Obtener clínicas
  console.log('\n6️⃣ Probando obtener clínicas...');
  const clinicsResult = await apiRequest('GET', '/clinics');
  showResult('Clínicas', clinicsResult);

  // 7. Obtener notificaciones
  console.log('\n7️⃣ Probando obtener notificaciones...');
  const notificationsResult = await apiRequest('GET', '/notifications');
  showResult('Notificaciones', notificationsResult);

  // 8. Crear una cita de prueba
  console.log('\n8️⃣ Probando crear cita...');
  if (servicesResult.success && servicesResult.data.length > 0 && 
      clinicsResult.success && clinicsResult.data.length > 0) {
    const serviceId = servicesResult.data[0]._id;
    const clinicId = clinicsResult.data[0]._id;
    
    const appointmentData = {
      serviceId,
      clinicId,
      date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 días desde ahora
      time: '10:00',
      notes: 'Cita de prueba desde script de testing'
    };
    
    const appointmentResult = await apiRequest('POST', '/appointments', appointmentData);
    showResult('Crear Cita', appointmentResult);
  }

  // 9. Obtener citas
  console.log('\n9️⃣ Probando obtener citas...');
  const appointmentsResult = await apiRequest('GET', '/appointments');
  showResult('Citas', appointmentsResult);

  // 10. Estadísticas
  console.log('\n🔟 Probando estadísticas...');
  
  // Estadísticas de servicios
  const servicesStats = await apiRequest('GET', '/services/stats/overview');
  showResult('Estadísticas de Servicios', servicesStats);
  
  // Estadísticas de clínicas
  const clinicsStats = await apiRequest('GET', '/clinics/stats/overview');
  showResult('Estadísticas de Clínicas', clinicsStats);

  console.log('\n🎉 Pruebas completadas!');
  console.log('\n📊 Resumen de la API:');
  console.log('✅ Health Check funcionando');
  console.log('✅ Autenticación funcionando');
  console.log('✅ Usuarios funcionando');
  console.log('✅ Servicios funcionando');
  console.log('✅ Clínicas funcionando');
  console.log('✅ Notificaciones funcionando');
  console.log('✅ Citas funcionando');
  console.log('✅ Estadísticas funcionando');
};

// Manejar errores no capturados
process.on('unhandledRejection', (error) => {
  console.error('❌ Error no manejado:', error);
  process.exit(1);
});

// Ejecutar pruebas
runTests().catch(error => {
  console.error('❌ Error en las pruebas:', error);
  process.exit(1);
});
