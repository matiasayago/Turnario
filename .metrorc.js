// Configuración adicional de Metro para resolver módulos problemáticos
module.exports = {
  resolver: {
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
    platforms: ['ios', 'android', 'native', 'web'],
    sourceExts: ['js', 'jsx', 'json', 'ts', 'tsx'],
    resolverMainFields: ['react-native', 'browser', 'main'],
    unstable_enableSymlinks: false,
    unstable_enablePackageExports: false,
  },
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
    minifierConfig: {
      keep_fnames: true,
      mangle: {
        keep_fnames: true,
      },
    },
  },
  cacheStores: [],
  resetCache: true,
};
