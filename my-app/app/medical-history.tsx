// @ts-nocheck
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  TextInput,
  RefreshControl,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useMedicalHistory } from '../contexts/MedicalHistoryContext';
import { MedicalHistoryStats } from '../components/MedicalHistoryStats';
import { MedicalConsultationItem } from '../components/MedicalConsultationItem';
import { MedicalDocumentItem } from '../components/MedicalDocumentItem';
import { PrescriptionItem } from '../components/PrescriptionItem';
import { TreatmentItem } from '../components/TreatmentItem';
import { MedicalHistoryFilters } from '../contexts/MedicalHistoryContext';

export default function MedicalHistoryScreen() {
  const { user } = useAuth();
  const {
    consultations,
    documents,
    prescriptions,
    treatments,
    getConsultationsByPatient,
    getDocumentsByPatient,
    getPrescriptionsByPatient,
    getTreatmentsByPatient,
    getPatientStats,
    searchMedicalHistory,
    deleteConsultation,
    deleteDocument,
    discontinuePrescription,
    completeTreatment
  } = useMedicalHistory();

  // Estado local
  const [activeTab, setActiveTab] = useState<'overview' | 'consultations' | 'documents' | 'prescriptions' | 'treatments'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<MedicalHistoryFilters>({});
  const [refreshing, setRefreshing] = useState(false);

  // ID del paciente actual (en producción esto vendría del contexto de autenticación)
  const currentPatientId = String(user?._id || user?.id || '').trim();

  // Obtener datos filtrados
  const filteredConsultations = useMemo(() => {
    if (!currentPatientId) return [];
    return getConsultationsByPatient(currentPatientId, filters);
  }, [currentPatientId, filters, consultations, getConsultationsByPatient]);

  const filteredDocuments = useMemo(() => {
    if (!currentPatientId) return [];
    return getDocumentsByPatient(currentPatientId, filters);
  }, [currentPatientId, filters, documents, getDocumentsByPatient]);

  const filteredPrescriptions = useMemo(() => {
    if (!currentPatientId) return [];
    return getPrescriptionsByPatient(currentPatientId, filters);
  }, [currentPatientId, filters, prescriptions, getPrescriptionsByPatient]);

  const filteredTreatments = useMemo(() => {
    if (!currentPatientId) return [];
    return getTreatmentsByPatient(currentPatientId, filters);
  }, [currentPatientId, filters, treatments, getTreatmentsByPatient]);

  // Estadísticas del paciente
  const patientStats = useMemo(() => {
    if (!currentPatientId) {
      return {
        totalConsultations: 0,
        activeTreatments: 0,
        activePrescriptions: 0,
        totalDocuments: 0,
        lastVisit: null,
      };
    }
    return getPatientStats(currentPatientId);
  }, [currentPatientId, consultations, documents, prescriptions, treatments, getPatientStats]);

  // Resultados de búsqueda
  const searchResults = useMemo(() => {
    if (!currentPatientId || !searchQuery.trim()) return null;
    return searchMedicalHistory(currentPatientId, searchQuery);
  }, [searchQuery, currentPatientId, consultations, documents, prescriptions, treatments, searchMedicalHistory]);

  // Función para refrescar
  const onRefresh = async () => {
    setRefreshing(true);
    // Simular carga
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  // Funciones de manejo
  const handleDeleteConsultation = (consultationId: string) => {
    Alert.alert(
      'Eliminar Consulta',
      '¿Estás seguro de que quieres eliminar esta consulta médica?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => deleteConsultation(consultationId) }
      ]
    );
  };

  const handleDeleteDocument = (documentId: string) => {
    Alert.alert(
      'Eliminar Documento',
      '¿Estás seguro de que quieres eliminar este documento médico?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => deleteDocument(documentId) }
      ]
    );
  };

  const handleDiscontinuePrescription = (prescriptionId: string) => {
    Alert.prompt(
      'Discontinuar Prescripción',
      'Ingresa la razón para discontinuar esta prescripción:',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Discontinuar', 
          onPress: (reason) => {
            if (reason && reason.trim()) {
              discontinuePrescription(prescriptionId, reason.trim());
            }
          }
        }
      ]
    );
  };

  const handleCompleteTreatment = (treatmentId: string) => {
    Alert.prompt(
      'Completar Tratamiento',
      'Ingresa notas sobre la finalización del tratamiento:',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Completar', 
          onPress: (notes) => {
            if (notes && notes.trim()) {
              completeTreatment(treatmentId, notes.trim());
            }
          }
        }
      ]
    );
  };

  // Renderizar tabs
  const renderTabs = () => (
    <View style={styles.tabsContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
          onPress={() => setActiveTab('overview')}
        >
          <Ionicons 
            name="stats-chart" 
            size={20} 
            color={activeTab === 'overview' ? '#2196F3' : '#666'} 
          />
          <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>
            Resumen
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'consultations' && styles.activeTab]}
          onPress={() => setActiveTab('consultations')}
        >
          <Ionicons 
            name="medical" 
            size={20} 
            color={activeTab === 'consultations' ? '#2196F3' : '#666'} 
          />
          <Text style={[styles.tabText, activeTab === 'consultations' && styles.activeTabText]}>
            Consultas ({filteredConsultations.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'documents' && styles.activeTab]}
          onPress={() => setActiveTab('documents')}
        >
          <Ionicons 
            name="document-text" 
            size={20} 
            color={activeTab === 'documents' ? '#2196F3' : '#666'} 
          />
          <Text style={[styles.tabText, activeTab === 'documents' && styles.activeTabText]}>
            Documentos ({filteredDocuments.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'prescriptions' && styles.activeTab]}
          onPress={() => setActiveTab('prescriptions')}
        >
          <Ionicons 
            name="medical-outline" 
            size={20} 
            color={activeTab === 'prescriptions' ? '#2196F3' : '#666'} 
          />
          <Text style={[styles.tabText, activeTab === 'prescriptions' && styles.activeTabText]}>
            Prescripciones ({filteredPrescriptions.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'treatments' && styles.activeTab]}
          onPress={() => setActiveTab('treatments')}
        >
          <Ionicons 
            name="fitness" 
            size={20} 
            color={activeTab === 'treatments' ? '#2196F3' : '#666'} 
          />
          <Text style={[styles.tabText, activeTab === 'treatments' && styles.activeTabText]}>
            Tratamientos ({filteredTreatments.length})
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  const listRefreshControl = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      colors={['#2196F3']}
      tintColor="#2196F3"
    />
  );

  // Renderizar contenido según tab activo
  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <View style={styles.overviewContainer}>
            <MedicalHistoryStats stats={patientStats} />
            
            {searchQuery && searchResults && (
              <View style={styles.searchResultsContainer}>
                <Text style={styles.searchResultsTitle}>
                  Resultados de búsqueda para "{searchQuery}"
                </Text>
                
                {searchResults.consultations.length > 0 && (
                  <View style={styles.searchSection}>
                    <Text style={styles.searchSectionTitle}>Consultas ({searchResults.consultations.length})</Text>
                    {searchResults.consultations.map((consultation) => (
                      <MedicalConsultationItem
                        key={consultation.id}
                        consultation={consultation}
                        onPress={() => setActiveTab('consultations')}
                      />
                    ))}
                  </View>
                )}

                {searchResults.documents.length > 0 && (
                  <View style={styles.searchSection}>
                    <Text style={styles.searchSectionTitle}>Documentos ({searchResults.documents.length})</Text>
                    {searchResults.documents.map((document) => (
                      <MedicalDocumentItem
                        key={document.id}
                        document={document}
                        onPress={() => setActiveTab('documents')}
                      />
                    ))}
                  </View>
                )}

                {searchResults.prescriptions.length > 0 && (
                  <View style={styles.searchSection}>
                    <Text style={styles.searchSectionTitle}>Prescripciones ({searchResults.prescriptions.length})</Text>
                    {searchResults.prescriptions.map((prescription) => (
                      <PrescriptionItem
                        key={prescription.id}
                        prescription={prescription}
                        onPress={() => setActiveTab('prescriptions')}
                      />
                    ))}
                  </View>
                )}

                {searchResults.treatments.length > 0 && (
                  <View style={styles.searchSection}>
                    <Text style={styles.searchSectionTitle}>Tratamientos ({searchResults.treatments.length})</Text>
                    {searchResults.treatments.map((treatment) => (
                      <TreatmentItem
                        key={treatment.id}
                        treatment={treatment}
                        onPress={() => setActiveTab('treatments')}
                      />
                    ))}
                  </View>
                )}
              </View>
            )}
          </View>
        );

      case 'consultations':
        return (
          <FlatList
            data={filteredConsultations}
            renderItem={({ item }) => (
              <MedicalConsultationItem
                consultation={item}
                onEdit={() => {/* Implementar edición */}}
                onDelete={handleDeleteConsultation}
              />
            )}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            refreshControl={listRefreshControl}
          />
        );

      case 'documents':
        return (
          <FlatList
            data={filteredDocuments}
            renderItem={({ item }) => (
              <MedicalDocumentItem
                document={item}
                onEdit={() => {/* Implementar edición */}}
                onDelete={handleDeleteDocument}
              />
            )}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            refreshControl={listRefreshControl}
          />
        );

      case 'prescriptions':
        return (
          <FlatList
            data={filteredPrescriptions}
            renderItem={({ item }) => (
              <PrescriptionItem
                prescription={item}
                onEdit={() => {/* Implementar edición */}}
                onDiscontinue={handleDiscontinuePrescription}
              />
            )}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            refreshControl={listRefreshControl}
          />
        );

      case 'treatments':
        return (
          <FlatList
            data={filteredTreatments}
            renderItem={({ item }) => (
              <TreatmentItem
                treatment={item}
                onEdit={() => {/* Implementar edición */}}
                onComplete={handleCompleteTreatment}
                onAddMilestone={() => {/* Implementar agregar hito */}}
              />
            )}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            refreshControl={listRefreshControl}
          />
        );

      default:
        return null;
    }
  };

  if (user?.userType === 'professional') {
    return (
      <View style={[styles.container, styles.centeredMessage]}>
        <Ionicons name="medical-outline" size={48} color="#999" />
        <Text style={styles.blockedTitle}>Historial del paciente</Text>
        <Text style={styles.blockedText}>
          Como profesional, usa Estadísticas y Gestionar pacientes para el historial de cada paciente. Esta pantalla es para tu historial como cliente.
        </Text>
      </View>
    );
  }

  if (!currentPatientId) {
    return (
      <View style={[styles.container, styles.centeredMessage]}>
        <Ionicons name="person-circle-outline" size={48} color="#999" />
        <Text style={styles.blockedTitle}>Inicia sesión</Text>
        <Text style={styles.blockedText}>
          Necesitamos tu cuenta para mostrar tu historial médico.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Historial médico</Text>
        <Text style={styles.headerSubtitle}>
          Toda la información asociada a tu cuenta
        </Text>
      </View>

      {/* Barra de búsqueda */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar en historial médico..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearchQuery('')}
            style={styles.clearSearchButton}
          >
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      {renderTabs()}

      {/* Resumen: ScrollView. Listas: solo FlatList (evita VirtualizedList dentro de ScrollView). */}
      {activeTab === 'overview' ? (
        <ScrollView
          style={styles.content}
          refreshControl={listRefreshControl}
          showsVerticalScrollIndicator={false}
        >
          {renderContent()}
        </ScrollView>
      ) : (
        <View style={styles.content}>{renderContent()}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  centeredMessage: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  blockedTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    textAlign: 'center',
  },
  blockedText: {
    fontSize: 15,
    color: '#666',
    marginTop: 10,
    textAlign: 'center',
    lineHeight: 22,
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 16,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  clearSearchButton: {
    padding: 4,
  },
  tabsContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 4,
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#E3F2FD',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginLeft: 8,
  },
  activeTabText: {
    color: '#2196F3',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  overviewContainer: {
    padding: 16,
  },
  searchResultsContainer: {
    marginTop: 16,
  },
  searchResultsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  searchSection: {
    marginBottom: 24,
  },
  searchSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  listContent: {
    padding: 16,
  },
});
