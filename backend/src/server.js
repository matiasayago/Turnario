const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const morgan = require('morgan');
require('dotenv').config();

// Importar servicios
const NotificationSocket = require('./websocket/notificationSocket');
const EmailService = require('./services/emailService');
const MercadoPagoService = require('./services/mercadopagoService');
const GeolocationService = require('./services/geolocationService');

// Importar rutas
const userRoutes = require('./routes/users');
const appointmentRoutes = require('./routes/appointments');
const serviceRoutes = require('./routes/services');
const clinicRoutes = require('./routes/clinics');
const notificationRoutes = require('./routes/notifications');

const app = express();
const PORT = process.env.PORT || 3001;

// Crear servidor HTTP para WebSockets
const server = require('http').createServer(app);

// Inicializar WebSockets
const notificationSocket = new NotificationSocket(server);

// Inicializar servicios
const emailService = new EmailService();
const mercadopagoService = new MercadoPagoService();
const geolocationService = new GeolocationService();

// Middleware de seguridad
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por ventana
  message: 'Demasiadas peticiones desde esta IP, intenta nuevamente en 15 minutos',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Middleware
app.use(compression());
app.use(morgan('combined'));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Conectar a MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/turnario', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ Conectado a MongoDB');
})
.catch((error) => {
  console.error('❌ Error conectando a MongoDB:', error);
  process.exit(1);
});

// Middleware para inyectar servicios en req
app.use((req, res, next) => {
  req.notificationSocket = notificationSocket;
  req.emailService = emailService;
  req.mercadopagoService = mercadopagoService;
  req.geolocationService = geolocationService;
  next();
});

