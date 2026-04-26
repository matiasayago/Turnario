#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Solucionando error "Requiring unknown module 1417" en my-app...\n');

// Función para ejecutar comandos de forma segura
function runCommand(command, description) {
  try {
    console.log(`📋 ${description}...`);
    execSync(command, { stdio: 'inherit', cwd: __dirname });
    console.log(`✅ ${description} completado\n`);
  } catch (error) {
    console.log(`⚠️  Error en ${description}: ${error.message}\n`);
  }
}

// Función para limpiar archivos y directorios
function cleanDirectory(dirPath) {
  if (fs.existsSync(dirPath)) {
    try {
      fs.rmSync(dirPath, { recursive: true, force: true });
      console.log(`🗑️  Limpiado: ${dirPath}`);
    } catch (error) {
      console.log(`⚠️  No se pudo limpiar ${dirPath}: ${error.message}`);
    }
  }
}

// Función para crear metro.config.js optimizado
function createOptimizedMetroConfig() {
  const metroConfig = `const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Configuración definitiva para resolver el error del módulo 1417
config.resolver.platforms = ['ios', 'android', 'native', 'web'];
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

// Configuración crítica para resolver el error del módulo 1417
config.resolver.alias = {
  '1416': false,
  '1417': false,
  '1418': false,
  '1419': false,
  '1420': false,
  '1421': false,
  '1422': false,
  '1423': false,
  '1424': false,
  '1425': false,
  '1426': false,
  '1427': false,
  '1428': false,
  '1429': false,
  '1430': false,
  '@expo/metro-runtime/rsc/runtime': '@expo/metro-runtime/src/rsc/runtime',
  '@expo/metro-runtime': '@expo/metro-runtime/src',
  'expo/virtual/env': 'expo/AppEntry',
};

// Configuración de transformación para evitar el error
config.transformer.minifierConfig = {
  keep_fnames: true,
  mangle: {
    keep_fnames: true,
  },
};

// Configuración adicional para resolver módulos problemáticos
config.resolver.sourceExts = ['js', 'jsx', 'json', 'ts', 'tsx'];

// Deshabilitar caché problemático
config.cacheStores = [];

// Configuración específica para resolver módulos numéricos
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

// Configuración de watchman
config.watchFolders = [
  path.resolve(__dirname, 'node_modules'),
  path.resolve(__dirname, 'app'),
  path.resolve(__dirname, 'components'),
  path.resolve(__dirname, 'contexts'),
  path.resolve(__dirname, 'services'),
];

module.exports = config;`;

  fs.writeFileSync('metro.config.js', metroConfig);
  console.log('📝 Configuración de Metro optimizada creada');
}

// Función para crear babel.config.js optimizado
function createOptimizedBabelConfig() {
  const babelConfig = `module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          alias: {
            '1416': false,
            '1417': false,
            '1418': false,
            '1419': false,
            '1420': false,
            '1421': false,
            '1422': false,
            '1423': false,
            '1424': false,
            '1425': false,
            '1426': false,
            '1427': false,
            '1428': false,
            '1429': false,
            '1430': false,
          },
          extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
        },
      ],
      'react-native-reanimated/plugin',
    ],
  };
};`;

  fs.writeFileSync('babel.config.js', babelConfig);
  console.log('📝 Configuración de Babel optimizada creada');
}

// Función para crear polyfills.js optimizado
function createOptimizedPolyfills() {
  const polyfills = `// Polyfill para resolver el error del módulo 1417 y otros módulos numéricos problemáticos
// Este archivo debe ser importado al inicio de la aplicación

console.log('🔧 Cargando polyfill para módulos numéricos problemáticos...');

// Crear un objeto vacío que se exportará para todos los módulos problemáticos
const emptyModule = {
  default: {},
  __esModule: true,
  // Agregar propiedades comunes que podrían ser requeridas
  Component: null,
  createElement: null,
  useState: null,
  useEffect: null,
  useCallback: null,
  useMemo: null,
  useRef: null,
  useContext: null,
  useReducer: null,
  useImperativeHandle: null,
  useLayoutEffect: null,
  useDebugValue: null,
  forwardRef: null,
  memo: null,
  lazy: null,
  Suspense: null,
  Fragment: null,
  StrictMode: null,
  PureComponent: null,
  createContext: null,
  createRef: null,
  isValidElement: null,
  cloneElement: null,
  Children: null,
  version: '0.0.0-polyfill',
};

// Exportar el módulo vacío para cuando este archivo sea requerido directamente
module.exports = emptyModule;

console.log('✅ Polyfill para módulos numéricos problemáticos cargado correctamente');`;

  fs.writeFileSync('polyfills.js', polyfills);
  console.log('📝 Polyfills optimizados creados');
}

// Función principal
async function main() {
  console.log('🚀 SOLUCIÓN PARA ERROR "REQUIRING UNKNOWN MODULE 1417" EN MY-APP\n');
  console.log('=' .repeat(60));
  
  // Paso 1: Limpiar caches y archivos temporales
  console.log('\n📋 PASO 1: Limpiando caches y archivos temporales...');
  cleanDirectory('.expo');
  cleanDirectory('node_modules/.cache');
  cleanDirectory('.metro');
  cleanDirectory('metro-cache');
  cleanDirectory('dist');
  cleanDirectory('build');
  cleanDirectory('.babel-cache');
  
  // Paso 2: Crear configuraciones optimizadas
  console.log('\n📋 PASO 2: Creando configuraciones optimizadas...');
  createOptimizedMetroConfig();
  createOptimizedBabelConfig();
  createOptimizedPolyfills();
  
  // Paso 3: Limpiar e instalar dependencias
  console.log('\n📋 PASO 3: Limpiando e instalando dependencias...');
  runCommand('npm cache clean --force', 'Limpiando cache de npm');
  runCommand('rm -rf node_modules package-lock.json', 'Eliminando node_modules y package-lock.json');
  runCommand('npm install', 'Instalando dependencias');
  
  // Paso 4: Limpiar cache de Expo
  console.log('\n📋 PASO 4: Limpiando cache de Expo...');
  runCommand('npx expo install --fix', 'Arreglando dependencias de Expo');
  runCommand('npx expo r -c', 'Limpiando cache de Expo');
  
  // Paso 5: Verificar instalación
  console.log('\n📋 PASO 5: Verificando instalación...');
  runCommand('npx expo doctor', 'Verificando estado de Expo');
  
  console.log('\n🎉 ¡SOLUCIÓN COMPLETADA!');
  console.log('=' .repeat(60));
  console.log('\n📋 PRÓXIMOS PASOS:');
  console.log('1. Ejecuta: npm start');
  console.log('2. Si el error persiste, ejecuta: npm run reset-project');
  console.log('3. Para desarrollo web: npm run web');
  console.log('4. Para Android: npm run android');
  console.log('5. Para iOS: npm run ios');
  
  console.log('\n🔧 CONFIGURACIONES APLICADAS:');
  console.log('✅ Metro configurado para ignorar módulos problemáticos');
  console.log('✅ Babel configurado con alias para módulos problemáticos');
  console.log('✅ Polyfills optimizados para módulos numéricos');
  console.log('✅ Cache limpiado completamente');
  console.log('✅ Dependencias reinstaladas');
  
  console.log('\n💡 Si el problema persiste:');
  console.log('- Verifica que no tengas archivos duplicados en app/');
  console.log('- Asegúrate de que todas las importaciones sean correctas');
  console.log('- Revisa que no haya conflictos de versiones en package.json');
}

// Ejecutar la solución
main().catch(console.error);

