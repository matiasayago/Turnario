// @ts-nocheck
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Modal,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { ProfessionalAvailability, useAvailability } from '../contexts/AvailabilityContext';

const DEFAULT_DAYS_OF_WEEK: ProfessionalAvailability['daysOfWeek'] = {
  monday: true,
  tuesday: true,
  wednesday: true,
  thursday: true,
  friday: true,
  saturday: false,
  sunday: false,
};

/** El API puede devolver documentos sin workingHours/breakTime; evita .start de undefined. */
function normalizeProfessionalAvailability(
  raw: Partial<ProfessionalAvailability> & { _id?: string }
): ProfessionalAvailability {
  const wh = raw.workingHours && typeof raw.workingHours === 'object' ? raw.workingHours : {};
  const bt = raw.breakTime && typeof raw.breakTime === 'object' ? raw.breakTime : {};
  const id = raw.id || raw._id || `avail_${Date.now()}`;
  return {
    ...raw,
    id: String(id),
    professionalId: String(raw.professionalId || ''),
    professionalName: raw.professionalName || 'Profesional',
    daysOfWeek: { ...DEFAULT_DAYS_OF_WEEK, ...(raw.daysOfWeek || {}) },
    timeSlots: Array.isArray(raw.timeSlots) ? [...raw.timeSlots] : [],
    workingHours: {
      start: typeof wh.start === 'string' && wh.start ? wh.start : '09:00',
      end: typeof wh.end === 'string' && wh.end ? wh.end : '18:00',
    },
    breakTime: {
      start: typeof bt.start === 'string' && bt.start ? bt.start : '13:00',
      end: typeof bt.end === 'string' && bt.end ? bt.end : '14:00',
    },
    isActive: raw.isActive !== false,
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || new Date().toISOString(),
  } as ProfessionalAvailability;
}

