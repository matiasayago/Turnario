const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Configuración específica para resolver errores de módulos
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

// Deshabilitar cache
config.resetCache = true;

module.exports = config;