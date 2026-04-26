const { body, param, query } = require('express-validator');

// Validaciones de autenticación
const authValidations = {
  register: [
    body('fullName')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('El nombre debe tener entre 2 y 100 caracteres')
      .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
      .withMessage('El nombre solo puede contener letras y espacios'),
    
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Email inválido')
      .isLength({ max: 255 })
      .withMessage('El email no puede exceder 255 caracteres'),
    
    body('password')
      .isLength({ min: 8, max: 128 })
      .withMessage('La contraseña debe tener entre 8 y 128 caracteres')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('La contraseña debe contener al menos una mayúscula, una minúscula, un número y un carácter especial'),
    
    body('userType')
      .isIn(['client', 'professional', 'admin'])
      .withMessage('Tipo de usuario inválido'),
    
    body('phone')
      .optional()
      .matches(/^[\+]?[1-9][\d]{0,15}$/)
      .withMessage('Número de teléfono inválido'),
    
    body('dateOfBirth')
      .optional()
      .isISO8601()
      .withMessage('Fecha de nacimiento inválida')
      .custom((value) => {
        const age = Math.floor((new Date() - new Date(value)) / (365.25 * 24 * 60 * 60 * 1000));
        if (age < 13 || age > 120) {
          throw new Error('La edad debe estar entre 13 y 120 años');
        }
        return true;
      })
  ],

  login: [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Email inválido'),
    
    body('password')
      .notEmpty()
      .withMessage('Contraseña requerida')
      .isLength({ min: 1, max: 128 })
      .withMessage('La contraseña no puede exceder 128 caracteres')
  ],

  forgotPassword: [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Email inválido')
  ],

  resetPassword: [
    body('token')
      .notEmpty()
      .withMessage('Token requerido')
      .isLength({ min: 32, max: 64 })
      .withMessage('Token inválido'),
    
    body('password')
      .isLength({ min: 8, max: 128 })
      .withMessage('La contraseña debe tener entre 8 y 128 caracteres')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('La contraseña debe contener al menos una mayúscula, una minúscula, un número y un carácter especial')
  ],

  changePassword: [
    body('currentPassword')
      .notEmpty()
      .withMessage('Contraseña actual requerida'),
    
    body('newPassword')
      .isLength({ min: 8, max: 128 })
      .withMessage('La nueva contraseña debe tener entre 8 y 128 caracteres')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('La nueva contraseña debe contener al menos una mayúscula, una minúscula, un número y un carácter especial')
      .custom((value, { req }) => {
        if (value === req.body.currentPassword) {
          throw new Error('La nueva contraseña debe ser diferente a la actual');
        }
        return true;
      })
  ]
};

// Validaciones de usuarios
const userValidations = {
  create: [
    body('fullName')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('El nombre debe tener entre 2 y 100 caracteres')
      .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
      .withMessage('El nombre solo puede contener letras y espacios'),
    
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Email inválido')
      .isLength({ max: 255 })
      .withMessage('El email no puede exceder 255 caracteres'),
    
    body('password')
      .isLength({ min: 8, max: 128 })
      .withMessage('La contraseña debe tener entre 8 y 128 caracteres')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('La contraseña debe contener al menos una mayúscula, una minúscula, un número y un carácter especial'),
    
    body('userType')
      .isIn(['client', 'professional', 'admin'])
      .withMessage('Tipo de usuario inválido'),
    
    body('phone')
      .optional()
      .matches(/^[\+]?[1-9][\d]{0,15}$/)
      .withMessage('Número de teléfono inválido'),
    
    body('dateOfBirth')
      .optional()
      .isISO8601()
      .withMessage('Fecha de nacimiento inválida')
      .custom((value) => {
        const age = Math.floor((new Date() - new Date(value)) / (365.25 * 24 * 60 * 60 * 1000));
        if (age < 13 || age > 120) {
          throw new Error('La edad debe estar entre 13 y 120 años');
        }
        return true;
      })
  ],

  update: [
    body('fullName')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('El nombre debe tener entre 2 y 100 caracteres')
      .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
      .withMessage('El nombre solo puede contener letras y espacios'),
    
    body('email')
      .optional()
      .isEmail()
      .normalizeEmail()
      .withMessage('Email inválido')
      .isLength({ max: 255 })
      .withMessage('El email no puede exceder 255 caracteres'),
    
    body('phone')
      .optional()
      .matches(/^[\+]?[1-9][\d]{0,15}$/)
      .withMessage('Número de teléfono inválido'),
    
    body('dateOfBirth')
      .optional()
      .isISO8601()
      .withMessage('Fecha de nacimiento inválida')
      .custom((value) => {
        const age = Math.floor((new Date() - new Date(value)) / (365.25 * 24 * 60 * 60 * 1000));
        if (age < 13 || age > 120) {
          throw new Error('La edad debe estar entre 13 y 120 años');
        }
        return true;
      }),
    
    body('userType')
      .optional()
      .isIn(['client', 'professional', 'admin'])
      .withMessage('Tipo de usuario inválido')
  ],

  updateStatus: [
    body('isActive')
      .isBoolean()
      .withMessage('El estado debe ser un valor booleano'),
    
    body('reason')
      .optional()
      .isString()
      .isLength({ max: 500 })
      .withMessage('La razón no puede exceder 500 caracteres')
  ],

  id: [
    param('id')
      .isMongoId()
      .withMessage('ID de usuario inválido')
  ]
};

