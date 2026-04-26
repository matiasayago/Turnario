#!/usr/bin/env node

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

class MongoDBConfigurator {
  constructor() {
    this.envPath = path.join(__dirname, '..', '.env');
    this.config = {};
  }

  async askQuestion(question) {
    return new Promise((resolve) => {
      rl.question(question, (answer) => {
        resolve(answer.trim());
      });
    });
  }

  async configureMongoDB() {
    console.log('🚀 Configuración de MongoDB para Turnario');
    console.log('==========================================');
    console.log('');

    // Leer configuración actual si existe
    await this.loadCurrentConfig();

    console.log('📋 Opciones de configuración:');
    console.log('1. MongoDB Local (recomendado para desarrollo)');
    console.log('2. MongoDB Atlas (recomendado para producción)');
    console.log('3. Usar configuración actual');
    console.log('');

    const choice = await this.askQuestion('Selecciona una opción (1-3): ');

    switch (choice) {
      case '1':
        await this.configureLocalMongoDB();
        break;
      case '2':
        await this.configureAtlasMongoDB();
        break;
      case '3':
        console.log('ℹ️ Usando configuración actual');
        break;
      default:
        console.log('❌ Opción inválida');
        process.exit(1);
    }

    // Guardar configuración
    await this.saveConfig();

    // Probar conexión
    await this.testConnection();

    // Ejecutar setup de base de datos
    await this.runDatabaseSetup();

    rl.close();
  }

  async loadCurrentConfig() {
    if (fs.existsSync(this.envPath)) {
      const envContent = fs.readFileSync(this.envPath, 'utf8');
      const lines = envContent.split('\n');
      
      lines.forEach(line => {
        if (line.includes('=') && !line.startsWith('#')) {
          const [key, ...valueParts] = line.split('=');
          this.config[key.trim()] = valueParts.join('=').trim();
        }
      });
    }
  }

  async configureLocalMongoDB() {
    console.log('');
    console.log('🏠 Configuración de MongoDB Local');
    console.log('=================================');
    console.log('');

    const host = await this.askQuestion('Host (por defecto: localhost): ') || 'localhost';
    const port = await this.askQuestion('Puerto (por defecto: 27017): ') || '27017';
    const database = await this.askQuestion('Nombre de la base de datos (por defecto: turnario): ') || 'turnario';

    this.config.MONGODB_URI = `mongodb://${host}:${port}/${database}`;
    
    console.log('');
    console.log('📝 Configuración local:');
    console.log(`   URI: ${this.config.MONGODB_URI}`);
    console.log('');
    console.log('⚠️ Asegúrate de que MongoDB esté instalado y ejecutándose:');
    console.log('   - Windows: net start MongoDB');
    console.log('   - macOS: brew services start mongodb-community');
    console.log('   - Linux: sudo systemctl start mongod');
  }

  async configureAtlasMongoDB() {
    console.log('');
    console.log('☁️ Configuración de MongoDB Atlas');
    console.log('=================================');
    console.log('');
    console.log('📋 Pasos para configurar MongoDB Atlas:');
    console.log('1. Ve a https://www.mongodb.com/atlas');
    console.log('2. Crea una cuenta gratuita o inicia sesión');
    console.log('3. Crea un nuevo cluster (gratuito)');
    console.log('4. En "Security" > "Database Access", crea un usuario');
    console.log('5. En "Security" > "Network Access", agrega tu IP (0.0.0.0/0 para todas)');
    console.log('6. Haz clic en "Connect" y selecciona "Connect your application"');
    console.log('7. Copia la cadena de conexión');
    console.log('');

    const connectionString = await this.askQuestion('Cadena de conexión de Atlas: ');
    
    if (connectionString) {
      this.config.MONGODB_URI = connectionString;
      console.log('');
      console.log('✅ Configuración de Atlas guardada');
    } else {
      console.log('❌ Cadena de conexión requerida');
      process.exit(1);
    }
  }

