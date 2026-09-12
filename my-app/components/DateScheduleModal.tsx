import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

interface TimeSlot {
  start: string;
  end: string;
  isCustom?: boolean;
}

interface DateSchedule {
  date: string;
  timeSlots: TimeSlot[];
  isAvailable: boolean;
}

interface DateScheduleModalProps {
  visible: boolean;
  onClose: () => void;
  date: string;
  schedule?: DateSchedule;
  defaultTimeSlots: TimeSlot[];
  onSave: (date: string, schedule: DateSchedule) => void;
}

const DateScheduleModal: React.FC<DateScheduleModalProps> = ({
  visible,
  onClose,
  date,
  schedule,
  defaultTimeSlots,
  onSave,
}) => {
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>(
    schedule?.timeSlots || defaultTimeSlots
  );
  const [isAvailable, setIsAvailable] = useState(schedule?.isAvailable ?? true);

  useEffect(() => {
    if (!visible) return;
    setTimeSlots(
      schedule?.timeSlots?.map((slot) => ({ ...slot })) ||
        defaultTimeSlots.map((slot) => ({ ...slot }))
    );
    setIsAvailable(schedule?.isAvailable ?? true);
  }, [visible, date]);

  const addTimeSlot = () => {
    setTimeSlots(prev => [...prev, { start: '09:00', end: '10:00', isCustom: true }]);
  };

  const updateTimeSlot = (index: number, field: 'start' | 'end', value: string) => {
    setTimeSlots(prev => prev.map((slot, i) => 
      i === index ? { ...slot, [field]: value } : slot
    ));
  };

  const removeTimeSlot = (index: number) => {
    setTimeSlots(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (isAvailable && timeSlots.length === 0) {
      Alert.alert('Error', 'Debes agregar al menos un horario');
      return;
    }
    const invalidSlot = timeSlots.some(
      (slot) =>
        !/^\d{2}:\d{2}$/.test(slot.start) ||
        !/^\d{2}:\d{2}$/.test(slot.end) ||
        slot.start >= slot.end
    );
    if (invalidSlot) {
      Alert.alert('Error', 'Revisá los horarios: cada inicio debe ser anterior al fin.');
      return;
    }

    const newSchedule: DateSchedule = {
      date,
      timeSlots,
      isAvailable,
    };

    onSave(date, newSchedule);
    onClose();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onClose}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>Configurar Horarios</Text>
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Guardar</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {/* Información de la fecha */}
          <View style={styles.dateInfo}>
            <Text style={styles.dateText}>{formatDate(date)}</Text>
          </View>

          {/* Toggle de disponibilidad */}
          <View style={styles.availabilitySection}>
            <View style={styles.availabilityRow}>
              <Text style={styles.availabilityLabel}>Disponible este día</Text>
              <TouchableOpacity
                style={[styles.toggle, isAvailable && styles.toggleActive]}
                onPress={() => setIsAvailable(!isAvailable)}
              >
                <View style={[styles.toggleThumb, isAvailable && styles.toggleThumbActive]} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Lista de horarios */}
          <View style={styles.timeSlotsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Horarios de Atención</Text>
              <TouchableOpacity style={styles.addButton} onPress={addTimeSlot}>
                <Ionicons name="add" size={20} color="#667eea" />
                <Text style={styles.addButtonText}>Agregar</Text>
              </TouchableOpacity>
            </View>

            {timeSlots.map((slot, index) => (
              <View key={index} style={styles.timeSlotRow}>
                <View style={styles.timeInputContainer}>
                  <Text style={styles.timeLabel}>Inicio</Text>
                  <TextInput
                    style={styles.timeInput}
                    value={slot.start}
                    onChangeText={(value) => updateTimeSlot(index, 'start', value)}
                    placeholder="09:00"
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.timeInputContainer}>
                  <Text style={styles.timeLabel}>Fin</Text>
                  <TextInput
                    style={styles.timeInput}
                    value={slot.end}
                    onChangeText={(value) => updateTimeSlot(index, 'end', value)}
                    placeholder="10:00"
                    keyboardType="numeric"
                  />
                </View>

                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeTimeSlot(index)}
                >
                  <Ionicons name="trash" size={16} color="#F44336" />
                </TouchableOpacity>
              </View>
            ))}

            {timeSlots.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="time-outline" size={48} color="#ccc" />
                <Text style={styles.emptyText}>No hay horarios configurados</Text>
                <Text style={styles.emptySubtext}>Toca "Agregar" para crear un horario</Text>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#667eea',
    borderRadius: 8,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  dateInfo: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  dateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textTransform: 'capitalize',
  },
  availabilitySection: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  availabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  availabilityLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleActive: {
    backgroundColor: '#667eea',
  },
  toggleThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleThumbActive: {
    transform: [{ translateX: 20 }],
  },
  timeSlotsSection: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f2ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  addButtonText: {
    color: '#667eea',
    fontSize: 14,
    fontWeight: '500',
  },
  timeSlotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  timeInputContainer: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  timeInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
  },
  removeButton: {
    padding: 8,
    backgroundColor: '#ffebee',
    borderRadius: 8,
    marginTop: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
});

export default DateScheduleModal;
