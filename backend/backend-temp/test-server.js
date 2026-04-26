const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Configuración de CORS para Expo
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
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization']
}));

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  console.log('Health check requested');
  res.json({
    status: 'OK',
    message: 'Turnario API funcionando',
    timestamp: new Date().toISOString()
  });
});

// API Health check
app.get('/api/v1/health', (req, res) => {
  console.log('API health check requested');
  res.json({
    status: 'OK',
    message: 'Turnario API v1 funcionando',
    timestamp: new Date().toISOString()
  });
});

// Login endpoint
app.post('/api/v1/auth/login', (req, res) => {
  console.log('Login request:', req.body);
  const { email, password } = req.body;
  
  if (email && password) {
    res.json({
      user: {
        _id: '507f1f77bcf86cd799439011',
        fullName: 'Usuario Demo',
        email: email,
        userType: 'client',
        isEmailVerified: true,
        isActive: true
      },
      token: 'mock_jwt_token_' + Date.now(),
      refreshToken: 'mock_refresh_token_' + Date.now(),
      expiresIn: 7 * 24 * 60 * 60 * 1000
    });
  } else {
    res.status(400).json({
      error: 'Credenciales inválidas',
      message: 'Email y contraseña son requeridos'
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log('🚀 Servidor Turnario iniciado');
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log(`📱 API: http://localhost:${PORT}/api/v1`);
  console.log(`❤️  Health: http://localhost:${PORT}/health`);
});

// Handle errors
process.on('uncaughtException', (error) => {
  console.error('❌ Error no capturado:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promesa rechazada:', reason);
});