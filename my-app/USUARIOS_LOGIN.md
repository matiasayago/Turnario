# 🔐 **Usuarios de Login para Turnario App**

## 👥 **Usuarios Predefinidos para Testing**

### 🏥 **Profesionales de la Salud**

#### **Dr. Carlos Mendoza - Pediatra**
- **Email:** `carlos.mendoza@turnario.com`
- **Contraseña:** `123456`
- **Tipo:** Profesional
- **Especialidad:** Pediatría
- **ID:** `prof_002`
- **Teléfono:** `+549115551234`

#### **Dr. Ana Martínez - Médica General**
- **Email:** `profesional@turnario.com`
- **Contraseña:** `123456`
- **Tipo:** Profesional
- **Especialidad:** Medicina General
- **ID:** `prof_001`
- **Teléfono:** `+5491187654321`

### 👤 **Clientes**

#### **Juan Pérez - Cliente**
- **Email:** `cliente@turnario.com`
- **Contraseña:** `123456`
- **Tipo:** Cliente
- **ID:** `cliente_001`
- **Teléfono:** `+5491112345678`

#### **Usuario Demo**
- **Email:** `demo@turnario.com`
- **Contraseña:** `123456`
- **Tipo:** Cliente
- **ID:** `demo_001`
- **Teléfono:** `+1234567890`

## 🚀 **Cómo Usar**

### **Para Profesionales:**
1. Usar `carlos.mendoza@turnario.com` o `profesional@turnario.com`
2. Contraseña: `123456`
3. Acceder al panel profesional
4. Ver notificaciones de solicitudes de citas
5. Confirmar o rechazar citas pendientes

### **Para Clientes:**
1. Usar `cliente@turnario.com` o `demo@turnario.com`
2. Contraseña: `123456`
3. Acceder al panel de cliente
4. Reservar citas con profesionales
5. Ver estado de citas (pendiente/confirmada)

## 📱 **Funcionalidades por Tipo de Usuario**

### **Profesionales:**
- ✅ Ver solicitudes de citas pendientes
- ✅ Confirmar o rechazar citas
- ✅ Gestionar horarios de disponibilidad
- ✅ Ver panel de pacientes
- ✅ Recibir notificaciones de nuevas solicitudes

### **Clientes:**
- ✅ Reservar nuevas citas
- ✅ Ver citas programadas
- ✅ Ver estado de citas (pendiente/confirmada)
- ✅ Seleccionar servicios y profesionales
- ✅ Agregar notas a las citas

## 🔄 **Flujo de Citas**

1. **Cliente solicita cita** → Estado: `Pendiente`
2. **Profesional recibe notificación**
3. **Profesional confirma o rechaza** → Estado: `Confirmada` o `Cancelada`
4. **Cliente ve el estado actualizado**

## 📋 **Notas Importantes**

- **Todas las contraseñas son:** `123456`
- **Los usuarios se crean automáticamente** al hacer login
- **Los datos se guardan en AsyncStorage** (persistencia local)
- **El sistema es de demostración** (no hay backend real)
- **Las citas se crean como pendientes** hasta confirmación del profesional

## 🧪 **Casos de Prueba Recomendados**

1. **Login como Cliente** → Reservar cita con Dr. Carlos Mendoza
2. **Login como Dr. Carlos Mendoza** → Ver notificación y confirmar cita
3. **Volver como Cliente** → Ver cita confirmada
4. **Probar rechazo de cita** → Ver estado cancelado

---

**Desarrollado para Turnario App** 🏥✨

