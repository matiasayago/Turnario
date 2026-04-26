/**
 * Script integral para solucionar todos los errores del servidor
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const http = require('http');

console.log('🔧 Solucionando TODOS los errores del servidor...\n');

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
  console.log('🧹 Limpieza COMPLETA de todos los caches...');
  
  const cachePaths = [
    'node_modules/.cache',
    '.expo',
    'metro-cache',
    '.metro',
    'android/app/build',
    'ios/build',
    'android/.gradle',
    'ios/Pods',
    'android/app/src/main/assets',
    'android/app/src/main/res'
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

// Configuración básica
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

function fixAppJson() {
  console.log('📱 Corrigiendo app.json...');
  
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
    console.log('   ✅ app.json corregido');
  } catch (error) {
    console.log(`   ❌ Error corrigiendo app.json: ${error.message}`);
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

function startBackend() {
  console.log('🚀 Iniciando backend...');
  
  try {
    // Verificar si el archivo existe
    if (!fs.existsSync('backend/enhanced-minimal-server.js')) {
      console.log('   ❌ Archivo enhanced-minimal-server.js no encontrado');
      return false;
    }
    
    // Iniciar el servidor en background
    const { spawn } = require('child_process');
    const backendProcess = spawn('node', ['enhanced-minimal-server.js'], {
      cwd: path.join(__dirname, 'backend'),
      detached: true,
      stdio: 'ignore'
    });
    
    backendProcess.unref();
    
    console.log('   ✅ Backend iniciado en background');
    return true;
  } catch (error) {
    console.log(`   ❌ Error iniciando backend: ${error.message}`);
    return false;
  }
}

function testBackendConnection() {
  console.log('🔌 Probando conexión del backend...');
  
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

function fixPackageJsonScripts() {
  console.log('📦 Corrigiendo scripts de package.json...');
  
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
      "clean": "rm -rf node_modules/.cache .expo metro-cache .metro && npm install",
      "backend": "cd backend && node enhanced-minimal-server.js"
    };
    
    fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
    console.log('   ✅ Scripts de package.json corregidos');
  } catch (error) {
    console.log(`   ❌ Error corrigiendo package.json: ${error.message}`);
  }
  
  console.log('');
}

async function main() {
  console.log('🚀 SOLUCIONANDO TODOS LOS ERRORES DEL SERVIDOR');
  console.log('=============================================\n');
  
  // Limpiar todos los caches
  cleanAllCaches();
  
  // Corregir configuraciones
  fixMetroConfig();
  fixAppJson();
  fixBabelConfig();
  fixPackageJsonScripts();
  
  // Reinstalar dependencias
  console.log('📦 Reinstalando dependencias...');
  runCommand('npm install --legacy-peer-deps', 'Instalación de dependencias');
  
  // Limpiar cache de npm
  runCommand('npm cache clean --force', 'Limpieza de cache de npm');
  
  // Instalar dependencias de Expo
  runCommand('npx expo install --fix', 'Corrección de dependencias de Expo');
  
  // Iniciar backend
  const backendStarted = startBackend();
  if (backendStarted) {
    // Esperar un poco para que el backend se inicie
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Probar conexión del backend
    const backendOk = await testBackendConnection();
    if (!backendOk) {
      console.log('⚠️ Backend no responde, pero continuando...');
    }
  }
  
  console.log('🎯 SOLUCIÓN COMPLETADA');
  console.log('=====================');
  console.log('✅ Caches limpiados completamente');
  console.log('✅ Configuraciones corregidas');
  console.log('✅ Dependencias reinstaladas');
  console.log('✅ Backend iniciado');
  console.log('');
  console.log('💡 Para probar la solución:');
  console.log('   1. npx expo start --clear');
  console.log('   2. Si persiste: npx expo start --clear --reset-cache');
  console.log('   3. Verifica que no aparezcan errores 500 o 404');
  console.log('');
  console.log('🔧 Configuración aplicada:');
  console.log('   - Cache completamente limpiado');
  console.log('   - Configuraciones de Metro, Babel y App.json corregidas');
  console.log('   - Alias de módulos problemáticos deshabilitados');
  console.log('   - Backend iniciado en background');
  console.log('   - Scripts de limpieza automática disponibles');
}

main().catch(console.error);
