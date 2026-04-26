#!/usr/bin/env node

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { app } = require('./app');

// Configurar CORS para pruebas
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

// Ruta de prueba específica para el frontend
app.get('/api/v1/test-connection', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Conexión con el frontend establecida correctamente',
    timestamp: new Date().toISOString(),
    frontend: {
      userAgent: req.get('User-Agent'),
      origin: req.get('Origin'),
      referer: req.get('Referer')
    },
    backend: {
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      port: process.env.PORT || 3001
    }
  });
});

// Ruta de prueba para CORS
app.options('/api/v1/test-cors', (req, res) => {
  res.status(200).end();
});

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

// Ruta de prueba para autenticación
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

// Iniciar servidor de prueba
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log('🚀 Servidor de prueba iniciado');
  console.log('================================');
  console.log(`📍 Puerto: ${PORT}`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log('');
  console.log('🔗 Endpoints de prueba:');
  console.log(`   GET  http://localhost:${PORT}/api/v1/health`);
  console.log(`   GET  http://localhost:${PORT}/api/v1/test-connection`);
  console.log(`   GET  http://localhost:${PORT}/api/v1/test-cors`);
  console.log(`   POST http://localhost:${PORT}/api/v1/test-auth`);
  console.log('');
  console.log('📱 Para probar desde el frontend:');
  console.log('   1. Asegúrate de que EXPO_PUBLIC_BACKEND_URL=http://localhost:3001');
  console.log('   2. Ejecuta: npm run test-connection');
  console.log('   3. Verifica que las peticiones lleguen correctamente');
  console.log('');
  console.log('🔄 Presiona Ctrl+C para detener el servidor');
});

// Manejar cierre graceful
process.on('SIGINT', () => {
  console.log('\n🛑 Deteniendo servidor de prueba...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Deteniendo servidor de prueba...');
  process.exit(0);
});
