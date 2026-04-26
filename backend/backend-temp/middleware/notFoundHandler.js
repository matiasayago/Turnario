const logger = require('../config/logger');

/**
 * Middleware para manejar rutas no encontradas (404)
 * Debe ser el último middleware en la cadena
 */
const notFoundHandler = (req, res, next) => {
  try {
    // Log de la ruta no encontrada
    logger.warn('Route not found', {
      requestId: req.requestId || 'unknown',
      method: req.method,
      url: req.originalUrl,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id || 'anonymous',
      timestamp: new Date().toISOString()
    });

    // Respuesta 404
    res.status(404).json({
      error: 'Not Found',
      message: 'La ruta solicitada no fue encontrada',
      timestamp: new Date().toISOString(),
      requestId: req.requestId || 'unknown',
      path: req.originalUrl,
      method: req.method,
      suggestions: getSuggestions(req.originalUrl)
    });

  } catch (error) {
    logger.error('Error en notFoundHandler:', error);
    
    // Fallback simple
    res.status(404).json({
      error: 'Not Found',
      message: 'La ruta solicitada no fue encontrada'
    });
  }
};

/**
 * Generar sugerencias de rutas similares
 */
function getSuggestions(url) {
  const suggestions = [];
  
  // Extraer la primera parte de la URL
  const parts = url.split('/').filter(part => part.length > 0);
  
  if (parts.length === 0) {
    suggestions.push('/api/v1/auth/login');
    suggestions.push('/api/v1/auth/register');
    suggestions.push('/health');
    return suggestions;
  }

  const firstPart = parts[0];
  
  // Sugerencias basadas en la primera parte de la URL
  switch (firstPart.toLowerCase()) {
    case 'api':
      if (parts.length === 1) {
        suggestions.push('/api/v1/auth/login');
        suggestions.push('/api/v1/auth/register');
        suggestions.push('/api/v1/users');
        suggestions.push('/api/v1/appointments');
      } else if (parts.length === 2) {
        const version = parts[1];
        suggestions.push(`/${version}/auth/login`);
        suggestions.push(`/${version}/auth/register`);
        suggestions.push(`/${version}/users`);
        suggestions.push(`/${version}/appointments`);
      }
      break;
      
    case 'auth':
      suggestions.push('/api/v1/auth/login');
      suggestions.push('/api/v1/auth/register');
      suggestions.push('/api/v1/auth/forgot-password');
      break;
      
    case 'users':
      suggestions.push('/api/v1/users');
      suggestions.push('/api/v1/users/profile');
      break;
      
    case 'appointments':
      suggestions.push('/api/v1/appointments');
      suggestions.push('/api/v1/appointments/new');
      break;
      
    case 'services':
      suggestions.push('/api/v1/services');
      suggestions.push('/api/v1/services/public');
      break;
      
    case 'clinics':
      suggestions.push('/api/v1/clinics');
      suggestions.push('/api/v1/clinics/public');
      break;
      
    case 'payments':
      suggestions.push('/api/v1/payments');
      suggestions.push('/api/v1/payments/new');
      break;
      
    case 'medical':
      if (parts[1] === 'history') {
        suggestions.push('/api/v1/medical-history');
      } else if (parts[1] === 'authorizations') {
        suggestions.push('/api/v1/medical-authorizations');
      } else {
        suggestions.push('/api/v1/medical-history');
        suggestions.push('/api/v1/medical-authorizations');
      }
      break;
      
    case 'chat':
      suggestions.push('/api/v1/chat/conversations');
      suggestions.push('/api/v1/chat/messages');
      break;
      
    case 'reviews':
      suggestions.push('/api/v1/reviews');
      suggestions.push('/api/v1/reviews/new');
      break;
      
    case 'uploads':
      suggestions.push('/api/v1/uploads');
      break;
      
    default:
      // Sugerencias generales
      suggestions.push('/api/v1/auth/login');
      suggestions.push('/api/v1/auth/register');
      suggestions.push('/health');
      suggestions.push('/api-docs');
      break;
  }

  // Agregar sugerencias de documentación
  suggestions.push('/api-docs');
  suggestions.push('/health');
  
  return suggestions.slice(0, 5); // Máximo 5 sugerencias
}

module.exports = notFoundHandler;
