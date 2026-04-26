#!/usr/bin/env node

require('dotenv').config();
const mongoose = require('mongoose');
const logger = require('../config/logger');

class ProductionDeploy {
  constructor() {
    this.config = require('../config/production');
  }

  async validateEnvironment() {
    console.log('🔍 Validando variables de entorno para producción...');
    console.log('==================================================');
    console.log('');

    const requiredVars = [
      'MONGODB_URI_PROD',
      'JWT_SECRET',
      'JWT_REFRESH_SECRET',
      'ENCRYPTION_KEY',
      'SMTP_HOST',
      'SMTP_USER',
      'SMTP_PASS',
      'EMAIL_FROM'
    ];

    const missingVars = [];
    const secureVars = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'ENCRYPTION_KEY', 'SMTP_PASS'];

    requiredVars.forEach(varName => {
      if (!process.env[varName]) {
        missingVars.push(varName);
      } else if (secureVars.includes(varName)) {
        console.log(`✅ ${varName}: [CONFIGURADO]`);
      } else {
        console.log(`✅ ${varName}: ${process.env[varName]}`);
      }
    });

    if (missingVars.length > 0) {
      console.log('');
      console.log('❌ Variables de entorno faltantes:');
      missingVars.forEach(varName => {
        console.log(`   - ${varName}`);
      });
      console.log('');
      console.log('💡 Configura estas variables antes de desplegar a producción');
      return false;
    }

