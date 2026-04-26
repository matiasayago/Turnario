require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const logger = require('../config/logger');

// Datos de prueba
const seedData = {
  users: [
    {
      email: 'admin@turnario.com',
      password: 'Admin123!',
      fullName: 'Administrador Turnario',
      phone: '+5491112345678',
      userType: 'admin',
      isEmailVerified: true,
      isPhoneVerified: true,
      permissions: [
        'manage_users',
        'manage_services',
        'manage_clinics',
        'access_analytics',
        'access_all_resources',
        'manage_payments',
        'manage_medical_records'
      ]
    },
    {
      email: 'carlos.mendoza@email.com',
      password: 'Carlos123!',
      fullName: 'Dr. Carlos Mendoza',
      phone: '+5491112345679',
      userType: 'professional',
      isEmailVerified: true,
      isPhoneVerified: true,
      permissions: [
        'create_appointments',
        'edit_appointments',
        'view_all_appointments',
        'manage_medical_records'
      ],
      professional: {
        license: 'MED-12345',
        specialties: ['Medicina General', 'Cardiología'],
        experience: {
          years: 15,
          description: 'Médico con amplia experiencia en medicina general y cardiología'
        },
        education: [
          {
            degree: 'Médico',
            institution: 'Universidad de Buenos Aires',
            year: 2008,
            description: 'Título de Médico General'
          },
          {
            degree: 'Especialista en Cardiología',
            institution: 'Hospital Italiano',
            year: 2013,
            description: 'Especialización en Cardiología'
          }
        ],
        availability: {
          workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
          workingHours: {
            start: '09:00',
            end: '17:00'
          },
          breakTime: {
            start: '13:00',
            end: '14:00'
          }
        }
      }
    },
    {
      email: 'ana.garcia@email.com',
      password: 'Ana123!',
      fullName: 'Dra. Ana García',
      phone: '+5491112345680',
      userType: 'professional',
      isEmailVerified: true,
      isPhoneVerified: true,
      permissions: [
        'create_appointments',
        'edit_appointments',
        'view_all_appointments',
        'manage_medical_records'
      ],
      professional: {
        license: 'MED-67890',
        specialties: ['Pediatría', 'Medicina Familiar'],
        experience: {
          years: 12,
          description: 'Pediatra especializada en medicina familiar'
        },
        education: [
          {
            degree: 'Médico',
            institution: 'Universidad Nacional de Córdoba',
            year: 2011,
            description: 'Título de Médico General'
          },
          {
            degree: 'Especialista en Pediatría',
            institution: 'Hospital de Niños',
            year: 2016,
            description: 'Especialización en Pediatría'
          }
        ],
        availability: {
          workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
          workingHours: {
            start: '08:00',
            end: '16:00'
          },
          breakTime: {
            start: '12:00',
            end: '13:00'
          }
        }
      }
    },
    {
      email: 'maria.lopez@email.com',
      password: 'Maria123!',
      fullName: 'María López',
      phone: '+5491112345681',
      userType: 'client',
      isEmailVerified: true,
      isPhoneVerified: true,
      permissions: [
        'create_appointments',
        'edit_appointments'
      ],
      client: {
        emergencyContact: {
          name: 'Juan López',
          phone: '+5491112345682',
          relationship: 'Esposo'
        },
        medicalInfo: {
          allergies: ['Penicilina'],
          medications: ['Vitamina D'],
          conditions: ['Hipertensión'],
          bloodType: 'O+'
        },
        preferences: {
          appointmentReminders: {
            email: true,
            push: true,
            sms: false,
            advanceTime: 24
          }
        }
      }
    },
    {
      email: 'juan.perez@email.com',
      password: 'Juan123!',
      fullName: 'Juan Pérez',
      phone: '+5491112345683',
      userType: 'client',
      isEmailVerified: true,
      isPhoneVerified: true,
      permissions: [
        'create_appointments',
        'edit_appointments'
      ],
      client: {
        emergencyContact: {
          name: 'Ana Pérez',
          phone: '+5491112345684',
          relationship: 'Esposa'
        },
        medicalInfo: {
          allergies: [],
          medications: [],
          conditions: [],
          bloodType: 'A+'
        },
        preferences: {
          appointmentReminders: {
            email: true,
            push: true,
            sms: true,
            advanceTime: 12
          }
        }
      }
    }
  ]
};

