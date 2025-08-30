import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');

export const ClientStatsScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalAppointments: 0,
    completedAppointments: 0,
    cancelledAppointments: 0,
    totalSpent: 0,
    averageRating: 0,
    favoriteCategory: '',
    monthlyTrend: [],
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    // Datos de ejemplo para estadísticas del cliente
    setStats({
      totalAppointments: 24,
      completedAppointments: 20,
      cancelledAppointments: 4,
      totalSpent: 1200,
      averageRating: 4.6,
      favoriteCategory: 'Psicología',
      monthlyTrend: [
        { month: 'Ene', appointments: 3, spent: 150 },
        { month: 'Feb', appointments: 4, spent: 200 },
        { month: 'Mar', appointments: 5, spent: 250 },
        { month: 'Abr', appointments: 3, spent: 150 },
        { month: 'May', appointments: 6, spent: 300 },
        { month: 'Jun', appointments: 3, spent: 150 },
      ],
    });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  };

  const renderStatCard = (title, value, subtitle, icon, color) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statHeader}>
        <View style={[styles.statIcon, { backgroundColor: color }]}>
          <Ionicons name={icon} size={24} color="white" />
        </View>
        <View style={styles.statInfo}>
          <Text style={styles.statValue}>{value}</Text>
          <Text style={styles.statTitle}>{title}</Text>
          {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
        </View>
      </View>
    </View>
  );

  const renderTrendBar = (item, index) => (
    <View key={index} style={styles.trendItem}>
      <Text style={styles.trendMonth}>{item.month}</Text>
      <View style={styles.trendBarContainer}>
        <View 
          style={[
            styles.trendBar, 
            { 
              height: (item.appointments / 6) * 60,
              backgroundColor: '#667eea'
            }
          ]} 
        />
      </View>
      <Text style={styles.trendValue}>{item.appointments}</Text>
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Estadísticas</Text>
        <Text style={styles.headerSubtitle}>Resumen de tu actividad</Text>
      </View>

      <View style={styles.statsGrid}>
        {renderStatCard(
          'Total Citas',
          stats.totalAppointments.toString(),
          'En total',
          'calendar',
          '#4CAF50'
        )}
        {renderStatCard(
          'Completadas',
          stats.completedAppointments.toString(),
          'Exitosas',
          'checkmark-circle',
          '#2196F3'
        )}
        {renderStatCard(
          'Canceladas',
          stats.cancelledAppointments.toString(),
          'No realizadas',
          'close-circle',
          '#F44336'
        )}
        {renderStatCard(
          'Total Gastado',
          `$${stats.totalSpent}`,
          'En servicios',
          'card',
          '#FF9800'
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Resumen General</Text>
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Calificación Promedio:</Text>
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={20} color="#FFD700" />
              <Text style={styles.ratingText}>{stats.averageRating}</Text>
            </View>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Categoría Favorita:</Text>
            <Text style={styles.summaryValue}>{stats.favoriteCategory}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tasa de Éxito:</Text>
            <Text style={styles.summaryValue}>
              {Math.round((stats.completedAppointments / stats.totalAppointments) * 100)}%
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tendencia Mensual</Text>
        <View style={styles.trendContainer}>
          {stats.monthlyTrend.map(renderTrendBar)}
        </View>
        <Text style={styles.trendNote}>
          Número de citas por mes
        </Text>
      </View>

      <View style={styles.actionsSection}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('Book')}
        >
          <Ionicons name="calendar-plus" size={20} color="white" />
          <Text style={styles.actionButtonText}>Reservar Nueva Cita</Text>
        </TouchableOpacity>
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
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  statsGrid: {
    padding: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    width: (width - 50) / 2,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  statInfo: {
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  statTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  statSubtitle: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  summaryCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  trendContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 120,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  trendItem: {
    alignItems: 'center',
    flex: 1,
  },
  trendMonth: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  trendBarContainer: {
    height: 60,
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  trendBar: {
    width: 20,
    borderRadius: 10,
    minHeight: 4,
  },
  trendValue: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333',
  },
  trendNote: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  actionsSection: {
    padding: 20,
    marginBottom: 30,
  },
  actionButton: {
    backgroundColor: '#667eea',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

