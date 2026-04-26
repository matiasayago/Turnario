const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const logger = require('../config/logger');

class AuthMiddleware {
  constructor() {
    this.jwtSecret = process.env.JWT_SECRET;
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';
    this.jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
    this.jwtRefreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '30d';
  }

  // Generar token JWT
  generateToken(user) {
    const payload = {
      id: user._id,
      email: user.email,
      userType: user.userType,
      isActive: user.isActive
    };

    return jwt.sign(payload, this.jwtSecret, { 
      expiresIn: this.jwtExpiresIn,
      issuer: 'turnario-backend',
      audience: 'turnario-app'
    });
  }

  // Generar refresh token
  generateRefreshToken(user) {
    const payload = {
      id: user._id,
      type: 'refresh'
    };

    return jwt.sign(payload, this.jwtRefreshSecret, { 
      expiresIn: this.jwtRefreshExpiresIn,
      issuer: 'turnario-backend',
      audience: 'turnario-app'
    });
  }

  // Verificar token JWT
  verifyToken(token) {
    try {
      return jwt.verify(token, this.jwtSecret, {
        issuer: 'turnario-backend',
        audience: 'turnario-app'
      });
    } catch (error) {
      throw new Error('Token inválido o expirado');
    }
  }

  // Verificar refresh token
  verifyRefreshToken(token) {
    try {
      return jwt.verify(token, this.jwtRefreshSecret, {
        issuer: 'turnario-backend',
        audience: 'turnario-app'
      });
    } catch (error) {
      throw new Error('Refresh token inválido o expirado');
    }
  }

