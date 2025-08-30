import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TurnarioLogo } from '../components/TurnarioLogo';

export const AppointmentDetailsScreen = ({ navigation }) => {
  const [appointments, setAppointments] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all'); // all, upcoming, past, cancelled

  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = async () => {
    // Simulación de citas
    const mockAppointments = [
      {
        id: '1',
        professionalName: 'Dra. Ana García',
        specialty: 'Psicóloga Clínica',
        date: '2024-07-09',
        time: '14:30',
        duration: 60,
        status: 'confirmed',
        price: 50,
        notes: 'Primera consulta de evaluación',
      },
      {
        id: '2',
        professionalName: 'Dr. Juan Martínez',
        specialty: 'Médico General',
        date: '2024-07-10',
        time: '15:00',
        duration: 30,
        status: 'pending',
        price: 60,
        notes: 'Control de rutina',
      },
      {
        id: '3',
        professionalName: 'Lic. María López',
        specialty: 'Nutricionista',
        date: '2024-07-08',
        time: '10:00',
        duration: 45,
        status: 'completed',
        price: 40,
        notes: 'Plan de alimentación personalizado',
      },
      {
        id: '4',
        professionalName: 'Dr. Carlos Ruiz',
        specialty: 'Terapeuta Físico',
        date: '2024-07-07',
        time: '16:30',
        duration: 60,
        status: 'cancelled',
        price: 55,
        notes: 'Sesión de rehabilitación',
      },
    ];
    
    setAppointments(mockAppointments);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAppointments();
    setRefreshing(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed':
        return '#4CAF50';
      case 'pending':
        return '#FF9800';
      case 'completed':
        return '#2196F3';
      case 'cancelled':
        return '#F44336';
      default:
        return '#999';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'confirmed':
        return 'Confirmada';
      case 'pending':
        return 'Pendiente';
      case 'completed':
        return 'Completada';
      case 'cancelled':
        return 'Cancelada';
      default:
        return 'Desconocido';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'confirmed':
        return 'checkmark-circle';
      case 'pending':
        return 'time';
      case 'completed':
        return 'checkmark-done-circle';
      case 'cancelled':
        return 'close-circle';
      default:
        return 'help-circle';
    }
  };

  const handleCancelAppointment = (appointmentId) => {
    Alert.alert(
      'Cancelar Cita',
      '¿Estás seguro de que quieres cancelar esta cita?',
      [
        { text: 'No', style: 'cancel' },
        { 
          text: 'Sí, cancelar', 
          style: 'destructive',
          onPress: () => {
            setAppointments(prev => 
              prev.map(apt => 
                apt.id === appointmentId 
                  ? { ...apt, status: 'cancelled' }
                  : apt
              )
            );
            Alert.alert('Éxito', 'Cita cancelada correctamente');
          }
        },
      ]
    );
  };

  const handleRescheduleAppointment = (appointmentId) => {
    Alert.alert(
      'Reprogramar Cita',
      '¿Quieres reprogramar esta cita?',
      [
        { text: 'No', style: 'cancel' },
        { 
          text: 'Sí, reprogramar', 
          onPress: () => {
            // Aquí iría la lógica para reprogramar
            Alert.alert('Info', 'Funcionalidad de reprogramación en desarrollo');
          }
        },
      ]
    );
  };

  const filteredAppointments = appointments.filter(appointment => {
    if (filter === 'all') return true;
    return appointment.status === filter;
  });

  const renderAppointmentCard = (appointment) => (
    <View key={appointment.id} style={styles.appointmentCard}>
      <View style={styles.appointmentHeader}>
        <View style={styles.professionalInfo}>
          <Text style={styles.professionalName}>{appointment.professionalName}</Text>
          <Text style={styles.specialty}>{appointment.specialty}</Text>
        </View>
        <View style={styles.statusContainer}>
          <Ionicons
            name={getStatusIcon(appointment.status)}
            size={20}
            color={getStatusColor(appointment.status)}
          />
          <Text style={[styles.statusText, { color: getStatusColor(appointment.status) }]}>
            {getStatusLabel(appointment.status)}
          </Text>
        </View>
      </View>

      <View style={styles.appointmentDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="calendar" size={16} color="#666" />
          <Text style={styles.detailText}>
            {new Date(appointment.date).toLocaleDateString('es-ES', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </Text>
        </View>
        
        <View style={styles.detailRow}>
          <Ionicons name="time" size={16} color="#666" />
          <Text style={styles.detailText}>
            {appointment.time} ({appointment.duration} min)
          </Text>
        </View>
        
        <View style={styles.detailRow}>
          <Ionicons name="cash" size={16} color="#666" />
          <Text style={styles.detailText}>${appointment.price}</Text>
        </View>
        
        {appointment.notes && (
          <View style={styles.detailRow}>
            <Ionicons name="document-text" size={16} color="#666" />
            <Text style={styles.detailText}>{appointment.notes}</Text>
          </View>
        )}
      </View>

      <View style={styles.appointmentActions}>
        {appointment.status === 'confirmed' && (
          <>
            <TouchableOpacity
              style={[styles.actionButton, styles.rescheduleButton]}
              onPress={() => handleRescheduleAppointment(appointment.id)}
            >
              <Ionicons name="calendar" size={16} color="#667eea" />
              <Text style={styles.rescheduleButtonText}>Reprogramar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={() => handleCancelAppointment(appointment.id)}
            >
              <Ionicons name="close" size={16} color="#F44336" />
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </>
        )}
        
        {appointment.status === 'pending' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.cancelButton]}
            onPress={() => handleCancelAppointment(appointment.id)}
          >
            <Ionicons name="close" size={16} color="#F44336" />
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderFilterTabs = () => (
    <View style={styles.filterTabs}>
      {[
        { key: 'all', label: 'Todas', count: appointments.length },
        { key: 'confirmed', label: 'Confirmadas', count: appointments.filter(a => a.status === 'confirmed').length },
        { key: 'pending', label: 'Pendientes', count: appointments.filter(a => a.status === 'pending').length },
        { key: 'completed', label: 'Completadas', count: appointments.filter(a => a.status === 'completed').length },
        { key: 'cancelled', label: 'Canceladas', count: appointments.filter(a => a.status === 'cancelled').length },
      ].map(tab => (
        <TouchableOpacity
          key={tab.key}
          style={[styles.filterTab, filter === tab.key && styles.filterTabActive]}
          onPress={() => setFilter(tab.key)}
        >
          <Text style={[styles.filterTabText, filter === tab.key && styles.filterTabTextActive]}>
            {tab.label}
          </Text>
          <View style={[styles.filterTabCount, filter === tab.key && styles.filterTabCountActive]}>
            <Text style={[styles.filterTabCountText, filter === tab.key && styles.filterTabCountTextActive]}>
              {tab.count}
            </Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TurnarioLogo size="medium" />
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.newAppointmentButton}>
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {renderFilterTabs()}

      <ScrollView
        style={styles.appointmentsList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredAppointments.length > 0 ? (
          filteredAppointments.map(renderAppointmentCard)
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color="#ccc" />
            <Text style={styles.emptyStateTitle}>No hay citas</Text>
            <Text style={styles.emptyStateMessage}>
              {filter === 'all' 
                ? 'No tienes citas programadas'
                : `No hay citas ${filter === 'confirmed' ? 'confirmadas' : filter === 'pending' ? 'pendientes' : filter === 'completed' ? 'completadas' : 'canceladas'}`
              }
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  newAppointmentButton: {
    backgroundColor: '#667eea',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    marginHorizontal: 2,
    borderRadius: 8,
  },
  filterTabActive: {
    backgroundColor: '#f0f2ff',
  },
  filterTabText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  filterTabTextActive: {
    color: '#667eea',
    fontWeight: '600',
  },
  filterTabCount: {
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4,
    minWidth: 20,
    alignItems: 'center',
  },
  filterTabCountActive: {
    backgroundColor: '#667eea',
  },
  filterTabCountText: {
    fontSize: 10,
    color: '#666',
    fontWeight: '600',
  },
  filterTabCountTextActive: {
    color: 'white',
  },
  appointmentsList: {
    flex: 1,
    padding: 15,
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
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  professionalInfo: {
    flex: 1,
  },
  professionalName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  specialty: {
    fontSize: 14,
    color: '#666',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  appointmentDetails: {
    marginBottom: 15,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  appointmentActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  rescheduleButton: {
    backgroundColor: '#f0f2ff',
  },
  rescheduleButtonText: {
    color: '#667eea',
    fontSize: 12,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#fff5f5',
  },
  cancelButtonText: {
    color: '#F44336',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 100,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateMessage: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
});
