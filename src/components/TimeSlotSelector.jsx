import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAvailability } from '../context/AvailabilityContext';
import { useTimeSlots } from '../hooks';

const TimeSlotSelector = ({
  selectedTime,
  onTimeSelect,
  selectedDate,
  professionalId,
  clinicId,
  serviceId,
  occupiedSlots = [],
  disabled = false,
  style = {},
  placeholder = "Seleccionar horario"
}) => {
  const [showModal, setShowModal] = useState(false);
  const [availableSlots, setAvailableSlots] = useState([]);
  const { getAvailableTimeSlots, isTimeSlotBlocked } = useAvailability();
  const { 
    loading, 
    error, 
    getAvailableTimeSlots: getSlotsFromAPI,
    formatDateForAPI 
  } = useTimeSlots();

  // Generar horarios disponibles cuando cambie la fecha o profesional
  useEffect(() => {
    if (selectedDate && professionalId) {
      loadAvailableSlots();
    }
  }, [selectedDate, professionalId]);

  const loadAvailableSlots = async () => {
    if (!selectedDate || !professionalId) return;

    try {
      // Formatear fecha para la API
      const formattedDate = formatDateForAPI(selectedDate);
      
      // Obtener horarios disponibles del hook
      const slots = await getSlotsFromAPI(professionalId, formattedDate, clinicId, serviceId, occupiedSlots);
      
      // Filtrar horarios bloqueados adicionales
      const availableSlots = slots.filter(slot => 
        !isTimeSlotBlocked(professionalId, selectedDate, slot)
      );

      setAvailableSlots(availableSlots);
      
      // Mostrar error si hay uno
      if (error) {
        console.warn('Error al cargar horarios:', error);
      }
    } catch (error) {
      console.error('Error al cargar horarios disponibles:', error);
      Alert.alert('Error', 'No se pudieron cargar los horarios disponibles');
      setAvailableSlots([]);
    }
  };

  const handleTimeSelect = (time) => {
    onTimeSelect(time);
    setShowModal(false);
  };

  const formatDisplayTime = (time) => {
    if (!time) return placeholder;
    return time;
  };

  const getTimeSlotStatus = (time) => {
    if (!selectedDate || !professionalId) return 'available';
    
    if (isTimeSlotBlocked(professionalId, selectedDate, time)) {
      return 'blocked';
    }
    
    return 'available';
  };

  const renderTimeSlot = (time) => {
    const status = getTimeSlotStatus(time);
    const isSelected = selectedTime === time;
    
    return (
      <TouchableOpacity
        key={time}
        style={[
          styles.timeSlot,
          status === 'blocked' && styles.timeSlotBlocked,
          isSelected && styles.timeSlotSelected
        ]}
        onPress={() => status !== 'blocked' && handleTimeSelect(time)}
        disabled={status === 'blocked'}
      >
        <Text style={[
          styles.timeSlotText,
          status === 'blocked' && styles.timeSlotTextBlocked,
          isSelected && styles.timeSlotTextSelected
        ]}>
          {time}
        </Text>
        {status === 'blocked' && (
          <View style={styles.blockedOverlay}>
            <Ionicons name="lock-closed" size={16} color="#fff" />
            <Text style={styles.blockedText}>Ocupado</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        style={[
          styles.selector,
          disabled && styles.selectorDisabled
        ]}
        onPress={() => !disabled && setShowModal(true)}
        disabled={disabled || !selectedDate || !professionalId}
      >
        <Text style={[
          styles.selectorText,
          !selectedTime && styles.selectorPlaceholder
        ]}>
          {formatDisplayTime(selectedTime)}
        </Text>
        <Ionicons 
          name="time" 
          size={20} 
          color={disabled ? "#ccc" : "#666"} 
        />
      </TouchableOpacity>

      {selectedDate && professionalId && (
        <Text style={styles.availabilityInfo}>
          {loading 
            ? 'Cargando horarios...' 
            : availableSlots.length > 0 
              ? `${availableSlots.length} horarios disponibles`
              : 'No hay horarios disponibles para esta fecha'
          }
        </Text>
      )}

      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setShowModal(false)}
            >
              <Ionicons name="arrow-back" size={24} color="#666" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Seleccionar Horario</Text>
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={loadAvailableSlots}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#667eea" />
              ) : (
                <Ionicons name="refresh" size={24} color="#667eea" />
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <Text style={styles.modalSubtitle}>
              Horarios disponibles para {selectedDate ? new Date(selectedDate).toLocaleDateString('es-ES') : 'la fecha seleccionada'}
            </Text>
            
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#667eea" />
                <Text style={styles.loadingText}>Cargando horarios disponibles...</Text>
              </View>
            ) : availableSlots.length > 0 ? (
              <ScrollView style={styles.timeGrid} showsVerticalScrollIndicator={false}>
                <View style={styles.timeGridContainer}>
                  {availableSlots.map(renderTimeSlot)}
                </View>
              </ScrollView>
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="time-outline" size={48} color="#ccc" />
                <Text style={styles.emptyText}>No hay horarios disponibles</Text>
                <Text style={styles.emptySubtext}>
                  Intenta seleccionar otra fecha o contacta al profesional
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  selectorDisabled: {
    backgroundColor: '#f5f5f5',
    borderColor: '#e0e0e0',
  },
  selectorText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  selectorPlaceholder: {
    color: '#999',
  },
  availabilityInfo: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    marginLeft: 4,
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
  backButton: {
    padding: 8,
  },
  refreshButton: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  timeGrid: {
    flex: 1,
  },
  timeGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
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
  timeSlotBlocked: {
    backgroundColor: '#f8d7da',
    borderColor: '#f5c6cb',
  },
  timeSlotSelected: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  timeSlotText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  timeSlotTextBlocked: {
    color: '#721c24',
  },
  timeSlotTextSelected: {
    color: '#fff',
  },
  blockedOverlay: {
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
  blockedText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});

export default TimeSlotSelector;
