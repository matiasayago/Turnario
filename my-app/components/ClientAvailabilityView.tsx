// @ts-nocheck � beta
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAvailability } from '../contexts/AvailabilityContext';

interface ClientAvailabilityViewProps {
  onProfessionalSelect?: (professional: any) => void;
  showSelection?: boolean;
}

export default function ClientAvailabilityView({ 
  onProfessionalSelect, 
  showSelection = false 
}: ClientAvailabilityViewProps) {
  const { 
    availableProfessionals, 
    loadAvailableProfessionals, 
    getProfessionalAvailabilityForClient,
    isLoading 
  } = useAvailability();
  
  const [selectedProfessional, setSelectedProfessional] = useState<any>(null);
  const [professionalAvailability, setProfessionalAvailability] = useState<any>(null);
  const [loadingAvailability, setLoadingAvailability] = useState(false);

  useEffect(() => {
    loadAvailableProfessionals();
  }, []);

  const handleProfessionalSelect = async (professional: any) => {
    if (!showSelection) return;
    
    setSelectedProfessional(professional);
    setLoadingAvailability(true);
    
    try {
      const availability = await getProfessionalAvailabilityForClient(professional.id);
      setProfessionalAvailability(availability);
      
      if (onProfessionalSelect) {
        onProfessionalSelect(professional);
      }
    } catch (error) {
      console.error('Error obteniendo disponibilidad:', error);
      Alert.alert('Error', 'No se pudo obtener la disponibilidad del profesional');
    } finally {
      setLoadingAvailability(false);
    }
  };

  const formatDaysOfWeek = (daysOfWeek: any) => {
    const dayNames = {
      monday: 'Lunes',
      tuesday: 'Martes',
      wednesday: 'Miércoles',
      thursday: 'Jueves',
      friday: 'Viernes',
      saturday: 'Sábado',
      sunday: 'Domingo'
    };

    const availableDays = Object.entries(daysOfWeek)
      .filter(([_, isAvailable]) => isAvailable)
      .map(([day, _]) => dayNames[day as keyof typeof dayNames])
      .join(', ');

    return availableDays || 'No disponible';
  };

  const formatTimeSlots = (timeSlots: string[]) => {
    if (!timeSlots || timeSlots.length === 0) return 'No hay horarios disponibles';
    
    // Mostrar solo los primeros 5 horarios para no sobrecargar la vista
    const displaySlots = timeSlots.slice(0, 5);
    const remaining = timeSlots.length - 5;
    
    let result = displaySlots.join(', ');
    if (remaining > 0) {
      result += ` y ${remaining} más`;
    }
    
    return result;
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#667eea" />
        <Text style={styles.loadingText}>Cargando profesionales disponibles...</Text>
      </View>
    );
  }

  if (availableProfessionals.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="people-outline" size={48} color="#ccc" />
        <Text style={styles.emptyTitle}>No hay profesionales disponibles</Text>
        <Text style={styles.emptySubtitle}>
          Intenta más tarde o contacta directamente con los profesionales
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profesionales Disponibles</Text>
        <Text style={styles.headerSubtitle}>
          {availableProfessionals.length} profesional{availableProfessionals.length !== 1 ? 'es' : ''} disponible{availableProfessionals.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {availableProfessionals.map((professional) => (
        <TouchableOpacity
          key={professional.id}
          style={[
            styles.professionalCard,
            selectedProfessional?.id === professional.id && styles.selectedCard
          ]}
          onPress={() => handleProfessionalSelect(professional)}
          disabled={!showSelection}
        >
          <View style={styles.professionalHeader}>
            <View style={styles.professionalInfo}>
              <Text style={styles.professionalName}>{professional.name}</Text>
              <Text style={styles.professionalSpecialty}>{professional.specialty}</Text>
            </View>
            
            <View style={styles.professionalRating}>
              <View style={styles.ratingContainer}>
                <Ionicons name="star" size={16} color="#FFD700" />
                <Text style={styles.ratingText}>{professional.rating}</Text>
              </View>
              <Text style={styles.reviewsText}>({professional.reviews} reseñas)</Text>
            </View>
          </View>

          <View style={styles.professionalDetails}>
            <View style={styles.detailRow}>
              <Ionicons name="time-outline" size={16} color="#666" />
              <Text style={styles.detailText}>
                Duración: {professional.duration} min
              </Text>
            </View>
            
            <View style={styles.detailRow}>
              <Ionicons name="cash-outline" size={16} color="#666" />
              <Text style={styles.detailText}>
                Precio: ${professional.price.toLocaleString()}
              </Text>
            </View>
          </View>

          {showSelection && (
            <View style={styles.availabilityPreview}>
              <Text style={styles.availabilityTitle}>Disponibilidad:</Text>
              <Text style={styles.availabilityText}>
                {professional.isAvailable ? 'Disponible' : 'No disponible'}
              </Text>
            </View>
          )}

          {showSelection && selectedProfessional?.id === professional.id && (
            <View style={styles.availabilityDetails}>
              {loadingAvailability ? (
                <ActivityIndicator size="small" color="#667eea" />
              ) : professionalAvailability ? (
                <View>
                  <View style={styles.availabilitySection}>
                    <Text style={styles.sectionTitle}>Días de atención:</Text>
                    <Text style={styles.sectionText}>
                      {formatDaysOfWeek(professionalAvailability.availability.daysOfWeek)}
                    </Text>
                  </View>
                  
                  <View style={styles.availabilitySection}>
                    <Text style={styles.sectionTitle}>Horarios disponibles:</Text>
                    <Text style={styles.sectionText}>
                      {formatTimeSlots(professionalAvailability.availability.timeSlots)}
                    </Text>
                  </View>
                  
                  <View style={styles.availabilitySection}>
                    <Text style={styles.sectionTitle}>Horario de trabajo:</Text>
                    <Text style={styles.sectionText}>
                      {professionalAvailability.availability.workingHours.start} - {professionalAvailability.availability.workingHours.end}
                    </Text>
                  </View>
                  
                  {professionalAvailability.availability.breakTime && (
                    <View style={styles.availabilitySection}>
                      <Text style={styles.sectionTitle}>Descanso:</Text>
                      <Text style={styles.sectionText}>
                        {professionalAvailability.availability.breakTime.start} - {professionalAvailability.availability.breakTime.end}
                      </Text>
                    </View>
                  )}
                </View>
              ) : (
                <Text style={styles.errorText}>No se pudo cargar la disponibilidad</Text>
              )}
            </View>
          )}
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  professionalCard: {
    backgroundColor: 'white',
    margin: 16,
    marginBottom: 8,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedCard: {
    borderWidth: 2,
    borderColor: '#667eea',
  },
  professionalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  professionalInfo: {
    flex: 1,
  },
  professionalName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  professionalSpecialty: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  professionalRating: {
    alignItems: 'flex-end',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 4,
  },
  reviewsText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  professionalDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  availabilityPreview: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  availabilityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  availabilityText: {
    fontSize: 14,
    color: '#4CAF50',
    marginTop: 2,
  },
  availabilityDetails: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  availabilitySection: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  sectionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  errorText: {
    fontSize: 14,
    color: '#F44336',
    textAlign: 'center',
  },
});


