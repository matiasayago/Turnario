import React from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { DateScheduleDisplay } from '../components/DateScheduleDisplay';
import { useAuth } from '../contexts/AuthContext';

export default function DateScheduleTestScreen() {
  const { user } = useAuth();

  if (!user || user.userType !== 'professional') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            Esta pantalla solo está disponible para profesionales
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Prueba de Horarios por Fecha</Text>
        <Text style={styles.headerSubtitle}>
          Integración Frontend con Datos de Base de Datos
        </Text>
      </View>
      
      <DateScheduleDisplay />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#2196F3',
    padding: 16,
    paddingTop: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#e3f2fd',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#F44336',
    textAlign: 'center',
  },
});
