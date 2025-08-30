# 🧪 Test del Sistema de Notificaciones

## 🎯 Objetivo
Verificar que Ana Martínez reciba notificaciones de pago de seña cuando un profesional crea una cita para ella.

## 🔐 Login de Prueba

### **Profesional (Dr. Carlos Mendoza):**
- **Email:** `carlos.mendoza@turnario.com`
- **Contraseña:** `cualquier texto`

### **Paciente (Ana Martínez):**
- **Email:** `ana.martinez@email.com`
- **Contraseña:** `cualquier texto`

## 📋 Pasos para Probar

### **Paso 1: Login como Profesional**
1. **Abrir la app** Turnario
2. **Hacer logout** si hay un usuario activo
3. **Login como Dr. Carlos Mendoza:**
   - Email: `carlos.mendoza@turnario.com`
   - Contraseña: `cualquier texto`

### **Paso 2: Crear Cita para Ana Martínez**
1. **Ir a la tab "Configuración"**
2. **Hacer clic en "Crear Nueva Cita"**
3. **Completar el formulario:**
   - **Servicio:** `Cardiología` (se llena automáticamente)
   - **Fecha:** Seleccionar una fecha disponible
   - **Hora:** Seleccionar un horario disponible
   - **Paciente:** `Ana Martínez`
   - **Teléfono:** `+5491187654321`
   - **Email:** `ana.martinez@email.com`
   - **Notas:** `Test de notificaciones`
4. **Hacer clic en "Crear Cita y Notificar Cliente"**

### **Paso 3: Verificar Notificación Enviada**
1. **En la consola del desarrollador** deberías ver:
   ```
   📱 Enviando notificación de pago al cliente: Ana Martínez
   ✅ Notificación de pago enviada exitosamente al cliente: ana.martinez@email.com
   🔔 Nueva notificación creada: [objeto de notificación]
   ```

### **Paso 4: Login como Ana Martínez**
1. **Hacer logout** del profesional
2. **Login como Ana Martínez:**
   - Email: `ana.martinez@email.com`
   - Contraseña: `cualquier texto`

### **Paso 5: Verificar Notificación Recibida**
1. **Ir a la tab "Notificaciones"**
2. **Deberías ver la notificación:**
   - **Título:** `💳 Pago de Seña Requerido`
   - **Mensaje:** `Tienes una cita pendiente con Dr. Carlos Mendoza para Cardiología...`
   - **Tipo:** `payment_required`
   - **Estado:** No leída (punto rojo)

## 🔍 Verificación del Sistema

### **✅ Lo que debe funcionar:**
- [ ] Notificación se crea cuando el profesional crea la cita
- [ ] Notificación se guarda en AsyncStorage
- [ ] Notificación aparece en la pantalla de Ana Martínez
- [ ] Notificación muestra los datos correctos de la cita
- [ ] Notificación se puede marcar como leída

### **❌ Posibles problemas:**
- **Notificación no aparece:** Verificar que el contexto esté funcionando
- **Datos incorrectos:** Verificar que la cita se cree correctamente
- **Error de tipo:** Verificar que `payment_required` esté en los tipos

## 🐛 Debugging

### **Console Logs a buscar:**
```
🔍 SettingsScreen - Estado inicial del contexto
📋 Cita creada: [objeto de cita]
📱 Enviando notificación de pago al cliente: Ana Martínez
✅ Notificación de pago enviada exitosamente al cliente: ana.martinez@email.com
🔔 Nueva notificación creada: [objeto de notificación]
```

### **Verificar en AsyncStorage:**
- **Clave:** `notifications`
- **Contenido:** Array de notificaciones con la nueva notificación

## 📱 Flujo Completo Esperado

1. **Profesional crea cita** → ✅
2. **Sistema genera notificación** → ✅
3. **Notificación se guarda** → ✅
4. **Ana Martínez hace login** → ✅
5. **Notificación aparece** → ✅
6. **Ana Martínez puede ver detalles** → ✅

## 🎉 Resultado Esperado

Ana Martínez debería recibir una notificación de pago de seña que:
- Aparezca en la tab "Notificaciones"
- Muestre los detalles de la cita
- Indique que debe pagar la seña
- Se pueda marcar como leída
- Persista entre sesiones

---

**¡Listo para probar! 🚀**


