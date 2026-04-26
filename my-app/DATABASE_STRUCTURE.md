# 🗄️ Estructura de la Base de Datos - TurnarioApp

## 📋 Resumen General

El proyecto TurnarioApp utiliza una arquitectura híbrida que combina:
- **Frontend**: React Native con Expo
- **Backend**: Node.js/Express (mock para desarrollo)
- **Almacenamiento Local**: AsyncStorage para datos offline
- **API REST**: Endpoints RESTful para comunicación

## 🏗️ Entidades Principales

### 1. 👤 **USUARIOS (Users)**

```typescript
interface User {
  _id: string;                    // ID único del usuario
  fullName: string;               // Nombre completo
  email: string;                  // Email (único)
  phone?: string;                 // Teléfono opcional
  userType: 'client' | 'professional' | 'admin';  // Tipo de usuario
  service?: string;               // Servicio (solo profesionales)
  isEmailVerified: boolean;       // Email verificado
  isActive: boolean;              // Usuario activo
  profileImage?: string;          // URL de imagen de perfil
  address?: {                     // Dirección opcional
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  preferences?: {                 // Preferencias del usuario
    language: string;
    timezone: string;
    notifications: {
      email: boolean;
      push: boolean;
      sms: boolean;
    };
  };
  createdAt: string;              // Fecha de creación
  updatedAt: string;              // Fecha de última actualización
}
```

**Relaciones:**
- Un usuario puede tener múltiples citas (como cliente o profesional)
- Un usuario puede tener múltiples reseñas
- Un usuario puede recibir múltiples notificaciones

---

### 2. 📅 **CITAS (Appointments)**

```typescript
interface Appointment {
  _id: string;                    // ID único de la cita
  clientId: string;               // ID del cliente
  professionalId: string;         // ID del profesional
  serviceId: string;              // ID del servicio
  clinicId?: string;              // ID de la clínica (opcional)
  date: string;                   // Fecha de la cita (ISO string)
  time: string;                   // Hora de la cita
  duration: number;               // Duración en minutos
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  notes?: string;                 // Notas generales
  clientNotes?: string;           // Notas del cliente
  professionalNotes?: string;     // Notas del profesional
  price: number;                  // Precio de la cita
  paymentStatus: 'pending' | 'paid' | 'refunded';  // Estado del pago
  createdAt: string;              // Fecha de creación
  updatedAt: string;              // Fecha de última actualización
  
  // Datos poblados (joins)
  client?: {
    _id: string;
    fullName: string;
    email: string;
    phone?: string;
  };
  professional?: {
    _id: string;
    fullName: string;
    email: string;
    phone?: string;
    specialties?: string[];
  };
  service?: {
    _id: string;
    name: string;
    description: string;
    duration: number;
    price: number;
  };
  clinic?: {
    _id: string;
    name: string;
    address: string;
    phone?: string;
  };
}
```

**Relaciones:**
- Pertenece a un cliente (User)
- Pertenece a un profesional (User)
- Usa un servicio específico (Service)
- Puede estar asociada a una clínica (Clinic)

---

### 3. 🏥 **SERVICIOS (Services)**

```typescript
interface Service {
  _id: string;                    // ID único del servicio
  name: string;                   // Nombre del servicio
  description: string;            // Descripción detallada
  category: string;               // Categoría principal
  subcategory?: string;           // Subcategoría opcional
  price: number;                  // Precio base
  currency: string;               // Moneda (por defecto ARS)
  duration: number;               // Duración en minutos
  isActive: boolean;              // Servicio activo
  requiresDeposit: boolean;       // Requiere depósito
  depositAmount?: number;         // Monto del depósito
  depositPercentage?: number;     // Porcentaje del depósito
  maxAdvanceBooking: number;      // Días máximos de anticipación
  cancellationPolicy: 'flexible' | 'moderate' | 'strict';
  cancellationHours: number;      // Horas para cancelación
  requirements?: string[];        // Requisitos previos
  contraindications?: string[];   // Contraindicaciones
  preparation?: string[];         // Instrucciones de preparación
  aftercare?: string[];           // Cuidados posteriores
  tags: string[];                 // Etiquetas para búsqueda
  createdAt: string;              // Fecha de creación
  updatedAt: string;              // Fecha de última actualización
}
```

**Relaciones:**
- Puede ser usado en múltiples citas
- Pertenece a una categoría específica

---

### 4. 🏥 **CLÍNICAS (Clinics)**