// Validaciones de servicios
const serviceValidations = {
  create: [
    body('name')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('El nombre debe tener entre 2 y 100 caracteres')
      .matches(/^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s\-_.,()]+$/)
      .withMessage('El nombre contiene caracteres no permitidos'),
    
    body('description')
      .trim()
      .isLength({ min: 10, max: 1000 })
      .withMessage('La descripción debe tener entre 10 y 1000 caracteres'),
    
    body('price')
      .isFloat({ min: 0.01, max: 999999.99 })
      .withMessage('El precio debe estar entre 0.01 y 999,999.99'),
    
    body('duration')
      .isInt({ min: 15, max: 480 })
      .withMessage('La duración debe estar entre 15 y 480 minutos'),
    
    body('categoryId')
      .isMongoId()
      .withMessage('ID de categoría inválido'),
    
    body('currency')
      .optional()
      .isIn(['USD', 'EUR', 'COP'])
      .withMessage('Moneda inválida'),
    
    body('requirements')
      .optional()
      .isArray({ max: 20 })
      .withMessage('Los requisitos deben ser un array con máximo 20 elementos'),
    
    body('requirements.*')
      .optional()
      .isString()
      .isLength({ max: 200 })
      .withMessage('Cada requisito no puede exceder 200 caracteres'),
    
    body('cancellationPolicy')
      .optional()
      .isString()
      .isLength({ max: 1000 })
      .withMessage('La política de cancelación no puede exceder 1000 caracteres'),
    
    body('maxBookingsPerDay')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('El máximo de reservas por día debe estar entre 1 y 50'),
    
    body('advanceBookingDays')
      .optional()
      .isInt({ min: 0, max: 365 })
      .withMessage('Los días de reserva anticipada deben estar entre 0 y 365')
  ],

  update: [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('El nombre debe tener entre 2 y 100 caracteres')
      .matches(/^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s\-_.,()]+$/)
      .withMessage('El nombre contiene caracteres no permitidos'),
    
    body('description')
      .optional()
      .trim()
      .isLength({ min: 10, max: 1000 })
      .withMessage('La descripción debe tener entre 10 y 1000 caracteres'),
    
    body('price')
      .optional()
      .isFloat({ min: 0.01, max: 999999.99 })
      .withMessage('El precio debe estar entre 0.01 y 999,999.99'),
    
    body('duration')
      .optional()
      .isInt({ min: 15, max: 480 })
      .withMessage('La duración debe estar entre 15 y 480 minutos'),
    
    body('categoryId')
      .optional()
      .isMongoId()
      .withMessage('ID de categoría inválido'),
    
    body('currency')
      .optional()
      .isIn(['USD', 'EUR', 'COP'])
      .withMessage('Moneda inválida'),
    
    body('requirements')
      .optional()
      .isArray({ max: 20 })
      .withMessage('Los requisitos deben ser un array con máximo 20 elementos'),
    
    body('requirements.*')
      .optional()
      .isString()
      .isLength({ max: 200 })
      .withMessage('Cada requisito no puede exceder 200 caracteres'),
    
    body('cancellationPolicy')
      .optional()
      .isString()
      .isLength({ max: 1000 })
      .withMessage('La política de cancelación no puede exceder 1000 caracteres')
  ],

  updateStatus: [
    body('isActive')
      .isBoolean()
      .withMessage('El estado debe ser un valor booleano'),
    
    body('reason')
      .optional()
      .isString()
      .isLength({ max: 500 })
      .withMessage('La razón no puede exceder 500 caracteres')
  ],

  id: [
    param('id')
      .isMongoId()
      .withMessage('ID de servicio inválido')
  ],

  search: [
    query('q')
      .optional()
      .isString()
      .isLength({ min: 2, max: 100 })
      .withMessage('El término de búsqueda debe tener entre 2 y 100 caracteres'),
    
    query('categoryId')
      .optional()
      .isMongoId()
      .withMessage('ID de categoría inválido'),
    
    query('professionalId')
      .optional()
      .isMongoId()
      .withMessage('ID de profesional inválido'),
    
    query('minPrice')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Precio mínimo inválido'),
    
    query('maxPrice')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Precio máximo inválido')
      .custom((value, { req }) => {
        if (req.query.minPrice && parseFloat(value) < parseFloat(req.query.minPrice)) {
          throw new Error('El precio máximo debe ser mayor al precio mínimo');
        }
        return true;
      }),
    
    query('isActive')
      .optional()
      .isBoolean()
      .withMessage('Estado activo inválido')
  ]
};

