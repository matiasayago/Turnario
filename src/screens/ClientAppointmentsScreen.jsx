import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  FlatList,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

const APPOINTMENT_STATUSES = [
  { key: 'all', label: 'Todos', color: '#667eea' },
  { key: 'upcoming', label: 'Próximos', color: '#4CAF50' },
  { key: 'completed', label: 'Completados', color: '#2196F3' },
  { key: 'cancelled', label: 'Cancelados', color: '#F44336' },
];

export const ClientAppointmentsScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [appointments, setAppointments] = useState([]);
  const [filteredAppointments, setFilteredAppointments] = useState([]);

  useEffect(() => {
    loadAppointments();
  }, []);

  useEffect(() => {
    filterAppointments();
  }, [selectedStatus, appointments]);

  const loadAppointments = async () => {
    // Aquí se cargarían los datos reales desde la API
    // Por ahora usamos datos de ejemplo
    const mockAppointments = [
      {
        id: '1',
        professionalName: 'Dr. María González',
        professionalAvatar: 'https://via.placeholder.com/50',
        professionalSpecialty: 'Psicología',
        time: '14:30',
        date: '2024-07-08',
        service: 'Consulta Psicológica',
        status: 'upcoming',
        location: 'Centro Médico Central',
        price: 150,
        duration: 60,
        notes: 'Primera consulta de evaluación',
      },
      {
        id: '2',
        professionalName: 'Lic. Carlos Ruiz',
        professionalAvatar: 'https://via.placeholder.com/50',
        professionalSpecialty: 'Terapia Ocupacional',
        time: '16:00',
        date: '2024-07-10',
        service: 'Terapia Ocupacional',
        status: 'upcoming',
        location: 'Clínica Especializada',
        price: 120,
        duration: 45,
        notes: 'Seguimiento de tratamiento',
      },
      {
        id: '3',
        professionalName: 'Dr. Ana Martínez',
        professionalAvatar: 'https://via.placeholder.com/50',
        professionalSpecialty: 'Nutrición',
        time: '10:00',
        date: '2024-07-01',
        service: 'Consulta Nutricional',
        status: 'completed',
        location: 'Centro de Nutrición',
        price: 100,
        duration: 30,
        notes: 'Plan alimenticio personalizado',
      },
      {
        id: '4',
        professionalName: 'Lic. Pedro López',
        professionalAvatar: 'https://via.placeholder.com/50',
        professionalSpecialty: 'Fisioterapia',
        time: '15:30',
        date: '2024-06-25',
        service: 'Sesión de Fisioterapia',
        status: 'completed',
        location: 'Centro de Rehabilitación',
        price: 80,
        duration: 60,
        notes: 'Ejercicios de fortalecimiento',
      },
      {
        id: '5',
        professionalName: 'Dr. Laura Sánchez',
        professionalAvatar: 'https://via.placeholder.com/50',
        professionalSpecialty: 'Dermatología',
        time: '11:00',
        date: '2024-06-20',
        service: 'Consulta Dermatológica',
        status: 'cancelled',
        location: 'Clínica Dermatológica',
        price: 200,
        duration: 45,
        notes: 'Cancelado por el paciente',
      },
    ];

    setAppointments(mockAppointments);
  };

  const filterAppointments = () => {
    if (selectedStatus === 'all') {
      setFilteredAppointments(appointments);
    } else {
      setFilteredAppointments(
        appointments.filter(appointment => appointment.status === selectedStatus)
      );
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAppointments();
    setRefreshing(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'upcoming':
        return '#4CAF50';
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
      case 'upcoming':
        return 'Próximo';
      case 'completed':
        return 'Completado';
      case 'cancelled':
        return 'Cancelado';
      default:
        return 'Desconocido';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const renderAppointmentCard = ({ item }) => (
    <TouchableOpacity
      style={styles.appointmentCard}
      onPress={() => navigation.navigate('AppointmentDetails', { id: item.id })}
    >
      <View style={styles.appointmentHeader}>
        <View style={styles.professionalInfo}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {item.professionalName.split(' ').map(n => n[0]).join('')}
              </Text>
            </View>
          </View>
          <View style={styles.professionalDetails}>
            <Text style={styles.professionalName}>{item.professionalName}</Text>
            <Text style={styles.professionalSpecialty}>{item.professionalSpecialty}</Text>
            <Text style={styles.locationText}>{item.location}</Text>
          </View>
        </View>
        <View style={[
          styles.statusBadge,
          { backgroundColor: getStatusColor(item.status) }
        ]}>
          <Text style={styles.statusText}>{getStatusLabel(item.status)}</Text>
        </View>
      </View>

      <View style={styles.appointmentDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="calendar" size={16} color="#667eea" />
          <Text style={styles.detailText}>{formatDate(item.date)}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="time" size={16} color="#667eea" />
          <Text style={styles.detailText}>{item.time} ({item.duration} min)</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="medical" size={16} color="#667eea" />
          <Text style={styles.detailText}>{item.service}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="cash" size={16} color="#667eea" />
          <Text style={styles.detailText}>${item.price}</Text>
        </View>
      </View>

      {item.notes && (
        <View style={styles.notesContainer}>
          <Text style={styles.notesLabel}>Notas:</Text>
          <Text style={styles.notesText}>{item.notes}</Text>
        </View>
      )}

      <View style={styles.actionButtons}>
        {item.status === 'upcoming' && (
          <>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#4CAF50' }]}
              onPress={() => handleReschedule(item.id)}
            >
              <Ionicons name="calendar" size={16} color="white" />
              <Text style={styles.actionButtonText}>Reprogramar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#F44336' }]}
              onPress={() => handleCancel(item.id)}
            >
              <Ionicons name="close-circle" size={16} color="white" />
              <Text style={styles.actionButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </>
        )}
        {item.status === 'completed' && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#FF9800' }]}
            onPress={() => handleReview(item.id)}
          >
            <Ionicons name="star" size={16} color="white" />
            <Text style={styles.actionButtonText}>Calificar</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#667eea' }]}
          onPress={() => navigation.navigate('AppointmentDetails', { id: item.id })}
        >
          <Ionicons name="eye" size={16} color="white" />
          <Text style={styles.actionButtonText}>Ver Detalles</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const handleReschedule = (appointmentId) => {
    // Implementar lógica de reprogramación
    console.log('Reprogramar cita:', appointmentId);
  };

  const handleCancel = (appointmentId) => {
    // Implementar lógica de cancelación
    console.log('Cancelar cita:', appointmentId);
  };

  const handleReview = (appointmentId) => {
    // Implementar lógica de calificación
    console.log('Calificar cita:', appointmentId);
  };

  const renderStatusFilter = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.statusFilterContainer}
      contentContainerStyle={styles.statusFilterContent}
    >
      {APPOINTMENT_STATUSES.map((status) => (
        <TouchableOpacity
          key={status.key}
          style={[
            styles.statusFilterButton,
            selectedStatus === status.key && { backgroundColor: status.color }
          ]}
          onPress={() => setSelectedStatus(status.key)}
        >
          <Text style={[
            styles.statusFilterText,
            selectedStatus === status.key && { color: 'white' }
          ]}>
            {status.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mis Turnos</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('BookAppointment')}
        >
          <Ionicons name="add" size={24} color="#667eea" />
        </TouchableOpacity>
      </View>

      {renderStatusFilter()}

      <FlatList
        data={filteredAppointments}
        renderItem={renderAppointmentCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.appointmentsList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={60} color="#ccc" />
            <Text style={styles.emptyStateTitle}>
              {selectedStatus === 'all' ? 'No tienes turnos' : `No hay turnos ${APPOINTMENT_STATUSES.find(s => s.key === selectedStatus)?.label.toLowerCase()}`}
            </Text>
            <Text style={styles.emptyStateSubtitle}>
              {selectedStatus === 'all' 
                ? 'Reserva tu primera cita para comenzar' 
                : 'Los turnos aparecerán aquí cuando los tengas'
              }
            </Text>
            {selectedStatus === 'all' && (
              <TouchableOpacity
                style={styles.bookFirstButton}
                onPress={() => navigation.navigate('BookAppointment')}
              >
                <Text style={styles.bookFirstButtonText}>Reservar Cita</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />
    </View>
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
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    padding: 4,
  },
  statusFilterContainer: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  statusFilterContent: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  statusFilterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#e1e1e1',
    backgroundColor: 'white',
  },
  statusFilterText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  appointmentsList: {
    padding: 20,
  },
  appointmentCard: {
    backgroundColor: 'white',
    marginBottom: 15,
    padding: 20,
    borderRadius: 12,
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
    flexDirection: 'row',
    flex: 1,
  },
  avatarContainer: {
    marginRight: 15,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#667eea',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  professionalDetails: {
    flex: 1,
  },
  professionalName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  professionalSpecialty: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  locationText: {
    fontSize: 12,
    color: '#999',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '600',
  },
  appointmentDetails: {
    marginBottom: 15,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
  },
  notesContainer: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: '#333',
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 100,
    justifyContent: 'center',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  emptyState: {
    alignItems: 'center',
    padding: 60,
    backgroundColor: 'white',
    borderRadius: 12,
    marginTop: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    color: '#666',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 20,
  },
  bookFirstButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  bookFirstButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});


