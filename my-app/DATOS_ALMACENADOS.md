# 📊 Datos Almacenados en la Base de Datos - TurnarioApp

## 🗄️ Resumen de Almacenamiento

El proyecto TurnarioApp utiliza **AsyncStorage** para el almacenamiento local y datos **mock** para desarrollo. Los datos se organizan en las siguientes categorías:

---

## 👥 **USUARIOS (Users)**

### **Usuarios Mock Disponibles:**

#### **Profesionales:**
```json
{
  "_id": "1",
  "email": "dr.carlos.mendoza@turnario.com",
  "fullName": "Dr. Carlos Mendoza",
  "userType": "professional",
  "phone": "+54 11 1234-5678",
  "service": "Medicina General",
  "isActive": true,
  "isEmailVerified": true,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}

{
  "_id": "2",
  "email": "profesional@turnario.com",
  "fullName": "Dr. Ana Martínez",
  "userType": "professional",
  "phone": "+54 11 9876-5432",
  "service": "Medicina General",
  "isActive": true,
  "isEmailVerified": true,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}

{
  "_id": "3",
  "email": "carlos.mendoza@turnario.com",
  "fullName": "Dr. Carlos Mendoza",
  "userType": "professional",
  "phone": "+549115551234",
  "service": "Pediatría",
  "isActive": true,
  "isEmailVerified": true,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}

{
  "_id": "4",
  "email": "dra.ana.martinez@turnario.com",
  "fullName": "Dra. Ana Martínez",
  "userType": "professional",
  "phone": "+54 11 2345-6789",
  "service": "Psicología Clínica",
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

#### **Clientes:**
```json
{
  "_id": "4",
  "email": "ana.martinez@turnario.com",
  "fullName": "Ana Martínez",
  "userType": "client",
  "phone": "+54 11 9876-5432",
  "isActive": true,
  "isEmailVerified": true,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}

{
  "_id": "5",
  "email": "ana.martinez@email.com",
  "fullName": "Ana Martínez",
  "userType": "client",
  "phone": "+54 11 9876-5432",
  "isActive": true,
  "isEmailVerified": true,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}

{
  "_id": "6",
  "email": "maria.gonzalez@email.com",
  "fullName": "María González",
  "userType": "client",
  "phone": "+54 11 3456-7890",
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}

