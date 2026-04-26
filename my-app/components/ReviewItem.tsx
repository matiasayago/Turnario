import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Review } from '../contexts/ReviewContext';
import { RatingStars } from './RatingStars';
import { useAuth } from '../contexts/AuthContext';

interface ReviewItemProps {
  review: Review;
  onEdit?: (review: Review) => void;
  onDelete?: (reviewId: string) => void;
  onMarkHelpful?: (reviewId: string) => void;
  onReport?: (reviewId: string, reason: string) => void;
  showActions?: boolean;
  style?: any;
}

export const ReviewItem: React.FC<ReviewItemProps> = ({
  review,
  onEdit,
  onDelete,
  onMarkHelpful,
  onReport,
  showActions = true,
  style
}) => {
  const { user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);

  const isOwnReview = user?.id === review.userId;
  const canInteract = user && !isOwnReview;

  const handleMarkHelpful = () => {
    if (onMarkHelpful) {
      onMarkHelpful(review.id);
    }
  };

  const handleReport = () => {
    if (onReport) {
      Alert.prompt(
        'Reportar Reseña',
        '¿Por qué quieres reportar esta reseña?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Reportar',
            style: 'destructive',
            onPress: (reason) => {
              if (reason && reason.trim()) {
                onReport(review.id, reason.trim());
              }
            }
          }
        ],
        'plain-text'
      );
    }
  };

  const formatDate = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Hoy';
    if (days === 1) return 'Ayer';
    if (days < 7) return `hace ${days} días`;
    if (days < 30) return `hace ${Math.floor(days / 7)} semanas`;
    return date.toLocaleDateString('es-ES', { 
      day: '2-digit', 
      month: '2-digit',
      year: '2-digit'
    });
  };

  return (
    <View style={[styles.container, style]}>
      {/* Header de la Reseña */}
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {review.userName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{review.userName}</Text>
            <Text style={styles.reviewDate}>{formatDate(review.createdAt)}</Text>
          </View>
        </View>
        
        <View style={styles.ratingContainer}>
          <RatingStars rating={review.rating} size="small" />
          {review.isVerified && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
              <Text style={styles.verifiedText}>Verificada</Text>
            </View>
          )}
        </View>
      </View>

      {/* Contenido de la Reseña */}
      <View style={styles.content}>
        <Text 
          style={styles.comment}
          numberOfLines={isExpanded ? undefined : 3}
        >
          {review.comment}
        </Text>
        
        {review.comment.length > 100 && (
          <TouchableOpacity
            onPress={() => setIsExpanded(!isExpanded)}
            style={styles.expandButton}
          >
            <Text style={styles.expandText}>
              {isExpanded ? 'Ver menos' : 'Ver más'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Acciones de la Reseña */}
      {showActions && (
        <View style={styles.actions}>
          <View style={styles.leftActions}>
            {canInteract && (
              <TouchableOpacity
                onPress={handleMarkHelpful}
                style={styles.actionButton}
              >
                <Ionicons 
                  name="thumbs-up-outline" 
                  size={16} 
                  color="#666" 
                />
                <Text style={styles.actionText}>
                  Útil ({review.helpfulCount})
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.rightActions}>
            {isOwnReview && onEdit && (
              <TouchableOpacity
                onPress={() => onEdit(review)}
                style={styles.actionButton}
              >
                <Ionicons name="create-outline" size={16} color="#2196F3" />
                <Text style={[styles.actionText, { color: '#2196F3' }]}>
                  Editar
                </Text>
              </TouchableOpacity>
            )}

            {isOwnReview && onDelete && (
              <TouchableOpacity
                onPress={() => onDelete(review.id)}
                style={styles.actionButton}
              >
                <Ionicons name="trash-outline" size={16} color="#F44336" />
                <Text style={[styles.actionText, { color: '#F44336' }]}>
                  Eliminar
                </Text>
              </TouchableOpacity>
            )}

            {canInteract && onReport && (
              <TouchableOpacity
                onPress={handleReport}
                style={styles.actionButton}
              >
                <Ionicons name="flag-outline" size={16} color="#FF9800" />
                <Text style={[styles.actionText, { color: '#FF9800' }]}>
                  Reportar
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Footer con información adicional */}
      <View style={styles.footer}>
        {review.updatedAt > review.createdAt && (
          <Text style={styles.updatedText}>
            Editada el {formatDate(review.updatedAt)}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  reviewDate: {
    fontSize: 12,
    color: '#666',
  },
  ratingContainer: {
    alignItems: 'flex-end',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  verifiedText: {
    fontSize: 10,
    color: '#4CAF50',
    marginLeft: 4,
    fontWeight: '500',
  },
  content: {
    marginBottom: 12,
  },
  comment: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  expandButton: {
    marginTop: 8,
  },
  expandText: {
    fontSize: 12,
    color: '#2196F3',
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  leftActions: {
    flexDirection: 'row',
  },
  rightActions: {
    flexDirection: 'row',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginHorizontal: 4,
  },
  actionText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  footer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  updatedText: {
    fontSize: 10,
    color: '#999',
    fontStyle: 'italic',
  },
});
