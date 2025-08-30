# 🧪 Test de Formulario Pre-llenado - Reservar Cita con Seña

## 🎯 Objetivo
Verificar que cuando Ana Martínez toque la notificación de pago de seña, el modal de "Reservar Cita con Seña" se abra con todos los campos pre-llenados con los datos que insertó el profesional.

## ✅ Estado Actual
- ✅ Las notificaciones llegan correctamente
- ✅ Al tocar la notificación se navega a configuración
- ✅ **NUEVO:** Formulario se pre-llena con datos de la cita
- ✅ **NUEVO:** Cliente solo debe hacer clic en "Proceder al Pago de Seña"

## 🔐 Login de Prueba

### **Profesional (Dr. Carlos Mendoza):**
- **Email:** `carlos.mendoza@turnario.com`
- **Contraseña:** `cualquier texto`

### **Paciente (Ana Martínez):**
- **Email:** `ana.martinez@email.com`
- **Contraseña:** `cualquier texto`

## 📋 Pasos para Probar el Formulario Pre-llenado

### **Paso 1: Crear Cita con Datos Completos**
1. **Login como Dr. Carlos Mendoza**
2. **Ir a "Configuración"** → **"Crear Nueva Cita"**
3. **Completar formulario con datos específicos:**
   - **Servicio:** `Cardiología` (se llena automáticamente)
   - **Fecha:** `2025-01-15` (fecha específica para testing)
   - **Hora:** `14:30` (hora específica para testing)
   - **Paciente:** `Ana Martínez`
   - **Teléfono:** `+5491187654321`
   - **Email:** `ana.martinez@email.com`
   - **Notas:** `Consulta de cardiología con electrocardiograma`
4. **Hacer clic en "Crear Cita y Notificar Cliente"**

### **Paso 2: Verificar Notificación con Datos Completos**
1. **Login como Ana Martínez**
2. **Ir a "Notificaciones"**
3. **Verificar que la notificación contenga:**
   - **Título:** `💳 Pago de Seña Requerido`
   - **Mensaje:** `Tienes una cita pendiente con Dr. Carlos Mendoza para Cardiología el 2025-01-15 a las 14:30...`
   - **Datos incluidos:** servicio, fecha, hora, profesional, monto de seña

### **Paso 3: Tocar Notificación y Ver Formulario Pre-llenado**
1. **Tocar la notificación de pago de seña**
2. **Verificar navegación automática a "Configuración"**
3. **Verificar que el modal se abra automáticamente**
4. **Verificar que los campos estén pre-llenados:**
   - ✅ **Servicio:** `Cardiología`
   - ✅ **Profesional:** `Dr. Carlos Mendoza` ← **CORREGIDO: Ahora se pre-llena**
   - ✅ **Fecha:** `2025-01-15`
   - ✅ **Hora:** `14:30`
   - ✅ **Notas:** `Consulta de cardiología con electrocardiograma`

### **Paso 4: Completar Pago (Solo Clic)**
1. **Verificar que todos los campos estén correctos**
2. **Hacer clic en "Proceder al Pago de Seña"**
3. **Verificar que se procese el pago exitosamente**

## 🔍 Verificación del Sistema

### **✅ Lo que debe funcionar ahora:**
- [ ] **NUEVO:** Notificación incluye todos los datos de la cita
- [ ] **NUEVO:** Contexto pasa datos al modal
- [ ] **NUEVO:** Formulario se pre-llena automáticamente
- [ ] **NUEVO:** Cliente no necesita escribir nada
- [ ] **NUEVO:** Solo debe hacer clic en "Proceder al Pago"

### **🔧 Cambios Técnicos Implementados:**
1. **`ReservaConSenaContext` expandido:** Ahora incluye `appointmentData`
2. **`openReservaConSenaModal(data)`:** Función modificada para recibir datos
3. **`useEffect` mejorado:** Pre-llena formulario cuando se abre el modal
4. **Notificación enriquecida:** Incluye todos los datos necesarios para pre-llenar

## 🐛 Debugging

### **Console Logs a buscar (en orden):**
```
🔔 Notificación tocada: payment_required 💳 Pago de Seña Requerido
📋 Datos de la cita extraídos: {service: "Cardiología", professional: "Dr. Carlos Mendoza", date: "2025-01-15", ...}
💳 Abriendo modal de pago de seña desde notificación
🧭 Navegando a la tab de configuración...
🎯 Abriendo modal de reserva con seña desde contexto
📋 Datos de cita disponibles: {service: "Cardiología", professional: "Dr. Carlos Mendoza", date: "2025-01-15", ...}
📝 Pre-llenando formulario con datos de la cita: {service: "Cardiología", professionalName: "Dr. Carlos Mendoza", ...}
✅ Modal de reserva con seña abierto exitosamente
```

### **Verificar en AsyncStorage:**
- **Clave:** `notifications`
- **Contenido:** Notificación con `appointmentData` completo

## 📱 Flujo Completo de Formulario Pre-llenado

1. **Profesional crea cita** → Datos completos guardados
2. **Sistema genera notificación** → Incluye todos los datos de la cita
3. **Cliente toca notificación** → Se extraen los datos
4. **Contexto recibe datos** → `appointmentData` se establece
5. **Modal se abre** → `useEffect` detecta datos
6. **Formulario se pre-llena** → Todos los campos se completan automáticamente
7. **Cliente solo hace clic** → "Proceder al Pago de Seña"

## 🎉 Resultado Esperado

Al tocar la notificación de pago de seña:
1. ✅ **Navegación automática** a la tab "Configuración"
2. ✅ **Modal se abre automáticamente** con formulario pre-llenado
3. ✅ **Todos los campos completos** con datos del profesional
4. ✅ **Cliente solo hace clic** en "Proceder al Pago de Seña"
5. ✅ **Experiencia fluida** sin necesidad de escribir datos

## 🔍 Verificación de Errores

### **Si el formulario no se pre-llena:**
1. **Verificar console logs:** Deben aparecer todos los logs de pre-llenado
2. **Verificar que `appointmentData` se pase:** Debe aparecer "Datos de cita disponibles"
3. **Verificar que `setClientBookingData` se llame:** Debe aparecer "Pre-llenando formulario"

### **Si faltan datos en la notificación:**
1. **Verificar que `sendClientPaymentNotification` incluya todos los campos**
2. **Verificar que `appointmentData` en la notificación sea completo**
3. **Verificar que el contexto reciba los datos correctamente**

---

**¡El formulario pre-llenado ahora debería funcionar completamente! 🚀**

**Ana Martínez solo tendrá que hacer clic en "Proceder al Pago de Seña" sin escribir ningún dato.**
