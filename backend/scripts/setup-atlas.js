require('dotenv').config();
const mongoose = require('mongoose');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

class AtlasSetup {
  constructor() {
    this.mongoUri = null;
  }

  async askQuestion(question) {
    return new Promise((resolve) => {
      rl.question(question, (answer) => {
        resolve(answer);
      });
    });
  }

  async setupAtlas() {
    console.log('🚀 Configuración de MongoDB Atlas');
    console.log('=====================================');
    console.log('');
    console.log('📋 Pasos para configurar MongoDB Atlas:');
    console.log('');
    console.log('1. Ve a https://www.mongodb.com/atlas');
    console.log('2. Crea una cuenta gratuita o inicia sesión');
    console.log('3. Crea un nuevo cluster (gratuito)');
    console.log('4. En "Security" > "Database Access", crea un usuario');
    console.log('5. En "Security" > "Network Access", agrega tu IP (0.0.0.0/0 para todas)');
    console.log('6. Haz clic en "Connect" y selecciona "Connect your application"');
    console.log('7. Copia la cadena de conexión');
    console.log('');

    const useAtlas = await this.askQuestion('¿Quieres usar MongoDB Atlas? (y/n): ');
    
    if (useAtlas.toLowerCase() === 'y' || useAtlas.toLowerCase() === 'yes') {
      console.log('');
      console.log('🔗 Ingresa tu cadena de conexión de MongoDB Atlas:');
      console.log('Formato: mongodb+srv://username:password@cluster.mongodb.net/database');
      console.log('');
      
      this.mongoUri = await this.askQuestion('Cadena de conexión: ');
      
      if (this.mongoUri) {
        // Actualizar el archivo .env
        await this.updateEnvFile();
        
        // Probar la conexión
        await this.testConnection();
        
        // Ejecutar el setup de la base de datos
        await this.runDatabaseSetup();
      }
    } else {
      console.log('ℹ️ Usando configuración local de MongoDB');
      await this.runDatabaseSetup();
    }
    
    rl.close();
  }

  async updateEnvFile() {
    try {
      console.log('📝 Actualizando archivo .env...');
      
      // Leer el archivo .env actual
      const fs = require('fs');
      const path = require('path');
      const envPath = path.join(__dirname, '..', '.env');
      
      let envContent = '';
      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf8');
      }
      
      // Actualizar o agregar MONGODB_URI
      const lines = envContent.split('\n');
      let found = false;
      
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('MONGODB_URI=')) {
          lines[i] = `MONGODB_URI=${this.mongoUri}`;
          found = true;
          break;
        }
      }
      
      if (!found) {
        lines.push(`MONGODB_URI=${this.mongoUri}`);
      }
      
      // Escribir el archivo actualizado
      fs.writeFileSync(envPath, lines.join('\n'));
      console.log('✅ Archivo .env actualizado');
      
    } catch (error) {
      console.error('❌ Error actualizando .env:', error.message);
    }
  }

  async testConnection() {
    try {
      console.log('🔍 Probando conexión a MongoDB Atlas...');
      
      await mongoose.connect(this.mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000,
      });
      
      console.log('✅ Conexión exitosa a MongoDB Atlas');
      await mongoose.disconnect();
      
    } catch (error) {
      console.error('❌ Error conectando a MongoDB Atlas:', error.message);
      console.log('');
      console.log('🔧 Soluciones comunes:');
      console.log('1. Verifica que la cadena de conexión sea correcta');
      console.log('2. Asegúrate de que tu IP esté en la lista blanca');
      console.log('3. Verifica que el usuario y contraseña sean correctos');
      console.log('4. Asegúrate de que el cluster esté activo');
      process.exit(1);
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
  const atlasSetup = new AtlasSetup();
  atlasSetup.setupAtlas().catch((error) => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
}

module.exports = AtlasSetup;