// Validaciones de reservas
const bookingValidations = {
  create: [
    body('serviceId')
      .isMongoId()
      .withMessage('ID de servicio inválido'),
    
    body('date')
      .isISO8601()
      .withMessage('Fecha inválida')
      .custom((value) => {
        const selectedDate = new Date(value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (selectedDate < today) {
          throw new Error('No se pueden crear reservas en fechas pasadas');
        }
        
        // Máximo 1 año en el futuro
        const maxDate = new Date();
        maxDate.setFullYear(maxDate.getFullYear() + 1);
        
        if (selectedDate > maxDate) {
          throw new Error('No se pueden crear reservas con más de 1 año de anticipación');
        }
        
        return true;
      }),
    
    body('startTime')
      .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .withMessage('Hora de inicio inválida (formato HH:MM)')
      .custom((value) => {
        const [hours, minutes] = value.split(':').map(Number);
        if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
          throw new Error('Hora de inicio inválida');
        }
        return true;
      }),
    
    body('endTime')
      .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .withMessage('Hora de fin inválida (formato HH:MM)')
      .custom((value, { req }) => {
        const [hours, minutes] = value.split(':').map(Number);
        if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
          throw new Error('Hora de fin inválida');
        }
        
        if (req.body.startTime) {
          const startTime = req.body.startTime;
          const startMinutes = parseInt(startTime.split(':')[0]) * 60 + parseInt(startTime.split(':')[1]);
          const endMinutes = hours * 60 + minutes;
          
          if (endMinutes <= startMinutes) {
            throw new Error('La hora de fin debe ser posterior a la hora de inicio');
          }
          
          const duration = endMinutes - startMinutes;
          if (duration < 15) {
            throw new Error('La duración mínima de una reserva es 15 minutos');
          }
          
          if (duration > 480) {
            throw new Error('La duración máxima de una reserva es 8 horas');
          }
        }
        
        return true;
      }),
    
    body('notes')
      .optional()
      .isString()
      .isLength({ max: 500 })
      .withMessage('Las notas no pueden exceder 500 caracteres'),
    
    body('specialRequirements')
      .optional()
      .isString()
      .isLength({ max: 1000 })
      .withMessage('Los requisitos especiales no pueden exceder 1000 caracteres')
  ],

  update: [
    body('date')
      .optional()
      .isISO8601()
      .withMessage('Fecha inválida')
      .custom((value) => {
        const selectedDate = new Date(value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (selectedDate < today) {
          throw new Error('No se pueden actualizar reservas a fechas pasadas');
        }
        
        return true;
      }),
    
    body('startTime')
      .optional()
      .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .withMessage('Hora de inicio inválida (formato HH:MM)'),
    
    body('endTime')
      .optional()
      .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .withMessage('Hora de fin inválida (formato HH:MM)')
      .custom((value, { req }) => {
        if (req.body.startTime && value) {
          const startTime = req.body.startTime;
          const [startHours, startMinutes] = startTime.split(':').map(Number);
          const [endHours, endMinutes] = value.split(':').map(Number);
          
          const startTotal = startHours * 60 + startMinutes;
          const endTotal = endHours * 60 + endMinutes;
          
          if (endTotal <= startTotal) {
            throw new Error('La hora de fin debe ser posterior a la hora de inicio');
          }
        }
        return true;
      }),
    
    body('notes')
      .optional()
      .isString()
      .isLength({ max: 500 })
      .withMessage('Las notas no pueden exceder 500 caracteres'),
    
    body('specialRequirements')
      .optional()
      .isString()
      .isLength({ max: 1000 })
      .withMessage('Los requisitos especiales no pueden exceder 1000 caracteres')
  ],

  updateStatus: [
    body('status')
      .isIn(['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'])
      .withMessage('Estado inválido'),
    
    body('reason')
      .optional()
      .isString()
      .isLength({ max: 500 })
      .withMessage('La razón no puede exceder 500 caracteres')
  ],

  cancel: [
    body('reason')
      .optional()
      .isString()
      .isLength({ max: 500 })
      .withMessage('La razón no puede exceder 500 caracteres')
  ],

  id: [
    param('id')
      .isMongoId()
      .withMessage('ID de reserva inválido')
  ],

  availability: [
    query('serviceId')
      .isMongoId()
      .withMessage('ID de servicio inválido'),
    
    query('date')
      .isISO8601()
      .withMessage('Fecha inválida'),
    
    query('startTime')
      .optional()
      .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .withMessage('Hora de inicio inválida (formato HH:MM)'),
    
    query('endTime')
      .optional()
      .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .withMessage('Hora de fin inválida (formato HH:MM)')
  ]
};

