module.exports = function(api) {
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
};