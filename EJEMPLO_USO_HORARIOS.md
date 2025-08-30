# Ejemplos de Uso - Configuración de Horarios

## 🚀 Inicio Rápido

### 1. Configuración Básica con Plantilla

```javascript
import ScheduleService from '../services/ScheduleService';

// Aplicar plantilla de horario 9-5
const horario9to5 = ScheduleService.applyScheduleTemplate('9to5');
await ScheduleService.saveProfessionalSchedule(horario9to5);

// Resultado: Horario configurado automáticamente
// Lunes a Viernes: 9:00 AM - 5:00 PM
// Intervalo: 30 minutos
// Fines de semana: Deshabilitados
```

### 2. Configuración Personalizada

```javascript
// Configurar horario personalizado
const horarioPersonalizado = {
  1: { // Lunes
    enabled: true,
    timeRanges: [
      { start: '08:00', end: '12:00' },
      { start: '14:00', end: '19:00' }
    ],
    interval: 45,
    breaks: [
      { start: '12:00', end: '14:00' }
    ]
  },
  2: { // Martes
    enabled: true,
    timeRanges: [
      { start: '09:00', end: '17:00' }
    ],
    interval: 30,
    breaks: [
      { start: '12:00', end: '13:00' }
    ]
  }
  // ... otros días
};

await ScheduleService.saveProfessionalSchedule(horarioPersonalizado);
```

## 📅 Casos de Uso Comunes

### Caso 1: Profesional de Salud

**Requisitos:**
- Horario de lunes a viernes
- Pausas para almuerzo
- Intervalos de 30 minutos
- Horarios flexibles por día

**Implementación:**

```javascript
const horarioSalud = {
  1: { // Lunes
    enabled: true,
    timeRanges: [
      { start: '08:00', end: '12:00' },
      { start: '13:00', end: '18:00' }
    ],
    interval: 30,
    breaks: [
      { start: '12:00', end: '13:00' }
    ]
  },
  2: { // Martes
    enabled: true,
    timeRanges: [
      { start: '09:00', end: '12:00' },
      { start: '14:00', end: '19:00' }
    ],
    interval: 30,
    breaks: [
      { start: '12:00', end: '14:00' }
    ]
  },
  3: { // Miércoles
    enabled: true,
    timeRanges: [
      { start: '08:00', end: '17:00' }
    ],
    interval: 30,
    breaks: [
      { start: '12:00', end: '13:00' }
    ]
  },
  4: { // Jueves
    enabled: true,
    timeRanges: [
      { start: '09:00', end: '12:00' },
      { start: '13:00', end: '18:00' }
    ],
    interval: 30,
    breaks: [
      { start: '12:00', end: '13:00' }
    ]
  },
  5: { // Viernes
    enabled: true,
    timeRanges: [
      { start: '08:00', end: '16:00' }
    ],
    interval: 30,
    breaks: [
      { start: '12:00', end: '13:00' }
    ]
  },
  0: { enabled: false, timeRanges: [], interval: 30 }, // Domingo
  6: { enabled: false, timeRanges: [], interval: 30 }  // Sábado
};
```

### Caso 2: Profesional de Consultoría

**Requisitos:**
- Horario flexible con pausas
- Diferentes intervalos por día
- Incluye fines de semana
- Horarios extendidos

**Implementación:**