    console.log('');
    console.log('✅ Todas las variables de entorno están configuradas');
    return true;
  }

  async testDatabaseConnection() {
    console.log('🔍 Probando conexión a base de datos de producción...');
    console.log('====================================================');
    console.log('');

    try {
      const mongoUri = this.config.MONGODB_URI;
      console.log(`📍 Conectando a: ${mongoUri.replace(/\/\/.*@/, '//***:***@')}`);

      await mongoose.connect(mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 10000,
        maxPoolSize: 10,
        retryWrites: true,
        w: 'majority'
      });

      console.log('✅ Conexión exitosa a base de datos de producción');
      console.log(`📍 Base de datos: ${mongoose.connection.db.databaseName}`);
      console.log(`📍 Host: ${mongoose.connection.host}`);

      // Verificar colecciones existentes
      const collections = await mongoose.connection.db.listCollections().toArray();
      console.log(`📊 Colecciones encontradas: ${collections.length}`);

      await mongoose.disconnect();
      return true;

    } catch (error) {
      console.error('❌ Error conectando a base de datos de producción:', error.message);
      console.log('');
      console.log('🔧 Verifica:');
      console.log('1. La cadena de conexión MONGODB_URI_PROD');
      console.log('2. Que el cluster esté activo');
      console.log('3. Que tu IP esté en la lista blanca');
      console.log('4. Que el usuario tenga permisos correctos');
      return false;
    }
  }

  async testEmailConfiguration() {
    console.log('🔍 Probando configuración de email...');
    console.log('====================================');
    console.log('');

    try {
      const nodemailer = require('nodemailer');
      
      const transporter = nodemailer.createTransport({
        host: this.config.SMTP_HOST,
        port: this.config.SMTP_PORT,
        secure: this.config.SMTP_PORT === 465,
        auth: {
          user: this.config.SMTP_USER,
          pass: this.config.SMTP_PASS
        }
      });

      await transporter.verify();
      console.log('✅ Configuración de email válida');
      console.log(`📍 Host: ${this.config.SMTP_HOST}`);
      console.log(`📍 Puerto: ${this.config.SMTP_PORT}`);
      console.log(`📍 Usuario: ${this.config.SMTP_USER}`);

      return true;

    } catch (error) {
      console.error('❌ Error en configuración de email:', error.message);
      console.log('');
      console.log('🔧 Verifica:');
      console.log('1. Las credenciales SMTP');
      console.log('2. Que el servidor SMTP esté accesible');
      console.log('3. Que uses contraseñas de aplicación para Gmail');
      return false;
    }
  }

  async createProductionIndexes() {
    console.log('🔍 Creando índices de producción...');
    console.log('==================================');
    console.log('');

    try {
      const mongoUri = this.config.MONGODB_URI;
      await mongoose.connect(mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        maxPoolSize: 10
      });

      // Importar el setup de base de datos
      const DatabaseSetup = require('./setup-database');
      const setup = new DatabaseSetup();
      
      await setup.createIndexes();
      console.log('✅ Índices de producción creados');

      await mongoose.disconnect();
      return true;

    } catch (error) {
      console.error('❌ Error creando índices:', error.message);
      return false;
    }
  }

  async generateSecurityReport() {
    console.log('🔒 Reporte de Seguridad');
    console.log('======================');
    console.log('');

    const securityChecks = [
      {
        name: 'JWT Secret',
        check: () => this.config.JWT_SECRET && this.config.JWT_SECRET.length >= 32,
        message: 'JWT Secret debe tener al menos 32 caracteres'
      },
      {
        name: 'JWT Refresh Secret',
        check: () => this.config.JWT_REFRESH_SECRET && this.config.JWT_REFRESH_SECRET.length >= 32,
        message: 'JWT Refresh Secret debe tener al menos 32 caracteres'
      },
      {
        name: 'Encryption Key',
        check: () => this.config.ENCRYPTION_KEY && this.config.ENCRYPTION_KEY.length === 32,
        message: 'Encryption Key debe tener exactamente 32 caracteres'
      },
      {
        name: 'BCrypt Rounds',
        check: () => this.config.BCRYPT_ROUNDS >= 12,
        message: 'BCrypt Rounds debe ser al menos 12'
      },
      {
        name: 'CORS Origin',
        check: () => !this.config.CORS_ORIGIN.includes('*'),
        message: 'CORS Origin no debe usar wildcards en producción'
      },
      {
        name: 'Rate Limiting',
        check: () => this.config.RATE_LIMIT_MAX_REQUESTS <= 100,
        message: 'Rate Limiting debe ser restrictivo en producción'
      }
    ];

    let allPassed = true;

    securityChecks.forEach(check => {
      if (check.check()) {
        console.log(`✅ ${check.name}: OK`);
      } else {
        console.log(`❌ ${check.name}: ${check.message}`);
        allPassed = false;
      }
    });

    console.log('');
    if (allPassed) {
      console.log('✅ Todas las verificaciones de seguridad pasaron');
    } else {
      console.log('⚠️ Algunas verificaciones de seguridad fallaron');
    }

    return allPassed;
  }

  async deploy() {
    console.log('🚀 Despliegue a Producción - Turnario');
    console.log('=====================================');
    console.log('');

    try {
      // 1. Validar entorno
      const envValid = await this.validateEnvironment();
      if (!envValid) {
        process.exit(1);
      }

      // 2. Probar conexión a base de datos
      const dbValid = await this.testDatabaseConnection();
      if (!dbValid) {
        process.exit(1);
      }

      // 3. Probar configuración de email
      const emailValid = await this.testEmailConfiguration();
      if (!emailValid) {
        console.log('⚠️ Configuración de email falló, pero continuando...');
      }

      // 4. Crear índices de producción
      const indexesCreated = await this.createProductionIndexes();
      if (!indexesCreated) {
        console.log('⚠️ Error creando índices, pero continuando...');
      }

      // 5. Generar reporte de seguridad
      const securityValid = await this.generateSecurityReport();
      if (!securityValid) {
        console.log('⚠️ Algunas verificaciones de seguridad fallaron');
      }

      console.log('');
      console.log('🎉 Despliegue completado exitosamente!');
      console.log('');
      console.log('📋 Próximos pasos:');
      console.log('1. Inicia el servidor: npm start');
      console.log('2. Monitorea los logs: tail -f logs/app.log');
      console.log('3. Configura un proxy reverso (nginx/apache)');
      console.log('4. Configura SSL/TLS');
      console.log('5. Configura backup automático de la base de datos');

    } catch (error) {
      console.error('❌ Error en el despliegue:', error.message);
      process.exit(1);
    }
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  const deploy = new ProductionDeploy();
  deploy.deploy().catch((error) => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
}

module.exports = ProductionDeploy;
