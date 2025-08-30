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

export const ScheduleStats = ({ schedule, onExport }) => {
  const stats = ScheduleService.getScheduleStats(schedule);
  const nextWeekSchedule = ScheduleService.getNextWeekSchedule(schedule);
  
  const getEfficiencyScore = () => {
    const totalPossibleHours = stats.enabledDays * 8; // 8 horas por día
    const efficiency = (stats.totalHours / totalPossibleHours) * 100;
    return Math.round(efficiency);
  };

  const getBusiestDay = () => {
    let busiestDay = null;
    let maxHours = 0;

    Object.entries(schedule).forEach(([dayId, day]) => {
      if (day?.enabled && day.timeRanges) {
        const dayHours = day.timeRanges.reduce((total, range) => {
          const start = ScheduleService.parseTime(range.start);
          const end = ScheduleService.parseTime(range.end);
          const duration = (end - start) / (1000 * 60 * 60);
          return total + duration;
        }, 0);

        if (dayHours > maxHours) {
          maxHours = dayHours;
          busiestDay = ScheduleService.getDayName(dayId);
        }
      }
    });

    return { day: busiestDay, hours: Math.round(maxHours * 10) / 10 };
  };

  const getAverageSessionDuration = () => {
    return stats.averageInterval;
  };

  const getWeeklyRevenue = () => {
    // Simulación de ingresos basado en capacidad y precio promedio
    const averagePrice = 50; // Precio promedio por cita
    return stats.weeklyCapacity * averagePrice;
  };

  const renderStatCard = (title, value, subtitle, icon, color = '#667eea') => (
    <View style={styles.statCard}>
      <View style={styles.statHeader}>
        <Ionicons name={icon} size={24} color={color} />
        <Text style={styles.statTitle}>{title}</Text>
      </View>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </View>
  );

  const renderWeeklyPreview = () => (
    <View style={styles.weeklyPreview}>
      <Text style={styles.sectionTitle}>Vista Semanal</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {nextWeekSchedule.map((day, index) => (
          <View key={index} style={styles.dayPreview}>
            <Text style={styles.dayPreviewName}>{day.dayName}</Text>
            <Text style={styles.dayPreviewDate}>
              {new Date(day.date).getDate()}/{new Date(day.date).getMonth() + 1}
            </Text>
            <View style={[
              styles.dayPreviewStatus,
              { backgroundColor: day.enabled ? '#4caf50' : '#f44336' }
            ]}>
              <Text style={styles.dayPreviewStatusText}>
                {day.enabled ? 'Activo' : 'Inactivo'}
              </Text>
            </View>
            {day.enabled && (
              <View style={styles.dayPreviewDetails}>
                <Text style={styles.dayPreviewSlots}>
                  {day.timeRanges.length} rangos
                </Text>
                <Text style={styles.dayPreviewInterval}>
                  {day.interval} min
                </Text>
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );

  const renderEfficiencyChart = () => {
    const efficiency = getEfficiencyScore();
    const getEfficiencyColor = () => {
      if (efficiency >= 80) return '#4caf50';
      if (efficiency >= 60) return '#ff9800';
      return '#f44336';
    };

    return (
      <View style={styles.efficiencyChart}>
        <Text style={styles.sectionTitle}>Eficiencia de Horarios</Text>
        <View style={styles.efficiencyBar}>
          <View 
            style={[
              styles.efficiencyFill, 
              { 
                width: `${efficiency}%`,
                backgroundColor: getEfficiencyColor()
              }
            ]} 
          />
        </View>
        <Text style={styles.efficiencyText}>
          {efficiency}% de eficiencia
        </Text>
        <Text style={styles.efficiencySubtext}>
          {stats.totalHours}h de {stats.enabledDays * 8}h disponibles
        </Text>
      </View>
    );
  };

  const renderRevenueProjection = () => {
    const weeklyRevenue = getWeeklyRevenue();
    const monthlyRevenue = weeklyRevenue * 4;
    const yearlyRevenue = monthlyRevenue * 12;

    return (
      <View style={styles.revenueProjection}>
        <Text style={styles.sectionTitle}>Proyección de Ingresos</Text>
        <View style={styles.revenueGrid}>
          <View style={styles.revenueItem}>
            <Text style={styles.revenueLabel}>Semanal</Text>
            <Text style={styles.revenueValue}>${weeklyRevenue}</Text>
          </View>
          <View style={styles.revenueItem}>
            <Text style={styles.revenueLabel}>Mensual</Text>
            <Text style={styles.revenueValue}>${monthlyRevenue}</Text>
          </View>
          <View style={styles.revenueItem}>
            <Text style={styles.revenueLabel}>Anual</Text>
            <Text style={styles.revenueValue}>${yearlyRevenue}</Text>
          </View>
        </View>
        <Text style={styles.revenueNote}>
          * Basado en {stats.weeklyCapacity} citas por semana a $50 promedio
        </Text>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Estadísticas de Horarios</Text>
        <TouchableOpacity style={styles.exportButton} onPress={onExport}>
          <Ionicons name="download" size={20} color="#667eea" />
          <Text style={styles.exportButtonText}>Exportar</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsGrid}>
        {renderStatCard(
          'Días Activos',
          stats.enabledDays,
          'de 7 días',
          'calendar',
          '#4caf50'
        )}
        {renderStatCard(
          'Total Horas',
          `${stats.totalHours}h`,
          'por semana',
          'time',
          '#2196f3'
        )}
        {renderStatCard(
          'Capacidad',
          `${stats.weeklyCapacity}`,
          'citas por semana',
          'people',
          '#ff9800'
        )}
        {renderStatCard(
          'Intervalo Promedio',
          `${stats.averageInterval} min`,
          'entre citas',
          'timer',
          '#9c27b0'
        )}
      </View>

      {renderEfficiencyChart()}

      <View style={styles.detailedStats}>
        <Text style={styles.sectionTitle}>Estadísticas Detalladas</Text>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Rangos de tiempo:</Text>
          <Text style={styles.detailValue}>{stats.totalRanges}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Pausas configuradas:</Text>
          <Text style={styles.detailValue}>{stats.totalBreaks}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Día más ocupado:</Text>
          <Text style={styles.detailValue}>
            {getBusiestDay().day} ({getBusiestDay().hours}h)
          </Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Duración promedio de sesión:</Text>
          <Text style={styles.detailValue}>{getAverageSessionDuration()} min</Text>
        </View>
      </View>

      {renderWeeklyPreview()}
      {renderRevenueProjection()}

      <View style={styles.insights}>
        <Text style={styles.sectionTitle}>Insights y Recomendaciones</Text>
        
        {stats.enabledDays < 5 && (
          <View style={styles.insightItem}>
            <Ionicons name="information-circle" size={20} color="#ff9800" />
            <Text style={styles.insightText}>
              Considera habilitar más días para aumentar tu disponibilidad
            </Text>
          </View>
        )}
        
        {stats.totalBreaks === 0 && (
          <View style={styles.insightItem}>
            <Ionicons name="information-circle" size={20} color="#2196f3" />
            <Text style={styles.insightText}>
              Agregar pausas puede mejorar tu productividad y bienestar
            </Text>
          </View>
        )}
        
        {getEfficiencyScore() < 70 && (
          <View style={styles.insightItem}>
            <Ionicons name="information-circle" size={20} color="#f44336" />
            <Text style={styles.insightText}>
              Tu eficiencia de horarios es baja. Revisa la distribución de tiempo
            </Text>
          </View>
        )}
        
        {stats.weeklyCapacity > 40 && (
          <View style={styles.insightItem}>
            <Ionicons name="checkmark-circle" size={20} color="#4caf50" />
            <Text style={styles.insightText}>
              Excelente capacidad semanal. Considera aumentar precios
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  exportButtonText: {
    color: '#667eea',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 5,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 15,
    gap: 10,
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    width: '48%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  statTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginLeft: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  statSubtitle: {
    fontSize: 12,
    color: '#999',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
    paddingHorizontal: 20,
  },
  efficiencyChart: {
    backgroundColor: 'white',
    margin: 15,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  efficiencyBar: {
    height: 20,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 10,
  },
  efficiencyFill: {
    height: '100%',
    borderRadius: 10,
  },
  efficiencyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 5,
  },
  efficiencySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  detailedStats: {
    backgroundColor: 'white',
    margin: 15,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailLabel: {
    fontSize: 16,
    color: '#666',
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  weeklyPreview: {
    backgroundColor: 'white',
    margin: 15,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dayPreview: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginRight: 10,
    minWidth: 80,
    alignItems: 'center',
  },
  dayPreviewName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  dayPreviewDate: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  dayPreviewStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  dayPreviewStatusText: {
    fontSize: 10,
    color: 'white',
    fontWeight: '500',
  },
  dayPreviewDetails: {
    alignItems: 'center',
  },
  dayPreviewSlots: {
    fontSize: 10,
    color: '#666',
    marginBottom: 2,
  },
  dayPreviewInterval: {
    fontSize: 10,
    color: '#999',
  },
  revenueProjection: {
    backgroundColor: 'white',
    margin: 15,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  revenueGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  revenueItem: {
    alignItems: 'center',
    flex: 1,
  },
  revenueLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  revenueValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4caf50',
  },
  revenueNote: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  insights: {
    backgroundColor: 'white',
    margin: 15,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 20,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  insightText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    marginLeft: 10,
    lineHeight: 20,
  },
});




