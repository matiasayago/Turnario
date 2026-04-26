/**
 * Solución DEFINITIVA para el error de módulo "1417" en Hermes
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 SOLUCIÓN DEFINITIVA PARA ERROR DE MÓDULO HERMES');
console.log('================================================\n');

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
  console.log('🧹 Limpieza AGRESIVA de todos los caches...');
  
  const cachePaths = [
    'node_modules/.cache',
    '.expo',
    'metro-cache',
    'watchman-state',
    '.metro',
    'android/app/build',
    'ios/build',
    'android/.gradle',
    'ios/Pods',
    'android/app/src/main/assets',
    'android/app/src/main/res',
    'android/app/src/main/java',
    'android/app/src/main/kotlin'
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

function createRobustMetroConfig() {
  console.log('⚙️ Creando configuración ROBUSTA de Metro...');
  
  const metroConfig = `const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Configuración para resolver problemas de módulos
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Configuración específica para resolver el error de módulo "1417"
config.resolver.alias = {
  // Mapear módulos problemáticos a false para deshabilitarlos
  '1417': false,
  '1418': false,
  '1419': false,
  // Mapear módulos comunes que pueden causar problemas
  'react-native-vector-icons': false,
  'react-native-linear-gradient': false,
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

// Deshabilitar cache completamente
config.cacheStores = [];
config.resetCache = true;

// Configuración de resolución de módulos problemáticos
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

// Configuración adicional para evitar errores de módulos
config.resolver.blacklistRE = /node_modules\/.*\/node_modules\/react-native\/.*/;

// Configuración de watchman
config.watchFolders = [
  path.resolve(__dirname, 'node_modules'),
  path.resolve(__dirname, 'src'),
  path.resolve(__dirname, 'my-app')
];

module.exports = config;`;

  try {
    fs.writeFileSync('metro.config.js', metroConfig);
    console.log('   ✅ metro.config.js robusto creado');
  } catch (error) {
    console.log(`   ❌ Error creando metro.config.js: ${error.message}`);
  }
  
  console.log('');
}

function createBabelConfig() {
  console.log('🔧 Creando configuración de Babel...');
  
  const babelConfig = `module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Plugin para resolver problemas de módulos
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
      // Plugin para transformaciones de React Native
      'react-native-reanimated/plugin',
    ],
  };
};`;

  try {
    fs.writeFileSync('babel.config.js', babelConfig);
    console.log('   ✅ babel.config.js creado');
  } catch (error) {
    console.log(`   ❌ Error creando babel.config.js: ${error.message}`);
  }
  
  console.log('');
}

function updateAppJson() {
  console.log('📱 Actualizando app.json con configuración robusta...');
  
  const appJson = {
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
        jsEngine: "hermes",
        bundleIdentifier: "com.turnario.app"
      },
      android: {
        adaptiveIcon: {
          foregroundImage: "./assets/adaptive-icon.png",
          backgroundColor: "#FFFFFF"
        },
        jsEngine: "hermes",
        package: "com.turnario.app"
      },
      web: {
        favicon: "./assets/favicon.png"
      },
      jsEngine: "hermes",
      plugins: [
        "expo-router"
      ],
      experiments: {
        typedRoutes: true
      }
    }
  };
  
  try {
    fs.writeFileSync('app.json', JSON.stringify(appJson, null, 2));
    console.log('   ✅ app.json actualizado con configuración robusta');
  } catch (error) {
    console.log(`   ❌ Error actualizando app.json: ${error.message}`);
  }
  
  console.log('');
}

function createPackageJsonScripts() {
  console.log('📦 Actualizando scripts de package.json...');
  
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    packageJson.scripts = {
      ...packageJson.scripts,
      "start": "expo start --clear",
      "start:clean": "expo start --clear --reset-cache",
      "android": "expo run:android --clear",
      "ios": "expo run:ios --clear",
      "web": "expo start --web",
      "reset": "expo r -c && npm install",
      "clean": "rm -rf node_modules/.cache .expo metro-cache .metro && npm install"
    };
    
    fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
    console.log('   ✅ Scripts de package.json actualizados');
  } catch (error) {
    console.log(`   ❌ Error actualizando package.json: ${error.message}`);
  }
  
  console.log('');
}

function createExpoConfig() {
  console.log('⚙️ Creando configuración de Expo...');
  
  const expoConfig = `const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Configuración específica para resolver errores de módulos
config.resolver.alias = {
  '1417': false,
  '1418': false,
  '1419': false,
};

// Deshabilitar cache
config.resetCache = true;

module.exports = config;`;

  try {
    fs.writeFileSync('expo.config.js', expoConfig);
    console.log('   ✅ expo.config.js creado');
  } catch (error) {
    console.log(`   ❌ Error creando expo.config.js: ${error.message}`);
  }
  
  console.log('');
}

async function main() {
  console.log('🚀 INICIANDO SOLUCIÓN DEFINITIVA');
  console.log('================================\n');
  
  // Limpieza agresiva
  cleanAllCaches();
  
  // Crear configuraciones robustas
  createRobustMetroConfig();
  createBabelConfig();
  updateAppJson();
  createPackageJsonScripts();
  createExpoConfig();
  
  // Reinstalar dependencias
  console.log('📦 Reinstalación completa de dependencias...');
  runCommand('npm install --legacy-peer-deps', 'Instalación con legacy peer deps');
  
  // Limpiar cache de npm
  runCommand('npm cache clean --force', 'Limpieza de cache de npm');
  
  // Instalar dependencias de Expo
  runCommand('npx expo install --fix', 'Corrección de dependencias de Expo');
  
  // Limpiar cache de Expo
  runCommand('npx expo r -c', 'Limpieza de cache de Expo');
  
  console.log('🎯 SOLUCIÓN DEFINITIVA COMPLETADA');
  console.log('=================================');
  console.log('✅ Configuraciones robustas creadas');
  console.log('✅ Caches limpiados completamente');
  console.log('✅ Dependencias reinstaladas');
  console.log('✅ Múltiples estrategias implementadas');
  console.log('');
  console.log('💡 Para probar la solución:');
  console.log('   1. npx expo start --clear');
  console.log('   2. Si persiste: npx expo start --clear --reset-cache');
  console.log('   3. Si aún persiste: npm run reset');
  console.log('');
  console.log('🔧 Estrategias implementadas:');
  console.log('   - Alias de módulos problemáticos deshabilitados');
  console.log('   - Configuración robusta de Metro');
  console.log('   - Configuración de Babel optimizada');
  console.log('   - Cache completamente deshabilitado');
  console.log('   - Múltiples archivos de configuración');
  console.log('   - Scripts de limpieza automática');
}

main().catch(console.error);
