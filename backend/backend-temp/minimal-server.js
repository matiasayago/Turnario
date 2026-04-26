const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const app = express();
const port = 3000;

// Configurar middleware básico
app.use(cors({
  origin: ['http://localhost:19006', 'http://localhost:3000', 'http://192.168.0.4:3000'],
  credentials: true
}));

app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Turnario API está funcionando correctamente',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: 'development',
    version: '1.0.0'
  });
});

// API routes básicas
const apiPrefix = '/api/v1';

// Ruta de citas básica
app.get(`${apiPrefix}/appointments`, (req, res) => {
  res.status(200).json({
    appointments: [],
    total: 0,
    page: 1,
    totalPages: 0,
    message: 'Servidor funcionando - datos de prueba'
  });
});

// Ruta de usuarios básica
app.get(`${apiPrefix}/users`, (req, res) => {
  res.status(200).json({
    users: [],
    total: 0,
    message: 'Servidor funcionando - datos de prueba'
  });
});

// Ruta de servicios básica
app.get(`${apiPrefix}/services`, (req, res) => {
  res.status(200).json({
    services: [],
    total: 0,
    message: 'Servidor funcionando - datos de prueba'
  });
});

// Ruta de clínicas básica
app.get(`${apiPrefix}/clinics`, (req, res) => {
  res.status(200).json({
    clinics: [],
    total: 0,
    message: 'Servidor funcionando - datos de prueba'
  });
});

// Ruta de notificaciones básica
app.get(`${apiPrefix}/notifications`, (req, res) => {
  res.status(200).json({
    notifications: [],
    total: 0,
    message: 'Servidor funcionando - datos de prueba'
  });
});

// Ruta de disponibilidad básica
app.get(`${apiPrefix}/availability`, (req, res) => {
  res.status(200).json({
    availability: [],
    message: 'Servidor funcionando - datos de prueba'
  });
});

// Manejo de errores básico
app.use((req, res) => {
  res.status(404).json({
    error: 'Ruta no encontrada',
    message: `La ruta ${req.method} ${req.path} no existe`,
    availableRoutes: [
      'GET /health',
      'GET /api/v1/appointments',
      'GET /api/v1/users',
      'GET /api/v1/services',
      'GET /api/v1/clinics',
      'GET /api/v1/notifications',
      'GET /api/v1/availability'
    ]
  });
});

// Iniciar servidor
app.listen(port, () => {
  console.log(`🌐 Servidor minimal ejecutándose en puerto ${port}`);
  console.log(`🔗 URL: http://localhost:${port}`);
  console.log(`📱 API: http://localhost:${port}${apiPrefix}`);
  console.log(`❤️ Health: http://localhost:${port}/health`);
  console.log('🎉 Servidor minimal iniciado exitosamente');
});

// Manejar señales de terminación
process.on('SIGINT', () => {
  console.log('🔄 Cerrando servidor...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('🔄 Cerrando servidor...');
  process.exit(0);
});