{
  "_id": "7",
  "email": "carlos.rodriguez@email.com",
  "fullName": "Carlos Rodríguez",
  "userType": "client",
  "phone": "+54 11 4567-8901",
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### **Usuarios de Ejemplo Adicionales:**
```json
{
  "id": "client_1",
  "name": "Ana Martínez",
  "email": "ana.martinez@email.com",
  "phone": "+1234567890",
  "userType": "client"
}

{
  "id": "client_2",
  "name": "Luis Rodríguez",
  "email": "luis.rodriguez@email.com",
  "phone": "+1234567891",
  "userType": "client"
}

{
  "id": "client_3",
  "name": "María González",
  "email": "maria.gonzalez@email.com",
  "phone": "+1234567892",
  "userType": "client"
}

{
  "id": "client_4",
  "name": "Carlos López",
  "email": "carlos.lopez@email.com",
  "phone": "+1234567893",
  "userType": "client"
}

{
  "id": "client_5",
  "name": "Sofia Torres",
  "email": "sofia.torres@email.com",
  "phone": "+1234567894",
  "userType": "client"
}
```

---

## 📅 **CITAS (Appointments)**

### **Citas de Prueba:**
```json
{
  "id": "test_appointment_1",
  "service": "Consulta General",
  "professional": "Dr. Carlos Mendoza",
  "professionalId": "test_professional_1",
  "date": "2024-01-15",
  "time": "10:00",
  "notes": "Cita de prueba",
  "status": "pending",
  "clientId": "test_client_1",
  "clientName": "Cliente de Prueba",
  "createdAt": "2024-01-01T00:00:00.000Z"
}

{
  "id": "test_appointment_2",
  "service": "Terapia Cognitivo-Conductual",
  "professional": "Dra. Ana Martínez",
  "professionalId": "test_professional_2",
  "date": "2024-01-16",
  "time": "14:30",
  "notes": "Seguimiento semanal",
  "status": "confirmed",
  "clientId": "test_client_2",
  "clientName": "María González",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

---

## 🔔 **NOTIFICACIONES (Notifications)**

### **Notificaciones Mock:**
```json
{
  "_id": "1",
  "type": "appointment_reminder",
  "title": "Recordatorio de Cita",
  "message": "Tienes una cita programada para mañana a las 10:00 AM",
  "recipientId": "2",
  "data": {
    "service": "Medicina General",
    "date": "2024-01-15",
    "time": "10:00",
    "professional": "Dr. Carlos Mendoza",
    "appointmentId": "apt_1"
  },
  "isRead": false,
  "priority": "medium",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}

{
  "_id": "2",
  "type": "appointment_confirmed",
  "title": "Cita Confirmada",
  "message": "Tu cita ha sido confirmada exitosamente",
  "recipientId": "2",
  "data": {
    "service": "Medicina General",
    "date": "2024-01-15",
    "time": "10:00",
    "professional": "Dr. Carlos Mendoza",
    "appointmentId": "apt_1"
  },
  "isRead": true,
  "priority": "high",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}

{
  "_id": "3",
  "type": "system_update",
  "title": "Bienvenido a Turnario",
  "message": "Gracias por usar nuestra aplicación de gestión de citas",
  "recipientId": "2",
  "data": {},
  "isRead": false,
  "priority": "low",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

---

## ⭐ **RESEÑAS (Reviews)**

### **Reseñas Mock:**
```json
{
  "id": "rev1",
  "userId": "client1",
  "userName": "María González",
  "userType": "client",
  "targetId": "1",
  "targetType": "professional",
  "rating": 5,
  "comment": "Excelente profesional, muy atenta y dedicada. Recomiendo totalmente.",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z",
  "isVerified": true,
  "helpfulCount": 3,
  "reportCount": 0,
  "isActive": true
}

{
  "id": "rev2",
  "userId": "client2",
  "userName": "Carlos López",
  "userType": "client",
  "targetId": "1",
  "targetType": "professional",
  "rating": 4,
  "comment": "Muy buena atención, profesional y puntual. Solo le faltó un poco más de explicación.",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z",
  "isVerified": true,
  "helpfulCount": 1,
  "reportCount": 0,
  "isActive": true
}
```

---

## 🏥 **PROFESIONALES DISPONIBLES**

### **Lista de Profesionales:**
```json
{
  "id": "1",
  "name": "Dr. Carlos Mendoza",
  "specialty": "Psicología y Salud Mental",
  "services": ["Consulta Psicológica", "Terapia Cognitivo-Conductual", "Terapia Familiar", "Psicología Infantil"],
  "rating": 4.8,
  "reviews": 124,
  "price": 5000,
  "duration": 50,
  "image": "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=150&h=150&fit=crop&crop=face",
  "isAvailable": true
}

{
  "id": "2",
  "name": "Dra. María González",
  "specialty": "Medicina General",
  "services": ["Consulta General", "Control de Presión", "Vacunación", "Chequeo Médico"],
  "rating": 4.9,
  "reviews": 89,
  "price": 4500,
  "duration": 30,
  "image": "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&h=150&fit=crop&crop=face",
  "isAvailable": true
}

{
  "id": "3",
  "name": "Dr. Juan Pérez",
  "specialty": "Cardiología",
  "services": ["Consulta Cardiológica", "Electrocardiograma", "Ecocardiograma", "Holter"],
  "rating": 4.7,
  "reviews": 156,
  "price": 8000,
  "duration": 60,
  "image": "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=150&h=150&fit=crop&crop=face",
  "isAvailable": true
}

{
  "id": "4",
  "name": "Dra. Ana Rodríguez",
  "specialty": "Dermatología",
  "services": ["Consulta Dermatológica", "Biopsia de Piel", "Tratamiento Acné", "Revisión Lunares"],
  "rating": 4.6,
  "reviews": 78,
  "price": 6000,
  "duration": 40,
  "image": "https://images.unsplash.com/photo-1594824388852-9a1a3b8b4d8c?w=150&h=150&fit=crop&crop=face",
  "isAvailable": true
}
```

---

## 🏥 **SERVICIOS MÉDICOS**

### **Categorías de Servicios Disponibles:**

#### **Psicología y Salud Mental (12 servicios):**
- Consulta Psicológica
- Terapia Cognitivo-Conductual
- Terapia Psicoanalítica
- Terapia Familiar
- Terapia de Pareja
- Psicología Infantil
- Psicología Adolescente
- Psicología del Deporte
- Psicología Laboral
- Terapia de Grupo
- Evaluación Psicológica
- Intervención en Crisis

#### **Medicina General y Especialidades (17 servicios):**
- Consulta Médica General
- Consulta de Pediatría
- Consulta de Geriatría
- Consulta de Ginecología
- Consulta de Cardiología
- Consulta de Dermatología
- Consulta de Endocrinología
- Consulta de Gastroenterología
- Consulta de Neurología
- Consulta de Oftalmología
- Consulta de Otorrinolaringología
- Consulta de Traumatología
- Consulta de Urología
- Consulta de Oncología
- Consulta de Reumatología
- Consulta de Neumología

#### **Fisioterapia y Rehabilitación (16 servicios):**
- Fisioterapia General
- Fisioterapia Deportiva
- Fisioterapia Neurológica
- Fisioterapia Respiratoria
- Fisioterapia Pediátrica
- Fisioterapia Geriátrica
- Rehabilitación Post-Quirúrgica
- Rehabilitación Neurológica
- Rehabilitación Cardíaca
- Rehabilitación Pulmonar
- Terapia Manual
- Punción Seca
- Electroterapia
- Hidroterapia
- Crioterapia
- Termoterapia

#### **Otras Categorías:**
- **Terapia Ocupacional** (9 servicios)
- **Terapia del Lenguaje** (9 servicios)
- **Nutrición** (12 servicios)
- **Psicopedagogía** (9 servicios)
- **Odontología** (12 servicios)
- **Enfermería** (9 servicios)
- **Terapias Alternativas** (10 servicios)
- **Entrenamiento Personal** (11 servicios)
- **Masajes** (10 servicios)

**Total de Servicios Disponibles: 163 servicios médicos**

---

## 📱 **Almacenamiento en AsyncStorage**

### **Claves de Almacenamiento Local:**
```typescript
// Autenticación
'auth_token'                    // Token JWT del usuario
'refresh_token'                // Token de renovación
'user_data'                   // Datos del usuario autenticado

// Datos de la aplicación
'professional_availabilities'  // Disponibilidades de profesionales
'appointments_cache'          // Caché de citas
'notifications_cache'         // Caché de notificaciones
'reviews_cache'              // Caché de reseñas
'services_cache'             // Caché de servicios
'clinics_cache'              // Caché de clínicas
'users'                      // Lista de usuarios

// Configuración
'app_settings'               // Configuración de la aplicación
'user_preferences'           // Preferencias del usuario
```

---

## 🔄 **Estado Actual de los Datos**

### **Datos Activos:**
- ✅ **7 Usuarios** (4 profesionales, 3 clientes)
- ✅ **163 Servicios Médicos** organizados en 12 categorías
- ✅ **4 Profesionales** con disponibilidad configurada
- ✅ **3 Notificaciones** de ejemplo
- ✅ **2 Reseñas** de ejemplo
- ✅ **2 Citas** de prueba

### **Funcionalidades Disponibles:**
- 🔐 **Sistema de Autenticación** completo
- 📅 **Gestión de Citas** con estados
- 🔔 **Sistema de Notificaciones** en tiempo real
- ⭐ **Sistema de Reseñas** y calificaciones
- 🏥 **Gestión de Disponibilidad** de profesionales
- 💳 **Integración con MercadoPago** para pagos
- 💬 **Sistema de Chat** entre usuarios

### **Datos de Prueba para Login:**
```bash
# Profesionales
Email: dr.carlos.mendoza@turnario.com
Email: profesional@turnario.com
Email: carlos.mendoza@turnario.com

# Clientes
Email: ana.martinez@turnario.com
Email: ana.martinez@email.com
Email: maria.gonzalez@email.com
Email: carlos.rodriguez@email.com

# Contraseña para todos los usuarios de prueba
Password: 123456
```

---

**Última actualización**: Diciembre 2024
**Total de registros**: 180+ entradas de datos
