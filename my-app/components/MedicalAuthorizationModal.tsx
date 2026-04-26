import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  useMedicalAuthorization,
  type PatientProfessionalRelationship,
} from '../contexts/MedicalAuthorizationContext';
import { useAuth } from '../contexts/AuthContext';

interface MedicalAuthorizationModalProps {
  visible: boolean;
  onClose: () => void;
}

function formatRelationshipDate(value: unknown): string {
  const d = value instanceof Date ? value : new Date(value as string | number);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
}

function relationshipTypeLabel(type: string): string {
  switch (type) {
    case 'current_patient':
      return 'Paciente habitual';
    case 'former_patient':
      return 'Antiguo paciente';
    case 'consultation_only':
      return 'Por consulta';
    default:
      return type;
  }
}

export const MedicalAuthorizationModal: React.FC<MedicalAuthorizationModalProps> = ({
  visible,
  onClose,
}) => {
  const { user } = useAuth();
  const {
    authorizations,
    accessLogs,
    requestAuthorization,
    revokeAuthorization,
    cancelPendingAuthorization,
    getPatientRelationships,
    canAccessMedicalHistory,
    refreshAuthorizations,
  } = useMedicalAuthorization();

  const [activeTab, setActiveTab] = useState<'authorizations' | 'relationships' | 'logs'>('authorizations');

  useEffect(() => {
    if (!visible || user?.userType !== 'professional') return;
    void refreshAuthorizations();
  }, [visible, user?.userType, refreshAuthorizations]);

  // Solo mostrar para profesionales
  if (user?.userType !== 'professional') {
    return null;
  }

  const professionalId = String((user as { _id?: string })._id ?? user.id ?? '');
  const patientRelationships = getPatientRelationships(professionalId);
  const recentAccessLogs = accessLogs
    .filter(log => log.professionalId === professionalId)
    .slice(0, 20);

  const handleRequestAuthorization = async (patientId: string, patientName: string) => {
    try {
      const scope = {
        consultations: true,
        documents: false,
        prescriptions: false,
        treatments: false,
        labResults: false,
        imaging: false,
      };

      const result = await requestAuthorization(patientId, 'limited_access', scope);

      if (result.success) {
        Alert.alert(
          'Solicitud enviada',
          `Se envió la solicitud para acceder al historial de ${patientName}. El paciente puede aprobarla desde su cuenta.`
        );
        await refreshAuthorizations();
      } else {
        const m = result.message.toLowerCase();
        const isDuplicate =
          m.includes('pendiente') ||
          m.includes('409') ||
          m.includes('duplicate') ||
          m.includes('ya hay');
        Alert.alert(
          isDuplicate ? 'Solicitud ya enviada' : 'No se pudo enviar',
          isDuplicate
            ? 'Ya existe una solicitud pendiente con este paciente. Esperá su respuesta o cancelala desde la pestaña Autorizaciones.'
            : result.message
        );
      }
    } catch (error) {
      console.error('Error solicitando autorización:', error);
      Alert.alert('❌ Error', 'Ocurrió un error al enviar la solicitud.');
    }
  };

  const handleCancelPending = async (authorizationId: string) => {
    Alert.alert(
      'Cancelar solicitud',
      '¿Desea cancelar esta solicitud pendiente? El paciente ya no la verá.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Cancelar solicitud',
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await cancelPendingAuthorization(authorizationId);
              if (success) {
                Alert.alert('Listo', 'La solicitud pendiente fue cancelada.');
                await refreshAuthorizations();
              } else {
                Alert.alert('Error', 'No se pudo cancelar la solicitud.');
              }
            } catch (error) {
              console.error('Error cancelando solicitud:', error);
              Alert.alert('Error', 'No se pudo cancelar la solicitud.');
            }
          },
        },
      ]
    );
  };

  const handleRevokeAuthorization = async (authorizationId: string) => {
    Alert.alert(
      'Revocar autorización',
      '¿Confirma revocar su acceso al historial de este paciente? También puede pedirle al paciente que revoque desde su cuenta.',
      [
        { text: 'Cerrar', style: 'cancel' },
        {
          text: 'Revocar',
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await revokeAuthorization(authorizationId, 'Revocada por el profesional');
              if (success) {
                Alert.alert('Listo', 'La autorización fue revocada.');
                await refreshAuthorizations();
              } else {
                Alert.alert('Error', 'No se pudo revocar. Verifique que siga activa.');
              }
            } catch (error) {
              console.error('Error revocando autorización:', error);
              Alert.alert('Error', 'No se pudo revocar la autorización.');
            }
          },
        },
      ]
    );
  };

  const renderAuthorizationItem = ({ item }: { item: (typeof authorizations)[0] }) => {
    const statusLabel =
      item.status === 'granted' && item.isActive
        ? { text: 'Activa', color: '#4CAF50' as const }
        : item.status === 'pending'
          ? { text: 'Pendiente (paciente)', color: '#FF9800' as const }
          : { text: 'Revocada / rechazada', color: '#9E9E9E' as const };

    const displayName = item.patientName?.trim()
      ? item.patientName
      : `Paciente ${item.patientId.slice(-6)}`;

    return (
      <View style={styles.authorizationItem}>
        <View style={styles.authorizationHeader}>
          <Text style={styles.patientName}>{displayName}</Text>
          <View style={styles.authorizationStatus}>
            <View style={[styles.statusDot, { backgroundColor: statusLabel.color }]} />
            <Text style={[styles.statusText, { color: statusLabel.color }]}>{statusLabel.text}</Text>
          </View>
        </View>

        <Text style={styles.authorizationType}>Tipo: {item.authorizationType}</Text>
        <Text style={styles.authorizationDate}>
          {item.grantedAt
            ? `Otorgada: ${new Date(item.grantedAt).toLocaleDateString()}`
            : `Solicitud: ${new Date(item.createdAt).toLocaleDateString()}`}
        </Text>

        <View style={styles.scopeContainer}>
          <Text style={styles.scopeTitle}>Alcance:</Text>
          <View style={styles.scopeGrid}>
            {Object.entries(item.scope).map(([key, value]) => (
              <View key={key} style={styles.scopeItem}>
                <Ionicons
                  name={value ? 'checkmark-circle' : 'close-circle'}
                  size={16}
                  color={value ? '#4CAF50' : '#F44336'}
                />
                <Text style={[styles.scopeText, { color: value ? '#4CAF50' : '#F44336' }]}>{key}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.authorizationActions}>
          {item.status === 'pending' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.revokeButton]}
              onPress={() => handleCancelPending(item.id)}
            >
              <Ionicons name="trash-outline" size={16} color="white" />
              <Text style={styles.actionButtonText}>Cancelar solicitud</Text>
            </TouchableOpacity>
          )}
          {item.status === 'granted' && item.isActive && (
            <TouchableOpacity
              style={[styles.actionButton, styles.revokeButton]}
              onPress={() => handleRevokeAuthorization(item.id)}
            >
              <Ionicons name="close-circle" size={16} color="white" />
              <Text style={styles.actionButtonText}>Revocar acceso</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderRelationshipItem = ({ item }: { item: PatientProfessionalRelationship }) => {
    const authPatientName = authorizations.find(
      (a) =>
        String(a.patientId) === String(item.patientId) && (a.patientName || '').trim() !== ''
    )?.patientName;
    const rawName =
      (item.patientName && item.patientName.trim()) || (authPatientName || '').trim();
    const hasProperName = !!rawName && rawName !== 'Cliente';
    const displayTitle = hasProperName
      ? rawName
      : rawName === 'Cliente'
        ? 'Cliente'
        : 'Paciente';
    const idRef = String(item.patientId);
    const idShort = idRef.length > 10 ? `···${idRef.slice(-6)}` : idRef;

    const pendingAuth = authorizations.find(
      (a) =>
        String(a.patientId) === String(item.patientId) &&
        String(a.professionalId) === String(professionalId) &&
        a.status === 'pending'
    );

    return (
    <View style={styles.relationshipItem}>
      <View style={styles.relationshipHeader}>
        <View style={styles.relationshipTitleBlock}>
          <Text style={styles.patientName} numberOfLines={2}>
            {displayTitle}
          </Text>
          <Text style={styles.patientIdHint} numberOfLines={1}>
            Ref. {idShort}
          </Text>
        </View>
        <View style={styles.relationshipStatus}>
          <View style={[styles.statusDot, { backgroundColor: item.isActive ? '#4CAF50' : '#9E9E9E' }]} />
          <Text style={[styles.statusText, { color: item.isActive ? '#4CAF50' : '#9E9E9E' }]}>
            {item.isActive ? 'Activa' : 'Inactiva'}
          </Text>
        </View>
      </View>

      <Text style={styles.relationshipType}>Relación: {relationshipTypeLabel(item.relationshipType)}</Text>
      <Text style={styles.relationshipDates}>
        Primera consulta: {formatRelationshipDate(item.firstConsultationDate)}
      </Text>
      <Text style={styles.relationshipDates}>
        Última consulta: {formatRelationshipDate(item.lastConsultationDate)}
      </Text>
      <Text style={styles.consultationCount}>
        Total consultas: {item.totalConsultations}
      </Text>

      <View style={styles.relationshipActions}>
        {canAccessMedicalHistory(professionalId, item.patientId) ? (
          <View style={styles.accessStatus}>
            <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
            <Text style={[styles.accessStatusText, { color: '#4CAF50' }]}>
              Acceso autorizado
            </Text>
          </View>
        ) : pendingAuth ? (
          <View style={styles.relationshipPendingBlock}>
            <View style={styles.accessStatus}>
              <Ionicons name="time-outline" size={18} color="#FF9800" />
              <Text style={[styles.accessStatusText, styles.pendingAccessText]}>
                Esperando respuesta del paciente
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.actionButton, styles.revokeButton]}
              onPress={() => pendingAuth.id && handleCancelPending(pendingAuth.id)}
            >
              <Ionicons name="trash-outline" size={16} color="white" />
              <Text style={styles.actionButtonText}>Cancelar solicitud</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.actionButton, styles.requestButton]}
            onPress={() =>
              handleRequestAuthorization(
                item.patientId,
                hasProperName ? rawName : `Paciente (${idShort})`
              )
            }
          >
            <Ionicons name="add-circle" size={16} color="white" />
            <Text style={styles.actionButtonText}>Solicitar acceso</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
    );
  };

  const renderAccessLogItem = ({ item }: { item: any }) => (
    <View style={styles.logItem}>
      <View style={styles.logHeader}>
        <Text style={styles.logType}>{item.accessType}</Text>
        <Text style={styles.logDate}>
          {new Date(item.accessDate).toLocaleString()}
        </Text>
      </View>
      
      <Text style={styles.logDetails}>
        Paciente: {item.patientId} | Registro: {item.recordType}
      </Text>
      
      <View style={styles.logStatus}>
        <Ionicons
          name={item.isAuthorized ? 'checkmark-circle' : 'close-circle'}
          size={16}
          color={item.isAuthorized ? '#4CAF50' : '#F44336'}
        />
        <Text style={[styles.logStatusText, { color: item.isAuthorized ? '#4CAF50' : '#F44336' }]}>
          {item.isAuthorized ? 'Autorizado' : 'Denegado'}
        </Text>
      </View>
      
      {item.reason && (
        <Text style={styles.logReason}>Motivo: {item.reason}</Text>
      )}
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Gestión de Autorizaciones Médicas</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'authorizations' && styles.activeTab]}
            onPress={() => setActiveTab('authorizations')}
          >
            <Text style={[styles.tabText, activeTab === 'authorizations' && styles.activeTabText]}>
              Autorizaciones
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, activeTab === 'relationships' && styles.activeTab]}
            onPress={() => setActiveTab('relationships')}
          >
            <Text style={[styles.tabText, activeTab === 'relationships' && styles.activeTabText]}>
              Relaciones
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, activeTab === 'logs' && styles.activeTab]}
            onPress={() => setActiveTab('logs')}
          >
            <Text style={[styles.tabText, activeTab === 'logs' && styles.activeTabText]}>
              Registro de Accesos
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView style={styles.content}>
          {activeTab === 'authorizations' && (
            <View>
              <Text style={styles.sectionTitle}>Solicitudes y autorizaciones</Text>
              {authorizations.length > 0 ? (
                authorizations.map((item) => (
                  <React.Fragment key={item.id}>{renderAuthorizationItem({ item })}</React.Fragment>
                ))
              ) : (
                <Text style={styles.emptyText}>No hay autorizaciones activas</Text>
              )}
            </View>
          )}

          {activeTab === 'relationships' && (
            <View>
              <Text style={styles.sectionTitle}>Relaciones con Pacientes</Text>
              {patientRelationships.length > 0 ? (
                patientRelationships.map((item) => (
                  <React.Fragment key={`${item.patientId}-${item.professionalId}`}>
                    {renderRelationshipItem({ item })}
                  </React.Fragment>
                ))
              ) : (
                <Text style={styles.emptyText}>No hay relaciones con pacientes</Text>
              )}
            </View>
          )}

          {activeTab === 'logs' && (
            <View>
              <Text style={styles.sectionTitle}>Registro de Accesos Recientes</Text>
              {recentAccessLogs.length > 0 ? (
                recentAccessLogs.map((item) => (
                  <React.Fragment key={item.id}>{renderAccessLogItem({ item })}</React.Fragment>
                ))
              ) : (
                <Text style={styles.emptyText}>No hay registros de acceso</Text>
              )}
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
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
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#2196F3',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
  },
  activeTabText: {
    color: '#2196F3',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    marginTop: 20,
  },
  authorizationItem: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  authorizationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  authorizationStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 5,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  authorizationType: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  authorizationDate: {
    fontSize: 12,
    color: '#999',
    marginBottom: 10,
  },
  scopeContainer: {
    marginBottom: 15,
  },
  scopeTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  scopeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  scopeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  scopeText: {
    fontSize: 12,
    textTransform: 'capitalize',
  },
  authorizationActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 5,
  },
  grantButton: {
    backgroundColor: '#4CAF50',
  },
  revokeButton: {
    backgroundColor: '#F44336',
  },
  requestButton: {
    backgroundColor: '#2196F3',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  relationshipItem: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  relationshipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 8,
  },
  relationshipTitleBlock: {
    flex: 1,
    minWidth: 0,
  },
  patientIdHint: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  relationshipStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  relationshipType: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  relationshipDates: {
    fontSize: 12,
    color: '#999',
    marginBottom: 3,
  },
  consultationCount: {
    fontSize: 12,
    color: '#999',
    marginBottom: 10,
  },
  relationshipActions: {
    alignItems: 'flex-end',
    width: '100%',
  },
  relationshipPendingBlock: {
    width: '100%',
    gap: 10,
    alignItems: 'stretch',
  },
  pendingAccessText: {
    color: '#E65100',
    flex: 1,
  },
  accessStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  accessStatusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  logItem: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  logType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  logDate: {
    fontSize: 12,
    color: '#999',
  },
  logDetails: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  logStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 5,
  },
  logStatusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  logReason: {
    fontSize: 11,
    color: '#999',
    fontStyle: 'italic',
  },
});
