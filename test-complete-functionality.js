/**
 * Suite de pruebas completa para validar toda la funcionalidad de la aplicación
 */

const http = require('http');
const https = require('https');

class TurnarioTester {
  constructor() {
    this.baseUrl = 'http://192.168.0.4:3000';
    this.results = {
      backend: { passed: 0, failed: 0, tests: [] },
      api: { passed: 0, failed: 0, tests: [] },
      integration: { passed: 0, failed: 0, tests: [] }
    };
  }

  async makeRequest(endpoint, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
      const url = `${this.baseUrl}${endpoint}`;
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      };

      const req = http.request(url, options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            const jsonBody = body ? JSON.parse(body) : {};
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              body: jsonBody,
              rawBody: body
            });
          } catch (error) {
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              body: body,
              rawBody: body
            });
          }
        });
      });

      req.on('error', reject);
      
      if (data) {
        req.write(JSON.stringify(data));
      }
      
      req.end();
    });
  }

  logTest(category, testName, passed, details = '') {
    const status = passed ? '✅' : '❌';
    const message = `${status} ${testName}`;
    console.log(`   ${message}${details ? ` - ${details}` : ''}`);
    
    this.results[category].tests.push({ name: testName, passed, details });
    if (passed) {
      this.results[category].passed++;
    } else {
      this.results[category].failed++;
    }
  }

  async testBackendHealth() {
    console.log('🏥 Probando salud del backend...');
    
    try {
      const response = await this.makeRequest('/health');
      const passed = response.statusCode === 200 && response.body.status === 'OK';
      this.logTest('backend', 'Health Check', passed, 
        passed ? `Status: ${response.body.status}` : `Status: ${response.statusCode}`);
      return passed;
    } catch (error) {
      this.logTest('backend', 'Health Check', false, error.message);
      return false;
    }
  }

  async testAPIEndpoints() {
    console.log('\n🔌 Probando endpoints de la API...');
    
    const endpoints = [
      { path: '/api/v1/appointments', name: 'Appointments API' },
      { path: '/api/v1/users', name: 'Users API' },
      { path: '/api/v1/services', name: 'Services API' },
      { path: '/api/v1/clinics', name: 'Clinics API' },
      { path: '/api/v1/notifications', name: 'Notifications API' },
      { path: '/api/v1/availability', name: 'Availability API' }
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await this.makeRequest(endpoint.path);
        const passed = response.statusCode === 200;
        this.logTest('api', endpoint.name, passed, 
          passed ? `Status: ${response.statusCode}` : `Status: ${response.statusCode}`);
      } catch (error) {
        this.logTest('api', endpoint.name, false, error.message);
      }
    }
  }

  async testAuthenticationFlow() {
    console.log('\n🔐 Probando flujo de autenticación...');
    
    // Test 1: Login con credenciales de prueba
    try {
      const loginData = {
        email: 'test@example.com',
        password: 'password'
      };
      
      const response = await this.makeRequest('/api/v1/auth/login', 'POST', loginData);
      const passed = response.statusCode === 200 || response.statusCode === 201;
      this.logTest('integration', 'Login API', passed, 
        passed ? `Status: ${response.statusCode}` : `Status: ${response.statusCode}`);
    } catch (error) {
      this.logTest('integration', 'Login API', false, error.message);
    }

    // Test 2: Registro de usuario
    try {
      const registerData = {
        email: 'testuser@example.com',
        password: 'testpassword123',
        name: 'Test User',
        userType: 'client'
      };
      
      const response = await this.makeRequest('/api/v1/auth/register', 'POST', registerData);
      const passed = response.statusCode === 200 || response.statusCode === 201;
      this.logTest('integration', 'Register API', passed, 
        passed ? `Status: ${response.statusCode}` : `Status: ${response.statusCode}`);
    } catch (error) {
      this.logTest('integration', 'Register API', false, error.message);
    }
  }

  async testAppointmentManagement() {
    console.log('\n📅 Probando gestión de citas...');
    
    // Test 1: Obtener citas
    try {
      const response = await this.makeRequest('/api/v1/appointments');
      const passed = response.statusCode === 200;
      this.logTest('integration', 'Get Appointments', passed, 
        passed ? `Found ${response.body.appointments?.length || 0} appointments` : `Status: ${response.statusCode}`);
    } catch (error) {
      this.logTest('integration', 'Get Appointments', false, error.message);
    }

    // Test 2: Crear cita
    try {
      const appointmentData = {
        userId: 'test-user-id',
        professionalId: 'test-professional-id',
        serviceId: 'test-service-id',
        date: '2024-12-25',
        time: '10:00',
        status: 'pending',
        notes: 'Test appointment'
      };
      
      const response = await this.makeRequest('/api/v1/appointments', 'POST', appointmentData);
      const passed = response.statusCode === 200 || response.statusCode === 201;
      this.logTest('integration', 'Create Appointment', passed, 
        passed ? `Status: ${response.statusCode}` : `Status: ${response.statusCode}`);
    } catch (error) {
      this.logTest('integration', 'Create Appointment', false, error.message);
    }
  }

  async testCORSAndHeaders() {
    console.log('\n🌐 Probando CORS y headers...');
    
    try {
      const response = await this.makeRequest('/health');
      const corsHeader = response.headers['access-control-allow-origin'];
      const contentType = response.headers['content-type'];
      
      const corsPassed = corsHeader !== undefined;
      const contentTypePassed = contentType && contentType.includes('application/json');
      
      this.logTest('backend', 'CORS Headers', corsPassed, 
        corsPassed ? `Origin: ${corsHeader}` : 'No CORS headers found');
      this.logTest('backend', 'Content-Type JSON', contentTypePassed, 
        contentTypePassed ? `Type: ${contentType}` : `Type: ${contentType}`);
    } catch (error) {
      this.logTest('backend', 'CORS Headers', false, error.message);
      this.logTest('backend', 'Content-Type JSON', false, error.message);
    }
  }

  async testErrorHandling() {
    console.log('\n⚠️ Probando manejo de errores...');
    
    // Test 1: Endpoint inexistente
    try {
      const response = await this.makeRequest('/api/v1/nonexistent');
      const passed = response.statusCode === 404;
      this.logTest('integration', '404 Error Handling', passed, 
        passed ? `Status: ${response.statusCode}` : `Status: ${response.statusCode}`);
    } catch (error) {
      this.logTest('integration', '404 Error Handling', false, error.message);
    }

    // Test 2: Método no permitido
    try {
      const response = await this.makeRequest('/health', 'DELETE');
      const passed = response.statusCode === 405 || response.statusCode === 404;
      this.logTest('integration', 'Method Not Allowed', passed, 
        passed ? `Status: ${response.statusCode}` : `Status: ${response.statusCode}`);
    } catch (error) {
      this.logTest('integration', 'Method Not Allowed', false, error.message);
    }
  }

  async testPerformance() {
    console.log('\n⚡ Probando rendimiento...');
    
    const startTime = Date.now();
    try {
      const response = await this.makeRequest('/health');
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      const passed = responseTime < 1000; // Menos de 1 segundo
      this.logTest('backend', 'Response Time', passed, 
        `Time: ${responseTime}ms`);
    } catch (error) {
      this.logTest('backend', 'Response Time', false, error.message);
    }
  }

  printResults() {
    console.log('\n📊 RESULTADOS DE LA PRUEBA COMPLETA:');
    console.log('=====================================');
    
    Object.entries(this.results).forEach(([category, result]) => {
      const total = result.passed + result.failed;
      const percentage = total > 0 ? Math.round((result.passed / total) * 100) : 0;
      const status = percentage >= 80 ? '✅' : percentage >= 60 ? '⚠️' : '❌';
      
      console.log(`\n${category.toUpperCase()}:`);
      console.log(`   ${status} ${result.passed}/${total} pruebas exitosas (${percentage}%)`);
      
      if (result.failed > 0) {
        console.log('   Pruebas fallidas:');
        result.tests.filter(t => !t.passed).forEach(test => {
          console.log(`     ❌ ${test.name} - ${test.details}`);
        });
      }
    });

    const totalPassed = Object.values(this.results).reduce((sum, r) => sum + r.passed, 0);
    const totalTests = Object.values(this.results).reduce((sum, r) => sum + r.passed + r.failed, 0);
    const overallPercentage = totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0;
    
    console.log('\n🎯 RESULTADO GENERAL:');
    console.log(`   ${totalPassed}/${totalTests} pruebas exitosas (${overallPercentage}%)`);
    
    if (overallPercentage >= 90) {
      console.log('\n🎉 ¡EXCELENTE! La aplicación está funcionando correctamente');
      console.log('✅ Todas las funcionalidades principales están operativas');
      console.log('✅ El backend está respondiendo correctamente');
      console.log('✅ La integración está funcionando');
    } else if (overallPercentage >= 70) {
      console.log('\n⚠️ BUENO, pero hay algunas áreas que necesitan atención');
      console.log('✅ La mayoría de funcionalidades están operativas');
      console.log('⚠️ Revisa las pruebas fallidas para mejoras');
    } else {
      console.log('\n❌ La aplicación necesita trabajo adicional');
      console.log('❌ Hay problemas significativos que resolver');
      console.log('🔧 Revisa los errores y corrige los problemas');
    }
  }

  async runAllTests() {
    console.log('🚀 INICIANDO PRUEBA COMPLETA DE FUNCIONALIDAD');
    console.log('=============================================\n');
    
    // Verificar que el backend esté funcionando
    const backendHealthy = await this.testBackendHealth();
    if (!backendHealthy) {
      console.log('\n❌ El backend no está funcionando. Inicia el servidor primero:');
      console.log('   cd backend && node minimal-server.js');
      return;
    }

    // Ejecutar todas las pruebas
    await this.testAPIEndpoints();
    await this.testAuthenticationFlow();
    await this.testAppointmentManagement();
    await this.testCORSAndHeaders();
    await this.testErrorHandling();
    await this.testPerformance();

    // Mostrar resultados
    this.printResults();
  }
}

// Ejecutar las pruebas
const tester = new TurnarioTester();
tester.runAllTests().catch(console.error);
