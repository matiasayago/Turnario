import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Treatment } from '../contexts/MedicalHistoryContext';

interface TreatmentItemProps {
  treatment: Treatment;
  onPress?: () => void;
  onEdit?: () => void;
  onComplete?: () => void;
  onAddMilestone?: () => void;
}

export const TreatmentItem: React.FC<TreatmentItemProps> = ({ 
  treatment, 
  onPress, 
  onEdit, 
  onComplete, 
  onAddMilestone 
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
      case 'on_hold': return '#FF9800';
      default: return '#666';
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'active': return 'Activo';
      case 'completed': return 'Completado';
      case 'discontinued': return 'Discontinuado';
      case 'on_hold': return 'En Pausa';
      default: return status;
    }
  };

  const getProgressColor = (progress: number): string => {
    if (progress >= 80) return '#4CAF50';
    if (progress >= 60) return '#8BC34A';
    if (progress >= 40) return '#FF9800';
    if (progress >= 20) return '#FF5722';
    return '#F44336';
  };

  const getMilestoneStatusColor = (status: string): string => {
    switch (status) {
      case 'completed': return '#4CAF50';
      case 'pending': return '#FF9800';
      case 'overdue': return '#F44336';
      default: return '#666';
    }
  };

  const getMilestoneStatusLabel = (status: string): string => {
    switch (status) {
      case 'completed': return 'Completado';
      case 'pending': return 'Pendiente';
      case 'overdue': return 'Atrasado';
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
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{treatment.name}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(treatment.status) }]}>
            <Text style={styles.statusText}>{getStatusLabel(treatment.status)}</Text>
          </View>
        </View>
        <View style={styles.dateContainer}>
          <Text style={styles.dateText}>
            {formatDate(treatment.startDate)}
            {treatment.endDate && ` - ${formatDate(treatment.endDate)}`}
          </Text>
        </View>
      </View>

      <View style={styles.professionalContainer}>
        <Ionicons name="person" size={16} color="#666" />
        <Text style={styles.professional}>{treatment.professionalName}</Text>
      </View>

      <View style={styles.descriptionContainer}>
        <Text style={styles.description}>{treatment.description}</Text>
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>Progreso del Tratamiento</Text>
          <Text style={styles.progressPercentage}>{treatment.progress}%</Text>
        </View>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { 
                width: `${treatment.progress}%`,
                backgroundColor: getProgressColor(treatment.progress)
              }
            ]} 
          />
        </View>
      </View>

      {treatment.notes.length > 0 && (
        <View style={styles.notesContainer}>
          <Text style={styles.sectionTitle}>Notas del Tratamiento</Text>
          {treatment.notes.map((note, index) => (
            <View key={index} style={styles.noteItem}>
              <Text style={styles.noteText}>• {note}</Text>
            </View>
          ))}
        </View>
      )}

      {treatment.milestones.length > 0 && (
        <View style={styles.milestonesContainer}>
          <Text style={styles.sectionTitle}>Hitos del Tratamiento</Text>
          {treatment.milestones.map((milestone) => (
            <View key={milestone.id} style={styles.milestoneItem}>
              <View style={styles.milestoneHeader}>
                <Text style={styles.milestoneTitle}>{milestone.title}</Text>
                <View style={[styles.milestoneStatus, { backgroundColor: getMilestoneStatusColor(milestone.status) }]}>
                  <Text style={styles.milestoneStatusText}>
                    {getMilestoneStatusLabel(milestone.status)}
                  </Text>
                </View>
              </View>
              <Text style={styles.milestoneDescription}>{milestone.description}</Text>
              <View style={styles.milestoneDates}>
                <Text style={styles.milestoneDate}>
                  Objetivo: {formatDate(milestone.targetDate)}
                </Text>
                {milestone.completedDate && (
                  <Text style={styles.milestoneCompletedDate}>
                    Completado: {formatDate(milestone.completedDate)}
                  </Text>
                )}
              </View>
              {milestone.notes && (
                <Text style={styles.milestoneNotes}>{milestone.notes}</Text>
              )}
            </View>
          ))}
        </View>
      )}

      <View style={styles.actionsContainer}>
        {treatment.status === 'active' && (
          <>
            {onAddMilestone && (
              <TouchableOpacity style={[styles.actionButton, styles.addButton]} onPress={onAddMilestone}>
                <Ionicons name="add-circle" size={16} color="#4CAF50" />
                <Text style={[styles.actionText, styles.addText]}>Agregar Hito</Text>
              </TouchableOpacity>
            )}
            {onEdit && (
              <TouchableOpacity style={[styles.actionButton, styles.editButton]} onPress={onEdit}>
                <Ionicons name="create" size={16} color="#2196F3" />
                <Text style={[styles.actionText, styles.editText]}>Editar</Text>
              </TouchableOpacity>
            )}
            {onComplete && (
              <TouchableOpacity style={[styles.actionButton, styles.completeButton]} onPress={onComplete}>
                <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                <Text style={[styles.actionText, styles.completeText]}>Completar</Text>
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
    marginBottom: 12,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
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
  dateContainer: {
    alignItems: 'flex-start',
  },
  dateText: {
    fontSize: 14,
    color: '#666',
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
  descriptionContainer: {
    marginBottom: 16,
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  progressPercentage: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  notesContainer: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  noteItem: {
    marginBottom: 4,
  },
  noteText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  milestonesContainer: {
    marginBottom: 16,
  },
  milestoneItem: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  milestoneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  milestoneTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  milestoneStatus: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  milestoneStatusText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#fff',
  },
  milestoneDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 18,
  },
  milestoneDates: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  milestoneDate: {
    fontSize: 12,
    color: '#666',
  },
  milestoneCompletedDate: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
  },
  milestoneNotes: {
    fontSize: 12,
    color: '#FF9800',
    fontStyle: 'italic',
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
  addButton: {
    backgroundColor: '#E8F5E8',
  },
  editButton: {
    backgroundColor: '#E3F2FD',
  },
  completeButton: {
    backgroundColor: '#E8F5E8',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  addText: {
    color: '#4CAF50',
  },
  editText: {
    color: '#2196F3',
  },
  completeText: {
    color: '#4CAF50',
  },
});
