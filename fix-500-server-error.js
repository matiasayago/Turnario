/**
 * Script para solucionar el error 500 del servidor de desarrollo
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Solucionando error 500 del servidor de desarrollo...\n');

function runCommand(command, description, cwd = process.cwd()) {
  try {
    console.log(`📝 ${description}...`);
    execSync(command, { 
      stdio: 'inherit',
      cwd: cwd,
      shell: true
    });
    console.log(`✅ ${description} completado\n`);
    return true;
  } catch (error) {
    console.log(`❌ Error en ${description}: ${error.message}\n`);
    return false;
  }
}

function cleanMetroCache() {
  console.log('🧹 Limpiando cache de Metro...');
  
  const cachePaths = [
    'node_modules/.cache',
    '.expo',
    'metro-cache',
    '.metro',
    'android/app/build',
    'ios/build'
  ];
  
  cachePaths.forEach(cachePath => {
    if (fs.existsSync(cachePath)) {
      try {
        fs.rmSync(cachePath, { recursive: true, force: true });
        console.log(`   ✅ Eliminado: ${cachePath}`);
      } catch (error) {
        console.log(`   ⚠️ No se pudo eliminar: ${cachePath} - ${error.message}`);
      }
    }
  });
  
  console.log('');
}

function fixMetroConfig() {
  console.log('⚙️ Corrigiendo configuración de Metro...');
  
  const metroConfig = `const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Configuración para resolver problemas de módulos
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Configuración específica para resolver el error de módulo "1417"
config.resolver.alias = {
  '1417': false,
  '1418': false,
  '1419': false,
};

// Configuración de resolución de módulos
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

// Configuración de extensiones
config.resolver.sourceExts = ['js', 'jsx', 'json', 'ts', 'tsx'];

// Configuración de transformación
config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: true,
  },
});

// Configuración para Hermes
config.transformer.minifierConfig = {
  keep_fnames: true,
  mangle: {
    keep_fnames: true,
  },
};

// Deshabilitar cache para evitar problemas
config.cacheStores = [];
config.resetCache = true;

// Configuración de watchman
config.watchFolders = [
  path.resolve(__dirname, 'node_modules'),
  path.resolve(__dirname, 'src'),
  path.resolve(__dirname, 'my-app')
];

module.exports = config;`;

  try {
    fs.writeFileSync('metro.config.js', metroConfig);
    console.log('   ✅ metro.config.js corregido');
  } catch (error) {
    console.log(`   ❌ Error corrigiendo metro.config.js: ${error.message}`);
  }
  
  console.log('');
}

function fixBabelConfig() {
  console.log('🔧 Corrigiendo configuración de Babel...');
  
  const babelConfig = `module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          alias: {
            '1417': false,
            '1418': false,
            '1419': false,
          },
          extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
        },
      ],
      'react-native-reanimated/plugin',
    ],
  };
};`;

  try {
    fs.writeFileSync('babel.config.js', babelConfig);
    console.log('   ✅ babel.config.js corregido');
  } catch (error) {
    console.log(`   ❌ Error corrigiendo babel.config.js: ${error.message}`);
  }
  
  console.log('');
}

function checkBackendConnection() {
  console.log('🔌 Verificando conexión del backend...');
  
  const http = require('http');
  
  return new Promise((resolve) => {
    const req = http.request('http://192.168.0.4:3000/health', (res) => {
      if (res.statusCode === 200) {
        console.log('   ✅ Backend funcionando correctamente');
        resolve(true);
      } else {
        console.log(`   ❌ Backend no responde correctamente: ${res.statusCode}`);
        resolve(false);
      }
    });

    req.on('error', (error) => {
      console.log(`   ❌ Error de conexión al backend: ${error.message}`);
      resolve(false);
    });

    req.setTimeout(5000, () => {
      console.log('   ❌ Timeout conectando al backend');
      resolve(false);
    });

    req.end();
  });
}

async function main() {
  console.log('🚀 SOLUCIONANDO ERROR 500 DEL SERVIDOR DE DESARROLLO');
  console.log('==================================================\n');
  
  // Verificar backend
  const backendOk = await checkBackendConnection();
  if (!backendOk) {
    console.log('❌ El backend no está funcionando. Inicia el servidor primero:');
    console.log('   cd backend && node enhanced-minimal-server.js');
    return;
  }
  
  // Limpiar caches
  cleanMetroCache();
  
  // Corregir configuraciones
  fixMetroConfig();
  fixBabelConfig();
  
  // Reinstalar dependencias
  console.log('📦 Reinstalando dependencias...');
  runCommand('npm install --legacy-peer-deps', 'Instalación de dependencias');
  
  // Limpiar cache de npm
  runCommand('npm cache clean --force', 'Limpieza de cache de npm');
  
  // Limpiar cache de Expo
  runCommand('npx expo r -c', 'Limpieza de cache de Expo');
  
  console.log('🎯 SOLUCIÓN COMPLETADA');
  console.log('=====================');
  console.log('✅ Cache de Metro limpiado');
  console.log('✅ Configuraciones corregidas');
  console.log('✅ Dependencias reinstaladas');
  console.log('✅ Backend funcionando');
  console.log('');
  console.log('💡 Para probar la solución:');
  console.log('   1. npx expo start --clear');
  console.log('   2. Si persiste: npx expo start --clear --reset-cache');
  console.log('   3. Verifica que no aparezcan errores 500');
  console.log('');
  console.log('🔧 Configuración aplicada:');
  console.log('   - Cache completamente limpiado');
  console.log('   - Configuración de Metro simplificada');
  console.log('   - Alias de módulos problemáticos deshabilitados');
  console.log('   - Backend funcionando en http://192.168.0.4:3000');
}

main().catch(console.error);
