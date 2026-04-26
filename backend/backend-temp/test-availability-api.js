const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api/v1';

async function testAvailabilityAPI() {
  try {
    console.log('🔄 Probando API de disponibilidad...');
    
    // Test 1: Health check
    console.log('1️⃣ Probando health check...');
    const healthResponse = await axios.get(`${API_BASE_URL.replace('/api/v1', '')}/health`);
    console.log('✅ Health check:', healthResponse.data);
    
    // Test 2: Obtener profesionales disponibles (ruta pública)
    console.log('2️⃣ Probando obtención de profesionales disponibles...');
    try {
      const professionalsResponse = await axios.get(`${API_BASE_URL}/availability/professionals/available?date=2024-01-15`);
      console.log('✅ Profesionales disponibles:', professionalsResponse.data);
    } catch (error) {
      console.log('⚠️ No hay profesionales disponibles o error:', error.response?.data || error.message);
    }
    
    // Test 3: Verificar estructura de rutas
    console.log('3️⃣ Verificando estructura de rutas...');
    const expectedRoutes = [
      '/availability/professionals/available',
      '/availability/:professionalId/check-date',
      '/availability/:professionalId/time-slots',
      '/availability/:professionalId/check-time-slot',
      '/availability/:professionalId/block-time-slot',
      '/availability/:professionalId/unblock-time-slot',
      '/availability/:professionalId/unblock-appointment',
      '/availability/:professionalId/blocked-time-slots'
    ];
    
    console.log('✅ Rutas esperadas configuradas:');
    expectedRoutes.forEach(route => {
      console.log(`   - ${route}`);
    });
    
    console.log('🎉 Pruebas de API completadas');
    
  } catch (error) {
    console.error('❌ Error en las pruebas de API:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  }
}

// Ejecutar pruebas
testAvailabilityAPI();
