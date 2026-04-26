require('dotenv').config();
const express = require('express');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');

// Importar configuraciones
const logger = require('./config/logger');
const security = require('./config/security');

// Importar rutas
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const appointmentRoutes = require('./routes/appointments');
const serviceRoutes = require('./routes/services');
const clinicRoutes = require('./routes/clinics');
const notificationRoutes = require('./routes/notifications');
const paymentRoutes = require('./routes/payments');
// const medicalHistoryRoutes = require('./routes/medicalHistory');
// const medicalAuthorizationRoutes = require('./routes/medicalAuthorization');
// const chatRoutes = require('./routes/chat');
const reviewRoutes = require('./routes/reviews');
// const uploadRoutes = require('./routes/uploads');

// Importar middleware
const { authenticateToken } = require('./middleware/auth');
const { handleError } = require('./middleware/errorHandler');
const notFoundHandler = require('./middleware/notFoundHandler');

const app = express();

// Configurar middleware
function setupMiddleware() {
  // Middleware de seguridad
  app.use(security.getSecurityMiddleware());
  app.use(security.getHelmetMiddleware());
  app.use(security.getCorsMiddleware());
  app.use(security.getRateLimitMiddleware());
  
  // Middleware de compresión
  app.use(compression());
  
  // Middleware de logging
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim())
    }
  }));
  
  // Middleware de parsing
  app.use(express.json({ 
    limit: process.env.MAX_FILE_SIZE || '10mb',
    verify: (req, res, buf) => {
      req.rawBody = buf;
    }
  }));
  app.use(express.urlencoded({ 
    extended: true, 
    limit: process.env.MAX_FILE_SIZE || '10mb' 
  }));
  
  // Middleware para archivos estáticos
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
  app.use('/public', express.static(path.join(__dirname, 'public')));
}

// Configurar rutas
function setupRoutes() {
  // Rutas de autenticación
  app.use('/api/v1/auth', authRoutes);
  
  // Rutas protegidas
  app.use('/api/v1/users', authenticateToken, userRoutes);
  app.use('/api/v1/appointments', authenticateToken, appointmentRoutes);
  app.use('/api/v1/services', authenticateToken, serviceRoutes);
  app.use('/api/v1/clinics', authenticateToken, clinicRoutes);
  app.use('/api/v1/notifications', authenticateToken, notificationRoutes);
  app.use('/api/v1/payments', authenticateToken, paymentRoutes);
  // app.use('/api/v1/medical-history', authenticateToken, medicalHistoryRoutes);
  // app.use('/api/v1/medical-authorizations', authenticateToken, medicalAuthorizationRoutes);
  // app.use('/api/v1/chat', authenticateToken, chatRoutes);
  app.use('/api/v1/reviews', authenticateToken, reviewRoutes);
  // app.use('/api/v1/uploads', authenticateToken, uploadRoutes);
  
  // Ruta de salud
  app.get('/api/v1/health', (req, res) => {
    res.status(200).json({
      status: 'OK',
      message: 'Turnario API está funcionando correctamente',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0'
    });
  });
}

// Configurar manejo de errores
function setupErrorHandling() {
  // Middleware para manejar rutas no encontradas
  app.use(notFoundHandler);
  
  // Middleware para manejo de errores
  app.use(handleError);
}

// Inicializar la aplicación
function initializeApp() {
  setupMiddleware();
  setupRoutes();
  setupErrorHandling();
}

// Inicializar si no estamos en modo test
if (process.env.NODE_ENV !== 'test') {
  initializeApp();
}

module.exports = { app, initializeApp };
