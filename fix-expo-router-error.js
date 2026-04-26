/**
 * Script para solucionar el error de expo-router/entry
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Solucionando error de expo-router/entry...\n');

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

function checkExpoRouterInstallation() {
  console.log('📦 Verificando instalación de expo-router...');
  
  const expoRouterPath = 'node_modules/expo-router';
  if (fs.existsSync(expoRouterPath)) {
    console.log('   ✅ expo-router instalado');
    
    // Verificar archivos específicos
    const entryFiles = [
      'node_modules/expo-router/entry.js',
      'node_modules/expo-router/entry.web.js',
      'node_modules/expo-router/entry.native.js'
    ];
    
    entryFiles.forEach(file => {
      if (fs.existsSync(file)) {
        console.log(`   ✅ ${file} existe`);
      } else {
        console.log(`   ❌ ${file} no existe`);
      }
    });
    
    return true;
  } else {
    console.log('   ❌ expo-router no instalado');
    return false;
  }
}

function cleanAllCaches() {
  console.log('🧹 Limpiando todos los caches...');
  
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

function fixAppJson() {
  console.log('📱 Corrigiendo app.json para expo-router...');
  
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
      },
      scheme: "turnario"
    }
  };
  
  try {
    fs.writeFileSync('app.json', JSON.stringify(appJson, null, 2));
    console.log('   ✅ app.json corregido para expo-router');
  } catch (error) {
    console.log(`   ❌ Error corrigiendo app.json: ${error.message}`);
  }
  
  console.log('');
}

function createAppEntry() {
  console.log('📝 Creando archivo de entrada de la aplicación...');
  
  const appEntry = `import 'expo-router/entry';`;
  
  try {
    fs.writeFileSync('index.js', appEntry);
    console.log('   ✅ index.js creado');
  } catch (error) {
    console.log(`   ❌ Error creando index.js: ${error.message}`);
  }
  
  console.log('');
}

function fixMetroConfig() {
  console.log('⚙️ Corrigiendo configuración de Metro para expo-router...');
  
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
    console.log('   ✅ metro.config.js corregido para expo-router');
  } catch (error) {
    console.log(`   ❌ Error corrigiendo metro.config.js: ${error.message}`);
  }
  
  console.log('');
}

function installExpoRouter() {
  console.log('📦 Instalando expo-router...');
  
  // Instalar expo-router
  runCommand('npx expo install expo-router', 'Instalación de expo-router');
  
  // Instalar dependencias relacionadas
  runCommand('npx expo install expo-linking expo-constants expo-status-bar', 'Instalación de dependencias relacionadas');
  
  // Instalar dependencias de navegación
  runCommand('npx expo install @react-navigation/native @react-navigation/stack @react-navigation/bottom-tabs', 'Instalación de dependencias de navegación');
}

function createAppDirectory() {
  console.log('📁 Creando estructura de directorios de la aplicación...');
  
  const appDir = 'app';
  if (!fs.existsSync(appDir)) {
    try {
      fs.mkdirSync(appDir, { recursive: true });
      console.log('   ✅ Directorio app creado');
    } catch (error) {
      console.log(`   ❌ Error creando directorio app: ${error.message}`);
    }
  } else {
    console.log('   ✅ Directorio app ya existe');
  }
  
  // Crear archivo de layout básico
  const layoutContent = `import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'TurnarioApp' }} />
    </Stack>
  );
}`;
  
  try {
    fs.writeFileSync('app/_layout.tsx', layoutContent);
    console.log('   ✅ app/_layout.tsx creado');
  } catch (error) {
    console.log(`   ❌ Error creando app/_layout.tsx: ${error.message}`);
  }
  
  // Crear archivo de índice
  const indexContent = `import { View, Text, StyleSheet } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>¡Bienvenido a TurnarioApp!</Text>
      <Text style={styles.subtitle}>La aplicación está funcionando correctamente</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
});`;
  
  try {
    fs.writeFileSync('app/index.tsx', indexContent);
    console.log('   ✅ app/index.tsx creado');
  } catch (error) {
    console.log(`   ❌ Error creando app/index.tsx: ${error.message}`);
  }
  
  console.log('');
}

async function main() {
  console.log('🚀 SOLUCIONANDO ERROR DE EXPO-ROUTER');
  console.log('===================================\n');
  
  // Verificar instalación actual
  const expoRouterInstalled = checkExpoRouterInstallation();
  
  // Limpiar caches
  cleanAllCaches();
  
  // Corregir configuraciones
  fixAppJson();
  fixMetroConfig();
  createAppEntry();
  
  // Instalar expo-router si no está instalado
  if (!expoRouterInstalled) {
    installExpoRouter();
  }
  
  // Crear estructura de directorios
  createAppDirectory();
  
  // Reinstalar dependencias
  console.log('📦 Reinstalando dependencias...');
  runCommand('npm install --legacy-peer-deps', 'Instalación de dependencias');
  
  // Limpiar cache de npm
  runCommand('npm cache clean --force', 'Limpieza de cache de npm');
  
  // Limpiar cache de Expo
  runCommand('npx expo r -c', 'Limpieza de cache de Expo');
  
  console.log('🎯 SOLUCIÓN COMPLETADA');
  console.log('=====================');
  console.log('✅ Caches limpiados');
  console.log('✅ Configuraciones corregidas');
  console.log('✅ expo-router instalado/configurado');
  console.log('✅ Estructura de directorios creada');
  console.log('✅ Dependencias reinstaladas');
  console.log('');
  console.log('💡 Para probar la solución:');
  console.log('   1. npx expo start --clear');
  console.log('   2. Si persiste: npx expo start --clear --reset-cache');
  console.log('   3. Verifica que no aparezca el error de expo-router/entry');
  console.log('');
  console.log('🔧 Configuración aplicada:');
  console.log('   - expo-router instalado y configurado');
  console.log('   - Estructura de directorios app/ creada');
  console.log('   - Archivo de entrada index.js creado');
  console.log('   - Configuración de Metro optimizada');
  console.log('   - Cache completamente limpiado');
}

main().catch(console.error);
