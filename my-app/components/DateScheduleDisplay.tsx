import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { DateSchedule, dateScheduleService } from '../services/dateScheduleService';
interface DateScheduleDisplayProps {
  onSchedulePress?: (schedule: DateSchedule) => void;
}

export const DateScheduleDisplay: React.FC<DateScheduleDisplayProps> = ({ onSchedulePress }) => {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<DateSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSchedules();
  }, []);

  const loadSchedules = async () => {
    if (!user || user.userType !== 'professional') {
      setError('Solo profesionales pueden ver horarios por fecha');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log('📅 Cargando horarios por fecha específica...');
      
      // Obtener horarios del mes de octubre 2025
      const response = await dateScheduleService.getMonthlySchedules(user._id, 2025, 10);
      
      if (response.success && response.data) {
        const schedulesData = Array.isArray(response.data) ? response.data : [response.data];
        setSchedules(schedulesData);
        console.log(`✅ ${schedulesData.length} horarios cargados`);
      } else {
        setError(response.error || 'Error cargando horarios');
      }
    } catch (error) {
      console.error('❌ Error cargando horarios:', error);
      setError('Error cargando horarios');
    } finally {
      setLoading(false);
    }
  };

  const handleSchedulePress = (schedule: DateSchedule) => {
    if (onSchedulePress) {
      onSchedulePress(schedule);
    } else {
      Alert.alert(
        'Horarios del día',
        `${schedule.date}\n\nHorarios:\n${schedule.timeSlots.map(slot => 
          `${slot.start} - ${slot.end}`
        ).join('\n')}\n\nNotas: ${schedule.notes || 'Sin notas'}`,
        [{ text: 'OK' }]
      );
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Cargando horarios...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadSchedules}>
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (schedules.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>No hay horarios configurados</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadSchedules}>
          <Text style={styles.retryButtonText}>Actualizar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Horarios por Fecha Específica</Text>
      <Text style={styles.subtitle}>Dr. Carlos Mendoza - Octubre 2025</Text>
      
      <View style={styles.statsContainer}>
        <Text style={styles.statsText}>
          📅 {schedules.length} días configurados
        </Text>
        <Text style={styles.statsText}>
          ⏰ {schedules.reduce((total, schedule) => total + schedule.timeSlots.length, 0)} horarios totales
        </Text>
      </View>

      {schedules.map((schedule) => (
        <TouchableOpacity
          key={schedule._id}
          style={styles.scheduleCard}
          onPress={() => handleSchedulePress(schedule)}
        >
          <View style={styles.scheduleHeader}>
            <Text style={styles.dateText}>{formatDate(schedule.date)}</Text>
            <Text style={styles.timeSlotsCount}>
              {schedule.timeSlots.length} horarios
            </Text>
          </View>
          
          <View style={styles.timeSlotsContainer}>
            {schedule.timeSlots.slice(0, 3).map((slot, index) => (
              <View key={index} style={styles.timeSlot}>
                <Text style={styles.timeSlotText}>
                  {slot.start} - {slot.end}
                </Text>
              </View>
            ))}
            {schedule.timeSlots.length > 3 && (
              <Text style={styles.moreText}>
                +{schedule.timeSlots.length - 3} más...
              </Text>
            )}
          </View>
          
          {schedule.notes && (
            <Text style={styles.notesText}>{schedule.notes}</Text>
          )}
          
          <View style={styles.statusContainer}>
            <View style={[
              styles.statusIndicator,
              { backgroundColor: schedule.isAvailable ? '#4CAF50' : '#F44336' }
            ]} />
            <Text style={styles.statusText}>
              {schedule.isAvailable ? 'Disponible' : 'No disponible'}
            </Text>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  statsContainer: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  scheduleCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scheduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textTransform: 'capitalize',
  },
  timeSlotsCount: {
    fontSize: 14,
    color: '#666',
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  timeSlotsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  timeSlot: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
    marginBottom: 4,
  },
  timeSlotText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  moreText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    alignSelf: 'center',
  },
  notesText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: '#666',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 50,
  },
  errorText: {
    fontSize: 16,
    color: '#F44336',
    textAlign: 'center',
    marginTop: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 50,
  },
  retryButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    alignSelf: 'center',
    marginTop: 16,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
});
