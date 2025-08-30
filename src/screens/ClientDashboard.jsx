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
import { UserTypeSelector } from '../components/UserTypeSelector';
import { TurnarioLogo } from '../components/TurnarioLogo';
import { UserTypeSwitchNotification } from '../components/UserTypeSwitchNotification';

const { width } = Dimensions.get('window');

export const ClientDashboard = ({ navigation }) => {
  const { user, toggleUserType } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [recentServices, setRecentServices] = useState([]);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationUserType, setNotificationUserType] = useState('');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    // Datos de ejemplo para clientes
    setUpcomingAppointments([
      {
        id: '1',
        professionalName: 'Dr. María García',
        service: 'Consulta Médica',
        time: '15:30',
        date: '2024-07-08',
        status: 'confirmed',
      },
      {
        id: '2',
        professionalName: 'Lic. Carlos López',
        service: 'Terapia Psicológica',
        time: '10:00',
        date: '2024-07-09',
        status: 'pending',
      },
    ]);

    setRecentServices([
      {
        id: '1',
        name: 'Consulta Médica',
        professional: 'Dr. María García',
        date: '2024-07-01',
        rating: 5,
      },
      {
        id: '2',
        name: 'Terapia Psicológica',
        professional: 'Lic. Carlos López',
        date: '2024-06-25',
        rating: 4,
      },
    ]);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const handleUserTypeToggle = async () => {
    try {
      await toggleUserType();
      setNotificationUserType('professional');
      setShowNotification(true);
    } catch (error) {
      console.error('Error cambiando tipo de usuario:', error);
    }
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
        <Text style={styles.professionalName}>{appointment.professionalName}</Text>
        <Text style={styles.serviceText}>{appointment.service}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderServiceCard = (service) => (
    <View key={service.id} style={styles.serviceCard}>
      <View style={styles.serviceHeader}>
        <Text style={styles.serviceName}>{service.name}</Text>
        <View style={styles.ratingContainer}>
          <Ionicons name="star" size={16} color="#FFD700" />
          <Text style={styles.ratingText}>{service.rating}</Text>
        </View>
      </View>
      <Text style={styles.professionalText}>{service.professional}</Text>
      <Text style={styles.serviceDate}>{service.date}</Text>
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
        <View style={styles.headerLeft}>
          <TurnarioLogo size="medium" />
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => navigation.navigate('Profile')}
          >
            <Ionicons name="person-circle" size={40} color="#4caf50" />
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

      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Acciones Rápidas</Text>
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#4caf50' }]}
            onPress={() => navigation.navigate('Book')}
          >
            <Ionicons name="calendar-plus" size={24} color="white" />
            <Text style={styles.actionButtonText}>Reservar Cita</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#2196f3' }]}
            onPress={() => navigation.navigate('Explore')}
          >
            <Ionicons name="search" size={24} color="white" />
            <Text style={styles.actionButtonText}>Explorar Profesionales</Text>
          </TouchableOpacity>
        </View>
      </View>



      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Próximas Citas</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Appointments')}
            style={styles.seeAllButton}
          >
            <Text style={styles.seeAllText}>Ver todas</Text>
            <Ionicons name="chevron-forward" size={16} color="#4caf50" />
          </TouchableOpacity>
        </View>

        {upcomingAppointments.length > 0 ? (
          upcomingAppointments.map(renderAppointmentCard)
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={40} color="#ccc" />
            <Text style={styles.emptyStateText}>No tienes citas programadas</Text>
            <TouchableOpacity
              style={styles.bookNowButton}
              onPress={() => navigation.navigate('Book')}
            >
              <Text style={styles.bookNowText}>Reservar Ahora</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Servicios Recientes</Text>
        {recentServices.map(renderServiceCard)}
      </View>

      <View style={styles.switchUserSection}>
        <TouchableOpacity
          style={styles.switchUserButton}
          onPress={handleUserTypeToggle}
        >
          <Ionicons name="swap-horizontal" size={20} color="#ff6b6b" />
          <Text style={styles.switchUserButtonText}>Cambiar a Profesional</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>

    <UserTypeSwitchNotification
      isVisible={showNotification}
      userType={notificationUserType}
      onClose={() => setShowNotification(false)}
    />
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
  quickActions: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    padding: 15,
    gap: 8,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },

  switchUserSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  switchUserButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff5f5',
    borderWidth: 2,
    borderColor: '#ff6b6b',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  switchUserButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ff6b6b',
    marginLeft: 12,
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
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seeAllText: {
    fontSize: 14,
    color: '#4caf50',
    marginRight: 4,
  },
  appointmentCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
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
  professionalName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  serviceText: {
    fontSize: 14,
    color: '#666',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: 'white',
    borderRadius: 12,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
    marginBottom: 15,
  },
  bookNowButton: {
    backgroundColor: '#4caf50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  bookNowText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  serviceCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  professionalText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  serviceDate: {
    fontSize: 12,
    color: '#999',
  },
});
