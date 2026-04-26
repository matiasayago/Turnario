import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

const SimpleCalendar = ({ 
  visible, 
  onClose, 
  onDateSelect, 
  professionalId, 
  selectedDate,
  isProfessional = false 
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // FUNCIÓN SÚPER SIMPLE - TODAS LAS FECHAS FUTURAS DISPONIBLES
  const isDateAvailable = (date) => {
    if (!professionalId) return false;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Solo fechas futuras
    return date >= today;
  };

  // Generar días del mes
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const firstDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    
    const days = [];
    
    // Días del mes anterior
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
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const isAvailable = isDateAvailable(checkDate);
      
      days.push({
        day,
        isCurrentMonth: true,
        isAvailable,
        date: checkDate,
        isToday: checkDate.toDateString() === today.toDateString(),
        isSelected: selectedDate && checkDate.toDateString() === new Date(selectedDate).toDateString()
      });
    }
    
    return days;
  };

  const handleDateSelect = (dayObj) => {
    if (!dayObj.isAvailable) return;
    
    const formattedDate = dayObj.date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long'
    });
    
    onDateSelect(formattedDate);
    onClose();
  };

  const navigateMonth = (direction) => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      newMonth.setMonth(prev.getMonth() + direction);
      return newMonth;
    });
  };

  const calendarDays = getDaysInMonth(currentMonth);

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
          <Text style={styles.title}>Seleccionar Fecha</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#666" />
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
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Información */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>✅ Calendario Funcionando</Text>
          <Text style={styles.infoText}>
            🎯 Todas las fechas futuras están disponibles
          </Text>
          <Text style={styles.infoText}>
            📅 Las fechas disponibles aparecen en VERDE
          </Text>
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
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
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
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  dayButtonOtherMonth: {
    opacity: 0.3,
  },
  dayButtonUnavailable: {
    backgroundColor: '#f5f5f5',
  },
  dayButtonAvailable: {
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#2e7d32',
  },
  dayButtonToday: {
    backgroundColor: '#007AFF',
  },
  dayButtonSelected: {
    backgroundColor: '#4CAF50',
  },
  dayText: {
    fontSize: 16,
    color: '#333',
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
});

export default SimpleCalendar;
