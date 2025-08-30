# Modo Cliente - Turnario

## 🎯 Descripción General

El modo cliente de Turnario permite a los usuarios reservar citas con profesionales, explorar servicios disponibles y gestionar sus turnos programados. Es la interfaz principal para clientes que buscan servicios profesionales.

## 🚀 Funcionalidades Principales

### 1. **Dashboard del Cliente**
- **Resumen de Citas**: Vista rápida de próximas citas programadas
- **Acciones Rápidas**: Botones para reservar citas y explorar profesionales
- **Servicios Recientes**: Historial de servicios utilizados
- **Selector de Modo**: Cambio entre modo cliente y profesional

### 2. **Exploración de Profesionales**
- **Búsqueda por Texto**: Buscar por nombre o especialidad
- **Filtros por Categoría**: Salud, terapia, educación, negocios, belleza
- **Información Detallada**: Calificaciones, experiencia, ubicación
- **Estado de Disponibilidad**: Indicadores visuales de disponibilidad

### 3. **Reserva de Citas**
- **Selección de Profesional**: Elegir entre profesionales disponibles
- **Calendario de Disponibilidad**: Ver horarios libres
- **Confirmación de Reserva**: Proceso de confirmación paso a paso

### 4. **Gestión de Turnos**
- **Lista de Citas**: Ver todas las citas programadas
- **Estado de Citas**: Confirmadas, pendientes, canceladas
- **Detalles de Servicio**: Información completa de cada cita

## 📱 Pantallas del Modo Cliente

### **ClientDashboard.jsx**
- **Propósito**: Pantalla principal del cliente
- **Características**:
  - Resumen de citas próximas
  - Acciones rápidas para reservar
  - Historial de servicios recientes
  - Selector de tipo de usuario

### **ExploreProfessionalsScreen.jsx**
- **Propósito**: Explorar y buscar profesionales
- **Características**:
  - Búsqueda por texto
  - Filtros por categoría
  - Lista de profesionales con información detallada
  - Botones de reserva directa

### **BookAppointmentScreen.jsx**
- **Propósito**: Reservar citas con profesionales
- **Características**:
  - Selección de profesional
  - Calendario de disponibilidad
  - Formulario de reserva
  - Confirmación de cita

### **AppointmentDetailsScreen.jsx**
- **Propósito**: Ver detalles de citas programadas
- **Características**:
  - Información completa de la cita
  - Estado y confirmación
  - Opciones de cancelación o modificación

## 🔄 Flujo de Usuario Típico

### **Flujo 1: Reserva de Primera Cita**
1. **Acceso al Dashboard**: Cliente ve pantalla principal
2. **Explorar Profesionales**: Navega a la pantalla de exploración
3. **Búsqueda y Filtros**: Encuentra profesional adecuado
4. **Selección de Servicio**: Elige tipo de servicio y profesional
5. **Reserva de Cita**: Completa formulario de reserva
6. **Confirmación**: Recibe confirmación de la cita

### **Flujo 2: Gestión de Citas Existentes**
1. **Dashboard**: Ve citas próximas
2. **Lista de Turnos**: Accede a todas las citas
3. **Detalles**: Revisa información específica
4. **Acciones**: Cancela, modifica o confirma citas

### **Flujo 3: Cambio de Modo**
1. **Selector de Usuario**: Ve opción de cambiar modo
2. **Confirmación**: Confirma cambio a modo profesional
3. **Navegación**: Accede a funcionalidades de profesional

## 🎨 Características de Diseño

### **Colores del Modo Cliente**
- **Color Principal**: `#4caf50` (Verde)
- **Color Secundario**: `#2196f3` (Azul)
- **Color de Éxito**: `#4CAF50` (Verde)
- **Color de Advertencia**: `#FF9800` (Naranja)

### **Iconografía**
- **Reserva**: `calendar-plus`
- **Explorar**: `search`
- **Turnos**: `time`
- **Perfil**: `person`
- **Notificaciones**: `notifications`

### **Componentes Reutilizables**
- **UserTypeSelector**: Selector de tipo de usuario
- **AppointmentCard**: Tarjeta de cita
- **ProfessionalCard**: Tarjeta de profesional
- **CategoryFilter**: Filtros por categoría

## 🔧 Funcionalidades Técnicas

### **Estado de la Aplicación**
```javascript
const [upcomingAppointments, setUpcomingAppointments] = useState([]);
const [recentServices, setRecentServices] = useState([]);
const [searchQuery, setSearchQuery] = useState('');
const [selectedCategory, setSelectedCategory] = useState('all');
```

