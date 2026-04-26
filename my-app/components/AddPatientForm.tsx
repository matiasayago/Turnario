import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface AddPatientFormProps {
  newPatientData: any;
  setNewPatientData: (data: any) => void;
  selectedClient: any;
  setSelectedClient: (client: any) => void;
  showClientSelector: boolean;
  setShowClientSelector: (show: boolean) => void;
  clientUsers: any[];
  isLoadingClients: boolean;
  onSave: () => void;
  onCancel: () => void;
  /** En edición: nombre libre, sin catálogo; incluye todos los campos del detalle (estadísticas, etc.). */
  isEditMode?: boolean;
}

const AddPatientForm: React.FC<AddPatientFormProps> = ({
  newPatientData,
  setNewPatientData,
  selectedClient,
  setSelectedClient,
  showClientSelector,
  setShowClientSelector,
  clientUsers,
  isLoadingClients,
  onSave,
  onCancel,
  isEditMode = false,
}) => {
  const handleClientSelect = (client: any) => {
    console.log('👤 Cliente seleccionado:', client);
    
    setSelectedClient(client);
    setNewPatientData(prev => ({
      ...prev,
      fullName: client.fullName,
      email: client.email || '',
      phone: client.phone || '',
    }));
    setShowClientSelector(false);
  };

  return (
    <ScrollView style={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.formContainer}>
        {/* Información Personal */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>📋 Información Personal</Text>

          {isEditMode ? (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nombre completo *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Nombre y apellido"
                value={newPatientData.fullName}
                onChangeText={(text) => setNewPatientData((prev: any) => ({ ...prev, fullName: text }))}
                placeholderTextColor="#999"
              />
            </View>
          ) : (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nombre Completo del Paciente *</Text>

              <TouchableOpacity
                style={styles.catalogSelectorButton}
                onPress={() => {
                  console.log('🔘 Abriendo catálogo de usuarios cliente...');
                  setShowClientSelector(true);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.catalogSelectorContent}>
                  <Ionicons name="person" size={20} color="#667eea" />
                  <View style={styles.catalogSelectorTextContainer}>
                    {selectedClient ? (
                      <Text style={styles.catalogSelectorSelectedText}>
                        {selectedClient.fullName}
                      </Text>
                    ) : (
                      <Text style={styles.catalogSelectorPlaceholder}>
                        Seleccionar paciente del catálogo
                      </Text>
                    )}
                  </View>
                  <View style={styles.catalogSelectorInfo}>
                    <Text style={styles.catalogSelectorCount}>
                      {isLoadingClients
                        ? 'Cargando...'
                        : `${clientUsers.length} usuarios disponibles`}
                    </Text>
                    <Ionicons
                      name={isLoadingClients ? 'hourglass' : 'chevron-down'}
                      size={20}
                      color="#667eea"
                    />
                  </View>
                </View>
              </TouchableOpacity>

              {selectedClient && (
                <View style={styles.selectedPatientInfo}>
                  <View style={styles.patientInfoRow}>
                    <Ionicons name="call" size={16} color="#4CAF50" />
                    <Text style={styles.patientInfoText}>{selectedClient.phone || 'Sin teléfono'}</Text>
                  </View>
                  <View style={styles.patientInfoRow}>
                    <Ionicons name="mail" size={16} color="#2196F3" />
                    <Text style={styles.patientInfoText}>{selectedClient.email || 'Sin email'}</Text>
                  </View>
                  <View style={styles.patientInfoRow}>
                    <Ionicons name="person-circle" size={16} color="#FF9800" />
                    <Text style={styles.patientInfoText}>Usuario del Sistema</Text>
                  </View>
                </View>
              )}
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="ejemplo@email.com"
              value={newPatientData.email}
              onChangeText={(text) => setNewPatientData(prev => ({ ...prev, email: text }))}
              placeholderTextColor="#999"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Teléfono *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="+54 9 11 1234-5678"
              value={newPatientData.phone}
              onChangeText={(text) => setNewPatientData(prev => ({ ...prev, phone: text }))}
              placeholderTextColor="#999"
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputRow}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
              <Text style={styles.inputLabel}>Fecha de Nacimiento</Text>
              {isEditMode ? (
                <TextInput
                  style={styles.textInput}
                  placeholder="YYYY-MM-DD"
                  value={newPatientData.dateOfBirth}
                  onChangeText={(text) =>
                    setNewPatientData((prev: any) => ({ ...prev, dateOfBirth: text }))
                  }
                  placeholderTextColor="#999"
                />
              ) : (
                <TouchableOpacity
                  style={styles.dateSelectorButton}
                  onPress={() => {
                    Alert.alert(
                      'Seleccionar Fecha',
                      'Funcionalidad de selector de fecha próximamente',
                      [{ text: 'OK' }]
                    );
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.dateSelectorContent}>
                    <Ionicons name="calendar" size={20} color="#667eea" />
                    <View style={styles.dateSelectorTextContainer}>
                      {newPatientData.dateOfBirth ? (
                        <Text style={styles.dateSelectorSelectedText}>
                          {newPatientData.dateOfBirth}
                        </Text>
                      ) : (
                        <Text style={styles.dateSelectorPlaceholder}>DD/MM/AAAA</Text>
                      )}
                    </View>
                    <Ionicons name="chevron-down" size={16} color="#667eea" />
                  </View>
                </TouchableOpacity>
              )}
            </View>

            <View style={[styles.inputGroup, { flex: 1, marginLeft: 10 }]}>
              <Text style={styles.inputLabel}>Género</Text>
              <TouchableOpacity
                style={styles.genderSelector}
                onPress={() => {
                  Alert.alert('Seleccionar Género', 'Elige una opción:', [
                    {
                      text: 'Masculino',
                      onPress: () => setNewPatientData((prev: any) => ({ ...prev, gender: 'masculino' })),
                    },
                    {
                      text: 'Femenino',
                      onPress: () => setNewPatientData((prev: any) => ({ ...prev, gender: 'femenino' })),
                    },
                    {
                      text: 'No binario',
                      onPress: () => setNewPatientData((prev: any) => ({ ...prev, gender: 'no_binario' })),
                    },
                    {
                      text: 'Prefiero no decir',
                      onPress: () => setNewPatientData((prev: any) => ({ ...prev, gender: 'no_especificar' })),
                    },
                    { text: 'Cancelar', style: 'cancel' },
                  ]);
                }}
              >
                <Text
                  style={[styles.genderSelectorText, { color: newPatientData.gender ? '#333' : '#999' }]}
                >
                  {newPatientData.gender || 'Seleccionar...'}
                </Text>
                <Ionicons name="chevron-down" size={16} color="#999" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Dirección</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Ingresa la dirección completa"
              value={newPatientData.address}
              onChangeText={(text) => setNewPatientData(prev => ({ ...prev, address: text }))}
              placeholderTextColor="#999"
              multiline
              numberOfLines={2}
            />
          </View>
        </View>

        {/* Información de Contacto de Emergencia */}
        <View style={styles.formSection}>
          <Text style={styles.formSectionTitle}>🚨 Contacto de Emergencia</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              {isEditMode ? 'Nombre del contacto' : 'Nombre y Teléfono'}
            </Text>
            <TextInput
              style={styles.textInput}
              placeholder={
                isEditMode
                  ? 'Nombre del contacto de emergencia'
                  : 'Nombre del contacto de emergencia y teléfono'
              }
              value={newPatientData.emergencyContact}
              onChangeText={(text) =>
                setNewPatientData((prev: any) => ({ ...prev, emergencyContact: text }))
              }
              placeholderTextColor="#999"
            />
          </View>

          {isEditMode && (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Teléfono del contacto</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Teléfono"
                  value={newPatientData.emergencyContactPhone || ''}
                  onChangeText={(text) =>
                    setNewPatientData((prev: any) => ({ ...prev, emergencyContactPhone: text }))
                  }
                  placeholderTextColor="#999"
                  keyboardType="phone-pad"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Relación</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Ej: cónyuge, familiar"
                  value={newPatientData.emergencyContactRelationship || ''}
                  onChangeText={(text) =>
                    setNewPatientData((prev: any) => ({
                      ...prev,
                      emergencyContactRelationship: text,
                    }))
                  }
                  placeholderTextColor="#999"
                />
              </View>
            </>
          )}
        </View>

        {/* Información Médica */}
        <View style={styles.formSection}>
          <Text style={styles.formSectionTitle}>🏥 Información Médica</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Antecedentes Médicos</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="Condiciones médicas previas, cirugías, etc."
              value={newPatientData.medicalHistory}
              onChangeText={(text) =>
                setNewPatientData((prev: any) => ({ ...prev, medicalHistory: text }))
              }
              placeholderTextColor="#999"
              multiline
              numberOfLines={3}
            />
          </View>

          {isEditMode && (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Diagnóstico</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="Diagnóstico"
                  value={newPatientData.diagnosis || ''}
                  onChangeText={(text) =>
                    setNewPatientData((prev: any) => ({ ...prev, diagnosis: text }))
                  }
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={2}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Plan de Tratamiento</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="Plan de tratamiento"
                  value={newPatientData.treatmentPlan || ''}
                  onChangeText={(text) =>
                    setNewPatientData((prev: any) => ({ ...prev, treatmentPlan: text }))
                  }
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={2}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Obra Social / Cobertura</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Obra social o prepaga"
                  value={newPatientData.insurance || ''}
                  onChangeText={(text) =>
                    setNewPatientData((prev: any) => ({ ...prev, insurance: text }))
                  }
                  placeholderTextColor="#999"
                />
              </View>
            </>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Alergias</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Alergias conocidas (medicamentos, alimentos, etc.)"
              value={newPatientData.allergies}
              onChangeText={(text) => setNewPatientData((prev: any) => ({ ...prev, allergies: text }))}
              placeholderTextColor="#999"
            />
          </View>
        </View>

        {isEditMode && (
          <View style={styles.formSection}>
            <Text style={styles.formSectionTitle}>ℹ️ Información adicional</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Ocupación</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ocupación"
                value={newPatientData.occupation || ''}
                onChangeText={(text) =>
                  setNewPatientData((prev: any) => ({ ...prev, occupation: text }))
                }
                placeholderTextColor="#999"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Estado civil</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Estado civil"
                value={newPatientData.maritalStatus || ''}
                onChangeText={(text) =>
                  setNewPatientData((prev: any) => ({ ...prev, maritalStatus: text }))
                }
                placeholderTextColor="#999"
              />
            </View>
          </View>
        )}

        {isEditMode && (
          <View style={styles.formSection}>
            <Text style={styles.formSectionTitle}>📊 Estadísticas</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Estado del paciente</Text>
              <TouchableOpacity
                style={styles.genderSelector}
                onPress={() => {
                  Alert.alert('Estado', '¿Cómo figura el paciente?', [
                    {
                      text: 'Activo',
                      onPress: () =>
                        setNewPatientData((prev: any) => ({ ...prev, patientStatus: 'active' })),
                    },
                    {
                      text: 'Inactivo',
                      onPress: () =>
                        setNewPatientData((prev: any) => ({ ...prev, patientStatus: 'inactive' })),
                    },
                    { text: 'Cancelar', style: 'cancel' },
                  ]);
                }}
              >
                <Text style={styles.genderSelectorText}>
                  {newPatientData.patientStatus === 'inactive' ? 'Inactivo' : 'Activo'}
                </Text>
                <Ionicons name="chevron-down" size={16} color="#999" />
              </TouchableOpacity>
            </View>
            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.inputLabel}>Total de visitas</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="0"
                  value={
                    newPatientData.visitsCount !== undefined && newPatientData.visitsCount !== null
                      ? String(newPatientData.visitsCount)
                      : ''
                  }
                  onChangeText={(text) =>
                    setNewPatientData((prev: any) => ({ ...prev, visitsCount: text }))
                  }
                  placeholderTextColor="#999"
                  keyboardType="number-pad"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.inputLabel}>Última visita</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="YYYY-MM-DD"
                  value={newPatientData.lastVisitDate || ''}
                  onChangeText={(text) =>
                    setNewPatientData((prev: any) => ({ ...prev, lastVisitDate: text }))
                  }
                  placeholderTextColor="#999"
                />
              </View>
            </View>
          </View>
        )}

        {/* Notas Adicionales */}
        <View style={styles.formSection}>
          <Text style={styles.formSectionTitle}>📝 Notas Adicionales</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Notas</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="Información adicional relevante"
              value={newPatientData.notes}
              onChangeText={(text) => setNewPatientData((prev: any) => ({ ...prev, notes: text }))}
              placeholderTextColor="#999"
              multiline
              numberOfLines={3}
            />
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  modalScrollContent: {
    flex: 1,
    padding: 20,
  },
  formContainer: {
    paddingBottom: 20,
  },
  formSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  formSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#fff',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  catalogSelectorButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
  },
  catalogSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  catalogSelectorTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  catalogSelectorSelectedText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  catalogSelectorPlaceholder: {
    fontSize: 16,
    color: '#999',
  },
  catalogSelectorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  catalogSelectorCount: {
    fontSize: 12,
    color: '#667eea',
    marginRight: 8,
  },
  selectedPatientInfo: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
  },
  patientInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  patientInfoText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  dateSelectorButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
  },
  dateSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateSelectorTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  dateSelectorSelectedText: {
    fontSize: 16,
    color: '#333',
  },
  dateSelectorPlaceholder: {
    fontSize: 16,
    color: '#999',
  },
  genderSelector: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  genderSelectorText: {
    fontSize: 16,
  },
});

export default AddPatientForm;

