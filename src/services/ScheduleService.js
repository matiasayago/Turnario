import AsyncStorage from '@react-native-async-storage/async-storage';

class ScheduleService {
  // Plantillas predefinidas de horarios
  static getScheduleTemplates() {
    return {
      '9to5': {
        name: 'Horario 9-5',
        description: 'Horario laboral estándar de 9 AM a 5 PM',
        schedule: {
          1: { enabled: true, timeRanges: [{ start: '09:00', end: '17:00' }], interval: 30 },
          2: { enabled: true, timeRanges: [{ start: '09:00', end: '17:00' }], interval: 30 },
          3: { enabled: true, timeRanges: [{ start: '09:00', end: '17:00' }], interval: 30 },
          4: { enabled: true, timeRanges: [{ start: '09:00', end: '17:00' }], interval: 30 },
          5: { enabled: true, timeRanges: [{ start: '09:00', end: '17:00' }], interval: 30 },
          0: { enabled: false, timeRanges: [], interval: 30 },
          6: { enabled: false, timeRanges: [], interval: 30 }
        }
      },
      'flexible': {
        name: 'Horario Flexible',
        description: 'Horario con pausa para almuerzo',
        schedule: {
          1: { enabled: true, timeRanges: [{ start: '08:00', end: '12:00' }, { start: '13:00', end: '18:00' }], interval: 45, breaks: [{ start: '12:00', end: '13:00' }] },
          2: { enabled: true, timeRanges: [{ start: '08:00', end: '12:00' }, { start: '13:00', end: '18:00' }], interval: 45, breaks: [{ start: '12:00', end: '13:00' }] },
          3: { enabled: true, timeRanges: [{ start: '08:00', end: '12:00' }, { start: '13:00', end: '18:00' }], interval: 45, breaks: [{ start: '12:00', end: '13:00' }] },
          4: { enabled: true, timeRanges: [{ start: '08:00', end: '12:00' }, { start: '13:00', end: '18:00' }], interval: 45, breaks: [{ start: '12:00', end: '13:00' }] },
          5: { enabled: true, timeRanges: [{ start: '08:00', end: '12:00' }, { start: '13:00', end: '18:00' }], interval: 45, breaks: [{ start: '12:00', end: '13:00' }] },
          0: { enabled: false, timeRanges: [], interval: 45 },
          6: { enabled: false, timeRanges: [], interval: 45 }
        }
      },
      'weekend': {
        name: 'Incluye Fines de Semana',
        description: 'Horario completo incluyendo sábados',
        schedule: {
          1: { enabled: true, timeRanges: [{ start: '09:00', end: '18:00' }], interval: 30 },
          2: { enabled: true, timeRanges: [{ start: '09:00', end: '18:00' }], interval: 30 },
          3: { enabled: true, timeRanges: [{ start: '09:00', end: '18:00' }], interval: 30 },
          4: { enabled: true, timeRanges: [{ start: '09:00', end: '18:00' }], interval: 30 },
          5: { enabled: true, timeRanges: [{ start: '09:00', end: '18:00' }], interval: 30 },
          6: { enabled: true, timeRanges: [{ start: '10:00', end: '16:00' }], interval: 45 },
          0: { enabled: false, timeRanges: [], interval: 30 }
        }
      }
    };
  }

  // Aplicar plantilla de horario
  static applyScheduleTemplate(templateKey) {
    const templates = this.getScheduleTemplates();
    return templates[templateKey]?.schedule || null;
  }

  // Copiar horario de un día a otro
  static copyDaySchedule(schedule, fromDay, toDay) {
    if (!schedule[fromDay] || !schedule[fromDay].enabled) {
      return false;
    }

    const newSchedule = {
      ...schedule,
      [toDay]: {
        ...schedule[fromDay],
        enabled: true
      }
    };

    return newSchedule;
  }

  // Generar slots de tiempo disponibles basados en la configuración del profesional
  static generateAvailableSlots(schedule, date) {
    const dayOfWeek = date.getDay();
    const daySchedule = schedule[dayOfWeek];
    
    if (!daySchedule?.enabled || !daySchedule.timeRanges) {
      return [];
    }

    const availableSlots = [];
    const { timeRanges, interval, breaks = [] } = daySchedule;

    timeRanges.forEach(range => {
      const slots = this.generateSlotsFromRange(range, interval, breaks);
      availableSlots.push(...slots);
    });

    return availableSlots;
  }

  // Generar slots individuales desde un rango de tiempo, considerando pausas
  static generateSlotsFromRange(range, interval, breaks = []) {
    const slots = [];
    const startTime = this.parseTime(range.start);
    const endTime = this.parseTime(range.end);
    
    let currentTime = startTime;
    
    while (currentTime < endTime) {
      const slotEnd = new Date(currentTime.getTime() + interval * 60000);
      
      if (slotEnd <= endTime) {
        // Verificar si el slot se superpone con alguna pausa
        const isBreakTime = breaks.some(breakTime => {
          const breakStart = this.parseTime(breakTime.start);
          const breakEnd = this.parseTime(breakTime.end);
          return (currentTime < breakEnd && slotEnd > breakStart);
        });

        if (!isBreakTime) {
          slots.push({
            start: this.formatTime(currentTime),
            end: this.formatTime(slotEnd),
            available: true
          });
        }
      }
      
      currentTime = slotEnd;
    }
    
    return slots;
  }