```typescript
interface Clinic {
  _id: string;                    // ID único de la clínica
  name: string;                   // Nombre de la clínica
  description?: string;           // Descripción opcional
  address: {                      // Dirección completa
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  phone: string;                  // Teléfono principal
  email?: string;                 // Email opcional
  website?: string;               // Sitio web opcional
  type: 'hospital' | 'clinic' | 'medical_center' | 'specialized_center';
  specialties: string[];          // Especialidades médicas
  services: string[];             // Servicios ofrecidos
  operatingHours: {               // Horarios de atención
    monday: { open: string; close: string; closed: boolean };
    tuesday: { open: string; close: string; closed: boolean };
    wednesday: { open: string; close: string; closed: boolean };
    thursday: { open: string; close: string; closed: boolean };
    friday: { open: string; close: string; closed: boolean };
    saturday: { open: string; close: string; closed: boolean };
    sunday: { open: string; close: string; closed: boolean };
  };
  amenities: string[];            // Comodidades disponibles
  insurance: string[];            // Seguros aceptados
  isActive: boolean;              // Clínica activa
  createdAt: string;              // Fecha de creación
  updatedAt: string;              // Fecha de última actualización
}
```

**Relaciones:**
- Puede albergar múltiples citas
- Puede tener múltiples especialidades

---

### 5. 🔔 **NOTIFICACIONES (Notifications)**

```typescript
interface NotificationItem {
  id: string;                     // ID único de la notificación
  type: 'appointment_request' | 'appointment_confirmed' | 'appointment_cancelled' | 
        'reminder' | 'payment_required' | 'payment_successful';
  title: string;                  // Título de la notificación
  message: string;                // Mensaje de la notificación
  recipientId: string;            // ID del destinatario
  senderId: string;               // ID del remitente
  senderName: string;             // Nombre del remitente
  appointmentData?: {             // Datos de la cita (si aplica)
    service: string;
    date: string;
    time: string;
    notes?: string;
    professional?: string;
    professionalId?: string;
    depositAmount?: number;
    totalAmount?: number;
  };
  timestamp: Date;                // Fecha y hora de la notificación
  read: boolean;                  // Estado de lectura
}
```

**Relaciones:**
- Pertenece a un usuario (recipientId)
- Puede estar relacionada con una cita

---

### 6. ⭐ **RESEÑAS (Reviews)**

```typescript
interface Review {
  id: string;                     // ID único de la reseña
  userId: string;                 // ID del usuario que reseña
  userName: string;               // Nombre del usuario
  userType: 'client' | 'professional';  // Tipo de usuario
  targetId: string;               // ID del objetivo (profesional, servicio, clínica)
  targetType: 'professional' | 'service' | 'clinic';  // Tipo de objetivo
  rating: number;                 // Calificación 1-5 estrellas
  comment: string;                // Comentario de la reseña
  createdAt: Date;                // Fecha de creación
  updatedAt: Date;                // Fecha de última actualización
  isVerified: boolean;            // Reseña verificada
  helpfulCount: number;           // Número de "me gusta" útiles
  reportCount: number;            // Número de reportes
  isActive: boolean;              // Reseña activa
}
```

**Relaciones:**
- Pertenece a un usuario (userId)
- Está dirigida a un objetivo específico (targetId)

---

### 7. 📅 **DISPONIBILIDAD (Availability)**

```typescript
interface ProfessionalAvailability {
  id: string;                     // ID único de la disponibilidad
  professionalId: string;         // ID del profesional
  professionalName: string;       // Nombre del profesional
  daysOfWeek: {                   // Días de la semana disponibles
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
    saturday: boolean;
    sunday: boolean;
  };
  timeSlots: string[];            // Horarios disponibles
  workingHours: {                 // Horario de trabajo
    start: string;
    end: string;
  };
  breakTime?: {                   // Tiempo de descanso opcional
    start: string;
    end: string;
  };
  isActive: boolean;              // Disponibilidad activa
  blockedTimeSlots?: BlockedTimeSlot[];  // Horarios bloqueados
  createdAt: string;              // Fecha de creación
  updatedAt: string;              // Fecha de última actualización
}

interface BlockedTimeSlot {
  timeSlot: string;               // Horario bloqueado
  appointmentId: string;          // ID de la cita asociada
  reason: string;                 // Razón del bloqueo
  createdAt: string;              // Fecha de creación
}
```

**Relaciones:**
- Pertenece a un profesional específico
- Puede tener múltiples horarios bloqueados

