import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RatingStars } from './RatingStars';
import { Review } from '../contexts/ReviewContext';

// Datos de profesionales disponibles (en producción esto vendría de una API)
const AVAILABLE_PROFESSIONALS = [
  {
    id: '1',
    name: 'Dra. Ana García',
    specialty: 'Psicóloga Clínica',
    rating: 4.8,
    reviews: 124,
    avatar: 'AG'
  },
  {
    id: '2',
    name: 'Dr. Carlos Mendoza',
    specialty: 'Psicólogo Clínico',
    rating: 4.9,
    reviews: 89,
    avatar: 'CM'
  },
  {
    id: '3',
    name: 'Dr. Juan Martínez',
    specialty: 'Médico General',
    rating: 4.7,
    reviews: 156,
    avatar: 'JM'
  },
  {
    id: '4',
    name: 'Lic. Laura Fernández',
    specialty: 'Terapeuta Ocupacional',
    rating: 4.6,
    reviews: 73,
    avatar: 'LF'
  },
  {
    id: '5',
    name: 'Coach Roberto Silva',
    specialty: 'Coach Ejecutivo',
    rating: 4.5,
    reviews: 45,
    avatar: 'RS'
  }
];

interface Professional {
  id: string;
  name: string;
  specialty: string;
  rating: number;
  reviews: number;
  avatar: string;
}

