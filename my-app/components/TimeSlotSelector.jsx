import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import useTimeSlots from '../hooks/useTimeSlots';

/** Misma referencia siempre — evita que `occupiedSlots = []` en cada render dispare useEffect en bucle. */
const EMPTY_OCCUPIED = [];

function formatYmdOrDateForEsLocale(selectedDate) {
  if (!selectedDate) return '';
  const s = String(selectedDate).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    return isNaN(dt.getTime()) ? s : dt.toLocaleDateString('es-ES');
  }
  const dt = new Date(selectedDate);
  return isNaN(dt.getTime()) ? String(selectedDate) : dt.toLocaleDateString('es-ES');
}

function buildDefaultTimeSlots() {
  const slots = [];
  for (let hour = 9; hour < 12; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      slots.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
    }
  }
  for (let hour = 14; hour < 18; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      slots.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
    }
  }
  return slots;
}

const TimeSlotSelector = ({
  selectedTime,
  onTimeSelect,
  selectedDate,
  professionalId,
  clinicId,
  serviceId,
  occupiedSlots = EMPTY_OCCUPIED,
  disabled = false,
  style = {},
  placeholder = "Seleccionar horario"
}) => {
  const [showModal, setShowModal] = useState(false);
  const [availableSlots, setAvailableSlots] = useState([]);
  const { 
    loading, 
    error, 
    getAvailableTimeSlots,
    formatDateForAPI 
  } = useTimeSlots();

  const occupiedKey =
    occupiedSlots === EMPTY_OCCUPIED || !occupiedSlots.length
      ? ''
      : occupiedSlots.join('|');

  const occupiedRef = useRef(occupiedSlots);
  occupiedRef.current = occupiedSlots;

  const loadAvailableSlots = useCallback(async () => {
    if (!selectedDate || !professionalId) return;

    try {
      const formattedDate = formatDateForAPI(selectedDate);
      const slots = await getAvailableTimeSlots(
        professionalId,
        formattedDate,
        clinicId,
        serviceId,
        occupiedRef.current
      );
      setAvailableSlots(slots);
    } catch (error) {
      console.error('Error al cargar horarios disponibles:', error);
      setAvailableSlots(buildDefaultTimeSlots());
    }
  }, [
    selectedDate,
    professionalId,
    formatDateForAPI,
    getAvailableTimeSlots,
    clinicId,
    serviceId,
  ]);

  useEffect(() => {
    if (selectedDate && professionalId) {
      loadAvailableSlots();
    } else if (showModal) {
      setAvailableSlots(buildDefaultTimeSlots());
    }
  }, [selectedDate, professionalId, showModal, occupiedKey, loadAvailableSlots]);

  const handleTimeSelect = (time) => {
    onTimeSelect(time);
    setShowModal(false);
  };

  const formatDisplayTime = (time) => {
    if (!time) return placeholder;
    return time;
  };

  const getTimeSlotStatus = (time) => {
    // Verificar si el horario está ocupado
    if (occupiedSlots && occupiedSlots.includes(time)) {
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
        disabled={disabled}
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

      <Text style={styles.availabilityInfo}>
        {loading 
          ? 'Cargando horarios...' 
          : availableSlots.length > 0 
            ? `${availableSlots.length} horarios disponibles`
            : 'No hay horarios disponibles'
        }
      </Text>

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
              {selectedDate ? `Horarios disponibles para ${formatYmdOrDateForEsLocale(selectedDate)}` : 'Selecciona un horario disponible'}
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
