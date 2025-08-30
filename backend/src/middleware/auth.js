const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware para verificar token JWT
const authenticateToken = async (req, res, next) => {
  try {
    // Obtener el token del header Authorization
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token de acceso requerido',
        error: 'MISSING_TOKEN'
      });
    }
    
    // Verificar el token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Buscar el usuario en la base de datos
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no encontrado',
        error: 'USER_NOT_FOUND'
      });
    }
    
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Cuenta desactivada',
        error: 'ACCOUNT_DISABLED'
      });
    }
    
    // Agregar el usuario al objeto request
    req.user = user;
    
    // Actualizar última actividad
    user.updateActivity();
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token inválido',
        error: 'INVALID_TOKEN'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expirado',
        error: 'TOKEN_EXPIRED'
      });
    }
    
    console.error('Error en autenticación:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: 'INTERNAL_ERROR'
    });
  }
};

// Middleware para verificar roles específicos
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado',
        error: 'NOT_AUTHENTICATED'
      });
    }
    
    // Convertir roles a array si es un string
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    if (!allowedRoles.includes(req.user.userType)) {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado. Rol insuficiente.',
        error: 'INSUFFICIENT_PERMISSIONS',
        requiredRoles: allowedRoles,
        userRole: req.user.userType
      });
    }
    
    next();
  };
};

// Middleware para verificar que el usuario sea cliente
const requireClient = requireRole('client');

// Middleware para verificar que el usuario sea profesional
const requireProfessional = requireRole('professional');

// Middleware para verificar que el usuario sea admin
const requireAdmin = requireRole('admin');

// Middleware para verificar que el usuario sea cliente o profesional
const requireClientOrProfessional = requireRole(['client', 'professional']);

// Middleware para verificar propiedad del recurso
const requireOwnership = (resourceModel, resourceIdField = 'id') => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado',
          error: 'NOT_AUTHENTICATED'
        });
      }
      
      const resourceId = req.params[resourceIdField] || req.body[resourceIdField];
      
      if (!resourceId) {
        return res.status(400).json({
          success: false,
          message: 'ID del recurso requerido',
          error: 'MISSING_RESOURCE_ID'
        });
      }
      
      const resource = await resourceModel.findById(resourceId);
      
      if (!resource) {
        return res.status(404).json({
          success: false,
          message: 'Recurso no encontrado',
          error: 'RESOURCE_NOT_FOUND'
        });
      }
      
      // Verificar si el usuario es propietario del recurso
      const isOwner = resource.user && resource.user.toString() === req.user._id.toString();
      
      // Verificar si el usuario es admin
      const isAdmin = req.user.userType === 'admin';
      
      // Verificar si el usuario es profesional y el recurso le pertenece
      const isProfessionalOwner = req.user.userType === 'professional' && 
        resource.professional && 
        resource.professional.toString() === req.user._id.toString();
      
      if (!isOwner && !isAdmin && !isProfessionalOwner) {
        return res.status(403).json({
          success: false,
          message: 'Acceso denegado. No eres propietario de este recurso.',
          error: 'NOT_OWNER'
        });
      }
      
      // Agregar el recurso al request para uso posterior
      req.resource = resource;
      
      next();
    } catch (error) {
      console.error('Error en verificación de propiedad:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: 'INTERNAL_ERROR'
      });
    }
  };
};

// Middleware para verificar permisos de clínica
const requireClinicPermission = (permission) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado',
          error: 'NOT_AUTHENTICATED'
        });
      }
      
      if (req.user.userType !== 'professional') {
        return res.status(403).json({
          success: false,
          message: 'Solo los profesionales pueden acceder a esta funcionalidad',
          error: 'PROFESSIONAL_ONLY'
        });
      }
      
      const clinicId = req.params.clinicId || req.body.clinicId;
      
      if (!clinicId) {
        return res.status(400).json({
          success: false,
          message: 'ID de clínica requerido',
          error: 'MISSING_CLINIC_ID'
        });
      }
      
      // Aquí se verificaría si el profesional tiene permisos en la clínica
      // Por ahora, permitimos acceso a todos los profesionales
      // En una implementación real, se verificaría contra la base de datos
      
      next();
    } catch (error) {
      console.error('Error en verificación de permisos de clínica:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: 'INTERNAL_ERROR'
      });
    }
  };
};

// Middleware para verificar límites de rate limiting personalizados
const customRateLimit = (maxRequests, windowMs) => {
  const requests = new Map();
  
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    
    // Limpiar requests antiguos
    if (requests.has(ip)) {
      const userRequests = requests.get(ip);
      const validRequests = userRequests.filter(timestamp => now - timestamp < windowMs);
      
      if (validRequests.length >= maxRequests) {
        return res.status(429).json({
          success: false,
          message: 'Demasiadas solicitudes. Intenta más tarde.',
          error: 'RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil(windowMs / 1000)
        });
      }
      
      requests.set(ip, [...validRequests, now]);
    } else {
      requests.set(ip, [now]);
    }
    
    next();
  };
};

// Middleware para logging de requests autenticados
const logAuthenticatedRequest = (req, res, next) => {
  if (req.user) {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - Usuario: ${req.user.email} (${req.user.userType})`);
  }
  next();
};

module.exports = {
  authenticateToken,
  requireRole,
  requireClient,
  requireProfessional,
  requireAdmin,
  requireClientOrProfessional,
  requireOwnership,
  requireClinicPermission,
  customRateLimit,
  logAuthenticatedRequest
};

