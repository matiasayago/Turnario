// Utilidades para manejo de fechas y tiempos

// Formatear fecha para mostrar
export const formatDate = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  };
  
  return dateObj.toLocaleDateString('es-ES', options);
};

// Formatear fecha corta
export const formatShortDate = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  const options: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  };
  
  return dateObj.toLocaleDateString('es-ES', options);
};

// Formatear hora
export const formatTime = (time: string): string => {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const minute = parseInt(minutes);
  
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  
  return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
};

// Formatear fecha y hora
export const formatDateTime = (date: Date | string, time: string): string => {
  const formattedDate = formatShortDate(date);
  const formattedTime = formatTime(time);
  return `${formattedDate} a las ${formattedTime}`;
};

// Obtener nombre del día
export const getDayName = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long'
  };
  
  return dateObj.toLocaleDateString('es-ES', options);
};

// Obtener nombre corto del día
export const getShortDayName = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'short'
  };
  
  return dateObj.toLocaleDateString('es-ES', options);
};

// Obtener nombre del mes
export const getMonthName = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  const options: Intl.DateTimeFormatOptions = {
    month: 'long'
  };
  
  return dateObj.toLocaleDateString('es-ES', options);
};

// Verificar si es hoy
export const isToday = (date: Date | string): boolean => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  
  return dateObj.toDateString() === today.toDateString();
};

// Verificar si es mañana
export const isTomorrow = (date: Date | string): boolean => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  return dateObj.toDateString() === tomorrow.toDateString();
};

// Verificar si es ayer
export const isYesterday = (date: Date | string): boolean => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  return dateObj.toDateString() === yesterday.toDateString();
};

// Obtener fecha relativa
export const getRelativeDate = (date: Date | string): string => {
  if (isToday(date)) return 'Hoy';
  if (isTomorrow(date)) return 'Mañana';
  if (isYesterday(date)) return 'Ayer';
  
  return formatDate(date);
};

// Obtener diferencia en días
export const getDaysDifference = (date1: Date | string, date2: Date | string): number => {
  const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
  const d2 = typeof date2 === 'string' ? new Date(date2) : date2;
  
  const timeDiff = d2.getTime() - d1.getTime();
  const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
  
  return daysDiff;
};

// Obtener diferencia en horas
export const getHoursDifference = (date1: Date | string, date2: Date | string): number => {
  const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
  const d2 = typeof date2 === 'string' ? new Date(date2) : date2;
  
  const timeDiff = d2.getTime() - d1.getTime();
  const hoursDiff = Math.ceil(timeDiff / (1000 * 3600));
  
  return hoursDiff;
};

// Obtener diferencia en minutos
export const getMinutesDifference = (date1: Date | string, date2: Date | string): number => {
  const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
  const d2 = typeof date2 === 'string' ? new Date(date2) : date2;
  
  const timeDiff = d2.getTime() - d1.getTime();
  const minutesDiff = Math.ceil(timeDiff / (1000 * 60));
  
  return minutesDiff;
};

// Agregar días a una fecha
export const addDays = (date: Date | string, days: number): Date => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const newDate = new Date(dateObj);
  newDate.setDate(dateObj.getDate() + days);
  return newDate;
};

// Agregar horas a una fecha
export const addHours = (date: Date | string, hours: number): Date => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const newDate = new Date(dateObj);
  newDate.setHours(dateObj.getHours() + hours);
  return newDate;
};

// Agregar minutos a una fecha
export const addMinutes = (date: Date | string, minutes: number): Date => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const newDate = new Date(dateObj);
  newDate.setMinutes(dateObj.getMinutes() + minutes);
  return newDate;
};

// Obtener fecha de inicio de semana
export const getStartOfWeek = (date: Date | string): Date => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const startOfWeek = new Date(dateObj);
  const day = dateObj.getDay();
  const diff = dateObj.getDate() - day + (day === 0 ? -6 : 1);
  startOfWeek.setDate(diff);
  startOfWeek.setHours(0, 0, 0, 0);
  return startOfWeek;
};

// Obtener fecha de fin de semana
export const getEndOfWeek = (date: Date | string): Date => {
  const startOfWeek = getStartOfWeek(date);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);
  return endOfWeek;
};

// Obtener fecha de inicio de mes
export const getStartOfMonth = (date: Date | string): Date => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const startOfMonth = new Date(dateObj);
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  return startOfMonth;
};

// Obtener fecha de fin de mes
export const getEndOfMonth = (date: Date | string): Date => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const endOfMonth = new Date(dateObj);
  endOfMonth.setMonth(dateObj.getMonth() + 1);
  endOfMonth.setDate(0);
  endOfMonth.setHours(23, 59, 59, 999);
  return endOfMonth;
};

// Verificar si una fecha está en el rango
export const isDateInRange = (date: Date | string, startDate: Date | string, endDate: Date | string): boolean => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
  
  return dateObj >= start && dateObj <= end;
};

// Obtener edad desde fecha de nacimiento
export const getAge = (birthDate: Date | string): number => {
  const birth = typeof birthDate === 'string' ? new Date(birthDate) : birthDate;
  const today = new Date();
  
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
};

// Formatear duración en minutos a formato legible
export const formatDuration = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${remainingMinutes}min`;
};

// Obtener fecha en formato ISO para inputs de fecha
export const getDateInputValue = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toISOString().split('T')[0];
};

// Obtener hora en formato HH:MM para inputs de tiempo
export const getTimeInputValue = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toTimeString().slice(0, 5);
};

// Verificar si es fin de semana
export const isWeekend = (date: Date | string): boolean => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const day = dateObj.getDay();
  return day === 0 || day === 6;
};

// Obtener próximas fechas disponibles (excluyendo fines de semana)
export const getNextAvailableDates = (count: number, excludeWeekends: boolean = true): Date[] => {
  const dates: Date[] = [];
  let currentDate = new Date();
  
  while (dates.length < count) {
    currentDate = addDays(currentDate, 1);
    
    if (!excludeWeekends || !isWeekend(currentDate)) {
      dates.push(new Date(currentDate));
    }
  }
  
  return dates;
};

// Obtener horarios disponibles en intervalos
export const getTimeSlots = (startTime: string, endTime: string, interval: number): string[] => {
  const slots: string[] = [];
  const start = new Date(`2000-01-01T${startTime}`);
  const end = new Date(`2000-01-01T${endTime}`);
  
  let current = new Date(start);
  
  while (current < end) {
    slots.push(current.toTimeString().slice(0, 5));
    current = addMinutes(current, interval);
  }
  
  return slots;
};

