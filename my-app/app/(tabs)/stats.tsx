import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';

export default function StatsScreen() {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [patientManagementSearchQuery, setPatientManagementSearchQuery] = useState('');
  const [patientManagementFilter, setPatientManagementFilter] = useState('all');
  const isProfessional = user?.userType === 'professional';

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  // Funciones para la gestión de pacientes
  const handleViewPatientDetails = (patient: any) => {
    Alert.alert(
      '📋 Detalles del Paciente',
      `Nombre: ${patient.name}\nEmail: ${patient.email}\nTeléfono: ${patient.phone}\nEstado: ${patient.status === 'active' ? 'Activo' : 'Inactivo'}\nVisitas: ${patient.visits}\nNotas: ${patient.notes}`,
      [{ text: 'OK' }]
    );
  };

  const handleEditPatient = (patient: any) => {
    Alert.alert(
      '✏️ Editar Paciente',
      `Función en desarrollo - Próximamente podrás editar a ${patient.name}`,
      [{ text: 'OK' }]
    );
  };

  const handleScheduleAppointment = (patient: any) => {
    Alert.alert(
      '📅 Agendar Cita',
      `Función en desarrollo - Próximamente podrás agendar cita para ${patient.name}`,
      [{ text: 'OK' }]
    );
  };

  const handleViewPatientHistory = (patient: any) => {
    Alert.alert(
      '📋 Historial del Paciente',
      `Historial de ${patient.name}:\n\n` +
      `• Total de visitas: ${patient.visits}\n` +
      `• Última visita: ${patient.lastVisit}\n` +
      `• Estado: ${patient.status === 'active' ? 'Activo' : 'Inactivo'}\n` +
      `• Notas: ${patient.notes}\n\n` +
      `Función en desarrollo - Próximamente se mostrará el historial completo de citas, tratamientos y notas médicas.`,
      [{ text: 'OK' }]
    );
  };

  // Renderizar pantalla de estadísticas para clientes
  if (!isProfessional) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Estadísticas</Text>
            <Text style={styles.headerSubtitle}>Resumen de tu actividad</Text>
          </View>

          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { borderLeftColor: '#4CAF50' }]}>
              <View style={styles.statHeader}>
                <View style={[styles.statIcon, { backgroundColor: '#4CAF50' }]}>
                  <Ionicons name="calendar" size={24} color="white" />
                </View>
                <View style={styles.statInfo}>
                  <Text style={styles.statValue}>24</Text>
                  <Text style={styles.statTitle}>Total Citas</Text>
                  <Text style={styles.statSubtitle}>En total</Text>
                </View>
              </View>
            </View>

            <View style={[styles.statCard, { borderLeftColor: '#2196F3' }]}>
              <View style={styles.statHeader}>
                <View style={[styles.statIcon, { backgroundColor: '#2196F3' }]}>
                  <Ionicons name="checkmark-circle" size={24} color="white" />
                </View>
                <View style={styles.statInfo}>
                  <Text style={styles.statValue}>20</Text>
                  <Text style={styles.statTitle}>Completadas</Text>
                  <Text style={styles.statSubtitle}>Exitosas</Text>
                </View>
              </View>
            </View>

            <View style={[styles.statCard, { borderLeftColor: '#F44336' }]}>
              <View style={styles.statHeader}>
                <View style={[styles.statIcon, { backgroundColor: '#F44336' }]}>
                  <Ionicons name="close-circle" size={24} color="white" />
                </View>
                <View style={styles.statInfo}>
                  <Text style={styles.statValue}>4</Text>
                  <Text style={styles.statTitle}>Canceladas</Text>
                  <Text style={styles.statSubtitle}>No realizadas</Text>
                </View>
              </View>
            </View>

            <View style={[styles.statCard, { borderLeftColor: '#FF9800' }]}>
              <View style={styles.statHeader}>
                <View style={[styles.statIcon, { backgroundColor: '#FF9800' }]}>
                  <Ionicons name="card" size={24} color="white" />
                </View>
                <View style={styles.statInfo}>
                  <Text style={styles.statValue}>$1200</Text>
                  <Text style={styles.statTitle}>Total Gastado</Text>
                  <Text style={styles.statSubtitle}>En servicios</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Resumen General</Text>
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Calificación Promedio:</Text>
                <View style={styles.ratingContainer}>
                  <Ionicons name="star" size={20} color="#FFD700" />
                  <Text style={styles.ratingText}>4.8</Text>
                </View>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Servicios Utilizados:</Text>
                <Text style={styles.summaryValue}>5</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Última Cita:</Text>
                <Text style={styles.summaryValue}>Hace 3 días</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Para profesionales, mostrar directamente la gestión de pacientes
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header de Gestión de Pacientes */}
        <View style={styles.patientManagementHeader}>
          <View style={styles.patientManagementHeaderContent}>
            <Text style={[styles.patientManagementTitle, styles.androidTextFix]}>
              🏥 Gestión de Pacientes
            </Text>
            <Text style={[styles.patientManagementSubtitle, styles.androidTextFix]}>
              Administra tu lista de pacientes
            </Text>
          </View>
        </View>

        {/* Panel de Estadísticas */}
        <View style={styles.patientManagementStats}>
          <View style={styles.patientManagementStatCard}>
            <Text style={[styles.patientManagementStatNumber, styles.androidTextFix]}>30</Text>
            <Text style={[styles.patientManagementStatLabel, styles.androidTextFix]}>Total</Text>
          </View>
          <View style={styles.patientManagementStatCard}>
            <Text style={[styles.patientManagementStatNumber, styles.androidTextFix]}>25</Text>
            <Text style={[styles.patientManagementStatLabel, styles.androidTextFix]}>Activos</Text>
          </View>
          <View style={styles.patientManagementStatCard}>
            <Text style={[styles.patientManagementStatNumber, styles.androidTextFix]}>5</Text>
            <Text style={[styles.patientManagementStatLabel, styles.androidTextFix]}>Inactivos</Text>
          </View>
          <View style={styles.patientManagementStatCard}>
            <Text style={[styles.patientManagementStatNumber, styles.androidTextFix]}>8</Text>
            <Text style={[styles.patientManagementStatLabel, styles.androidTextFix]}>Nuevos</Text>
          </View>
        </View>

        {/* Barra de Acciones */}
        <View style={styles.patientManagementActions}>
          <TouchableOpacity 
            style={styles.patientManagementActionButton}
            onPress={() => Alert.alert('Info', 'Función en desarrollo - Agregar Paciente')}
            activeOpacity={0.7}
          >
            <Ionicons name="person-add" size={20} color="white" />
            <Text style={[styles.patientManagementActionButtonText, styles.androidTextFix]}>Agregar Paciente</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.patientManagementActionButton}
            onPress={() => Alert.alert('Info', 'Función en desarrollo - Importar Pacientes')}
            activeOpacity={0.7}
          >
            <Ionicons name="download" size={20} color="white" />
            <Text style={[styles.patientManagementActionButtonText, styles.androidTextFix]}>Importar</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.patientManagementActionButton}
            onPress={() => Alert.alert('Info', 'Función en desarrollo - Exportar Pacientes')}
            activeOpacity={0.7}
          >
            <Ionicons name="share" size={20} color="white" />
            <Text style={[styles.patientManagementActionButtonText, styles.androidTextFix]}>Exportar</Text>
          </TouchableOpacity>
        </View>

        {/* Filtros y Búsqueda */}
        <View style={styles.patientManagementSearchSection}>
          <View style={styles.patientManagementSearchContainer}>
            <Ionicons name="search" size={20} color="#667eea" style={styles.patientManagementSearchIcon} />
            <TextInput
              style={[styles.patientManagementSearchInput, styles.androidTextFix]}
              placeholder="🔍 Buscar pacientes..."
              value={patientManagementSearchQuery}
              onChangeText={setPatientManagementSearchQuery}
              placeholderTextColor="#999"
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
          </View>
          
          <View style={styles.patientManagementFilters}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 10 }}>
              <TouchableOpacity 
                style={[styles.patientManagementFilterChip, patientManagementFilter === 'all' && styles.patientManagementFilterChipActive]}
                onPress={() => setPatientManagementFilter('all')}
                activeOpacity={0.7}
              >
                <Text style={[styles.patientManagementFilterChipText, patientManagementFilter === 'all' && styles.patientManagementFilterChipTextActive, styles.androidTextFix]}>Todos</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.patientManagementFilterChip, patientManagementFilter === 'active' && styles.patientManagementFilterChipActive]}
                onPress={() => setPatientManagementFilter('active')}
                activeOpacity={0.7}
              >
                <Text style={[styles.patientManagementFilterChipText, patientManagementFilter === 'active' && styles.patientManagementFilterChipTextActive, styles.androidTextFix]}>Activos</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.patientManagementFilterChip, patientManagementFilter === 'inactive' && styles.patientManagementFilterChipActive]}
                onPress={() => setPatientManagementFilter('inactive')}
                activeOpacity={0.7}
              >
                <Text style={[styles.patientManagementFilterChipText, patientManagementFilter === 'inactive' && styles.patientManagementFilterChipTextActive, styles.androidTextFix]}>Inactivos</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.patientManagementFilterChip, patientManagementFilter === 'recent' && styles.patientManagementFilterChipActive]}
                onPress={() => setPatientManagementFilter('recent')}
                activeOpacity={0.7}
              >
                <Text style={[styles.patientManagementFilterChipText, patientManagementFilter === 'recent' && styles.patientManagementFilterChipTextActive, styles.androidTextFix]}>Recientes</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>

        {/* Lista de Pacientes con Acciones */}
        <View style={styles.patientManagementList}>
          {[
            { id: '1', name: 'Ana Martínez', email: 'ana.martinez@email.com', phone: '+54 9 11 1234-5678', status: 'active', lastVisit: '2024-01-15', visits: 12, notes: 'Paciente frecuente, responde bien al tratamiento' },
            { id: '2', name: 'Luis Rodríguez', email: 'luis.rodriguez@email.com', phone: '+54 9 11 2345-6789', status: 'active', lastVisit: '2024-01-10', visits: 8, notes: 'Requiere seguimiento semanal' },
            { id: '3', name: 'María González', email: 'maria.gonzalez@email.com', phone: '+54 9 11 3456-7890', status: 'active', lastVisit: '2024-01-12', visits: 15, notes: 'Paciente estable, continuar tratamiento actual' },
            { id: '4', name: 'Carlos Silva', email: 'carlos.silva@email.com', phone: '+54 9 11 4567-8901', status: 'inactive', lastVisit: '2023-12-20', visits: 3, notes: 'No ha asistido últimamente' },
            { id: '5', name: 'Laura Torres', email: 'laura.torres@email.com', phone: '+54 9 11 5678-9012', status: 'active', lastVisit: '2024-01-08', visits: 6, notes: 'Nuevo paciente, primera consulta exitosa' }
          ]
          .filter(patient => {
            const matchesSearch = patient.name.toLowerCase().includes((patientManagementSearchQuery || '').toLowerCase()) ||
                                 patient.email.toLowerCase().includes((patientManagementSearchQuery || '').toLowerCase());
            
            if (patientManagementFilter === 'all') return matchesSearch;
            if (patientManagementFilter === 'active') return matchesSearch && patient.status === 'active';
            if (patientManagementFilter === 'inactive') return matchesSearch && patient.status === 'inactive';
            if (patientManagementFilter === 'recent') return matchesSearch && new Date(patient.lastVisit) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            
            return matchesSearch;
          })
          .map((patient) => (
            <View key={patient.id} style={[styles.patientManagementCard, patient.status === 'inactive' && styles.patientManagementCardInactive, styles.androidCardShadow]}>
              {/* Header de la Tarjeta */}
              <View style={styles.patientManagementCardHeader}>
                <View style={styles.patientManagementCardAvatar}>
                  <Ionicons name="person" size={24} color="white" />
                </View>
                <View style={styles.patientManagementCardInfo}>
                  <Text style={[styles.patientManagementCardName, styles.androidTextFix]}>{patient.name}</Text>
                  <Text style={[styles.patientManagementCardEmail, styles.androidTextFix]}>{patient.email}</Text>
                  <Text style={[styles.patientManagementCardPhone, styles.androidTextFix]}>{patient.phone}</Text>
                </View>
                <View style={styles.patientManagementCardStatus}>
                  <View style={[styles.patientManagementStatusBadge, patient.status === 'active' ? styles.patientManagementStatusActive : styles.patientManagementStatusInactive]}>
                    <Text style={[styles.patientManagementStatusText, styles.androidTextFix]}>
                      {patient.status === 'active' ? '🟢 Activo' : '🔴 Inactivo'}
                    </Text>
                  </View>
                  <Text style={[styles.patientManagementCardVisits, styles.androidTextFix]}>{patient.visits} visita{patient.visits !== 1 ? 's' : ''}</Text>
                </View>
              </View>

              {/* Detalles del Paciente */}
              <View style={styles.patientManagementCardDetails}>
                <Text style={[styles.patientManagementCardNotes, styles.androidTextFix]}>
                  <Text style={styles.patientManagementCardNotesLabel}>Notas: </Text>
                  {patient.notes}
                </Text>
                <Text style={[styles.patientManagementCardLastVisit, styles.androidTextFix]}>
                  Última visita: {patient.lastVisit}
                </Text>
              </View>

              {/* Acciones del Paciente */}
              <View style={styles.patientManagementCardActions}>
                <TouchableOpacity 
                  style={styles.patientManagementAction}
                  onPress={() => handleViewPatientDetails(patient)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="eye" size={16} color="#667eea" />
                  <Text style={[styles.patientManagementActionText, styles.androidTextFix]}>Ver</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.patientManagementAction}
                  onPress={() => handleEditPatient(patient)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="create" size={16} color="#FF9800" />
                  <Text style={[styles.patientManagementActionText, styles.androidTextFix]}>Editar</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.patientManagementAction}
                  onPress={() => handleScheduleAppointment(patient)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="calendar" size={16} color="#4CAF50" />
                  <Text style={[styles.patientManagementActionText, styles.androidTextFix]}>Agendar</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.patientManagementAction}
                  onPress={() => handleViewPatientHistory(patient)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="time" size={16} color="#9C27B0" />
                  <Text style={[styles.patientManagementActionText, styles.androidTextFix]}>Historial</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
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
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 20,
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
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
    marginLeft: 4,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 4,
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
  // Estilos optimizados para Android - Gestión de Pacientes
  patientManagementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#667eea',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
    elevation: 4,
  },
  patientManagementHeaderContent: {
    flex: 1,
  },
  patientManagementTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  patientManagementSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  patientManagementStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    elevation: 2,
  },
  patientManagementStatCard: {
    alignItems: 'center',
    flex: 1,
  },
  patientManagementStatNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  patientManagementStatLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  patientManagementActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    elevation: 2,
  },
  patientManagementActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#667eea',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    elevation: 3,
  },
  patientManagementActionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  patientManagementSearchSection: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    elevation: 2,
  },
  patientManagementSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 15,
    elevation: 1,
  },
  patientManagementSearchIcon: {
    marginRight: 10,
  },
  patientManagementSearchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 16,
    color: '#333',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  patientManagementFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  patientManagementFilterChip: {
    backgroundColor: '#e0e0e0',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginHorizontal: 4,
    marginVertical: 2,
    elevation: 1,
  },
  patientManagementFilterChipActive: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  patientManagementFilterChipText: {
    fontSize: 12,
    color: '#666',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  patientManagementFilterChipTextActive: {
    color: 'white',
  },
  patientManagementList: {
    flex: 1,
    padding: 20,
  },
  patientManagementCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  patientManagementCardInactive: {
    opacity: 0.7,
  },
  patientManagementCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  patientManagementCardAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#667eea',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    elevation: 2,
  },
  patientManagementCardInfo: {
    flex: 1,
  },
  patientManagementCardName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  patientManagementCardEmail: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  patientManagementCardPhone: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  patientManagementCardStatus: {
    alignItems: 'flex-end',
  },
  patientManagementStatusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 1,
  },
  patientManagementStatusActive: {
    backgroundColor: '#4CAF50',
  },
  patientManagementStatusInactive: {
    backgroundColor: '#F44336',
  },
  patientManagementStatusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  patientManagementCardVisits: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  patientManagementCardDetails: {
    marginBottom: 10,
  },
  patientManagementCardNotes: {
    fontSize: 14,
    color: '#333',
    marginBottom: 5,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  patientManagementCardNotesLabel: {
    fontWeight: 'bold',
    color: '#666',
  },
  patientManagementCardLastVisit: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  patientManagementCardActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  patientManagementAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  patientManagementActionText: {
    fontSize: 12,
    color: '#667eea',
    marginLeft: 5,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  // Estilos adicionales para mejorar compatibilidad con Android
  androidSafeArea: {
    paddingTop: Platform.OS === 'android' ? 25 : 0,
  },
  androidCardShadow: {
    shadowColor: Platform.OS === 'android' ? undefined : '#000',
    shadowOffset: Platform.OS === 'android' ? undefined : { width: 0, height: 2 },
    shadowOpacity: Platform.OS === 'android' ? undefined : 0.1,
    shadowRadius: Platform.OS === 'android' ? undefined : 4,
    elevation: Platform.OS === 'android' ? 4 : 3,
  },
  androidTextFix: {
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});
