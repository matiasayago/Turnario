import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Prescription } from '../contexts/MedicalHistoryContext';

interface PrescriptionItemProps {
  prescription: Prescription;
  onPress?: () => void;
  onEdit?: () => void;
  onDiscontinue?: () => void;
}

export const PrescriptionItem: React.FC<PrescriptionItemProps> = ({ 
  prescription, 
  onPress, 
  onEdit, 
  onDiscontinue 
}) => {
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'active': return '#4CAF50';
      case 'completed': return '#2196F3';
      case 'discontinued': return '#F44336';
      default: return '#666';
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'active': return 'Activa';
      case 'completed': return 'Completada';
      case 'discontinued': return 'Discontinuada';
      default: return status;
    }
  };

  const getRouteLabel = (route: string): string => {
    switch (route) {
      case 'oral': return 'Oral';
      case 'intravenous': return 'Intravenosa';
      case 'intramuscular': return 'Intramuscular';
      case 'topical': return 'Tópica';
      case 'other': return 'Otro';
      default: return route;
    }
  };

  const isExpired = (): boolean => {
    return new Date() > prescription.expiresAt;
  };

  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.header}>
        <View style={styles.dateContainer}>
          <Ionicons name="calendar" size={16} color="#666" />
          <Text style={styles.date}>{formatDate(prescription.date)}</Text>
        </View>
        <View style={styles.statusContainer}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(prescription.status) }]}>
            <Text style={styles.statusText}>{getStatusLabel(prescription.status)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.professionalContainer}>
        <Ionicons name="person" size={16} color="#666" />
        <Text style={styles.professional}>{prescription.professionalName}</Text>
      </View>

      <View style={styles.medicationsContainer}>
        <Text style={styles.sectionTitle}>Medicamentos</Text>
        {prescription.medications.map((medication, index) => (
          <View key={medication.id} style={styles.medicationItem}>
            <View style={styles.medicationHeader}>
              <Text style={styles.medicationName}>{medication.name}</Text>
              <View style={styles.medicationDosage}>
                <Text style={styles.dosageText}>{medication.dosage}</Text>
                <Text style={styles.routeText}>• {getRouteLabel(medication.route)}</Text>
              </View>
            </View>
            <View style={styles.medicationDetails}>
              <Text style={styles.frequencyText}>{medication.frequency}</Text>
              <Text style={styles.quantityText}>
                {medication.quantity} {medication.unit}
              </Text>
            </View>
            {medication.specialInstructions && (
              <Text style={styles.specialInstructions}>
                💡 {medication.specialInstructions}
              </Text>
            )}
          </View>
        ))}
      </View>

      <View style={styles.instructionsContainer}>
        <Text style={styles.sectionTitle}>Instrucciones Generales</Text>
        <Text style={styles.instructionsText}>{prescription.instructions}</Text>
      </View>

      <View style={styles.detailsContainer}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Duración:</Text>
          <Text style={styles.detailValue}>{prescription.duration}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Refills:</Text>
          <Text style={styles.detailValue}>
            {prescription.refillsRemaining} de {prescription.refills} restantes
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Expira:</Text>
          <Text style={[styles.detailValue, isExpired() && styles.expiredText]}>
            {formatDate(prescription.expiresAt)}
            {isExpired() && ' (Expirada)'}
          </Text>
        </View>
      </View>

      <View style={styles.actionsContainer}>
        {prescription.status === 'active' && (
          <>
            {onEdit && (
              <TouchableOpacity style={[styles.actionButton, styles.editButton]} onPress={onEdit}>
                <Ionicons name="create" size={16} color="#2196F3" />
                <Text style={[styles.actionText, styles.editText]}>Editar</Text>
              </TouchableOpacity>
            )}
            {onDiscontinue && (
              <TouchableOpacity style={[styles.actionButton, styles.discontinueButton]} onPress={onDiscontinue}>
                <Ionicons name="stop-circle" size={16} color="#F44336" />
                <Text style={[styles.actionText, styles.discontinueText]}>Discontinuar</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  date: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#fff',
  },
  professionalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  professional: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  medicationsContainer: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  medicationItem: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  medicationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  medicationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  medicationDosage: {
    alignItems: 'flex-end',
  },
  dosageText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2196F3',
  },
  routeText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  medicationDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  frequencyText: {
    fontSize: 14,
    color: '#666',
  },
  quantityText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  specialInstructions: {
    fontSize: 12,
    color: '#FF9800',
    fontStyle: 'italic',
  },
  instructionsContainer: {
    marginBottom: 16,
  },
  instructionsText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  detailsContainer: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  detailValue: {
    fontSize: 14,
    color: '#666',
  },
  expiredText: {
    color: '#F44336',
    fontWeight: '500',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginLeft: 12,
  },
  editButton: {
    backgroundColor: '#E3F2FD',
  },
  discontinueButton: {
    backgroundColor: '#FFEBEE',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  editText: {
    color: '#2196F3',
  },
  discontinueText: {
    color: '#F44336',
  },
});
