#!/usr/bin/env node

// Script para probar la conexión completa entre frontend y backend
const http = require('http');
const https = require('https');

console.log('🚀 Probando conexión completa Frontend-Backend');
console.log('==============================================');
console.log('');

const BACKEND_URL = 'http://localhost:3001';

// Función para hacer peticiones HTTP
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Turnario-Connection-Test/1.0',
        ...options.headers
      }
    };

    const req = client.request(requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: jsonData
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

// Función para probar endpoint
async function testEndpoint(name, url, options = {}) {
  try {
    console.log(`🔍 Probando ${name}...`);
    const response = await makeRequest(url, options);
    
    if (response.status >= 200 && response.status < 300) {
      console.log(`✅ ${name}: OK (${response.status})`);
      if (response.data && response.data.message) {
        console.log(`   Mensaje: ${response.data.message}`);
      }
      return true;
    } else {
      console.log(`❌ ${name}: Error (${response.status})`);
      if (response.data && response.data.error) {
        console.log(`   Error: ${response.data.error}`);
      }
      return false;
    }
  } catch (error) {
    console.log(`❌ ${name}: Error de conexión`);
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

// Función principal
async function runTests() {
  const tests = [
    {
      name: 'Endpoint de salud',
      url: `${BACKEND_URL}/api/v1/health`,
      method: 'GET'
    },
    {
      name: 'Endpoint de conexión',
      url: `${BACKEND_URL}/api/v1/test-connection`,
      method: 'GET'
    },
    {
      name: 'Endpoint de CORS',
      url: `${BACKEND_URL}/api/v1/test-cors`,
      method: 'GET',
      headers: {
        'Origin': 'http://localhost:19006'
      }
    },
    {
      name: 'Endpoint de autenticación (sin token)',
      url: `${BACKEND_URL}/api/v1/test-auth`,
      method: 'POST'
    },
    {
      name: 'Endpoint de autenticación (con token)',
      url: `${BACKEND_URL}/api/v1/test-auth`,
      method: 'POST',
      headers: {
        'Authorization': 'Bearer test-token'
      }
    }
  ];

  let passedTests = 0;
  let totalTests = tests.length;

  console.log(`📍 URL del backend: ${BACKEND_URL}`);
  console.log('');

  for (const test of tests) {
    const passed = await testEndpoint(test.name, test.url, {
      method: test.method,
      headers: test.headers
    });
    
    if (passed) {
      passedTests++;
    }
    
    console.log('');
  }

  // Resumen
  console.log('📊 Resumen de pruebas:');
  console.log(`   Pruebas pasadas: ${passedTests}/${totalTests}`);
  console.log(`   Porcentaje: ${Math.round((passedTests / totalTests) * 100)}%`);
  console.log('');

  if (passedTests === totalTests) {
    console.log('🎉 ¡Todas las pruebas pasaron!');
    console.log('✅ La conexión frontend-backend está funcionando correctamente');
    console.log('');
    console.log('📋 Próximos pasos:');
    console.log('   1. Inicia el frontend: cd my-app && npm start');
    console.log('   2. Prueba la autenticación desde la app');
    console.log('   3. Verifica que las peticiones lleguen al backend');
  } else {
    console.log('⚠️ Algunas pruebas fallaron');
    console.log('🔧 Verifica:');
    console.log('   1. Que el backend esté ejecutándose');
    console.log('   2. Que el puerto 3001 esté disponible');
    console.log('   3. Que no haya problemas de CORS');
    console.log('   4. Que la configuración sea correcta');
  }

  console.log('');
  console.log('💡 Para más información, consulta:');
  console.log('   - FRONTEND_BACKEND_CONNECTION.md');
  console.log('   - backend/MONGODB_SETUP.md');
}

// Ejecutar pruebas
runTests().catch((error) => {
  console.error('❌ Error ejecutando pruebas:', error);
  process.exit(1);
});
