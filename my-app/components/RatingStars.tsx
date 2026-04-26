// @ts-nocheck — beta
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface RatingStarsProps {
  rating: number;
  size?: 'small' | 'medium' | 'large';
  showNumber?: boolean;
  interactive?: boolean;
  onRatingChange?: (rating: number) => void;
  maxRating?: number;
  style?: any;
}

export const RatingStars: React.FC<RatingStarsProps> = ({
  rating,
  size = 'medium',
  showNumber = false,
  interactive = false,
  onRatingChange,
  maxRating = 5,
  style
}) => {
  const getStarSize = () => {
    switch (size) {
      case 'small': return 16;
      case 'large': return 24;
      default: return 20;
    }
  };

  const getTextSize = () => {
    switch (size) {
      case 'small': return 12;
      case 'large': return 16;
      default: return 14;
    }
  };

  const handleStarPress = (starRating: number) => {
    if (interactive && onRatingChange) {
      onRatingChange(starRating);
    }
  };

  const renderStars = () => {
    const stars = [];
    const starSize = getStarSize();

    for (let i = 1; i <= maxRating; i++) {
      const isFilled = i <= rating;
      const isHalf = i === Math.ceil(rating) && rating % 1 !== 0;
      
      let iconName = 'star-outline';
      if (isFilled) {
        iconName = 'star';
      } else if (isHalf) {
        iconName = 'star-half';
      }

      stars.push(
        <TouchableOpacity
          key={i}
          onPress={() => handleStarPress(i)}
          disabled={!interactive}
          style={styles.starContainer}
        >
          <Ionicons
            name={iconName as any}
            size={starSize}
            color={isFilled || isHalf ? '#FFD700' : '#D3D3D3'}
          />
        </TouchableOpacity>
      );
    }

    return stars;
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.starsContainer}>
        {renderStars()}
      </View>
      {showNumber && (
        <Text style={[styles.ratingText, { fontSize: getTextSize() }]}>
          {rating.toFixed(1)}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starContainer: {
    marginHorizontal: 1,
  },
  ratingText: {
    marginLeft: 8,
    fontWeight: '600',
    color: '#333',
  },
});
