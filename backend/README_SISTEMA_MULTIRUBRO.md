# Sistema Turnario - Versión Multirubro

## Descripción General

El sistema Turnario ha sido completamente generalizado para soportar múltiples tipos de negocios y rubros, no solo gestión médica. Ahora es una plataforma versátil que puede adaptarse a cualquier tipo de servicio que requiera gestión de citas, reservas y agenda.

## Tipos de Negocios Soportados

### 1. **Médico** 🏥
- **Descripción**: Servicios médicos, consultas, tratamientos y atención sanitaria
- **Características**: Requiere licencia, soporta seguros, consultas online, historial médico
- **Categorías**: Medicina General, Cardiología, Pediatría, Dermatología, etc.
- **Duración por defecto**: 30 minutos
- **Métodos de pago**: Efectivo, tarjetas, transferencia, seguros

### 2. **Belleza** 💄
- **Descripción**: Servicios de belleza, estética y cuidado personal
- **Características**: No requiere licencia, no soporta seguros, no consultas online
- **Categorías**: Peluquería, Estética, Manicuría, Maquillaje, etc.
- **Duración por defecto**: 60 minutos
- **Métodos de pago**: Efectivo, tarjetas, transferencia, billeteras digitales

### 3. **Fitness** 💪
- **Descripción**: Servicios de entrenamiento físico, gimnasios y actividades deportivas
- **Características**: No requiere licencia, requiere especialización, historial médico
- **Categorías**: Entrenamiento Personal, Yoga, Pilates, CrossFit, etc.
- **Duración por defecto**: 60 minutos
- **Métodos de pago**: Efectivo, tarjetas, transferencia, billeteras digitales

### 4. **Educación** 📚
- **Descripción**: Servicios educativos, tutorías y capacitación
- **Características**: No requiere licencia, requiere especialización, consultas online
- **Categorías**: Tutoría Académica, Idiomas, Música, Arte, etc.
- **Duración por defecto**: 60 minutos
- **Métodos de pago**: Efectivo, tarjetas, transferencia, billeteras digitales

### 5. **Consultoría** 💼
- **Descripción**: Servicios de asesoramiento y consultoría profesional
- **Características**: No requiere licencia, requiere especialización, consultas online
- **Categorías**: Consultoría Empresarial, Financiera, Legal, Tecnológica, etc.
- **Duración por defecto**: 90 minutos
- **Métodos de pago**: Efectivo, tarjetas, transferencia, billeteras digitales

### 6. **Reparación** 🔧
- **Descripción**: Servicios de reparación y mantenimiento técnico
- **Características**: No requiere licencia, requiere especialización, soporte de emergencias
- **Categorías**: Electrodomésticos, Computadoras, Automóviles, etc.
- **Duración por defecto**: 120 minutos
- **Métodos de pago**: Efectivo, tarjetas, transferencia

### 7. **Limpieza** 🧹
- **Descripción**: Servicios de limpieza y mantenimiento de espacios
- **Características**: No requiere licencia, no requiere especialización
- **Categorías**: Limpieza Residencial, Comercial, Industrial, etc.
- **Duración por defecto**: 120 minutos
- **Métodos de pago**: Efectivo, tarjetas, transferencia

### 8. **Transporte** 🚗
- **Descripción**: Servicios de transporte y movilidad
- **Características**: Requiere licencia, soporta seguros, soporte de emergencias
- **Categorías**: Taxi, Remis, Transporte Ejecutivo, etc.
- **Duración por defecto**: 60 minutos
- **Métodos de pago**: Efectivo, tarjetas, transferencia, billeteras digitales

### 9. **Comida** 🍕
- **Descripción**: Servicios de alimentación y gastronomía
- **Características**: Requiere licencia, no requiere especialización
- **Categorías**: Restaurante, Pizzería, Hamburguesería, etc.
- **Duración por defecto**: 45 minutos
- **Métodos de pago**: Efectivo, tarjetas, transferencia, billeteras digitales

### 10. **Retail** 🛍️
- **Descripción**: Comercio minorista y servicios de venta
- **Características**: No requiere licencia, no requiere especialización
- **Categorías**: Ropa, Calzado, Electrónica, Hogar, etc.
- **Duración por defecto**: 30 minutos
- **Métodos de pago**: Efectivo, tarjetas, transferencia, billeteras digitales

