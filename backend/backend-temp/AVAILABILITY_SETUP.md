# Configuración de Disponibilidad de Profesionales

Este documento describe la configuración y uso del sistema de disponibilidad de profesionales en Turnario.

## 📋 Características

- **Gestión de Horarios**: Los profesionales pueden configurar sus horarios de trabajo
- **Disponibilidad por Días**: Configuración de días de la semana disponibles
- **Horarios Específicos**: Definición de horarios disponibles por día
- **Excepciones Especiales**: Fechas específicas con disponibilidad personalizada
- **Excepciones Recurrentes**: Patrones de excepción que se repiten
- **Sincronización**: Sincronización automática entre frontend y backend

## 🗄️ Base de Datos

### Modelo ProfessionalAvailability

```javascript
{
  professionalId: ObjectId, // Referencia al profesional
  professionalName: String,
  daysOfWeek: {
    monday: Boolean,
    tuesday: Boolean,
    wednesday: Boolean,
    thursday: Boolean,
    friday: Boolean,
    saturday: Boolean,
    sunday: Boolean
  },
  timeSlots: [String], // Array de horarios disponibles
  workingHours: {
    start: String, // Formato HH:MM
    end: String    // Formato HH:MM
  },
  breakTime: {
    start: String, // Formato HH:MM
    end: String    // Formato HH:MM
  },
  isActive: Boolean,
  timezone: String,
  specialDates: [{
    date: Date,
    isAvailable: Boolean,
    customTimeSlots: [String],
    reason: String
  }],
  recurringExceptions: [{
    dayOfWeek: Number, // 0-6 (domingo-sábado)
    startDate: Date,
    endDate: Date,
    isAvailable: Boolean,
    reason: String
  }]
}
```

## 🚀 Instalación y Configuración

### 1. Instalar Dependencias

```bash
cd backend
npm install
```

### 2. Configurar Variables de Entorno

```bash
# Copiar archivo de ejemplo
cp env.example .env

# Editar variables necesarias
# MONGODB_URI=mongodb://localhost:27017/turnario
# JWT_SECRET=tu_secret_aqui
```

### 3. Iniciar Base de Datos

```bash
# MongoDB local
mongod

# O usar MongoDB Atlas (configurar MONGODB_URI en .env)
```

### 4. Ejecutar Seed de Datos

```bash
# Ejecutar script de inicialización
node scripts/seed-availability.js
```

### 5. Iniciar Servidor

```bash
# Opción 1: Script de PowerShell (Windows)
.\start-availability.ps1

# Opción 2: Comando directo
node start-with-availability.js

# Opción 3: Servidor normal
npm start
```

## 📡 API Endpoints

### Disponibilidad de Profesionales

| Método | Endpoint | Descripción | Autenticación |
|--------|----------|-------------|---------------|
| GET | `/api/v1/availability/:professionalId` | Obtener disponibilidad | ✅ |
| POST | `/api/v1/availability/:professionalId` | Crear disponibilidad | ✅ |
| PUT | `/api/v1/availability/:professionalId` | Actualizar disponibilidad | ✅ |
| DELETE | `/api/v1/availability/:professionalId` | Eliminar disponibilidad | ✅ (Admin) |

### Verificación de Disponibilidad

| Método | Endpoint | Descripción | Autenticación |
|--------|----------|-------------|---------------|
| GET | `/api/v1/availability/:professionalId/check-date` | Verificar fecha | ❌ |
| GET | `/api/v1/availability/:professionalId/time-slots` | Obtener horarios | ❌ |
| GET | `/api/v1/availability/:professionalId/check-time-slot` | Verificar horario | ❌ |
| GET | `/api/v1/availability/professionals/available` | Profesionales disponibles | ❌ |

### Excepciones

| Método | Endpoint | Descripción | Autenticación |
|--------|----------|-------------|---------------|
| POST | `/api/v1/availability/:professionalId/special-date` | Agregar excepción especial | ✅ |
| POST | `/api/v1/availability/:professionalId/recurring-exception` | Agregar excepción recurrente | ✅ |

