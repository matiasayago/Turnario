const mongoose = require('mongoose');
const logger = require('./logger');

class Database {
  constructor() {
    this.isConnected = false;
    this.connection = null;
  }

  async connect() {
    try {
      if (this.isConnected) {
        logger.info('✅ Base de datos ya conectada');
        return this.connection;
      }

      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/turnario';
      
      logger.info('🔄 Conectando a MongoDB...');
      
      // Configuración de conexión optimizada
      const options = {
        maxPoolSize: 10, // Máximo de conexiones en el pool
        serverSelectionTimeoutMS: 5000, // Timeout para selección de servidor
        socketTimeoutMS: 45000, // Timeout para operaciones de socket
        bufferMaxEntries: 0, // Deshabilitar buffering
        bufferCommands: false, // Deshabilitar buffering de comandos
        useNewUrlParser: true,
        useUnifiedTopology: true,
        autoIndex: process.env.NODE_ENV === 'development', // Solo índices automáticos en desarrollo
        retryWrites: true,
        w: 'majority', // Write concern
        readPreference: 'primaryPreferred', // Preferir lectura del primario
        compressors: ['zlib'], // Compresión
        zlibCompressionLevel: 6, // Nivel de compresión
      };

      this.connection = await mongoose.connect(mongoUri, options);
      
      // Configurar eventos de conexión
      mongoose.connection.on('connected', () => {
        this.isConnected = true;
        logger.info('✅ MongoDB conectado exitosamente');
      });

      mongoose.connection.on('error', (err) => {
        this.isConnected = false;
        logger.error('❌ Error de conexión MongoDB:', err);
      });

      mongoose.connection.on('disconnected', () => {
        this.isConnected = false;
        logger.warn('⚠️ MongoDB desconectado');
      });

      // Manejar señales de terminación
      process.on('SIGINT', this.gracefulShutdown.bind(this));
      process.on('SIGTERM', this.gracefulShutdown.bind(this));

      // Configurar índices globales
      await this.setupIndexes();
      
      return this.connection;
    } catch (error) {
      logger.error('❌ Error conectando a MongoDB:', error);
      throw error;
    }
  }

  async setupIndexes() {
    try {
      logger.info('🔄 Configurando índices de base de datos...');
      
      // Índices para usuarios
      await mongoose.connection.db.collection('users').createIndex(
        { email: 1 }, 
        { unique: true, sparse: true }
      );
      await mongoose.connection.db.collection('users').createIndex(
        { phone: 1 }, 
        { sparse: true }
      );
      await mongoose.connection.db.collection('users').createIndex(
        { userType: 1, isActive: 1 }
      );

      // Índices para citas
      await mongoose.connection.db.collection('appointments').createIndex(
        { professionalId: 1, date: 1, status: 1 }
      );
      await mongoose.connection.db.collection('appointments').createIndex(
        { clientId: 1, date: 1 }
      );
      await mongoose.connection.db.collection('appointments').createIndex(
        { status: 1, date: 1 }
      );

      // Índices para servicios
      await mongoose.connection.db.collection('services').createIndex(
        { clinicId: 1, isActive: 1 }
      );
      await mongoose.connection.db.collection('services').createIndex(
        { category: 1, isActive: 1 }
      );

      // Índices para clínicas
      await mongoose.connection.db.collection('clinics').createIndex(
        { location: '2dsphere' }
      );
      await mongoose.connection.db.collection('clinics').createIndex(
        { businessType: 1, isActive: 1 }
      );

      // Índices para notificaciones
      await mongoose.connection.db.collection('notifications').createIndex(
        { recipientId: 1, isRead: 1, createdAt: -1 }
      );
      await mongoose.connection.db.collection('notifications').createIndex(
        { createdAt: 1 }, 
        { expireAfterSeconds: 7776000 } // 90 días TTL
      );

      // Índices para pagos
      await mongoose.connection.db.collection('payments').createIndex(
        { appointmentId: 1 }, 
        { unique: true, sparse: true }
      );
      await mongoose.connection.db.collection('payments').createIndex(
        { status: 1, createdAt: 1 }
      );

      // Índices para autorizaciones médicas
      await mongoose.connection.db.collection('medicalauthorizations').createIndex(
        { professionalId: 1, patientId: 1, status: 1 }
      );
      await mongoose.connection.db.collection('medicalauthorizations').createIndex(
        { expiresAt: 1 }, 
        { expireAfterSeconds: 0 } // TTL basado en expiresAt
      );

      // Índices para logs de acceso
      await mongoose.connection.db.collection('medicalaccesslogs').createIndex(
        { professionalId: 1, patientId: 1, accessDate: -1 }
      );
      await mongoose.connection.db.collection('medicalaccesslogs').createIndex(
        { accessDate: 1 }, 
        { expireAfterSeconds: 31536000 } // 1 año TTL
      );

      logger.info('✅ Índices configurados exitosamente');
    } catch (error) {
      logger.error('❌ Error configurando índices:', error);
    }
  }

  async gracefulShutdown() {
    try {
      logger.info('🔄 Cerrando conexión a MongoDB...');
      
      if (this.connection) {
        await mongoose.connection.close();
        logger.info('✅ Conexión a MongoDB cerrada exitosamente');
      }
      
      process.exit(0);
    } catch (error) {
      logger.error('❌ Error cerrando conexión MongoDB:', error);
      process.exit(1);
    }
  }

  async disconnect() {
    try {
      if (this.connection) {
        await mongoose.connection.close();
        this.isConnected = false;
        this.connection = null;
        logger.info('✅ Desconectado de MongoDB');
      }
    } catch (error) {
      logger.error('❌ Error desconectando de MongoDB:', error);
      throw error;
    }
  }

  getConnection() {
    return this.connection;
  }

  isConnected() {
    return this.isConnected;
  }
}

module.exports = new Database();
