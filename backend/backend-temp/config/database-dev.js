const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const logger = require('./logger');

class DatabaseDev {
  constructor() {
    this.isConnected = false;
    this.connection = null;
    this.mongoServer = null;
  }

  async connect() {
    try {
      if (this.isConnected) {
        logger.info('✅ Base de datos ya conectada');
        return this.connection;
      }

      // Usar MongoDB local para desarrollo
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/turnario';
      logger.info('🔄 Conectando a MongoDB local...');
      logger.info(`📍 URI: ${mongoUri}`);
      
      // Configuración de conexión simplificada
      const options = {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        bufferMaxEntries: 0,
        bufferCommands: false,
      };

      this.connection = await mongoose.connect(mongoUri, options);
      
      // Configurar eventos de conexión
      mongoose.connection.on('connected', () => {
        this.isConnected = true;
        logger.info('✅ MongoDB local conectado exitosamente');
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

      // Poblar con datos de prueba
      // await this.seedDatabase();
      
      return this.connection;
    } catch (error) {
      logger.error('❌ Error conectando a MongoDB:', error);
      throw error;
    }
  }

  async seedDatabase() {
    try {
      logger.info('🌱 Poblando base de datos con datos de prueba...');
      
      // Importar modelos
      const User = require('../models/User');
      const Service = require('../models/Service');
      const Category = require('../models/Category');

      // Crear categorías de prueba
      const categories = await Category.create([
        {
          name: 'Psicología',
          description: 'Servicios de salud mental y bienestar',
          icon: 'psychology',
          color: '#4CAF50',
          isActive: true
        },
        {
          name: 'Medicina General',
          description: 'Consultas médicas generales',
          icon: 'medical',
          color: '#2196F3',
          isActive: true
        },
        {
          name: 'Odontología',
          description: 'Servicios dentales',
          icon: 'dental',
          color: '#FF9800',
          isActive: true
        }
      ]);

      // Crear usuarios de prueba
      const users = await User.create([
        {
          fullName: 'Dr. Carlos Mendoza',
          email: 'carlos.mendoza@turnario.com',
          password: 'password123',
          userType: 'professional',
          phone: '+54911234567',
          isEmailVerified: true,
          isActive: true
        },
        {
          fullName: 'Ana Martínez',
          email: 'ana.martinez@example.com',
          password: 'password123',
          userType: 'client',
          phone: '+54911234568',
          isEmailVerified: true,
          isActive: true
        },
        {
          fullName: 'Admin Usuario',
          email: 'admin@turnario.com',
          password: 'admin123',
          userType: 'admin',
          phone: '+54911234569',
          isEmailVerified: true,
          isActive: true
        }
      ]);

      // Crear servicios de prueba
      const services = await Service.create([
        {
          name: 'Consulta Psicológica',
          description: 'Consulta individual con psicólogo',
          duration: 60,
          price: 5000,
          category: categories[0]._id,
          professionalId: users[0]._id,
          isActive: true
        },
        {
          name: 'Consulta Médica General',
          description: 'Consulta médica general',
          duration: 30,
          price: 3000,
          category: categories[1]._id,
          professionalId: users[0]._id,
          isActive: true
        }
      ]);

      logger.info('✅ Base de datos poblada con datos de prueba');
      logger.info(`📊 Usuarios creados: ${users.length}`);
      logger.info(`📊 Categorías creadas: ${categories.length}`);
      logger.info(`📊 Servicios creados: ${services.length}`);
      
    } catch (error) {
      logger.error('❌ Error poblando base de datos:', error);
    }
  }

  async gracefulShutdown() {
    try {
      logger.info('🔄 Cerrando conexión a MongoDB...');
      
      if (this.connection) {
        await mongoose.connection.close();
      }
      
      if (this.mongoServer) {
        await this.mongoServer.stop();
        logger.info('✅ MongoDB en memoria detenido');
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
      }
      
      if (this.mongoServer) {
        await this.mongoServer.stop();
        this.mongoServer = null;
      }
      
      logger.info('✅ Desconectado de MongoDB');
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

module.exports = new DatabaseDev();
