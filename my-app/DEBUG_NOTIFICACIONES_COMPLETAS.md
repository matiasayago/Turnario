# 🐛 Debug: Verificar Notificaciones Completas

## 🎯 Problema Identificado
Las notificaciones de pago de seña no están mostrando todos los campos (`appointmentData`, `message`, `senderName`) en el log de debug.

## 🔍 Logs de Debug Agregados

### **1. En NotificationsScreen:**
```typescript
// Log completo de todas las notificaciones
console.log('🔍 NotificationsScreen - Debug info:', {
  // ... campos básicos
  allNotifications: notifications.map(n => ({
    id: n.id,
    recipientId: n.recipientId,
    type: n.type,
    title: n.title,
    message: n.message,           // ← NUEVO
    appointmentData: n.appointmentData,  // ← NUEVO
    senderName: n.senderName,     // ← NUEVO
  }))
});
```

### **2. Al Tocar Notificación de Pago:**
```typescript
console.log('🔍 Notificación completa:', notification);
console.log('🔍 Campo professional disponible:', appointmentData?.professional);
console.log('🔍 Campo service disponible:', appointmentData?.service);
console.log('🔍 Campo date disponible:', appointmentData?.date);
```

## 🧪 Pasos para Probar

### **Paso 1: Crear Nueva Cita (Dr. Carlos Mendoza)**
1. **Login como Dr. Carlos Mendoza**
2. **Ir a "Configuración"** → **"Crear Nueva Cita"**
3. **Completar formulario:**
   - **Servicio:** `Cardiología`
   - **Fecha:** `2025-01-20` (fecha nueva para testing)
   - **Hora:** `15:00`
   - **Paciente:** `Ana Martínez`
   - **Email:** `ana.martinez@email.com`
   - **Teléfono:** `+5491187654321`
   - **Notas:** `Consulta de cardiología con electrocardiograma`
4. **Hacer clic en "Crear Cita y Notificar Cliente"**

### **Paso 2: Verificar Logs de Creación**
**Console logs esperados:**
```
📱 Enviando notificación de pago al cliente: Ana Martínez
📱 ID del destinatario: cliente_002 para email: ana.martinez@email.com
✅ Notificación de pago enviada exitosamente al cliente: cliente_002
🔔 Nueva notificación creada: {id: "...", type: "payment_required", ...}
```

### **Paso 3: Verificar Notificación en Ana Martínez**
1. **Login como Ana Martínez**
2. **Ir a "Notificaciones"**
3. **Verificar log completo:**
   ```
   🔍 NotificationsScreen - Debug info: {
     "userEmail": "ana.martinez@email.com",
     "userId": "cliente_002",
     "userNotifications": 3,  // Debe ser 3 ahora
     "totalNotifications": 17, // Debe ser 17 ahora
     "allNotifications": [
       {
         "id": "1756078644551w23hqjubj",
         "recipientId": "cliente_002",
         "title": "💳 Pago de Seña Requerido",
         "type": "payment_required",
         "message": "Tienes una cita pendiente con Dr. Carlos Mendoza...",  // ← DEBE APARECER
         "appointmentData": {  // ← DEBE APARECER
           "service": "Cardiología",
           "professional": "Dr. Carlos Mendoza",
           "date": "2025-01-20",
           "time": "15:00",
           "notes": "Seña requerida: $50"
         },
         "senderName": "Dr. Carlos Mendoza"  // ← DEBE APARECER
       }
     ]
   }
   ```

### **Paso 4: Tocar Notificación y Ver Datos Extraídos**
1. **Tocar la notificación de pago más reciente**
2. **Verificar logs detallados:**
   ```
   🔔 Notificación tocada: payment_required 💳 Pago de Seña Requerido
   🔍 Notificación completa: {id: "...", type: "payment_required", ...}
   📋 Datos de la cita extraídos: {service: "Cardiología", professional: "Dr. Carlos Mendoza", ...}
   🔍 Campo professional disponible: Dr. Carlos Mendoza
   🔍 Campo service disponible: Cardiología
   🔍 Campo date disponible: 2025-01-20
   💳 Abriendo modal de pago de seña desde notificación
   🧭 Navegando a la tab de configuración...
   ```

## 🔧 Posibles Resultados

### **✅ Escenario 1: Notificación Completa**
- **Síntoma:** Todos los campos aparecen en el log
- **Causa:** La notificación se está creando correctamente
- **Siguiente paso:** Verificar el contexto y pre-llenado del formulario

### **❌ Escenario 2: Notificación Incompleta**
- **Síntoma:** Faltan campos como `message`, `appointmentData`, `senderName`
- **Causa:** La notificación no se está guardando completamente
- **Solución:** Verificar la función `addNotification` en `NotificationContext`

### **❌ Escenario 3: appointmentData Vacío**
- **Síntoma:** `appointmentData` existe pero está vacío o es `undefined`
- **Causa:** Los datos no se están pasando correctamente en `sendClientPaymentNotification`
- **Solución:** Verificar la creación de la notificación en `settings.tsx`

## 📋 Verificación de AsyncStorage

### **Clave:** `notifications`
**Contenido esperado para la nueva notificación:**
```json
{
  "id": "1756078644551w23hqjubj",
  "type": "payment_required",
  "title": "💳 Pago de Seña Requerido",
  "message": "Tienes una cita pendiente con Dr. Carlos Mendoza para Cardiología el 2025-01-20 a las 15:00. Debes pagar la seña de $50 para confirmar tu reserva.",
  "recipientId": "cliente_002",
  "senderId": "prof_003",
  "senderName": "Dr. Carlos Mendoza",
  "appointmentData": {
    "service": "Cardiología",
    "date": "2025-01-20",
    "time": "15:00",
    "notes": "Seña requerida: $50",
    "professional": "Dr. Carlos Mendoza",
    "professionalId": "prof_003",
    "depositAmount": 50,
    "totalAmount": 100
  },
  "timestamp": "2025-01-20T...",
  "read": false
}
```

## 🎯 Resultado Esperado

Después de la corrección:
1. ✅ **Log completo muestra** todos los campos de la notificación
2. ✅ **`appointmentData` contiene** todos los datos de la cita
3. ✅ **`message` contiene** el mensaje completo
4. ✅ **`senderName` contiene** el nombre del profesional
5. ✅ **Al tocar la notificación** se extraen todos los datos correctamente

---

**¡Ejecuta estos pasos para identificar exactamente qué campos faltan en las notificaciones! 🔍**


