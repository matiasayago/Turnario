// @ts-nocheck ? beta
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

interface TimeSlot {
  start: string;
  end: string;
  isCustom?: boolean;
}

interface DateSchedule {
  date: string;
  timeSlots: TimeSlot[];
  isAvailable: boolean;
}

interface FullCalendarProps {
  selectedDates: string[];
  onDateSelect: (date: string) => void;
  onDateDeselect: (date: string) => void;
  currentMonth?: Date;
  onMonthChange?: (month: Date) => void;
  onDateScheduleEdit?: (date: string) => void;
  dateSchedules?: { [date: string]: DateSchedule };
  defaultTimeSlots?: TimeSlot[];
  /** Vista solo lectura: toca un d?a para ver citas + franjas (no selecci?n m?ltiple). */
  variant?: 'configure' | 'overview';
  /** YYYY-MM-DD ? cantidad de citas ese d?a */
  appointmentsByDate?: Record<string, number>;
  onOverviewDayPress?: (dateStr: string) => void;
}

const FullCalendar: React.FC<FullCalendarProps> = ({
  selectedDates,
  onDateSelect,
  onDateDeselect,
  currentMonth = new Date(),
  onMonthChange,
  onDateScheduleEdit,
  dateSchedules = {},
  defaultTimeSlots = [],
  variant = 'configure',
  appointmentsByDate = {},
  onOverviewDayPress,
}) => {
  // Validar y sanitizar currentMonth
  const validCurrentMonth = currentMonth && currentMonth instanceof Date && !isNaN(currentMonth.getTime()) 
    ? currentMonth 
    : new Date();
  
  const [displayMonth, setDisplayMonth] = useState(validCurrentMonth);

  const monthYearKey = `${validCurrentMonth.getFullYear()}-${validCurrentMonth.getMonth()}`;
  React.useEffect(() => {
    if (!currentMonth || !(currentMonth instanceof Date) || isNaN(currentMonth.getTime())) return;
    setDisplayMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1));
  }, [monthYearKey]);

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const dayNames = ['Dom', 'Lun', 'Mar', 'Mi?', 'Jue', 'Vie', 'S?b'];

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(displayMonth);
    if (direction === 'prev') {
      newMonth.setMonth(displayMonth.getMonth() - 1);
      console.log(`?? Mes anterior: ${monthNames[newMonth.getMonth()]} ${newMonth.getFullYear()}`);
    } else {
      newMonth.setMonth(displayMonth.getMonth() + 1);
      console.log(`?? Mes siguiente: ${monthNames[newMonth.getMonth()]} ${newMonth.getFullYear()}`);
    }
    setDisplayMonth(newMonth);
    onMonthChange?.(newMonth);
  };

  const getDaysInMonth = (date: Date) => {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      console.error('? Fecha inv?lida en getDaysInMonth:', date);
      return [];
    }

    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // D?as del mes anterior para completar la primera semana
    const prevMonth = new Date(year, month - 1, 0);
    const daysInPrevMonth = prevMonth.getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const prevDate = new Date(year, month - 1, daysInPrevMonth - i);
      if (isNaN(prevDate.getTime())) continue;
      days.push({
        date: prevDate,
        isCurrentMonth: false,
        isToday: false,
      });
    }

    // D?as del mes actual
    const today = new Date();
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(year, month, day);
      if (isNaN(currentDate.getTime())) {
        console.error('? Fecha inv?lida generada:', { year, month, day });
        continue;
      }
      days.push({
        date: currentDate,
        isCurrentMonth: true,
        isToday: currentDate.toDateString() === today.toDateString(),
      });
    }

    // D?as del mes siguiente para completar la ?ltima semana
    const remainingDays = 42 - days.length; // 6 semanas x 7 d?as
    for (let day = 1; day <= remainingDays; day++) {
      const nextDate = new Date(year, month + 1, day);
      if (isNaN(nextDate.getTime())) continue;
      days.push({
        date: nextDate,
        isCurrentMonth: false,
        isToday: false,
      });
    }

    return days;
  };

  const formatDate = (date: Date) => {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      console.error('? Fecha inv?lida en formatDate:', date);
      return '';
    }
    // Usar fecha local para evitar problemas de zona horaria
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`; // YYYY-MM-DD
  };

  const isDateSelected = (date: Date) => {
    const dateString = formatDate(date);
    const isSelected = selectedDates.includes(dateString);
    if (isSelected) {
      console.log(`? Fecha seleccionada encontrada: ${dateString}`);
    }
    return isSelected;
  };

  /** "Disponible" en el sentido visual: solo días con horario guardado o elegidos en el modal (no todos los días futuros). */
  const isDateAvailable = (date: Date) => {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      return false;
    }

    const dateString = formatDate(date);
    const schedule = getDateSchedule(date);
    const hasSavedSlots =
      schedule &&
      schedule.isAvailable !== false &&
      Array.isArray(schedule.timeSlots) &&
      schedule.timeSlots.length > 0;

    if (variant === 'configure') {
      if (selectedDates.includes(dateString)) return true;
      if (hasSavedSlots) return true;
      return false;
    }

    // overview: mismo criterio que reservas — solo fechas con date-schedule en BD
    return Boolean(hasSavedSlots);
  };

  const handleDatePress = (date: Date) => {
    const dateString = formatDate(date);
    if (variant === 'overview') {
      onOverviewDayPress?.(dateString);
      return;
    }
    if (isDateSelected(date)) {
      onDateDeselect(dateString);
    } else {
      onDateSelect(dateString);
    }
  };

  const handleScheduleEdit = (date: Date) => {
    const dateString = formatDate(date);
    onDateScheduleEdit?.(dateString);
  };

  const getDateSchedule = (date: Date) => {
    const dateString = formatDate(date);
    return dateSchedules[dateString];
  };

  const hasCustomSchedule = (date: Date) => {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      return false;
    }
    const schedule = getDateSchedule(date);
    return schedule && schedule.timeSlots && schedule.timeSlots.some((slot: any) => slot.isCustom);
  };

  const days = getDaysInMonth(displayMonth);

  // Debug: Log de fechas seleccionadas
  React.useEffect(() => {
    console.log('??? FullCalendar - Mes actual:', displayMonth);
    console.log('??? FullCalendar - Fechas seleccionadas:', selectedDates.length);
    console.log('??? FullCalendar - Horarios configurados:', Object.keys(dateSchedules).length);
    console.log('??? FullCalendar - Total de d?as generados:', days.length);
    
    // Contar fechas disponibles en el mes actual
    const availableDaysInMonth = days.filter(day => 
      day.isCurrentMonth && isDateAvailable(day.date)
    ).length;
    console.log(`?? Fechas disponibles en ${monthNames[displayMonth.getMonth()]} ${displayMonth.getFullYear()}: ${availableDaysInMonth}`);
  }, [displayMonth, selectedDates, dateSchedules]);

  return (
    <View style={styles.container}>
      {/* Header del calendario */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigateMonth('prev')}
        >
          <Ionicons name="chevron-back" size={24} color="#667eea" />
        </TouchableOpacity>
        
        <View style={styles.monthContainer}>
          <Text style={styles.monthText}>
            {monthNames[displayMonth.getMonth()]} {displayMonth.getFullYear()}
          </Text>
        </View>
        
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigateMonth('next')}
        >
          <Ionicons name="chevron-forward" size={24} color="#667eea" />
        </TouchableOpacity>
      </View>

      {/* D?as de la semana */}
      <View style={styles.dayNamesContainer}>
        {dayNames.map((dayName) => (
          <Text key={dayName} style={styles.dayName}>
            {dayName}
          </Text>
        ))}
      </View>

       {/* Grid del calendario */}
       <View style={styles.calendarGrid}>
         {days.map((day, index) => {
           // Validar que day.date sea v?lido
           if (!day || !day.date || !(day.date instanceof Date) || isNaN(day.date.getTime())) {
             console.error('? D?a inv?lido en el mapa:', { day, index });
             return null;
           }
           
           const dateStr = formatDate(day.date);
           const apptCount = appointmentsByDate[dateStr] ?? 0;
           const hasAppointments = apptCount > 0;
           const isSelected = variant === 'configure' && isDateSelected(day.date);
           const isPast = day.date < new Date(new Date().setHours(0, 0, 0, 0));
           const hasCustom = hasCustomSchedule(day.date);
           const schedule = getDateSchedule(day.date);
           const isAvailable = isDateAvailable(day.date);
           
           return (
             <View key={index} style={styles.dayContainer}>
               <TouchableOpacity
                 style={[
                   styles.dayButton,
                   !day.isCurrentMonth && styles.dayButtonOtherMonth,
                   day.isToday && styles.dayButtonToday,
                   isSelected && styles.dayButtonSelected,
                   isPast && styles.dayButtonPast,
                   variant === 'overview' && hasAppointments && styles.dayButtonWithAppointments,
                   variant === 'configure' && isAvailable && !isSelected && styles.dayButtonAvailable,
                   variant === 'overview' &&
                     !hasAppointments &&
                     isAvailable &&
                     !isPast &&
                     styles.dayButtonAvailable,
                 ]}
                 onPress={() => !isPast && handleDatePress(day.date)}
                 disabled={isPast}
               >
                 <Text
                   style={[
                     styles.dayText,
                     !day.isCurrentMonth && styles.dayTextOtherMonth,
                     day.isToday && styles.dayTextToday,
                     isSelected && styles.dayTextSelected,
                     isPast && styles.dayTextPast,
                     variant === 'configure' && isAvailable && !isSelected && styles.dayTextAvailable,
                     variant === 'overview' &&
                       !isPast &&
                       isAvailable &&
                       !hasAppointments &&
                       styles.dayTextAvailable,
                     variant === 'overview' &&
                       !isPast &&
                       hasAppointments &&
                       styles.dayTextWithAppointments,
                   ]}
                 >
                   {day.date.getDate()}
                 </Text>
                 {variant === 'configure' && isSelected && (
                   <View style={styles.selectedIndicator}>
                     <Ionicons name="checkmark" size={12} color="#fff" />
                   </View>
                 )}
                 {variant === 'overview' && hasAppointments && (
                   <View style={styles.appointmentCountBadge}>
                     <Text style={styles.appointmentCountText}>{apptCount}</Text>
                   </View>
                 )}
               </TouchableOpacity>
               
               {variant === 'configure' && isSelected && !isPast && (
                 <TouchableOpacity
                   style={styles.scheduleEditButton}
                   onPress={() => handleScheduleEdit(day.date)}
                 >
                   <Ionicons 
                     name={hasCustom ? "time" : "time-outline"} 
                     size={12} 
                     color={hasCustom ? "#FF6B35" : "#667eea"} 
                   />
                 </TouchableOpacity>
               )}
               
               {/* Indicador de horarios personalizados */}
               {hasCustom && (
                 <View style={styles.customScheduleIndicator}>
                   <View style={styles.customScheduleDot} />
                 </View>
               )}
             </View>
           );
         })}
       </View>

      {/* Leyenda del calendario */}
      <View style={styles.legendContainer}>
        {variant === 'configure' ? (
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#667eea' }]} />
              <Text style={styles.legendText}>Seleccionada</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#e8f7f0', borderWidth: 1.5, borderColor: '#4CAF50' }]} />
              <Text style={styles.legendText}>Disponible</Text>
            </View>
          </View>
        ) : (
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#ffcdd2', borderWidth: 2, borderColor: '#c62828' }]} />
              <Text style={styles.legendText}>Con citas</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#e8f7f0', borderWidth: 1.5, borderColor: '#4CAF50' }]} />
              <Text style={styles.legendText}>Disponible</Text>
            </View>
          </View>
        )}
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#fff3e0', borderWidth: 2.5, borderColor: '#ff9800' }]} />
            <Text style={styles.legendText}>Hoy</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#f9f9f9', opacity: 0.5 }]} />
            <Text style={styles.legendText}>Pasada</Text>
          </View>
        </View>
        {variant === 'overview' && (
          <Text style={styles.legendHint}>Toca un día para ver citas y horarios.</Text>
        )}
      </View>

      {variant === 'configure' && selectedDates.length > 0 && (
        <View style={styles.selectedInfo}>
          <Ionicons name="calendar" size={18} color="#667eea" style={{ marginRight: 8 }} />
          <Text style={styles.selectedInfoText}>
            {selectedDates.length} fecha{selectedDates.length !== 1 ? 's' : ''} con horarios configurado{selectedDates.length !== 1 ? 's' : ''}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#f0f2ff',
  },
  navButton: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f0f2ff',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  monthContainer: {
    flex: 1,
    alignItems: 'center',
  },
  monthText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#667eea',
    letterSpacing: 0.5,
  },
  dayNamesContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    backgroundColor: '#f8f9ff',
    borderRadius: 10,
    paddingVertical: 8,
  },
  dayName: {
    flex: 1,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '700',
    color: '#667eea',
    paddingVertical: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayContainer: {
    width: '14.28%', // 100% / 7 d?as
    aspectRatio: 1,
    marginBottom: 6,
    position: 'relative',
    padding: 2,
  },
  dayButton: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    position: 'relative',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  dayButtonOtherMonth: {
    opacity: 0.3,
  },
  dayButtonToday: {
    backgroundColor: '#fff3e0',
    borderWidth: 2.5,
    borderColor: '#ff9800',
    shadowColor: '#ff9800',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  dayButtonSelected: {
    backgroundColor: '#667eea',
    borderWidth: 3,
    borderColor: '#4c51bf',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 5,
  },
  dayButtonPast: {
    opacity: 0.3,
    backgroundColor: '#f9f9f9',
  },
  dayButtonAvailable: {
    backgroundColor: '#e8f7f0',
    borderWidth: 1.5,
    borderColor: '#4CAF50',
  },
  dayButtonWithAppointments: {
    backgroundColor: '#ffebee',
    borderWidth: 2,
    borderColor: '#c62828',
  },
  dayText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
  },
  dayTextOtherMonth: {
    color: '#bbb',
  },
  dayTextToday: {
    color: '#ff9800',
    fontWeight: '800',
  },
  dayTextSelected: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 18,
  },
  dayTextPast: {
    color: '#d0d0d0',
  },
  dayTextAvailable: {
    color: '#2e7d32',
    fontWeight: '700',
  },
  dayTextWithAppointments: {
    color: '#b71c1c',
    fontWeight: '800',
  },
  appointmentCountBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#c62828',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  appointmentCountText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  legendContainer: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: '#f0f2ff',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  legendDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    marginRight: 8,
  },
  legendText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
  },
  legendHint: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  selectedInfo: {
    marginTop: 16,
    padding: 14,
    backgroundColor: '#f0f2ff',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1.5,
    borderColor: '#e0e7ff',
  },
  selectedInfoText: {
    fontSize: 15,
    color: '#667eea',
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  scheduleEditButton: {
    position: 'absolute',
    top: 2,
    left: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  customScheduleIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF6B35',
  },
  customScheduleDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#fff',
    position: 'absolute',
    top: 2,
    left: 2,
  },
});

export default FullCalendar;
