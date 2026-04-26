const { validationResult } = require('express-validator');
const logger = require('../config/logger');

/**
 * Middleware para validar los resultados de express-validator
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next function
 */
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    logger.warn('Validation error:', {
      path: req.path,
      method: req.method,
      errors: errors.array()
    });
    
    return res.status(400).json({
      success: false,
      message: 'Error de validación',
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  
  next();
};

/**
 * Middleware para validar ObjectId de MongoDB
 * @param {string} paramName - Nombre del parámetro a validar
 */
const validateObjectId = (paramName) => {
  return (req, res, next) => {
    const { ObjectId } = require('mongoose').Types;
    
    if (!ObjectId.isValid(req.params[paramName])) {
      logger.warn('Invalid ObjectId:', {
        paramName,
        value: req.params[paramName],
        path: req.path
      });
      
      return res.status(400).json({
        success: false,
        message: `ID inválido: ${paramName}`,
        error: 'INVALID_ID'
      });
    }
    
    next();
  };
};

/**
 * Middleware para validar que el usuario esté autenticado
 */
const requireAuth = (req, res, next) => {
  if (!req.user) {
    logger.warn('Unauthorized access attempt:', {
      path: req.path,
      method: req.method,
      ip: req.ip
    });
    
    return res.status(401).json({
      success: false,
      message: 'Acceso no autorizado',
      error: 'UNAUTHORIZED'
    });
  }
  
  next();
};

/**
 * Middleware para validar roles específicos
 * @param {...string} roles - Roles permitidos
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      logger.warn('Role check failed - no user:', {
        path: req.path,
        method: req.method,
        requiredRoles: roles
      });
      
      return res.status(401).json({
        success: false,
        message: 'Acceso no autorizado',
        error: 'UNAUTHORIZED'
      });
    }
    
    if (!roles.includes(req.user.role)) {
      logger.warn('Role check failed - insufficient permissions:', {
        path: req.path,
        method: req.method,
        userRole: req.user.role,
        requiredRoles: roles,
        userId: req.user.id
      });
      
      return res.status(403).json({
        success: false,
        message: 'Permisos insuficientes',
        error: 'FORBIDDEN'
      });
    }
    
    next();
  };
};

/**
 * Middleware para validar que el usuario sea propietario del recurso
 * @param {string} resourceField - Campo que contiene el ID del propietario
 */
const requireOwnership = (resourceField = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Acceso no autorizado',
        error: 'UNAUTHORIZED'
      });
    }
    
    // Permitir acceso a administradores
    if (req.user.role === 'admin') {
      return next();
    }
    
    const resourceUserId = req.body[resourceField] || req.params[resourceField];
    
    if (resourceUserId && resourceUserId.toString() !== req.user.id.toString()) {
      logger.warn('Ownership check failed:', {
        path: req.path,
        method: req.method,
        userId: req.user.id,
        resourceUserId,
        userRole: req.user.role
      });
      
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para acceder a este recurso',
        error: 'FORBIDDEN'
      });
    }
    
    next();
  };
};

/**
 * Middleware para validar límites de paginación
 */
const validatePagination = (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  
  if (page < 1) {
    return res.status(400).json({
      success: false,
      message: 'El número de página debe ser mayor a 0',
      error: 'INVALID_PAGE'
    });
  }
  
  if (limit < 1 || limit > 100) {
    return res.status(400).json({
      success: false,
      message: 'El límite debe estar entre 1 y 100',
      error: 'INVALID_LIMIT'
    });
  }
  
  req.pagination = { page, limit };
  next();
};

module.exports = {
  validateRequest,
  validateObjectId,
  requireAuth,
  requireRole,
  requireOwnership,
  validatePagination
};
