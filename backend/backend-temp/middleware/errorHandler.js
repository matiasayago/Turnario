const logger = require('../config/logger');

class ErrorHandler {
  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
  }

  // Middleware principal de manejo de errores
  handleError(err, req, res, next) {
    try {
      // Log del error
      this.logError(err, req);
      
      // Determinar tipo de error
      const errorType = this.getErrorType(err);
      const statusCode = this.getStatusCode(err);
      const message = this.getErrorMessage(err);
      
      // Respuesta de error
      const errorResponse = {
        error: errorType,
        message: message,
        timestamp: new Date().toISOString(),
        requestId: req.requestId || 'unknown',
        path: req.originalUrl,
        method: req.method
      };

      // Agregar detalles adicionales en desarrollo
      if (this.isDevelopment) {
        errorResponse.stack = err.stack;
        errorResponse.details = err;
      }

      // Agregar código de error si existe
      if (err.code) {
        errorResponse.code = err.code;
      }

      // Agregar campos de validación si es error de validación
      if (err.errors && Array.isArray(err.errors)) {
        errorResponse.validationErrors = err.errors;
      }

      // Enviar respuesta
      res.status(statusCode).json(errorResponse);

    } catch (error) {
      // Fallback en caso de error en el manejador
      logger.error('Error en manejador de errores:', error);
      
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Error interno del servidor',
        timestamp: new Date().toISOString(),
        requestId: req.requestId || 'unknown'
      });
    }
  }

  // Log del error
  logError(err, req) {
    const logData = {
      requestId: req.requestId || 'unknown',
      method: req.method,
      url: req.originalUrl,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id || 'anonymous',
      error: {
        name: err.name,
        message: err.message,
        stack: err.stack,
        code: err.code
      }
    };

    // Determinar nivel de log basado en el tipo de error
    if (this.isClientError(err)) {
      logger.warn('Client Error', logData);
    } else if (this.isValidationError(err)) {
      logger.warn('Validation Error', logData);
    } else if (this.isAuthenticationError(err)) {
      logger.warn('Authentication Error', logData);
    } else if (this.isAuthorizationError(err)) {
      logger.warn('Authorization Error', logData);
    } else {
      logger.error('Server Error', logData);
    }
  }

  // Determinar tipo de error
  getErrorType(err) {
    if (this.isValidationError(err)) return 'Validation Error';
    if (this.isAuthenticationError(err)) return 'Authentication Error';
    if (this.isAuthorizationError(err)) return 'Authorization Error';
    if (this.isNotFoundError(err)) return 'Not Found';
    if (this.isConflictError(err)) return 'Conflict';
    if (this.isRateLimitError(err)) return 'Rate Limit Exceeded';
    if (this.isFileError(err)) return 'File Error';
    if (this.isDatabaseError(err)) return 'Database Error';
    if (this.isPaymentError(err)) return 'Payment Error';
    if (this.isEmailError(err)) return 'Email Error';
    
    return 'Internal Server Error';
  }

  // Determinar código de estado HTTP
  getStatusCode(err) {
    if (this.isValidationError(err)) return 400;
    if (this.isAuthenticationError(err)) return 401;
    if (this.isAuthorizationError(err)) return 403;
    if (this.isNotFoundError(err)) return 404;
    if (this.isConflictError(err)) return 409;
    if (this.isRateLimitError(err)) return 429;
    if (this.isFileError(err)) return 413;
    if (this.isPaymentError(err)) return 402;
    if (this.isEmailError(err)) return 502;
    
    return 500;
  }

  // Obtener mensaje de error
  getErrorMessage(err) {
    // Si ya tiene un mensaje personalizado, usarlo
    if (err.message && err.message !== err.name) {
      return err.message;
    }

    // Mensajes por defecto según el tipo
    if (this.isValidationError(err)) {
      return 'Los datos proporcionados no son válidos';
    }
    if (this.isAuthenticationError(err)) {
      return 'Se requiere autenticación para acceder a este recurso';
    }
    if (this.isAuthorizationError(err)) {
      return 'No tienes permisos para acceder a este recurso';
    }
    if (this.isNotFoundError(err)) {
      return 'El recurso solicitado no fue encontrado';
    }
    if (this.isConflictError(err)) {
      return 'El recurso ya existe o hay un conflicto';
    }
    if (this.isRateLimitError(err)) {
      return 'Demasiadas solicitudes, por favor intente más tarde';
    }
    if (this.isFileError(err)) {
      return 'Error procesando el archivo';
    }
    if (this.isDatabaseError(err)) {
      return 'Error en la base de datos';
    }
    if (this.isPaymentError(err)) {
      return 'Error procesando el pago';
    }
    if (this.isEmailError(err)) {
      return 'Error enviando email';
    }

    return 'Error interno del servidor';
  }

  // Verificar tipos de error
  isClientError(err) {
    return err.statusCode >= 400 && err.statusCode < 500;
  }

  isValidationError(err) {
    return err.name === 'ValidationError' || 
           err.name === 'ValidatorError' ||
           err.code === 'VALIDATION_ERROR' ||
           (err.errors && Array.isArray(err.errors));
  }

  isAuthenticationError(err) {
    return err.name === 'JsonWebTokenError' ||
           err.name === 'TokenExpiredError' ||
           err.code === 'UNAUTHORIZED' ||
           err.statusCode === 401;
  }

  isAuthorizationError(err) {
    return err.name === 'ForbiddenError' ||
           err.code === 'FORBIDDEN' ||
           err.statusCode === 403;
  }

  isNotFoundError(err) {
    return err.name === 'NotFoundError' ||
           err.code === 'NOT_FOUND' ||
           err.statusCode === 404;
  }

  isConflictError(err) {
    return err.name === 'ConflictError' ||
           err.code === 'CONFLICT' ||
           err.statusCode === 409 ||
           err.code === 11000; // MongoDB duplicate key
  }

  isRateLimitError(err) {
    return err.name === 'RateLimitError' ||
           err.code === 'RATE_LIMIT_EXCEEDED' ||
           err.statusCode === 429;
  }

  isFileError(err) {
    return err.name === 'FileError' ||
           err.code === 'FILE_TOO_LARGE' ||
           err.code === 'INVALID_FILE_TYPE' ||
           err.statusCode === 413;
  }

  isDatabaseError(err) {
    return err.name === 'MongoError' ||
           err.name === 'MongooseError' ||
           err.code === 'DATABASE_ERROR';
  }

  isPaymentError(err) {
    return err.name === 'PaymentError' ||
           err.code === 'PAYMENT_FAILED' ||
           err.code === 'INSUFFICIENT_FUNDS' ||
           err.statusCode === 402;
  }

  isEmailError(err) {
    return err.name === 'EmailError' ||
           err.code === 'EMAIL_SEND_FAILED' ||
           err.code === 'SMTP_ERROR';
  }

  // Middleware para capturar errores asíncronos
  catchAsync(fn) {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  // Middleware para manejar errores de validación específicos
  handleValidationError(err) {
    const errors = [];
    
    if (err.errors) {
      Object.keys(err.errors).forEach(field => {
        const error = err.errors[field];
        errors.push({
          field: field,
          message: error.message,
          value: error.value,
          kind: error.kind
        });
      });
    }

    return {
      name: 'ValidationError',
      message: 'Error de validación',
      errors: errors,
      statusCode: 400
    };
  }

  // Middleware para manejar errores de MongoDB
  handleMongoError(err) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      return {
        name: 'ConflictError',
        message: `El ${field} ya existe`,
        field: field,
        statusCode: 409
      };
    }

    return {
      name: 'DatabaseError',
      message: 'Error en la base de datos',
      originalError: err.message,
      statusCode: 500
    };
  }

  // Middleware para manejar errores de JWT
  handleJWTError(err) {
    if (err.name === 'TokenExpiredError') {
      return {
        name: 'TokenExpiredError',
        message: 'El token ha expirado',
        statusCode: 401
      };
    }

    if (err.name === 'JsonWebTokenError') {
      return {
        name: 'JsonWebTokenError',
        message: 'Token inválido',
        statusCode: 401
      };
    }

    return {
      name: 'AuthenticationError',
      message: 'Error de autenticación',
      statusCode: 401
    };
  }

  // Middleware para manejar errores de archivos
  handleFileError(err) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return {
        name: 'FileError',
        message: 'El archivo excede el tamaño máximo permitido',
        statusCode: 413
      };
    }

    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return {
        name: 'FileError',
        message: 'Campo de archivo inesperado',
        statusCode: 400
      };
    }

    return {
      name: 'FileError',
      message: 'Error procesando archivo',
      statusCode: 500
    };
  }

  // Middleware para manejar errores de pagos
  handlePaymentError(err) {
    if (err.code === 'PAYMENT_DECLINED') {
      return {
        name: 'PaymentError',
        message: 'El pago fue rechazado',
        statusCode: 402
      };
    }

    if (err.code === 'INSUFFICIENT_FUNDS') {
      return {
        name: 'PaymentError',
        message: 'Fondos insuficientes',
        statusCode: 402
      };
    }

    return {
      name: 'PaymentError',
      message: 'Error procesando pago',
      statusCode: 500
    };
  }
}

const errorHandler = new ErrorHandler();

// Middleware principal
const handleError = errorHandler.handleError.bind(errorHandler);

// Middleware para capturar errores asíncronos
const catchAsync = errorHandler.catchAsync.bind(errorHandler);

module.exports = {
  handleError,
  catchAsync,
  ErrorHandler: errorHandler
};