// Rutas de la API
app.use('/api/users', userRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/clinics', clinicRoutes);
app.use('/api/notifications', notificationRoutes);

// Ruta de pagos con MercadoPago
app.post('/api/payments/create-preference', async (req, res) => {
  try {
    const { appointmentId, amount, description } = req.body;
    
    if (!appointmentId || !amount) {
      return res.status(400).json({ error: 'appointmentId y amount son requeridos' });
    }

    const preference = await mercadopagoService.createPaymentPreference({
      appointmentId,
      amount,
      description
    });

    res.json(preference);
  } catch (error) {
    console.error('Error creating payment preference:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Webhook de MercadoPago
app.post('/api/payments/webhook', async (req, res) => {
  try {
    const { type, data_id } = req.query;
    
    if (type === 'payment') {
      const webhookResult = await mercadopagoService.verifyWebhook(req.query);
      
      if (webhookResult.verified) {
        // Enviar notificación en tiempo real
        const payment = webhookResult.payment;
        if (payment.externalReference) {
          notificationSocket.sendPaymentNotification(
            payment.externalReference, // appointmentId
            payment.status === 'approved' ? 'payment_successful' : 'payment_failed',
            {
              amount: payment.transactionAmount,
              transactionId: payment.id,
              status: payment.status
            }
          );
        }
        
        res.status(200).json({ message: 'Webhook processed successfully' });
      } else {
        res.status(400).json({ error: 'Invalid webhook' });
      }
    } else {
      res.status(400).json({ error: 'Invalid webhook type' });
    }
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Ruta de geolocalización
app.get('/api/geolocation/nearby-clinics', async (req, res) => {
  try {
    const { latitude, longitude, radius, specialty, clinicType, city, state } = req.query;
    
    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'latitude y longitude son requeridos' });
    }

    const location = { latitude: parseFloat(latitude), longitude: parseFloat(longitude) };
    const searchRadius = radius ? parseInt(radius) : null;
    const filters = { specialty, clinicType, city, state };

    const clinics = await geolocationService.findNearbyClinics(location, searchRadius, filters);
    
    res.json({
      success: true,
      data: clinics,
      count: clinics.length,
      location: location,
      radius: searchRadius || geolocationService.defaultRadius
    });
  } catch (error) {
    console.error('Error finding nearby clinics:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Ruta para obtener estadísticas de clínicas por área
app.get('/api/geolocation/clinic-stats', async (req, res) => {
  try {
    const { latitude, longitude, radius } = req.query;
    
    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'latitude y longitude son requeridos' });
    }

    const location = { latitude: parseFloat(latitude), longitude: parseFloat(longitude) };
    const searchRadius = radius ? parseInt(radius) : null;

    const stats = await geolocationService.getClinicStatsByArea(location, searchRadius);
    
    res.json({
      success: true,
      data: stats,
      location: location,
      radius: searchRadius || geolocationService.defaultRadius
    });
  } catch (error) {
    console.error('Error getting clinic stats:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Ruta para geocoding de direcciones
app.post('/api/geolocation/geocode', async (req, res) => {
  try {
    const { address } = req.body;
    
    if (!address) {
      return res.status(400).json({ error: 'address es requerido' });
    }

    const coordinates = await geolocationService.geocodeAddress(address);
    
    if (coordinates) {
      res.json({
        success: true,
        data: coordinates
      });
    } else {
      res.status(404).json({ error: 'No se pudo geocodificar la dirección' });
    }
  } catch (error) {
    console.error('Error geocoding address:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Ruta para enviar emails de prueba
app.post('/api/email/send-test', async (req, res) => {
  try {
    const { to, template, data } = req.body;
    
    if (!to || !template) {
      return res.status(400).json({ error: 'to y template son requeridos' });
    }

    const result = await emailService.sendEmail(to, 'Email de prueba', template, data || {});
    
    res.json({
      success: true,
      message: 'Email enviado exitosamente',
      data: result
    });
  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Ruta para obtener estadísticas de WebSockets
app.get('/api/websocket/stats', (req, res) => {
  try {
    const stats = notificationSocket.getConnectionStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting WebSocket stats:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Ruta para enviar notificación de prueba
app.post('/api/websocket/send-test', (req, res) => {
  try {
    const { userId, event, data } = req.body;
    
    if (!userId || !event) {
      return res.status(400).json({ error: 'userId y event son requeridos' });
    }

    const sent = notificationSocket.sendToUser(userId, event, data || {});
    
    res.json({
      success: true,
      message: sent ? 'Notificación enviada' : 'Usuario no conectado',
      data: { sent, userId, event }
    });
  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Ruta de salud del sistema
app.get('/api/health', (req, res) => {
  const health = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    services: {
      database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      websocket: notificationSocket ? 'active' : 'inactive',
      email: emailService.transporter ? 'active' : 'inactive',
      mercadopago: mercadopagoService.validateConfiguration(),
      geolocation: 'active'
    },
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development'
  };

  res.json(health);
});

// Ruta raíz
app.get('/', (req, res) => {
  res.json({
    message: '🚀 Turnario Backend API',
    version: '2.0.0',
    features: [
      'WebSockets para notificaciones en tiempo real',
      'Sistema de emails automáticos',
      'Integración con MercadoPago',
      'Geolocalización para clínicas cercanas',
      'API RESTful completa',
      'Autenticación JWT',
      'Base de datos MongoDB'
    ],
    endpoints: {
      auth: '/api/users',
      appointments: '/api/appointments',
      services: '/api/services',
      clinics: '/api/clinics',
      notifications: '/api/notifications',
      payments: '/api/payments',
      geolocation: '/api/geolocation',
      email: '/api/email',
      websocket: '/api/websocket',
      health: '/api/health'
    },
    documentation: '/api/docs',
    support: process.env.SUPPORT_EMAIL || 'soporte@turnario.com'
  });
});

// Middleware de manejo de errores
app.use((error, req, res, next) => {
  console.error('❌ Error no manejado:', error);
  
  res.status(error.status || 500).json({
    error: {
      message: error.message || 'Error interno del servidor',
      status: error.status || 500,
      timestamp: new Date().toISOString()
    }
  });
});

// Middleware para rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    error: {
      message: 'Ruta no encontrada',
      status: 404,
      path: req.originalUrl,
      timestamp: new Date().toISOString()
    }
  });
});

// Iniciar servidor
server.listen(PORT, () => {
  console.log(`🚀 Servidor Turnario ejecutándose en puerto ${PORT}`);
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  console.log(`📧 Email Service: ${emailService.transporter ? '✅ Activo' : '❌ Inactivo'}`);
  console.log(`💳 MercadoPago: ${mercadopagoService.validateConfiguration() ? '✅ Configurado' : '❌ No configurado'}`);
  console.log(`📍 Geolocalización: ✅ Activo`);
  console.log(`🔌 WebSockets: ✅ Activo`);
  console.log(`📊 Base de datos: ${mongoose.connection.readyState === 1 ? '✅ Conectada' : '❌ Desconectada'}`);
});

// Manejo de señales de terminación
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM recibido, cerrando servidor...');
  server.close(() => {
    console.log('✅ Servidor cerrado');
    mongoose.connection.close();
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT recibido, cerrando servidor...');
  server.close(() => {
    console.log('✅ Servidor cerrado');
    mongoose.connection.close();
    process.exit(0);
  });
});

// Exportar para testing
module.exports = { app, server, notificationSocket };