  async saveConfig() {
    try {
      console.log('');
      console.log('💾 Guardando configuración...');

      // Configuraciones por defecto
      const defaultConfig = {
        NODE_ENV: 'development',
        PORT: '3001',
        API_VERSION: 'v1',
        JWT_SECRET: 'dev_jwt_secret_turnario_2024_super_seguro',
        JWT_EXPIRES_IN: '7d',
        JWT_REFRESH_SECRET: 'dev_refresh_secret_turnario_2024_super_seguro',
        JWT_REFRESH_EXPIRES_IN: '30d',
        BCRYPT_ROUNDS: '12',
        CORS_ORIGIN: 'http://localhost:3000,http://localhost:8081,http://localhost:8082',
        RATE_LIMIT_WINDOW_MS: '900000',
        RATE_LIMIT_MAX_REQUESTS: '100',
        LOG_LEVEL: 'info',
        LOG_FILE: 'logs/app.log',
        WS_PORT: '3001',
        DEFAULT_PAGE_SIZE: '20',
        MAX_PAGE_SIZE: '100',
        MAX_FILE_SIZE: '10485760',
        SESSION_TIMEOUT: '3600000',
        REFRESH_TOKEN_TIMEOUT: '2592000000'
      };

      // Combinar configuraciones
      const finalConfig = { ...defaultConfig, ...this.config };

      // Crear contenido del archivo .env
      const envContent = [
        '# Configuración del Servidor',
        `NODE_ENV=${finalConfig.NODE_ENV}`,
        `PORT=${finalConfig.PORT}`,
        `API_VERSION=${finalConfig.API_VERSION}`,
        '',
        '# Base de Datos',
        `MONGODB_URI=${finalConfig.MONGODB_URI}`,
        `MONGODB_URI_PROD=${finalConfig.MONGODB_URI_PROD || 'mongodb+srv://username:password@cluster.mongodb.net/turnario'}`,
        '',
        '# JWT',
        `JWT_SECRET=${finalConfig.JWT_SECRET}`,
        `JWT_EXPIRES_IN=${finalConfig.JWT_EXPIRES_IN}`,
        `JWT_REFRESH_SECRET=${finalConfig.JWT_REFRESH_SECRET}`,
        `JWT_REFRESH_EXPIRES_IN=${finalConfig.JWT_REFRESH_EXPIRES_IN}`,
        '',
        '# Criptografía',
        `BCRYPT_ROUNDS=${finalConfig.BCRYPT_ROUNDS}`,
        'ENCRYPTION_KEY=tu_clave_de_encriptacion_32_caracteres',
        '',
        '# MercadoPago',
        'MERCADOPAGO_ACCESS_TOKEN=TEST-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        'MERCADOPAGO_PUBLIC_KEY=TEST-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        'MERCADOPAGO_WEBHOOK_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        '',
        '# Email',
        'SMTP_HOST=smtp.gmail.com',
        'SMTP_PORT=587',
        'SMTP_USER=tu_email@gmail.com',
        'SMTP_PASS=tu_password_de_aplicacion',
        'EMAIL_FROM=noreply@turnario.com',
        '',
        '# Redis (Cache y Colas)',
        'REDIS_URL=redis://localhost:6379',
        'REDIS_PASSWORD=',
        '',
        '# AWS S3 (Archivos)',
        'AWS_ACCESS_KEY_ID=tu_access_key',
        'AWS_SECRET_ACCESS_KEY=tu_secret_key',
        'AWS_REGION=us-east-1',
        'AWS_S3_BUCKET=turnario-files',
        '',
        '# Google Maps',
        'GOOGLE_MAPS_API_KEY=tu_api_key_de_google_maps',
        '',
        '# Push Notifications',
        'FCM_SERVER_KEY=tu_fcm_server_key',
        'FCM_PROJECT_ID=tu_project_id',
        '',
        '# Seguridad',
        `CORS_ORIGIN=${finalConfig.CORS_ORIGIN}`,
        `RATE_LIMIT_WINDOW_MS=${finalConfig.RATE_LIMIT_WINDOW_MS}`,
        `RATE_LIMIT_MAX_REQUESTS=${finalConfig.RATE_LIMIT_MAX_REQUESTS}`,
        '',
        '# Logs',
        `LOG_LEVEL=${finalConfig.LOG_LEVEL}`,
        `LOG_FILE=${finalConfig.LOG_FILE}`,
        '',
        '# WebSocket',
        `WS_PORT=${finalConfig.WS_PORT}`,
        '',
        '# Paginación',
        `DEFAULT_PAGE_SIZE=${finalConfig.DEFAULT_PAGE_SIZE}`,
        `MAX_PAGE_SIZE=${finalConfig.MAX_PAGE_SIZE}`,
        '',
        '# Archivos',
        `MAX_FILE_SIZE=${finalConfig.MAX_FILE_SIZE}`,
        'ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '',
        '# Tiempo de Sesión',
        `SESSION_TIMEOUT=${finalConfig.SESSION_TIMEOUT}`,
        `REFRESH_TOKEN_TIMEOUT=${finalConfig.REFRESH_TOKEN_TIMEOUT}`
      ].join('\n');

      // Escribir archivo .env
      fs.writeFileSync(this.envPath, envContent);
      console.log('✅ Archivo .env creado exitosamente');
      
    } catch (error) {
      console.error('❌ Error guardando configuración:', error.message);
      process.exit(1);
    }
  }

  async testConnection() {
    try {
      console.log('');
      console.log('🔍 Probando conexión a MongoDB...');
      
      const mongoose = require('mongoose');
      const mongoUri = this.config.MONGODB_URI;
      
      await mongoose.connect(mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000,
      });
      
      console.log('✅ Conexión exitosa a MongoDB');
      await mongoose.disconnect();
      
    } catch (error) {
      console.error('❌ Error conectando a MongoDB:', error.message);
      console.log('');
      console.log('🔧 Soluciones comunes:');
      console.log('1. Verifica que MongoDB esté ejecutándose');
      console.log('2. Verifica que la cadena de conexión sea correcta');
      console.log('3. Para Atlas: verifica que tu IP esté en la lista blanca');
      console.log('4. Para Atlas: verifica que el usuario y contraseña sean correctos');
      
      const continueAnyway = await this.askQuestion('¿Continuar con la configuración de la base de datos? (y/n): ');
      if (continueAnyway.toLowerCase() !== 'y' && continueAnyway.toLowerCase() !== 'yes') {
        process.exit(1);
      }
    }
  }

  async runDatabaseSetup() {
    try {
      console.log('');
      console.log('🔄 Ejecutando configuración de base de datos...');
      
      // Importar y ejecutar el setup de base de datos
      const DatabaseSetup = require('./setup-database');
      const setup = new DatabaseSetup();
      await setup.run();
      
    } catch (error) {
      console.error('❌ Error en la configuración:', error.message);
    }
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  const configurator = new MongoDBConfigurator();
  configurator.configureMongoDB().catch((error) => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
}

module.exports = MongoDBConfigurator;
