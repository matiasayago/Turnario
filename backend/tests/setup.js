// Configuración global para tests
const mongoose = require('mongoose');

// Configurar variables de entorno para tests
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key';
process.env.MONGODB_URI = 'mongodb://localhost:27017/turnario-test';

// Configurar timeouts
jest.setTimeout(30000);

// Configurar mocks globales
global.console = {
  ...console,
  // Silenciar logs en tests
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock de servicios externos
jest.mock('../services/emailService', () => ({
  sendEmail: jest.fn().mockResolvedValue(true),
  sendEmailVerification: jest.fn().mockResolvedValue(true),
  sendPasswordReset: jest.fn().mockResolvedValue(true)
}));

// Mock del logger
jest.mock('../config/logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  logAuth: jest.fn(),
  logEmail: jest.fn(),
  logValidationError: jest.fn()
}));

// Configurar mongoose para tests
beforeAll(async () => {
  // Configurar mongoose para tests
  mongoose.set('strictQuery', false);
});

// Limpiar después de cada test
afterEach(async () => {
  // Limpiar todas las colecciones
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany();
  }
  
  // Limpiar mocks
  jest.clearAllMocks();
});

// Configurar helpers para tests
global.testHelpers = {
  // Crear usuario de prueba
  createTestUser: async (userData = {}) => {
    const User = require('../models/User');
    const defaultData = {
      fullName: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      userType: 'client',
      isActive: true,
      isEmailVerified: true,
      ...userData
    };
    
    return await User.create(defaultData);
  },
  
  // Crear servicio de prueba
  createTestService: async (serviceData = {}) => {
    const Service = require('../models/Service');
    const User = require('../models/User');
    
    // Crear profesional si no existe
    let professional = serviceData.professionalId;
    if (!professional) {
      professional = await User.create({
        fullName: 'Test Professional',
        email: 'professional@example.com',
        password: 'password123',
        userType: 'professional',
        isActive: true
      });
    }
    
    const defaultData = {
      name: 'Test Service',
      description: 'Test service description',
      price: 100,
      duration: 60,
      professionalId: professional._id,
      isActive: true,
      ...serviceData
    };
    
    return await Service.create(defaultData);
  },
  
  // Crear categoría de prueba
  createTestCategory: async (categoryData = {}) => {
    const Category = require('../models/Category');
    const defaultData = {
      name: 'Test Category',
      description: 'Test category description',
      isActive: true,
      ...categoryData
    };
    
    return await Category.create(defaultData);
  },
  
  // Generar token JWT
  generateTestToken: (user) => {
    const jwt = require('jsonwebtoken');
    return jwt.sign(
      { userId: user._id, userType: user.userType },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  },
  
  // Simular request autenticado
  mockAuthenticatedRequest: (user, additionalData = {}) => {
    return {
      user,
      ...additionalData
    };
  },
  
  // Simular response
  mockResponse: () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    return res;
  }
};

// Configurar expectaciones personalizadas
expect.extend({
  toBeValidObjectId(received) {
    const pass = mongoose.Types.ObjectId.isValid(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid ObjectId`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid ObjectId`,
        pass: false,
      };
    }
  },
  
  toBeValidDate(received) {
    const pass = received instanceof Date && !isNaN(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid Date`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid Date`,
        pass: false,
      };
    }
  }
});