### 11. **Otros** 🔧
- **Descripción**: Otros tipos de servicios y negocios
- **Características**: Configuración flexible
- **Categorías**: Servicios Generales, Profesionales, Técnicos, etc.
- **Duración por defecto**: 60 minutos
- **Métodos de pago**: Efectivo, tarjetas, transferencia

## Características del Sistema Multirubro

### Flexibilidad de Configuración
- Cada tipo de negocio tiene su propia configuración
- Duración de citas personalizable por rubro
- Métodos de pago específicos por tipo de negocio
- Monedas y zonas horarias soportadas por rubro
- Idiomas soportados por tipo de negocio

### Adaptabilidad de Funcionalidades
- **Consultas Online**: Solo disponible para rubros que lo soporten
- **Historial Médico**: Solo para rubros médicos y fitness
- **Seguros**: Solo para rubros médicos y transporte
- **Emergencias**: Solo para rubros médicos, reparación y transporte
- **Licencias**: Solo para rubros que lo requieran

### Configuración de Horarios
- Horarios de atención personalizables por día
- Slots de tiempo configurables
- Diferentes horarios para diferentes días
- Soporte para días festivos y cierres temporales

### Gestión de Servicios
- Categorías específicas por rubro
- Subcategorías personalizables
- Requisitos y preparación específicos
- Restricciones de edad configurables
- Documentación requerida por tipo de servicio

## Modelos de Datos Generalizados

### User Model
- **businessInfo**: Información específica del negocio
- **businessType**: Tipo de negocio del usuario
- **businessCategory**: Categoría específica del negocio
- **specialties**: Especialidades o habilidades
- **experience**: Experiencia en años
- **education**: Formación académica
- **certifications**: Certificaciones profesionales
- **skills**: Habilidades técnicas
- **languages**: Idiomas hablados

### Clinic Model
- **businessType**: Tipo de negocio de la clínica
- **businessCategory**: Categoría del negocio
- **specialties**: Especialidades ofrecidas
- **expertise**: Áreas de experiencia
- **businessHours**: Horarios de atención
- **appointmentSettings**: Configuración de citas
- **paymentInfo**: Información de pagos
- **languages**: Idiomas soportados

### Service Model
- **businessType**: Tipo de negocio del servicio
- **category**: Categoría del servicio
- **subcategory**: Subcategoría específica
- **requirements**: Requisitos del servicio
- **preparation**: Instrucciones de preparación
- **whatToBring**: Elementos a traer
- **restrictions**: Restricciones del servicio
- **ageRestrictions**: Restricciones de edad

### Appointment Model
- **sessionInfo**: Información de la sesión
- **symptoms**: Síntomas (para servicios médicos)
- **diagnosis**: Diagnóstico (para servicios médicos)
- **treatment**: Tratamiento (para servicios médicos)
- **recommendations**: Recomendaciones
- **followUp**: Seguimiento requerido
- **payment**: Información de pago
- **insurance**: Información de seguros

### Notification Model
- **type**: Tipo de notificación específico
- **category**: Categoría de la notificación
- **priority**: Prioridad de la notificación
- **relatedData**: Datos relacionados
- **actions**: Acciones disponibles
- **delivery**: Configuración de entrega
- **deliveryStatus**: Estado de entrega por canal

## Configuración por Tipo de Negocio

### Archivo de Configuración
El archivo `src/config/businessTypes.js` centraliza toda la configuración:

```javascript
const BUSINESS_TYPES = {
  medical: {
    name: 'Médico',
    description: 'Servicios médicos, consultas, tratamientos...',
    categories: ['Medicina General', 'Cardiología', ...],
    defaultDuration: 30,
    requiresLicense: true,
    supportsInsurance: true,
    supportsOnlineConsultation: true,
    paymentMethods: ['cash', 'credit_card', 'insurance'],
    currencies: ['ARS', 'USD', 'EUR'],
    languages: ['es', 'en', 'pt']
  },
  // ... otros tipos
};
```

### Funciones de Utilidad
- `getAllBusinessTypes()`: Obtener todos los tipos
- `getBusinessTypeInfo(type)`: Información de un tipo específico
- `getBusinessTypeCategories(type)`: Categorías de un tipo
- `requiresLicense(type)`: Verificar si requiere licencia
- `supportsOnlineConsultation(type)`: Verificar soporte online
- `getSupportedPaymentMethods(type)`: Métodos de pago soportados
- `getDefaultDuration(type)`: Duración por defecto

