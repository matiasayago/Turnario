import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const TurnarioLogo = ({ size = 'medium', showText = true }) => {
  const getSize = () => {
    switch (size) {
      case 'small':
        return { iconSize: 20, textSize: 16, containerHeight: 30 };
      case 'large':
        return { iconSize: 32, textSize: 24, containerHeight: 40 };
      default: // medium
        return { iconSize: 24, textSize: 18, containerHeight: 35 };
    }
  };

  const { iconSize, textSize, containerHeight } = getSize();

  return (
    <View style={[styles.container, { height: containerHeight }]}>
      <View style={[styles.logoContainer, { width: iconSize + 8, height: iconSize + 8 }]}>
        {/* Calendario base */}
        <View style={[styles.calendar, { width: iconSize, height: iconSize }]}>
          {/* Anillos del calendario */}
          <View style={styles.calendarRings}>
            <View style={styles.ring} />
            <View style={styles.ring} />
          </View>
          {/* Checkmark dentro del calendario */}
          <View style={styles.checkmarkContainer}>
            <Ionicons 
              name="checkmark" 
              size={iconSize * 0.6} 
              color="#28A745" 
              style={styles.checkmark}
            />
          </View>
        </View>
      </View>
      
      {showText && (
        <Text style={[styles.logoText, { fontSize: textSize }]}>
          Turnario
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  calendar: {
    backgroundColor: '#3370FF',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  calendarRings: {
    position: 'absolute',
    top: -2,
    flexDirection: 'row',
    gap: 2,
  },
  ring: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#3370FF',
  },
  checkmarkContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    fontWeight: 'bold',
  },
  logoText: {
    color: '#212529',
    fontWeight: 'bold',
    fontFamily: 'System',
  },
});


