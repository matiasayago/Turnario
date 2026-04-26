require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

// Importar configuraciones
const database = require('./config/database');
const logger = require('./config/logger');

// Importar rutas
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const appointmentRoutes = require('./routes/appointments');
const serviceRoutes = require('./routes/services');
const clinicRoutes = require('./routes/clinics');
const notificationRoutes = require('./routes/notifications');
const paymentRoutes = require('./routes/payments');
const reviewRoutes = require('./routes/reviews');
const availabilityRoutes = require('./routes/availability');

// Importar middleware
const { authenticateToken } = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');
const notFoundHandler = require('./middleware/notFoundHandler');

const app = express();
const port = process.env.PORT || 3000;

// Configurar middleware básico
app.use(cors({
  origin: ['http://localhost:19006', 'http://localhost:3000', 'http://192.168.0.4:3000'],
  credentials: true
}));

app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Archivos estáticos
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/public', express.static(path.join(__dirname, 'public')));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Turnario API está funcionando correctamente',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

// API routes
const apiVersion = process.env.API_VERSION || 'v1';
const apiPrefix = `/api/${apiVersion}`;

// Rutas públicas
app.use(`${apiPrefix}/auth`, authRoutes);
app.use(`${apiPrefix}/availability`, availabilityRoutes);

// Rutas protegidas
app.use(`${apiPrefix}/users`, authenticateToken, userRoutes);
app.use(`${apiPrefix}/appointments`, authenticateToken, appointmentRoutes);
app.use(`${apiPrefix}/services`, authenticateToken, serviceRoutes);
app.use(`${apiPrefix}/clinics`, authenticateToken, clinicRoutes);
app.use(`${apiPrefix}/notifications`, authenticateToken, notificationRoutes);
app.use(`${apiPrefix}/payments`, authenticateToken, paymentRoutes);
app.use(`${apiPrefix}/reviews`, authenticateToken, reviewRoutes);

// Manejo de errores
app.use(notFoundHandler);
app.use(errorHandler);

// Inicializar servidor
async function startServer() {
  try {
    logger.info('🚀 Iniciando servidor de desarrollo...');
    
    // Conectar a la base de datos
    logger.info('🔄 Conectando a MongoDB...');
    await database.connect();
    logger.info('✅ MongoDB conectado');
    
    // Iniciar servidor
    app.listen(port, () => {
      logger.info(`🌐 Servidor ejecutándose en puerto ${port}`);
      logger.info(`🔗 URL: http://localhost:${port}`);
      logger.info(`📱 API: http://localhost:${port}${apiPrefix}`);
      logger.info(`❤️ Health: http://localhost:${port}/health`);
      logger.info('🎉 Servidor de desarrollo iniciado exitosamente');
    });
    
  } catch (error) {
    logger.error('❌ Error iniciando servidor:', error);
    process.exit(1);
  }
}

// Manejar señales de terminación
process.on('SIGINT', async () => {
  logger.info('🔄 Cerrando servidor...');
  await database.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('🔄 Cerrando servidor...');
  await database.disconnect();
  process.exit(0);
});

// Iniciar servidor
startServer();
