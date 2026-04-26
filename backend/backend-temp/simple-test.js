console.log('🚀 Iniciando servidor de prueba...');

const http = require('http');

const server = http.createServer((req, res) => {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);

  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'OK',
      message: 'Turnario API funcionando',
      timestamp: new Date().toISOString()
    }));
  } else if (req.url === '/api/v1') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'OK',
      message: 'Turnario API v1 disponible',
      version: '1.0.0',
      endpoints: [
        '/api/v1/health',
        '/api/v1/auth/login',
        '/api/v1/auth/register',
        '/api/v1/users/profile/me',
        '/api/v1/appointments',
        '/api/v1/services',
        '/api/v1/clinics',
        '/api/v1/notifications'
      ],
      timestamp: new Date().toISOString()
    }));
  } else if (req.url === '/api/v1/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'OK',
      message: 'Turnario API v1 funcionando',
      timestamp: new Date().toISOString()
    }));
  } else if (req.url === '/api/v1/auth/login' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      console.log('Login request body:', body);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        user: {
          _id: '507f1f77bcf86cd799439011',
          fullName: 'Usuario Demo',
          email: 'test@turnario.com',
          userType: 'client',
          isEmailVerified: true,
          isActive: true
        },
        token: 'mock_jwt_token_' + Date.now(),
        refreshToken: 'mock_refresh_token_' + Date.now(),
        expiresIn: 7 * 24 * 60 * 60 * 1000
             }));
     });
   } else if (req.url === '/api/v1/auth/register' && req.method === 'POST') {
     let body = '';
     req.on('data', chunk => {
       body += chunk.toString();
     });
     req.on('end', () => {
       console.log('Register request body:', body);
       res.writeHead(201, { 'Content-Type': 'application/json' });
       res.end(JSON.stringify({
         user: {
           _id: '507f1f77bcf86cd799439012',
           fullName: 'Usuario Registrado',
           email: 'nuevo@turnario.com',
           userType: 'client',
           isEmailVerified: false,
           isActive: true
         },
         token: 'mock_jwt_token_' + Date.now(),
         refreshToken: 'mock_refresh_token_' + Date.now(),
         expiresIn: 7 * 24 * 60 * 60 * 1000
       }));
     });
   } else if (req.url === '/api/v1/users/profile/me') {
     res.writeHead(200, { 'Content-Type': 'application/json' });
     res.end(JSON.stringify({
       _id: '507f1f77bcf86cd799439011',
       fullName: 'Usuario Demo',
       email: 'demo@turnario.com',
       userType: 'client',
       isEmailVerified: true,
       isActive: true,
       createdAt: new Date().toISOString(),
       updatedAt: new Date().toISOString()
     }));
   } else if (req.url === '/api/v1/appointments') {
     res.writeHead(200, { 'Content-Type': 'application/json' });
     res.end(JSON.stringify([
       {
         _id: '507f1f77bcf86cd799439013',
         clientId: '507f1f77bcf86cd799439011',
         serviceId: '507f1f77bcf86cd799439014',
         date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
         time: '10:00',
         status: 'confirmed',
         notes: 'Cita de prueba'
       }
     ]));
   } else if (req.url === '/api/v1/services') {
     res.writeHead(200, { 'Content-Type': 'application/json' });
     res.end(JSON.stringify([
       {
         _id: '507f1f77bcf86cd799439014',
         name: 'Consulta General',
         description: 'Consulta médica general',
         duration: 30,
         price: 5000,
         category: 'medicina'
       }
     ]));
   } else if (req.url === '/api/v1/clinics') {
     res.writeHead(200, { 'Content-Type': 'application/json' });
     res.end(JSON.stringify([
       {
         _id: '507f1f77bcf86cd799439015',
         name: 'Clínica Demo',
         address: 'Av. Principal 123',
         phone: '+56912345678',
         email: 'info@clinicademo.com'
       }
     ]));
   } else if (req.url === '/api/v1/notifications') {
     res.writeHead(200, { 'Content-Type': 'application/json' });
     res.end(JSON.stringify([
       {
         _id: '507f1f77bcf86cd799439016',
         title: 'Nueva cita confirmada',
         message: 'Tu cita ha sido confirmada para mañana',
         type: 'appointment',
         isRead: false,
         createdAt: new Date().toISOString()
       }
     ]));
   } else {
     res.writeHead(404, { 'Content-Type': 'application/json' });
     res.end(JSON.stringify({
       error: 'Ruta no encontrada',
       message: `La ruta ${req.url} no existe`,
       availableEndpoints: [
         '/health',
         '/api/v1',
         '/api/v1/health',
         '/api/v1/auth/login',
         '/api/v1/auth/register',
         '/api/v1/users/profile/me',
         '/api/v1/appointments',
         '/api/v1/services',
         '/api/v1/clinics',
         '/api/v1/notifications'
       ]
     }));
   }
});

const PORT = 3000;

server.listen(PORT, '0.0.0.0', () => {
  console.log('✅ Servidor iniciado exitosamente');
  console.log(`🌐 URL Local: http://localhost:${PORT}`);
  console.log(`🌐 URL Red: http://192.168.0.4:${PORT}`);
  console.log(`📱 API: http://192.168.0.4:${PORT}/api/v1`);
  console.log(`❤️  Health: http://192.168.0.4:${PORT}/health`);
  console.log('📋 CORS configurado para todas las rutas');
  console.log('📱 Accesible desde dispositivos móviles en la misma red');
});

server.on('error', (error) => {
  console.error('❌ Error del servidor:', error);
});

process.on('SIGINT', () => {
  console.log('\n🔄 Cerrando servidor...');
  server.close(() => {
    console.log('✅ Servidor cerrado');
    process.exit(0);
  });
});