// Validaciones de notificaciones
const notificationValidations = {
  create: [
    body('recipientId')
      .isMongoId()
      .withMessage('ID de destinatario inválido'),
    
    body('type')
      .isString()
      .isLength({ min: 1, max: 50 })
      .withMessage('Tipo de notificación inválido')
      .matches(/^[a-zA-Z_]+$/)
      .withMessage('El tipo solo puede contener letras y guiones bajos'),
    
    body('title')
      .isString()
      .isLength({ min: 1, max: 200 })
      .withMessage('El título debe tener entre 1 y 200 caracteres'),
    
    body('message')
      .isString()
      .isLength({ min: 1, max: 1000 })
      .withMessage('El mensaje debe tener entre 1 y 1000 caracteres'),
    
    body('priority')
      .optional()
      .isIn(['low', 'normal', 'high', 'urgent'])
      .withMessage('Prioridad inválida'),
    
    body('category')
      .optional()
      .isString()
      .isLength({ max: 50 })
      .withMessage('Categoría inválida'),
    
    body('metadata')
      .optional()
      .isObject()
      .withMessage('Metadatos inválidos')
  ],

  bulkCreate: [
    body('notifications')
      .isArray({ min: 1, max: 100 })
      .withMessage('Se requiere al menos una notificación y máximo 100'),
    
    body('notifications.*.recipientId')
      .isMongoId()
      .withMessage('ID de destinatario inválido'),
    
    body('notifications.*.type')
      .isString()
      .isLength({ min: 1, max: 50 })
      .withMessage('Tipo de notificación inválido'),
    
    body('notifications.*.title')
      .isString()
      .isLength({ min: 1, max: 200 })
      .withMessage('El título debe tener entre 1 y 200 caracteres'),
    
    body('notifications.*.message')
      .isString()
      .isLength({ min: 1, max: 1000 })
      .withMessage('El mensaje debe tener entre 1 y 1000 caracteres')
  ],

  update: [
    body('title')
      .optional()
      .isString()
      .isLength({ min: 1, max: 200 })
      .withMessage('El título debe tener entre 1 y 200 caracteres'),
    
    body('message')
      .optional()
      .isString()
      .isLength({ min: 1, max: 1000 })
      .withMessage('El mensaje debe tener entre 1 y 1000 caracteres'),
    
    body('priority')
      .optional()
      .isIn(['low', 'normal', 'high', 'urgent'])
      .withMessage('Prioridad inválida'),
    
    body('category')
      .optional()
      .isString()
      .isLength({ max: 50 })
      .withMessage('Categoría inválida')
  ],

  id: [
    param('id')
      .isMongoId()
      .withMessage('ID de notificación inválido')
  ]
};

