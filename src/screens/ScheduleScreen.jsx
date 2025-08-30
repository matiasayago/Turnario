import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
  TextInput,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ScheduleService } from '../services/ScheduleService';
import { TurnarioLogo } from '../components/TurnarioLogo';

const { width } = Dimensions.get('window');

const DAYS = [
  { id: 0, name: 'Domingo', short: 'Dom' },
  { id: 1, name: 'Lunes', short: 'Lun' },
  { id: 2, name: 'Martes', short: 'Mar' },
  { id: 3, name: 'Miércoles', short: 'Mié' },
  { id: 4, name: 'Jueves', short: 'Jue' },
  { id: 5, name: 'Viernes', short: 'Vie' },
  { id: 6, name: 'Sábado', short: 'Sáb' },
];

const TIME_INTERVALS = [
  { id: 15, label: '15 min' },
  { id: 30, label: '30 min' },
  { id: 45, label: '45 min' },
  { id: 60, label: '1 hora' },
];

export const ScheduleScreen = ({ navigation }) => {
  console.log('🚀 ScheduleScreen cargando...');
  
  const [schedule, setSchedule] = useState({});
  const [loading, setLoading] = useState(false);
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [timeInterval, setTimeInterval] = useState(30);
  const [tempSchedule, setTempSchedule] = useState({});
  const [validationErrors, setValidationErrors] = useState([]);
  const [copyFromDay, setCopyFromDay] = useState(null);
  const [copyToDay, setCopyToDay] = useState(null);

  useEffect(() => {
    console.log('📅 useEffect ejecutándose en ScheduleScreen');
    loadSchedule();
  }, []);

  const loadSchedule = async () => {
    console.log('🔄 Cargando horarios...');
    setLoading(true);
    try {
      const savedSchedule = await ScheduleService.getProfessionalSchedule();
      console.log('📋 Horario guardado encontrado:', savedSchedule);
      if (Object.keys(savedSchedule).length > 0) {
        setSchedule(savedSchedule);
        console.log('✅ Horario cargado desde almacenamiento');
      } else {
        console.log('🆕 Creando horario por defecto...');
        // Horario por defecto
        const defaultSchedule = DAYS.reduce((acc, day) => {
        acc[day.id] = {
            enabled: [1, 2, 3, 4, 5].includes(day.id), // Lunes a Viernes
            timeRanges: [1, 2, 3, 4, 5].includes(day.id) ? [
              { start: '09:00', end: '12:00' },
              { start: '14:00', end: '18:00' }
            ] : [],
            interval: 30,
            breaks: [1, 2, 3, 4, 5].includes(day.id) ? [
              { start: '12:00', end: '14:00' }
            ] : [],
        };
        return acc;
      }, {});
        console.log('📅 Horario por defecto creado:', defaultSchedule);
        setSchedule(defaultSchedule);
        await ScheduleService.saveProfessionalSchedule(defaultSchedule);
        console.log('💾 Horario por defecto guardado');
      }
    } catch (error) {
      console.error('💥 Error al cargar horario:', error);
      Alert.alert('Error', 'No se pudo cargar el horario');
    } finally {
      setLoading(false);
      console.log('✅ Carga de horarios completada');
    }
  };

  const toggleDay = (dayId) => {
    const newSchedule = {
      ...schedule,
      [dayId]: {
        ...schedule[dayId],
        enabled: !schedule[dayId]?.enabled,
        timeRanges: !schedule[dayId]?.enabled ? [
          { start: '09:00', end: '12:00' },
          { start: '14:00', end: '18:00' }
        ] : [],
        interval: schedule[dayId]?.interval || 30,
        breaks: !schedule[dayId]?.enabled ? [
          { start: '12:00', end: '14:00' }
        ] : [],
      },
    };
    setSchedule(newSchedule);
    saveScheduleToStorage(newSchedule);
  };

  const openTimeModal = (dayId) => {
    setSelectedDay(dayId);
    setTempSchedule(schedule[dayId] || {});
    setTimeInterval(schedule[dayId]?.interval || 30);
    setValidationErrors([]);
    setShowTimeModal(true);
  };

  const closeTimeModal = () => {
    setShowTimeModal(false);
    setSelectedDay(null);
    setTempSchedule({});
    setValidationErrors([]);
  };

  const addTimeRange = () => {
    const newRange = { start: '09:00', end: '10:00' };
    setTempSchedule(prev => ({
      ...prev,
      timeRanges: [...(prev.timeRanges || []), newRange],
    }));
  };

  const removeTimeRange = (index) => {
    setTempSchedule(prev => ({
      ...prev,
      timeRanges: prev.timeRanges.filter((_, i) => i !== index),
    }));
  };

  const updateTimeRange = (index, field, value) => {
    setTempSchedule(prev => ({
      ...prev,
      timeRanges: prev.timeRanges.map((range, i) => 
        i === index ? { ...range, [field]: value } : range
      ),
    }));
  };

  const addBreak = () => {
    const newBreak = { start: '12:00', end: '13:00' };
    setTempSchedule(prev => ({
      ...prev,
      breaks: [...(prev.breaks || []), newBreak],
    }));
  };

  const removeBreak = (index) => {
    setTempSchedule(prev => ({
      ...prev,
      breaks: prev.breaks.filter((_, i) => i !== index),
    }));
  };

  const updateBreak = (index, field, value) => {
    setTempSchedule(prev => ({
      ...prev,
      breaks: prev.breaks.map((breakTime, i) => 
        i === index ? { ...breakTime, [field]: value } : breakTime
      ),
    }));
  };

  const validateTimeFormat = (time) => {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  };

  const saveTimeModal = () => {
    if (!tempSchedule.timeRanges || tempSchedule.timeRanges.length === 0) {
      Alert.alert('Error', 'Debes configurar al menos un rango de horario');
      return;
    }

    // Validar formato de tiempo
    const timeErrors = [];
    tempSchedule.timeRanges.forEach((range, index) => {
      if (!validateTimeFormat(range.start)) {
        timeErrors.push(`Hora de inicio del rango ${index + 1} no es válida`);
      }
      if (!validateTimeFormat(range.end)) {
        timeErrors.push(`Hora de fin del rango ${index + 1} no es válida`);
      }
    });

    // Validar pausas
    if (tempSchedule.breaks) {
      tempSchedule.breaks.forEach((breakTime, index) => {
        if (!validateTimeFormat(breakTime.start)) {
          timeErrors.push(`Hora de inicio de la pausa ${index + 1} no es válida`);
        }
        if (!validateTimeFormat(breakTime.end)) {
          timeErrors.push(`Hora de fin de la pausa ${index + 1} no es válida`);
        }
      });
    }

    if (timeErrors.length > 0) {
      setValidationErrors(timeErrors);
      return;
    }

    // Validar que los rangos no se superpongan
    const sortedRanges = [...tempSchedule.timeRanges].sort((a, b) => 
      a.start.localeCompare(b.start)
    );
    
    for (let i = 0; i < sortedRanges.length - 1; i++) {
      if (sortedRanges[i].end > sortedRanges[i + 1].start) {
        Alert.alert('Error', 'Los rangos de horario no pueden superponerse');
        return;
      }
    }

    // Validar que cada rango tenga inicio antes que fin
    for (let i = 0; i < tempSchedule.timeRanges.length; i++) {
      const range = tempSchedule.timeRanges[i];
      if (range.start >= range.end) {
        Alert.alert('Error', `El rango ${i + 1} debe tener hora de inicio antes que la de fin`);
        return;
      }
    }

    // Validar pausas
    if (tempSchedule.breaks) {
      for (let i = 0; i < tempSchedule.breaks.length; i++) {
        const breakTime = tempSchedule.breaks[i];
        if (breakTime.start >= breakTime.end) {
          Alert.alert('Error', `La pausa ${i + 1} debe tener hora de inicio antes que la de fin`);
          return;
        }
      }
    }

    const newSchedule = {
      ...schedule,
      [selectedDay]: {
        ...tempSchedule,
        interval: timeInterval,
        enabled: true,
      },
    };
    
    setSchedule(newSchedule);
    saveScheduleToStorage(newSchedule);
    closeTimeModal();
    Alert.alert('Éxito', 'Horario configurado correctamente');
  };

  const applyTemplate = (templateKey) => {
    const templateSchedule = ScheduleService.applyScheduleTemplate(templateKey);
    if (templateSchedule) {
      setSchedule(templateSchedule);
      saveScheduleToStorage(templateSchedule);
      setShowTemplateModal(false);
      Alert.alert('Éxito', 'Plantilla aplicada correctamente');
    }
  };

  const copySchedule = () => {
    if (!copyFromDay || !copyToDay) {
      Alert.alert('Error', 'Selecciona los días para copiar');
      return;
    }

    const newSchedule = ScheduleService.copyDaySchedule(schedule, copyFromDay, copyToDay);
    if (newSchedule) {
      setSchedule(newSchedule);
      saveScheduleToStorage(newSchedule);
      setShowCopyModal(false);
      setCopyFromDay(null);
      setCopyToDay(null);
      Alert.alert('Éxito', 'Horario copiado correctamente');
    } else {
      Alert.alert('Error', 'No se pudo copiar el horario');
    }
  };

  const saveScheduleToStorage = async (scheduleData) => {
    try {
      await ScheduleService.saveProfessionalSchedule(scheduleData);
    } catch (error) {
      console.error('Error al guardar horario:', error);
    }
  };

  const saveSchedule = async () => {
    setLoading(true);
    try {
      // Validar horarios antes de guardar
      const errors = ScheduleService.validateSchedule(schedule);
      if (errors.length > 0) {
        Alert.alert('Error de Validación', errors.join('\n'));
        setLoading(false);
        return;
      }

      // Aquí enviaríamos el horario a la API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mostrar estadísticas del horario
      const stats = ScheduleService.getScheduleStats(schedule);
      Alert.alert(
        'Éxito', 
        `Horario guardado correctamente\n\n` +
        `Días activos: ${stats.enabledDays}\n` +
        `Rangos de tiempo: ${stats.totalRanges}\n` +
        `Pausas: ${stats.totalBreaks}\n` +
        `Total de horas: ${stats.netHours}h\n` +
        `Capacidad semanal: ${stats.weeklyCapacity} citas`
      );
    } catch (error) {
      Alert.alert('Error', 'No se pudo guardar el horario');
    } finally {
      setLoading(false);
    }
  };

  const exportSchedule = () => {
    const exportData = ScheduleService.exportSchedule(schedule);
    Alert.alert(
      'Horarios Exportados',
      `Resumen:\n` +
      `• Días activos: ${exportData.summary.enabledDays}\n` +
      `• Rangos de tiempo: ${exportData.summary.totalRanges}\n` +
      `• Pausas: ${exportData.summary.totalBreaks}\n` +
      `• Total de horas: ${exportData.summary.netHours}h\n` +
      `• Capacidad: ${exportData.summary.weeklyCapacity} citas\n\n` +
      `Generado: ${new Date(exportData.generatedAt).toLocaleString('es-ES')}`
    );
  };

  const formatTime = (time) => {
    return time;
  };

  const renderTimeRanges = (dayId) => {
    const daySchedule = schedule[dayId];
    if (!daySchedule?.enabled || !daySchedule.timeRanges) return null;

    return (
      <View style={styles.timeRangesContainer}>
        <View style={styles.intervalInfo}>
          <Text style={styles.intervalText}>
            Intervalo: {daySchedule.interval} minutos
          </Text>
        </View>
        
        {daySchedule.timeRanges.map((range, index) => (
          <View key={index} style={styles.timeRangeItem}>
            <View style={styles.timeRangeDisplay}>
              <Text style={styles.timeRangeText}>
                {formatTime(range.start)} - {formatTime(range.end)}
              </Text>
            </View>
          </View>
        ))}

        {daySchedule.breaks && daySchedule.breaks.length > 0 && (
          <View style={styles.breaksContainer}>
            <Text style={styles.breaksLabel}>Pausas:</Text>
            {daySchedule.breaks.map((breakTime, index) => (
              <View key={index} style={styles.breakItem}>
                <Ionicons name="cafe" size={12} color="#f57c00" />
                <Text style={styles.breakText}>
                  {formatTime(breakTime.start)} - {formatTime(breakTime.end)}
                </Text>
              </View>
            ))}
          </View>
        )}
        
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => openTimeModal(dayId)}
        >
          <Ionicons name="create" size={16} color="#667eea" />
          <Text style={styles.editButtonText}>Editar Horarios</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderTimeModal = () => (
    <Modal
      visible={showTimeModal}
      animationType="slide"
      transparent={true}
      onRequestClose={closeTimeModal}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              Configurar Horarios - {DAYS.find(d => d.id === selectedDay)?.name}
            </Text>
            <TouchableOpacity onPress={closeTimeModal}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.intervalSelector}>
            <Text style={styles.intervalLabel}>Intervalo entre citas:</Text>
            <View style={styles.intervalButtons}>
              {TIME_INTERVALS.map((interval) => (
                <TouchableOpacity
                  key={interval.id}
              style={[
                    styles.intervalButton,
                    timeInterval === interval.id && styles.intervalButtonActive
                  ]}
                  onPress={() => setTimeInterval(interval.id)}
                >
                  <Text style={[
                    styles.intervalButtonText,
                    timeInterval === interval.id && styles.intervalButtonTextActive
                  ]}>
                    {interval.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
          </View>

          <ScrollView style={styles.timeRangesList}>
            <Text style={styles.sectionTitle}>Rangos de Horario</Text>
            
            {tempSchedule.timeRanges?.map((range, index) => (
              <View key={index} style={styles.timeRangeInput}>
                <View style={styles.timeInputContainer}>
                  <Text style={styles.timeInputLabel}>Inicio:</Text>
                  <TextInput
                    style={styles.timeInput}
                    value={range.start}
                    onChangeText={(text) => updateTimeRange(index, 'start', text)}
                    placeholder="09:00"
                    maxLength={5}
                  />
                </View>
                
                <View style={styles.timeInputContainer}>
                  <Text style={styles.timeInputLabel}>Fin:</Text>
                  <TextInput
                    style={styles.timeInput}
                    value={range.end}
                    onChangeText={(text) => updateTimeRange(index, 'end', text)}
                    placeholder="18:00"
                    maxLength={5}
                  />
                </View>
                
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeTimeRange(index)}
                >
                  <Ionicons name="trash" size={20} color="#ff6b6b" />
                </TouchableOpacity>
              </View>
            ))}
            
            <TouchableOpacity
              style={styles.addRangeButton}
              onPress={addTimeRange}
            >
              <Ionicons name="add-circle" size={20} color="#667eea" />
              <Text style={styles.addRangeText}>Agregar Rango</Text>
            </TouchableOpacity>

            <Text style={styles.sectionTitle}>Pausas y Descansos</Text>
            
            {tempSchedule.breaks?.map((breakTime, index) => (
              <View key={index} style={styles.breakInput}>
                <View style={styles.timeInputContainer}>
                  <Text style={styles.timeInputLabel}>Inicio:</Text>
                  <TextInput
                    style={styles.timeInput}
                    value={breakTime.start}
                    onChangeText={(text) => updateBreak(index, 'start', text)}
                    placeholder="12:00"
                    maxLength={5}
                  />
                </View>
                
                <View style={styles.timeInputContainer}>
                  <Text style={styles.timeInputLabel}>Fin:</Text>
                  <TextInput
                    style={styles.timeInput}
                    value={breakTime.end}
                    onChangeText={(text) => updateBreak(index, 'end', text)}
                    placeholder="13:00"
                    maxLength={5}
                  />
                </View>
                
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeBreak(index)}
                >
                  <Ionicons name="trash" size={20} color="#ff6b6b" />
                </TouchableOpacity>
              </View>
            ))}
            
            <TouchableOpacity
              style={styles.addBreakButton}
              onPress={addBreak}
            >
              <Ionicons name="cafe" size={20} color="#f57c00" />
              <Text style={styles.addBreakText}>Agregar Pausa</Text>
            </TouchableOpacity>

            {/* Mostrar errores de validación */}
            {validationErrors.length > 0 && (
              <View style={styles.validationErrors}>
                {validationErrors.map((error, index) => (
                  <Text key={index} style={styles.validationErrorText}>
                    ⚠️ {error}
                  </Text>
                ))}
              </View>
            )}
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.cancelModalButton}
              onPress={closeTimeModal}
            >
              <Text style={styles.cancelModalButtonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveModalButton}
              onPress={saveTimeModal}
            >
              <Text style={styles.saveModalButtonText}>Guardar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderTemplateModal = () => (
    <Modal
      visible={showTemplateModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowTemplateModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Plantillas de Horarios</Text>
            <TouchableOpacity onPress={() => setShowTemplateModal(false)}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.templateList}>
            {Object.entries(ScheduleService.getScheduleTemplates()).map(([key, template]) => (
              <TouchableOpacity
                key={key}
                style={styles.templateItem}
                onPress={() => applyTemplate(key)}
              >
                <View style={styles.templateHeader}>
                  <Text style={styles.templateName}>{template.name}</Text>
                  <Ionicons name="checkmark-circle" size={20} color="#4caf50" />
                </View>
                <Text style={styles.templateDescription}>{template.description}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const renderCopyModal = () => (
    <Modal
      visible={showCopyModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowCopyModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Copiar Horario</Text>
            <TouchableOpacity onPress={() => setShowCopyModal(false)}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.copyContainer}>
            <Text style={styles.copyLabel}>Copiar desde:</Text>
            <View style={styles.daySelector}>
              {DAYS.map((day) => (
                <TouchableOpacity
                  key={day.id}
                  style={[
                    styles.dayOption,
                    copyFromDay === day.id && styles.dayOptionSelected
                  ]}
                  onPress={() => setCopyFromDay(day.id)}
                >
                  <Text style={[
                    styles.dayOptionText,
                    copyFromDay === day.id && styles.dayOptionTextSelected
                  ]}>
                    {day.short}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.copyLabel}>Copiar a:</Text>
            <View style={styles.daySelector}>
              {DAYS.map((day) => (
                <TouchableOpacity
                  key={day.id}
                  style={[
                    styles.dayOption,
                    copyToDay === day.id && styles.dayOptionSelected
                  ]}
                  onPress={() => setCopyToDay(day.id)}
                >
                  <Text style={[
                    styles.dayOptionText,
                    copyToDay === day.id && styles.dayOptionTextSelected
                  ]}>
                    {day.short}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.cancelModalButton}
              onPress={() => setShowCopyModal(false)}
            >
              <Text style={styles.cancelModalButtonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveModalButton}
              onPress={copySchedule}
            >
              <Text style={styles.saveModalButtonText}>Copiar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      {console.log('🎨 Renderizando ScheduleScreen con schedule:', schedule)}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TurnarioLogo size="medium" />
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.templateButton}
            onPress={() => setShowTemplateModal(true)}
          >
            <Ionicons name="copy" size={20} color="#667eea" />
            <Text style={styles.templateButtonText}>Plantillas</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.copyButton}
            onPress={() => setShowCopyModal(true)}
          >
            <Ionicons name="duplicate" size={20} color="#667eea" />
            <Text style={styles.copyButtonText}>Copiar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.exportButton}
            onPress={exportSchedule}
          >
            <Ionicons name="download" size={20} color="#667eea" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.saveButton}
            onPress={saveSchedule}
            disabled={loading}
          >
            <Text style={styles.saveButtonText}>
              {loading ? 'Guardando...' : 'Guardar'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color="#667eea" />
          <Text style={styles.infoText}>
            Configura los horarios en los que estarás disponible para recibir citas.
            Puedes establecer múltiples rangos de tiempo por día y configurar pausas.
          </Text>
        </View>

        {DAYS.map((day) => (
          <View key={day.id} style={styles.dayContainer}>
            <View style={styles.dayHeader}>
              <View style={styles.dayInfo}>
              <Text style={styles.dayText}>{day.name}</Text>
                <Text style={styles.dayShort}>{day.short}</Text>
              </View>
              <Switch
                value={schedule[day.id]?.enabled || false}
                onValueChange={() => toggleDay(day.id)}
                trackColor={{ false: '#e1e1e1', true: '#667eea' }}
                thumbColor="white"
              />
            </View>
            
            {renderTimeRanges(day.id)}
            
            {schedule[day.id]?.enabled && !schedule[day.id]?.timeRanges?.length && (
              <TouchableOpacity
                style={styles.configureButton}
                onPress={() => openTimeModal(day.id)}
              >
                <Ionicons name="add-circle" size={20} color="#667eea" />
                <Text style={styles.configureButtonText}>Configurar Horarios</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </ScrollView>

      {renderTimeModal()}
      {renderTemplateModal()}
      {renderCopyModal()}
    </View>
  );
};

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
  headerLeft: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  templateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
  },
  templateButtonText: {
    color: '#667eea',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
  },
  copyButtonText: {
    color: '#667eea',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  exportButton: {
    padding: 8,
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
  },
  saveButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    backgroundColor: '#667eea',
    borderRadius: 8,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#e3f2fd',
    margin: 15,
    padding: 15,
    borderRadius: 12,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#1976d2',
    lineHeight: 20,
  },
  dayContainer: {
    backgroundColor: 'white',
    marginBottom: 1,
    padding: 20,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  dayInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dayText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  dayShort: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  timeRangesContainer: {
    marginTop: 10,
  },
  intervalInfo: {
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  intervalText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  timeRangeItem: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  timeRangeDisplay: {
    alignItems: 'center',
  },
  timeRangeText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f8ff',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  editButtonText: {
    color: '#667eea',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  configureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f8ff',
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
  },
  configureButtonText: {
    color: '#667eea',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  breaksContainer: {
    marginTop: 10,
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  breaksLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  breakItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  breakText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  breakInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  addBreakButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f8ff',
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
  },
  addBreakText: {
    color: '#f57c00',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    width: width * 0.9,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  intervalSelector: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  intervalLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 10,
  },
  intervalButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  intervalButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#e1e1e1',
  },
  intervalButtonActive: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  intervalButtonText: {
    color: '#666',
    fontSize: 14,
  },
  intervalButtonTextActive: {
    color: 'white',
  },
  timeRangesList: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 15,
  },
  timeRangeInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  timeInputContainer: {
    flex: 1,
    marginRight: 10,
  },
  timeInputLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  timeInput: {
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e1e1e1',
    fontSize: 16,
    textAlign: 'center',
  },
  removeButton: {
    padding: 10,
  },
  addRangeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f8ff',
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
  },
  addRangeText: {
    color: '#667eea',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  validationErrors: {
    marginTop: 15,
    padding: 10,
    backgroundColor: '#ffebee',
    borderRadius: 8,
  },
  validationErrorText: {
    color: '#c62828',
    fontSize: 14,
    marginBottom: 5,
  },
  modalActions: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e1e1e1',
    gap: 10,
  },
  cancelModalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  cancelModalButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  saveModalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#667eea',
    alignItems: 'center',
  },
  saveModalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  templateList: {
    padding: 20,
  },
  templateItem: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e1e1e1',
  },
  templateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  templateName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  templateDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  copyContainer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e1e1e1',
  },
  copyLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 10,
  },
  daySelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    gap: 10,
  },
  dayOption: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#e1e1e1',
  },
  dayOptionSelected: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  dayOptionText: {
    color: '#666',
    fontSize: 14,
  },
  dayOptionTextSelected: {
    color: 'white',
  },
});
