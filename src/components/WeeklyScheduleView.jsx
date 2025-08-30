import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScheduleService from '../services/ScheduleService';

export const WeeklyScheduleView = ({ schedule, onDayPress }) => {
  const DAYS = [
    { id: 0, name: 'Domingo', short: 'Dom', color: '#ff6b6b' },
    { id: 1, name: 'Lunes', short: 'Lun', color: '#4ecdc4' },
    { id: 2, name: 'Martes', short: 'Mar', color: '#45b7d1' },
    { id: 3, name: 'Miércoles', short: 'Mié', color: '#96ceb4' },
    { id: 4, name: 'Jueves', short: 'Jue', color: '#feca57' },
    { id: 5, name: 'Viernes', short: 'Vie', color: '#ff9ff3' },
    { id: 6, name: 'Sábado', short: 'Sáb', color: '#54a0ff' },
  ];

  const getDayStatus = (dayId) => {
    const daySchedule = schedule[dayId];
    if (!daySchedule?.enabled) return 'inactive';
    if (!daySchedule.timeRanges || daySchedule.timeRanges.length === 0) return 'configured';
    return 'active';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return '#4caf50';
      case 'configured': return '#ff9800';
      case 'inactive': return '#f44336';
      default: return '#ccc';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return 'checkmark-circle';
      case 'configured': return 'alert-circle';
      case 'inactive': return 'close-circle';
      default: return 'help-circle';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'active': return 'Activo';
      case 'configured': return 'Configurado';
      case 'inactive': return 'Inactivo';
      default: return 'Desconocido';
    }
  };

  const getDaySummary = (dayId) => {
    const daySchedule = schedule[dayId];
    if (!daySchedule?.enabled) return 'No disponible';
    
    if (!daySchedule.timeRanges || daySchedule.timeRanges.length === 0) {
      return 'Sin horarios';
    }

    const totalHours = daySchedule.timeRanges.reduce((total, range) => {
      const start = ScheduleService.parseTime(range.start);
      const end = ScheduleService.parseTime(range.end);
      const duration = (end - start) / (1000 * 60 * 60);
      return total + duration;
    }, 0);

    const breakHours = daySchedule.breaks ? daySchedule.breaks.reduce((total, breakTime) => {
      const start = ScheduleService.parseTime(breakTime.start);
      const end = ScheduleService.parseTime(breakTime.end);
      const duration = (end - start) / (1000 * 60 * 60);
      return total + duration;
    }, 0) : 0;

    const netHours = Math.max(0, totalHours - breakHours);
    const slots = Math.round(netHours * 60 / (daySchedule.interval || 30));
    
    return `${netHours.toFixed(1)}h • ${slots} citas`;
  };

  const renderTimeRanges = (dayId) => {
    const daySchedule = schedule[dayId];
    if (!daySchedule?.enabled || !daySchedule.timeRanges) return null;

    return (
      <View style={styles.timeRangesContainer}>
        {daySchedule.timeRanges.map((range, index) => (
          <View key={index} style={styles.timeRangeItem}>
            <Ionicons name="time" size={12} color="#666" />
            <Text style={styles.timeRangeText}>
              {range.start} - {range.end}
            </Text>
          </View>
        ))}
        
        {daySchedule.breaks && daySchedule.breaks.length > 0 && (
          <View style={styles.breaksContainer}>
            <Text style={styles.breaksLabel}>Pausas:</Text>
            {daySchedule.breaks.map((breakTime, index) => (
              <View key={index} style={styles.breakItem}>
                <Ionicons name="cafe" size={12} color="#f57c00" />
                <Text style={styles.breakText}>
                  {breakTime.start} - {breakTime.end}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderEfficiencyIndicator = (dayId) => {
    const daySchedule = schedule[dayId];
    if (!daySchedule?.enabled || !daySchedule.timeRanges) return null;

    const totalHours = daySchedule.timeRanges.reduce((total, range) => {
      const start = ScheduleService.parseTime(range.start);
      const end = ScheduleService.parseTime(range.end);
      const duration = (end - start) / (1000 * 60 * 60);
      return total + duration;
    }, 0);

    const breakHours = daySchedule.breaks ? daySchedule.breaks.reduce((total, breakTime) => {
      const start = ScheduleService.parseTime(breakTime.start);
      const end = ScheduleService.parseTime(breakTime.end);
      const duration = (end - start) / (1000 * 60 * 60);
      return total + duration;
    }, 0) : 0;

    const efficiency = totalHours > 0 ? ((totalHours - breakHours) / totalHours) * 100 : 0;
    
    let efficiencyColor = '#4caf50';
    if (efficiency < 70) efficiencyColor = '#ff9800';
    if (efficiency < 50) efficiencyColor = '#f44336';

    return (
      <View style={styles.efficiencyIndicator}>
        <View style={[styles.efficiencyBar, { backgroundColor: '#f0f0f0' }]}>
          <View 
            style={[
              styles.efficiencyFill, 
              { 
                width: `${Math.min(efficiency, 100)}%`,
                backgroundColor: efficiencyColor
              }
            ]} 
          />
        </View>
        <Text style={[styles.efficiencyText, { color: efficiencyColor }]}>
          {Math.round(efficiency)}%
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Vista Semanal</Text>
      
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.daysContainer}>
        {DAYS.map((day) => {
          const status = getDayStatus(day.id);
          const statusColor = getStatusColor(status);
          
          return (
            <TouchableOpacity
              key={day.id}
              style={[styles.dayCard, { borderLeftColor: day.color }]}
              onPress={() => onDayPress && onDayPress(day.id)}
            >
              <View style={styles.dayHeader}>
                <Text style={styles.dayName}>{day.name}</Text>
                <Text style={styles.dayShort}>{day.short}</Text>
              </View>
              
              <View style={styles.statusContainer}>
                <Ionicons 
                  name={getStatusIcon(status)} 
                  size={20} 
                  color={statusColor} 
                />
                <Text style={[styles.statusText, { color: statusColor }]}>
                  {getStatusText(status)}
                </Text>
              </View>
              
              <Text style={styles.daySummary}>
                {getDaySummary(day.id)}
              </Text>
              
              {renderTimeRanges(day.id)}
              
              {renderEfficiencyIndicator(day.id)}
              
              <View style={styles.intervalInfo}>
                <Text style={styles.intervalText}>
                  {schedule[day.id]?.interval || 30} min
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    margin: 15,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  daysContainer: {
    flexDirection: 'row',
  },
  dayCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 15,
    marginRight: 12,
    minWidth: 120,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  dayHeader: {
    alignItems: 'center',
    marginBottom: 12,
  },
  dayName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  dayShort: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#e9ecef',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  daySummary: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 16,
  },
  timeRangesContainer: {
    marginBottom: 10,
  },
  timeRangeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e8',
    padding: 6,
    borderRadius: 6,
    marginBottom: 4,
    gap: 4,
  },
  timeRangeText: {
    fontSize: 11,
    color: '#2e7d32',
    fontWeight: '500',
  },
  breaksContainer: {
    marginTop: 8,
  },
  breaksLabel: {
    fontSize: 10,
    color: '#f57c00',
    fontWeight: '500',
    marginBottom: 4,
  },
  breakItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3e0',
    padding: 4,
    borderRadius: 4,
    marginBottom: 2,
    gap: 4,
  },
  breakText: {
    fontSize: 10,
    color: '#f57c00',
  },
  efficiencyIndicator: {
    marginBottom: 10,
    alignItems: 'center',
  },
  efficiencyBar: {
    height: 8,
    width: '100%',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  efficiencyFill: {
    height: '100%',
    borderRadius: 4,
  },
  efficiencyText: {
    fontSize: 10,
    fontWeight: '600',
  },
  intervalInfo: {
    backgroundColor: '#e3f2fd',
    padding: 6,
    borderRadius: 6,
    alignItems: 'center',
  },
  intervalText: {
    fontSize: 10,
    color: '#1976d2',
    fontWeight: '500',
  },
});




