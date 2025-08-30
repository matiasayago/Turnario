# 🏥 Backend Turnario - API REST

Backend completo para la aplicación Turnario, sistema de gestión de citas médicas desarrollado con Node.js, Express y MongoDB.

## 🚀 Características

- **Autenticación JWT** con roles de usuario (cliente, profesional, admin)
- **API RESTful** completa para gestión de citas, usuarios y clínicas
- **Base de datos MongoDB** con Mongoose para modelado de datos
- **Validación de datos** con express-validator
- **Middleware de seguridad** (CORS, Helmet, Rate Limiting)
- **Manejo de errores** centralizado
- **Logging** y monitoreo
- **Soporte para Google OAuth**
- **Sistema de notificaciones**
- **Gestión de archivos** y multimedia

## 🛠️ Tecnologías

- **Node.js** - Runtime de JavaScript
- **Express.js** - Framework web
- **MongoDB** - Base de datos NoSQL
- **Mongoose** - ODM para MongoDB
- **JWT** - Autenticación stateless
- **bcryptjs** - Encriptación de contraseñas
- **express-validator** - Validación de datos
- **multer** - Manejo de archivos
- **nodemailer** - Envío de emails
- **helmet** - Seguridad HTTP
- **cors** - Cross-Origin Resource Sharing

## 📁 Estructura del Proyecto

```
backend/
├── src/
│   ├── models/           # Modelos de Mongoose
│   │   ├── User.js       # Modelo de Usuario
│   │   ├── Appointment.js # Modelo de Cita
│   │   ├── Service.js    # Modelo de Servicio
│   │   └── Clinic.js     # Modelo de Clínica
│   ├── routes/           # Rutas de la API
│   │   ├── auth.js       # Autenticación
│   │   ├── users.js      # Gestión de usuarios
│   │   ├── appointments.js # Gestión de citas
│   │   └── ...
│   ├── middleware/       # Middleware personalizado
│   │   ├── auth.js       # Autenticación JWT
│   │   ├── errorHandler.js # Manejo de errores
│   │   └── notFound.js   # Rutas no encontradas
│   ├── database/         # Configuración de BD
│   │   └── connection.js # Conexión MongoDB
│   └── server.js         # Servidor principal
├── package.json          # Dependencias y scripts
├── env.example           # Variables de entorno
└── README.md            # Documentación
```

## 🚀 Instalación

### Prerrequisitos

- Node.js >= 18.0.0
- MongoDB >= 5.0
- npm o yarn

### Pasos de Instalación

1. **Clonar el repositorio**
   ```bash
   git clone <repository-url>
   cd backend
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**
   ```bash
   cp env.example .env
   # Editar .env con tus configuraciones
   ```

4. **Configurar MongoDB**
   - Asegúrate de que MongoDB esté ejecutándose
   - Crea una base de datos llamada `turnario`
   - O configura la URI de MongoDB Atlas en `.env`

5. **Ejecutar el servidor**
   ```bash
   # Desarrollo
   npm run dev
   
   # Producción
   npm start
   ```

## ⚙️ Configuración

### Variables de Entorno

```env
# Servidor
PORT=3001
NODE_ENV=development

# Base de Datos
MONGODB_URI=mongodb://localhost:27017/turnario
MONGODB_URI_PROD=mongodb+srv://username:password@cluster.mongodb.net/turnario

# JWT
JWT_SECRET=tu_jwt_secret_super_seguro_aqui
JWT_EXPIRES_IN=7d

