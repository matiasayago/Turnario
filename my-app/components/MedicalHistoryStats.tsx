import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface MedicalHistoryStatsProps {
  stats: {
    totalConsultations: number;
    activeTreatments: number;
    activePrescriptions: number;
    totalDocuments: number;
    lastVisit: Date | null;
  };
  onPress?: () => void;
}

export const MedicalHistoryStats: React.FC<MedicalHistoryStatsProps> = ({ stats, onPress }) => {
  const formatDate = (date: Date | null): string => {
    if (!date) return 'Nunca';
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const StatItem = ({ icon, label, value, color }: { icon: string; label: string; value: string | number; color: string }) => (
    <View style={styles.statItem}>
      <View style={[styles.iconContainer, { backgroundColor: color }]}>
        <Ionicons name={icon as any} size={20} color="#fff" />
      </View>
      <View style={styles.statContent}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </View>
  );

  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Resumen del Historial Médico</Text>
        {onPress && (
          <Ionicons name="chevron-forward" size={20} color="#666" />
        )}
      </View>
      
      <View style={styles.statsGrid}>
        <StatItem
          icon="medical"
          label="Consultas"
          value={stats.totalConsultations}
          color="#2196F3"
        />
        <StatItem
          icon="fitness"
          label="Tratamientos Activos"
          value={stats.activeTreatments}
          color="#4CAF50"
        />
        <StatItem
          icon="medical-outline"
          label="Prescripciones"
          value={stats.activePrescriptions}
          color="#FF9800"
        />
        <StatItem
          icon="document-text"
          label="Documentos"
          value={stats.totalDocuments}
          color="#9C27B0"
        />
      </View>
      
      <View style={styles.lastVisitContainer}>
        <Ionicons name="calendar" size={16} color="#666" />
        <Text style={styles.lastVisitText}>
          Última visita: {formatDate(stats.lastVisit)}
        </Text>
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
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statItem: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  lastVisitContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  lastVisitText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
});