  // Parsear tiempo en formato HH:MM a Date object
  static parseTime(timeString) {
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  }

  // Formatear Date object a formato HH:MM
  static formatTime(date) {
    return date.toTimeString().slice(0, 5);
  }

  // Verificar si un horario específico está disponible
  static isTimeSlotAvailable(schedule, date, time) {
    const dayOfWeek = date.getDay();
    const daySchedule = schedule[dayOfWeek];
    
    if (!daySchedule?.enabled || !daySchedule.timeRanges) {
      return false;
    }

    const targetTime = this.parseTime(time);
    
    // Verificar si está en algún rango de tiempo
    const inTimeRange = daySchedule.timeRanges.some(range => {
      const startTime = this.parseTime(range.start);
      const endTime = this.parseTime(range.end);
      
      return targetTime >= startTime && targetTime < endTime;
    });

    if (!inTimeRange) return false;

    // Verificar que no esté en una pausa
    if (daySchedule.breaks) {
      const inBreak = daySchedule.breaks.some(breakTime => {
        const breakStart = this.parseTime(breakTime.start);
        const breakEnd = this.parseTime(breakTime.end);
        
        return targetTime >= breakStart && targetTime < breakEnd;
      });

      if (inBreak) return false;
    }

    return true;
  }

  // Obtener horarios guardados del profesional
  static async getProfessionalSchedule() {
    try {
      const savedSchedule = await AsyncStorage.getItem('professional_schedule');
      return savedSchedule ? JSON.parse(savedSchedule) : {};
    } catch (error) {
      console.error('Error al obtener horarios:', error);
      return {};
    }
  }

  // Guardar horarios del profesional
  static async saveProfessionalSchedule(schedule) {
    try {
      await AsyncStorage.setItem('professional_schedule', JSON.stringify(schedule));
      return true;
    } catch (error) {
      console.error('Error al guardar horarios:', error);
      return false;
    }
  }

  // Obtener estadísticas de horarios
  static getScheduleStats(schedule) {
    const enabledDays = Object.values(schedule).filter(day => day?.enabled).length;
    const totalRanges = Object.values(schedule).reduce((total, day) => {
      return total + (day?.timeRanges?.length || 0);
    }, 0);
    
    const totalBreaks = Object.values(schedule).reduce((total, day) => {
      return total + (day?.breaks?.length || 0);
    }, 0);
    
    const totalHours = Object.values(schedule).reduce((total, day) => {
      if (!day?.enabled || !day.timeRanges) return total;
      
      return total + day.timeRanges.reduce((dayTotal, range) => {
        const start = this.parseTime(range.start);
        const end = this.parseTime(range.end);
        const duration = (end - start) / (1000 * 60 * 60); // Convertir a horas
        return dayTotal + duration;
      }, 0);
    }, 0);

    const breakHours = Object.values(schedule).reduce((total, day) => {
      if (!day?.enabled || !day.breaks) return total;
      
      return total + day.breaks.reduce((dayTotal, breakTime) => {
        const start = this.parseTime(breakTime.start);
        const end = this.parseTime(breakTime.end);
        const duration = (end - start) / (1000 * 60 * 60);
        return dayTotal + duration;
      }, 0);
    }, 0);

    const netHours = Math.max(0, totalHours - breakHours);
    const averageInterval = Object.values(schedule).reduce((total, day) => {
      return total + (day?.interval || 30);
    }, 0) / Math.max(enabledDays, 1);

    // Calcular capacidad semanal (citas posibles)
    const weeklyCapacity = Object.values(schedule).reduce((total, day) => {
      if (!day?.enabled || !day.timeRanges) return total;
      
      return total + day.timeRanges.reduce((dayTotal, range) => {
        const start = this.parseTime(range.start);
        const end = this.parseTime(range.end);
        const duration = (end - start) / (1000 * 60 * 60);
        const breakDuration = day.breaks ? day.breaks.reduce((breakTotal, breakTime) => {
          const breakStart = this.parseTime(breakTime.start);
          const breakEnd = this.parseTime(breakTime.end);
          return breakTotal + (breakEnd - breakStart) / (1000 * 60 * 60);
        }, 0) : 0;
        
        const netDuration = Math.max(0, duration - breakDuration);
        return dayTotal + Math.floor(netDuration * 60 / (day.interval || 30));
      }, 0);
    }, 0);

    return {
      enabledDays,
      totalRanges,
      totalBreaks,
      totalHours: Math.round(totalHours * 10) / 10,
      breakHours: Math.round(breakHours * 10) / 10,
      netHours: Math.round(netHours * 10) / 10,
      averageInterval: Math.round(averageInterval),
      weeklyCapacity
    };
  }