interface ReviewModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (targetId: string, targetType: string, rating: number, comment: string) => void;
  review?: Review | null; // Para edición
  targetName?: string;
  targetType?: string;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  visible,
  onClose,
  onSubmit,
  review,
  targetName,
  targetType
}) => {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(null);
  const [showProfessionalSelector, setShowProfessionalSelector] = useState(false);

  const isEditing = !!review;

  useEffect(() => {
    if (review) {
      setRating(review.rating);
      setComment(review.comment);
      // Para edición, no mostrar selector de profesional
      setSelectedProfessional(null);
    } else {
      setRating(5);
      setComment('');
      // Para nueva reseña, mostrar selector de profesional
      setSelectedProfessional(null);
    }
  }, [review, visible]);

  const handleSubmit = async () => {
    if (!selectedProfessional && !isEditing) {
      Alert.alert('Error', 'Debes seleccionar un profesional para calificar');
      return;
    }

    if (rating < 1) {
      Alert.alert('Error', 'Debes seleccionar una calificación');
      return;
    }

    if (!comment.trim()) {
      Alert.alert('Error', 'Debes escribir un comentario');
      return;
    }

    if (comment.trim().length < 10) {
      Alert.alert('Error', 'El comentario debe tener al menos 10 caracteres');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing && review) {
        await onSubmit(review.targetId, review.targetType, rating, comment.trim());
      } else if (selectedProfessional) {
        await onSubmit(selectedProfessional.id, 'professional', rating, comment.trim());
      }
      onClose();
    } catch (error) {
      console.error('Error al enviar reseña:', error);
      Alert.alert('Error', 'No se pudo enviar la reseña. Inténtalo de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    
    if (rating !== 5 || comment.trim() || selectedProfessional) {
      Alert.alert(
        'Cancelar',
        '¿Estás seguro de que quieres cancelar? Se perderán los cambios.',
        [
          { text: 'Continuar editando', style: 'cancel' },
          { text: 'Cancelar', style: 'destructive', onPress: onClose }
        ]
      );
    } else {
      onClose();
    }
  };

  const handleProfessionalSelect = (professional: Professional) => {
    setSelectedProfessional(professional);
    setShowProfessionalSelector(false);
  };

  const renderProfessionalItem = ({ item }: { item: Professional }) => (
    <TouchableOpacity
      style={styles.professionalItem}
      onPress={() => handleProfessionalSelect(item)}
    >
      <View style={styles.professionalAvatar}>
        <Text style={styles.professionalAvatarText}>{item.avatar}</Text>
      </View>
      <View style={styles.professionalInfo}>
        <Text style={styles.professionalName}>{item.name}</Text>
        <Text style={styles.professionalSpecialty}>{item.specialty}</Text>
        <View style={styles.professionalRating}>
          <RatingStars rating={item.rating} size="small" showNumber={false} />
          <Text style={styles.professionalReviews}>({item.reviews} reseñas)</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#ccc" />
    </TouchableOpacity>
  );

  const renderProfessionalSelector = () => (
    <Modal
      visible={showProfessionalSelector}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowProfessionalSelector(false)}
    >
      <View style={styles.selectorContainer}>
        <View style={styles.selectorHeader}>
          <TouchableOpacity
            onPress={() => setShowProfessionalSelector(false)}
            style={styles.selectorCloseButton}
          >
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
          <Text style={styles.selectorTitle}>Seleccionar Profesional</Text>
          <View style={styles.selectorPlaceholder} />
        </View>

        <FlatList
          data={AVAILABLE_PROFESSIONALS}
          renderItem={renderProfessionalItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.professionalList}
        />
      </View>
    </Modal>
  );

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleClose}
      >
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={handleClose}
              disabled={isSubmitting}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
            
            <Text style={styles.title}>
              {isEditing ? 'Editar Reseña' : 'Nueva Reseña'}
            </Text>
            
            <View style={styles.placeholder} />
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Selector de profesional (solo para nuevas reseñas) */}
            {!isEditing && (
              <View style={styles.professionalSelectorSection}>
                <Text style={styles.sectionTitle}>Seleccionar Profesional</Text>
                <TouchableOpacity
                  style={styles.professionalSelectorButton}
                  onPress={() => setShowProfessionalSelector(true)}
                >
                  {selectedProfessional ? (
                    <View style={styles.selectedProfessional}>
                      <View style={styles.professionalAvatar}>
                        <Text style={styles.professionalAvatarText}>
                          {selectedProfessional.avatar}
                        </Text>
                      </View>
                      <View style={styles.selectedProfessionalInfo}>
                        <Text style={styles.selectedProfessionalName}>
                          {selectedProfessional.name}
                        </Text>
                        <Text style={styles.selectedProfessionalSpecialty}>
                          {selectedProfessional.specialty}
                        </Text>
                      </View>
                      <Ionicons name="chevron-down" size={20} color="#666" />
                    </View>
                  ) : (
                    <View style={styles.professionalSelectorPlaceholder}>
                      <Ionicons name="person-add" size={20} color="#999" />
                      <Text style={styles.professionalSelectorPlaceholderText}>
                        Selecciona un profesional para calificar
                      </Text>
                      <Ionicons name="chevron-down" size={20} color="#999" />
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* Información del objetivo (para edición o cuando ya está seleccionado) */}
            {(targetName || selectedProfessional) && (
              <View style={styles.targetInfo}>
                <Text style={styles.targetLabel}>
                  {isEditing ? 'Profesional' : 'Profesional Seleccionado'}: {
                    isEditing ? targetName : selectedProfessional?.name
                  }
                </Text>
              </View>
            )}

            {/* Rating */}
            <View style={styles.ratingSection}>
              <Text style={styles.sectionTitle}>Tu Calificación</Text>
              <View style={styles.ratingContainer}>
                <RatingStars
                  rating={rating}
                  size="large"
                  interactive={true}
                  onRatingChange={setRating}
                />
                <Text style={styles.ratingText}>
                  {rating} {rating === 1 ? 'estrella' : 'estrellas'}
                </Text>
              </View>
            </View>

            {/* Comentario */}
            <View style={styles.commentSection}>
              <Text style={styles.sectionTitle}>Tu Comentario</Text>
              <TextInput
                style={styles.commentInput}
                placeholder="Comparte tu experiencia con este profesional..."
                placeholderTextColor="#999"
                value={comment}
                onChangeText={setComment}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                maxLength={500}
              />
              <Text style={styles.characterCount}>
                {comment.length}/500 caracteres
              </Text>
            </View>

            {/* Consejos para buenas reseñas */}
            <View style={styles.tipsSection}>
              <Text style={styles.tipsTitle}>💡 Consejos para una buena reseña:</Text>
              <Text style={styles.tipText}>• Sé específico sobre tu experiencia</Text>
              <Text style={styles.tipText}>• Menciona aspectos positivos y áreas de mejora</Text>
              <Text style={styles.tipText}>• Mantén un tono respetuoso y constructivo</Text>
              <Text style={styles.tipText}>• Evita información personal o confidencial</Text>
            </View>
          </ScrollView>

          {/* Footer con botones */}
          <View style={styles.footer}>
            <TouchableOpacity
              onPress={handleClose}
              disabled={isSubmitting}
              style={[styles.button, styles.cancelButton]}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={isSubmitting || (!isEditing && !selectedProfessional)}
              style={[
                styles.button,
                styles.submitButton,
                (!rating || !comment.trim() || (!isEditing && !selectedProfessional)) && styles.submitButtonDisabled
              ]}
            >
              {isSubmitting ? (
                <Text style={styles.submitButtonText}>Enviando...</Text>
              ) : (
                <Text style={styles.submitButtonText}>
                  {isEditing ? 'Actualizar' : 'Enviar'} Reseña
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal selector de profesionales */}
      {renderProfessionalSelector()}
    </>
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
    borderBottomColor: '#e0e0e0',
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  // Estilos para el selector de profesionales
  professionalSelectorSection: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  professionalSelectorButton: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fafafa',
  },
  selectedProfessional: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedProfessionalInfo: {
    flex: 1,
    marginLeft: 12,
  },
  selectedProfessionalName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  selectedProfessionalSpecialty: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  professionalSelectorPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  professionalSelectorPlaceholderText: {
    flex: 1,
    fontSize: 16,
    color: '#999',
    marginLeft: 12,
  },
  // Estilos para el modal selector
  selectorContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  selectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  selectorCloseButton: {
    padding: 4,
  },
  selectorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  selectorPlaceholder: {
    width: 32,
  },
  professionalList: {
    padding: 16,
  },
  professionalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  professionalAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#2196F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  professionalAvatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  professionalInfo: {
    flex: 1,
    marginLeft: 12,
  },
  professionalName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  professionalSpecialty: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  professionalRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  professionalReviews: {
    fontSize: 12,
    color: '#999',
    marginLeft: 8,
  },
  targetInfo: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  targetLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  ratingSection: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  ratingContainer: {
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
  },
  commentSection: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    minHeight: 120,
    backgroundColor: '#fafafa',
  },
  characterCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 4,
  },
  tipsSection: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    lineHeight: 16,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: '#2196F3',
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});
