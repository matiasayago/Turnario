#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Configurando Backend Turnario...\n');

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

const log = (message, color = 'reset') => {
  console.log(`${colors[color]}${message}${colors.reset}`);
};

const logStep = (step, description) => {
  log(`\n${step} ${description}`, 'cyan');
};

const logSuccess = (message) => {
  log(`✅ ${message}`, 'green');
};

const logError = (message) => {
  log(`❌ ${message}`, 'red');
};

const logWarning = (message) => {
  log(`⚠️  ${message}`, 'yellow');
};

const logInfo = (message) => {
  log(`ℹ️  ${message}`, 'blue');
};

// Verificar Node.js
logStep('1', 'Verificando Node.js...');
try {
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  
  if (majorVersion < 18) {
    logError(`Node.js ${nodeVersion} detectado. Se requiere Node.js >= 18.0.0`);
    process.exit(1);
  }
  
  logSuccess(`Node.js ${nodeVersion} detectado`);
} catch (error) {
  logError('No se pudo verificar la versión de Node.js');
  process.exit(1);
}

// Verificar npm
logStep('2', 'Verificando npm...');
try {
  const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
  logSuccess(`npm ${npmVersion} detectado`);
} catch (error) {
  logError('npm no está instalado o no es accesible');
  process.exit(1);
}

// Verificar si ya existe package-lock.json
logStep('3', 'Verificando dependencias...');
if (fs.existsSync('package-lock.json')) {
  logInfo('Dependencias ya instaladas, omitiendo instalación');
} else {
  logInfo('Instalando dependencias...');
  try {
    execSync('npm install', { stdio: 'inherit' });
    logSuccess('Dependencias instaladas correctamente');
  } catch (error) {
    logError('Error al instalar dependencias');
    process.exit(1);
  }
}

// Verificar archivo .env
logStep('4', 'Verificando configuración...');
if (!fs.existsSync('.env')) {
  if (fs.existsSync('env.example')) {
    logInfo('Creando archivo .env desde env.example...');
    try {
      fs.copyFileSync('env.example', '.env');
      logSuccess('Archivo .env creado');
      logWarning('Recuerda editar .env con tus configuraciones');
    } catch (error) {
      logError('Error al crear archivo .env');
    }
  } else {
    logWarning('No se encontró env.example, crea manualmente el archivo .env');
  }
} else {
  logSuccess('Archivo .env ya existe');
}

// Crear directorios necesarios
logStep('5', 'Creando directorios...');
const directories = ['uploads', 'logs'];
directories.forEach(dir => {
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
      logSuccess(`Directorio ${dir} creado`);
    } catch (error) {
      logWarning(`No se pudo crear el directorio ${dir}`);
    }
  } else {
    logInfo(`Directorio ${dir} ya existe`);
  }
});

// Verificar MongoDB
logStep('6', 'Verificando MongoDB...');
logInfo('Asegúrate de que MongoDB esté ejecutándose en tu sistema');
logInfo('O configura MongoDB Atlas en tu archivo .env');

// Crear script de inicio rápido
logStep('7', 'Creando scripts de inicio...');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

if (!packageJson.scripts.dev) {
  packageJson.scripts.dev = 'nodemon src/server.js';
  packageJson.scripts.start = 'node src/server.js';
  
  try {
    fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
    logSuccess('Scripts agregados a package.json');
  } catch (error) {
    logWarning('No se pudo actualizar package.json');
  }
}

// Crear archivo de configuración de ejemplo
logStep('8', 'Creando configuración de ejemplo...');
const configExample = `// Configuración de ejemplo para desarrollo
// Copia este archivo a config.js y ajusta según tus necesidades

module.exports = {
  development: {
    port: 3001,
    mongoUri: 'mongodb://localhost:27017/turnario',
    jwtSecret: 'dev_secret_key_change_in_production',
    corsOrigin: ['http://localhost:3000', 'http://localhost:8081']
  },
  production: {
    port: process.env.PORT || 3001,
    mongoUri: process.env.MONGODB_URI_PROD,
    jwtSecret: process.env.JWT_SECRET,
    corsOrigin: process.env.CORS_ORIGIN?.split(',') || []
  }
};
`;

if (!fs.existsSync('config.example.js')) {
  try {
    fs.writeFileSync('config.example.js', configExample);
    logSuccess('Archivo config.example.js creado');
  } catch (error) {
    logWarning('No se pudo crear config.example.js');
  }
}

// Mostrar resumen
logStep('9', 'Resumen de la configuración');
logSuccess('Backend Turnario configurado correctamente!');
log('\n📋 Próximos pasos:', 'bright');
log('1. Edita el archivo .env con tus configuraciones', 'blue');
log('2. Asegúrate de que MongoDB esté ejecutándose', 'blue');
log('3. Ejecuta: npm run dev', 'blue');
log('4. El servidor estará disponible en: http://localhost:3001', 'blue');
log('5. Health check: http://localhost:3001/health', 'blue');

log('\n🔧 Comandos útiles:', 'bright');
log('npm run dev          - Servidor de desarrollo', 'blue');
log('npm start           - Servidor de producción', 'blue');
log('npm test            - Ejecutar tests', 'blue');
log('npm run lint        - Verificar código', 'blue');

log('\n📚 Documentación:', 'bright');
log('README.md           - Documentación completa', 'blue');
log('API endpoints      - Ver README.md para detalles', 'blue');

log('\n🎉 ¡Listo para desarrollar!', 'green');