export default function AvailabilitySettingsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  
  console.log('?? AvailabilitySettings - Usuario completo:', JSON.stringify(user, null, 2));
  const { 
    getAvailabilityByProfessional, 
    updateAvailability, 
    createAvailability,
    syncWithBackend,
    isLoading 
  } = useAvailability();

  const [availability, setAvailability] = useState<ProfessionalAvailability | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showTimeSlotModal, setShowTimeSlotModal] = useState(false);
  const [newTimeSlot, setNewTimeSlot] = useState('');
  const [editingTimeSlot, setEditingTimeSlot] = useState<string | null>(null);
  const [isCreatingAvailability, setIsCreatingAvailability] = useState(false);

  useEffect(() => {
    const userId = user?._id || user?.id;
    console.log('?? useEffect - user:', userId, user?.fullName, user?.userType);
    if (userId) {
      loadAvailability();
    } else {
      console.log('? No hay usuario logueado');
    }
  }, [user?._id, user?.id]);

  const loadAvailability = async () => {
    const userId = user?._id || user?.id;
    if (!userId) return;
    
    console.log('?? Buscando disponibilidad para usuario:', userId, user.fullName);
    
    try {
      // Primero intentar sincronizar con el backend
      console.log('?? Intentando sincronizar con backend...');
      const syncedAvailability = await syncWithBackend(userId);
      
      if (syncedAvailability) {
        console.log('? Disponibilidad encontrada en backend:', syncedAvailability);
        setAvailability(normalizeProfessionalAvailability(syncedAvailability));
        return;
      }
      
      // Si no hay datos en el backend, buscar localmente
      const userAvailability = getAvailabilityByProfessional(userId);
      console.log('?? Disponibilidad encontrada localmente:', userAvailability);
      
      if (userAvailability) {
        setAvailability(normalizeProfessionalAvailability(userAvailability));
      } else {
        // Crear disponibilidad por defecto si no existe
        console.log('?? Creando disponibilidad por defecto para:', userId);
        createDefaultAvailability();
      }
    } catch (error) {
      console.error('? Error cargando disponibilidad:', error);
      
      // Fallback: buscar localmente
      const userAvailability = getAvailabilityByProfessional(userId);
      if (userAvailability) {
        setAvailability(normalizeProfessionalAvailability(userAvailability));
      } else {
        createDefaultAvailability();
      }
    }
  };

  // Función para recargar datos desde la base de datos
  const reloadFromDatabase = async () => {
    const userId = user?._id || user?.id;
    if (!userId) return;
    
    console.log('?? Recargando datos desde la base de datos...');
    
    try {
      // Forzar sincronización con el backend
      const syncedAvailability = await syncWithBackend(userId);
      
      if (syncedAvailability) {
        console.log('? Datos recargados desde la base de datos:', syncedAvailability);
        setAvailability(normalizeProfessionalAvailability(syncedAvailability));
        Alert.alert('Éxito', 'Datos recargados correctamente desde la base de datos');
      } else {
        console.log('?? No se encontraron datos en la base de datos');
        Alert.alert('Información', 'No se encontraron datos guardados en la base de datos');
      }
    } catch (error) {
      console.error('? Error recargando datos:', error);
      Alert.alert('Error', 'No se pudieron recargar los datos desde la base de datos');
    }
  };

  const createDefaultAvailability = async () => {
    const userId = user?._id || user?.id;
    console.log('?? createDefaultAvailability llamada');
    console.log('?? Usuario ID:', userId);
    console.log('?? Usuario nombre:', user?.fullName);
    
    if (!userId || !user?.fullName) {
      console.log('? No se puede crear disponibilidad: usuario incompleto');
      Alert.alert('Error', 'Información de usuario incompleta');
      return;
    }

    try {
      setIsCreatingAvailability(true);
      console.log('?? Creando disponibilidad por defecto para:', userId, user.fullName);
      
      const newAvailability = {
        professionalId: userId,
        professionalName: user.fullName,
        daysOfWeek: {
          monday: true,
          tuesday: true,
          wednesday: true,
          thursday: true,
          friday: true,
          saturday: true,
          sunday: false,
        },
        timeSlots: ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '15:30', '16:00', '17:00'],
        workingHours: {
          start: '09:00',
          end: '18:00',
        },
        breakTime: {
          start: '13:00',
          end: '14:00',
        },
        isActive: true,
      };
      
      console.log('?? Llamando a createAvailability con:', newAvailability);
      await createAvailability(newAvailability);
      
      console.log('? Disponibilidad creada exitosamente, configurando estado local...');
      
      // Crear el objeto de disponibilidad localmente
      const localAvailability = normalizeProfessionalAvailability({
        ...newAvailability,
        id: `avail_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      
      setAvailability(localAvailability);
      
    } catch (error) {
      console.error('? Error creando disponibilidad por defecto:', error);
      console.error('? Error details:', JSON.stringify(error, null, 2));
      Alert.alert('Error', `No se pudo crear la configuración de disponibilidad: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setIsCreatingAvailability(false);
    }
  };

  const toggleDayAvailability = (day: keyof ProfessionalAvailability['daysOfWeek']) => {
    if (!availability) return;

    const updatedAvailability = {
      ...availability,
      daysOfWeek: {
        ...availability.daysOfWeek,
        [day]: !availability.daysOfWeek[day],
      },
    };

    setAvailability(updatedAvailability);
  };

  const validateAvailability = (): string | null => {
    if (!availability) return 'No hay configuración de disponibilidad';

    // Validar que al menos un día esté seleccionado
    const hasAvailableDays = Object.values(availability.daysOfWeek).some(day => day);
    if (!hasAvailableDays) {
      return 'Debes seleccionar al menos un día de trabajo';
    }

    // Validar horarios de trabajo
    const startTime = availability.workingHours?.start;
    const endTime = availability.workingHours?.end;
    
    if (!startTime || !endTime) {
      return 'Debes especificar horarios de inicio y fin';
    }

    // Validar formato de horarios (HH:MM)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      return 'Los horarios deben tener el formato HH:MM (ej: 09:00)';
    }

    // Validar que el horario de inicio sea anterior al de fin
    const startMinutes = parseInt(startTime.split(':')[0]) * 60 + parseInt(startTime.split(':')[1]);
    const endMinutes = parseInt(endTime.split(':')[0]) * 60 + parseInt(endTime.split(':')[1]);
    
    if (startMinutes >= endMinutes) {
      return 'El horario de inicio debe ser anterior al horario de fin';
    }

    // Validar que haya al menos un horario disponible
    if (!availability.timeSlots || availability.timeSlots.length === 0) {
      return 'Debes configurar al menos un horario disponible';
    }

    // Validar que los horarios están dentro del rango de trabajo
    const invalidTimeSlots = (availability.timeSlots || []).filter(timeSlot => {
      const slotMinutes = parseInt(timeSlot.split(':')[0]) * 60 + parseInt(timeSlot.split(':')[1]);
      return slotMinutes < startMinutes || slotMinutes >= endMinutes;
    });

    if (invalidTimeSlots.length > 0) {
      return `Los horarios ${invalidTimeSlots.join(', ')} están fuera del rango de trabajo (${startTime} - ${endTime})`;
    }

    return null;
  };

  const saveAvailability = async () => {
    const userId = user?._id || user?.id;
    if (!availability || !userId) {
      console.log('? No se puede guardar: disponibilidad o usuario incompleto');
      Alert.alert('Error', 'No se puede guardar la configuración');
      return;
    }

    // Validar configuración antes de guardar
    const validationError = validateAvailability();
    if (validationError) {
      Alert.alert('Error de validación', validationError);
      return;
    }

    try {
      console.log('?? Guardando disponibilidad para usuario:', userId);
      console.log('?? Datos a guardar:', JSON.stringify(availability, null, 2));
      
      await updateAvailability(userId, availability);
      
      console.log('? Disponibilidad guardada exitosamente');
      setIsEditing(false);
      Alert.alert('Éxito', 'Configuración de disponibilidad guardada correctamente');
    } catch (error) {
      console.error('? Error guardando disponibilidad:', error);
      console.error('? Error details:', JSON.stringify(error, null, 2));
      Alert.alert('Error', `No se pudo guardar la configuración: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  };

  const addTimeSlot = () => {
    if (!newTimeSlot.trim() || !availability) return;

    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(newTimeSlot)) {
      Alert.alert('Error', 'Formato de hora inválido. Use HH:MM (ej: 09:30)');
      return;
    }

    const currentSlots = availability.timeSlots || [];
    if (currentSlots.includes(newTimeSlot)) {
      Alert.alert('Error', 'Este horario ya existe');
      return;
    }

    const updatedTimeSlots = [...currentSlots, newTimeSlot].sort();
    setAvailability({
      ...availability,
      timeSlots: updatedTimeSlots,
    });
    setNewTimeSlot('');
    setShowTimeSlotModal(false);
  };

  // Función para generar horarios por defecto (igual que en TimeSlotSelector)
  const getDefaultTimeSlots = () => {
    const slots = [];
    
    // Horarios de ma?ana (9:00 - 12:00)
    for (let hour = 9; hour < 12; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(time);
      }
    }
    
    // Horarios de tarde (14:00 - 18:00)
    for (let hour = 14; hour < 18; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(time);
      }
    }
    
    return slots;
  };

  // Función para alternar selección de horarios
  const handleTimeSlotToggle = (time: string) => {
    const slots = availability.timeSlots || [];
    if (slots.includes(time)) {
      removeTimeSlot(time);
    } else {
      setAvailability(prev => ({
        ...prev,
        timeSlots: [...(prev.timeSlots || []), time],
      }));
    }
  };

  const removeTimeSlot = (timeSlot: string) => {
    if (!availability) return;

    Alert.alert(
      'Eliminar Horario',
      `¿Estás seguro de que quieres eliminar el horario ${timeSlot}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            const updatedTimeSlots = availability.timeSlots.filter(slot => slot !== timeSlot);
            setAvailability({
              ...availability,
              timeSlots: updatedTimeSlots,
            });
          },
        },
      ]
    );
  };

  const updateWorkingHours = (type: 'start' | 'end', value: string) => {
    if (!availability) return;

    // Validar formato básico
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (value && !timeRegex.test(value)) {
      Alert.alert('Formato inválido', 'El horario debe tener el formato HH:MM (ej: 09:00)');
      return;
    }

    setAvailability({
      ...availability,
      workingHours: {
        start: availability.workingHours?.start || '09:00',
        end: availability.workingHours?.end || '18:00',
        ...availability.workingHours,
        [type]: value,
      },
    });
  };

  const updateBreakTime = (type: 'start' | 'end', value: string) => {
    if (!availability) return;

    setAvailability({
      ...availability,
      breakTime: {
        start: availability.breakTime?.start || '13:00',
        end: availability.breakTime?.end || '14:00',
        ...availability.breakTime,
        [type]: value,
      },
    });
  };

  if (isLoading || isCreatingAvailability) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>
            {isCreatingAvailability ? 'Creando configuración...' : 'Cargando configuración...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!availability) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#F44336" />
          <Text style={styles.errorText}>No se pudo cargar la configuración de disponibilidad</Text>
          <Text style={styles.debugText}>
            Usuario: {user?.id} | Tipo: {user?.userType}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadAvailability}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.retryButton, { backgroundColor: '#667eea', marginTop: 10 }]} 
            onPress={createDefaultAvailability}
          >
            <Text style={styles.retryButtonText}>Crear Configuración</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Configurar Disponibilidad</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.reloadButton}
            onPress={reloadFromDatabase}
          >
            <Ionicons name="refresh" size={20} color="#667eea" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => setIsEditing(!isEditing)}
          >
            <Ionicons name={isEditing ? "checkmark" : "create"} size={24} color="#667eea" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* Información de sincronización */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información de Datos</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="information-circle" size={20} color="#667eea" />
              <Text style={styles.infoText}>
                Los datos se cargan automáticamente desde la base de datos al abrir esta pantalla.
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="refresh" size={20} color="#667eea" />
              <Text style={styles.infoText}>
                Usa el botón de recarga para obtener los datos más recientes.
              </Text>
            </View>
          </View>
        </View>

        {/* Estado de disponibilidad */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Estado General</Text>
          <View style={styles.statusCard}>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Disponibilidad Activa</Text>
              <Switch
                value={availability.isActive}
                onValueChange={(value) => 
                  setAvailability({ ...availability, isActive: value })
                }
                disabled={!isEditing}
              />
            </View>
          </View>
        </View>

        {/* Días de la semana */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Días de Trabajo</Text>
          <Text style={styles.sectionSubtitle}>
            Selecciona los días en los que estarás disponible para atender pacientes
          </Text>
          <View style={styles.daysContainer}>
            {Object.entries(availability.daysOfWeek).map(([day, isAvailable]) => (
              <TouchableOpacity
                key={day}
                style={[
                  styles.dayButton,
                  isAvailable && styles.dayButtonActive,
                  !isEditing && styles.dayButtonDisabled,
                ]}
                onPress={() => isEditing && toggleDayAvailability(day as keyof ProfessionalAvailability['daysOfWeek'])}
                disabled={!isEditing}
              >
                <Text style={[
                  styles.dayButtonText,
                  isAvailable && styles.dayButtonTextActive,
                ]}>
                  {day.charAt(0).toUpperCase() + day.slice(1)}
                </Text>
                {isAvailable && (
                  <Ionicons 
                    name="checkmark-circle" 
                    size={16} 
                    color="white" 
                    style={styles.dayCheckIcon}
                  />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Horarios de trabajo */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Horarios de Trabajo</Text>
          <Text style={styles.sectionSubtitle}>
            Define tu horario general de trabajo (estos horarios se aplicarán a todos los días seleccionados)
          </Text>
          <View style={styles.timeContainer}>
            <View style={styles.timeRow}>
              <Text style={styles.timeLabel}>Inicio:</Text>
              <TextInput
                style={[styles.timeInput, !isEditing && styles.timeInputDisabled]}
                value={availability.workingHours?.start ?? '09:00'}
                onChangeText={(value) => updateWorkingHours('start', value)}
                editable={isEditing}
                placeholder="09:00"
                keyboardType="numeric"
              />
            </View>
            <View style={styles.timeRow}>
              <Text style={styles.timeLabel}>Fin:</Text>
              <TextInput
                style={[styles.timeInput, !isEditing && styles.timeInputDisabled]}
                value={availability.workingHours?.end ?? '18:00'}
                onChangeText={(value) => updateWorkingHours('end', value)}
                editable={isEditing}
                placeholder="18:00"
                keyboardType="numeric"
              />
            </View>
          </View>
        </View>

        {/* Botón de guardar */}
        {isEditing && (
          <TouchableOpacity style={styles.saveButton} onPress={saveAvailability}>
            <Text style={styles.saveButtonText}>Guardar Cambios</Text>
          </TouchableOpacity>
        )}

        {/* Horarios disponibles */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Horarios Disponibles</Text>
            {isEditing && (
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => setShowTimeSlotModal(true)}
              >
                <Ionicons name="add" size={20} color="#667eea" />
                <Text style={styles.addButtonText}>Agregar</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.sectionSubtitle}>
            Selecciona los horarios específicos en los que estarás disponible para citas
          </Text>
          <View style={styles.timeGrid}>
            {(availability.timeSlots || []).map((timeSlot, index) => (
              <TouchableOpacity
                key={index}
                style={styles.timeSlot}
                onPress={() => isEditing && removeTimeSlot(timeSlot)}
              >
                <Text style={styles.timeSlotText}>{timeSlot}</Text>
                {isEditing && (
                  <View style={styles.removeOverlay}>
                    <Ionicons name="close" size={16} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
          {(!availability.timeSlots || availability.timeSlots.length === 0) && (
            <View style={styles.emptyState}>
              <Ionicons name="time-outline" size={48} color="#ccc" />
              <Text style={styles.emptyStateText}>No hay horarios configurados</Text>
              <Text style={styles.emptyStateSubtext}>
                Toca el botón "Agregar" para configurar tus horarios disponibles
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Modal para agregar horario */}
      <Modal
        visible={showTimeSlotModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowTimeSlotModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setShowTimeSlotModal(false)}
            >
              <Ionicons name="arrow-back" size={24} color="#666" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Seleccionar Horario</Text>
            <View style={styles.placeholder} />
          </View>

          <View style={styles.modalContent}>
            <Text style={styles.modalSubtitle}>
              Selecciona los horarios que deseas agregar a tu disponibilidad
            </Text>
            
            <ScrollView 
              style={styles.timeGridScrollView} 
              contentContainerStyle={styles.timeGrid}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.timeGridContainer}>
                {getDefaultTimeSlots().map((time) => (
                  <TouchableOpacity
                    key={time}
                    style={[
                      styles.timeSlot,
                      (availability.timeSlots || []).includes(time) && styles.timeSlotSelected
                    ]}
                    onPress={() => handleTimeSlotToggle(time)}
                  >
                    <Text style={[
                      styles.timeSlotText,
                      (availability.timeSlots || []).includes(time) && styles.timeSlotTextSelected
                    ]}>
                      {time}
                    </Text>
                    {(availability.timeSlots || []).includes(time) && (
                      <View style={styles.selectedOverlay}>
                        <Ionicons name="checkmark" size={16} color="#fff" />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reloadButton: {
    padding: 8,
    marginRight: 8,
  },
  editButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginVertical: 16,
  },
  debugText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: 'monospace',
  },
  retryButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  infoCard: {
    backgroundColor: '#f0f2ff',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#667eea',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
    lineHeight: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 16,
    color: '#333',
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e1e1e1',
    backgroundColor: 'white',
  },
  dayButtonActive: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  dayButtonDisabled: {
    opacity: 0.6,
  },
  dayButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  dayButtonTextActive: {
    color: 'white',
  },
  dayCheckIcon: {
    marginLeft: 4,
  },
  timeContainer: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  timeLabel: {
    fontSize: 16,
    color: '#333',
    width: 60,
  },
  timeInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e1e1e1',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
  },
  timeInputDisabled: {
    backgroundColor: '#f5f5f5',
    color: '#999',
  },
  addButton: {
    backgroundColor: '#f0f2ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  addButtonText: {
    color: '#667eea',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  timeGridScrollView: {
    flex: 1,
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  timeSlot: {
    width: '30%',
    aspectRatio: 2,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
    position: 'relative',
  },
  timeSlotText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  removeOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(220, 53, 69, 0.8)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: '#667eea',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    backgroundColor: '#fff',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  timeGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  timeSlotSelected: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  timeSlotTextSelected: {
    color: '#fff',
  },
  selectedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(102, 126, 234, 0.8)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
    fontWeight: '500',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
});