---

## 🔗 Relaciones entre Entidades

### Diagrama de Relaciones:

```
USUARIOS (Users)
├── 1:N → CITAS (como cliente)
├── 1:N → CITAS (como profesional)
├── 1:N → NOTIFICACIONES
├── 1:N → RESEÑAS
└── 1:1 → DISPONIBILIDAD (solo profesionales)

CITAS (Appointments)
├── N:1 → USUARIOS (cliente)
├── N:1 → USUARIOS (profesional)
├── N:1 → SERVICIOS
├── N:1 → CLÍNICAS
└── 1:N → NOTIFICACIONES

SERVICIOS (Services)
└── 1:N → CITAS

CLÍNICAS (Clinics)
└── 1:N → CITAS

RESEÑAS (Reviews)
├── N:1 → USUARIOS
└── N:1 → USUARIOS/SERVICIOS/CLÍNICAS (objetivo)
```

## 🛠️ Configuración de la Base de Datos

### Variables de Entorno:
```bash
# Backend
EXPO_PUBLIC_BACKEND_URL=http://localhost:3001
EXPO_PUBLIC_WEBSOCKET_URL=ws://localhost:3001

# Base de Datos (configuración del backend)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=turnario_db
DB_USER=turnario_user
DB_PASSWORD=your_password

# Autenticación
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=24h
REFRESH_TOKEN_EXPIRES_IN=7d
```

### Endpoints de la API:

```typescript
// Autenticación
POST /api/v1/auth/login
POST /api/v1/auth/register
POST /api/v1/auth/logout
POST /api/v1/auth/refresh

// Usuarios
GET /api/v1/users
GET /api/v1/users/profile/me
PUT /api/v1/users/profile/me
GET /api/v1/users/stats/overview

// Citas
GET /api/v1/appointments
POST /api/v1/appointments
PUT /api/v1/appointments/:id
DELETE /api/v1/appointments/:id
GET /api/v1/appointments/available-slots
POST /api/v1/appointments/:id/confirm
POST /api/v1/appointments/:id/reject

// Servicios
GET /api/v1/services
POST /api/v1/services
GET /api/v1/services/categories/list
GET /api/v1/services/search/advanced

// Clínicas
GET /api/v1/clinics
POST /api/v1/clinics
GET /api/v1/clinics/search/advanced
GET /api/v1/clinics/nearby

// Notificaciones
GET /api/v1/notifications
PUT /api/v1/notifications/:id/read
DELETE /api/v1/notifications/:id
```

## 📱 Almacenamiento Local (AsyncStorage)

### Claves de Almacenamiento:
```typescript
// Autenticación
'auth_token'           // Token JWT
'refresh_token'        // Token de renovación
'user_data'           // Datos del usuario

// Datos de la aplicación
'professional_availabilities'  // Disponibilidades
'appointments_cache'          // Caché de citas
'notifications_cache'         // Caché de notificaciones
'reviews_cache'              // Caché de reseñas
'services_cache'             // Caché de servicios
'clinics_cache'              // Caché de clínicas

// Configuración
'app_settings'               // Configuración de la app
'user_preferences'           // Preferencias del usuario
```

## 🔄 Flujo de Datos

1. **Autenticación**: Usuario se autentica → JWT almacenado localmente
2. **Sincronización**: Datos se sincronizan con el backend
3. **Caché Local**: Datos críticos se almacenan en AsyncStorage
4. **Offline**: App funciona con datos en caché cuando no hay conexión
5. **Actualizaciones**: Datos se actualizan en tiempo real vía WebSockets

## 📊 Índices Recomendados

```sql
-- Usuarios
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_user_type ON users(user_type);
CREATE INDEX idx_users_active ON users(is_active);

-- Citas
CREATE INDEX idx_appointments_client ON appointments(client_id);
CREATE INDEX idx_appointments_professional ON appointments(professional_id);
CREATE INDEX idx_appointments_date ON appointments(date);
CREATE INDEX idx_appointments_status ON appointments(status);

-- Notificaciones
CREATE INDEX idx_notifications_recipient ON notifications(recipient_id);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_timestamp ON notifications(timestamp);

-- Reseñas
CREATE INDEX idx_reviews_target ON reviews(target_id, target_type);
CREATE INDEX idx_reviews_user ON reviews(user_id);
CREATE INDEX idx_reviews_active ON reviews(is_active);
```

---

**Última actualización**: Diciembre 2024
**Versión del esquema**: 1.0.0
