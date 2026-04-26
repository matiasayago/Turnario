module.exports = {
  // Directorio raíz de los tests
  testEnvironment: 'node',
  
  // Directorios donde buscar tests
  testMatch: [
    '**/tests/**/*.test.js',
    '**/__tests__/**/*.js'
  ],
  
  // Directorios a ignorar
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/'
  ],
  
  // Configuración de cobertura
  collectCoverage: true,
  collectCoverageFrom: [
    'controllers/**/*.js',
    'models/**/*.js',
    'middleware/**/*.js',
    'services/**/*.js',
    '!**/node_modules/**',
    '!**/tests/**',
    '!**/coverage/**'
  ],
  
  // Reportes de cobertura
  coverageReporters: [
    'text',
    'lcov',
    'html'
  ],
  
  // Umbral de cobertura
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  
  // Variables de entorno para tests
  testEnvironmentOptions: {
    NODE_ENV: 'test',
    JWT_SECRET: 'test-secret-key',
    JWT_REFRESH_SECRET: 'test-refresh-secret-key',
    MONGODB_URI: 'mongodb://localhost:27017/turnario-test'
  },
  
  // Timeout para tests
  testTimeout: 30000,
  
  // Verbosidad
  verbose: true,
  
  // Detectar cambios
  watchPathIgnorePatterns: [
    '/node_modules/',
    '/coverage/'
  ]
};
