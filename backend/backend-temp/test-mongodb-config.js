#!/usr/bin/env node

// Script simple para probar la configuración de MongoDB
require('dotenv').config();
const mongoose = require('mongoose');

async function testMongoDBConfig() {
  console.log('🔍 Probando configuración de MongoDB...');
  console.log('=====================================');
  console.log('');

  // Mostrar configuración actual
  console.log('📋 Configuración actual:');
  console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'no definido'}`);
  console.log(`   MONGODB_URI: ${process.env.MONGODB_URI || 'no definido'}`);
  console.log(`   PORT: ${process.env.PORT || 'no definido'}`);
  console.log('');

  // Verificar si hay archivo .env
  const fs = require('fs');
  const path = require('path');
  const envPath = path.join(__dirname, '.env');
  
  if (fs.existsSync(envPath)) {
    console.log('✅ Archivo .env encontrado');
  } else {
    console.log('⚠️ Archivo .env no encontrado');
    console.log('💡 Ejecuta: npm run configure-mongodb');
    return;
  }

  // Probar conexión si hay MONGODB_URI
  if (process.env.MONGODB_URI) {
    console.log('🔄 Probando conexión a MongoDB...');
    
    try {
      await mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000,
      });
      
      console.log('✅ Conexión exitosa a MongoDB');
      console.log(`📍 Base de datos: ${mongoose.connection.db.databaseName}`);
      console.log(`📍 Host: ${mongoose.connection.host}`);
      console.log(`📍 Puerto: ${mongoose.connection.port}`);
      
      // Listar colecciones
      const collections = await mongoose.connection.db.listCollections().toArray();
      console.log(`📊 Colecciones encontradas: ${collections.length}`);
      
      if (collections.length > 0) {
        console.log('   Colecciones:');
        collections.forEach(col => {
          console.log(`   - ${col.name}`);
        });
      }
      
      await mongoose.disconnect();
      console.log('✅ Conexión cerrada correctamente');
      
    } catch (error) {
      console.error('❌ Error conectando a MongoDB:', error.message);
      console.log('');
      console.log('🔧 Soluciones:');
      console.log('1. Verifica que MongoDB esté ejecutándose');
      console.log('2. Verifica la cadena de conexión en .env');
      console.log('3. Para Atlas: verifica que tu IP esté en la lista blanca');
      console.log('4. Ejecuta: npm run configure-mongodb');
    }
  } else {
    console.log('⚠️ MONGODB_URI no está configurado');
    console.log('💡 Ejecuta: npm run configure-mongodb');
  }

  console.log('');
  console.log('📋 Próximos pasos:');
  console.log('1. Si la conexión falla: npm run configure-mongodb');
  console.log('2. Si la conexión es exitosa: npm run setup-db');
  console.log('3. Para iniciar el servidor: npm run dev');
}

// Ejecutar si se llama directamente
if (require.main === module) {
  testMongoDBConfig().catch((error) => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
}

module.exports = testMongoDBConfig;
