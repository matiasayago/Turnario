const express = require('express');
const authRoutes = require('./authenticateToken');
const userRoutes = require('./users');
const serviceRoutes = require('./services');
const bookingRoutes = require('./bookings');
const notificationRoutes = require('./notifications');
const reviewRoutes = require('./reviews');
const paymentRoutes = require('./payments');
const categoryRoutes = require('./categories');
const availabilityRoutes = require('./availability');

const router = express.Router();

// Configurar prefijo de API
const API_PREFIX = '/api/v1';

// Registrar todas las rutas
router.use(`${API_PREFIX}/authenticateToken`, authRoutes);
router.use(`${API_PREFIX}/users`, userRoutes);
router.use(`${API_PREFIX}/services`, serviceRoutes);
router.use(`${API_PREFIX}/bookings`, bookingRoutes);
router.use(`${API_PREFIX}/notifications`, notificationRoutes);
router.use(`${API_PREFIX}/reviews`, reviewRoutes);
router.use(`${API_PREFIX}/payments`, paymentRoutes);
router.use(`${API_PREFIX}/categories`, categoryRoutes);
router.use(`${API_PREFIX}/availability`, availabilityRoutes);

// Ruta de salud de la API
router.get(`${API_PREFIX}/health`, (req, res) => {
  res.json({
    success: true,
    message: 'API Turnario funcionando correctamente',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Ruta de información de la API
router.get(`${API_PREFIX}/info`, (req, res) => {
  res.json({
    success: true,
    data: {
      name: 'Turnario API',
      version: '1.0.0',
      description: 'API para sistema de gestión de turnos y reservas',
      endpoints: {
        authenticateToken: `${API_PREFIX}/authenticateToken`,
        users: `${API_PREFIX}/users`,
        services: `${API_PREFIX}/services`,
        bookings: `${API_PREFIX}/bookings`,
        notifications: `${API_PREFIX}/notifications`,
        reviews: `${API_PREFIX}/reviews`,
        payments: `${API_PREFIX}/payments`,
        categories: `${API_PREFIX}/categories`,
        availability: `${API_PREFIX}/availability`
      },
      features: [
        'Autenticación JWT',
        'Gestión de usuarios (clientes, profesionales, administradores)',
        'Gestión de servicios y categorías',
        'Sistema de reservas y turnos',
        'Sistema de notificaciones',
        'Sistema de reseñas y calificaciones',
        'Sistema de pagos',
        'Logs de auditoría',
        'Validación de datos',
        'Manejo de errores centralizado'
      ],
      documentation: '/api/v1/docs',
      support: 'support@turnario.com'
    }
  });
});

// Ruta de documentación de la API
router.get(`${API_PREFIX}/docs`, (req, res) => {
  res.json({
    success: true,
    message: 'Documentación de la API Turnario',
    data: {
      overview: 'Esta API proporciona endpoints para gestionar un sistema completo de turnos y reservas',
      authentication: {
        type: 'JWT Bearer Token',
        header: 'Authorization: Bearer <token>',
        endpoints: [
          'POST /authenticateToken/register - Registro de usuarios',
          'POST /authenticateToken/login - Inicio de sesión',
          'POST /authenticateToken/refresh - Renovar token',
          'POST /authenticateToken/logout - Cerrar sesión',
          'POST /authenticateToken/forgot-password - Recuperar contraseña',
          'POST /authenticateToken/reset-password - Restablecer contraseña',
          'POST /authenticateToken/verify-email - Verificar email'
        ]
      },
      userManagement: {
        description: 'Gestión completa de usuarios del sistema',
        endpoints: [
          'GET /users - Listar usuarios',
          'GET /users/:id - Obtener usuario',
          'PUT /users/:id - Actualizar usuario',
          'PATCH /users/:id/status - Cambiar estado',
          'PATCH /users/:id/verify - Verificar usuario',
          'DELETE /users/:id - Eliminar usuario',
          'GET /users/profile - Perfil del usuario',
          'PUT /users/profile - Actualizar perfil',
          'PUT /users/profile/password - Cambiar contraseña'
        ]
      },
      services: {
        description: 'Gestión de servicios ofrecidos por profesionales',
        endpoints: [
          'GET /services - Listar servicios',
          'GET /services/:id - Obtener servicio',
          'POST /services - Crear servicio',
          'PUT /services/:id - Actualizar servicio',
          'PATCH /services/:id/status - Cambiar estado',
          'DELETE /services/:id - Eliminar servicio',
          'POST /services/:id/reviews - Agregar reseña',
          'GET /services/categories - Obtener categorías',
          'GET /services/search - Búsqueda avanzada'
        ]
      },
      bookings: {
        description: 'Sistema de reservas y turnos',
        endpoints: [
          'GET /bookings - Listar reservas',
          'GET /bookings/:id - Obtener reserva',
          'POST /bookings - Crear reserva',
          'PUT /bookings/:id - Actualizar reserva',
          'PATCH /bookings/:id/status - Cambiar estado',
          'DELETE /bookings/:id - Cancelar reserva',
          'POST /bookings/:id/confirm - Confirmar reserva',
          'GET /bookings/availability - Verificar disponibilidad',
          'GET /bookings/upcoming - Reservas próximas'
        ]
      },
      notifications: {
        description: 'Sistema de notificaciones',
        endpoints: [
          'GET /notifications - Listar notificaciones',
          'GET /notifications/:id - Obtener notificación',
          'POST /notifications - Crear notificación',
          'POST /notifications/bulk - Crear múltiples notificaciones',
          'PUT /notifications/:id - Actualizar notificación',
          'PATCH /notifications/:id/read - Marcar como leída',
          'PATCH /notifications/:id/archive - Archivar',
          'PATCH /notifications/read-all - Marcar todas como leídas',
          'DELETE /notifications/:id - Eliminar notificación'
        ]
      },
      reviews: {
        description: 'Sistema de reseñas y calificaciones',
        endpoints: [
          'GET /reviews - Listar reseñas',
          'GET /reviews/:id - Obtener reseña',
          'POST /reviews - Crear reseña',
          'PUT /reviews/:id - Actualizar reseña',
          'DELETE /reviews/:id - Eliminar reseña',
          'POST /reviews/:id/reply - Responder reseña',
          'POST /reviews/:id/helpful - Marcar como útil',
          'GET /reviews/service/:serviceId - Reseñas de servicio',
          'GET /reviews/professional/:professionalId - Reseñas de profesional'
        ]
      },
      payments: {
        description: 'Sistema de pagos',
        endpoints: [
          'GET /payments - Listar pagos',
          'GET /payments/:id - Obtener pago',
          'POST /payments - Crear pago',
          'PUT /payments/:id - Actualizar pago',
          'PATCH /payments/:id/status - Cambiar estado',
          'DELETE /payments/:id - Eliminar pago',
          'POST /payments/:id/process - Procesar pago',
          'POST /payments/:id/complete - Completar pago',
          'GET /payments/pending - Pagos pendientes'
        ]
      },
      categories: {
        description: 'Gestión de categorías de servicios',
        endpoints: [
          'GET /categories - Listar categorías',
          'GET /categories/:id - Obtener categoría',
          'POST /categories - Crear categoría',
          'PUT /categories/:id - Actualizar categoría',
          'PATCH /categories/:id/status - Cambiar estado',
          'DELETE /categories/:id - Eliminar categoría',
          'GET /categories/tree - Árbol de categorías',
          'GET /categories/:id/services - Servicios de categoría',
          'GET /categories/search - Búsqueda de categorías'
        ]
      },
      availability: {
        description: 'Gestión de disponibilidad de profesionales',
        endpoints: [
          'GET /availability - Listar todas las disponibilidades (admin)',
          'GET /availability/:professionalId - Obtener disponibilidad de profesional',
          'POST /availability/:professionalId - Crear disponibilidad',
          'PUT /availability/:professionalId - Actualizar disponibilidad',
          'GET /availability/professionals/available - Profesionales disponibles en fecha',
          'GET /availability/:professionalId/check-date - Verificar disponibilidad de fecha',
          'GET /availability/:professionalId/time-slots - Obtener horarios disponibles',
          'GET /availability/:professionalId/check-time-slot - Verificar horario específico',
          'POST /availability/:professionalId/special-date - Agregar excepción especial',
          'POST /availability/:professionalId/recurring-exception - Agregar excepción recurrente',
          'DELETE /availability/:professionalId - Eliminar disponibilidad (admin)'
        ]
      },
      errorHandling: {
        description: 'Todos los endpoints devuelven respuestas consistentes',
        successResponse: {
          success: true,
          data: '...',
          message: 'Mensaje opcional'
        },
        errorResponse: {
          success: false,
          message: 'Descripción del error',
          errors: 'Array de errores de validación (opcional)'
        },
        statusCodes: {
          200: 'OK - Operación exitosa',
          201: 'Created - Recurso creado',
          400: 'Bad Request - Datos inválidos',
          401: 'Unauthorized - Token inválido o expirado',
          403: 'Forbidden - Sin permisos',
          404: 'Not Found - Recurso no encontrado',
          500: 'Internal Server Error - Error del servidor'
        }
      },
      pagination: {
        description: 'Los endpoints de listado soportan paginación',
        parameters: {
          page: 'Número de página (por defecto: 1)',
          limit: 'Elementos por página (por defecto: 20, máximo: 100)'
        },
        response: {
          data: 'Array de elementos',
          pagination: {
            page: 'Página actual',
            limit: 'Elementos por página',
            total: 'Total de elementos',
            pages: 'Total de páginas'
          }
        }
      },
      filtering: {
        description: 'Soporte para filtros en endpoints de listado',
        examples: [
          'GET /users?userType=professional&status=active',
          'GET /services?category=dental&minPrice=50&maxPrice=200',
          'GET /bookings?dateFrom=2024-01-01&dateTo=2024-01-31'
        ]
      },
      sorting: {
        description: 'Soporte para ordenamiento en endpoints de listado',
        parameters: {
          sortBy: 'Campo para ordenar',
          sortOrder: 'asc o desc'
        },
        examples: [
          'GET /users?sortBy=createdAt&sortOrder=desc',
          'GET /services?sortBy=price&sortOrder=asc'
        ]
      }
    }
  });
});

// Middleware para manejar rutas no encontradas
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint no encontrado',
    data: {
      method: req.method,
      path: req.originalUrl,
      availableEndpoints: [
        `${API_PREFIX}/health`,
        `${API_PREFIX}/info`,
        `${API_PREFIX}/docs`,
        `${API_PREFIX}/authenticateToken/*`,
        `${API_PREFIX}/users/*`,
        `${API_PREFIX}/services/*`,
        `${API_PREFIX}/bookings/*`,
        `${API_PREFIX}/notifications/*`,
        `${API_PREFIX}/reviews/*`,
        `${API_PREFIX}/payments/*`,
        `${API_PREFIX}/categories/*`,
        `${API_PREFIX}/availability/*`
      ]
    }
  });
});

module.exports = router;
