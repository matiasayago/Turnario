# 📅 Sistema de Calendario Mensual - Turnario App

## 🎯 **Descripción General**

Se ha implementado un sistema completo de calendario mensual que permite a los profesionales visualizar y gestionar su disponibilidad día a día, con horarios específicos para cada fecha. El sistema está integrado con el modelo `ProfessionalAvailability` existente y proporciona una vista detallada del calendario.

## 🏗️ **Arquitectura del Sistema**

### **Backend (Node.js + Express + MongoDB)**

#### **1. Controlador del Calendario (`calendarController.js`)**
- **`getMonthlyCalendar`**: Genera el calendario completo de un mes específico
- **`getDayAvailability`**: Obtiene la disponibilidad detallada de un día específico
- **`getUpcomingAvailability`**: Obtiene los próximos días disponibles

#### **2. Rutas del Calendario (`routes/calendar.js`)**
```javascript
GET /api/v1/calendar/monthly/:professionalId/:year/:month
GET /api/v1/calendar/day/:professionalId/:date
GET /api/v1/calendar/upcoming/:professionalId?days=30
```

#### **3. Funciones Auxiliares**
- **`generateAvailableSlots`**: Genera horarios disponibles para un día específico
- **`isTimeInBreak`**: Verifica si un horario está en el descanso
- **`getDayName`**: Obtiene el nombre del día en inglés

### **Frontend (React Native + TypeScript)**

#### **1. Servicio del Calendario (`calendarService.ts`)**
- **`getMonthlyCalendar`**: Obtiene calendario mensual del backend
- **`getDayAvailability`**: Obtiene disponibilidad de un día específico
- **`getUpcomingAvailability`**: Obtiene próximos días disponibles
- **Funciones auxiliares**: Formateo de fechas, nombres de meses/días, validaciones

#### **2. Contexto del Calendario (`CalendarContext.tsx`)**
- **Estado global**: Calendario actual, día actual, próximos días
- **Funciones**: Cargar calendario, navegación entre meses, refrescar datos
- **Integración**: Con `AuthContext` para obtener datos del profesional

#### **3. Componente del Calendario (`MonthlyCalendar.tsx`)**
- **Vista mensual**: Calendario completo con días y horarios
- **Navegación**: Botones para cambiar mes/año
- **Interactividad**: Selección de días y horarios
- **Estados**: Carga, error, vacío

#### **4. Pantalla del Calendario (`app/calendar.tsx`)**
- **Vista principal**: Integra el componente `MonthlyCalendar`
- **Estadísticas**: Resumen del mes (días laborales, horarios disponibles)
- **Próximos días**: Lista de días con disponibilidad
- **Restricciones**: Solo visible para profesionales

## 📊 **Estructura de Datos**

### **Calendario Mensual**
```typescript
interface MonthlyCalendar {
  professionalId: string;
  professionalName: string;
  year: number;
  month: number;
  monthName: string;
  calendar: DayAvailability[];
  summary: {
    totalDays: number;
    workingDays: number;
    nonWorkingDays: number;
    totalAvailableSlots: number;
    totalBlockedSlots: number;
  };
}
```

### **Disponibilidad del Día**
```typescript
interface DayAvailability {
  date: string;
  day: number;
  dayName: string;
  isWorkingDay: boolean;
  availableSlots: TimeSlot[];
  workingHours?: { start: string; end: string };
  breakTime?: { start: string; end: string };
  reason?: string;
  totalSlots: number;
  availableSlotsCount: number;
  blockedSlotsCount: number;
}
```

### **Horario Individual**
```typescript
interface TimeSlot {
  time: string;
  isAvailable: boolean;
  isBlocked: boolean;
  appointmentId?: string | null;
  reason?: string;
}
```

## 🔄 **Flujo de Funcionamiento**

### **1. Carga del Calendario**
1. Usuario profesional accede a "Mi Calendario"
2. `CalendarContext` detecta el usuario y carga el calendario del mes actual
3. Se hace petición a `/api/v1/calendar/monthly/:professionalId/:year/:month`
4. Backend genera el calendario basado en `ProfessionalAvailability`
5. Se muestran los días con disponibilidad y horarios

