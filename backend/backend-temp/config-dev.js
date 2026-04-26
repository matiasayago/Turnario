// Configuración de desarrollo temporal
module.exports = {
  NODE_ENV: 'development',
  PORT: 3000,
  API_VERSION: 'v1',
  MONGODB_URI: 'mongodb://localhost:27017/turnario',
  EMAIL_ENABLED: false,
  JWT_SECRET: 'dev-secret-key-change-in-production',
  JWT_EXPIRES_IN: '24h',
  JWT_REFRESH_SECRET: 'dev-refresh-secret-key-change-in-production',
  JWT_REFRESH_EXPIRES_IN: '7d',
  CORS_ORIGIN: 'http://localhost:19006,http://localhost:3000',
  RATE_LIMIT_WINDOW_MS: 900000,
  RATE_LIMIT_MAX_REQUESTS: 100,
  MAX_FILE_SIZE: '10mb',
  UPLOAD_PATH: './uploads',
  LOG_LEVEL: 'info'
};
