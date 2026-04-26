require('dotenv').config();
const express = require('express');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');

// Importar configuraciones
const database = process.env.NODE_ENV === 'development' 
  ? require('./config/database-dev') 
  : require('./config/database');
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
const medicalHistoryRoutes = require('./routes/medicalHistory');
const medicalAuthorizationRoutes = require('./routes/medicalAuthorization');
const chatRoutes = require('./routes/chat');
const reviewRoutes = require('./routes/reviews');
const uploadRoutes = require('./routes/uploads');
const availabilityRoutes = require('./routes/availability');
const calendarRoutes = require('./routes/calendar');

// Importar middleware
const { authenticateToken } = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');
const notFoundHandler = require('./middleware/notFoundHandler');

// Importar WebSocket
const setupWebSocket = require('./websocket/setup');

class Server {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 3000;
    this.server = null;
  }

  async initialize() {
    try {
      logger.info('🚀 Iniciando servidor Turnario...');
      
      // Conectar a la base de datos
      logger.info('🔄 Conectando a la base de datos...');
      await database.connect();
      logger.info('✅ Base de datos conectada');
      
      // Configurar middleware
      logger.info('🔄 Configurando middleware...');
      this.setupMiddleware();
      logger.info('✅ Middleware configurado');
      
      // Configurar rutas
      logger.info('🔄 Configurando rutas...');
      this.setupRoutes();
      logger.info('✅ Rutas configuradas');
      
      // Configurar manejo de errores
      logger.info('🔄 Configurando manejo de errores...');
      this.setupErrorHandling();
      logger.info('✅ Manejo de errores configurado');
      
      // Iniciar servidor
      logger.info('🔄 Iniciando servidor...');
      await this.start();
      logger.info('✅ Servidor iniciado');
      
      // Configurar WebSocket
      setupWebSocket(this.server);
      
      logger.info('🎉 Servidor iniciado exitosamente');
      
    } catch (error) {
      logger.error('❌ Error iniciando servidor:', error);
      process.exit(1);
    }
  }

  setupMiddleware() {
    logger.info('🔄 Configurando middleware...');
    
    // Middleware de seguridad
    this.app.use(security.getSecurityMiddleware());
    this.app.use(security.getHelmetMiddleware());
    this.app.use(security.getCorsMiddleware());
    this.app.use(security.getRateLimitMiddleware());
    
    // Middleware de compresión
    this.app.use(compression());
    
    // Middleware de logging
    this.app.use(morgan('combined', {
      stream: {
        write: (message) => logger.info(message.trim())
      }
    }));
    
    // Middleware de parsing
    this.app.use(express.json({ 
      limit: process.env.MAX_FILE_SIZE || '10mb',
      verify: (req, res, buf) => {
        req.rawBody = buf;
      }
    }));
    this.app.use(express.urlencoded({ 
      extended: true, 
      limit: process.env.MAX_FILE_SIZE || '10mb' 
    }));
    
    // Middleware de archivos estáticos
    this.app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
    this.app.use('/public', express.static(path.join(__dirname, 'public')));
    
    // Middleware de validación de tamaño de archivo
    this.app.use(security.getFileSizeValidationMiddleware());
    
    logger.info('✅ Middleware configurado');
  }

  setupRoutes() {
    logger.info('🔄 Configurando rutas...');
    
    // Health check
    this.app.get('/health', (req, res) => {
      res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV,
        version: process.env.npm_package_version || '1.0.0'
      });
    });
    
    // API routes
    const apiVersion = process.env.API_VERSION || 'v1';
    const apiPrefix = `/api/${apiVersion}`;
    
    // Rutas públicas
    this.app.use(`${apiPrefix}/auth`, security.getAuthRateLimitMiddleware(), authRoutes);
    this.app.use(`${apiPrefix}/public`, serviceRoutes.public);
    this.app.use(`${apiPrefix}/public`, clinicRoutes.public);
    
    // Rutas protegidas
    this.app.use(`${apiPrefix}/users`, authenticateToken, userRoutes);
    this.app.use(`${apiPrefix}/appointments`, authenticateToken, appointmentRoutes);
    this.app.use(`${apiPrefix}/services`, authenticateToken, serviceRoutes.protected);
    this.app.use(`${apiPrefix}/clinics`, authenticateToken, clinicRoutes.protected);
    this.app.use(`${apiPrefix}/notifications`, authenticateToken, notificationRoutes);
    this.app.use(`${apiPrefix}/payments`, authenticateToken, security.getPaymentRateLimitMiddleware(), paymentRoutes);
    this.app.use(`${apiPrefix}/medical-history`, authenticateToken, medicalHistoryRoutes);
    this.app.use(`${apiPrefix}/medical-authorizations`, authenticateToken, medicalAuthorizationRoutes);
    this.app.use(`${apiPrefix}/chat`, authenticateToken, chatRoutes);
    this.app.use(`${apiPrefix}/reviews`, authenticateToken, reviewRoutes);
    this.app.use(`${apiPrefix}/uploads`, authenticateToken, security.getUploadRateLimitMiddleware(), uploadRoutes);
    this.app.use(`${apiPrefix}/availability`, availabilityRoutes);
    this.app.use(`${apiPrefix}/calendar`, calendarRoutes);
    
    // Ruta de documentación
    if (process.env.NODE_ENV === 'development') {
      const swaggerUi = require('swagger-ui-express');
      const swaggerSpec = require('./config/swagger');
      
      this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
      logger.info('📚 Documentación API disponible en /api-docs');
    }
    
    logger.info('✅ Rutas configuradas');
  }

  setupErrorHandling() {
    // Manejador de rutas no encontradas
    this.app.use(notFoundHandler);
    
    // Manejador de errores global
    this.app.use(errorHandler);
    
    logger.info('✅ Manejo de errores configurado');
  }

  async start() {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.port, () => {
          logger.info(`🌐 Servidor escuchando en puerto ${this.port}`);
          logger.info(`🔗 URL: http://localhost:${this.port}`);
          logger.info(`📱 API: http://localhost:${this.port}/api/${process.env.API_VERSION || 'v1'}`);
          
          if (process.env.NODE_ENV === 'development') {
            logger.info(`📚 Docs: http://localhost:${this.port}/api-docs`);
          }
          
          resolve();
        });
        
        this.server.on('error', (error) => {
          logger.error('❌ Error del servidor:', error);
          reject(error);
        });
        
      } catch (error) {
        logger.error('❌ Error iniciando servidor:', error);
        reject(error);
      }
    });
  }

  async stop() {
    try {
      if (this.server) {
        await new Promise((resolve) => {
          this.server.close(() => {
            logger.info('🔄 Servidor HTTP cerrado');
            resolve();
          });
        });
      }
      
      await database.disconnect();
      logger.info('✅ Servidor detenido exitosamente');
      
    } catch (error) {
      logger.error('❌ Error deteniendo servidor:', error);
      throw error;
    }
  }

  getApp() {
    return this.app;
  }

  getServer() {
    return this.server;
  }
}

// Crear instancia del servidor
const server = new Server();

// Manejar señales de terminación
process.on('SIGINT', async () => {
  logger.info('🔄 Recibida señal SIGINT, cerrando servidor...');
  await server.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('🔄 Recibida señal SIGTERM, cerrando servidor...');
  await server.stop();
  process.exit(0);
});

// Manejar errores no capturados
process.on('uncaughtException', (error) => {
  logger.error('❌ Excepción no capturada:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('❌ Promesa rechazada no manejada:', reason);
  process.exit(1);
});

// Iniciar servidor
if (require.main === module) {
  server.initialize().catch((error) => {
    logger.error('❌ Error fatal iniciando servidor:', error);
    process.exit(1);
  });
}

module.exports = server;
