/**
 * Script de prueba para verificar la conexión con la API
 */

const http = require('http');

function testApiConnection() {
  console.log('🧪 Probando conexión con la API...\n');

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/health',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const req = http.request(options, (res) => {
    console.log(`✅ Status: ${res.statusCode}`);
    console.log(`✅ Headers:`, res.headers);

    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      console.log('✅ Response:', data);
      
      if (res.statusCode === 200) {
        console.log('\n🎉 ¡API funcionando correctamente!');
        console.log('📋 Próximos pasos:');
        console.log('   1. El servidor minimal está ejecutándose en http://localhost:3000');
        console.log('   2. La API está disponible en http://localhost:3000/api/v1');
        console.log('   3. Los errores 404 deberían estar solucionados');
        console.log('   4. El frontend puede conectarse al backend');
      } else {
        console.log('\n❌ Error en la API');
      }
    });
  });

  req.on('error', (error) => {
    console.error('❌ Error conectando a la API:', error.message);
    console.log('\n💡 Soluciones:');
    console.log('   1. Asegúrate de que el servidor esté ejecutándose: node minimal-server.js');
    console.log('   2. Verifica que el puerto 3000 esté disponible');
    console.log('   3. Revisa la configuración de firewall');
  });

  req.end();
}

// Ejecutar la prueba
testApiConnection();
