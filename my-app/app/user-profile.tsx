import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import UserProfileDisplay from '../components/UserProfileDisplay';
import { useUserProfile } from '../contexts/UserProfileContext';

export default function UserProfileScreen() {
  const router = useRouter();
  const { profile, isLoading, refreshProfile } = useUserProfile();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Perfil Completo</Text>
        <TouchableOpacity 
          style={styles.refreshButton} 
          onPress={refreshProfile}
          disabled={isLoading}
        >
          <Ionicons 
            name="refresh" 
            size={24} 
            color={isLoading ? "#999" : "#667eea"} 
          />
        </TouchableOpacity>
      </View>

      {/* Profile Content */}
      <UserProfileDisplay />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  refreshButton: {
    padding: 8,
  },
});
