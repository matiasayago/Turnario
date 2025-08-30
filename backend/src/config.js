module.exports = {
  PORT: 3001,
  NODE_ENV: 'development',
  MONGODB_URI: 'mongodb://localhost:27017/turnario',
  JWT_SECRET: 'dev_jwt_secret_turnario_2024',
  JWT_EXPIRES_IN: '7d',
  RATE_LIMIT_WINDOW_MS: 900000,
  RATE_LIMIT_MAX_REQUESTS: 100,
  CORS_ORIGIN: 'http://localhost:3000,http://localhost:8081,http://localhost:8082'
};