### **2. Generación de Horarios**
1. Para cada día del mes, se verifica si es día laboral
2. Se obtienen las citas existentes para ese día
3. Se generan horarios basados en `timeSlots` del profesional
4. Se excluyen horarios en descanso (`breakTime`)
5. Se marcan como bloqueados los horarios con citas

### **3. Navegación del Calendario**
1. Usuario puede navegar entre meses con botones ‹ ›
2. Botón "Hoy" regresa al mes actual
3. Cada cambio de mes recarga el calendario automáticamente
4. Se mantiene el estado de navegación en el contexto

### **4. Interacción con Horarios**
1. Usuario puede tocar un día para ver detalles
2. Se muestran horarios disponibles y bloqueados
3. Horarios disponibles son clickeables para programar citas
4. Horarios bloqueados muestran la razón (cita programada, horario bloqueado)

## 🎨 **Características de la UI**

### **Vista del Calendario**
- **Header**: Navegación entre meses, nombre del profesional
- **Resumen**: Estadísticas del mes (días laborales, horarios disponibles)
- **Días**: Tarjetas con información de cada día
- **Estados visuales**: Días disponibles, bloqueados, no laborales, hoy

### **Estados de los Días**
- **Día laboral con disponibilidad**: Verde claro, muestra cantidad de horarios
- **Día laboral sin disponibilidad**: Rojo claro, "Sin disponibilidad"
- **Día no laboral**: Gris, "Día no laboral"
- **Día actual**: Borde azul, fondo azul claro

### **Horarios**
- **Disponibles**: Verde, clickeables
- **Bloqueados**: Rojo, con razón
- **En descanso**: Excluidos automáticamente

## 🔧 **Configuración y Personalización**

### **Configuración del Profesional**
El calendario se basa en la configuración de `ProfessionalAvailability`:
- **Días de la semana**: `daysOfWeek` (lunes a domingo)
- **Horarios por defecto**: `timeSlots` (ej: ["09:00", "10:00", "11:00"])
- **Horario de trabajo**: `workingHours` (ej: { start: "09:00", end: "17:00" })
- **Descanso**: `breakTime` (ej: { start: "12:00", end: "13:00" })
- **Excepciones**: `specialDates` y `recurringExceptions`

### **Personalización de la Vista**
- **Horarios visibles**: `maxTimeSlotsToShow` (por defecto 3)
- **Mostrar horarios**: `showTimeSlots` (por defecto true)
- **Días de búsqueda**: `days` en próximos días (por defecto 30)

## 📱 **Integración con la App**

### **Navegación**
- **Acceso**: Botón "Mi Calendario" en el dashboard (solo profesionales)
- **Ruta**: `/calendar` agregada al `_layout.tsx`
- **Restricción**: Solo visible para usuarios tipo `professional`

### **Contextos Integrados**
- **`CalendarProvider`**: Agregado a `Providers.tsx`
- **`useCalendar`**: Hook para acceder al contexto
- **`useAuth`**: Para obtener datos del profesional

### **Servicios**
- **`calendarService`**: Servicio para comunicación con backend
- **`API_BASE_URL`**: Configurado para `http://localhost:3001/api/v1`

## 🚀 **Funcionalidades Implementadas**

### **✅ Completadas**
1. **Calendario mensual completo** con días y horarios
2. **Navegación entre meses** con botones y "Hoy"
3. **Generación automática de horarios** basada en configuración
4. **Exclusión de horarios en descanso**
5. **Marcado de horarios bloqueados** por citas existentes
6. **Estadísticas del mes** (días laborales, horarios disponibles)
7. **Próximos días disponibles** con resumen
8. **Interactividad** con días y horarios
9. **Estados visuales** para diferentes tipos de días
10. **Integración completa** con el sistema existente

### **🔄 En Desarrollo**
1. **Programación de citas** desde el calendario
2. **Bloqueo de horarios** desde la interfaz
3. **Excepciones especiales** por fecha
4. **Sincronización en tiempo real** con citas