  // Middleware de autenticación principal
  authenticateToken(req, res, next) {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

      if (!token) {
        logger.logAuth('token_missing', req.ip, false, {
          requestId: req.requestId,
          path: req.path
        });
        
        return res.status(401).json({
          error: 'Token requerido',
          message: 'Se requiere token de autenticación para acceder a este recurso'
        });
      }

      const decoded = this.verifyToken(token);
      
      // Verificar que el usuario existe y está activo
      User.findById(decoded.id)
        .then(user => {
          if (!user) {
            logger.logAuth('user_not_found', decoded.id, false, {
              requestId: req.requestId,
              path: req.path
            });
            
            return res.status(401).json({
              error: 'Usuario no encontrado',
              message: 'El usuario asociado al token no existe'
            });
          }

          if (!user.isActive) {
            logger.logAuth('user_inactive', user._id, false, {
              requestId: req.requestId,
              path: req.path
            });
            
            return res.status(401).json({
              error: 'Usuario inactivo',
              message: 'El usuario está inactivo'
            });
          }

          // Agregar información del usuario al request
          req.user = {
            id: user._id,
            email: user.email,
            userType: user.userType,
            fullName: user.fullName,
            isActive: user.isActive,
            permissions: user.permissions || []
          };

          logger.logAuth('token_validated', user._id, true, {
            requestId: req.requestId,
            path: req.path
          });

          next();
        })
        .catch(error => {
          logger.error('Error verificando usuario:', error);
          return res.status(500).json({
            error: 'Error interno',
            message: 'Error verificando la autenticación'
          });
        });

    } catch (error) {
      logger.logAuth('token_invalid', req.ip, false, {
        requestId: req.requestId,
        path: req.path,
        error: error.message
      });
      
      return res.status(401).json({
        error: 'Token inválido',
        message: 'El token de autenticación no es válido'
      });
    }
  }

  // Middleware de autorización basada en roles
  requireRole(...roles) {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          error: 'No autenticado',
          message: 'Se requiere autenticación'
        });
      }

      if (!roles.includes(req.user.userType)) {
        logger.logAuth('role_denied', req.user.id, false, {
          requestId: req.requestId,
          path: req.path,
          requiredRoles: roles,
          userRole: req.user.userType
        });
        
        return res.status(403).json({
          error: 'Acceso denegado',
          message: 'No tienes permisos para acceder a este recurso'
        });
      }

      logger.logAuth('role_authorized', req.user.id, true, {
        requestId: req.requestId,
        path: req.path,
        role: req.user.userType
      });

      next();
    };
  }

  // Middleware para requerir rol de cliente
  requireClient(req, res, next) {
    return this.requireRole('client')(req, res, next);
  }

  // Middleware para requerir rol de profesional
  requireProfessional(req, res, next) {
    return this.requireRole('professional')(req, res, next);
  }

  // Middleware para requerir rol de administrador
  requireAdmin(req, res, next) {
    return this.requireRole('admin')(req, res, next);
  }

  // Middleware para verificar permisos específicos
  requirePermission(permission) {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          error: 'No autenticado',
          message: 'Se requiere autenticación'
        });
      }

      if (!req.user.permissions.includes(permission)) {
        logger.logAuth('permission_denied', req.user.id, false, {
          requestId: req.requestId,
          path: req.path,
          requiredPermission: permission,
          userPermissions: req.user.permissions
        });
        
        return res.status(403).json({
          error: 'Permiso denegado',
          message: 'No tienes el permiso requerido para acceder a este recurso'
        });
      }

      logger.logAuth('permission_authorized', req.user.id, true, {
        requestId: req.requestId,
        path: req.path,
        permission
      });

      next();
    };
  }

  // Middleware para verificar propiedad del recurso
  requireOwnership(model, idField = 'id') {
    return async (req, res, next) => {
      try {
        if (!req.user) {
          return res.status(401).json({
            error: 'No autenticado',
            message: 'Se requiere autenticación'
          });
        }

        const resourceId = req.params[idField];
        const resource = await model.findById(resourceId);

        if (!resource) {
          return res.status(404).json({
            error: 'Recurso no encontrado',
            message: 'El recurso solicitado no existe'
          });
        }

        // Verificar si el usuario es propietario o tiene permisos especiales
        const isOwner = resource.userId && resource.userId.toString() === req.user.id;
        const isAdmin = req.user.userType === 'admin';
        const hasSpecialAccess = req.user.permissions.includes('access_all_resources');

        if (!isOwner && !isAdmin && !hasSpecialAccess) {
          logger.logAuth('ownership_denied', req.user.id, false, {
            requestId: req.requestId,
            path: req.path,
            resourceId,
            resourceType: model.modelName
          });
          
          return res.status(403).json({
            error: 'Acceso denegado',
            message: 'No tienes permisos para acceder a este recurso'
          });
        }

        // Agregar el recurso al request para uso posterior
        req.resource = resource;

        logger.logAuth('ownership_authorized', req.user.id, true, {
          requestId: req.requestId,
          path: req.path,
          resourceId,
          resourceType: model.modelName
        });

        next();
      } catch (error) {
        logger.error('Error verificando propiedad:', error);
        return res.status(500).json({
          error: 'Error interno',
          message: 'Error verificando permisos del recurso'
        });
      }
    };
  }

  // Middleware para verificar límites de uso
  requireUsageLimit(limit, windowMs = 24 * 60 * 60 * 1000) { // 24 horas por defecto
    return async (req, res, next) => {
      try {
        if (!req.user) {
          return res.status(401).json({
            error: 'No autenticado',
            message: 'Se requiere autenticación'
          });
        }

        const now = new Date();
        const windowStart = new Date(now.getTime() - windowMs);

        // Aquí implementarías la lógica para verificar el límite de uso
        // Por ejemplo, contar cuántas veces se ha usado un servicio en la ventana de tiempo
        
        // Por ahora, permitimos el acceso
        next();
      } catch (error) {
        logger.error('Error verificando límite de uso:', error);
        return res.status(500).json({
          error: 'Error interno',
          message: 'Error verificando límites de uso'
        });
      }
    };
  }

  // Middleware para verificar estado de la cuenta
  requireActiveAccount(req, res, next) {
    if (!req.user) {
      return res.status(401).json({
        error: 'No autenticado',
        message: 'Se requiere autenticación'
      });
    }

    if (!req.user.isActive) {
      logger.logAuth('account_inactive', req.user.id, false, {
        requestId: req.requestId,
        path: req.path
      });
      
      return res.status(403).json({
        error: 'Cuenta inactiva',
        message: 'Tu cuenta está inactiva. Contacta al administrador.'
      });
    }

    next();
  }

  // Middleware para verificar verificación de email
  requireEmailVerified(req, res, next) {
    if (!req.user) {
      return res.status(401).json({
        error: 'No autenticado',
        message: 'Se requiere autenticación'
      });
    }

    // Aquí implementarías la verificación de email
    // Por ahora, permitimos el acceso
    next();
  }

  // Middleware para verificar verificación de teléfono
  requirePhoneVerified(req, res, next) {
    if (!req.user) {
      return res.status(401).json({
        error: 'No autenticado',
        message: 'Se requiere autenticación'
      });
    }

    // Aquí implementarías la verificación de teléfono
    // Por ahora, permitimos el acceso
    next();
  }
}

const authMiddleware = new AuthMiddleware();

module.exports = {
  authenticateToken: authMiddleware.authenticateToken.bind(authMiddleware),
  requireRole: authMiddleware.requireRole.bind(authMiddleware),
  requireClient: authMiddleware.requireClient.bind(authMiddleware),
  requireProfessional: authMiddleware.requireProfessional.bind(authMiddleware),
  requireAdmin: authMiddleware.requireAdmin.bind(authMiddleware),
  requirePermission: authMiddleware.requirePermission.bind(authMiddleware),
  requireOwnership: authMiddleware.requireOwnership.bind(authMiddleware),
  requireUsageLimit: authMiddleware.requireUsageLimit.bind(authMiddleware),
  requireActiveAccount: authMiddleware.requireActiveAccount.bind(authMiddleware),
  requireEmailVerified: authMiddleware.requireEmailVerified.bind(authMiddleware),
  requirePhoneVerified: authMiddleware.requirePhoneVerified.bind(authMiddleware),
  generateToken: authMiddleware.generateToken.bind(authMiddleware),
  generateRefreshToken: authMiddleware.generateRefreshToken.bind(authMiddleware),
  verifyToken: authMiddleware.verifyToken.bind(authMiddleware),
  verifyRefreshToken: authMiddleware.verifyRefreshToken.bind(authMiddleware)
};
