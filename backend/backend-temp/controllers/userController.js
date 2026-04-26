const bcrypt = require('bcryptjs');
const User = require('../models/User');
const logger = require('../config/logger');

class UserController {
  /**
   * Obtener lista de usuarios con filtros
   */
  static async getUsers(req, res) {
    try {
      const {
        userType,
        status,
        search,
        dateFrom,
        dateTo,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        page = 1,
        limit = 20
      } = req.query;

      // Construir filtros
      const filters = { isDeleted: false };

      if (userType) filters.userType = userType;
      if (status !== undefined) filters.isActive = status === 'active';
      if (search) {
        filters.$or = [
          { fullName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } }
        ];
      }
      if (dateFrom || dateTo) {
        filters.createdAt = {};
        if (dateFrom) filters.createdAt.$gte = new Date(dateFrom);
        if (dateTo) filters.createdAt.$lte = new Date(dateTo);
      }

      // Calcular paginación
      const skip = (page - 1) * limit;

      const [users, total] = await Promise.all([
        User.find(filters)
          .select('-password -refreshTokens -emailVerificationToken -passwordResetToken')
          .sort(sortBy === 'fullName' ? { fullName: sortOrder === 'desc' ? -1 : 1 } :
                sortBy === 'email' ? { email: sortOrder === 'desc' ? -1 : 1 } :
                sortBy === 'userType' ? { userType: sortOrder === 'desc' ? -1 : 1 } :
                sortBy === 'lastLoginAt' ? { lastLoginAt: sortOrder === 'desc' ? -1 : 1 } :
                { createdAt: sortOrder === 'desc' ? -1 : 1 })
          .skip(skip)
          .limit(parseInt(limit)),
        User.countDocuments(filters)
      ]);

      res.json({
        success: true,
        data: users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      logger.error('Error in getUsers:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener usuario específico
   */
  static async getUserById(req, res) {
    try {
      const user = await User.findById(req.params.id)
        .select('-password -refreshTokens -emailVerificationToken -passwordResetToken');

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      res.json({
        success: true,
        data: user
      });

    } catch (error) {
      logger.error('Error in getUserById:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Crear nuevo usuario
   */
  static async createUser(req, res) {
    try {
      const {
        fullName,
        email,
        password,
        phone,
        userType = 'client',
        dateOfBirth,
        gender,
        address,
        emergencyContact,
        professionalInfo,
        clientInfo,
        isActive = true,
        isEmailVerified = false
      } = req.body;

      // Verificar si el email ya existe
      const existingUser = await User.findOne({ email: email.toLowerCase(), isDeleted: false });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'El email ya está registrado'
        });
      }

      // Verificar si el teléfono ya existe
      if (phone) {
        const existingPhone = await User.findOne({ phone, isDeleted: false });
        if (existingPhone) {
          return res.status(400).json({
            success: false,
            message: 'El teléfono ya está registrado'
          });
        }
      }

      // Encriptar contraseña
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Crear el usuario
      const userData = {
        fullName,
        email: email.toLowerCase(),
        password: hashedPassword,
        phone,
        userType,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
        gender,
        address,
        emergencyContact,
        professionalInfo: userType === 'professional' ? professionalInfo : undefined,
        clientInfo: userType === 'client' ? clientInfo : undefined,
        isActive,
        isEmailVerified,
        createdBy: req.user._id
      };

      const user = new User(userData);
      await user.save();

      // Log de la acción
      user.logAccess(req.user._id, 'user_created', {
        userType,
        email,
        createdBy: req.user._id
      });

      // Remover datos sensibles de la respuesta
      const userResponse = user.toObject();
      delete userResponse.password;

      res.status(201).json({
        success: true,
        message: 'Usuario creado exitosamente',
        data: userResponse
      });

    } catch (error) {
      logger.error('Error in createUser:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Actualizar usuario
   */
  static async updateUser(req, res) {
    try {
      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      const {
        fullName,
        email,
        phone,
        dateOfBirth,
        gender,
        address,
        emergencyContact,
        professionalInfo,
        clientInfo
      } = req.body;

      // Verificar si el email ya existe (si se está cambiando)
      if (email && email.toLowerCase() !== user.email) {
        const existingUser = await User.findOne({ 
          email: email.toLowerCase(), 
          _id: { $ne: user._id },
          isDeleted: false 
        });
        if (existingUser) {
          return res.status(400).json({
            success: false,
            message: 'El email ya está registrado'
          });
        }
      }

      // Verificar si el teléfono ya existe (si se está cambiando)
      if (phone && phone !== user.phone) {
        const existingPhone = await User.findOne({ 
          phone, 
          _id: { $ne: user._id },
          isDeleted: false 
        });
        if (existingPhone) {
          return res.status(400).json({
            success: false,
            message: 'El teléfono ya está registrado'
          });
        }
      }

      // Actualizar campos permitidos
      const updateFields = [
        'fullName', 'email', 'phone', 'dateOfBirth', 'gender', 
        'address', 'emergencyContact', 'professionalInfo', 'clientInfo'
      ];

      updateFields.forEach(field => {
        if (req.body[field] !== undefined) {
          if (field === 'email') {
            user[field] = req.body[field].toLowerCase();
          } else if (field === 'dateOfBirth') {
            user[field] = req.body[field] ? new Date(req.body[field]) : undefined;
          } else {
            user[field] = req.body[field];
          }
        }
      });

      user.lastModifiedBy = req.user._id;
      user.lastModifiedAt = new Date();
      await user.save();

      // Log de la acción
      user.logAccess(req.user._id, 'user_updated', {
        changes: req.body,
        updatedBy: req.user._id
      });

      // Remover datos sensibles de la respuesta
      const userResponse = user.toObject();
      delete userResponse.password;

      res.json({
        success: true,
        message: 'Usuario actualizado exitosamente',
        data: userResponse
      });

    } catch (error) {
      logger.error('Error in updateUser:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Cambiar estado del usuario
   */
  static async updateUserStatus(req, res) {
    try {
      const { isActive, reason } = req.body;

      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      const oldStatus = user.isActive;
      user.isActive = isActive;
      user.lastModifiedBy = req.user._id;
      user.lastModifiedAt = new Date();

      // Agregar razón del cambio de estado
      if (reason) {
        user.statusHistory = user.statusHistory || [];
        user.statusHistory.push({
          isActive,
          reason,
          changedBy: req.user._id,
          changedAt: new Date()
        });
      }

      await user.save();

      // Log de la acción
      user.logAccess(req.user._id, 'user_status_changed', {
        oldStatus,
        newStatus: isActive,
        reason
      });

      res.json({
        success: true,
        message: `Estado del usuario cambiado a ${isActive ? 'activo' : 'inactivo'}`,
        data: {
          userId: user._id,
          oldStatus,
          newStatus: isActive,
          reason
        }
      });

    } catch (error) {
      logger.error('Error in updateUserStatus:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Verificar usuario
   */
  static async verifyUser(req, res) {
    try {
      const { isVerified, reason } = req.body;

      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      const oldVerificationStatus = user.isVerified;
      user.isVerified = isVerified;
      user.verifiedAt = isVerified ? new Date() : undefined;
      user.lastModifiedBy = req.user._id;
      user.lastModifiedAt = new Date();

      // Agregar razón de la verificación
      if (reason) {
        user.verificationHistory = user.verificationHistory || [];
        user.verificationHistory.push({
          isVerified,
          reason,
          verifiedBy: req.user._id,
          verifiedAt: new Date()
        });
      }

      await user.save();

      // Log de la acción
      user.logAccess(req.user._id, 'user_verification_changed', {
        oldVerificationStatus,
        newVerificationStatus: isVerified,
        reason
      });

      res.json({
        success: true,
        message: `Usuario ${isVerified ? 'verificado' : 'desverificado'} exitosamente`,
        data: {
          userId: user._id,
          oldVerificationStatus,
          newVerificationStatus: isVerified,
          reason
        }
      });

    } catch (error) {
      logger.error('Error in verifyUser:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Eliminar usuario
   */
  static async deleteUser(req, res) {
    try {
      const { reason } = req.body;

      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      // Verificar que no se elimine a sí mismo
      if (user._id.toString() === req.user._id.toString()) {
        return res.status(400).json({
          success: false,
          message: 'No puedes eliminar tu propia cuenta'
        });
      }

      // Soft delete
      await user.softDelete(req.user._id, reason);

      // Log de la acción
      user.logAccess(req.user._id, 'user_deleted', {
        reason: reason || 'Sin razón especificada'
      });

      res.json({
        success: true,
        message: 'Usuario eliminado exitosamente'
      });

    } catch (error) {
      logger.error('Error in deleteUser:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener perfil del usuario autenticado
   */
  static async getProfile(req, res) {
    try {
      const user = await User.findById(req.user._id)
        .select('-password -refreshTokens -emailVerificationToken -passwordResetToken');

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      res.json({
        success: true,
        data: user
      });

    } catch (error) {
      logger.error('Error in getProfile:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Actualizar perfil del usuario autenticado
   */
  static async updateProfile(req, res) {
    try {
      const user = await User.findById(req.user._id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      const {
        fullName,
        phone,
        dateOfBirth,
        gender,
        address,
        emergencyContact,
        professionalInfo,
        clientInfo
      } = req.body;

      // Verificar si el teléfono ya existe (si se está cambiando)
      if (phone && phone !== user.phone) {
        const existingPhone = await User.findOne({ 
          phone, 
          _id: { $ne: user._id },
          isDeleted: false 
        });
        if (existingPhone) {
          return res.status(400).json({
            success: false,
            message: 'El teléfono ya está registrado'
          });
        }
      }

      // Actualizar campos permitidos
      const updateFields = [
        'fullName', 'phone', 'dateOfBirth', 'gender', 
        'address', 'emergencyContact', 'professionalInfo', 'clientInfo'
      ];

      updateFields.forEach(field => {
        if (req.body[field] !== undefined) {
          if (field === 'dateOfBirth') {
            user[field] = req.body[field] ? new Date(req.body[field]) : undefined;
          } else {
            user[field] = req.body[field];
          }
        }
      });

      user.lastModifiedBy = req.user._id;
      user.lastModifiedAt = new Date();
      await user.save();

      // Log de la acción
      user.logAccess(req.user._id, 'profile_updated', {
        changes: req.body
      });

      // Remover datos sensibles de la respuesta
      const userResponse = user.toObject();
      delete userResponse.password;

      res.json({
        success: true,
        message: 'Perfil actualizado exitosamente',
        data: userResponse
      });

    } catch (error) {
      logger.error('Error in updateProfile:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Cambiar contraseña del usuario autenticado
   */
  static async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;

      const user = await User.findById(req.user._id).select('+password');
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      // Verificar contraseña actual
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          success: false,
          message: 'Contraseña actual incorrecta'
        });
      }

      // Encriptar nueva contraseña
      const saltRounds = 12;
      const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

      // Actualizar contraseña
      user.password = hashedNewPassword;
      user.passwordChangedAt = new Date();
      
      // Invalidar todos los refresh tokens
      user.refreshTokens = [];
      
      await user.save();

      // Log de la acción
      user.logAccess(req.user._id, 'password_changed');

      res.json({
        success: true,
        message: 'Contraseña cambiada exitosamente'
      });

    } catch (error) {
      logger.error('Error in changePassword:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener estadísticas de usuarios
   */
  static async getUserStats(req, res) {
    try {
      const { dateFrom, dateTo, userType } = req.query;

      // Construir filtros
      const filters = { isDeleted: false };
      if (userType) filters.userType = userType;
      if (dateFrom || dateTo) {
        filters.createdAt = {};
        if (dateFrom) filters.createdAt.$gte = new Date(dateFrom);
        if (dateTo) filters.createdAt.$lte = new Date(dateTo);
      }

      const stats = await User.getUserStats(filters);

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      logger.error('Error in getUserStats:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
}

module.exports = UserController;