// Validaciones de reseñas
const reviewValidations = {
  create: [
    body('serviceId')
      .isMongoId()
      .withMessage('ID de servicio inválido'),
    
    body('professionalId')
      .isMongoId()
      .withMessage('ID de profesional inválido'),
    
    body('rating')
      .isInt({ min: 1, max: 5 })
      .withMessage('El rating debe estar entre 1 y 5'),
    
    body('title')
      .isString()
      .isLength({ min: 1, max: 200 })
      .withMessage('El título debe tener entre 1 y 200 caracteres')
      .matches(/^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s\-_.,()!?]+$/)
      .withMessage('El título contiene caracteres no permitidos'),
    
    body('comment')
      .isString()
      .isLength({ min: 10, max: 1000 })
      .withMessage('El comentario debe tener entre 10 y 1000 caracteres'),
    
    body('pros')
      .optional()
      .isString()
      .isLength({ max: 500 })
      .withMessage('Los pros no pueden exceder 500 caracteres'),
    
    body('cons')
      .optional()
      .isString()
      .isLength({ max: 500 })
      .withMessage('Los contras no pueden exceder 500 caracteres')
  ],

  update: [
    body('rating')
      .optional()
      .isInt({ min: 1, max: 5 })
      .withMessage('El rating debe estar entre 1 y 5'),
    
    body('title')
      .optional()
      .isString()
      .isLength({ min: 1, max: 200 })
      .withMessage('El título debe tener entre 1 y 200 caracteres'),
    
    body('comment')
      .optional()
      .isString()
      .isLength({ min: 10, max: 1000 })
      .withMessage('El comentario debe tener entre 10 y 1000 caracteres'),
    
    body('pros')
      .optional()
      .isString()
      .isLength({ max: 500 })
      .withMessage('Los pros no pueden exceder 500 caracteres'),
    
    body('cons')
      .optional()
      .isString()
      .isLength({ max: 500 })
      .withMessage('Los contras no pueden exceder 500 caracteres')
  ],

  reply: [
    body('comment')
      .isString()
      .isLength({ min: 10, max: 1000 })
      .withMessage('El comentario debe tener entre 10 y 1000 caracteres')
  ],

  id: [
    param('id')
      .isMongoId()
      .withMessage('ID de reseña inválido')
  ]
};

// Validaciones de pagos
const paymentValidations = {
  create: [
    body('bookingId')
      .isMongoId()
      .withMessage('ID de reserva inválido'),
    
    body('amount')
      .isFloat({ min: 0.01, max: 999999.99 })
      .withMessage('El monto debe estar entre 0.01 y 999,999.99'),
    
    body('currency')
      .optional()
      .isIn(['USD', 'EUR', 'COP'])
      .withMessage('Moneda inválida'),
    
    body('paymentMethod')
      .isString()
      .isLength({ min: 1, max: 50 })
      .withMessage('Método de pago inválido')
      .isIn(['credit_card', 'debit_card', 'bank_transfer', 'cash', 'digital_wallet'])
      .withMessage('Método de pago no soportado'),
    
    body('description')
      .optional()
      .isString()
      .isLength({ max: 500 })
      .withMessage('La descripción no puede exceder 500 caracteres'),
    
    body('metadata')
      .optional()
      .isObject()
      .withMessage('Metadatos inválidos')
  ],

  update: [
    body('amount')
      .optional()
      .isFloat({ min: 0.01, max: 999999.99 })
      .withMessage('El monto debe estar entre 0.01 y 999,999.99'),
    
    body('currency')
      .optional()
      .isIn(['USD', 'EUR', 'COP'])
      .withMessage('Moneda inválida'),
    
    body('paymentMethod')
      .optional()
      .isString()
      .isLength({ min: 1, max: 50 })
      .withMessage('Método de pago inválido'),
    
    body('description')
      .optional()
      .isString()
      .isLength({ max: 500 })
      .withMessage('La descripción no puede exceder 500 caracteres')
  ],

  updateStatus: [
    body('status')
      .isIn(['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'])
      .withMessage('Estado inválido'),
    
    body('reason')
      .optional()
      .isString()
      .isLength({ max: 500 })
      .withMessage('La razón no puede exceder 500 caracteres'),
    
    body('transactionId')
      .optional()
      .isString()
      .isLength({ max: 100 })
      .withMessage('ID de transacción inválido')
  ],

  process: [
    body('transactionId')
      .optional()
      .isString()
      .isLength({ max: 100 })
      .withMessage('ID de transacción inválido'),
    
    body('paymentDetails')
      .optional()
      .isObject()
      .withMessage('Detalles de pago inválidos')
  ],

  id: [
    param('id')
      .isMongoId()
      .withMessage('ID de pago inválido')
  ]
};

