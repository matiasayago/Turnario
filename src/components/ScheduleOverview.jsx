import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScheduleService from '../services/ScheduleService';

export const ScheduleOverview = ({ schedule, onPress }) => {
  const stats = ScheduleService.getScheduleStats(schedule);
  
  const getEfficiencyScore = () => {
    const totalPossibleHours = stats.enabledDays * 8; // 8 horas por día
    const efficiency = (stats.netHours / totalPossibleHours) * 100;
    return Math.round(efficiency);
  };

  const getEfficiencyColor = () => {
    const efficiency = getEfficiencyScore();
    if (efficiency >= 80) return '#4caf50';
    if (efficiency >= 60) return '#ff9800';
    return '#f44336';
  };

  const getEfficiencyIcon = () => {
    const efficiency = getEfficiencyScore();
    if (efficiency >= 80) return 'trending-up';
    if (efficiency >= 60) return 'trending-flat';
    return 'trending-down';
  };

  const getNextAvailableDay = () => {
    const today = new Date();
    const currentDay = today.getDay();
    
    for (let i = 1; i <= 7; i++) {
      const checkDay = (currentDay + i) % 7;
      if (schedule[checkDay]?.enabled && schedule[checkDay]?.timeRanges?.length > 0) {
        return ScheduleService.getDayName(checkDay);
      }
    }
    return 'No disponible';
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

  const renderStatItem = (icon, value, label, color = '#667eea') => (
    <View style={styles.statItem}>
      <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <View style={styles.statContent}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </View>
  );

  const renderEfficiencyCard = () => {
    const efficiency = getEfficiencyScore();
    const efficiencyColor = getEfficiencyColor();
    const efficiencyIcon = getEfficiencyIcon();

    return (
      <View style={styles.efficiencyCard}>
        <View style={styles.efficiencyHeader}>
          <Ionicons name={efficiencyIcon} size={24} color={efficiencyColor} />
          <Text style={styles.efficiencyTitle}>Eficiencia de Horarios</Text>
        </View>
        
        <View style={styles.efficiencyBar}>
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
          {efficiency}% de eficiencia
        </Text>
        
        <Text style={styles.efficiencySubtext}>
          {stats.netHours}h de {stats.enabledDays * 8}h disponibles
        </Text>
      </View>
    );
  };

  const renderQuickActions = () => (
    <View style={styles.quickActions}>
      <Text style={styles.sectionTitle}>Acciones Rápidas</Text>
      
      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="copy" size={20} color="#ff9800" />
          <Text style={styles.actionButtonText}>Plantillas</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="git-branch" size={20} color="#9c27b0" />
          <Text style={styles.actionButtonText}>Copiar</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="download" size={20} color="#667eea" />
          <Text style={styles.actionButtonText}>Exportar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Resumen de Horarios</Text>
          <Text style={styles.subtitle}>
            {stats.enabledDays} días activos • {stats.weeklyCapacity} citas por semana
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color="#666" />
      </View>

      <View style={styles.statsGrid}>
        {renderStatItem('calendar', stats.enabledDays, 'Días Activos', '#4caf50')}
        {renderStatItem('time', `${stats.netHours}h`, 'Horas Netas', '#2196f3')}
        {renderStatItem('people', stats.weeklyCapacity, 'Citas/Semana', '#ff9800')}
        {renderStatItem('cafe', stats.totalBreaks, 'Pausas', '#f57c00')}
      </View>

      {renderEfficiencyCard()}

      <View style={styles.insights}>
        <Text style={styles.sectionTitle}>Insights</Text>
        
        <View style={styles.insightItem}>
          <Ionicons name="calendar-outline" size={16} color="#4caf50" />
          <Text style={styles.insightText}>
            Próximo día disponible: <Text style={styles.insightHighlight}>{getNextAvailableDay()}</Text>
          </Text>
        </View>
        
        <View style={styles.insightItem}>
          <Ionicons name="trending-up" size={16} color="#ff9800" />
          <Text style={styles.insightText}>
            Día más ocupado: <Text style={styles.insightHighlight}>{getBusiestDay().day} ({getBusiestDay().hours}h)</Text>
          </Text>
        </View>
        
        {stats.totalBreaks === 0 && (
          <View style={styles.insightItem}>
            <Ionicons name="information-circle" size={16} color="#2196f3" />
            <Text style={styles.insightText}>
              Considera agregar pausas para mejorar tu productividad
            </Text>
          </View>
        )}
        
        {getEfficiencyScore() < 70 && (
          <View style={styles.insightItem}>
            <Ionicons name="alert-circle" size={16} color="#f44336" />
            <Text style={styles.insightText}>
              Tu eficiencia es baja. Revisa la distribución de tiempo
            </Text>
          </View>
        )}
      </View>

      {renderQuickActions()}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    margin: 15,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 12,
    width: '48%',
    gap: 10,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  efficiencyCard: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  efficiencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  efficiencyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  efficiencyBar: {
    height: 12,
    backgroundColor: '#e0e0e0',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8,
  },
  efficiencyFill: {
    height: '100%',
    borderRadius: 6,
  },
  efficiencyText: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  efficiencySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  insights: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 8,
  },
  insightText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  insightHighlight: {
    fontWeight: '600',
    color: '#333',
  },
  quickActions: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    gap: 6,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
});
