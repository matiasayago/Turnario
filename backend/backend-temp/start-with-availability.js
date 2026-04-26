#!/usr/bin/env node

const mongoose = require('mongoose');
const { seedAvailability } = require('./scripts/seed-availability');
require('dotenv').config();

// Configuración de la base de datos
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/turnario';

async function startServerWithAvailability() {
  try {
    console.log('🚀 Iniciando servidor con configuración de disponibilidad...');
    
    // Conectar a MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB');
    
    // Ejecutar seed de disponibilidad
    console.log('🌱 Ejecutando seed de disponibilidad...');
    await seedAvailability();
    
    // Iniciar el servidor principal
    console.log('🔄 Iniciando servidor principal...');
    require('./server.js');
    
  } catch (error) {
    console.error('❌ Error iniciando servidor:', error);
    process.exit(1);
  }
}

// Manejar cierre graceful
process.on('SIGINT', async () => {
  console.log('\n🛑 Cerrando servidor...');
  await mongoose.connection.close();
  console.log('✅ Conexión a MongoDB cerrada');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Cerrando servidor...');
  await mongoose.connection.close();
  console.log('✅ Conexión a MongoDB cerrada');
  process.exit(0);
});

// Iniciar servidor
startServerWithAvailability();