# Google OAuth
GOOGLE_CLIENT_ID=tu_google_client_id
GOOGLE_CLIENT_SECRET=tu_google_client_secret

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=tu_email@gmail.com
EMAIL_PASS=tu_app_password
EMAIL_FROM=noreply@turnario.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS
CORS_ORIGIN=http://localhost:3000,http://localhost:8081
```

## 📚 API Endpoints

### Autenticación

| Método | Endpoint | Descripción | Acceso |
|--------|----------|-------------|---------|
| POST | `/api/auth/register` | Registrar usuario | Público |
| POST | `/api/auth/login` | Iniciar sesión | Público |
| POST | `/api/auth/google` | Login con Google | Público |
| POST | `/api/auth/logout` | Cerrar sesión | Privado |
| GET | `/api/auth/me` | Obtener perfil | Privado |
| PUT | `/api/auth/me` | Actualizar perfil | Privado |
| POST | `/api/auth/change-password` | Cambiar contraseña | Privado |
| POST | `/api/auth/forgot-password` | Recuperar contraseña | Público |

### Usuarios

| Método | Endpoint | Descripción | Acceso |
|--------|----------|-------------|---------|
| GET | `/api/users` | Listar usuarios | Admin |
| GET | `/api/users/:id` | Obtener usuario | Privado |
| PUT | `/api/users/:id` | Actualizar usuario | Privado/Admin |
| DELETE | `/api/users/:id` | Eliminar usuario | Admin |

### Citas

| Método | Endpoint | Descripción | Acceso |
|--------|----------|-------------|---------|
| GET | `/api/appointments` | Listar citas | Privado |
| POST | `/api/appointments` | Crear cita | Cliente |
| GET | `/api/appointments/:id` | Obtener cita | Privado |
| PUT | `/api/appointments/:id` | Actualizar cita | Privado |
| DELETE | `/api/appointments/:id` | Cancelar cita | Privado |
| POST | `/api/appointments/:id/confirm` | Confirmar cita | Profesional |
| POST | `/api/appointments/:id/complete` | Completar cita | Profesional |

### Servicios

| Método | Endpoint | Descripción | Acceso |
|--------|----------|-------------|---------|
| GET | `/api/services` | Listar servicios | Público |
| POST | `/api/services` | Crear servicio | Profesional |
| GET | `/api/services/:id` | Obtener servicio | Público |
| PUT | `/api/services/:id` | Actualizar servicio | Profesional |
| DELETE | `/api/services/:id` | Eliminar servicio | Profesional |

### Clínicas

| Método | Endpoint | Descripción | Acceso |
|--------|----------|-------------|---------|
| GET | `/api/clinics` | Listar clínicas | Público |
| POST | `/api/clinics` | Crear clínica | Profesional |
| GET | `/api/clinics/:id` | Obtener clínica | Público |
| PUT | `/api/clinics/:id` | Actualizar clínica | Profesional |
| DELETE | `/api/clinics/:id` | Eliminar clínica | Profesional |

## 🔐 Autenticación

### JWT Token

Para acceder a endpoints privados, incluye el token JWT en el header:

```
Authorization: Bearer <tu_token_jwt>
```

### Roles de Usuario

- **client**: Usuarios que reservan citas
- **professional**: Profesionales de la salud
- **admin**: Administradores del sistema

## 📊 Modelos de Datos

### Usuario (User)

```javascript
{
  email: String,           // Email único
  password: String,        // Contraseña encriptada
  fullName: String,        // Nombre completo
  userType: String,        // 'client', 'professional', 'admin'
  phone: String,           // Teléfono
  dateOfBirth: Date,       // Fecha de nacimiento
  address: Object,         // Dirección completa
  medicalHistory: Object,  // Historial médico (clientes)
  professionalInfo: Object, // Información profesional
  isActive: Boolean,       // Estado de la cuenta
  preferences: Object      // Preferencias del usuario
}
```

### Cita (Appointment)

```javascript
{
  client: ObjectId,        // Referencia al cliente
  professional: ObjectId,  // Referencia al profesional
  service: ObjectId,       // Referencia al servicio
  clinic: ObjectId,        // Referencia a la clínica
  date: Date,             // Fecha de la cita
  startTime: String,      // Hora de inicio
  endTime: String,        // Hora de fin
  duration: Number,       // Duración en minutos
  status: String,         // 'pending', 'confirmed', 'completed', 'cancelled'
  notes: Object,          // Notas de la cita
  billing: Object,        // Información de facturación
  rating: Object          // Calificación y reseña
}
```

### Servicio (Service)

```javascript
{
  name: String,            // Nombre del servicio
  description: String,     // Descripción
  category: String,        // Categoría médica
  duration: Number,        // Duración en minutos
  price: Object,          // Precio y moneda
  requirements: Object,    // Requisitos del servicio
  availableHours: Object,  // Horarios disponibles
  isActive: Boolean       // Estado del servicio
}
```

### Clínica (Clinic)

```javascript
{
  name: String,            // Nombre de la clínica
  description: String,     // Descripción
  contact: Object,         // Información de contacto
  address: Object,         // Dirección completa
  type: String,           // Tipo de clínica
  specialties: [String],   // Especialidades
  operatingHours: Object,  // Horarios de operación
  services: [Object],      // Servicios disponibles
  professionals: [Object], // Profesionales asignados
  facilities: Object       // Instalaciones
}
```

## 🚀 Scripts Disponibles

```bash
# Desarrollo
npm run dev          # Servidor con nodemon

# Producción
npm start           # Servidor de producción

# Testing
npm test           # Ejecutar tests

# Linting
npm run lint       # Verificar código

# Migraciones
npm run migrate    # Ejecutar migraciones
```

## 🔒 Seguridad

- **JWT** para autenticación stateless
- **bcryptjs** para encriptación de contraseñas
- **Helmet** para headers de seguridad HTTP
- **CORS** configurado para orígenes permitidos
- **Rate Limiting** para prevenir ataques DDoS
- **Validación de datos** con express-validator
- **Sanitización** de inputs

## 📝 Logging

El sistema incluye logging completo para:

- Requests HTTP
- Errores de la aplicación
- Autenticación de usuarios
- Operaciones de base de datos
- Rutas no encontradas

## 🧪 Testing

```bash
# Ejecutar todos los tests
npm test

# Tests en modo watch
npm run test:watch

# Tests de cobertura
npm run test:coverage
```

## 🚀 Despliegue

### Producción

1. **Configurar variables de entorno**
   ```bash
   NODE_ENV=production
   MONGODB_URI_PROD=tu_uri_de_produccion
   JWT_SECRET=secret_super_seguro
   ```

2. **Instalar dependencias de producción**
   ```bash
   npm ci --only=production
   ```

3. **Ejecutar el servidor**
   ```bash
   npm start
   ```

### Docker (Opcional)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

## 🆘 Soporte

Si tienes alguna pregunta o necesitas ayuda:

- 📧 Email: soporte@turnario.com
- 📱 WhatsApp: +54 9 11 1234-5678
- 🐛 Issues: [GitHub Issues](https://github.com/turnario/backend/issues)

## 🔄 Changelog

### v1.0.0 (2024-01-XX)
- ✅ Sistema de autenticación JWT
- ✅ Modelos de datos completos
- ✅ API REST para todas las entidades
- ✅ Middleware de seguridad
- ✅ Validación de datos
- ✅ Manejo de errores centralizado
- ✅ Soporte para Google OAuth
- ✅ Sistema de roles y permisos

---

**Desarrollado con ❤️ por el equipo Turnario**

