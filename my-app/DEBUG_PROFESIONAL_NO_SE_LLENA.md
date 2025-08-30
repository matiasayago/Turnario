# 🐛 Debug: Campo "Profesional" No Se Pre-llena

## 🎯 Problema Identificado
El campo "Profesional" en el formulario de "Reservar Cita con Seña" no se está pre-llenando automáticamente cuando Ana Martínez toca la notificación de pago de seña.

## 🔍 Análisis del Flujo de Datos

### **1. Datos que se Envían en la Notificación:**
```typescript
// En sendClientPaymentNotification (settings.tsx:730)
appointmentData: {
  service: appointment.service,
  date: appointment.date,
  time: appointment.time,
  notes: `Seña requerida: $${appointment.depositAmount}`,
  professional: appointment.professional,        // ← ESTE CAMPO DEBE LLEGAR
  professionalId: appointment.professionalId,
  depositAmount: appointment.depositAmount,
  totalAmount: appointment.totalAmount,
}
```

### **2. Datos que se Reciben en Notificaciones:**
```typescript
// En handleNotificationPress (notifications.tsx:90)
const appointmentData = notification.appointmentData;
console.log('📋 Datos de la cita extraídos:', appointmentData);
// Se pasa a: openReservaConSenaModal(appointmentData);
```

### **3. Datos que Llegan al Contexto:**
```typescript
// En ReservaConSenaContext (ReservaConSenaContext.tsx:35)
const openReservaConSenaModal = (data?: any) => {
  if (data) {
    console.log('📋 Datos de cita recibidos para pre-llenar:', data);
    setAppointmentData(data);
  }
  setShouldOpenReservaConSenaModal(true);
};
```

### **4. Datos que se Usan para Pre-llenar:**
```typescript
// En useEffect de settings.tsx (línea ~400)
if (appointmentData) {
  console.log('📝 Pre-llenando formulario con datos de la cita:', appointmentData);
  console.log('🔍 Campo professional disponible:', appointmentData.professional);
  console.log('🔍 Campo professionalName se establecerá como:', appointmentData.professional);
  
  setClientBookingData(prev => {
    const newData = {
      ...prev,
      service: appointmentData.service || '',
      professionalName: appointmentData.professional || '', // ← AQUÍ SE MAPEA
      date: appointmentData.date || '',
      time: appointmentData.time || '',
      notes: appointmentData.notes || '',
    };
    console.log('📝 Nuevos datos del formulario:', newData);
    return newData;
  });
}
```

## 🧪 Pasos para Debuggear

### **Paso 1: Verificar Datos en la Notificación**
1. **Login como Dr. Carlos Mendoza**
2. **Crear cita** con datos específicos
3. **Verificar console logs:**
   ```
   📱 Enviando notificación de pago al cliente: Ana Martínez
   ✅ Notificación de pago enviada exitosamente al cliente: cliente_002
   ```

### **Paso 2: Verificar Datos Extraídos**
1. **Login como Ana Martínez**
2. **Ir a "Notificaciones"**
3. **Tocar la notificación de pago**
4. **Verificar console logs:**
   ```
   📋 Datos de la cita extraídos: {service: "Cardiología", professional: "Dr. Carlos Mendoza", ...}
   ```

### **Paso 3: Verificar Datos en el Contexto**
1. **Verificar console logs:**
   ```
   📋 Datos de cita recibidos para pre-llenar: {service: "Cardiología", professional: "Dr. Carlos Mendoza", ...}
   ```

### **Paso 4: Verificar Pre-llenado del Formulario**
1. **Verificar console logs:**
   ```
   📝 Pre-llenando formulario con datos de la cita: {service: "Cardiología", professional: "Dr. Carlos Mendoza", ...}
   🔍 Campo professional disponible: Dr. Carlos Mendoza
   🔍 Campo professionalName se establecerá como: Dr. Carlos Mendoza
   📝 Nuevos datos del formulario: {professionalName: "Dr. Carlos Mendoza", ...}
   ```

## 🔧 Posibles Causas del Problema

### **Causa 1: Datos no llegan en la notificación**
- **Verificar:** `appointment.professional` en `sendClientPaymentNotification`
- **Solución:** Asegurar que `appointment.professional` tenga valor

### **Causa 2: Datos se pierden en el contexto**
- **Verificar:** `setAppointmentData(data)` en `ReservaConSenaContext`
- **Solución:** Verificar que `data` contenga `professional`

### **Causa 3: Mapeo incorrecto en el formulario**
- **Verificar:** `appointmentData.professional` → `clientBookingData.professionalName`
- **Solución:** Verificar que `appointmentData.professional` exista

### **Causa 4: Estado no se actualiza**
- **Verificar:** `setClientBookingData` se ejecuta correctamente
- **Solución:** Verificar que `newData` tenga `professionalName` correcto

## 📋 Verificación de AsyncStorage

### **Clave:** `notifications`
**Contenido esperado:**
```json
{
  "type": "payment_required",
  "appointmentData": {
    "service": "Cardiología",
    "professional": "Dr. Carlos Mendoza",  // ← DEBE ESTAR PRESENTE
    "date": "2025-01-15",
    "time": "14:30",
    "notes": "Seña requerida: $50"
  }
}
```

## 🎯 Solución Esperada

Después de la corrección:
1. ✅ **Notificación incluye** `professional: "Dr. Carlos Mendoza"`
2. ✅ **Contexto recibe** el campo `professional`
3. ✅ **Formulario se pre-llena** con `professionalName: "Dr. Carlos Mendoza"`
4. ✅ **Campo "Profesional" visible** en el formulario
5. ✅ **Cliente solo hace clic** en "Proceder al Pago de Seña"

## 🔍 Console Logs a Buscar (Orden Cronológico)

```
📱 Enviando notificación de pago al cliente: Ana Martínez
✅ Notificación de pago enviada exitosamente al cliente: cliente_002
🔔 Notificación tocada: payment_required 💳 Pago de Seña Requerido
📋 Datos de la cita extraídos: {service: "Cardiología", professional: "Dr. Carlos Mendoza", ...}
💳 Abriendo modal de pago de seña desde notificación
🧭 Navegando a la tab de configuración...
🎯 Abriendo modal de reserva con seña desde contexto
📋 Datos de cita disponibles: {service: "Cardiología", professional: "Dr. Carlos Mendoza", ...}
📝 Pre-llenando formulario con datos de la cita: {service: "Cardiología", professional: "Dr. Carlos Mendoza", ...}
🔍 Campo professional disponible: Dr. Carlos Mendoza
🔍 Campo professionalName se establecerá como: Dr. Carlos Mendoza
📝 Nuevos datos del formulario: {professionalName: "Dr. Carlos Mendoza", ...}
✅ Modal de reserva con seña abierto exitosamente
```

---

**¡Sigue estos pasos para identificar exactamente dónde se pierde el campo "Profesional"! 🔍**


