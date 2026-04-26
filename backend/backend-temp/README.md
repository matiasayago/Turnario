# Turnario Backend API

Backend completo para el sistema de gestión de citas y reservas Turnario, implementado con Node.js, Express y MongoDB siguiendo el patrón MVC.

## 🚀 Características

- **Arquitectura MVC**: Separación clara de responsabilidades
- **Autenticación JWT**: Sistema seguro de autenticación y autorización
- **Validación Robusta**: Validaciones específicas para cada endpoint
- **Documentación API**: Documentación completa con Swagger/OpenAPI
- **Testing Unitario**: Cobertura completa de tests con Jest
- **Logging Centralizado**: Sistema de logs con Winston
- **Soft Delete**: Eliminación lógica para mantener integridad de datos
- **Paginación**: Sistema de paginación para listas grandes
- **Filtros Avanzados**: Búsqueda y filtrado por múltiples criterios
- **Notificaciones**: Sistema de notificaciones en tiempo real
- **Reseñas y Calificaciones**: Sistema completo de reviews
- **Gestión de Pagos**: Integración con pasarelas de pago
- **Categorías Jerárquicas**: Gestión de categorías con estructura padre-hijo

## 📋 Requisitos Previos

- Node.js >= 16.0.0
- npm >= 8.0.0
- MongoDB >= 5.0
- Git

## 🛠️ Instalación

1. **Clonar el repositorio**
```bash
git clone <repository-url>
cd turnario-backend
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar variables de entorno**
```bash
cp .env.example .env
```

Editar el archivo `.env` con tus configuraciones:
```env
# Servidor
NODE_ENV=development
PORT=3000

# Base de datos
MONGODB_URI=mongodb://localhost:27017/turnario

# JWT
JWT_SECRET=tu-jwt-secret-super-seguro
JWT_REFRESH_SECRET=tu-refresh-secret-super-seguro
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=tu-email@gmail.com
EMAIL_PASS=tu-password-de-aplicacion
EMAIL_FROM=noreply@turnario.com

# Frontend URL
FRONTEND_URL=http://localhost:3001

# Logging
LOG_LEVEL=info
LOG_FILE=logs/app.log
```

4. **Iniciar el servidor**
```bash
# Desarrollo
npm run dev

# Producción
npm start
```

## 🧪 Testing

### Ejecutar Tests
```bash
# Todos los tests
npm test

# Tests en modo watch
npm run test:watch

# Tests con cobertura
npm run test:coverage

# Tests para CI/CD
npm run test:ci
```

### Cobertura de Tests
El proyecto incluye tests unitarios para:
- ✅ Controladores (Auth, User, Service, Booking, etc.)
- ✅ Validaciones de entrada
- ✅ Middleware de autenticación
- ✅ Modelos de datos
- ✅ Servicios externos (email, etc.)

### Estructura de Tests
```
tests/
├── setup.js                 # Configuración global de tests
├── controllers/             # Tests de controladores
│   ├── authController.test.js
│   ├── userController.test.js
│   └── ...
├── middleware/              # Tests de middleware
├── models/                  # Tests de modelos
└── services/                # Tests de servicios
```

## 📚 Documentación API

### Generar Documentación
```bash
npm run docs:generate
```

### Servir Documentación
```bash
npm run docs:serve
```

La documentación estará disponible en: `http://localhost:3000/api-docs`

### Endpoints Principales

