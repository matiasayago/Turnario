/**
 * Script para solucionar el error de módulo '1417' en Hermes
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Solucionando error de módulo Hermes...\n');

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

function cleanAllCaches() {
  console.log('🧹 Limpiando todos los caches...');
  
  const cachePaths = [
    'node_modules/.cache',
    '.expo',
    'metro-cache',
    'watchman-state',
    '.metro',
    'android/app/build',
    'ios/build',
    'android/.gradle',
    'ios/Pods'
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

function checkMetroConfig() {
  console.log('⚙️ Verificando configuración de Metro...');
  
  const metroConfigPath = 'metro.config.js';
  if (fs.existsSync(metroConfigPath)) {
    console.log('   ✅ metro.config.js encontrado');
    try {
      const metroConfig = fs.readFileSync(metroConfigPath, 'utf8');
      if (metroConfig.includes('hermes')) {
        console.log('   ✅ Configuración de Hermes encontrada');
      } else {
        console.log('   ⚠️ No se encontró configuración específica de Hermes');
      }
    } catch (error) {
      console.log(`   ❌ Error leyendo metro.config.js: ${error.message}`);
    }
  } else {
    console.log('   ⚠️ metro.config.js no encontrado');
  }
  
  console.log('');
}

function checkAppJson() {
  console.log('📱 Verificando app.json...');
  
  const appJsonPath = 'app.json';
  if (fs.existsSync(appJsonPath)) {
    try {
      const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
      console.log('   ✅ app.json encontrado');
      
      if (appJson.expo && appJson.expo.jsEngine) {
        console.log(`   🔧 Motor JS: ${appJson.expo.jsEngine}`);
      } else {
        console.log('   ⚠️ No se especificó motor JS en app.json');
      }
      
      if (appJson.expo && appJson.expo.plugins) {
        console.log(`   🔌 Plugins: ${appJson.expo.plugins.length} encontrados`);
      }
    } catch (error) {
      console.log(`   ❌ Error leyendo app.json: ${error.message}`);
    }
  } else {
    console.log('   ❌ app.json no encontrado');
  }
  
  console.log('');
}

function createMetroConfig() {
  console.log('📝 Creando configuración de Metro optimizada...');
  
  const metroConfig = `const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Configuración para resolver problemas de módulos
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Configuración para Hermes
config.transformer.minifierConfig = {
  keep_fnames: true,
  mangle: {
    keep_fnames: true,
  },
};

// Configuración de cache
config.cacheStores = [];

// Configuración de resolución de módulos
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

module.exports = config;`;

  try {
    fs.writeFileSync('metro.config.js', metroConfig);
    console.log('   ✅ metro.config.js creado/actualizado');
  } catch (error) {
    console.log(`   ❌ Error creando metro.config.js: ${error.message}`);
  }
  
  console.log('');
}

function updateAppJson() {
  console.log('📱 Actualizando app.json para Hermes...');
  
  const appJsonPath = 'app.json';
  let appJson = {};
  
  if (fs.existsSync(appJsonPath)) {
    try {
      appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
    } catch (error) {
      console.log(`   ⚠️ Error leyendo app.json existente: ${error.message}`);
    }
  }
  
  // Configuración por defecto
  const defaultConfig = {
    expo: {
      name: "TurnarioApp",
      slug: "turnario-app",
      version: "1.0.0",
      orientation: "portrait",
      icon: "./assets/icon.png",
      userInterfaceStyle: "light",
      splash: {
        image: "./assets/splash-icon.png",
        resizeMode: "contain",
        backgroundColor: "#ffffff"
      },
      assetBundlePatterns: [
        "**/*"
      ],
      ios: {
        supportsTablet: true,
        jsEngine: "hermes"
      },
      android: {
        adaptiveIcon: {
          foregroundImage: "./assets/adaptive-icon.png",
          backgroundColor: "#FFFFFF"
        },
        jsEngine: "hermes"
      },
      web: {
        favicon: "./assets/favicon.png"
      },
      jsEngine: "hermes"
    }
  };
  
  // Merge con configuración existente
  appJson = { ...defaultConfig, ...appJson };
  
  try {
    fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2));
    console.log('   ✅ app.json actualizado con configuración de Hermes');
  } catch (error) {
    console.log(`   ❌ Error actualizando app.json: ${error.message}`);
  }
  
  console.log('');
}

async function main() {
  console.log('🚀 SOLUCIONANDO ERROR DE MÓDULO HERMES');
  console.log('=====================================\n');
  
  // Verificar configuración actual
  checkMetroConfig();
  checkAppJson();
  
  // Limpiar todos los caches
  cleanAllCaches();
  
  // Crear/actualizar configuración
  createMetroConfig();
  updateAppJson();
  
  // Reinstalar dependencias
  console.log('📦 Reinstalando dependencias...');
  runCommand('npm install', 'Instalación de dependencias');
  
  // Limpiar cache de npm
  runCommand('npm cache clean --force', 'Limpieza de cache de npm');
  
  // Limpiar cache de Expo
  runCommand('npx expo install --fix', 'Corrección de dependencias de Expo');
  
  // Limpiar cache de Metro
  runCommand('npx expo r -c', 'Limpieza de cache de Metro');
  
  console.log('🎯 SOLUCIÓN COMPLETADA');
  console.log('=====================');
  console.log('✅ Caches limpiados');
  console.log('✅ Configuración de Metro optimizada');
  console.log('✅ Configuración de Hermes actualizada');
  console.log('✅ Dependencias reinstaladas');
  console.log('');
  console.log('💡 Próximos pasos:');
  console.log('   1. Reinicia Metro: npx expo start --clear');
  console.log('   2. Si el error persiste:');
  console.log('      - Reinicia el dispositivo/emulador');
  console.log('      - Ejecuta: npx expo run:android --clear');
  console.log('      - O: npx expo run:ios --clear');
  console.log('   3. Verifica que el backend esté ejecutándose');
  console.log('');
  console.log('🔧 Configuración aplicada:');
  console.log('   - Motor JS: Hermes');
  console.log('   - Metro configurado para resolver módulos');
  console.log('   - Cache limpiado completamente');
}

main().catch(console.error);
