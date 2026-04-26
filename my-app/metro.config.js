const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Configuración para SDK 54
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

// Excluir archivos problemáticos del watch
config.watchFolders = [];
config.resolver.blockList = [
  /.*\/node_modules\/@react-native\/codegen\/.*/,
  /.*\/node_modules\/@react-native\/community-cli-plugin\/.*/,
  /.*\/InternalBytecode\.js$/,
];

module.exports = config;
