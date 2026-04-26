const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Configuración básica
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Configuración específica para resolver el error de módulo "1416" y otros módulos problemáticos
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

// Configuración de resolución de módulos problemáticos
config.resolver.unstable_enableSymlinks = false;
config.resolver.unstable_enablePackageExports = false;

// Deshabilitar cache para evitar problemas
config.cacheStores = [];
config.resetCache = true;

// Configuración de watchman
config.watchFolders = [
  path.resolve(__dirname, 'node_modules'),
  path.resolve(__dirname, 'src'),
  path.resolve(__dirname, 'my-app')
];

// Configuración adicional para resolver módulos
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
];

module.exports = config;