import { MonthlyCalendar } from '@/components/MonthlyCalendar';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuth } from '@/contexts/AuthContext';
import { useCalendar } from '@/contexts/CalendarContext';
import React, { useState } from 'react';
import { Alert, StyleSheet, TouchableOpacity, View } from 'react-native';

export default function CalendarScreen() {
  const { user } = useAuth();
  const { currentCalendar, upcomingAvailability } = useCalendar();
  const [selectedDay, setSelectedDay] = useState<any>(null);

  // Verificar si el usuario es profesional
  if (!user || user.userType !== 'professional') {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={styles.errorText}>
          Esta funcionalidad solo está disponible para profesionales
        </ThemedText>
      </ThemedView>
    );
  }

  const handleDayPress = (day: any) => {
    setSelectedDay(day);
    
    if (day.isWorkingDay && day.availableSlotsCount > 0) {
      Alert.alert(
        `Día ${day.day}`,
        `Tienes ${day.availableSlotsCount} horarios disponibles.\n\n¿Quieres ver los horarios detallados?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { 
            text: 'Ver horarios', 
            onPress: () => {
              // Aquí podrías navegar a una pantalla de detalles del día
              console.log('Horarios del día:', day.availableSlots);
            }
          }
        ]
      );
    } else if (!day.isWorkingDay) {
      Alert.alert(
        `Día ${day.day}`,
        'Este día no es laboral según tu configuración de horarios.'
      );
    } else {
      Alert.alert(
        `Día ${day.day}`,
        'No tienes horarios disponibles para este día.'
      );
    }
  };

  const handleTimeSlotPress = (day: any, timeSlot: any) => {
    if (timeSlot.isAvailable) {
      Alert.alert(
        `Horario ${timeSlot.time}`,
        `Horario disponible para el día ${day.day}.\n\n¿Quieres programar una cita?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { 
            text: 'Programar', 
            onPress: () => {
              // Aquí podrías navegar a la pantalla de programar cita
              console.log('Programar cita para:', day.date, timeSlot.time);
            }
          }
        ]
      );
    } else {
      Alert.alert(
        `Horario ${timeSlot.time}`,
        `Este horario no está disponible.\n\nRazón: ${timeSlot.reason || 'Horario bloqueado'}`
      );
    }
  };

  const getCalendarStats = () => {
    if (!currentCalendar) return null;
    
    const availableDays = currentCalendar.calendar.filter(day => 
      day.isWorkingDay && day.availableSlotsCount > 0
    );
    
    return {
      totalDays: currentCalendar.summary.totalDays,
      workingDays: currentCalendar.summary.workingDays,
      availableDays: availableDays.length,
      totalSlots: currentCalendar.summary.totalAvailableSlots,
      blockedSlots: currentCalendar.summary.totalBlockedSlots
    };
  };

  const stats = getCalendarStats();

  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.title}>Mi Calendario</ThemedText>
      
      {stats && (
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <ThemedText style={styles.statNumber}>{stats.workingDays}</ThemedText>
            <ThemedText style={styles.statLabel}>Días laborales</ThemedText>
          </View>
          <View style={styles.statItem}>
            <ThemedText style={styles.statNumber}>{stats.availableDays}</ThemedText>
            <ThemedText style={styles.statLabel}>Con disponibilidad</ThemedText>
          </View>
          <View style={styles.statItem}>
            <ThemedText style={styles.statNumber}>{stats.totalSlots}</ThemedText>
            <ThemedText style={styles.statLabel}>Horarios libres</ThemedText>
          </View>
        </View>
      )}

      <MonthlyCalendar
        onDayPress={handleDayPress}
        onTimeSlotPress={handleTimeSlotPress}
        showTimeSlots={true}
        maxTimeSlotsToShow={3}
      />

      {upcomingAvailability && upcomingAvailability.upcomingDays.length > 0 && (
        <View style={styles.upcomingContainer}>
          <ThemedText style={styles.upcomingTitle}>Próximos días disponibles</ThemedText>
          <View style={styles.upcomingList}>
            {upcomingAvailability.upcomingDays.slice(0, 5).map((day, index) => (
              <TouchableOpacity
                key={index}
                style={styles.upcomingDay}
                onPress={() => {
                  Alert.alert(
                    `Día ${day.date}`,
                    `${day.availableSlotsCount} horarios disponibles\nPrimer horario: ${day.firstAvailableSlot}\nÚltimo horario: ${day.lastAvailableSlot}`
                  );
                }}
              >
                <ThemedText style={styles.upcomingDate}>{day.date}</ThemedText>
                <ThemedText style={styles.upcomingSlots}>
                  {day.availableSlotsCount} horarios
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 20,
    color: '#333',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#d32f2f',
    margin: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  upcomingContainer: {
    backgroundColor: 'white',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  upcomingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  upcomingList: {
    gap: 8,
  },
  upcomingDay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  upcomingDate: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  upcomingSlots: {
    fontSize: 12,
    color: '#4caf50',
    fontWeight: '500',
  },
});