```javascript
const horarioConsultoria = {
  1: { // Lunes
    enabled: true,
    timeRanges: [
      { start: '07:00', end: '12:00' },
      { start: '13:00', end: '20:00' }
    ],
    interval: 60,
    breaks: [
      { start: '12:00', end: '13:00' },
      { start: '15:00', end: '15:30' }
    ]
  },
  2: { // Martes
    enabled: true,
    timeRanges: [
      { start: '08:00', end: '18:00' }
    ],
    interval: 45,
    breaks: [
      { start: '12:00', end: '13:00' }
    ]
  },
  3: { // Miércoles
    enabled: true,
    timeRanges: [
      { start: '09:00', end: '12:00' },
      { start: '14:00', end: '19:00' }
    ],
    interval: 60,
    breaks: [
      { start: '12:00', end: '14:00' }
    ]
  },
  4: { // Jueves
    enabled: true,
    timeRanges: [
      { start: '08:00', end: '17:00' }
    ],
    interval: 45,
    breaks: [
      { start: '12:00', end: '13:00' }
    ]
  },
  5: { // Viernes
    enabled: true,
    timeRanges: [
      { start: '09:00', end: '16:00' }
    ],
    interval: 30,
    breaks: [
      { start: '12:00', end: '13:00' }
    ]
  },
  6: { // Sábado
    enabled: true,
    timeRanges: [
      { start: '10:00', end: '16:00' }
    ],
    interval: 60,
    breaks: [
      { start: '13:00', end: '14:00' }
    ]
  },
  0: { enabled: false, timeRanges: [], interval: 30 } // Domingo
};
```

### Caso 3: Profesional de Educación

**Requisitos:**
- Horario de mañana y tarde
- Pausas entre sesiones
- Intervalos variables
- Horarios de fin de semana

**Implementación:**

```javascript
const horarioEducacion = {
  1: { // Lunes
    enabled: true,
    timeRanges: [
      { start: '08:00', end: '11:00' },
      { start: '15:00', end: '18:00' }
    ],
    interval: 45,
    breaks: [
      { start: '11:00', end: '15:00' }
    ]
  },
  2: { // Martes
    enabled: true,
    timeRanges: [
      { start: '09:00', end: '12:00' },
      { start: '16:00', end: '19:00' }
    ],
    interval: 60,
    breaks: [
      { start: '12:00', end: '16:00' }
    ]
  },
  3: { // Miércoles
    enabled: true,
    timeRanges: [
      { start: '08:00', end: '12:00' },
      { start: '14:00', end: '17:00' }
    ],
    interval: 45,
    breaks: [
      { start: '12:00', end: '14:00' }
    ]
  },
  4: { // Jueves
    enabled: true,
    timeRanges: [
      { start: '09:00', end: '11:00' },
      { start: '15:00', end: '18:00' }
    ],
    interval: 60,
    breaks: [
      { start: '11:00', end: '15:00' }
    ]
  },
  5: { // Viernes
    enabled: true,
    timeRanges: [
      { start: '08:00', end: '12:00' }
    ],
    interval: 45,
    breaks: []
  },
  6: { // Sábado
    enabled: true,
    timeRanges: [
      { start: '10:00', end: '14:00' }
    ],
    interval: 60,
    breaks: [
      { start: '12:00', end: '12:30' }
    ]
  },
  0: { enabled: false, timeRanges: [], interval: 30 } // Domingo
};
```

## 🔧 Operaciones Avanzadas

### 1. Copiar Horario Entre Días

```javascript
// Copiar configuración del lunes al martes
const horarioActual = await ScheduleService.getProfessionalSchedule();
const nuevoHorario = ScheduleService.copyDaySchedule(horarioActual, 1, 2);

if (nuevoHorario) {
  await ScheduleService.saveProfessionalSchedule(nuevoHorario);
  console.log('Horario copiado exitosamente');
}
```

### 2. Validar Configuración

```javascript
const horario = await ScheduleService.getProfessionalSchedule();
const errores = ScheduleService.validateSchedule(horario);

if (errores.length > 0) {
  console.log('Errores encontrados:');
  errores.forEach(error => console.log(`- ${error}`));
} else {
  console.log('Horario válido');
}
```

### 3. Obtener Estadísticas