  // Validar configuración de horarios
  static validateSchedule(schedule) {
    const errors = [];
    
    Object.entries(schedule).forEach(([dayId, day]) => {
      if (day?.enabled && (!day.timeRanges || day.timeRanges.length === 0)) {
        errors.push(`El día ${this.getDayName(dayId)} está habilitado pero no tiene rangos de tiempo configurados`);
      }
      
      if (day?.timeRanges) {
        // Verificar que los rangos no se superpongan
        const sortedRanges = [...day.timeRanges].sort((a, b) => 
          a.start.localeCompare(b.start)
        );
        
        for (let i = 0; i < sortedRanges.length - 1; i++) {
          if (sortedRanges[i].end > sortedRanges[i + 1].start) {
            errors.push(`Los rangos de tiempo del día ${this.getDayName(dayId)} se superponen`);
            break;
          }
        }
        
        // Verificar que cada rango tenga inicio y fin válidos
        day.timeRanges.forEach((range, index) => {
          if (!range.start || !range.end) {
            errors.push(`El rango ${index + 1} del día ${this.getDayName(dayId)} no tiene hora de inicio o fin`);
          } else if (range.start >= range.end) {
            errors.push(`El rango ${index + 1} del día ${this.getDayName(dayId)} tiene hora de inicio mayor o igual a la de fin`);
          }
        });
      }

      // Validar pausas si existen
      if (day?.breaks) {
        day.breaks.forEach((breakTime, index) => {
          if (!breakTime.start || !breakTime.end) {
            errors.push(`La pausa ${index + 1} del día ${this.getDayName(dayId)} no tiene hora de inicio o fin`);
          } else if (breakTime.start >= breakTime.end) {
            errors.push(`La pausa ${index + 1} del día ${this.getDayName(dayId)} tiene hora de inicio mayor o igual a la de fin`);
          }
        });

        // Verificar que las pausas estén dentro de los rangos de tiempo
        if (day.timeRanges && day.breaks) {
          day.breaks.forEach((breakTime, breakIndex) => {
            const breakStart = this.parseTime(breakTime.start);
            const breakEnd = this.parseTime(breakTime.end);
            
            const isWithinRange = day.timeRanges.some(range => {
              const rangeStart = this.parseTime(range.start);
              const rangeEnd = this.parseTime(range.end);
              return breakStart >= rangeStart && breakEnd <= rangeEnd;
            });

            if (!isWithinRange) {
              errors.push(`La pausa ${breakIndex + 1} del día ${this.getDayName(dayId)} está fuera de los rangos de tiempo configurados`);
            }
          });
        }
      }
    });
    
    return errors;
  }

  // Obtener nombre del día
  static getDayName(dayId) {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return days[dayId] || 'Día desconocido';
  }

  // Obtener horarios para la próxima semana
  static getNextWeekSchedule(schedule, startDate = new Date()) {
    const weekSchedule = [];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      const dayOfWeek = date.getDay();
      const daySchedule = schedule[dayOfWeek];
      
      weekSchedule.push({
        date: date.toISOString().split('T')[0],
        dayName: this.getDayName(dayOfWeek),
        enabled: daySchedule?.enabled || false,
        timeRanges: daySchedule?.timeRanges || [],
        breaks: daySchedule?.breaks || [],
        interval: daySchedule?.interval || 30
      });
    }
    
    return weekSchedule;
  }

  // Exportar horarios en formato legible
  static exportSchedule(schedule) {
    const exportData = {
      generatedAt: new Date().toISOString(),
      schedule: {},
      summary: this.getScheduleStats(schedule)
    };
    
    Object.entries(schedule).forEach(([dayId, day]) => {
      if (day?.enabled) {
        exportData.schedule[this.getDayName(dayId)] = {
          enabled: true,
          timeRanges: day.timeRanges || [],
          breaks: day.breaks || [],
          interval: day.interval || 30
        };
      }
    });
    
    return exportData;
  }

  // Obtener horarios en formato para API
  static getScheduleForAPI(schedule) {
    const apiSchedule = {};
    
    Object.entries(schedule).forEach(([dayId, day]) => {
      if (day?.enabled) {
        apiSchedule[dayId] = {
          enabled: true,
          timeRanges: day.timeRanges || [],
          breaks: day.breaks || [],
          interval: day.interval || 30
        };
      }
    });
    
    return apiSchedule;
  }

  // Verificar conflictos de horarios
  static checkScheduleConflicts(schedule, appointments = []) {
    const conflicts = [];
    
    appointments.forEach(appointment => {
      const appointmentDate = new Date(appointment.date);
      const dayOfWeek = appointmentDate.getDay();
      const daySchedule = schedule[dayOfWeek];
      
      if (!daySchedule?.enabled) {
        conflicts.push({
          type: 'day_disabled',
          appointment,
          message: `El día ${this.getDayName(dayOfWeek)} no está habilitado`
        });
        return;
      }

      if (!this.isTimeSlotAvailable(schedule, appointmentDate, appointment.time)) {
        conflicts.push({
          type: 'time_unavailable',
          appointment,
          message: `El horario ${appointment.time} no está disponible en ${this.getDayName(dayOfWeek)}`
        });
      }
    });
    
    return conflicts;
  }
}

export default ScheduleService;
