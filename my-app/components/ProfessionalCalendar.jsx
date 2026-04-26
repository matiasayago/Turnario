import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { getBackendBaseUrl } from '../config/backend';
import { getBookableTimeSlotsForProfessionalDate } from '../services/bookingSlotsService';
import {
    ActivityIndicator,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

const ProfessionalCalendar = ({ 
  visible, 
  onClose, 
  onDateSelect, 
  professionalId, 
  selectedDate,
  isProfessional = false 
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [availableDates, setAvailableDates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const BACKEND_URL = getBackendBaseUrl();

  // CONSULTAR DISPONIBILIDAD DESDE LA BASE DE DATOS
  const loadAvailability = async (month, year) => {
    if (!professionalId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      console.log(`🔍 Consultando fechas específicas configuradas para profesional ${professionalId} - ${month}/${year}`);
      
      // PRIORIDAD 1: Cargar fechas específicas guardadas en "Gestión de Horarios"
      const response = await fetch(`${BACKEND_URL}/api/v1/date-schedules/${professionalId}/month/${year}/${month}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Respuesta de date-schedules:`, data);
        
        // Extraer las fechas que tienen horarios disponibles
        const schedules = data.data || data; // Manejar ambos formatos de respuesta
        
        if (Array.isArray(schedules) && schedules.length > 0) {
          const candidateDates = [
            ...new Set(
              schedules
                .filter(
                  (schedule) =>
                    schedule.timeSlots &&
                    schedule.timeSlots.length > 0 &&
                    schedule.isAvailable !== false &&
                    schedule.date
                )
                .map((schedule) => schedule.date)
            ),
          ];

          const withBookable = await Promise.all(
            candidateDates.map(async (dateYmd) => {
              const slots = await getBookableTimeSlotsForProfessionalDate(
                professionalId,
                String(dateYmd).slice(0, 10)
              );
              return { dateYmd: String(dateYmd).slice(0, 10), slots };
            })
          );

          const dates = withBookable
            .filter((x) => x.slots.length > 0)
            .map((x) => x.dateYmd)
            .sort();

          setAvailableDates(dates);
          console.log(
            `✅ Fechas con al menos un horario libre (tras citas ocupadas):`,
            dates.length,
            'de',
            candidateDates.length,
            'configuradas'
          );
          return; // Solo fechas con turno disponible para el usuario
        } else {
          console.log(`⚠️ No hay fechas específicas configuradas en la BD`);
        }
      } else {
        console.warn(`⚠️ Error en date-schedules API: ${response.status}`);
      }
    } catch (error) {
      console.log(`⚠️ Error consultando API:`, error.message);
      setError(error.message);
      
      // NO generar fechas automáticamente - mostrar que no hay fechas configuradas
      setAvailableDates([]);
      console.log(`⚠️ No se pudieron cargar fechas configuradas. El profesional debe configurar sus horarios en Settings → Gestión de Horarios`);
    } finally {
      setLoading(false);
    }
  };

  // Función para generar fechas disponibles basadas en la configuración
  const generateAvailableDatesFromConfig = (config, year, month) => {
    const availableDates = [];
    
    // Verificar que los parámetros sean válidos
    if (!config || typeof year !== 'number' || typeof month !== 'number') {
      console.error('❌ Parámetros inválidos en generateAvailableDatesFromConfig:', { config, year, month });
      return availableDates;
    }
    
    const daysInMonth = new Date(year, month, 0).getDate();
    
    // Mapeo de días de la semana
    const dayMap = {
      'monday': 1,
      'tuesday': 2,
      'wednesday': 3,
      'thursday': 4,
      'friday': 5,
      'saturday': 6,
      'sunday': 0
    };
    
    // Verificar si la configuración está activa
    if (!config.isActive) {
      console.log(`⚠️ Configuración de disponibilidad inactiva para profesional ${professionalId}`);
      return availableDates;
    }
    
    // Generar fechas para cada día del mes
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      
      // Verificar que la fecha sea válida
      if (isNaN(date.getTime())) {
        console.error('❌ Fecha inválida generada:', { year, month, day });
        continue;
      }
      
      const dayOfWeek = date.getDay();
      
      // Verificar si este día de la semana está configurado como disponible
      const dayName = Object.keys(dayMap).find(key => dayMap[key] === dayOfWeek);
      const isDayAvailable = config.daysOfWeek && config.daysOfWeek[dayName];
      
      if (isDayAvailable) {
        // Usar fecha local para evitar problemas de zona horaria
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateString = `${year}-${month}-${day}`;
        availableDates.push(dateString);
      }
    }
    
    console.log(`📅 Generadas ${availableDates.length} fechas disponibles para ${month}/${year}`);
    return availableDates;
  };

  // Cargar disponibilidad cuando cambia el mes o se abre el modal
  useEffect(() => {
    if (visible && professionalId) {
      const month = currentMonth.getMonth() + 1; // getMonth() devuelve 0-11
      const year = currentMonth.getFullYear();
      console.log(`📅 Cargando fechas configuradas para profesional ${professionalId} - Mes: ${month}/${year}`);
      loadAvailability(month, year);
    } else if (visible && !professionalId) {
      console.warn('⚠️ No hay professionalId - No se pueden cargar fechas configuradas');
      setAvailableDates([]);
    }
  }, [visible, professionalId, currentMonth]);

  // VERIFICAR DISPONIBILIDAD DE UNA FECHA
  const isDateAvailable = (date) => {
    // Verificar que la fecha sea válida
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      // Silenciar error - no afecta funcionalidad
      return false;
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // No permitir fechas pasadas
    if (date < today) return false;
    
    // Convertir fecha a formato YYYY-MM-DD para comparar - usando fecha local
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    
    // SOLO mostrar fechas que están en availableDates (configuradas por el profesional)
    // NO generar fechas automáticamente
    return availableDates.includes(dateString);
  };

  // Generar días del mes
  const getDaysInMonth = (date) => {
    // Verificar que la fecha sea válida
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      console.error('❌ Fecha inválida en getDaysInMonth:', date);
      return [];
    }
    
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const firstDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    
    const days = [];
    
    // Días del mes anterior (grises)
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const prevMonthLastDay = new Date(year, month, 0).getDate();
      days.push({
        day: prevMonthLastDay - i,
        isCurrentMonth: false,
        isAvailable: false,
        date: new Date(year, month - 1, prevMonthLastDay - i)
      });
    }
    
    // Días del mes actual
    for (let day = 1; day <= daysInMonth; day++) {
      const checkDate = new Date(year, month, day);
      
      // Verificar que la fecha sea válida
      if (isNaN(checkDate.getTime())) {
        console.error('❌ Fecha inválida generada en getDaysInMonth:', { year, month, day });
        continue;
      }
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const isAvailable = isDateAvailable(checkDate);
      
      days.push({
        day,
        isCurrentMonth: true,
        isAvailable,
        date: checkDate,
        isToday: checkDate.toDateString() === today.toDateString(),
        isSelected: selectedDate && (() => {
          const sel = String(selectedDate).trim();
          if (/^\d{4}-\d{2}-\d{2}$/.test(sel)) {
            const [y, m, d] = sel.split('-').map(Number);
            const parsed = new Date(y, m - 1, d);
            return !isNaN(parsed.getTime()) && checkDate.toDateString() === parsed.toDateString();
          }
          const parsed = new Date(selectedDate);
          return !isNaN(parsed.getTime()) && checkDate.toDateString() === parsed.toDateString();
        })()
      });
    }
    
    return days;
  };

  const handleDateSelect = (dayObj) => {
    if (!dayObj.isAvailable) return;
    
    // Formato para mostrar al usuario
    const displayDate = dayObj.date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long'
    });
    
    // Formato ISO para la base de datos (YYYY-MM-DD) - usando fecha local
    const year = dayObj.date.getFullYear();
    const month = String(dayObj.date.getMonth() + 1).padStart(2, '0');
    const day = String(dayObj.date.getDate()).padStart(2, '0');
    const isoDate = `${year}-${month}-${day}`;
    
    console.log(`✅ Fecha seleccionada: ${displayDate} (ISO: ${isoDate})`);
    console.log(`🔍 Fecha original:`, dayObj.date);
    console.log(`🔍 Componentes: año=${year}, mes=${month}, día=${day}`);
    onDateSelect(isoDate); // Retornar formato ISO
    onClose();
  };

  const navigateMonth = (direction) => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      newMonth.setMonth(prev.getMonth() + direction);
      
      // Recargar disponibilidad para el nuevo mes
      if (professionalId) {
        const month = newMonth.getMonth() + 1;
        const year = newMonth.getFullYear();
        loadAvailability(month, year);
      }
      
      return newMonth;
    });
  };

  const calendarDays = getDaysInMonth(currentMonth);

  // Contar fechas disponibles
  const availableCount = calendarDays.filter(day => day.isCurrentMonth && day.isAvailable).length;
  
  // Log cuando se renderiza
  useEffect(() => {
    console.log('📅 ProfessionalCalendar - Fechas disponibles cargadas:', availableDates.length);
    console.log('📅 ProfessionalCalendar - Primeras 5 fechas:', availableDates.slice(0, 5));
    console.log('📅 ProfessionalCalendar - Días disponibles en el mes actual:', availableCount);
  }, [availableDates, currentMonth]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.title}>
              📅 Seleccionar Fecha
            </Text>
            <Text style={styles.subtitle}>
              Solo días con al menos un turno libre (verde). Si todos los horarios están ocupados, el día no se muestra.
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Navegación del mes */}
        <View style={styles.navigation}>
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => navigateMonth(-1)}
          >
            <Ionicons name="chevron-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          
          <Text style={styles.monthText}>
            {currentMonth.toLocaleDateString('es-ES', { 
              month: 'long', 
              year: 'numeric' 
            })}
          </Text>
          
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => navigateMonth(1)}
          >
            <Ionicons name="chevron-forward" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>

        {/* Indicador de fechas disponibles */}
        <View style={[
          styles.availabilityIndicator,
          availableCount === 0 && styles.availabilityIndicatorWarning
        ]}>
          <Ionicons name={availableCount > 0 ? "checkmark-circle" : "alert-circle"} size={24} color={availableCount > 0 ? "#4CAF50" : "#FF9800"} />
          <View style={{ flex: 1 }}>
            <Text style={[
              styles.availabilityText,
              availableCount === 0 && styles.availabilityTextWarning
            ]}>
              {availableCount > 0 
                ? `✅ ${availableCount} fechas configuradas` 
                : '⚠️ No hay fechas configuradas'}
            </Text>
            <Text style={styles.availabilitySubtext}>
              {availableCount > 0 
                ? 'Toca una fecha verde para seleccionarla' 
                : 'Configura tus horarios en Settings → Gestión de Horarios'}
            </Text>
          </View>
        </View>

        {/* Días de la semana */}
        <View style={styles.weekDays}>
          {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((day, index) => (
            <Text key={index} style={styles.weekDayText}>{day}</Text>
          ))}
        </View>

        {/* Calendario */}
        <ScrollView style={styles.calendarContainer}>
          <View style={styles.calendarGrid}>
            {calendarDays.map((dayObj, index) => (
              <TouchableOpacity
                key={`day-${dayObj.day}-${index}`}
                style={[
                  styles.dayButton,
                  !dayObj.isCurrentMonth && styles.dayButtonOtherMonth,
                  !dayObj.isAvailable && styles.dayButtonUnavailable,
                  dayObj.isAvailable && styles.dayButtonAvailable,
                  dayObj.isToday && styles.dayButtonToday,
                  dayObj.isSelected && styles.dayButtonSelected
                ]}
                onPress={() => handleDateSelect(dayObj)}
                disabled={!dayObj.isAvailable}
              >
                <Text style={[
                  styles.dayText,
                  !dayObj.isCurrentMonth && styles.dayTextOtherMonth,
                  !dayObj.isAvailable && styles.dayTextUnavailable,
                  dayObj.isAvailable && styles.dayTextAvailable,
                  dayObj.isToday && styles.dayTextToday,
                  dayObj.isSelected && styles.dayTextSelected
                ]}>
                  {dayObj.day}
                </Text>
                {dayObj.isAvailable && (
                  <View style={styles.availableDot} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Información de disponibilidad */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>📅 Disponibilidad del Profesional</Text>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#007AFF" />
              <Text style={styles.infoText}>🔄 Consultando disponibilidad...</Text>
            </View>
          ) : error ? (
            <Text style={styles.errorText}>⚠️ Error: {error}</Text>
          ) : (
            <>
              <Text style={styles.infoText}>
                ✅ {availableCount} días disponibles este mes
              </Text>
              <Text style={styles.infoText}>
                🎯 Los días disponibles aparecen en VERDE
              </Text>
              <Text style={styles.infoText}>
                📊 Total de días con horarios: {availableDates.length}
              </Text>
            </>
          )}
        </View>

        {/* Leyenda */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, styles.legendAvailable]} />
            <Text style={styles.legendText}>Disponible</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, styles.legendUnavailable]} />
            <Text style={styles.legendText}>No disponible</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, styles.legendToday]} />
            <Text style={styles.legendText}>Hoy</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#667eea',
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#E0E7FF',
    fontWeight: '500',
  },
  closeButton: {
    padding: 8,
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  navButton: {
    padding: 10,
  },
  monthText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  weekDays: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 15,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  weekDayText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    width: 40,
    textAlign: 'center',
  },
  calendarContainer: {
    flex: 1,
    padding: 20,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  dayButton: {
    width: 45,
    height: 45,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 5,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    position: 'relative',
  },
  dayButtonOtherMonth: {
    opacity: 0.3,
  },
  dayButtonUnavailable: {
    backgroundColor: '#f5f5f5',
    borderColor: '#ddd',
  },
  dayButtonAvailable: {
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#2e7d32',
    shadowColor: '#4CAF50',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  dayButtonToday: {
    backgroundColor: '#007AFF',
    borderColor: '#0056CC',
  },
  dayButtonSelected: {
    backgroundColor: '#FF6B35',
    borderColor: '#E55A2B',
  },
  dayText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  dayTextOtherMonth: {
    color: '#ccc',
  },
  dayTextUnavailable: {
    color: '#999',
  },
  dayTextAvailable: {
    color: '#fff',
    fontWeight: 'bold',
  },
  dayTextToday: {
    color: '#fff',
    fontWeight: 'bold',
  },
  dayTextSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },
  availableDot: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  infoSection: {
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  errorText: {
    fontSize: 14,
    color: '#FF6B35',
    marginBottom: 5,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 5,
  },
  legendAvailable: {
    backgroundColor: '#4CAF50',
  },
  legendUnavailable: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  legendToday: {
    backgroundColor: '#007AFF',
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },
  availabilityIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F5E9',
    padding: 12,
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 8,
    gap: 8,
  },
  availabilityText: {
    fontSize: 16,
    color: '#2E7D32',
    fontWeight: '700',
    marginBottom: 2,
  },
  availabilitySubtext: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  availabilityIndicatorWarning: {
    backgroundColor: '#FFF3E0',
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  availabilityTextWarning: {
    color: '#E65100',
  },
});

export default ProfessionalCalendar;