```javascript
const horario = await ScheduleService.getProfessionalSchedule();
const stats = ScheduleService.getScheduleStats(horario);

console.log('Estadísticas del horario:');
console.log(`- Días activos: ${stats.enabledDays}`);
console.log(`- Horas totales: ${stats.totalHours}h`);
console.log(`- Horas netas: ${stats.netHours}h`);
console.log(`- Pausas: ${stats.totalBreaks}`);
console.log(`- Capacidad semanal: ${stats.weeklyCapacity} citas`);
console.log(`- Intervalo promedio: ${stats.averageInterval} min`);
```

### 4. Generar Slots Disponibles

```javascript
const horario = await ScheduleService.getProfessionalSchedule();
const fecha = new Date('2024-01-15'); // Lunes
const slots = ScheduleService.generateAvailableSlots(horario, fecha);

console.log('Slots disponibles para el lunes:');
slots.forEach(slot => {
  console.log(`${slot.start} - ${slot.end}`);
});
```

### 5. Verificar Disponibilidad

```javascript
const horario = await ScheduleService.getProfessionalSchedule();
const fecha = new Date('2024-01-15');
const hora = '14:30';

const disponible = ScheduleService.isTimeSlotAvailable(horario, fecha, hora);
console.log(`¿Disponible a las ${hora}? ${disponible ? 'Sí' : 'No'}`);
```

## 📊 Análisis y Reportes

### 1. Vista Semanal

```javascript
const horario = await ScheduleService.getProfessionalSchedule();
const proximaSemana = ScheduleService.getNextWeekSchedule(horario);

console.log('Horarios de la próxima semana:');
proximaSemana.forEach(dia => {
  console.log(`${dia.dayName} (${dia.date}): ${dia.enabled ? 'Activo' : 'Inactivo'}`);
  if (dia.enabled) {
    console.log(`  - Rangos: ${dia.timeRanges.length}`);
    console.log(`  - Intervalo: ${dia.interval} min`);
  }
});
```

### 2. Exportar Horarios

```javascript
const horario = await ScheduleService.getProfessionalSchedule();
const exportData = ScheduleService.exportSchedule(horario);

console.log('Datos exportados:');
console.log(`- Generado: ${exportData.generatedAt}`);
console.log(`- Resumen: ${exportData.summary.enabledDays} días activos`);
console.log(`- Horas: ${exportData.summary.netHours}h`);
```

### 3. Detectar Conflictos

```javascript
const horario = await ScheduleService.getProfessionalSchedule();
const citas = [
  { date: '2024-01-15', time: '14:00' },
  { date: '2024-01-16', time: '09:00' }
];

const conflictos = ScheduleService.checkScheduleConflicts(horario, citas);

if (conflictos.length > 0) {
  console.log('Conflictos detectados:');
  conflictos.forEach(conflicto => {
    console.log(`- ${conflicto.message}`);
  });
} else {
  console.log('No hay conflictos');
}
```

## 🎯 Mejores Prácticas

### 1. Configuración Inicial

```javascript
// Siempre validar antes de guardar
const horario = ScheduleService.applyScheduleTemplate('9to5');
const errores = ScheduleService.validateSchedule(horario);

if (errores.length === 0) {
  await ScheduleService.saveProfessionalSchedule(horario);
  console.log('Horario configurado exitosamente');
} else {
  console.log('Errores de validación:', errores);
}
```

### 2. Manejo de Errores

```javascript
try {
  const horario = await ScheduleService.getProfessionalSchedule();
  const stats = ScheduleService.getScheduleStats(horario);
  
  if (stats.enabledDays === 0) {
    console.log('No hay días configurados');
    return;
  }
  
  // Continuar con la lógica...
} catch (error) {
  console.error('Error al obtener horarios:', error);
  // Manejar el error apropiadamente
}
```

### 3. Actualizaciones Incrementales

```javascript
// Actualizar solo un día específico
const horario = await ScheduleService.getProfessionalSchedule();
const lunes = horario[1] || {};

// Modificar solo el lunes
horario[1] = {
  ...lunes,
  timeRanges: [
    { start: '09:00', end: '17:00' }
  ],
  interval: 30
};

await ScheduleService.saveProfessionalSchedule(horario);
```