## Implementación en el Frontend

### Adaptación de Interfaces
- Las interfaces se adaptan según el tipo de negocio
- Campos específicos se muestran/ocultan según el rubro
- Validaciones específicas por tipo de negocio
- Configuración de horarios según el rubro

### Configuración Dinámica
- Categorías se cargan dinámicamente según el tipo
- Métodos de pago se filtran según el rubro
- Monedas soportadas se ajustan automáticamente
- Idiomas disponibles se configuran según el negocio

## Ventajas del Sistema Multirubro

### 1. **Escalabilidad**
- Fácil agregar nuevos tipos de negocios
- Configuración centralizada y mantenible
- Código reutilizable entre rubros

### 2. **Flexibilidad**
- Cada negocio puede configurar sus características
- Funcionalidades se adaptan según el rubro
- Configuración personalizable por tipo

### 3. **Mantenibilidad**
- Configuración centralizada en un archivo
- Fácil modificar características por rubro
- Código limpio y organizado

### 4. **Extensibilidad**
- Nuevos rubros se agregan fácilmente
- Nuevas características se pueden implementar por tipo
- API flexible para diferentes necesidades

## Casos de Uso

### Clínica Médica
- Historial médico de pacientes
- Seguros médicos
- Consultas online
- Emergencias
- Especialidades médicas

### Salón de Belleza
- Servicios de estética
- Horarios flexibles
- Pagos con billeteras digitales
- Galería de trabajos
- Promociones y descuentos

### Gimnasio
- Clases grupales
- Entrenamiento personal
- Historial de entrenamiento
- Seguimiento de progreso
- Reservas de equipos

### Consultoría
- Sesiones online
- Documentos compartidos
- Facturación por hora
- Seguimiento de proyectos
- Múltiples especialidades

### Servicio de Reparación
- Diagnóstico técnico
- Presupuestos
- Garantías
- Servicios de emergencia
- Seguimiento de reparaciones

## Migración de Datos

### Para Negocios Existentes
1. **Identificar el tipo de negocio**
2. **Configurar categorías específicas**
3. **Ajustar horarios de atención**
4. **Configurar métodos de pago**
5. **Personalizar campos específicos**

### Para Nuevos Negocios
1. **Seleccionar tipo de negocio**
2. **Configurar información básica**
3. **Definir categorías de servicios**
4. **Configurar horarios**
5. **Personalizar según necesidades**

## Consideraciones Técnicas

### Base de Datos
- Los modelos mantienen compatibilidad hacia atrás
- Campos opcionales para funcionalidades específicas
- Índices optimizados para consultas por rubro
- Soft delete implementado en todos los modelos

### API
- Endpoints genéricos que se adaptan según el tipo
- Validaciones específicas por rubro
- Respuestas personalizadas según el negocio
- Filtros y búsquedas por tipo de negocio

### Seguridad
- Permisos específicos por tipo de negocio
- Validaciones según el rubro
- Acceso a funcionalidades según licencias
- Auditoría de acciones específicas

## Próximos Pasos

### Funcionalidades Futuras
1. **Plantillas por Rubro**: Interfaces específicas por tipo de negocio
2. **Reportes Especializados**: Estadísticas específicas por rubro
3. **Integraciones Específicas**: APIs de terceros por tipo de negocio
4. **Workflows Personalizados**: Flujos de trabajo por rubro
5. **Analytics Avanzados**: Métricas específicas por tipo de negocio

### Mejoras de Rendimiento
1. **Caché por Rubro**: Datos frecuentes en memoria
2. **Índices Especializados**: Optimización por tipo de negocio
3. **CDN por Región**: Contenido estático distribuido
4. **Microservicios**: Separación por dominio de negocio

## Conclusión

El sistema Turnario ahora es una plataforma verdaderamente multirubro que puede adaptarse a cualquier tipo de negocio que requiera gestión de citas y reservas. La arquitectura flexible permite personalizar funcionalidades según las necesidades específicas de cada rubro, manteniendo la simplicidad de uso y la robustez del sistema.

La generalización del sistema no solo amplía su alcance, sino que también mejora su mantenibilidad y escalabilidad, permitiendo que nuevos tipos de negocios se integren fácilmente sin afectar la funcionalidad existente.
