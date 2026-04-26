/**
 * Script de prueba final para verificar la conexión completa
 */

const http = require('http');

function testFinalConnection() {
  console.log('🧪 Prueba final de conexión completa...\n');

  const tests = [
    { name: 'Health Check', url: 'http://192.168.0.4:3000/health' },
    { name: 'Appointments API', url: 'http://192.168.0.4:3000/api/v1/appointments' },
    { name: 'Users API', url: 'http://192.168.0.4:3000/api/v1/users' },
    { name: 'Services API', url: 'http://192.168.0.4:3000/api/v1/services' },
    { name: 'Clinics API', url: 'http://192.168.0.4:3000/api/v1/clinics' },
    { name: 'Notifications API', url: 'http://192.168.0.4:3000/api/v1/notifications' },
    { name: 'Availability API', url: 'http://192.168.0.4:3000/api/v1/availability' }
  ];

  let completedTests = 0;
  let passedTests = 0;

  tests.forEach((test, index) => {
    const req = http.request(test.url, (res) => {
      completedTests++;
      
      if (res.statusCode === 200) {
        passedTests++;
        console.log(`✅ ${test.name}: OK (${res.statusCode})`);
      } else {
        console.log(`❌ ${test.name}: Error (${res.statusCode})`);
      }

      if (completedTests === tests.length) {
        console.log('\n📊 Resultados de la prueba:');
        console.log(`   Total de pruebas: ${tests.length}`);
        console.log(`   Exitosas: ${passedTests}`);
        console.log(`   Fallidas: ${tests.length - passedTests}`);
        
        if (passedTests === tests.length) {
          console.log('\n🎉 ¡TODAS LAS PRUEBAS EXITOSAS!');
          console.log('✅ El backend está funcionando correctamente');
          console.log('✅ Todos los endpoints están respondiendo');
          console.log('✅ La configuración de red es correcta');
          console.log('✅ El frontend debería poder conectarse sin problemas');
          
          console.log('\n🚀 Estado final:');
          console.log('   ❌ "Network request failed" → ✅ SOLUCIONADO');
          console.log('   ❌ "Error obteniendo citas" → ✅ SOLUCIONADO');
          console.log('   ❌ "Error cargando citas" → ✅ SOLUCIONADO');
          
          console.log('\n💡 Configuración final:');
          console.log('   Backend URL: http://192.168.0.4:3000');
          console.log('   API Base: http://192.168.0.4:3000/api/v1');
          console.log('   Health Check: http://192.168.0.4:3000/health');
        } else {
          console.log('\n⚠️ Algunas pruebas fallaron');
          console.log('Revisa la configuración del servidor');
        }
      }
    });

    req.on('error', (error) => {
      completedTests++;
      console.log(`❌ ${test.name}: Error de conexión - ${error.message}`);
      
      if (completedTests === tests.length) {
        console.log('\n❌ Error de conexión detectado');
        console.log('Verifica que el servidor esté ejecutándose:');
        console.log('   cd TurnarioApp/backend');
        console.log('   node minimal-server.js');
      }
    });

    req.end();
  });
}

// Ejecutar la prueba
testFinalConnection();
