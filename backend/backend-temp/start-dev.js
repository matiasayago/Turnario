#!/usr/bin/env node

require('dotenv').config();
const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Iniciando servidor Turnario en modo desarrollo...\n');

// Verificar si existe el archivo .env
const fs = require('fs');
const envPath = path.join(__dirname, '.env');

if (!fs.existsSync(envPath)) {
  console.log('⚠️  Archivo .env no encontrado, copiando desde env.example...');
  try {
    fs.copyFileSync(path.join(__dirname, 'env.example'), envPath);
    console.log('✅ Archivo .env creado exitosamente');
  } catch (error) {
    console.error('❌ Error creando archivo .env:', error.message);
    process.exit(1);
  }
}

// Función para iniciar el servidor simple
function startSimpleServer() {
  console.log('🔄 Iniciando servidor simple...');
  
  const serverProcess = spawn('node', ['server-simple.js'], {
    cwd: __dirname,
    stdio: 'inherit',
    shell: true
  });

  serverProcess.on('error', (error) => {
    console.error('❌ Error iniciando servidor:', error);
  });

  serverProcess.on('close', (code) => {
    console.log(`\n🔄 Servidor cerrado con código ${code}`);
  });

  // Manejar señales de terminación
  process.on('SIGINT', () => {
    console.log('\n🔄 Cerrando servidor...');
    serverProcess.kill('SIGINT');
  });

  process.on('SIGTERM', () => {
    console.log('\n🔄 Cerrando servidor...');
    serverProcess.kill('SIGTERM');
  });
}

// Función para verificar dependencias
function checkDependencies() {
  console.log('🔍 Verificando dependencias...');
  
  const packageJson = require('./package.json');
  const requiredDeps = ['express', 'cors', 'mongoose', 'dotenv'];
  
  let missingDeps = [];
  
  for (const dep of requiredDeps) {
    try {
      require.resolve(dep);
    } catch (error) {
      missingDeps.push(dep);
    }
  }
  
  if (missingDeps.length > 0) {
    console.log('⚠️  Dependencias faltantes:', missingDeps.join(', '));
    console.log('🔄 Instalando dependencias...');
    
    const installProcess = spawn('npm', ['install'], {
      cwd: __dirname,
      stdio: 'inherit',
      shell: true
    });
    
    installProcess.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Dependencias instaladas exitosamente');
        startSimpleServer();
      } else {
        console.error('❌ Error instalando dependencias');
        process.exit(1);
      }
    });
  } else {
    console.log('✅ Todas las dependencias están instaladas');
    startSimpleServer();
  }
}

// Función para mostrar información del servidor
function showServerInfo() {
  console.log('📋 Información del Servidor:');
  console.log(`   • Puerto: ${process.env.PORT || 3000}`);
  console.log(`   • Entorno: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   • URL: http://localhost:${process.env.PORT || 3000}`);
  console.log(`   • API: http://localhost:${process.env.PORT || 3000}/api/v1`);
  console.log(`   • Health: http://localhost:${process.env.PORT || 3000}/health`);
  console.log('');
}

// Función principal
async function main() {
  try {
    showServerInfo();
    checkDependencies();
  } catch (error) {
    console.error('❌ Error iniciando servidor:', error);
    process.exit(1);
  }
}

// Ejecutar si es el archivo principal
if (require.main === module) {
  main();
}

module.exports = { startSimpleServer, checkDependencies };