class DatabaseSeeder {
  constructor() {
    this.connection = null;
  }

  async connect() {
    try {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/turnario';
      
      logger.info('🔄 Conectando a MongoDB para seeding...');
      
      this.connection = await mongoose.connect(mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
      
      logger.info('✅ Conectado a MongoDB');
      
    } catch (error) {
      logger.error('❌ Error conectando a MongoDB:', error);
      throw error;
    }
  }

  async disconnect() {
    try {
      if (this.connection) {
        await mongoose.connection.close();
        logger.info('✅ Desconectado de MongoDB');
      }
    } catch (error) {
      logger.error('❌ Error desconectando de MongoDB:', error);
    }
  }

  async clearDatabase() {
    try {
      logger.info('🧹 Limpiando base de datos...');
      
      const collections = await mongoose.connection.db.listCollections().toArray();
      
      for (const collection of collections) {
        await mongoose.connection.db.dropCollection(collection.name);
        logger.info(`🗑️ Colección ${collection.name} eliminada`);
      }
      
      logger.info('✅ Base de datos limpiada');
      
    } catch (error) {
      logger.error('❌ Error limpiando base de datos:', error);
      throw error;
    }
  }

  async seedUsers() {
    try {
      logger.info('👥 Creando usuarios...');
      
      const createdUsers = [];
      
      for (const userData of seedData.users) {
        try {
          // Verificar si el usuario ya existe
          const existingUser = await User.findByEmail(userData.email);
          if (existingUser) {
            logger.info(`⚠️ Usuario ${userData.email} ya existe, saltando...`);
            continue;
          }

          // Crear usuario
          const user = new User(userData);
          await user.save();
          
          createdUsers.push(user);
          logger.info(`✅ Usuario creado: ${user.email} (${user.userType})`);
          
        } catch (error) {
          logger.error(`❌ Error creando usuario ${userData.email}:`, error);
        }
      }
      
      logger.info(`✅ ${createdUsers.length} usuarios creados exitosamente`);
      return createdUsers;
      
    } catch (error) {
      logger.error('❌ Error en seed de usuarios:', error);
      throw error;
    }
  }

  async createIndexes() {
    try {
      logger.info('🔍 Creando índices...');
      
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
      
      await mongoose.connection.db.collection('users').createIndex(
        { 'address.coordinates': '2dsphere' }
      );
      
      logger.info('✅ Índices creados');
      
    } catch (error) {
      logger.error('❌ Error creando índices:', error);
      throw error;
    }
  }

  async run() {
    try {
      logger.info('🚀 Iniciando proceso de seeding...');
      
      // Conectar a la base de datos
      await this.connect();
      
      // Limpiar base de datos (opcional)
      if (process.argv.includes('--clear')) {
        await this.clearDatabase();
      }
      
      // Crear usuarios
      const users = await this.seedUsers();
      
      // Crear índices
      await this.createIndexes();
      
      logger.info('🎉 Seeding completado exitosamente!');
      logger.info(`📊 Resumen:`);
      logger.info(`   - Usuarios creados: ${users.length}`);
      logger.info(`   - Administradores: ${users.filter(u => u.userType === 'admin').length}`);
      logger.info(`   - Profesionales: ${users.filter(u => u.userType === 'professional').length}`);
      logger.info(`   - Clientes: ${users.filter(u => u.userType === 'client').length}`);
      
      // Mostrar credenciales de acceso
      logger.info('\n🔑 Credenciales de acceso:');
      logger.info('   Admin: admin@turnario.com / Admin123!');
      logger.info('   Profesional: carlos.mendoza@email.com / Carlos123!');
      logger.info('   Cliente: maria.lopez@email.com / Maria123!');
      
    } catch (error) {
      logger.error('❌ Error en proceso de seeding:', error);
      process.exit(1);
    } finally {
      await this.disconnect();
    }
  }
}

// Ejecutar seeder si se llama directamente
if (require.main === module) {
  const seeder = new DatabaseSeeder();
  seeder.run();
}

module.exports = DatabaseSeeder;
