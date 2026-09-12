import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MedicalConsultation } from '../contexts/MedicalHistoryContext';

interface MedicalConsultationItemProps {
  consultation: MedicalConsultation;
  onPress?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const MedicalConsultationItem: React.FC<MedicalConsultationItemProps> = ({ 
  consultation, 
  onPress, 
  onEdit, 
  onDelete 
}) => {
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getTypeLabel = (type: string): string => {
    switch (type) {
      case 'initial': return 'Consulta Inicial';
      case 'follow_up': return 'Seguimiento';
      case 'emergency': return 'Emergencia';
      case 'routine': return 'Rutina';
      default: return type;
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completed': return '#4CAF50';
      case 'pending': return '#FF9800';
      case 'cancelled': return '#F44336';
      default: return '#666';
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'completed': return 'Completada';
      case 'pending': return 'Pendiente';
      case 'cancelled': return 'Cancelada';
      default: return status;
    }
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
          <Text style={styles.date}>{formatDate(consultation.date)}</Text>
        </View>
        <View style={styles.statusContainer}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(consultation.status) }]}>
            <Text style={styles.statusText}>{getStatusLabel(consultation.status)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.typeContainer}>
        <Ionicons name="medical" size={16} color="#2196F3" />
        <Text style={styles.type}>{getTypeLabel(consultation.type)}</Text>
      </View>

      <View style={styles.professionalContainer}>
        <Ionicons name="person" size={16} color="#666" />
        <Text style={styles.professional}>{consultation.professionalName}</Text>
      </View>

      {consultation.symptoms ? (
        <View style={styles.contentSection}>
          <Text style={styles.sectionTitle}>Síntomas</Text>
          <Text style={styles.contentText}>{consultation.symptoms}</Text>
        </View>
      ) : null}

      {consultation.diagnosis ? (
        <View style={styles.contentSection}>
          <Text style={styles.sectionTitle}>Diagnóstico</Text>
          <Text style={styles.contentText}>{consultation.diagnosis}</Text>
        </View>
      ) : null}

      {consultation.treatment && consultation.treatment !== '—' ? (
        <View style={styles.contentSection}>
          <Text style={styles.sectionTitle}>Tratamiento</Text>
          <Text style={styles.contentText}>{consultation.treatment}</Text>
        </View>
      ) : null}

      {consultation.notes && (
        <View style={styles.contentSection}>
          <Text style={styles.sectionTitle}>Notas médicas</Text>
          <Text style={styles.contentText}>{consultation.notes}</Text>
        </View>
      )}

      {consultation.nextAppointment && (
        <View style={styles.nextAppointmentContainer}>
          <Ionicons name="time" size={16} color="#FF9800" />
          <Text style={styles.nextAppointmentText}>
            Próxima cita: {formatDate(consultation.nextAppointment)}
          </Text>
        </View>
      )}

      {(onEdit || onDelete) && (
        <View style={styles.actionsContainer}>
          {onEdit && (
            <TouchableOpacity style={[styles.actionButton, styles.editButton]} onPress={onEdit}>
              <Ionicons name="create" size={16} color="#2196F3" />
              <Text style={[styles.actionText, styles.editText]}>Editar</Text>
            </TouchableOpacity>
          )}
          {onDelete && (
            <TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={onDelete}>
              <Ionicons name="trash" size={16} color="#F44336" />
              <Text style={[styles.actionText, styles.deleteText]}>Eliminar</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
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
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  type: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2196F3',
    marginLeft: 8,
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
  contentSection: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  contentText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  nextAppointmentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  nextAppointmentText: {
    fontSize: 14,
    color: '#E65100',
    marginLeft: 8,
    fontWeight: '500',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
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
  deleteButton: {
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
  deleteText: {
    color: '#F44336',
  },
});
