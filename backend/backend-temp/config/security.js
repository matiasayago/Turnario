const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const logger = require('./logger');

class SecurityConfig {
  constructor() {
    this.corsOptions = {
      origin: this.parseCorsOrigin(),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
        'X-API-Key',
        'X-Request-ID'
      ],
      exposedHeaders: [
        'X-Total-Count',
        'X-Page-Count',
        'X-Current-Page',
        'X-Per-Page'
      ],
      maxAge: 86400 // 24 horas
    };

    this.rateLimitOptions = {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutos
      max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // máximo 100 requests por ventana
      message: {
        error: 'Demasiadas solicitudes desde esta IP, por favor intente nuevamente más tarde.',
        retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000)
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        logger.warn('Rate limit exceeded', {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          path: req.path
        });
        
        res.status(429).json({
          error: 'Rate limit exceeded',
          message: 'Demasiadas solicitudes desde esta IP, por favor intente nuevamente más tarde.',
          retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000)
        });
      }
    };

    this.helmetOptions = {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:", "https:"],
          scriptSrc: ["'self'"],
          connectSrc: ["'self'", "ws:", "wss:"],
          frameSrc: ["'none'"],
          objectSrc: ["'none'"],
          upgradeInsecureRequests: []
        }
      },
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" }
    };
  }

  parseCorsOrigin() {
    const corsOrigin = process.env.CORS_ORIGIN;
    if (!corsOrigin) {
      return [
        'http://localhost:3000', 
        'http://localhost:8081', 
        'http://localhost:8082',
        'http://localhost:19006', // Expo web
        'http://localhost:19000', // Expo dev tools
        'exp://localhost:19000',  // Expo
        'exp://192.168.1.100:19000' // Expo en red local
      ];
    }

    if (corsOrigin === '*') {
      return true;
    }

    return corsOrigin.split(',').map(origin => origin.trim());
  }

  // Configuración de CORS
  getCorsMiddleware() {
    return cors(this.corsOptions);
  }

  // Configuración de Rate Limiting
  getRateLimitMiddleware() {
    return rateLimit(this.rateLimitOptions);
  }

  // Rate limiting específico para autenticación
  getAuthRateLimitMiddleware() {
    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutos
      max: 5, // máximo 5 intentos de login por ventana
      message: {
        error: 'Demasiados intentos de autenticación, por favor intente nuevamente más tarde.',
        retryAfter: 900
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        logger.warn('Auth rate limit exceeded', {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          path: req.path
        });
        
        res.status(429).json({
          error: 'Auth rate limit exceeded',
          message: 'Demasiados intentos de autenticación, por favor intente nuevamente más tarde.',
          retryAfter: 900
        });
      }
    });
  }

  // Rate limiting específico para pagos
  getPaymentRateLimitMiddleware() {
    return rateLimit({
      windowMs: 60 * 1000, // 1 minuto
      max: 10, // máximo 10 operaciones de pago por minuto
      message: {
        error: 'Demasiadas operaciones de pago, por favor intente nuevamente más tarde.',
        retryAfter: 60
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        logger.warn('Payment rate limit exceeded', {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          path: req.path
        });
        
        res.status(429).json({
          error: 'Payment rate limit exceeded',
          message: 'Demasiadas operaciones de pago, por favor intente nuevamente más tarde.',
          retryAfter: 60
        });
      }
    });
  }

  // Rate limiting específico para subida de archivos
  getUploadRateLimitMiddleware() {
    return rateLimit({
      windowMs: 60 * 1000, // 1 minuto
      max: 20, // máximo 20 subidas por minuto
      message: {
        error: 'Demasiadas subidas de archivos, por favor intente nuevamente más tarde.',
        retryAfter: 60
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        logger.warn('Upload rate limit exceeded', {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          path: req.path
        });
        
        res.status(429).json({
          error: 'Upload rate limit exceeded',
          message: 'Demasiadas subidas de archivos, por favor intente nuevamente más tarde.',
          retryAfter: 60
        });
      }
    });
  }

  // Configuración de Helmet
  getHelmetMiddleware() {
    return helmet(this.helmetOptions);
  }

  // Middleware de seguridad adicional
  getSecurityMiddleware() {
    return (req, res, next) => {
      // Agregar headers de seguridad adicionales
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
      
      // Generar ID único para cada request
      req.requestId = this.generateRequestId();
      res.setHeader('X-Request-ID', req.requestId);
      
      // Log del request
      logger.info('Request started', {
        requestId: req.requestId,
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      next();
    };
  }

  // Generar ID único para requests
  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Middleware de validación de tamaño de archivo
  getFileSizeValidationMiddleware() {
    const maxFileSize = parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024; // 10MB por defecto
    
    return (req, res, next) => {
      if (req.headers['content-length'] && parseInt(req.headers['content-length']) > maxFileSize) {
        logger.warn('File size validation failed', {
          requestId: req.requestId,
          fileSize: req.headers['content-length'],
          maxFileSize
        });
        
        return res.status(413).json({
          error: 'File too large',
          message: `El archivo excede el tamaño máximo permitido de ${Math.round(maxFileSize / (1024 * 1024))}MB`
        });
      }
      
      next();
    };
  }

  // Middleware de validación de tipo de archivo
  getFileTypeValidationMiddleware() {
    const allowedTypes = (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/gif,application/pdf').split(',');
    
    return (req, res, next) => {
      if (req.file && !allowedTypes.includes(req.file.mimetype)) {
        logger.warn('File type validation failed', {
          requestId: req.requestId,
          fileType: req.file.mimetype,
          allowedTypes
        });
        
        return res.status(400).json({
          error: 'Invalid file type',
          message: 'Tipo de archivo no permitido',
          allowedTypes
        });
      }
      
      next();
    };
  }

  // Middleware de validación de API Key
  getApiKeyValidationMiddleware() {
    return (req, res, next) => {
      const apiKey = req.headers['x-api-key'];
      
      if (!apiKey) {
        return res.status(401).json({
          error: 'API key required',
          message: 'Se requiere API key para acceder a este endpoint'
        });
      }
      
      // Aquí puedes validar la API key contra una base de datos o configuración
      // Por ahora, solo verificamos que exista
      req.apiKey = apiKey;
      next();
    };
  }

  // Middleware de validación de IP
  getIpValidationMiddleware() {
    const allowedIPs = process.env.ALLOWED_IPS ? process.env.ALLOWED_IPS.split(',') : null;
    
    return (req, res, next) => {
      if (!allowedIPs) {
        return next(); // No hay restricción de IP
      }
      
      const clientIP = req.ip || req.connection.remoteAddress;
      
      if (!allowedIPs.includes(clientIP)) {
        logger.warn('IP validation failed', {
          requestId: req.requestId,
          clientIP,
          allowedIPs
        });
        
        return res.status(403).json({
          error: 'IP not allowed',
          message: 'Tu IP no está autorizada para acceder a este endpoint'
        });
      }
      
      next();
    };
  }
}

module.exports = new SecurityConfig();
