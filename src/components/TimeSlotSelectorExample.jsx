import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import TimeSlotSelector from './TimeSlotSelector';

const TimeSlotSelectorExample = () => {
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedDate, setSelectedDate] = useState('15 de diciembre');
  const [professionalId] = useState('1'); // Dr. Carlos Mendoza
  const [clinicId] = useState('1');
  const [serviceId] = useState('1');

  const handleTimeSelect = (time) => {
    setSelectedTime(time);
    Alert.alert('Horario Seleccionado', `Has seleccionado: ${time}`);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ejemplo de TimeSlotSelector</Text>
      
      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>Fecha: {selectedDate}</Text>
        <Text style={styles.infoText}>Profesional ID: {professionalId}</Text>
        <Text style={styles.infoText}>Clínica ID: {clinicId}</Text>
        <Text style={styles.infoText}>Servicio ID: {serviceId}</Text>
      </View>

      <TimeSlotSelector
        selectedTime={selectedTime}
        onTimeSelect={handleTimeSelect}
        selectedDate={selectedDate}
        professionalId={professionalId}
        clinicId={clinicId}
        serviceId={serviceId}
        placeholder="Selecciona un horario..."
        style={styles.selector}
      />

      {selectedTime && (
        <View style={styles.resultContainer}>
          <Text style={styles.resultText}>
            Horario seleccionado: {selectedTime}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  infoContainer: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  selector: {
    marginBottom: 20,
  },
  resultContainer: {
    backgroundColor: '#e8f5e8',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  resultText: {
    fontSize: 16,
    color: '#2e7d32',
    fontWeight: '600',
  },
});

export default TimeSlotSelectorExample;