## 🔄 Flujos de Trabajo Comunes

### Flujo 1: Configuración Inicial

1. **Aplicar Plantilla Base**
   ```javascript
   const horario = ScheduleService.applyScheduleTemplate('flexible');
   ```

2. **Personalizar Según Necesidades**
   ```javascript
   horario[1].timeRanges[0].start = '08:00';
   horario[1].timeRanges[0].end = '12:00';
   ```

3. **Validar y Guardar**
   ```javascript
   const errores = ScheduleService.validateSchedule(horario);
   if (errores.length === 0) {
     await ScheduleService.saveProfessionalSchedule(horario);
   }
   ```

### Flujo 2: Modificación Diaria

1. **Obtener Horario Actual**
   ```javascript
   const horario = await ScheduleService.getProfessionalSchedule();
   ```

2. **Realizar Cambios**
   ```javascript
   horario[3].timeRanges.push({ start: '19:00', end: '21:00' });
   ```

3. **Verificar y Aplicar**
   ```javascript
   const errores = ScheduleService.validateSchedule(horario);
   if (errores.length === 0) {
     await ScheduleService.saveProfessionalSchedule(horario);
   }
   ```

### Flujo 3: Análisis Semanal

1. **Obtener Estadísticas**
   ```javascript
   const stats = ScheduleService.getScheduleStats(horario);
   ```

2. **Analizar Eficiencia**
   ```javascript
   const eficiencia = (stats.netHours / (stats.enabledDays * 8)) * 100;
   ```

3. **Tomar Decisiones**
   ```javascript
   if (eficiencia < 70) {
     console.log('Considerar optimizar horarios');
   }
   ```

## 📱 Integración con Componentes React Native

### Uso en ScheduleScreen

```javascript
import React, { useState, useEffect } from 'react';
import ScheduleService from '../services/ScheduleService';

export const ScheduleScreen = () => {
  const [schedule, setSchedule] = useState({});
  
  useEffect(() => {
    loadSchedule();
  }, []);
  
  const loadSchedule = async () => {
    const savedSchedule = await ScheduleService.getProfessionalSchedule();
    setSchedule(savedSchedule);
  };
  
  const applyTemplate = async (templateKey) => {
    const templateSchedule = ScheduleService.applyScheduleTemplate(templateKey);
    if (templateSchedule) {
      setSchedule(templateSchedule);
      await ScheduleService.saveProfessionalSchedule(templateSchedule);
    }
  };
  
  const copySchedule = async (fromDay, toDay) => {
    const newSchedule = ScheduleService.copyDaySchedule(schedule, fromDay, toDay);
    if (newSchedule) {
      setSchedule(newSchedule);
      await ScheduleService.saveProfessionalSchedule(newSchedule);
    }
  };
  
  // ... resto del componente
};
```

### Uso en WeeklyScheduleView

```javascript
import React from 'react';
import ScheduleService from '../services/ScheduleService';

export const WeeklyScheduleView = ({ schedule }) => {
  const stats = ScheduleService.getScheduleStats(schedule);
  const nextWeek = ScheduleService.getNextWeekSchedule(schedule);
  
  // ... renderizado del componente
};
```

## 🎉 Conclusión

Estos ejemplos demuestran la flexibilidad y potencia del nuevo sistema de configuración de horarios. Con las funcionalidades implementadas, los profesionales pueden:

- **Configurar horarios complejos** de manera sencilla
- **Aplicar plantillas predefinidas** para ahorrar tiempo
- **Gestionar pausas y descansos** de forma inteligente
- **Analizar la eficiencia** de sus horarios
- **Optimizar la productividad** con insights automáticos

El sistema está diseñado para ser intuitivo, robusto y escalable, proporcionando una base sólida para la gestión profesional de horarios.


