// @ts-nocheck � beta
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  TextInput,
  RefreshControl,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useReviews } from '../contexts/ReviewContext';
import { RatingStats } from '../components/RatingStats';
import { ReviewItem } from '../components/ReviewItem';
import { ReviewModal } from '../components/ReviewModal';
import { ReviewFilters } from '../components/ReviewFilters';
import { ReviewFilters as ReviewFiltersType } from '../contexts/ReviewContext';

export default function ReviewsScreen() {
  const {
    reviews,
    reviewStats,
    createReview,
    updateReview,
    deleteReview,
    markReviewAsHelpful,
    reportReview,
    getReviewsByTarget,
    getReviewStats,
    searchReviews,
    canUserReview,
    hasUserReviewed,
    getUserReview
  } = useReviews();

  // Estado local
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<ReviewFiltersType>({});
  const [isReviewModalVisible, setReviewModalVisible] = useState(false);
  const [editingReview, setEditingReview] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState({
    id: '1', // Dra. Ana García por defecto
    name: 'Dra. Ana García',
    type: 'professional' as const
  });

  // Obtener reseñas filtradas
  const filteredReviews = useMemo(() => {
    return searchReviews(searchQuery, filters);
  }, [searchQuery, filters, reviews]);

  // Obtener estadísticas del objetivo seleccionado
  const targetStats = useMemo(() => {
    return getReviewStats(selectedTarget.id, selectedTarget.type);
  }, [selectedTarget.id, selectedTarget.type, reviews]);

  // Obtener reseñas del objetivo seleccionado
  const targetReviews = useMemo(() => {
    return getReviewsByTarget(selectedTarget.id, selectedTarget.type);
  }, [selectedTarget.id, selectedTarget.type, reviews]);

  // Verificar si el usuario puede reseñar
  const canReview = canUserReview(selectedTarget.id, selectedTarget.type);
  const hasReviewed = hasUserReviewed(selectedTarget.id, selectedTarget.type);
  const userReview = getUserReview(selectedTarget.id, selectedTarget.type);

  // Función para refrescar
  const onRefresh = async () => {
    setRefreshing(true);
    // Simular carga
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  // Función para crear/editar reseña
  const handleSubmitReview = async (targetId: string, targetType: string, rating: number, comment: string) => {
    try {
      if (editingReview) {
        await updateReview(editingReview.id, rating, comment);
        setEditingReview(null);
      } else {
        await createReview(targetId, targetType, rating, comment);
      }
    } catch (error) {
      console.error('Error al enviar reseña:', error);
      throw error;
    }
  };

  // Función para editar reseña
  const handleEditReview = (review: any) => {
    setEditingReview(review);
    setReviewModalVisible(true);
  };

  // Función para eliminar reseña
  const handleDeleteReview = (reviewId: string) => {
    deleteReview(reviewId);
  };

  // Función para marcar como útil
  const handleMarkHelpful = (reviewId: string) => {
    markReviewAsHelpful(reviewId);
  };

  // Función para reportar reseña
  const handleReportReview = (reviewId: string, reason: string) => {
    reportReview(reviewId, reason);
  };

  // Función para abrir modal de nueva reseña
  const openNewReviewModal = () => {
    setEditingReview(null);
    setReviewModalVisible(true);
  };

  // Función para cerrar modal
  const closeReviewModal = () => {
    setReviewModalVisible(false);
    setEditingReview(null);
  };

  // Renderizar item de reseña
  const renderReviewItem = ({ item }: { item: any }) => (
    <ReviewItem
      review={item}
      onEdit={handleEditReview}
      onDelete={handleDeleteReview}
      onMarkHelpful={handleMarkHelpful}
      onReport={handleReportReview}
    />
  );

  // Renderizar header de la lista
  const renderListHeader = () => (
    <View style={styles.listHeader}>
      {/* Estadísticas */}
      {targetStats && (
        <RatingStats stats={targetStats} />
      )}

      {/* Barra de búsqueda */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar en reseñas..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearchQuery('')}
            style={styles.clearSearchButton}
          >
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filtros */}
      <ReviewFilters
        filters={filters}
        onFiltersChange={setFilters}
      />

      {/* Botón de nueva reseña */}
      {canReview && !hasReviewed && (
        <TouchableOpacity
          onPress={openNewReviewModal}
          style={styles.newReviewButton}
        >
          <Ionicons name="star" size={20} color="#fff" />
          <Text style={styles.newReviewButtonText}>Escribir Reseña</Text>
        </TouchableOpacity>
      )}

      {/* Mensaje si ya reseñó */}
      {hasReviewed && userReview && (
        <View style={styles.alreadyReviewedContainer}>
          <Text style={styles.alreadyReviewedText}>
            Ya has escrito una reseña para este profesional
          </Text>
          <TouchableOpacity
            onPress={() => handleEditReview(userReview)}
            style={styles.editReviewButton}
          >
            <Text style={styles.editReviewButtonText}>Editar Reseña</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Contador de reseñas */}
      <View style={styles.reviewsCountContainer}>
        <Text style={styles.reviewsCountText}>
          {filteredReviews.length} {filteredReviews.length === 1 ? 'reseña' : 'reseñas'}
          {searchQuery && ` para "${searchQuery}"`}
        </Text>
      </View>
    </View>
  );

  // Renderizar item vacío
  const renderEmptyItem = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="chatbubble-outline" size={64} color="#ccc" />
      <Text style={styles.emptyTitle}>No hay reseñas</Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery || filters.minRating
          ? 'No se encontraron reseñas con los filtros aplicados'
          : 'Sé el primero en escribir una reseña para este profesional'
        }
      </Text>
      {!searchQuery && !filters.minRating && canReview && (
        <TouchableOpacity
          onPress={openNewReviewModal}
          style={styles.emptyActionButton}
        >
          <Text style={styles.emptyActionButtonText}>Escribir Primera Reseña</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Reseñas y Calificaciones</Text>
        <Text style={styles.headerSubtitle}>
          {selectedTarget.name} - {selectedTarget.type === 'professional' ? 'Profesional' : 'Servicio'}
        </Text>
      </View>

      {/* Lista de reseñas */}
      <FlatList
        data={filteredReviews}
        renderItem={renderReviewItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderListHeader}
        ListEmptyComponent={renderEmptyItem}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#2196F3']}
            tintColor="#2196F3"
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />

      {/* Modal de reseña */}
      <ReviewModal
        visible={isReviewModalVisible}
        onClose={closeReviewModal}
        onSubmit={handleSubmitReview}
        review={editingReview}
        targetName={selectedTarget.name}
        targetType={selectedTarget.type}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  listContent: {
    paddingBottom: 20,
  },
  listHeader: {
    padding: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  clearSearchButton: {
    padding: 4,
  },
  newReviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 16,
  },
  newReviewButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  alreadyReviewedContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  alreadyReviewedText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 12,
  },
  editReviewButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignSelf: 'center',
  },
  editReviewButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  reviewsCountContainer: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    marginBottom: 16,
  },
  reviewsCountText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyActionButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  emptyActionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