#### Autenticación
- `POST /api/auth/register` - Registrar usuario
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/refresh-token` - Renovar token
- `POST /api/auth/forgot-password` - Recuperar contraseña
- `POST /api/auth/reset-password` - Restablecer contraseña
- `GET /api/auth/verify-email/:token` - Verificar email

#### Usuarios
- `GET /api/users` - Listar usuarios (Admin)
- `GET /api/users/:id` - Obtener usuario
- `POST /api/users` - Crear usuario (Admin)
- `PUT /api/users/:id` - Actualizar usuario
- `DELETE /api/users/:id` - Eliminar usuario (Admin)

#### Servicios
- `GET /api/services` - Listar servicios
- `GET /api/services/:id` - Obtener servicio
- `POST /api/services` - Crear servicio (Professional/Admin)
- `PUT /api/services/:id` - Actualizar servicio
- `DELETE /api/services/:id` - Eliminar servicio

#### Reservas
- `GET /api/bookings` - Listar reservas
- `GET /api/bookings/:id` - Obtener reserva
- `POST /api/bookings` - Crear reserva (Client)
- `PUT /api/bookings/:id` - Actualizar reserva
- `PATCH /api/bookings/:id/status` - Cambiar estado
- `POST /api/bookings/:id/cancel` - Cancelar reserva

#### Notificaciones
- `GET /api/notifications` - Listar notificaciones
- `POST /api/notifications` - Crear notificación
- `POST /api/notifications/bulk` - Crear múltiples notificaciones
- `PATCH /api/notifications/:id/read` - Marcar como leída

#### Reseñas
- `GET /api/reviews` - Listar reseñas
- `POST /api/reviews` - Crear reseña (Client)
- `PUT /api/reviews/:id` - Actualizar reseña
- `POST /api/reviews/:id/reply` - Responder reseña (Professional)

#### Pagos
- `GET /api/payments` - Listar pagos
- `POST /api/payments` - Crear pago
- `PATCH /api/payments/:id/status` - Cambiar estado
- `POST /api/payments/:id/process` - Procesar pago

#### Categorías
- `GET /api/categories` - Listar categorías
- `GET /api/categories/tree` - Árbol de categorías
- `POST /api/categories` - Crear categoría (Admin)
- `PUT /api/categories/:id` - Actualizar categoría (Admin)

## 🏗️ Estructura del Proyecto

```
backend/
├── controllers/             # Lógica de negocio
│   ├── authController.js
│   ├── userController.js
│   ├── serviceController.js
│   ├── bookingController.js
│   ├── notificationController.js
│   ├── reviewController.js
│   ├── paymentController.js
│   └── categoryController.js
├── routes/                  # Definición de endpoints
│   ├── auth.js
│   ├── users.js
│   ├── services.js
│   ├── bookings.js
│   ├── notifications.js
│   ├── reviews.js
│   ├── payments.js
│   └── categories.js
├── models/                  # Modelos de datos
│   ├── User.js
│   ├── Service.js
│   ├── Booking.js
│   ├── Notification.js
│   ├── Review.js
│   ├── Payment.js
│   └── Category.js
├── middleware/              # Middleware personalizado
│   ├── auth.js
│   ├── roles.js
│   ├── validation.js
│   └── validationSchemas.js
├── services/                # Servicios externos
│   ├── emailService.js
│   └── paymentService.js
├── config/                  # Configuración
│   ├── database.js
│   └── logger.js
├── tests/                   # Tests unitarios
│   ├── setup.js
│   └── controllers/
├── docs/                    # Documentación
│   └── swagger.json
├── logs/                    # Archivos de log
├── .env                     # Variables de entorno
├── .env.example            # Ejemplo de variables
├── package.json
├── jest.config.js
└── README.md
```

## 🔐 Autenticación y Autorización

### Tipos de Usuario
- **client**: Cliente que puede hacer reservas
- **professional**: Profesional que ofrece servicios
- **admin**: Administrador con acceso completo

### Tokens JWT
- **Access Token**: Válido por 24 horas
- **Refresh Token**: Válido por 7 días

### Headers Requeridos
```http
Authorization: Bearer <access-token>
Content-Type: application/json
```

## 📊 Validaciones

### Validaciones Implementadas
- ✅ Validación de emails
- ✅ Validación de contraseñas (complejidad)
- ✅ Validación de fechas y horarios
- ✅ Validación de precios y montos
- ✅ Validación de IDs de MongoDB
- ✅ Validación de tipos de usuario
- ✅ Validación de estados de reservas
- ✅ Validación de ratings (1-5)
- ✅ Validación de teléfonos
- ✅ Validación de URLs y colores

### Ejemplo de Validación
```javascript
const { body } = require('express-validator');

const createBookingValidation = [
  body('serviceId').isMongoId().withMessage('ID de servicio inválido'),
  body('date').isISO8601().withMessage('Fecha inválida'),
  body('startTime').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Hora de inicio inválida (formato HH:MM)'),
  // ... más validaciones
];
```

## 🚨 Manejo de Errores

### Estructura de Respuesta de Error
```json
{
  "success": false,
  "message": "Mensaje de error descriptivo",
  "error": "TIPO_ERROR",
  "details": [
    {
      "field": "campo",
      "message": "Error específico del campo"
    }
  ]
}
```

### Códigos de Estado HTTP
- `200` - OK
- `201` - Creado
- `400` - Bad Request (datos inválidos)
- `401` - Unauthorized (no autenticado)
- `403` - Forbidden (no autorizado)
- `404` - Not Found
- `409` - Conflict (recurso duplicado)
- `422` - Unprocessable Entity
- `500` - Internal Server Error

## 📝 Logging

### Configuración de Logs
```javascript
const logger = require('./config/logger');

logger.info('Operación exitosa', { userId: user.id });
logger.error('Error en operación', { error: error.message });
logger.warn('Advertencia', { data: warningData });
```

### Niveles de Log
- **error**: Errores críticos
- **warn**: Advertencias
- **info**: Información general
- **debug**: Información de depuración

## 🔧 Scripts Disponibles

```bash
# Desarrollo
npm run dev              # Iniciar servidor en modo desarrollo
npm run lint             # Verificar código con ESLint
npm run lint:fix         # Corregir errores de ESLint
npm run format           # Formatear código con Prettier

# Testing
npm test                 # Ejecutar tests
npm run test:watch       # Tests en modo watch
npm run test:coverage    # Tests con cobertura
npm run test:ci          # Tests para CI/CD

# Documentación
npm run docs:generate    # Generar documentación Swagger
npm run docs:serve       # Servir documentación
```

## 🚀 Despliegue

### Variables de Entorno de Producción
```env
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb://production-db:27017/turnario
JWT_SECRET=secret-super-seguro-produccion
JWT_REFRESH_SECRET=refresh-secret-super-seguro-produccion
```

### Comandos de Despliegue
```bash
# Instalar dependencias de producción
npm ci --only=production

# Ejecutar tests
npm run test:ci

# Iniciar servidor
npm start
```

## 🤝 Contribución

1. Fork el proyecto
2. Crear una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir un Pull Request

### Guías de Contribución
- Seguir las convenciones de código establecidas
- Agregar tests para nuevas funcionalidades
- Actualizar documentación cuando sea necesario
- Verificar que todos los tests pasen antes del PR

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

## 🆘 Soporte

Para soporte técnico:
- Email: soporte@turnario.com
- Documentación: `/api-docs`
- Issues: GitHub Issues

## 🔄 Changelog

### v1.0.0
- ✅ Implementación completa del patrón MVC
- ✅ Sistema de autenticación JWT
- ✅ Validaciones robustas
- ✅ Testing unitario completo
- ✅ Documentación API con Swagger
- ✅ Sistema de logging centralizado
- ✅ Gestión de usuarios, servicios, reservas
- ✅ Sistema de notificaciones
- ✅ Sistema de reseñas y calificaciones
- ✅ Gestión de pagos
- ✅ Categorías jerárquicas

