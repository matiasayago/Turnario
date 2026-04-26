require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de CORS para Expo
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://localhost:8081',
    'http://localhost:8082',
    'http://localhost:19006', // Expo web
    'http://localhost:19000', // Expo dev tools
    'exp://localhost:19000',  // Expo
    'exp://192.168.1.100:19000', // Expo en red local
    'exp://192.168.1.101:19000',
    'exp://192.168.1.102:19000',
    'exp://192.168.1.103:19000',
    'exp://192.168.1.104:19000',
    'exp://192.168.1.105:19000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-API-Key'
  ]
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Turnario API está funcionando correctamente',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API Health check
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Turnario API v1 está funcionando correctamente',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Rutas de autenticación básicas
app.post('/api/v1/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  console.log('Login attempt:', { email, password: password ? '***' : 'undefined' });
  
  // Simulación de login exitoso
  if (email && password) {
    const mockUser = {
      _id: '507f1f77bcf86cd799439011',
      fullName: 'Usuario Demo',
      email: email,
      userType: 'client',
      isEmailVerified: true,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const mockToken = 'mock_jwt_token_' + Date.now();
    
    res.status(200).json({
      user: mockUser,
      token: mockToken,
      refreshToken: 'mock_refresh_token_' + Date.now(),
      expiresIn: 7 * 24 * 60 * 60 * 1000 // 7 días
    });
  } else {
    res.status(400).json({
      error: 'Credenciales inválidas',
      message: 'Email y contraseña son requeridos'
    });
  }
});

app.post('/api/v1/auth/register', (req, res) => {
  const { fullName, email, password, userType } = req.body;
  
  console.log('Register attempt:', { fullName, email, userType });
  
  if (fullName && email && password && userType) {
    const mockUser = {
      _id: '507f1f77bcf86cd799439012',
      fullName,
      email,
      userType,
      isEmailVerified: false,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const mockToken = 'mock_jwt_token_' + Date.now();
    
    res.status(201).json({
      user: mockUser,
      token: mockToken,
      refreshToken: 'mock_refresh_token_' + Date.now(),
      expiresIn: 7 * 24 * 60 * 60 * 1000
    });
  } else {
    res.status(400).json({
      error: 'Datos inválidos',
      message: 'Todos los campos son requeridos'
    });
  }
});

app.post('/api/v1/auth/logout', (req, res) => {
  console.log('Logout request');
  res.status(200).json({
    message: 'Sesión cerrada exitosamente'
  });
});

app.post('/api/v1/auth/refresh', (req, res) => {
  console.log('Token refresh request');
  res.status(200).json({
    token: 'mock_new_jwt_token_' + Date.now(),
    refreshToken: 'mock_new_refresh_token_' + Date.now(),
    expiresIn: 7 * 24 * 60 * 60 * 1000
  });
});

app.get('/api/v1/auth/verify', (req, res) => {
  console.log('Token verify request');
  res.status(200).json({
    valid: true,
    message: 'Token válido'
  });
});

// Rutas de usuarios
app.get('/api/v1/users/profile/me', (req, res) => {
  console.log('Get user profile request');
  const mockUser = {
    _id: '507f1f77bcf86cd799439011',
    fullName: 'Usuario Demo',
    email: 'demo@turnario.com',
    userType: 'client',
    isEmailVerified: true,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  res.status(200).json(mockUser);
});

// Rutas de citas
app.get('/api/v1/appointments', (req, res) => {
  console.log('Get appointments request');
  const mockAppointments = [
    {
      _id: '507f1f77bcf86cd799439013',
      clientId: '507f1f77bcf86cd799439011',
      serviceId: '507f1f77bcf86cd799439014',
      date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      time: '10:00',
      status: 'confirmed',
      notes: 'Cita de prueba'
    }
  ];
  
  res.status(200).json(mockAppointments);
});

// Rutas de servicios
app.get('/api/v1/services', (req, res) => {
  console.log('Get services request');
  const mockServices = [
    {
      _id: '507f1f77bcf86cd799439014',
      name: 'Consulta General',
      description: 'Consulta médica general',
      duration: 30,
      price: 5000,
      category: 'medicina'
    }
  ];
  
  res.status(200).json(mockServices);
});

// Rutas de clínicas
app.get('/api/v1/clinics', (req, res) => {
  console.log('Get clinics request');
  const mockClinics = [
    {
      _id: '507f1f77bcf86cd799439015',
      name: 'Clínica Demo',
      address: 'Av. Principal 123',
      phone: '+56912345678',
      email: 'info@clinicademo.com'
    }
  ];
  
  res.status(200).json(mockClinics);
});

// Rutas de notificaciones
app.get('/api/v1/notifications', (req, res) => {
  console.log('Get notifications request');
  const mockNotifications = [
    {
      _id: '507f1f77bcf86cd799439016',
      title: 'Nueva cita confirmada',
      message: 'Tu cita ha sido confirmada para mañana',
      type: 'appointment',
      isRead: false,
      createdAt: new Date().toISOString()
    }
  ];
  
  res.status(200).json(mockNotifications);
});

// Middleware de manejo de errores
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Error interno del servidor',
    message: err.message
  });
});

// Middleware para rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Ruta no encontrada',
    message: `La ruta ${req.originalUrl} no existe`
  });
});

// Función para conectar a MongoDB (opcional)
async function connectToDatabase() {
  try {
    if (process.env.MONGODB_URI) {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('✅ Conectado a MongoDB');
    } else {
      console.log('⚠️  MongoDB no configurado, usando datos mock');
    }
  } catch (error) {
    console.error('❌ Error conectando a MongoDB:', error.message);
    console.log('⚠️  Continuando con datos mock');
  }
}

// Iniciar servidor
async function startServer() {
  try {
    await connectToDatabase();
    
    app.listen(PORT, () => {
      console.log('🚀 Servidor Turnario iniciado');
      console.log(`🌐 URL: http://localhost:${PORT}`);
      console.log(`📱 API: http://localhost:${PORT}/api/v1`);
      console.log(`❤️  Health: http://localhost:${PORT}/health`);
      console.log('📋 CORS configurado para Expo');
    });
  } catch (error) {
    console.error('❌ Error iniciando servidor:', error);
    process.exit(1);
  }
}

// Manejar señales de terminación
process.on('SIGINT', () => {
  console.log('\n🔄 Cerrando servidor...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🔄 Cerrando servidor...');
  process.exit(0);
});

// Iniciar si es el archivo principal
if (require.main === module) {
  startServer();
}

module.exports = app;