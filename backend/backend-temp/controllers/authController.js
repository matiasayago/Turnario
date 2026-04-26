const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { sendEmail } = require('../services/emailService');
const logger = require('../config/logger');

class AuthController {
  /**
   * Registrar un nuevo usuario
   */
  static async register(req, res) {
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
        emergencyContact
      } = req.body;

      // Verificar si el email ya existe
      const existingUser = await User.findOne({ email, isDeleted: false });
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

      // Validar tipo de usuario
      const validUserTypes = ['client', 'professional', 'admin'];
      if (!validUserTypes.includes(userType)) {
        return res.status(400).json({
          success: false,
          message: 'Tipo de usuario inválido. Los tipos válidos son: client, professional, admin'
        });
      }

      // Encriptar contraseña
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Generar token de verificación
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas

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
        emailVerificationToken: verificationToken,
        emailVerificationExpires: verificationExpires,
        isEmailVerified: false,
        isActive: true
      };

      const user = new User(userData);
      await user.save();

      // Enviar email de verificación (opcional)
      try {
        if (sendEmail && typeof sendEmail === 'function') {
          await sendEmail({
            to: email,
            subject: 'Verifica tu cuenta - Turnario',
            template: 'emailVerification',
            data: {
              fullName,
              verificationUrl: `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`
            }
          });
        }
      } catch (emailError) {
        logger.error('Error sending verification email:', emailError);
        // No fallar el registro si el email falla
      }

      // Log de la acción
      user.logAccess(user._id, 'user_registered', {
        userType,
        email
      });

      // Generar token JWT
      const token = jwt.sign(
        { 
          userId: user._id, 
          email: user.email, 
          userType: user.userType 
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Remover datos sensibles de la respuesta
      const userResponse = user.toObject();
      delete userResponse.password;
      delete userResponse.emailVerificationToken;
      delete userResponse.emailVerificationExpires;

      res.status(201).json({
        success: true,
        message: 'Usuario registrado exitosamente. Revisa tu email para verificar tu cuenta.',
        data: {
          user: userResponse,
          token
        }
      });

    } catch (error) {
      logger.error('Error in register:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Iniciar sesión
   */
  static async login(req, res) {
    try {
      const { email, password } = req.body;

      // Buscar usuario por email
      const user = await User.findOne({ 
        email: email.toLowerCase(), 
        isDeleted: false 
      }).select('+password');

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Credenciales inválidas'
        });
      }

      // Verificar si el usuario está activo
      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Tu cuenta está desactivada. Contacta al administrador.'
        });
      }

      // Verificar contraseña
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Credenciales inválidas'
        });
      }

      // Verificar si el email está verificado (solo para clientes)
      if (user.userType === 'client' && !user.isEmailVerified) {
        return res.status(401).json({
          success: false,
          message: 'Debes verificar tu email antes de iniciar sesión',
          requiresEmailVerification: true
        });
      }

      // Actualizar último login
      user.lastLoginAt = new Date();
      user.loginCount = (user.loginCount || 0) + 1;
      await user.save();

      // Generar token JWT
      const token = jwt.sign(
        { 
          userId: user._id, 
          email: user.email, 
          userType: user.userType 
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Generar refresh token
      const refreshToken = jwt.sign(
        { 
          userId: user._id, 
          type: 'refresh' 
        },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
      );

      // Guardar refresh token en el usuario
      user.refreshTokens = user.refreshTokens || [];
      user.refreshTokens.push({
        token: refreshToken,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });
      await user.save();

      // Log de la acción
      user.logAccess(user._id, 'user_logged_in', {
        userType: user.userType,
        loginCount: user.loginCount
      });

      // Remover datos sensibles de la respuesta
      const userResponse = user.toObject();
      delete userResponse.password;
      delete userResponse.refreshTokens;

      res.json({
        success: true,
        message: 'Inicio de sesión exitoso',
        data: {
          user: userResponse,
          token,
          refreshToken
        }
      });

    } catch (error) {
      logger.error('Error in login:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Renovar token
   */
  static async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          message: 'Refresh token es requerido'
        });
      }

      // Verificar refresh token
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      
      const user = await User.findById(decoded.userId);
      if (!user || !user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no encontrado o inactivo'
        });
      }

      // Verificar que el refresh token existe y no ha expirado
      const tokenExists = user.refreshTokens.find(
        token => token.token === refreshToken && token.expiresAt > new Date()
      );

      if (!tokenExists) {
        return res.status(401).json({
          success: false,
          message: 'Refresh token inválido o expirado'
        });
      }

      // Generar nuevo token
      const newToken = jwt.sign(
        { 
          userId: user._id, 
          email: user.email, 
          userType: user.userType 
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Log de la acción
      user.logAccess(user._id, 'token_refreshed');

      res.json({
        success: true,
        message: 'Token renovado exitosamente',
        data: {
          token: newToken
        }
      });

    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Refresh token inválido'
        });
      }
      
      logger.error('Error in refreshToken:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Cerrar sesión
   */
  static async logout(req, res) {
    try {
      const { refreshToken } = req.body;
      const userId = req.user._id;

      const user = await User.findById(userId);
      if (user && refreshToken) {
        // Remover el refresh token específico
        user.refreshTokens = user.refreshTokens.filter(
          token => token.token !== refreshToken
        );
        await user.save();
      }

      // Log de la acción
      if (user) {
        user.logAccess(userId, 'user_logged_out');
      }

      res.json({
        success: true,
        message: 'Sesión cerrada exitosamente'
      });

    } catch (error) {
      logger.error('Error in logout:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Solicitar recuperación de contraseña
   */
  static async forgotPassword(req, res) {
    try {
      const { email } = req.body;

      const user = await User.findOne({ 
        email: email.toLowerCase(), 
        isDeleted: false 
      });

      if (!user) {
        // Por seguridad, no revelar si el email existe o no
        return res.json({
          success: true,
          message: 'Si el email está registrado, recibirás un enlace para restablecer tu contraseña'
        });
      }

      // Generar token de restablecimiento
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetExpires = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hora

      user.passwordResetToken = resetToken;
      user.passwordResetExpires = resetExpires;
      await user.save();

      // Enviar email de restablecimiento
      try {
        await sendEmail({
          to: email,
          subject: 'Restablece tu contraseña - Turnario',
          template: 'passwordReset',
          data: {
            fullName: user.fullName,
            resetUrl: `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`
          }
        });
      } catch (emailError) {
        logger.error('Error sending password reset email:', emailError);
        return res.status(500).json({
          success: false,
          message: 'Error al enviar el email de restablecimiento'
        });
      }

      // Log de la acción
      user.logAccess(user._id, 'password_reset_requested');

      res.json({
        success: true,
        message: 'Si el email está registrado, recibirás un enlace para restablecer tu contraseña'
      });

    } catch (error) {
      logger.error('Error in forgotPassword:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Restablecer contraseña
   */
  static async resetPassword(req, res) {
    try {
      const { token, password } = req.body;

      // Hashear el token para comparar con el almacenado
      const hashedToken = require('crypto')
        .createHash('sha256')
        .update(token)
        .digest('hex');

      const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: new Date() },
        isDeleted: false
      });

      if (!user) {
        return res.status(400).json({
          success: false,
          message: 'Token de restablecimiento inválido o expirado'
        });
      }

      // Encriptar nueva contraseña
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Actualizar contraseña y limpiar tokens
      // Usar updateOne para evitar que el middleware pre-save hashee la contraseña nuevamente
      await User.updateOne(
        { _id: user._id },
        {
          $set: {
            password: hashedPassword,
            passwordChangedAt: new Date()
          },
          $unset: {
            passwordResetToken: 1,
            passwordResetExpires: 1
          }
        }
      );

      // Invalidar todos los refresh tokens
      user.refreshTokens = [];
      await user.save();

      // Log de la acción
      user.logAccess(user._id, 'password_reset_completed');

      res.json({
        success: true,
        message: 'Contraseña restablecida exitosamente'
      });

    } catch (error) {
      logger.error('Error in resetPassword:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Verificar email
   */
  static async verifyEmail(req, res) {
    try {
      const { token } = req.body;

      // Hashear el token para comparar con el almacenado
      const hashedToken = require('crypto')
        .createHash('sha256')
        .update(token)
        .digest('hex');

      const user = await User.findOne({
        emailVerificationToken: hashedToken,
        emailVerificationExpires: { $gt: new Date() },
        isDeleted: false
      });

      if (!user) {
        return res.status(400).json({
          success: false,
          message: 'Token de verificación inválido o expirado'
        });
      }

      // Marcar email como verificado
      user.isEmailVerified = true;
      user.emailVerifiedAt = new Date();
      user.emailVerificationToken = undefined;
      user.emailVerificationExpires = undefined;
      await user.save();

      // Log de la acción
      user.logAccess(user._id, 'email_verified');

      res.json({
        success: true,
        message: 'Email verificado exitosamente'
      });

    } catch (error) {
      logger.error('Error in verifyEmail:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Reenviar email de verificación
   */
  static async resendVerificationEmail(req, res) {
    try {
      const { email } = req.body;

      const user = await User.findOne({ 
        email: email.toLowerCase(), 
        isDeleted: false 
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      if (user.isEmailVerified) {
        return res.status(400).json({
          success: false,
          message: 'El email ya está verificado'
        });
      }

      // Generar nuevo token de verificación
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas

      user.emailVerificationToken = verificationToken;
      user.emailVerificationExpires = verificationExpires;
      await user.save();

      // Enviar email de verificación
      try {
        await sendEmail({
          to: email,
          subject: 'Verifica tu cuenta - Turnario',
          template: 'emailVerification',
          data: {
            fullName: user.fullName,
            verificationUrl: `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`
          }
        });
      } catch (emailError) {
        logger.error('Error sending verification email:', emailError);
        return res.status(500).json({
          success: false,
          message: 'Error al enviar el email de verificación'
        });
      }

      // Log de la acción
      user.logAccess(user._id, 'verification_email_resent');

      res.json({
        success: true,
        message: 'Email de verificación enviado exitosamente'
      });

    } catch (error) {
      logger.error('Error in resendVerificationEmail:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener información del usuario autenticado
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
      user.logAccess(user._id, 'password_changed');

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
}

module.exports = AuthController;
