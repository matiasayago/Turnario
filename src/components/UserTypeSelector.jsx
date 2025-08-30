import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

export const UserTypeSelector = () => {
  const { user, switchUserType } = useAuth();

  const handleSwitchUserType = async () => {
    const currentType = user?.userType;
    const newType = currentType === 'professional' ? 'client' : 'professional';
    
    Alert.alert(
      'Cambiar Modo',
      `¿Estás seguro de que quieres cambiar a modo ${newType === 'professional' ? 'Profesional' : 'Cliente'}?`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Cambiar',
          onPress: async () => {
            try {
              await switchUserType(newType);
              Alert.alert(
                'Éxito',
                `Modo cambiado a ${newType === 'professional' ? 'Profesional' : 'Cliente'}`,
                [{ text: 'OK' }]
              );
            } catch (error) {
              Alert.alert('Error', 'No se pudo cambiar el modo');
            }
          },
        },
      ]
    );
  };

  const getCurrentModeInfo = () => {
    if (user?.userType === 'professional') {
      return {
        title: 'Modo Profesional',
        subtitle: 'Gestiona horarios y citas',
        icon: 'business',
        color: '#667eea',
        backgroundColor: '#f0f8ff',
      };
    } else {
      return {
        title: 'Modo Cliente',
        subtitle: 'Reserva citas y servicios',
        icon: 'person',
        color: '#4caf50',
        backgroundColor: '#f0f9ff',
      };
    }
  };

  const modeInfo = getCurrentModeInfo();

  return (
    <View style={styles.container}>
      <View style={[styles.modeCard, { backgroundColor: modeInfo.backgroundColor }]}>
        <View style={styles.modeInfo}>
          <View style={[styles.modeIcon, { backgroundColor: modeInfo.color + '20' }]}>
            <Ionicons name={modeInfo.icon} size={24} color={modeInfo.color} />
          </View>
          <View style={styles.modeText}>
            <Text style={[styles.modeTitle, { color: modeInfo.color }]}>
              {modeInfo.title}
            </Text>
            <Text style={styles.modeSubtitle}>
              {modeInfo.subtitle}
            </Text>
          </View>
        </View>
        
        <TouchableOpacity
          style={[styles.switchButton, { backgroundColor: modeInfo.color }]}
          onPress={handleSwitchUserType}
        >
          <Ionicons name="swap-horizontal" size={20} color="white" />
          <Text style={styles.switchButtonText}>
            Cambiar a {user?.userType === 'professional' ? 'Cliente' : 'Profesional'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 15,
  },
  modeCard: {
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  modeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  modeIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  modeText: {
    flex: 1,
  },
  modeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  modeSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  switchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  switchButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});




