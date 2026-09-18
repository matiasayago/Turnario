// @ts-nocheck � beta
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface CustomCalendarProps {
  onDateSelect: (date: string) => void;
  markedDates: { [key: string]: any };
  selectedDate?: string;
}

export default function CustomCalendar({ onDateSelect, markedDates, selectedDate }: CustomCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Log para debug
  React.useEffect(() => {
    const markedCount = Object.keys(markedDates || {}).length;
    console.log('📅 CustomCalendar - markedDates:', markedCount, 'fechas totales');
    if (markedCount > 0) {
      const keys = Object.keys(markedDates || {});
      console.log('📅 CustomCalendar - Primeras 5 fechas:', keys.slice(0, 5));
      console.log('📅 CustomCalendar - Ejemplo:', keys[0], markedDates[keys[0]]);
    } else {
      console.warn('⚠︝ CustomCalendar - No hay fechas marcadas');
    }
  }, [markedDates]);

  // Contar fechas disponibles en el mes actual
  React.useEffect(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth() + 1;
    const monthStr = month.toString().padStart(2, '0');
    const prefix = `${year}-${monthStr}-`;
    
    const datesInMonth = Object.keys(markedDates || {}).filter(date => date.startsWith(prefix));
    console.log(`📆 Mes actual (${currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}): ${datesInMonth.length} fechas disponibles`);
    
    if (datesInMonth.length > 0) {
      console.log(`📆 Primeras 3 fechas:`, datesInMonth.slice(0, 3).join(', '));
    } else {
      console.warn(`⚠︝ No hay fechas disponibles en este mes`);
    }
  }, [currentMonth, markedDates]);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    
    // Agregar días del mes anterior para completar la primera semana
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Agregar todos los días del mes
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    
    return days;
  };

  const getMonthName = (date: Date) => {
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return months[date.getMonth()];
  };

  const getYear = (date: Date) => {
    return date.getFullYear();
  };

  const goToPreviousMonth = () => {
    const newMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
    setCurrentMonth(newMonth);
    console.log(`◀︝ Mes anterior: ${newMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}`);
  };

  const goToNextMonth = () => {
    const newMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    setCurrentMonth(newMonth);
    console.log(`▶︝ Mes siguiente: ${newMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}`);
  };

  const formatDateString = (day: number) => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth() + 1;
    return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  };

  const isDateAvailable = (day: number | null) => {
    if (!day) return false;
    
    try {
      const dateString = formatDateString(day);
      const isAvailable = markedDates && markedDates[dateString]?.marked === true;
      
      return isAvailable;
    } catch (error) {
      // Silenciar error - no afecta funcionalidad
      return false;
    }
  };

  const isDateSelected = (day: number | null) => {
    if (!day) return false;
    const dateString = formatDateString(day);
    return dateString === selectedDate;
  };

  const isToday = (day: number | null) => {
    if (!day) return false;
    const today = new Date();
    const dateString = formatDateString(day);
    const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    return dateString === todayString;
  };

  const handleDatePress = (day: number | null) => {
    if (!day || !isDateAvailable(day)) return;
    const dateString = formatDateString(day);
    onDateSelect(dateString);
  };

  const days = getDaysInMonth(currentMonth);
  const weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  return (
    <View style={styles.container}>
      {/* Header del mes */}
      <View style={styles.header}>
        <TouchableOpacity onPress={goToPreviousMonth} style={styles.arrowButton}>
          <Ionicons name="chevron-back" size={24} color="#667eea" />
        </TouchableOpacity>
        <Text style={styles.monthYear}>
          {getMonthName(currentMonth)} {getYear(currentMonth)}
        </Text>
        <TouchableOpacity onPress={goToNextMonth} style={styles.arrowButton}>
          <Ionicons name="chevron-forward" size={24} color="#667eea" />
        </TouchableOpacity>
      </View>

      {/* Días de la semana */}
      <View style={styles.weekDays}>
        {weekDays.map((day, index) => (
          <Text key={`weekday-${day}-${index}`} style={styles.weekDayText}>
            {day}
          </Text>
        ))}
      </View>

      {/* Días del mes */}
      <View style={styles.daysGrid}>
        {days.map((day, index) => {
          const dayIsAvailable = isDateAvailable(day);
          const dayIsToday = isToday(day);
          const dayIsSelected = isDateSelected(day);
          
          return (
            <TouchableOpacity
              key={`day-${day}-${index}`}
              style={[
                styles.dayButton,
                !day && styles.emptyDay,
                dayIsToday && styles.todayButton,
                dayIsSelected && styles.selectedDayButton,
                dayIsAvailable && !dayIsSelected && styles.availableDayButton,
              ]}
              onPress={() => handleDatePress(day)}
              disabled={!day || !dayIsAvailable}
            >
              {day && (
                <>
                  <Text style={[
                    styles.dayText,
                    dayIsToday && styles.todayText,
                    dayIsSelected && styles.selectedDayText,
                    dayIsAvailable && !dayIsSelected && styles.availableDayText,
                    !dayIsAvailable && styles.unavailableDayText,
                  ]}>
                    {day}
                  </Text>
                  {dayIsAvailable && (
                    <View style={[
                      styles.availabilityDot,
                      dayIsSelected && styles.selectedAvailabilityDot,
                    ]} />
                  )}
                </>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  arrowButton: {
    padding: 8,
  },
  monthYear: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  weekDays: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  weekDayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 10,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayButton: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyDay: {
    backgroundColor: 'transparent',
  },
  dayText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#999',
  },
  todayButton: {
    backgroundColor: '#f0f8ff',
    borderRadius: 20,
  },
  todayText: {
    color: '#667eea',
    fontWeight: '600',
  },
  availableDayButton: {
    backgroundColor: '#e8f5e9',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  availableDayText: {
    color: '#2E7D32',
    fontWeight: '600',
  },
  selectedDayButton: {
    backgroundColor: '#667eea',
    borderRadius: 20,
  },
  selectedDayText: {
    color: 'white',
    fontWeight: '600',
  },
  unavailableDayText: {
    color: '#ccc',
  },
  availabilityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginTop: 4,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.5,
    shadowRadius: 2,
    elevation: 2,
  },
  selectedAvailabilityDot: {
    backgroundColor: 'white',
  },
});

