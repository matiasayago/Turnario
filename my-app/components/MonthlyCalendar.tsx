import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useCalendar } from '../contexts/CalendarContext';
import { calendarService } from '../services/calendarService';

interface MonthlyCalendarProps {
  onDayPress?: (day: any) => void;
  onTimeSlotPress?: (day: any, timeSlot: any) => void;
  showTimeSlots?: boolean;
  maxTimeSlotsToShow?: number;
}

export const MonthlyCalendar: React.FC<MonthlyCalendarProps> = ({
  onDayPress,
  onTimeSlotPress,
  showTimeSlots = false,
  maxTimeSlotsToShow = 3
}) => {
  const {
    currentCalendar,
    isLoading,
    error,
    currentYear,
    currentMonth,
    goToPreviousMonth,
    goToNextMonth,
    goToToday,
    refreshCalendar
  } = useCalendar();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Cargando calendario...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>❌ {error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={refreshCalendar}>
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!currentCalendar) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No hay calendario disponible</Text>
      </View>
    );
  }

  const handleDayPress = (day: any) => {
    if (onDayPress) {
      onDayPress(day);
    }
  };

  const handleTimeSlotPress = (day: any, timeSlot: any) => {
    if (onTimeSlotPress) {
      onTimeSlotPress(day, timeSlot);
    }
  };

  const renderTimeSlots = (day: any) => {
    if (!showTimeSlots || !day.availableSlots || day.availableSlots.length === 0) {
      return null;
    }

    const slotsToShow = day.availableSlots.slice(0, maxTimeSlotsToShow);
    const remainingSlots = day.availableSlots.length - maxTimeSlotsToShow;

    return (
      <View style={styles.timeSlotsContainer}>
        {slotsToShow.map((slot: any, index: number) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.timeSlot,
              slot.isAvailable ? styles.availableSlot : styles.blockedSlot
            ]}
            onPress={() => handleTimeSlotPress(day, slot)}
            disabled={!slot.isAvailable}
          >
            <Text style={[
              styles.timeSlotText,
              slot.isAvailable ? styles.availableSlotText : styles.blockedSlotText
            ]}>
              {slot.time}
            </Text>
          </TouchableOpacity>
        ))}
        {remainingSlots > 0 && (
          <Text style={styles.moreSlotsText}>+{remainingSlots} más</Text>
        )}
      </View>
    );
  };

  const renderDay = (day: any) => {
    const isToday = calendarService.isToday(day.date);
    const isPast = calendarService.isPastDate(day.date);
    const hasAvailability = day.availableSlotsCount > 0;

    return (
      <TouchableOpacity
        key={day.date}
        style={[
          styles.dayContainer,
          isToday && styles.todayContainer,
          isPast && styles.pastDayContainer,
          !day.isWorkingDay && styles.nonWorkingDayContainer
        ]}
        onPress={() => handleDayPress(day)}
        disabled={!day.isWorkingDay}
      >
        <Text style={[
          styles.dayNumber,
          isToday && styles.todayText,
          isPast && styles.pastDayText,
          !day.isWorkingDay && styles.nonWorkingDayText
        ]}>
          {day.day}
        </Text>
        
        {day.isWorkingDay && (
          <View style={styles.dayInfo}>
            <Text style={styles.dayName}>{calendarService.getDayName(day.dayName)}</Text>
            {hasAvailability ? (
              <Text style={styles.availabilityText}>
                {day.availableSlotsCount} disponible{day.availableSlotsCount !== 1 ? 's' : ''}
              </Text>
            ) : (
              <Text style={styles.noAvailabilityText}>Sin disponibilidad</Text>
            )}
          </View>
        )}
        
        {renderTimeSlots(day)}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header del calendario */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.navButton} onPress={goToPreviousMonth}>
          <Text style={styles.navButtonText}>‹</Text>
        </TouchableOpacity>
        
        <View style={styles.titleContainer}>
          <Text style={styles.monthTitle}>
            {calendarService.getMonthName(currentMonth)} {currentYear}
          </Text>
          <Text style={styles.professionalName}>
            {currentCalendar.professionalName}
          </Text>
        </View>
        
        <TouchableOpacity style={styles.navButton} onPress={goToNextMonth}>
          <Text style={styles.navButtonText}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Botón de hoy */}
      <TouchableOpacity style={styles.todayButton} onPress={goToToday}>
        <Text style={styles.todayButtonText}>Hoy</Text>
      </TouchableOpacity>

      {/* Resumen del mes */}
      <View style={styles.summary}>
        <Text style={styles.summaryText}>
          {currentCalendar.summary.workingDays} días laborales • {' '}
          {currentCalendar.summary.totalAvailableSlots} horarios disponibles
        </Text>
      </View>

      {/* Calendario */}
      <ScrollView style={styles.calendarContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.calendarGrid}>
          {currentCalendar.calendar.map(renderDay)}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#d32f2f',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonText: {
    fontSize: 24,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  titleContainer: {
    alignItems: 'center',
  },
  monthTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  professionalName: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  todayButton: {
    alignSelf: 'center',
    marginVertical: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#007AFF',
    borderRadius: 20,
  },
  todayButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  summary: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  summaryText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  calendarContainer: {
    flex: 1,
  },
  calendarGrid: {
    padding: 16,
  },
  dayContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  todayContainer: {
    borderWidth: 2,
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  pastDayContainer: {
    backgroundColor: '#f5f5f5',
    opacity: 0.6,
  },
  nonWorkingDayContainer: {
    backgroundColor: '#f5f5f5',
    opacity: 0.6,
  },
  dayNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  todayText: {
    color: '#007AFF',
  },
  pastDayText: {
    color: '#999',
  },
  nonWorkingDayText: {
    color: '#999',
  },
  dayInfo: {
    marginTop: 8,
  },
  dayName: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  availabilityText: {
    fontSize: 12,
    color: '#4caf50',
    marginTop: 2,
  },
  noAvailabilityText: {
    fontSize: 12,
    color: '#f44336',
    marginTop: 2,
  },
  timeSlotsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 8,
  },
  timeSlot: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
    marginBottom: 4,
  },
  availableSlot: {
    backgroundColor: '#e8f5e8',
    borderWidth: 1,
    borderColor: '#4caf50',
  },
  blockedSlot: {
    backgroundColor: '#ffebee',
    borderWidth: 1,
    borderColor: '#f44336',
  },
  timeSlotText: {
    fontSize: 12,
    fontWeight: '500',
  },
  availableSlotText: {
    color: '#4caf50',
  },
  blockedSlotText: {
    color: '#f44336',
  },
  moreSlotsText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
});