## 🧪 **Pruebas y Validación**

### **Casos de Prueba**
1. **Carga del calendario**: Verificar que se carga correctamente
2. **Navegación**: Probar botones de mes anterior/siguiente
3. **Horarios**: Verificar que se generan correctamente
4. **Estados**: Probar días laborales, no laborales, bloqueados
5. **Interactividad**: Probar selección de días y horarios

### **Datos de Prueba**
- **Profesional**: Dr. Carlos Mendoza (ID: 3)
- **Configuración**: Lunes a viernes, 09:00-17:00, descanso 12:00-13:00
- **Horarios**: ["09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00"]

## 📚 **Documentación de API**

### **Endpoints del Calendario**

#### **GET /api/v1/calendar/monthly/:professionalId/:year/:month**
Obtiene el calendario mensual completo.

**Parámetros:**
- `professionalId`: ID del profesional
- `year`: Año (2020-2030)
- `month`: Mes (1-12)

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "professionalId": "3",
    "professionalName": "Dr. Carlos Mendoza",
    "year": 2024,
    "month": 12,
    "monthName": "diciembre",
    "calendar": [...],
    "summary": {
      "totalDays": 31,
      "workingDays": 22,
      "nonWorkingDays": 9,
      "totalAvailableSlots": 154,
      "totalBlockedSlots": 0
    }
  }
}
```

#### **GET /api/v1/calendar/day/:professionalId/:date**
Obtiene la disponibilidad de un día específico.

**Parámetros:**
- `professionalId`: ID del profesional
- `date`: Fecha en formato YYYY-MM-DD

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "professionalId": "3",
    "professionalName": "Dr. Carlos Mendoza",
    "date": "2024-12-15",
    "dayName": "sunday",
    "isWorkingDay": false,
    "availableSlots": [],
    "summary": {
      "totalSlots": 0,
      "availableSlotsCount": 0,
      "blockedSlotsCount": 0
    }
  }
}
```

#### **GET /api/v1/calendar/upcoming/:professionalId?days=30**
Obtiene los próximos días disponibles.

**Parámetros:**
- `professionalId`: ID del profesional
- `days`: Número de días a buscar (1-90, por defecto 30)

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "professionalId": "3",
    "professionalName": "Dr. Carlos Mendoza",
    "upcomingDays": [
      {
        "date": "2024-12-16",
        "dayName": "monday",
        "availableSlotsCount": 7,
        "firstAvailableSlot": "09:00",
        "lastAvailableSlot": "16:00"
      }
    ],
    "totalDays": 1,
    "searchPeriod": "30 días desde hoy"
  }
}
```

## 🔮 **Próximas Mejoras**

### **Funcionalidades Futuras**
1. **Programación de citas** directamente desde el calendario
2. **Bloqueo de horarios** con interfaz visual
3. **Excepciones especiales** por fecha con modal
4. **Sincronización en tiempo real** con WebSocket
5. **Exportación del calendario** a PDF o imagen
6. **Notificaciones** de cambios en disponibilidad
7. **Vista semanal** además de mensual
8. **Integración con calendarios externos** (Google Calendar, Outlook)

### **Optimizaciones**
1. **Caché del calendario** para mejorar rendimiento
2. **Lazy loading** de meses no visibles
3. **Compresión de datos** para reducir transferencia
4. **Indexación de MongoDB** para consultas más rápidas

## 🎉 **Conclusión**

El sistema de calendario mensual está completamente implementado y funcional. Proporciona una vista detallada y interactiva de la disponibilidad del profesional, integrada perfectamente con el sistema existente de `ProfessionalAvailability`. 

Los profesionales pueden ahora:
- ✅ Ver su calendario mensual completo
- ✅ Navegar entre meses fácilmente
- ✅ Ver horarios disponibles y bloqueados
- ✅ Obtener estadísticas del mes
- ✅ Acceder a próximos días disponibles

El sistema está listo para uso en producción y puede ser extendido con funcionalidades adicionales según las necesidades del negocio.
