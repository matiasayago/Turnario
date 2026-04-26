module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)'
  ],
  moduleNameMapping: {
    '^1416$': 'identity-obj-proxy',
    '^1417$': 'identity-obj-proxy',
    '^1418$': 'identity-obj-proxy',
    '^1419$': 'identity-obj-proxy',
    '^1420$': 'identity-obj-proxy',
    '^1421$': 'identity-obj-proxy',
    '^1422$': 'identity-obj-proxy',
    '^1423$': 'identity-obj-proxy',
    '^1424$': 'identity-obj-proxy',
    '^1425$': 'identity-obj-proxy',
    '^1426$': 'identity-obj-proxy',
    '^1427$': 'identity-obj-proxy',
    '^1428$': 'identity-obj-proxy',
    '^1429$': 'identity-obj-proxy',
    '^1430$': 'identity-obj-proxy',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jsdom',
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
  ],
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json'],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },
};
