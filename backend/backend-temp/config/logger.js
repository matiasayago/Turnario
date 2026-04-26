const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Crear directorio de logs si no existe
const logDir = 'logs';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Configuración de formatos personalizados
const customFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }
    
    if (stack) {
      log += `\n${stack}`;
    }
    
    return log;
  })
);

// Configuración de transportes
const transports = [
  // Consola con colores
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple(),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        let log = `${timestamp} [${level}]: ${message}`;
        
        if (Object.keys(meta).length > 0) {
          log += ` ${JSON.stringify(meta)}`;
        }
        
        return log;
      })
    )
  }),
  
  // Archivo de logs general
  new winston.transports.File({
    filename: path.join(logDir, 'app.log'),
    format: customFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
    tailable: true
  }),
  
  // Archivo de errores
  new winston.transports.File({
    filename: path.join(logDir, 'error.log'),
    level: 'error',
    format: customFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
    tailable: true
  }),
  
  // Archivo de warnings
  new winston.transports.File({
    filename: path.join(logDir, 'warn.log'),
    level: 'warn',
    format: customFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 3,
    tailable: true
  })
];

// Configuración del logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: customFormat,
  defaultMeta: { 
    service: 'turnario-backend',
    environment: process.env.NODE_ENV || 'development'
  },
  transports,
  exitOnError: false
});

// Manejar excepciones no capturadas
logger.exceptions.handle(
  new winston.transports.File({
    filename: path.join(logDir, 'exceptions.log'),
    format: customFormat
  })
);

// Manejar promesas rechazadas
logger.rejections.handle(
  new winston.transports.File({
    filename: path.join(logDir, 'rejections.log'),
    format: customFormat
  })
);

// Función para loggear requests HTTP
logger.logRequest = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress,
      userId: req.user?.id || 'anonymous'
    };
    
    if (res.statusCode >= 400) {
      logger.warn('HTTP Request', logData);
    } else {
      logger.info('HTTP Request', logData);
    }
  });
  
  next();
};

// Función para loggear errores de base de datos
logger.logDatabaseError = (operation, error, collection = 'unknown') => {
  logger.error('Database Error', {
    operation,
    collection,
    error: error.message,
    stack: error.stack,
    code: error.code,
    name: error.name
  });
};

// Función para loggear operaciones de autenticación
logger.logAuth = (action, userId, success, details = {}) => {
  const level = success ? 'info' : 'warn';
  logger[level]('Authentication', {
    action,
    userId,
    success,
    ...details
  });
};

// Función para loggear operaciones de pagos
logger.logPayment = (action, paymentId, amount, status, details = {}) => {
  logger.info('Payment', {
    action,
    paymentId,
    amount,
    status,
    ...details
  });
};

// Función para loggear operaciones de citas
logger.logAppointment = (action, appointmentId, professionalId, clientId, details = {}) => {
  logger.info('Appointment', {
    action,
    appointmentId,
    professionalId,
    clientId,
    ...details
  });
};

// Función para loggear operaciones de autorización médica
logger.logMedicalAuth = (action, professionalId, patientId, success, details = {}) => {
  const level = success ? 'info' : 'warn';
  logger[level]('Medical Authorization', {
    action,
    professionalId,
    patientId,
    success,
    ...details
  });
};

// Función para loggear métricas de rendimiento
logger.logPerformance = (operation, duration, details = {}) => {
  logger.info('Performance', {
    operation,
    duration: `${duration}ms`,
    ...details
  });
};

// Función para loggear eventos del sistema
logger.logSystemEvent = (event, details = {}) => {
  logger.info('System Event', {
    event,
    ...details
  });
};

// Función para loggear errores de validación
logger.logValidationError = (field, value, rule, details = {}) => {
  logger.warn('Validation Error', {
    field,
    value,
    rule,
    ...details
  });
};

// Función para loggear operaciones de archivos
logger.logFileOperation = (operation, filename, success, details = {}) => {
  const level = success ? 'info' : 'warn';
  logger[level]('File Operation', {
    operation,
    filename,
    success,
    ...details
  });
};

// Función para loggear operaciones de email
logger.logEmail = (action, recipient, success, details = {}) => {
  const level = success ? 'info' : 'warn';
  logger[level]('Email', {
    action,
    recipient,
    success,
    ...details
  });
};

// Función para loggear operaciones de WebSocket
logger.logWebSocket = (action, userId, success, details = {}) => {
  const level = success ? 'info' : 'warn';
  logger[level]('WebSocket', {
    action,
    userId,
    success,
    ...details
  });
};

// Función para loggear operaciones de cache
logger.logCache = (operation, key, success, details = {}) => {
  const level = success ? 'info' : 'warn';
  logger[level]('Cache', {
    operation,
    key,
    success,
    ...details
  });
};

module.exports = logger;
