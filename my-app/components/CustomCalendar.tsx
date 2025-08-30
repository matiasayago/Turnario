import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface CustomCalendarProps {
  onDateSelect: (date: string) => void;
  markedDates: { [key: string]: any };
  selectedDate?: string;
}

export default function CustomCalendar({ onDateSelect, markedDates, selectedDate }: CustomCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

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
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const formatDateString = (day: number) => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth() + 1;
    return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  };

  const isDateAvailable = (day: number | null) => {
    if (!day) return false;
    const dateString = formatDateString(day);
    return markedDates[dateString]?.marked;
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
    const todayString = today.toISOString().split('T')[0];
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
          <Text key={index} style={styles.weekDayText}>
            {day}
          </Text>
        ))}
      </View>

      {/* Días del mes */}
      <View style={styles.daysGrid}>
        {days.map((day, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.dayButton,
              !day && styles.emptyDay,
              isToday(day) && styles.todayButton,
              isDateSelected(day) && styles.selectedDayButton,
              isDateAvailable(day) && !isDateSelected(day) && styles.availableDayButton,
            ]}
            onPress={() => handleDatePress(day)}
            disabled={!day || !isDateAvailable(day)}
          >
            {day && (
              <>
                <Text style={[
                  styles.dayText,
                  isToday(day) && styles.todayText,
                  isDateSelected(day) && styles.selectedDayText,
                  isDateAvailable(day) && !isDateSelected(day) && styles.availableDayText,
                  !isDateAvailable(day) && styles.unavailableDayText,
                ]}>
                  {day}
                </Text>
                {isDateAvailable(day) && (
                  <View style={[
                    styles.availabilityDot,
                    isDateSelected(day) && styles.selectedAvailabilityDot,
                  ]} />
                )}
              </>
            )}
          </TouchableOpacity>
        ))}
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
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
  },
  availableDayText: {
    color: '#333',
    fontWeight: '500',
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
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4CAF50',
    marginTop: 2,
  },
  selectedAvailabilityDot: {
    backgroundColor: 'white',
  },
});

