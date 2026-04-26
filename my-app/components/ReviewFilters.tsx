// @ts-nocheck � beta
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ReviewFilters as ReviewFiltersType } from '../contexts/ReviewContext';

interface ReviewFiltersProps {
  filters: ReviewFiltersType;
  onFiltersChange: (filters: ReviewFiltersType) => void;
  style?: any;
}

export const ReviewFilters: React.FC<ReviewFiltersProps> = ({
  filters,
  onFiltersChange,
  style
}) => {
  const [isModalVisible, setIsModalVisible] = useState(false);

  const updateFilter = (key: keyof ReviewFiltersType, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== undefined);

  const getFilterSummary = (): string => {
    const activeFilters = [];
    
    if (filters.minRating) activeFilters.push(`≥${filters.minRating}⭐`);
    if (filters.maxRating) activeFilters.push(`≤${filters.maxRating}⭐`);
    if (filters.verifiedOnly) activeFilters.push('Verificadas');
    if (filters.recentOnly) activeFilters.push('Recientes');
    if (filters.sortBy) {
      const sortLabels = {
        'newest': 'Más recientes',
        'oldest': 'Más antiguas',
        'highest': 'Mejor calificadas',
        'lowest': 'Peor calificadas',
        'helpful': 'Más útiles'
      };
      activeFilters.push(sortLabels[filters.sortBy]);
    }
    
    return activeFilters.length > 0 ? activeFilters.join(', ') : 'Sin filtros';
  };

  const renderRatingFilter = () => (
    <View style={styles.filterSection}>
      <Text style={styles.sectionTitle}>Calificación</Text>
      <View style={styles.ratingButtons}>
        {[1, 2, 3, 4, 5].map(rating => (
          <TouchableOpacity
            key={rating}
            onPress={() => {
              if (filters.minRating === rating) {
                updateFilter('minRating', undefined);
              } else {
                updateFilter('minRating', rating);
                updateFilter('maxRating', undefined);
              }
            }}
            style={[
              styles.ratingButton,
              filters.minRating === rating && styles.ratingButtonActive
            ]}
          >
            <Text style={[
              styles.ratingButtonText,
              filters.minRating === rating && styles.ratingButtonTextActive
            ]}>
              {rating}+ ⭐
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderOptionsFilter = () => (
    <View style={styles.filterSection}>
      <Text style={styles.sectionTitle}>Opciones</Text>
      
      <TouchableOpacity
        onPress={() => updateFilter('verifiedOnly', !filters.verifiedOnly)}
        style={styles.optionRow}
      >
        <Ionicons
          name={filters.verifiedOnly ? 'checkbox' : 'square-outline'}
          size={20}
          color={filters.verifiedOnly ? '#2196F3' : '#666'}
        />
        <Text style={styles.optionText}>Solo reseñas verificadas</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => updateFilter('recentOnly', !filters.recentOnly)}
        style={styles.optionRow}
      >
        <Ionicons
          name={filters.recentOnly ? 'checkbox' : 'square-outline'}
          size={20}
          color={filters.recentOnly ? '#2196F3' : '#666'}
        />
        <Text style={styles.optionText}>Últimos 30 días</Text>
      </TouchableOpacity>
    </View>
  );

  const renderSortFilter = () => (
    <View style={styles.filterSection}>
      <Text style={styles.sectionTitle}>Ordenar por</Text>
      <View style={styles.sortButtons}>
        {[
          { key: 'newest', label: 'Más recientes', icon: 'time-outline' },
          { key: 'oldest', label: 'Más antiguas', icon: 'time-outline' },
          { key: 'highest', label: 'Mejor calificadas', icon: 'star-outline' },
          { key: 'lowest', label: 'Peor calificadas', icon: 'star-outline' },
          { key: 'helpful', label: 'Más útiles', icon: 'thumbs-up-outline' }
        ].map(sortOption => (
          <TouchableOpacity
            key={sortOption.key}
            onPress={() => updateFilter('sortBy', sortOption.key)}
            style={[
              styles.sortButton,
              filters.sortBy === sortOption.key && styles.sortButtonActive
            ]}
          >
            <Ionicons
              name={sortOption.icon as any}
              size={16}
              color={filters.sortBy === sortOption.key ? '#fff' : '#666'}
            />
            <Text style={[
              styles.sortButtonText,
              filters.sortBy === sortOption.key && styles.sortButtonTextActive
            ]}>
              {sortOption.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <>
      {/* Botón de filtros */}
      <TouchableOpacity
        onPress={() => setIsModalVisible(true)}
        style={[styles.filterButton, style]}
      >
        <Ionicons name="filter" size={20} color="#666" />
        <Text style={styles.filterButtonText}>Filtros</Text>
        {hasActiveFilters && (
          <View style={styles.activeFilterBadge}>
            <Text style={styles.activeFilterBadgeText}>
              {Object.keys(filters).length}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Resumen de filtros activos */}
      {hasActiveFilters && (
        <View style={styles.filterSummary}>
          <Text style={styles.filterSummaryText}>{getFilterSummary()}</Text>
          <TouchableOpacity onPress={clearFilters} style={styles.clearButton}>
            <Text style={styles.clearButtonText}>Limpiar</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Modal de filtros */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setIsModalVisible(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
            
            <Text style={styles.modalTitle}>Filtros de Reseñas</Text>
            
            <TouchableOpacity
              onPress={clearFilters}
              style={styles.clearAllButton}
            >
              <Text style={styles.clearAllButtonText}>Limpiar</Text>
            </TouchableOpacity>
          </View>

          {/* Contenido de filtros */}
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {renderRatingFilter()}
            {renderOptionsFilter()}
            {renderSortFilter()}
          </ScrollView>

          {/* Footer */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              onPress={() => setIsModalVisible(false)}
              style={styles.applyButton}
            >
              <Text style={styles.applyButtonText}>Aplicar Filtros</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 8,
  },
  filterButtonText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  activeFilterBadge: {
    backgroundColor: '#2196F3',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  activeFilterBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  filterSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  filterSummaryText: {
    fontSize: 12,
    color: '#666',
    flex: 1,
  },
  clearButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  clearButtonText: {
    fontSize: 12,
    color: '#2196F3',
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  modalHeader: {
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
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  clearAllButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  clearAllButtonText: {
    fontSize: 14,
    color: '#F44336',
    fontWeight: '500',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  filterSection: {
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
  },
  ratingButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  ratingButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  ratingButtonActive: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  ratingButtonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  ratingButtonTextActive: {
    color: '#fff',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  optionText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 12,
  },
  sortButtons: {
    gap: 8,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  sortButtonActive: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  sortButtonText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  sortButtonTextActive: {
    color: '#fff',
  },
  modalFooter: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  applyButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});