### **Filtrado de Profesionales**
```javascript
const filteredProfessionals = professionals.filter(professional => {
  const matchesSearch = professional.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       professional.specialty.toLowerCase().includes(searchQuery.toLowerCase());
  const matchesCategory = selectedCategory === 'all' || professional.category === selectedCategory;
  
  return matchesSearch && matchesCategory;
});
```

### **Categorías de Profesionales**
```javascript
const categories = [
  { id: 'all', name: 'Todos', icon: 'grid' },
  { id: 'health', name: 'Salud', icon: 'medical' },
  { id: 'therapy', name: 'Terapia', icon: 'heart' },
  { id: 'education', name: 'Educación', icon: 'school' },
  { id: 'business', name: 'Negocios', icon: 'briefcase' },
  { id: 'beauty', name: 'Belleza', icon: 'sparkles' },
];
```

## 📊 Datos de Ejemplo

### **Profesionales Disponibles**
```javascript
const mockProfessionals = [
  {
    id: '1',
    name: 'Dr. María García',
    specialty: 'Médico General',
    category: 'health',
    rating: 4.9,
    reviews: 127,
    experience: '8 años',
    location: 'Centro Médico Central',
    available: true,
    nextAvailable: '2024-07-10',
  },
  // ... más profesionales
];
```

### **Citas del Cliente**
```javascript
const upcomingAppointments = [
  {
    id: '1',
    professionalName: 'Dr. María García',
    service: 'Consulta Médica',
    time: '15:30',
    date: '2024-07-08',
    status: 'confirmed',
  },
  // ... más citas
];
```

## 🎯 Casos de Uso

### **Caso 1: Cliente Nuevo**
- **Objetivo**: Reservar primera cita
- **Proceso**: Explorar → Buscar → Reservar → Confirmar
- **Resultado**: Cita programada exitosamente

### **Caso 2: Cliente Recurrente**
- **Objetivo**: Gestionar citas existentes
- **Proceso**: Dashboard → Turnos → Detalles → Acciones
- **Resultado**: Citas gestionadas eficientemente

### **Caso 3: Cambio de Modo**
- **Objetivo**: Acceder a funcionalidades de profesional
- **Proceso**: Selector → Confirmación → Navegación
- **Resultado**: Acceso a modo profesional

## 🔒 Seguridad y Validaciones

### **Validaciones de Usuario**
- Verificación de tipo de usuario
- Control de acceso a funcionalidades
- Validación de datos de reserva

### **Manejo de Errores**
- Errores de conexión
- Validaciones de formulario
- Confirmaciones de acciones críticas

## 🚀 Mejoras Futuras

### **Funcionalidades Planificadas**
- **Sistema de Favoritos**: Marcar profesionales preferidos
- **Historial Completo**: Registro detallado de servicios
- **Notificaciones Push**: Alertas de citas y recordatorios
- **Pagos Integrados**: Sistema de pagos en la aplicación

### **Integraciones**
- **Calendario Externo**: Sincronización con calendarios
- **Redes Sociales**: Compartir experiencias
- **Sistema de Reseñas**: Calificaciones y comentarios
- **Chat en Vivo**: Comunicación directa con profesionales

## 📚 Documentación Técnica

### **Archivos Principales**
- `ClientDashboard.jsx`: Dashboard principal del cliente
- `ExploreProfessionalsScreen.jsx`: Exploración de profesionales
- `BookAppointmentScreen.jsx`: Reserva de citas
- `AppointmentDetailsScreen.jsx`: Detalles de citas

### **Dependencias**
- React Navigation para navegación
- AsyncStorage para persistencia local
- Context API para estado global
- Ionicons para iconografía

### **Estructura de Datos**
```javascript
// Profesional
{
  id: string,
  name: string,
  specialty: string,
  category: string,
  rating: number,
  reviews: number,
  experience: string,
  location: string,
  available: boolean,
  nextAvailable: string
}

// Cita
{
  id: string,
  professionalName: string,
  service: string,
  time: string,
  date: string,
  status: 'confirmed' | 'pending' | 'cancelled'
}
```

## 🎉 Conclusión

El modo cliente de Turnario proporciona una experiencia completa y intuitiva para que los usuarios puedan:

- **Explorar Profesionales**: Encontrar servicios según necesidades
- **Reservar Citas**: Proceso simple y eficiente
- **Gestionar Turnos**: Control total sobre citas programadas
- **Cambiar de Modo**: Acceso flexible a funcionalidades profesionales

La interfaz está diseñada para ser fácil de usar, visualmente atractiva y funcionalmente completa, proporcionando una base sólida para la gestión de citas y servicios profesionales.


