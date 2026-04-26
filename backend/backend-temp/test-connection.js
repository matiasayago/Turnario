const http = require('http');

function testEndpoint(path, description) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          console.log(`✅ ${description}: ${res.statusCode}`);
          console.log(`   Response: ${JSON.stringify(jsonData, null, 2)}`);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (error) {
          console.log(`✅ ${description}: ${res.statusCode}`);
          console.log(`   Response: ${data}`);
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (error) => {
      console.log(`❌ ${description}: Error`);
      console.log(`   Error: ${error.message}`);
      reject(error);
    });

    req.setTimeout(5000, () => {
      console.log(`⏰ ${description}: Timeout`);
      req.destroy();
      reject(new Error('Timeout'));
    });

    req.end();
  });
}

async function runTests() {
  console.log('🧪 Probando conexión con el servidor Turnario...\n');

  const tests = [
    { path: '/health', description: 'Health Check' },
    { path: '/api/v1', description: 'API v1 Info' },
    { path: '/api/v1/health', description: 'API v1 Health' },
    { path: '/api/v1/services', description: 'Services' },
    { path: '/api/v1/clinics', description: 'Clinics' },
    { path: '/api/v1/notifications', description: 'Notifications' }
  ];

  for (const test of tests) {
    try {
      await testEndpoint(test.path, test.description);
      console.log(''); // Línea en blanco
    } catch (error) {
      console.log(`❌ ${test.description}: Falló`);
      console.log(`   Error: ${error.message}\n`);
    }
  }

  console.log('🎉 Pruebas completadas!');
}

// Ejecutar las pruebas
runTests().catch(console.error);