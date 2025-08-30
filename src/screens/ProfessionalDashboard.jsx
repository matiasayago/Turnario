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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserTypeSelector } from '../components/UserTypeSelector';
import { TurnarioLogo } from '../components/TurnarioLogo';

const { width } = Dimensions.get('window');

const DAYS_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export const ProfessionalDashboard = ({ navigation }) => {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [schedule, setSchedule] = useState({});
  const [stats, setStats] = useState({
    appointmentsToday: 0,
    appointmentsWeek: 0,
    earnings: 0,
    rating: 0,
  });
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);

  useEffect(() => {
    loadDashboardData();
    loadSchedule();
  }, []);

  const loadDashboardData = async () => {
    // Aquí se cargarían los datos reales desde la API
    // Por ahora usamos datos de ejemplo
    setStats({
      appointmentsToday: 5,
      appointmentsWeek: 23,
      earnings: 1250,
      rating: 4.8,
    });

    setUpcomingAppointments([
      {
        id: '1',
        clientName: 'Juan Pérez',
        time: '14:30',
        date: '2024-07-08',
        service: 'Consulta',
        status: 'confirmed',
      },
      {
        id: '2',
        clientName: 'María García',
        time: '16:00',
        date: '2024-07-08',
        service: 'Terapia',
        status: 'pending',
      },
    ]);
  };

  const loadSchedule = async () => {
    try {
      const savedSchedule = await AsyncStorage.getItem('professional_schedule');
      if (savedSchedule) {
        setSchedule(JSON.parse(savedSchedule));
      }
    } catch (error) {
      console.error('Error al cargar horarios:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadDashboardData(), loadSchedule()]);
    setRefreshing(false);
  };

  const getScheduleSummary = () => {
    const enabledDays = Object.values(schedule).filter(day => day?.enabled).length;
    const totalRanges = Object.values(schedule).reduce((total, day) => {
      return total + (day?.timeRanges?.length || 0);
    }, 0);
    
    return { enabledDays, totalRanges };
  };

  const renderSchedulePreview = () => {
    const { enabledDays, totalRanges } = getScheduleSummary();
    
    if (enabledDays === 0) {
      return (
        <View style={styles.schedulePreview}>
          <View style={styles.scheduleHeader}>
            <Text style={styles.scheduleTitle}>Horarios Configurados</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Schedule')}
              style={styles.configureScheduleButton}
            >
              <Text style={styles.configureScheduleText}>Configurar</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.noScheduleMessage}>
            <Ionicons name="calendar-outline" size={40} color="#ccc" />
            <Text style={styles.noScheduleText}>No hay horarios configurados</Text>
            <Text style={styles.noScheduleSubtext}>
              Configura tus horarios para comenzar a recibir citas
            </Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.schedulePreview}>
        <View style={styles.scheduleHeader}>
          <Text style={styles.scheduleTitle}>Horarios Configurados</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Schedule')}
            style={styles.editScheduleButton}
          >
            <Ionicons name="create" size={16} color="#667eea" />
            <Text style={styles.editScheduleText}>Editar</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.scheduleStats}>
          <View style={styles.scheduleStat}>
            <Text style={styles.scheduleStatNumber}>{enabledDays}</Text>
            <Text style={styles.scheduleStatLabel}>Días activos</Text>
          </View>
          <View style={styles.scheduleStat}>
            <Text style={styles.scheduleStatNumber}>{totalRanges}</Text>
            <Text style={styles.scheduleStatLabel}>Rangos de tiempo</Text>
          </View>
        </View>

        <View style={styles.weeklySchedule}>
          <Text style={styles.weeklyTitle}>Disponibilidad Semanal</Text>
          <View style={styles.daysRow}>
            {DAYS_SHORT.map((day, index) => {
              const daySchedule = schedule[index];
              const isEnabled = daySchedule?.enabled;
              const hasRanges = daySchedule?.timeRanges?.length > 0;
              
              return (
                <View key={index} style={styles.dayIndicator}>
                  <Text style={styles.dayIndicatorText}>{day}</Text>
                  <View style={[
                    styles.dayIndicatorDot,
                    { backgroundColor: isEnabled && hasRanges ? '#4CAF50' : '#ccc' }
                  ]} />
                </View>
              );
            })}
          </View>
        </View>
      </View>
    );
  };

  const renderAppointmentCard = (appointment) => (
    <TouchableOpacity
      key={appointment.id}
      style={styles.appointmentCard}
      onPress={() => navigation.navigate('AppointmentDetails', { id: appointment.id })}
    >
      <View style={styles.appointmentHeader}>
        <View style={styles.appointmentTime}>
          <Ionicons name="time" size={20} color="#667eea" />
          <Text style={styles.timeText}>{appointment.time}</Text>
        </View>
        <View style={[
          styles.statusBadge,
          { backgroundColor: appointment.status === 'confirmed' ? '#4CAF50' : '#FFC107' }
        ]}>
          <Text style={styles.statusText}>
            {appointment.status === 'confirmed' ? 'Confirmado' : 'Pendiente'}
          </Text>
        </View>
      </View>

      <View style={styles.appointmentInfo}>
        <Text style={styles.clientName}>{appointment.clientName}</Text>
        <Text style={styles.serviceText}>{appointment.service}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TurnarioLogo size="medium" />
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => navigation.navigate('Profile')}
          >
            <Ionicons name="person-circle" size={40} color="#667eea" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.welcomeSection}>
        <Text style={styles.welcomeText}>¡Hola, {user?.name}!</Text>
        <Text style={styles.dateText}>
          {new Date().toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </Text>
      </View>

      {/* Selector de Tipo de Usuario */}
      <UserTypeSelector />

      <View style={styles.statsContainer}>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Ionicons name="calendar" size={24} color="#667eea" />
            <Text style={styles.statNumber}>{stats.appointmentsToday}</Text>
            <Text style={styles.statLabel}>Turnos Hoy</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="calendar-outline" size={24} color="#667eea" />
            <Text style={styles.statNumber}>{stats.appointmentsWeek}</Text>
            <Text style={styles.statLabel}>Esta Semana</Text>
          </View>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Ionicons name="cash" size={24} color="#667eea" />
            <Text style={styles.statNumber}>${stats.earnings}</Text>
            <Text style={styles.statLabel}>Ingresos</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="star" size={24} color="#667eea" />
            <Text style={styles.statNumber}>{stats.rating}</Text>
            <Text style={styles.statLabel}>Calificación</Text>
          </View>
        </View>
      </View>

      {/* Horarios Configurados */}
      {renderSchedulePreview()}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Próximos Turnos</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Appointments')}
            style={styles.seeAllButton}
          >
            <Text style={styles.seeAllText}>Ver todos</Text>
            <Ionicons name="chevron-forward" size={16} color="#667eea" />
          </TouchableOpacity>
        </View>

        {upcomingAppointments.map(renderAppointmentCard)}
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#667eea' }]}
          onPress={() => navigation.navigate('Schedule')}
        >
          <Ionicons name="calendar" size={24} color="white" />
          <Text style={styles.actionButtonText}>Gestionar Horarios</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#764ba2' }]}
          onPress={() => navigation.navigate('Statistics')}
        >
          <Ionicons name="stats-chart" size={24} color="white" />
          <Text style={styles.actionButtonText}>Ver Estadísticas</Text>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  headerLeft: {
    flex: 1,
    alignItems: 'flex-start',
  },
  headerRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  welcomeSection: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  dateText: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  profileButton: {
    padding: 5,
  },
  statsContainer: {
    padding: 15,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    width: (width - 50) / 2,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginVertical: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  schedulePreview: {
    backgroundColor: 'white',
    margin: 15,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scheduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  scheduleTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  configureScheduleButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  configureScheduleText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  editScheduleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  editScheduleText: {
    color: '#667eea',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  noScheduleMessage: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noScheduleText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
    marginTop: 10,
  },
  noScheduleSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 5,
  },
  scheduleStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  scheduleStat: {
    alignItems: 'center',
  },
  scheduleStatNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#667eea',
  },
  scheduleStatLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  weeklySchedule: {
    alignItems: 'center',
  },
  weeklyTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 10,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  dayIndicator: {
    alignItems: 'center',
  },
  dayIndicatorText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  dayIndicatorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  section: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seeAllText: {
    fontSize: 14,
    color: '#667eea',
    marginRight: 4,
  },
  appointmentCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  appointmentTime: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  appointmentInfo: {
    marginTop: 5,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  serviceText: {
    fontSize: 14,
    color: '#666',
  },
  actionButtons: {
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#667eea',
    borderRadius: 12,
    padding: 15,
    width: (width - 50) / 2,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
});
