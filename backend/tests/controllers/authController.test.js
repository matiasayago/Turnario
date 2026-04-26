const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { app, initializeApp } = require('../../app');
const User = require('../../models/User');
const AuthController = require('../../controllers/authController');

let mongoServer;

// Configurar variables de entorno para tests
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-purposes-only';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-key-for-testing-purposes-only';
process.env.FRONTEND_URL = 'http://localhost:3000';
process.env.BCRYPT_ROUNDS = '12';

// Mock del servicio de email
jest.mock('../../services/emailService', () => ({
  sendEmail: jest.fn().mockResolvedValue(true)
}));

// Mock del logger
jest.mock('../../config/logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn()
}));

describe('AuthController', () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    initializeApp();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await User.deleteMany({});
  });

  describe('POST /api/auth/register', () => {
    const validUserData = {
      fullName: 'Juan Pérez',
      email: 'juan@example.com',
      password: 'password123',
      userType: 'client',
      phone: '+1234567890'
    };

    it('should register a new user successfully', async () => {
      const req = {
        body: validUserData
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await AuthController.register(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Usuario registrado exitosamente. Revisa tu email para verificar tu cuenta.'
        })
      );

      // Verificar que el usuario se creó en la base de datos
      const user = await User.findOne({ email: validUserData.email });
      expect(user).toBeTruthy();
      expect(user.fullName).toBe(validUserData.fullName);
      expect(user.userType).toBe(validUserData.userType);
      expect(user.isEmailVerified).toBe(false);
    });

    it('should return error for duplicate email', async () => {
      // Crear usuario existente con contraseña hasheada
      const hashedPassword = await require('bcryptjs').hash('password123', 12);
      await User.create({
        ...validUserData,
        password: hashedPassword
      });

      const req = {
        body: validUserData
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await AuthController.register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'El email ya está registrado'
        })
      );
    });

    it('should return error for invalid user type', async () => {
      const invalidData = {
        ...validUserData,
        userType: 'invalid_type'
      };

      const req = {
        body: invalidData
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await AuthController.register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false
        })
      );
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Crear usuario de prueba usando el método del modelo para que se apliquen todos los middlewares
      const user = new User({
        fullName: 'Juan Pérez',
        email: 'juan@example.com',
        password: 'password123', // El middleware pre-save se encargará de hashearlo
        userType: 'client',
        phone: '+1234567890',
        isActive: true,
        isEmailVerified: true, // Agregar esto para evitar el error de verificación
        isDeleted: false
      });
      await user.save();
    });

    it('should login successfully with valid credentials', async () => {
      // Verificar que el usuario existe antes del login
      const userBeforeLogin = await User.findOne({ email: 'juan@example.com' }).select('+password');
      console.log('User before login:', {
        exists: !!userBeforeLogin,
        hasPassword: !!userBeforeLogin?.password,
        isActive: userBeforeLogin?.isActive,
        isEmailVerified: userBeforeLogin?.isEmailVerified,
        isDeleted: userBeforeLogin?.isDeleted
      });

      const req = {
        body: {
          email: 'juan@example.com',
          password: 'password123'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await AuthController.login(req, res);

      // Log de la respuesta para debug
      console.log('Login response:', res.json.mock.calls[0]?.[0]);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Inicio de sesión exitoso',
          data: expect.objectContaining({
            token: expect.any(String),
            refreshToken: expect.any(String)
          })
        })
      );
    });

    it('should return error for invalid credentials', async () => {
      const req = {
        body: {
          email: 'juan@example.com',
          password: 'wrongpassword'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await AuthController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Credenciales inválidas'
        })
      );
    });

    it('should return error for non-existent user', async () => {
      const req = {
        body: {
          email: 'nonexistent@example.com',
          password: 'password123'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await AuthController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Credenciales inválidas'
        })
      );
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    beforeEach(async () => {
      // Crear usuario usando el método del modelo
      const user = new User({
        fullName: 'Juan Pérez',
        email: 'juan@example.com',
        password: 'hashedpassword', // El middleware pre-save se encargará de hashearlo
        userType: 'client',
        phone: '+1234567890',
        isActive: true,
        isDeleted: false
      });
      await user.save();
    });

    it('should send password reset email for existing user', async () => {
      const req = {
        body: {
          email: 'juan@example.com'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await AuthController.forgotPassword(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Si el email está registrado, recibirás un enlace para restablecer tu contraseña'
        })
      );

      // Verificar que se generó el token de reset
      const user = await User.findOne({ email: 'juan@example.com' });
      expect(user.passwordResetToken).toBeTruthy();
      expect(user.passwordResetExpires).toBeTruthy();
    });

    it('should return success even for non-existent email (security)', async () => {
      const req = {
        body: {
          email: 'nonexistent@example.com'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await AuthController.forgotPassword(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Si el email está registrado, recibirás un enlace para restablecer tu contraseña'
        })
      );
    });
  });

  describe('POST /api/auth/reset-password', () => {
    let resetToken;
    let user;

    beforeEach(async () => {
      // Crear usuario usando el método del modelo
      user = new User({
        fullName: 'Juan Pérez',
        email: 'juan@example.com',
        password: 'oldpassword', // El middleware pre-save se encargará de hashearlo
        userType: 'client',
        phone: '+1234567890',
        isActive: true,
        isDeleted: false
      });
      await user.save();

      // Generar token de reset usando el método del modelo
      resetToken = user.generatePasswordResetToken();
      await user.save();
    });

    it('should reset password successfully with valid token', async () => {
      const req = {
        body: {
          token: resetToken,
          password: 'newpassword123'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await AuthController.resetPassword(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Contraseña restablecida exitosamente'
        })
      );

      // Verificar que la contraseña se actualizó
      const updatedUser = await User.findById(user._id).select('+password');
      const isPasswordValid = await require('bcryptjs').compare('newpassword123', updatedUser.password);
      expect(isPasswordValid).toBe(true);
      expect(updatedUser.passwordResetToken).toBeUndefined();
    });

    it('should return error for invalid token', async () => {
      const req = {
        body: {
          token: 'invalidtoken',
          password: 'newpassword123'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await AuthController.resetPassword(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Token de restablecimiento inválido o expirado'
        })
      );
    });
  });

  describe('POST /api/auth/verify-email', () => {
    let verificationToken;
    let user;

    beforeEach(async () => {
      // Crear usuario usando el método del modelo
      user = new User({
        fullName: 'Juan Pérez',
        email: 'juan@example.com',
        password: 'password', // El middleware pre-save se encargará de hashearlo
        userType: 'client',
        phone: '+1234567890',
        isEmailVerified: false,
        isActive: true,
        isDeleted: false
      });
      await user.save();

      // Generar token de verificación usando el método del modelo
      verificationToken = user.generateEmailVerificationToken();
      await user.save();
    });

    it('should verify email successfully with valid token', async () => {
      const req = {
        body: {
          token: verificationToken
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await AuthController.verifyEmail(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Email verificado exitosamente'
        })
      );

      // Verificar que el email se marcó como verificado
      const updatedUser = await User.findById(user._id);
      expect(updatedUser.isEmailVerified).toBe(true);
      expect(updatedUser.emailVerificationToken).toBeUndefined();
    });

    it('should return error for invalid token', async () => {
      const req = {
        body: {
          token: 'invalidtoken'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await AuthController.verifyEmail(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Token de verificación inválido o expirado'
        })
      );
    });
  });
});
