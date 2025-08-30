# 🕐 Sistema de Configuración de Horarios - TurnarioApp

## Descripción General

El sistema de horarios permite a los profesionales configurar su disponibilidad semanal para recibir citas. Los profesionales pueden establecer múltiples rangos de tiempo por día, definir intervalos entre citas y gestionar su agenda de manera flexible.

## 🚀 Características Principales

### ✅ Configuración por Día
- **Activación/Desactivación** de días específicos
- **Múltiples rangos de tiempo** por día
- **Horarios personalizables** de inicio y fin
- **Validación automática** de superposición de horarios

### ⏰ Intervalos Configurables
- **15 minutos** - Para consultas rápidas
- **30 minutos** - Intervalo estándar
- **45 minutos** - Para sesiones intermedias
- **1 hora** - Para sesiones largas

### 📱 Interfaz Intuitiva
- **Vista semanal** con indicadores visuales
- **Modal de configuración** para cada día
- **Validación en tiempo real** de formatos
- **Estadísticas automáticas** de disponibilidad

## 🎯 Flujo de Uso

### 1. Acceso a Horarios
```
Dashboard Profesional → Tab "Horarios" → ScheduleScreen
```

### 2. Configuración Básica
1. **Activar días** usando el switch
2. **Configurar rangos** de tiempo por día
3. **Definir intervalos** entre citas
4. **Guardar configuración**

### 3. Gestión Avanzada
- **Editar horarios** existentes
- **Agregar/eliminar** rangos de tiempo
- **Validar configuración** antes de guardar
- **Exportar resumen** de horarios

## 🔧 Componentes Técnicos

### ScheduleScreen.jsx
- **Componente principal** para configuración de horarios
- **Estado local** para gestión de formularios
- **Validación** de rangos de tiempo
- **Integración** con AsyncStorage

### ScheduleService.js
- **Servicio de lógica** para horarios
- **Generación de slots** disponibles
- **Validación** de configuración
- **Estadísticas** y exportación

### ProfessionalDashboard.jsx
- **Vista previa** de horarios configurados
- **Resumen visual** de disponibilidad
- **Navegación rápida** a configuración

## 📊 Estructura de Datos

### Horario por Día
```javascript
{
  "1": { // Lunes
    "enabled": true,
    "timeRanges": [
      { "start": "09:00", "end": "12:00" },
      { "start": "14:00", "end": "18:00" }
    ],
    "interval": 30
  }
}
```

### Rangos de Tiempo
```javascript
{
  "start": "09:00",  // Formato HH:MM
  "end": "12:00",    // Formato HH:MM
}
```

## ✅ Validaciones Implementadas

### Formato de Tiempo
- **Patrón HH:MM** (00:00 a 23:59)
- **Validación regex** en tiempo real
- **Mensajes de error** claros

### Lógica de Horarios
- **Inicio < Fin** para cada rango
- **Sin superposición** entre rangos
- **Días habilitados** deben tener rangos

### Integridad de Datos
- **Persistencia** en AsyncStorage
- **Sincronización** entre componentes
- **Manejo de errores** robusto

## 🎨 Características de UI/UX

### Indicadores Visuales
- **Días activos** con puntos verdes
- **Rangos de tiempo** claramente marcados
- **Estados de edición** diferenciados

### Navegación Intuitiva
- **Botones de acción** claros
- **Modal responsive** para configuración
- **Feedback inmediato** de acciones

### Accesibilidad
- **Iconos descriptivos** para cada acción
- **Colores contrastantes** para mejor visibilidad
- **Textos informativos** para guiar al usuario

## 🔄 Flujo de Datos

```
Usuario Configura → Validación Local → Guardado AsyncStorage → 
Dashboard Actualizado → Servicio Genera Slots → Clientes Reservan
```

## 📱 Pantallas Relacionadas

### Para Profesionales
- **ScheduleScreen**: Configuración principal de horarios
- **ProfessionalDashboard**: Vista previa y estadísticas

### Para Clientes (Futuro)
- **BookAppointmentScreen**: Selección de horarios disponibles
- **AppointmentDetailsScreen**: Confirmación de citas

## 🚧 Funcionalidades Futuras

### Próximas Implementaciones
- **Sincronización con API** para horarios
- **Notificaciones** de cambios de horario
- **Historial** de modificaciones
- **Plantillas** de horarios predefinidos

### Mejoras Planificadas
- **Drag & Drop** para rangos de tiempo
- **Copiar horarios** entre días
- **Importar/Exportar** desde calendario
- **Integración** con Google Calendar

## 🐛 Solución de Problemas

### Errores Comunes
1. **"Los rangos se superponen"**
   - Verificar que no haya solapamiento de horarios
   - Ajustar inicio/fin de cada rango

2. **"Formato de hora inválido"**
   - Usar formato HH:MM (ej: 09:00, 14:30)
   - Verificar que las horas estén entre 00-23

3. **"Día habilitado sin rangos"**
   - Configurar al menos un rango de tiempo
   - O deshabilitar el día si no se necesita

### Debugging
- **Console logs** en ScheduleService
- **Estado local** en ScheduleScreen
- **AsyncStorage** para verificar persistencia

## 📚 Referencias Técnicas

### Dependencias
- `@react-native-async-storage/async-storage`: Persistencia local
- `@expo/vector-icons`: Iconografía de la interfaz
- `react-native`: Componentes base

### Patrones Utilizados
- **Service Layer**: Lógica de negocio separada
- **State Management**: Estado local con useState
- **Component Composition**: Reutilización de componentes
- **Error Handling**: Manejo robusto de errores

## 🤝 Contribución

Para contribuir al sistema de horarios:

1. **Fork** del repositorio
2. **Branch** para nueva funcionalidad
3. **Tests** para validaciones
4. **Pull Request** con descripción clara

## 📄 Licencia

Este sistema de horarios es parte de TurnarioApp y está sujeto a la licencia del proyecto principal.

---

**Desarrollado con ❤️ para profesionales que valoran su tiempo**