// Validaciones de categorías
const categoryValidations = {
  create: [
    body('name')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('El nombre debe tener entre 2 y 100 caracteres')
      .matches(/^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s\-_]+$/)
      .withMessage('El nombre contiene caracteres no permitidos'),
    
    body('description')
      .optional()
      .isString()
      .isLength({ max: 500 })
      .withMessage('La descripción no puede exceder 500 caracteres'),
    
    body('parentId')
      .optional()
      .isMongoId()
      .withMessage('ID de categoría padre inválido'),
    
    body('icon')
      .optional()
      .isString()
      .isLength({ max: 50 })
      .withMessage('El icono no puede exceder 50 caracteres')
      .matches(/^[a-zA-Z0-9\-_]+$/)
      .withMessage('El icono contiene caracteres no permitidos'),
    
    body('color')
      .optional()
      .matches(/^#[0-9A-F]{6}$/i)
      .withMessage('Color inválido (formato hexadecimal)'),
    
    body('sortOrder')
      .optional()
      .isInt({ min: 0, max: 999 })
      .withMessage('El orden debe estar entre 0 y 999')
  ],

  update: [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('El nombre debe tener entre 2 y 100 caracteres')
      .matches(/^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s\-_]+$/)
      .withMessage('El nombre contiene caracteres no permitidos'),
    
    body('description')
      .optional()
      .isString()
      .isLength({ max: 500 })
      .withMessage('La descripción no puede exceder 500 caracteres'),
    
    body('parentId')
      .optional()
      .isMongoId()
      .withMessage('ID de categoría padre inválido'),
    
    body('icon')
      .optional()
      .isString()
      .isLength({ max: 50 })
      .withMessage('El icono no puede exceder 50 caracteres'),
    
    body('color')
      .optional()
      .matches(/^#[0-9A-F]{6}$/i)
      .withMessage('Color inválido (formato hexadecimal)'),
    
    body('sortOrder')
      .optional()
      .isInt({ min: 0, max: 999 })
      .withMessage('El orden debe estar entre 0 y 999')
  ],

  updateStatus: [
    body('isActive')
      .isBoolean()
      .withMessage('El estado debe ser un valor booleano'),
    
    body('reason')
      .optional()
      .isString()
      .isLength({ max: 500 })
      .withMessage('La razón no puede exceder 500 caracteres')
  ],

  id: [
    param('id')
      .isMongoId()
      .withMessage('ID de categoría inválido')
  ],

  search: [
    query('q')
      .optional()
      .isString()
      .isLength({ min: 2, max: 100 })
      .withMessage('El término de búsqueda debe tener entre 2 y 100 caracteres'),
    
    query('parentId')
      .optional()
      .isMongoId()
      .withMessage('ID de categoría padre inválido'),
    
    query('isActive')
      .optional()
      .isBoolean()
      .withMessage('Estado activo inválido')
  ]
};

// Validaciones de paginación y filtros comunes
const commonValidations = {
  pagination: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('El número de página debe ser mayor a 0'),
    
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('El límite debe estar entre 1 y 100'),
    
    query('sortBy')
      .optional()
      .isString()
      .isLength({ max: 50 })
      .withMessage('Campo de ordenamiento inválido'),
    
    query('sortOrder')
      .optional()
      .isIn(['asc', 'desc'])
      .withMessage('Orden inválido (asc o desc)')
  ],

  dateRange: [
    query('dateFrom')
      .optional()
      .isISO8601()
      .withMessage('Fecha desde inválida'),
    
    query('dateTo')
      .optional()
      .isISO8601()
      .withMessage('Fecha hasta inválida')
      .custom((value, { req }) => {
        if (req.query.dateFrom && value) {
          const fromDate = new Date(req.query.dateFrom);
          const toDate = new Date(value);
          
          if (toDate < fromDate) {
            throw new Error('La fecha hasta debe ser posterior a la fecha desde');
          }
        }
        return true;
      })
  ]
};

module.exports = {
  authValidations,
  userValidations,
  serviceValidations,
  bookingValidations,
  notificationValidations,
  reviewValidations,
  paymentValidations,
  categoryValidations,
  commonValidations
};
