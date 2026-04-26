import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ReviewStats } from '../contexts/ReviewContext';

interface RatingStatsProps {
  stats: ReviewStats;
  showDistribution?: boolean;
  style?: any;
}

export const RatingStats: React.FC<RatingStatsProps> = ({
  stats,
  showDistribution = true,
  style
}) => {
  const getRatingColor = (rating: number): string => {
    if (rating >= 4.5) return '#4CAF50';
    if (rating >= 3.5) return '#8BC34A';
    if (rating >= 2.5) return '#FFC107';
    if (rating >= 1.5) return '#FF9800';
    return '#F44336';
  };

  const getRatingLabel = (rating: number): string => {
    if (rating >= 4.5) return 'Excelente';
    if (rating >= 3.5) return 'Muy Bueno';
    if (rating >= 2.5) return 'Bueno';
    if (rating >= 1.5) return 'Regular';
    return 'Malo';
  };

  const renderDistributionBar = (rating: number, count: number, total: number) => {
    const percentage = total > 0 ? (count / total) * 100 : 0;
    
    return (
      <View key={rating} style={styles.distributionRow}>
        <Text style={styles.ratingLabel}>{rating} ⭐</Text>
        <View style={styles.barContainer}>
          <View 
            style={[
              styles.bar, 
              { 
                width: `${percentage}%`,
                backgroundColor: getRatingColor(rating)
              }
            ]} 
          />
        </View>
        <Text style={styles.countText}>{count}</Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, style]}>
      {/* Rating Principal */}
      <View style={styles.mainRating}>
        <Text style={[styles.averageRating, { color: getRatingColor(stats.averageRating) }]}>
          {stats.averageRating.toFixed(1)}
        </Text>
        <Text style={styles.ratingLabel}>{getRatingLabel(stats.averageRating)}</Text>
        <Text style={styles.totalReviews}>
          {stats.totalReviews} {stats.totalReviews === 1 ? 'reseña' : 'reseñas'}
        </Text>
      </View>

      {/* Estadísticas Adicionales */}
      <View style={styles.additionalStats}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.verifiedReviews}</Text>
          <Text style={styles.statLabel}>Verificadas</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.recentReviews}</Text>
          <Text style={styles.statLabel}>Últimos 30 días</Text>
        </View>
      </View>

      {/* Distribución de Ratings */}
      {showDistribution && (
        <View style={styles.distributionContainer}>
          <Text style={styles.distributionTitle}>Distribución de Calificaciones</Text>
          {renderDistributionBar(5, stats.ratingDistribution['5'], stats.totalReviews)}
          {renderDistributionBar(4, stats.ratingDistribution['4'], stats.totalReviews)}
          {renderDistributionBar(3, stats.ratingDistribution['3'], stats.totalReviews)}
          {renderDistributionBar(2, stats.ratingDistribution['2'], stats.totalReviews)}
          {renderDistributionBar(1, stats.ratingDistribution['1'], stats.totalReviews)}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
  },
  mainRating: {
    alignItems: 'center',
    marginBottom: 16,
  },
  averageRating: {
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  ratingLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  totalReviews: {
    fontSize: 14,
    color: '#666',
  },
  additionalStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingVertical: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  distributionContainer: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 16,
  },
  distributionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  distributionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  barContainer: {
    flex: 1,
    height: 16,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: 8,
  },
  countText: {
    fontSize: 12,
    color: '#666',
    minWidth: 20,
    textAlign: 'right',
  },
});
