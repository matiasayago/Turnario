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
    completeTreatment,
    loadPatientHistory
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

  const recentClinicalSessions = useMemo(() => {
    const treatmentsByConsultation = new Map(
      filteredTreatments.map((item) => [String(item.consultationId), item])
    );
    return filteredConsultations
      .slice()
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 3)
      .map((consultation) => ({
        consultation,
        treatment: treatmentsByConsultation.get(String(consultation.id)),
      }));
  }, [filteredConsultations, filteredTreatments]);

  // Resultados de búsqueda
  const searchResults = useMemo(() => {
    if (!currentPatientId || !searchQuery.trim()) return null;
    return searchMedicalHistory(currentPatientId, searchQuery);
  }, [searchQuery, currentPatientId, consultations, documents, prescriptions, treatments, searchMedicalHistory]);

  // Función para refrescar
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      if (currentPatientId) await loadPatientHistory(currentPatientId);
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'No se pudo actualizar el historial.'
      );
    } finally {
      setRefreshing(false);
    }
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
      <View style={styles.tabsContent}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
          onPress={() => setActiveTab('overview')}
        >
          <Ionicons 
            name="grid-outline"
            size={18}
            color={activeTab === 'overview' ? '#FFFFFF' : '#64748B'}
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
            name="document-text-outline"
            size={18}
            color={activeTab === 'consultations' ? '#FFFFFF' : '#64748B'}
          />
          <Text style={[styles.tabText, activeTab === 'consultations' && styles.activeTabText]}>
            Notas
          </Text>
          {filteredConsultations.length > 0 && (
            <View style={[styles.tabCount, activeTab === 'consultations' && styles.activeTabCount]}>
              <Text style={[styles.tabCountText, activeTab === 'consultations' && styles.activeTabCountText]}>
                {filteredConsultations.length}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'documents' && styles.activeTab]}
          onPress={() => setActiveTab('documents')}
        >
          <Ionicons 
            name="folder-outline"
            size={18}
            color={activeTab === 'documents' ? '#FFFFFF' : '#64748B'}
          />
          <Text style={[styles.tabText, activeTab === 'documents' && styles.activeTabText]}>
            Docs
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'prescriptions' && styles.activeTab]}
          onPress={() => setActiveTab('prescriptions')}
        >
          <Ionicons 
            name="receipt-outline"
            size={18}
            color={activeTab === 'prescriptions' ? '#FFFFFF' : '#64748B'}
          />
          <Text style={[styles.tabText, activeTab === 'prescriptions' && styles.activeTabText]}>
            Recetas
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'treatments' && styles.activeTab]}
          onPress={() => setActiveTab('treatments')}
        >
          <Ionicons 
            name="medkit-outline"
            size={18}
            color={activeTab === 'treatments' ? '#FFFFFF' : '#64748B'}
          />
          <Text style={[styles.tabText, activeTab === 'treatments' && styles.activeTabText]}>
            Tratam.
          </Text>
          {filteredTreatments.length > 0 && (
            <View style={[styles.tabCount, activeTab === 'treatments' && styles.activeTabCount]}>
              <Text style={[styles.tabCountText, activeTab === 'treatments' && styles.activeTabCountText]}>
                {filteredTreatments.length}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
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

            {!searchQuery && (
              <View style={styles.recentSection}>
                <View style={styles.sectionHeading}>
                  <View>
                    <Text style={styles.sectionTitle}>Actividad reciente</Text>
                    <Text style={styles.sectionSubtitle}>Tus últimas sesiones registradas</Text>
                  </View>
                  {filteredConsultations.length > 3 && (
                    <TouchableOpacity
                      style={styles.viewAllButton}
                      onPress={() => setActiveTab('consultations')}
                    >
                      <Text style={styles.viewAllText}>Ver todas</Text>
                      <Ionicons name="chevron-forward" size={15} color="#5B5FEF" />
                    </TouchableOpacity>
                  )}
                </View>

                {recentClinicalSessions.length === 0 ? (
                  <View style={styles.emptyHistory}>
                    <View style={styles.emptyHistoryIcon}>
                      <Ionicons name="clipboard-outline" size={28} color="#94A3B8" />
                    </View>
                    <Text style={styles.emptyHistoryTitle}>Tu historial está vacío</Text>
                    <Text style={styles.emptyHistoryText}>
                      Las notas y tratamientos aparecerán cuando un profesional complete una sesión.
                    </Text>
                  </View>
                ) : (
                  recentClinicalSessions.map(({ consultation, treatment }, index) => {
                    const cleanNotes = String(consultation.notes || '')
                      .split('\n\nSesión ')[0]
                      .trim();
                    return (
                      <View key={consultation.id} style={styles.timelineItem}>
                        <View style={styles.timelineRail}>
                          <View style={styles.timelineDot} />
                          {index < recentClinicalSessions.length - 1 && (
                            <View style={styles.timelineLine} />
                          )}
                        </View>
                        <View style={styles.sessionCard}>
                          <View style={styles.sessionHeader}>
                            <View style={styles.sessionDateBadge}>
                              <Ionicons name="calendar-clear-outline" size={14} color="#4F46E5" />
                              <Text style={styles.sessionDate}>
                                {consultation.date.toLocaleDateString('es-AR')}
                              </Text>
                            </View>
                            <Text style={styles.sessionProfessional} numberOfLines={1}>
                              {consultation.professionalName}
                            </Text>
                          </View>
                          {cleanNotes ? (
                            <View style={styles.sessionContent}>
                              <View style={styles.sessionLabelRow}>
                                <Ionicons name="document-text-outline" size={16} color="#5B5FEF" />
                                <Text style={styles.noteLabel}>NOTA MÉDICA</Text>
                              </View>
                              <Text style={styles.sessionText}>{cleanNotes}</Text>
                            </View>
                          ) : null}
                          {treatment ? (
                            <View style={[styles.sessionContent, styles.treatmentContent]}>
                              <View style={styles.sessionLabelRow}>
                                <Ionicons name="medkit-outline" size={16} color="#059669" />
                                <Text style={styles.treatmentLabel}>TRATAMIENTO</Text>
                              </View>
                              <Text style={styles.sessionText}>{treatment.description}</Text>
                            </View>
                          ) : null}
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            )}
            
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
              />
            )}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={() => (
              <View style={styles.emptyList}>
                <Ionicons name="document-text-outline" size={34} color="#94A3B8" />
                <Text style={styles.emptyListTitle}>No hay notas médicas</Text>
                <Text style={styles.emptyListText}>Todavía no tenés notas de sesiones registradas.</Text>
              </View>
            )}
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
            ListEmptyComponent={() => (
              <View style={styles.emptyList}>
                <Ionicons name="folder-open-outline" size={34} color="#94A3B8" />
                <Text style={styles.emptyListTitle}>No hay documentos</Text>
                <Text style={styles.emptyListText}>Tus documentos médicos aparecerán aquí.</Text>
              </View>
            )}
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
            ListEmptyComponent={() => (
              <View style={styles.emptyList}>
                <Ionicons name="receipt-outline" size={34} color="#94A3B8" />
                <Text style={styles.emptyListTitle}>No hay prescripciones</Text>
                <Text style={styles.emptyListText}>Tus prescripciones aparecerán aquí.</Text>
              </View>
            )}
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
              />
            )}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={() => (
              <View style={styles.emptyList}>
                <Ionicons name="medkit-outline" size={34} color="#94A3B8" />
                <Text style={styles.emptyListTitle}>No hay tratamientos</Text>
                <Text style={styles.emptyListText}>Todavía no tenés tratamientos registrados.</Text>
              </View>
            )}
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
        <View style={styles.headerIcon}>
          <Ionicons name="heart-outline" size={24} color="#FFFFFF" />
        </View>
        <View style={styles.headerCopy}>
          <Text style={styles.headerEyebrow}>MI SALUD</Text>
          <Text style={styles.headerTitle}>Historial médico</Text>
          <Text style={styles.headerSubtitle}>Tu información clínica en un solo lugar</Text>
        </View>
      </View>

      {/* Barra de búsqueda */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#64748B" style={styles.searchIcon} />
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
    backgroundColor: '#F4F6FB',
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#667eea',
    paddingHorizontal: 18,
    paddingTop: 22,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    marginRight: 13,
  },
  headerCopy: {
    flex: 1,
  },
  headerEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.3,
    color: 'rgba(255,255,255,0.72)',
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 23,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.82)',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 12,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: '#E7EAF1',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#172033',
  },
  clearSearchButton: {
    padding: 4,
  },
  tabsContainer: {
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  tabsContent: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingBottom: 10,
    gap: 5,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    minHeight: 59,
    paddingHorizontal: 3,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E7EAF1',
  },
  activeTab: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  tabText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center',
  },
  activeTabText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  tabCount: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
  },
  activeTabCount: {
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  tabCountText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#4F46E5',
  },
  activeTabCountText: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  overviewContainer: {
    padding: 16,
    paddingTop: 8,
  },
  recentSection: {
    marginTop: 6,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#172033',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 3,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingLeft: 10,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5B5FEF',
  },
  emptyHistory: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 26,
    paddingVertical: 30,
  },
  emptyHistoryIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyHistoryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 5,
  },
  emptyHistoryText: {
    fontSize: 13,
    lineHeight: 19,
    color: '#64748B',
    textAlign: 'center',
  },
  timelineItem: {
    flexDirection: 'row',
  },
  timelineRail: {
    width: 24,
    alignItems: 'center',
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 19,
    backgroundColor: '#667eea',
    borderWidth: 3,
    borderColor: '#DDE3FF',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    minHeight: 25,
    backgroundColor: '#DDE3EE',
  },
  sessionCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginLeft: 7,
    marginBottom: 13,
    borderWidth: 1,
    borderColor: '#E8ECF3',
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sessionDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: '#EEF2FF',
    borderRadius: 9,
  },
  sessionDate: {
    fontSize: 12,
    color: '#4F46E5',
    fontWeight: '700',
  },
  sessionProfessional: {
    flex: 1,
    marginLeft: 8,
    textAlign: 'right',
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  sessionContent: {
    backgroundColor: '#F8FAFC',
    borderRadius: 11,
    padding: 11,
    marginTop: 7,
    borderLeftWidth: 3,
    borderLeftColor: '#818CF8',
  },
  treatmentContent: {
    backgroundColor: '#F0FDF4',
    borderLeftColor: '#34D399',
  },
  sessionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  noteLabel: {
    fontSize: 11,
    color: '#4F46E5',
    fontWeight: '800',
  },
  treatmentLabel: {
    fontSize: 11,
    color: '#047857',
    fontWeight: '800',
  },
  sessionText: {
    fontSize: 14,
    lineHeight: 21,
    color: '#334155',
  },
  emptyList: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 54,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    marginTop: 8,
  },
  emptyListTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
    marginTop: 12,
  },
  emptyListText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    marginTop: 5,
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
    paddingTop: 8,
    paddingBottom: 36,
  },
});
