const express = require('express'); 

const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Configurar CORS
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:8081',
    'http://localhost:8082',
    'http://localhost:19006',
    'http://localhost:19000',
    'exp://localhost:19000',
    'exp://192.168.1.100:19000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-API-Key',
    'X-Request-ID'
  ]
}));

// Middleware para parsing JSON
app.use(express.json());

// Endpoint de salud
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Servidor funcionando correctamente',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Endpoint de salud con prefijo API
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'API funcionando correctamente',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Endpoint de prueba de conexión
app.get('/api/v1/test-connection', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Conexión con el frontend establecida correctamente',
    timestamp: new Date().toISOString(),
    frontend: {
      userAgent: req.get('User-Agent'),
      origin: req.get('Origin'),
      referer: req.get('Referer')
    }
  });
});

// Endpoint de prueba de CORS
app.get('/api/v1/test-cors', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'CORS configurado correctamente',
    cors: {
      origin: req.get('Origin'),
      method: req.method,
      headers: req.headers
    }
  });
});

// Endpoint de prueba de autenticación
app.post('/api/v1/test-auth', (req, res) => {
  const authHeader = req.get('Authorization');
  
  if (!authHeader) {
    return res.status(401).json({
      status: 'ERROR',
      message: 'No se proporcionó token de autorización',
      required: 'Authorization: Bearer <token>'
    });
  }

  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      status: 'ERROR',
      message: 'Formato de token incorrecto',
      required: 'Authorization: Bearer <token>'
    });
  }

  res.status(200).json({
    status: 'OK',
    message: 'Token de autorización recibido correctamente',
    auth: {
      header: authHeader,
      token: authHeader.substring(7)
    }
  });
});

// Endpoint de login simulado
app.post('/api/v1/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({
      status: 'ERROR',
      message: 'Email y password son requeridos'
    });
  }

  // Simular login exitoso
  res.status(200).json({
    status: 'OK',
    message: 'Login exitoso',
    user: {
      id: '1',
      email: email,
      fullName: 'Usuario de Prueba',
      userType: 'patient'
    },
    token: 'fake-jwt-token-for-testing'
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log('🚀 Servidor simple iniciado');
  console.log('================================');
  // Endpoints de citas
  app.get('/api/v1/appointments', (req, res) => {
    console.log('📅 GET /api/v1/appointments - Obteniendo citas');
    
    // Datos de ejemplo de citas
    const appointments = [
      {
        id: 1,
        patientName: 'Juan Pérez',
        doctorName: 'Dr. Carlos Mendoza',
        date: '2024-01-15',
        time: '10:00',
        status: 'confirmed',
        service: 'Consulta General',
        notes: 'Revisión de rutina'
      },
      {
        id: 2,
        patientName: 'María García',
        doctorName: 'Dr. Carlos Mendoza',
        date: '2024-01-15',
        time: '11:00',
        status: 'pending',
        service: 'Consulta Especializada',
        notes: 'Seguimiento de tratamiento'
      }
    ];
    
    res.json({
      success: true,
      data: appointments,
      message: 'Citas obtenidas correctamente'
    });
  });

  app.post('/api/v1/appointments', (req, res) => {
    console.log('📅 POST /api/v1/appointments - Creando nueva cita');
    console.log('Datos recibidos:', req.body);
    
    const newAppointment = {
      id: Date.now(),
      ...req.body,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    
    res.status(201).json({
      success: true,
      data: newAppointment,
      message: 'Cita creada correctamente'
    });
  });

  app.get('/api/v1/appointments/available-slots', (req, res) => {
    console.log('📅 GET /api/v1/appointments/available-slots - Obteniendo horarios disponibles');
    
    const availableSlots = [
      { time: '09:00', available: true },
      { time: '09:30', available: false },
      { time: '10:00', available: true },
      { time: '10:30', available: true },
      { time: '11:00', available: false },
      { time: '11:30', available: true },
      { time: '14:00', available: true },
      { time: '14:30', available: true },
      { time: '15:00', available: false },
      { time: '15:30', available: true }
    ];
    
    res.json({
      success: true,
      data: availableSlots,
      message: 'Horarios disponibles obtenidos correctamente'
    });
  });

  console.log(`📍 Puerto: ${PORT}`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log('');
  console.log('🔗 Endpoints disponibles:');
  console.log(`   GET  http://localhost:${PORT}/health`);
  console.log(`   GET  http://localhost:${PORT}/api/v1/health`);
  console.log(`   GET  http://localhost:${PORT}/api/v1/test-connection`);
  console.log(`   GET  http://localhost:${PORT}/api/v1/test-cors`);
  console.log(`   POST http://localhost:${PORT}/api/v1/test-auth`);
  console.log(`   POST http://localhost:${PORT}/api/v1/auth/login`);
  console.log(`   GET  http://localhost:${PORT}/api/v1/appointments`);
  console.log(`   POST http://localhost:${PORT}/api/v1/appointments`);
  console.log(`   GET  http://localhost:${PORT}/api/v1/appointments/available-slots`);
  console.log('');
  console.log('🔄 Presiona Ctrl+C para detener el servidor');
});

// Manejar cierre graceful
process.on('SIGINT', () => {
  console.log('\n🛑 Deteniendo servidor...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Deteniendo servidor...');
  process.exit(0);
});