## 💻 Uso desde Frontend

### 1. Configurar Servicio

```typescript
import { availabilityService } from '../services/availabilityService';

// Obtener disponibilidad
const availability = await availabilityService.getAvailabilityByProfessional(professionalId);

// Verificar fecha
const isAvailable = await availabilityService.checkDateAvailability(professionalId, '2024-01-15');

// Obtener horarios
const timeSlots = await availabilityService.getAvailableTimeSlots(professionalId, '2024-01-15');
```

### 2. Sincronizar con Contexto

```typescript
import { useAvailability } from '../contexts/AvailabilityContext';

const { syncWithBackend, syncFromScheduleData } = useAvailability();

// Sincronizar desde backend
await syncWithBackend(professionalId);

// Sincronizar desde datos de horarios
await syncFromScheduleData(professionalId, scheduleData);
```

## 🔧 Configuración Avanzada

### Excepciones Especiales

```javascript
// Agregar excepción para una fecha específica
await availabilityService.addSpecialDate(professionalId, {
  date: '2024-12-25',
  isAvailable: false,
  reason: 'Navidad'
});

// Agregar horarios personalizados para una fecha
await availabilityService.addSpecialDate(professionalId, {
  date: '2024-12-24',
  isAvailable: true,
  customTimeSlots: ['09:00', '10:00', '11:00'],
  reason: 'Horario reducido'
});
```

### Excepciones Recurrentes

```javascript
// Agregar excepción recurrente (vacaciones)
await availabilityService.addRecurringException(professionalId, {
  dayOfWeek: 6, // Sábado
  startDate: '2024-12-01',
  endDate: '2024-12-31',
  isAvailable: false,
  reason: 'Vacaciones de verano'
});
```

## 🧪 Testing

### Probar Endpoints

```bash
# Health check
curl http://localhost:3000/api/v1/health

# Obtener disponibilidad
curl http://localhost:3000/api/v1/availability/PROFESSIONAL_ID

# Verificar fecha
curl "http://localhost:3000/api/v1/availability/PROFESSIONAL_ID/check-date?date=2024-01-15"

# Obtener horarios
curl "http://localhost:3000/api/v1/availability/PROFESSIONAL_ID/time-slots?date=2024-01-15"
```

### Datos de Prueba

El script `seed-availability.js` crea datos de ejemplo:

- **Dr. Carlos Mendoza**: Lun-Vie 9:00-18:00
- **Dra. María González**: Lun-Sáb 8:00-19:00
- **Lic. Juan Pérez**: Lun, Mar, Jue, Vie, Sáb 10:00-18:00

## 🐛 Troubleshooting

### Problemas Comunes

1. **Error de conexión a MongoDB**
   ```bash
   # Verificar que MongoDB esté ejecutándose
   mongosh --eval "db.runCommand('ping')"
   ```

2. **Error de validación de horarios**
   - Verificar formato HH:MM
   - Verificar que start < end

3. **Error de sincronización**
   - Verificar URL del backend en el frontend
   - Verificar autenticación

### Logs

Los logs se guardan en:
- `logs/app.log` - Logs generales
- `logs/error.log` - Errores
- `logs/availability.log` - Logs específicos de disponibilidad

## 📚 Documentación Adicional

- [API Documentation](http://localhost:3000/api/v1/docs)
- [Swagger UI](http://localhost:3000/api/v1/swagger)
- [Health Check](http://localhost:3000/api/v1/health)

## 🤝 Contribución

Para contribuir al sistema de disponibilidad:

1. Crear feature branch
2. Implementar cambios
3. Agregar tests
4. Actualizar documentación
5. Crear pull request

## 📞 Soporte

Para soporte técnico:
- Email: support@turnario.com
- Issues: GitHub Issues
- Documentación: `/api/v1/docs`
