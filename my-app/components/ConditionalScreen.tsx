// @ts-nocheck — componente muy grande (beta); tipar por partes
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Modal,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { getBackendBaseUrl } from '../config/backend';
import { useAppointments } from '../contexts/AppointmentContext';
import { useAuth } from '../contexts/AuthContext';
import { useAvailability } from '../contexts/AvailabilityContext';
import { useNewAppointment } from '../contexts/NewAppointmentContext';
import UserService from '../services/asyncStorageUserDemo.js';
import { isProfessionalUser } from '../utils/userType';
import CustomCalendar from './CustomCalendar';
import FullCalendar from './FullCalendar';
import TimeSlotSelector from './TimeSlotSelector';

// Interfaz para usuarios
interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  userType: 'client' | 'professional';
  createdAt: string;
  updatedAt: string;
}

interface ConditionalScreenProps {
  screenName: string;
  forceOpenScheduleModal?: boolean;
  children: React.ReactNode;
}

// Función para generar los días del calendario
const getDaysInMonth = (date: Date) => {
  try {
    // Verificar que la fecha sea válida
    if (!date || isNaN(date.getTime())) {
      console.error('❌ Fecha inválida en getDaysInMonth:', date);
      return [];
    }

    const year = date.getFullYear();
    const month = date.getMonth();
    
    // Verificar que el mes sea válido (0-11)
    if (month < 0 || month > 11) {
      console.error('❌ Mes inválido:', month);
      return [];
    }
    
    // Primer día del mes
    const firstDay = new Date(year, month, 1);
    // Último día del mes
    const lastDay = new Date(year, month + 1, 0);
    
    // Verificar que las fechas sean válidas
    if (isNaN(firstDay.getTime()) || isNaN(lastDay.getTime())) {
      console.error('❌ Fechas generadas inválidas:', { firstDay, lastDay });
      return [];
    }
    
    // Día de la semana del primer día (0 = domingo, 1 = lunes, etc.)
    const firstDayOfWeek = firstDay.getDay();
    
    // Número total de días en el mes
    const daysInMonth = lastDay.getDate();
    
    // Día actual
    const today = new Date();
    const isToday = (day: number) => {
      try {
        return today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
      } catch (error) {
        console.error('❌ Error en isToday:', error);
        return false;
      }
    };
    
    // Verificar disponibilidad (simulación - en un sistema real esto vendría de la base de datos)
    const isAvailable = (day: number) => {
      try {
        const checkDate = new Date(year, month, day);
        
        // Verificar que la fecha sea válida
        if (isNaN(checkDate.getTime())) {
          console.error('❌ Fecha de verificación inválida:', { year, month, day });
          return false;
        }
        
        // No permitir fechas pasadas
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        if (checkDate < todayStart) {
          return false;
        }
        
        // Simular disponibilidad (lunes a viernes disponibles)
        const dayOfWeek = checkDate.getDay();
        return dayOfWeek >= 1 && dayOfWeek <= 5; // Lunes a viernes
      } catch (error) {
        console.error('❌ Error en isAvailable:', error);
        return false;
      }
    };
    
    const days = [];
    
    // Agregar días del mes anterior para completar la primera semana
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      try {
        const prevMonthLastDay = new Date(year, month, 0).getDate();
        days.push({
          day: prevMonthLastDay - i,
          isCurrentMonth: false,
          isToday: false,
          isSelected: false,
          isAvailable: false,
        });
      } catch (error) {
        console.error('❌ Error agregando días del mes anterior:', error);
      }
    }
    
    // Agregar días del mes actual
    for (let day = 1; day <= daysInMonth; day++) {
      try {
        days.push({
          day,
          isCurrentMonth: true,
          isToday: isToday(day),
          isSelected: false,
          isAvailable: isAvailable(day),
        });
      } catch (error) {
        console.error('❌ Error agregando día del mes actual:', { day, error });
      }
    }
    
    // Agregar días del mes siguiente para completar la última semana
    const remainingDays = 42 - days.length; // 6 semanas * 7 días = 42
    for (let day = 1; day <= remainingDays; day++) {
      try {
        days.push({
          day,
          isCurrentMonth: false,
          isToday: false,
          isSelected: false,
          isAvailable: false,
        });
      } catch (error) {
        console.error('❌ Error agregando días del mes siguiente:', error);
      }
    }
    
    console.log('✅ Días del calendario generados exitosamente:', days.length, 'días para', date.toDateString());
    return days;
    
  } catch (error) {
    console.error('❌ Error crítico en getDaysInMonth:', error);
    return [];
  }
};



// Pantalla de Dashboard Profesional
function ProfessionalDashboardScreen() {
  const { user, toggleUserType } = useAuth();
  const { openNewAppointmentModal } = useNewAppointment();
  const [refreshing, setRefreshing] = useState(false);
  
  // Estados para el modal de nueva cita
  const [showNewAppointmentModal, setShowNewAppointmentModal] = useState(false);
  const [newAppointment, setNewAppointment] = useState({
    service: '',
    date: '',
    time: '',
    patientName: '',
    patientPhone: '',
    patientEmail: '',
    notes: '',
  });
  const [isCreatingAppointment, setIsCreatingAppointment] = useState(false);
  
  // Estados para el selector de fecha
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    // Verificar que la fecha sea válida
    if (isNaN(now.getTime())) {
      console.error('❌ Fecha actual inválida, usando fecha por defecto');
      return new Date(2024, 0, 1); // 1 de enero de 2024
    }
    return now;
  });
  
  // Estados para el selector de pacientes
  const [showPatientSelector, setShowPatientSelector] = useState(false);
  const [patientSearchQuery, setPatientSearchQuery] = useState('');
  
  // Estados para agregar nuevo paciente
  const [showAddPatientForm, setShowAddPatientForm] = useState(false);
  const [newPatient, setNewPatient] = useState({
    name: '',
    phone: '',
    email: '',
  });
  const [isAddingPatient, setIsAddingPatient] = useState(false);

  // Estados para el catálogo de usuarios cliente
  const [clientUsers, setClientUsers] = useState<User[]>([]);
  const [showClientSelector, setShowClientSelector] = useState(false);
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState<User | null>(null);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [isClientSelectorFromAppointment, setIsClientSelectorFromAppointment] = useState(false);

  // Estados para el catálogo mejorado de pacientes
  const [patientFilter, setPatientFilter] = useState('all'); // all, frequent, recent, alphabetical
  const [patientSortBy, setPatientSortBy] = useState('name'); // name, lastVisit, frequency
  const [patientFavorites, setPatientFavorites] = useState<string[]>([]);
  const [patientSearchSuggestions, setPatientSearchSuggestions] = useState<string[]>([]);
  const [showPatientFilters, setShowPatientFilters] = useState(false);

  // Función para cargar usuarios cliente
  const loadClientUsers = async () => {
    try {
      // Verificar que UserService esté disponible
      if (!UserService) {
        console.error('❌ UserService no está disponible');
        setClientUsers([]);
        return;
      }
      
      console.log('🔄 Cargando usuarios cliente...');
      await UserService.initializeSampleUsers();
      const users = await UserService.getClientUsers();
      console.log('✅ Usuarios cliente cargados:', users.length);
      setClientUsers(users);
    } catch (error) {
      console.error('❌ Error cargando usuarios cliente:', error);
      setClientUsers([]);
    }
  };

  // Cargar usuarios cliente al montar el componente
  useEffect(() => {
    console.log('🔄 useEffect ejecutándose...');
    
    const loadUsers = async () => {
      try {
        setIsLoadingClients(true);
        console.log('🔄 Iniciando carga de usuarios...');
        
        // Cargar usuarios de ejemplo
        await UserService.initializeSampleUsers();
        console.log('✅ Usuarios de ejemplo inicializados');
        
        // Obtener usuarios cliente
        const users = await UserService.getClientUsers();
        console.log('✅ Usuarios cliente obtenidos:', users.length);
        
        setClientUsers(users);
        setIsLoadingClients(false);
        
      } catch (error) {
        console.error('❌ Error en loadUsers:', error);
        setClientUsers([]);
        setIsLoadingClients(false);
      }
    };
    
    loadUsers();
  }, []);

  // Función para navegar de manera segura por el calendario
  const navigateCalendar = (direction: 'prev' | 'next') => {
    try {
      console.log('🔄 Iniciando navegación:', direction);
      console.log('📅 Fecha actual:', selectedDate);
      
      const currentDate = new Date(selectedDate);
      
      if (isNaN(currentDate.getTime())) {
        console.error('❌ Fecha actual inválida para navegación');
        setSelectedDate(new Date(2024, 0, 1));
        return;
      }
      
      let newMonth: number;
      let newYear: number;
      
      if (direction === 'prev') {
        if (currentDate.getMonth() === 0) {
          newMonth = 11;
          newYear = currentDate.getFullYear() - 1;
        } else {
          newMonth = currentDate.getMonth() - 1;
          newYear = currentDate.getFullYear();
        }
      } else {
        if (currentDate.getMonth() === 11) {
          newMonth = 0;
          newYear = currentDate.getFullYear() + 1;
        } else {
          newMonth = currentDate.getMonth() + 1;
          newYear = currentDate.getFullYear();
        }
      }
      
      console.log('🔢 Valores calculados:', { newMonth, newYear, direction });
      
      // Manejo especial para octubre
      let newDate: Date;
      if (newMonth === 9) { // Octubre
        console.log('🍂 Detectado octubre, usando manejo especial');
        newDate = handleOctoberNavigation(newYear);
      } else {
        newDate = new Date(newYear, newMonth, 1);
      }
      
      if (isNaN(newDate.getTime())) {
        console.error('❌ Nueva fecha inválida generada:', { newYear, newMonth, newDate });
        return;
      }
      
      console.log('✅ Nueva fecha válida:', newDate);
      console.log('✅ Navegando a:', newDate.toDateString());
      
      setSelectedDate(newDate);
      
    } catch (error) {
      console.error('❌ Error en navegación del calendario:', error);
      console.error('❌ Stack trace:', error.stack);
    }
  };

  // Función para filtrar usuarios cliente
  const getFilteredClientUsers = () => {
    if (clientSearchQuery && clientSearchQuery.trim()) {
      return clientUsers.filter(client =>
        client.name && client.name.toLowerCase().includes((clientSearchQuery || '').toLowerCase()) ||
        client.email && client.email.toLowerCase().includes((clientSearchQuery || '').toLowerCase())
      );
    }
    return clientUsers;
  };

  // Función específica para manejar octubre de manera segura
  const handleOctoberNavigation = (year: number) => {
    try {
      console.log('🍂 Navegando específicamente a octubre del año:', year);
      
      // Crear fecha específica para octubre (mes 9)
      const octoberDate = new Date(year, 9, 1);
      
      if (isNaN(octoberDate.getTime())) {
        console.error('❌ Fecha de octubre inválida:', octoberDate);
        throw new Error('Fecha de octubre inválida');
      }
      
      console.log('✅ Fecha de octubre válida:', octoberDate);
      console.log('✅ Octubre generado:', octoberDate.toDateString());
      
      return octoberDate;
      
    } catch (error) {
      console.error('❌ Error manejando octubre:', error);
      // Fallback: usar septiembre del mismo año
      const fallbackDate = new Date(year, 8, 1);
      console.log('🔄 Usando fecha de fallback (septiembre):', fallbackDate.toDateString());
      return fallbackDate;
    }
  };

  // Función para seleccionar un cliente del catálogo
  const handleClientSelect = (client: User) => {
    setSelectedClient(client);
    setNewPatient(prev => ({
      ...prev,
      name: client.name,
      phone: client.phone || '',
      email: client.email || '',
    }));
    
    // También actualizar el formulario de nueva cita si está abierto
    if (showNewAppointmentModal) {
      setNewAppointment(prev => ({
        ...prev,
        patientName: client.name,
        patientPhone: client.phone || '',
        patientEmail: client.email || '',
      }));
    }
    
    setShowClientSelector(false);
    setClientSearchQuery('');
    
    // Si se abrió desde el formulario de nueva cita, cerrar el modal de nueva cita
    if (isClientSelectorFromAppointment) {
      setShowNewAppointmentModal(false);
      setIsClientSelectorFromAppointment(false);
    }
  };

  // Función para obtener y filtrar pacientes mejorada
  const getFilteredPatients = () => {
    let filteredPatients = [...clientUsers];
    
    // Aplicar filtros
    if (patientFilter === 'frequent') {
      filteredPatients = filteredPatients.filter(patient => 
        patientFavorites.includes(patient.id)
      );
    } else if (patientFilter === 'recent') {
      // Simular visitas recientes (en un sistema real esto vendría de la base de datos)
      filteredPatients = filteredPatients.slice(0, 10);
    }
    
    // Aplicar búsqueda
    if (clientSearchQuery && clientSearchQuery.trim()) {
      const query = (clientSearchQuery || '').toLowerCase();
      filteredPatients = filteredPatients.filter(patient =>
        patient.name && patient.name.toLowerCase().includes(query) ||
        patient.email && patient.email.toLowerCase().includes(query) ||
        (patient.phone && patient.phone.includes(query))
      );
    }
    
    // Aplicar ordenamiento
    filteredPatients.sort((a, b) => {
      switch (patientSortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'lastVisit':
          // Simular ordenamiento por última visita
          return 0; // En un sistema real se ordenaría por fecha
        case 'frequency':
          // Simular ordenamiento por frecuencia de visitas
          const aFrequent = patientFavorites.includes(a.id);
          const bFrequent = patientFavorites.includes(b.id);
          if (aFrequent && !bFrequent) return -1;
          if (!aFrequent && bFrequent) return 1;
          return 0;
        default:
          return 0;
      }
    });
    
    return filteredPatients;
  };

  // Función para manejar favoritos
  const togglePatientFavorite = (patientId: string) => {
    setPatientFavorites(prev => 
      prev.includes(patientId) 
        ? prev.filter(id => id !== patientId)
        : [...prev, patientId]
    );
  };

  // Función para generar sugerencias de búsqueda
  const generateSearchSuggestions = (query: string) => {
    if (query.length < 2) {
      setPatientSearchSuggestions([]);
      return;
    }
    
    const suggestions = clientUsers
      .filter(patient => 
        patient.name && patient.name.toLowerCase().includes((query || '').toLowerCase()) ||
        patient.email && patient.email.toLowerCase().includes((query || '').toLowerCase())
      )
      .slice(0, 5)
      .map(patient => patient.name);
    
    setPatientSearchSuggestions(suggestions);
  };

  // Función para manejar sugerencia de búsqueda
  const handleSearchSuggestion = (suggestion: string) => {
    setClientSearchQuery(suggestion);
    setPatientSearchSuggestions([]);
  };

  // Función para obtener estadísticas del paciente
  const getPatientStats = (patientId: string) => {
    // Simular estadísticas (en un sistema real vendrían de la base de datos)
    return {
      totalVisits: Math.floor(Math.random() * 20) + 1,
      lastVisit: '2024-01-15',
      averageRating: (Math.random() * 2 + 3).toFixed(1),
      preferredTime: ['09:00', '14:00', '16:00'][Math.floor(Math.random() * 3)],
    };
  };

  // Función para agregar nuevo paciente
  const handleAddNewPatient = async () => {
    // Validar campos obligatorios
    if (!selectedClient) {
      Alert.alert('Error', 'Debes seleccionar un paciente del catálogo');
      return;
    }
    
    if (!newPatient.name.trim()) {
      Alert.alert('Error', 'El nombre del paciente es obligatorio');
      return;
    }

    setIsAddingPatient(true);
    try {
      // Simular creación de paciente (en un sistema real esto iría a la base de datos)
      const newPatientData = {
        id: `patient_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: newPatient.name.trim(),
        phone: newPatient.phone.trim(),
        email: newPatient.email.trim(),
        lastVisit: new Date().toISOString().split('T')[0],
      };

      console.log('Nuevo paciente creado:', newPatientData);

      // Simular un pequeño delay
      await new Promise(resolve => setTimeout(resolve, 500));

      Alert.alert(
        '✅ Paciente Agregado Exitosamente',
        `El paciente ${newPatient.name} ha sido agregado a tu lista de pacientes.`,
        [
          {
            text: 'Seleccionar Paciente',
            onPress: () => {
              setNewAppointment(prev => ({
                ...prev,
                patientName: newPatient.name.trim(),
                patientPhone: newPatient.phone.trim(),
                patientEmail: newPatient.email.trim(),
              }));
              setShowAddPatientForm(false);
              setShowPatientSelector(false);
              resetNewPatientForm();
            },
          },
          {
            text: 'Agregar Otro',
            onPress: () => {
              resetNewPatientForm();
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error adding patient:', error);
      Alert.alert('❌ Error', 'No se pudo agregar el paciente. Inténtalo de nuevo.');
    } finally {
      setIsAddingPatient(false);
    }
  };

  const resetNewPatientForm = () => {
    setNewPatient({
      name: '',
      phone: '',
      email: '',
    });
    setSelectedClient(null);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const handleNewAppointment = () => {
    console.log('🔄 handleNewAppointment en ConditionalScreen ejecutándose...');
    console.log('👤 Usuario actual:', user);
    console.log('🔧 Servicio del usuario:', user?.service);
    console.log('📊 Estado actual showNewAppointmentModal:', showNewAppointmentModal);
    
    // Verificar que el profesional tenga un servicio configurado
    if (!user?.service) {
      console.log('❌ Usuario no tiene servicio configurado');
      Alert.alert(
        'Servicio No Configurado',
        'Para crear citas, primero debes configurar el servicio que ofreces en tu perfil.\n\nVe a "Editar Perfil" y selecciona tu servicio principal.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { 
            text: 'Editar Perfil', 
            onPress: () => {
              // Aquí deberías abrir el modal de edición de perfil del dashboard
              console.log('🔧 Abriendo modal de edición de perfil...');
            }
          }
        ]
      );
      return;
    }
    
    console.log('✅ Usuario tiene servicio configurado, usando contexto para abrir formulario...');
    
    // Usar el contexto para abrir el formulario de nueva cita en la tab de Configuración
    console.log('🎯 Llamando a openNewAppointmentModal() desde ConditionalScreen...');
    openNewAppointmentModal();
    console.log('🎯 Contexto activado, formulario se abrirá en Configuración');
  };

  const handleSubmitAppointment = async () => {
    // Validar campos obligatorios
    if (!newAppointment.service.trim() || !newAppointment.date.trim() || 
        !newAppointment.time.trim() || !newAppointment.patientName.trim()) {
      Alert.alert('Error', 'Por favor completa todos los campos obligatorios');
      return;
    }

    // Validar formato de fecha (DD/MM/AAAA)
    const dateRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
    const dateMatch = newAppointment.date.match(dateRegex);
    if (!dateMatch) {
      Alert.alert('Error', 'El formato de fecha debe ser DD/MM/AAAA (ej: 25/12/2024)');
      return;
    }

    // Validar que la fecha no sea anterior a hoy
    const [day, month, year] = dateMatch.slice(1).map(Number);
    const appointmentDate = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (appointmentDate < today) {
      Alert.alert('Error', 'No puedes crear citas para fechas pasadas');
      return;
    }

    // Validar formato de hora (HH:MM)
    const timeRegex = /^(\d{1,2}):(\d{2})$/;
    const timeMatch = newAppointment.time.match(timeRegex);
    if (!timeMatch) {
      Alert.alert('Error', 'El formato de hora debe ser HH:MM (ej: 14:30)');
      return;
    }

    // Validar que la hora esté en un rango válido (0-23 horas, 0-59 minutos)
    const [hours, minutes] = timeMatch.slice(1).map(Number);
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      Alert.alert('Error', 'La hora debe estar entre 00:00 y 23:59');
      return;
    }

    setIsCreatingAppointment(true);
    try {
      // Generar un ID único para el cliente (en un sistema real, esto vendría de una base de datos)
      const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Aquí se crearía la cita en el sistema
      console.log('Cita creada:', {
        service: newAppointment.service.trim(),
        professional: user?.fullName || 'Profesional',
        professionalId: user?.id || '',
        date: newAppointment.date.trim(),
        time: newAppointment.time.trim(),
        notes: newAppointment.notes.trim(),
        clientId: clientId,
        clientName: newAppointment.patientName.trim(),
      });
      
      // Simular un pequeño delay para mostrar el estado de carga
      await new Promise(resolve => setTimeout(resolve, 500));
      
      Alert.alert(
        '✅ Cita Creada Exitosamente',
        `Cita creada para ${newAppointment.patientName} el ${newAppointment.date} a las ${newAppointment.time}.\n\nLa cita ha sido agregada a tu calendario y está marcada como confirmada.`,
        [
          {
            text: 'Ver en Calendario',
            onPress: () => {
              setShowNewAppointmentModal(false);
              resetAppointmentForm();
            },
          },
          {
            text: 'Crear Otra Cita',
            onPress: () => {
              resetAppointmentForm();
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error creating appointment:', error);
      Alert.alert('❌ Error', 'No se pudo crear la cita. Inténtalo de nuevo.');
    } finally {
      setIsCreatingAppointment(false);
    }
  };

  const resetAppointmentForm = () => {
    // Generar fecha de hoy en formato DD/MM/AAAA
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    const todayFormatted = `${day}/${month}/${year}`;
    
    // Generar hora actual + 1 hora en formato HH:MM
    const nextHour = new Date(today.getTime() + 60 * 60 * 1000);
    const hours = String(nextHour.getHours()).padStart(2, '0');
    const minutes = String(nextHour.getMinutes()).padStart(2, '0');
    const nextHourFormatted = `${hours}:${minutes}`;
    
    setNewAppointment({
      service: user?.service || '', // Mantener el servicio del profesional
      date: todayFormatted,
      time: nextHourFormatted,
      patientName: '',
      patientPhone: '',
      patientEmail: '',
      notes: '',
    });
    
    // Resetear el estado del selector de clientes
    setIsClientSelectorFromAppointment(false);
  };

  const handleCancelNewAppointment = () => {
    Alert.alert(
      'Cancelar Creación de Cita',
      '¿Estás seguro de que quieres cancelar? Se perderán los datos ingresados.',
      [
        { text: 'Continuar Editando', style: 'cancel' },
        {
          text: 'Sí, Cancelar',
          style: 'destructive',
          onPress: () => {
            setShowNewAppointmentModal(false);
            resetAppointmentForm();
            setIsClientSelectorFromAppointment(false);
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.welcomeText}>
            ¡Hola, Dr. {user?.fullName}!
          </Text>
          <Text style={styles.dateText}>
            {new Date().toLocaleDateString('es-ES', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </Text>
        </View>
        <TouchableOpacity style={styles.toggleButton} onPress={toggleUserType}>
          <Ionicons name="swap-horizontal" size={24} color="#667eea" />
        </TouchableOpacity>
      </View>

      <View style={styles.statsContainer}>
        <Text style={styles.sectionTitle}>Resumen del Día</Text>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Ionicons name="people" size={24} color="#4CAF50" />
            <Text style={styles.statNumber}>8</Text>
            <Text style={styles.statLabel}>Pacientes Hoy</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="time" size={24} color="#2196F3" />
            <Text style={styles.statNumber}>5</Text>
            <Text style={styles.statLabel}>Citas Pendientes</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
            <Text style={styles.statNumber}>3</Text>
            <Text style={styles.statLabel}>Completadas</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="trending-up" size={24} color="#FF9800" />
            <Text style={styles.statNumber}>156</Text>
            <Text style={styles.statLabel}>Sesiones Mes</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Próximas Citas</Text>
        <View style={styles.appointmentCard}>
          <View style={styles.appointmentHeader}>
            <View style={styles.appointmentTime}>
              <Ionicons name="time" size={20} color="#667eea" />
              <Text style={styles.timeText}>09:00</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: '#4CAF50' }]}>
              <Text style={styles.statusText}>Confirmado</Text>
            </View>
          </View>
          <View style={styles.appointmentInfo}>
            <Text style={styles.patientName}>María González</Text>
            <Text style={styles.serviceName}>Consulta Psicológica</Text>
          </View>
        </View>
        
        <View style={styles.appointmentCard}>
          <View style={styles.appointmentHeader}>
            <View style={styles.appointmentTime}>
              <Ionicons name="time" size={20} color="#667eea" />
              <Text style={styles.timeText}>10:00</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: '#4CAF50' }]}>
              <Text style={styles.statusText}>Confirmado</Text>
            </View>
          </View>
          <View style={styles.appointmentInfo}>
            <Text style={styles.patientName}>Carlos Ruiz</Text>
            <Text style={styles.serviceName}>Consulta Psicológica</Text>
          </View>
        </View>
        
        <View style={styles.appointmentCard}>
          <View style={styles.appointmentHeader}>
            <View style={styles.appointmentTime}>
              <Ionicons name="time" size={20} color="#667eea" />
              <Text style={styles.timeText}>14:00</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: '#FF9800' }]}>
              <Text style={styles.statusText}>Pendiente</Text>
            </View>
          </View>
          <View style={styles.appointmentInfo}>
            <Text style={styles.patientName}>Ana Martínez</Text>
            <Text style={styles.serviceName}>Consulta Psicológica</Text>
          </View>
        </View>
      </View>

      <View style={styles.actionsSection}>
        <TouchableOpacity style={styles.actionButton} onPress={handleNewAppointment}>
          <Ionicons name="add-circle" size={20} color="white" />
          <Text style={styles.actionButtonText}>Nueva Cita</Text>
        </TouchableOpacity>
      </View>

      {/* Modal de Nueva Cita */}
      <Modal
        visible={showNewAppointmentModal}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCancelNewAppointment}
      >
        <View style={styles.newAppointmentModalOverlay}>
          <View style={styles.newAppointmentModalContent}>
            {/* Header del Modal */}
            <View style={styles.newAppointmentModalHeader}>
              <View style={styles.newAppointmentModalTitleContainer}>
                <Ionicons name="add-circle" size={24} color="#667eea" />
                <Text style={styles.newAppointmentModalTitle}>Crear Nueva Cita</Text>
              </View>
              <TouchableOpacity
                style={styles.newAppointmentCloseButton}
                onPress={handleCancelNewAppointment}
              >
                <Ionicons name="close-circle" size={28} color="#999" />
              </TouchableOpacity>
            </View>

            {/* Contenido del Modal */}
            <ScrollView style={styles.newAppointmentModalBody} showsVerticalScrollIndicator={false}>
              {/* Información del Servicio */}
              <View style={styles.serviceInfoCard}>
                <Ionicons name="medical" size={20} color="#4CAF50" />
                <Text style={styles.serviceInfoText}>
                  Servicio: <Text style={styles.serviceInfoHighlight}>{newAppointment.service || 'No especificado'}</Text>
                </Text>
              </View>

              {/* Campos del Formulario */}
              <View style={styles.formSection}>
                <Text style={styles.formSectionTitle}>Información de la Cita</Text>
                
                {/* Fecha y Hora */}
                <View style={styles.dateTimeRow}>
                  <View style={styles.dateTimeField}>
                    <Text style={styles.inputLabel}>Fecha *</Text>
                    <TouchableOpacity
                      style={styles.dateSelectorButton}
                      onPress={() => setShowDatePicker(true)}
                    >
                      <Ionicons name="calendar" size={20} color="#667eea" />
                      <Text style={styles.dateSelectorText}>
                        {newAppointment.date || 'Seleccionar fecha'}
                      </Text>
                      <Ionicons name="chevron-down" size={16} color="#667eea" />
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.dateTimeField}>
                    <Text style={styles.inputLabel}>Hora *</Text>
                    <View style={styles.inputContainer}>
                      <Ionicons name="time" size={20} color="#667eea" />
                      <TextInput
                        style={styles.newAppointmentTextInput}
                        value={newAppointment.time}
                        onChangeText={(text) => setNewAppointment(prev => ({ ...prev, time: text }))}
                        placeholder="HH:MM"
                        placeholderTextColor="#999"
                      />
                    </View>
                  </View>
                </View>

                {/* Nombre del Paciente */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Nombre del Paciente *</Text>
                  <TouchableOpacity
                    style={styles.patientSelectorButton}
                    onPress={() => {
                      setIsClientSelectorFromAppointment(true);
                      setShowClientSelector(true);
                    }}
                  >
                    <Ionicons 
                      name="person" 
                      size={20} 
                      color={newAppointment.patientName ? "#4CAF50" : "#667eea"} 
                    />
                    <Text style={styles.patientSelectorText}>
                      {newAppointment.patientName || 'Seleccionar paciente del catálogo'}
                    </Text>
                    <Ionicons 
                      name={newAppointment.patientName ? "checkmark-circle" : "chevron-down"} 
                      size={16} 
                      color={newAppointment.patientName ? "#4CAF50" : "#667eea"} 
                    />
                  </TouchableOpacity>
                </View>

                {/* Teléfono y Email */}
                <View style={styles.contactRow}>
                  <View style={styles.contactField}>
                    <Text style={styles.inputLabel}>Teléfono</Text>
                    <View style={styles.inputContainer}>
                      <Ionicons name="call" size={20} color="#667eea" />
                      <TextInput
                        style={styles.newAppointmentTextInput}
                        value={newAppointment.patientPhone}
                        onChangeText={(text) => setNewAppointment(prev => ({ ...prev, patientPhone: text }))}
                        placeholder="+1234567890"
                        placeholderTextColor="#999"
                        keyboardType="phone-pad"
                      />
                    </View>
                  </View>
                  
                  <View style={styles.contactField}>
                    <Text style={styles.inputLabel}>Email</Text>
                    <View style={styles.inputContainer}>
                      <Ionicons name="mail" size={20} color="#667eea" />
                      <TextInput
                        style={styles.newAppointmentTextInput}
                        value={newAppointment.patientEmail}
                        onChangeText={(text) => setNewAppointment(prev => ({ ...prev, patientEmail: text }))}
                        placeholder="paciente@email.com"
                        placeholderTextColor="#999"
                        keyboardType="email-address"
                        autoCapitalize="none"
                      />
                    </View>
                  </View>
                </View>

                {/* Notas */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Notas Adicionales</Text>
                  <View style={styles.notesContainer}>
                    <Ionicons name="document-text" size={20} color="#667eea" style={styles.notesIcon} />
                    <TextInput
                      style={styles.notesTextInput}
                      value={newAppointment.notes}
                      onChangeText={(text) => setNewAppointment(prev => ({ ...prev, notes: text }))}
                      placeholder="Información adicional sobre la cita..."
                      placeholderTextColor="#999"
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                    />
                  </View>
                </View>
              </View>
            </ScrollView>

            {/* Botones de Acción */}
            <View style={styles.newAppointmentModalActions}>
              <TouchableOpacity
                style={[styles.newAppointmentButton, styles.cancelButton]}
                onPress={handleCancelNewAppointment}
                disabled={isCreatingAppointment}
              >
                <Ionicons name="close" size={16} color="#666" />
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              

              
              <TouchableOpacity
                style={[
                  styles.newAppointmentButton, 
                  styles.createButton,
                  !newAppointment.patientName.trim() && styles.disabledButton
                ]}
                onPress={handleSubmitAppointment}
                disabled={isCreatingAppointment || !newAppointment.patientName.trim()}
              >
                {isCreatingAppointment ? (
                  <>
                    <Ionicons name="hourglass" size={16} color="white" />
                    <Text style={styles.createButtonText}>Creando...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={16} color="white" />
                    <Text style={styles.createButtonText}>Crear Cita</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal del Selector de Fecha */}
      <Modal
        visible={showDatePicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={styles.datePickerModalOverlay}>
          <View style={styles.datePickerModalContent}>
            <View style={styles.datePickerModalHeader}>
              <Text style={styles.datePickerModalTitle}>Seleccionar Fecha</Text>
              <TouchableOpacity
                style={styles.datePickerCloseButton}
                onPress={() => setShowDatePicker(false)}
              >
                <Ionicons name="close-circle" size={28} color="#999" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.datePickerModalBody}>
              <Text style={styles.datePickerSubtitle}>
                Selecciona una fecha disponible para la cita
              </Text>
              
              {/* Calendario Simple */}
              <View style={styles.calendarContainer}>
                <View style={styles.calendarHeader}>
                  <TouchableOpacity
                    style={styles.calendarNavButton}
                    onPress={() => {
                      const prevMonth = new Date(selectedDate);
                      prevMonth.setMonth(prevMonth.getMonth() - 1);
                      setSelectedDate(prevMonth);
                    }}
                  >
                    <Ionicons name="chevron-back" size={20} color="#667eea" />
                  </TouchableOpacity>
                  
                  <Text style={styles.calendarMonthYear}>
                    {selectedDate.toLocaleDateString('es-ES', { 
                      month: 'long', 
                      year: 'numeric' 
                    })}
                  </Text>
                  
                  <TouchableOpacity
                    style={styles.calendarNavButton}
                    onPress={() => {
                      const nextMonth = new Date(selectedDate);
                      nextMonth.setMonth(nextMonth.getMonth() + 1);
                      setSelectedDate(nextMonth);
                    }}
                  >
                    <Ionicons name="chevron-forward" size={20} color="#667eea" />
                  </TouchableOpacity>
                </View>
                
                {/* Días de la semana */}
                <View style={styles.weekDaysRow}>
                  {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((day, index) => (
                    <Text key={`weekday-${day}-${index}`} style={styles.weekDayText}>{day}</Text>
                  ))}
                </View>
                
                {/* Días del mes */}
                <View style={styles.daysGrid}>
                  {getDaysInMonth(selectedDate).map((day, index) => (
                    <TouchableOpacity
                      key={`day-${day.day}-${index}`}
                      style={[
                        styles.dayButton,
                        day.isCurrentMonth && styles.dayButtonCurrentMonth,
                        day.isToday && styles.dayButtonToday,
                        day.isSelected && styles.dayButtonSelected,
                        day.isAvailable && styles.dayButtonAvailable,
                      ]}
                      onPress={() => {
                        if (day.isCurrentMonth && day.isAvailable) {
                          const selectedDateObj = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day.day);
                          const formattedDate = selectedDateObj.toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          });
                          setNewAppointment(prev => ({ ...prev, date: formattedDate }));
                          setShowDatePicker(false);
                        }
                      }}
                      disabled={!day.isCurrentMonth || !day.isAvailable}
                    >
                      <Text style={[
                        styles.dayButtonText,
                        day.isCurrentMonth && styles.dayButtonTextCurrentMonth,
                        day.isToday && styles.dayButtonTextToday,
                        day.isSelected && styles.dayButtonTextSelected,
                        !day.isAvailable && styles.dayButtonTextUnavailable,
                      ]}>
                        {day.day}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
            
            <View style={styles.datePickerModalActions}>
              <TouchableOpacity
                style={styles.datePickerCancelButton}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={styles.datePickerCancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal del Selector de Pacientes */}
      <Modal
        visible={showPatientSelector}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPatientSelector(false)}
      >
        <View style={styles.patientSelectorModalOverlay}>
          <View style={styles.patientSelectorModalContent}>
            <View style={styles.patientSelectorModalHeader}>
              <Text style={styles.patientSelectorModalTitle}>Seleccionar Paciente</Text>
              <TouchableOpacity
                style={styles.patientSelectorCloseButton}
                onPress={() => setShowPatientSelector(false)}
              >
                <Ionicons name="close-circle" size={28} color="#999" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.patientSelectorModalBody}>
              {/* Header con información y búsqueda */}
              <View style={styles.modalTopSection}>
                <View style={styles.patientsInfoContainer}>
                  <View style={styles.patientsInfoHeader}>
                    <View style={styles.patientsInfoTitleRow}>
                      <Ionicons name="people-circle" size={24} color="#667eea" />
                      <Text style={styles.patientsInfoTitle}>
                        Pacientes Disponibles
                      </Text>
                    </View>
                    <View style={styles.patientsInfoCount}>
                      <Ionicons name="people" size={18} color="#667eea" />
                      <Text style={styles.patientsInfoCountText}>
                        {getFilteredPatients().length}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.patientsInfoSubtitle}>
                    Selecciona un paciente de la lista o agrega uno nuevo
                  </Text>
                </View>

                {/* Barra de búsqueda mejorada */}
                <View style={styles.patientSelectorSearchContainer}>
                  <View style={styles.searchIconContainer}>
                    <Ionicons name="search" size={20} color="#667eea" />
                  </View>
                  <TextInput
                    style={styles.patientSelectorSearchInput}
                    placeholder="Buscar paciente por nombre..."
                    placeholderTextColor="#999"
                    value={patientSearchQuery}
                    onChangeText={setPatientSearchQuery}
                  />
                  {patientSearchQuery.length > 0 && (
                    <TouchableOpacity
                      style={styles.clearSearchButton}
                      onPress={() => setPatientSearchQuery('')}
                    >
                      <Ionicons name="close-circle" size={20} color="#999" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Botón para agregar nuevo paciente */}
              <TouchableOpacity
                style={styles.addNewPatientButton}
                onPress={() => setShowAddPatientForm(true)}
                activeOpacity={0.8}
              >
                <View style={styles.addNewPatientButtonContent}>
                  <View style={styles.addNewPatientIconContainer}>
                    <Ionicons name="add-circle" size={28} color="white" />
                  </View>
                  <View style={styles.addNewPatientTextContainer}>
                    <Text style={styles.addNewPatientButtonText}>
                      Agregar Nuevo Paciente
                    </Text>
                    <Text style={styles.addNewPatientButtonSubtext}>
                      Crear un nuevo paciente en el sistema
                    </Text>
                  </View>
                  <View style={styles.addNewPatientArrowContainer}>
                    <Ionicons name="chevron-forward" size={20} color="white" />
                  </View>
                </View>
              </TouchableOpacity>

              {/* Lista de pacientes */}
              <View style={styles.patientSelectorPatientsListContainer}>
                <ScrollView 
                  style={styles.patientSelectorPatientsList} 
                  showsVerticalScrollIndicator={true}
                  showsHorizontalScrollIndicator={false}
                  scrollIndicatorInsets={{ right: 1 }}
                  contentContainerStyle={styles.patientSelectorPatientsListContent}
                  bounces={true}
                  alwaysBounceVertical={false}
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled={true}
                >
                  {getFilteredPatients().map((patient, index) => (
                    <View key={patient.id}>
                      <TouchableOpacity
                        style={styles.patientItem}
                        activeOpacity={0.7}
                        onPress={() => {
                          setNewAppointment(prev => ({
                            ...prev,
                            patientName: patient.name,
                            patientPhone: patient.phone || '',
                            patientEmail: patient.email || '',
                          }));
                          setShowPatientSelector(false);
                        }}
                      >
                        <View style={styles.patientItemAvatar}>
                          <Ionicons name="person" size={32} color="white" />
                        </View>
                        <View style={styles.patientItemInfo}>
                          <View style={styles.patientItemHeader}>
                            <Text style={styles.patientItemName}>{patient.name}</Text>
                            <View style={styles.patientItemBadge}>
                              <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                              <Text style={styles.patientItemBadgeText}>Activo</Text>
                            </View>
                          </View>
                          <View style={styles.patientItemDetails}>
                            {patient.phone && (
                              <View style={styles.patientItemDetail}>
                                <Ionicons name="call" size={16} color="#667eea" />
                                <Text style={styles.patientItemPhone}>{patient.phone}</Text>
                              </View>
                            )}
                            {patient.email && (
                              <View style={styles.patientItemDetail}>
                                <Ionicons name="mail" size={16} color="#667eea" />
                                <Text style={styles.patientItemEmail}>{patient.email}</Text>
                              </View>
                            )}
                          </View>
                        </View>
                        <View style={styles.patientItemArrow}>
                          <Ionicons name="chevron-forward" size={24} color="#667eea" />
                        </View>
                        <View style={styles.patientItemSelectIndicator}>
                          <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                        </View>
                      </TouchableOpacity>
                      {index < getFilteredPatients().length - 1 && (
                        <View style={styles.patientItemSeparator} />
                      )}
                    </View>
                  ))}
                  
                  {getFilteredPatients().length === 0 && (
                    <View style={styles.noPatientsContainer}>
                      <View style={styles.noPatientsIconContainer}>
                        <Ionicons 
                          name={patientSearchQuery ? "search-outline" : "people-outline"} 
                          size={80} 
                          color={patientSearchQuery ? "#ff9800" : "#ddd"} 
                        />
                      </View>
                      <Text style={styles.noPatientsTitle}>
                        {patientSearchQuery ? 'No se encontraron pacientes' : 'No hay pacientes registrados'}
                      </Text>
                      <Text style={styles.noPatientsSubtitle}>
                        {patientSearchQuery 
                          ? 'Intenta con otro nombre o agrega un nuevo paciente' 
                          : 'Comienza agregando tu primer paciente'
                        }
                      </Text>
                      {!patientSearchQuery && (
                        <TouchableOpacity
                          style={styles.noPatientsAddButton}
                          onPress={() => setShowAddPatientForm(true)}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="add-circle" size={20} color="white" />
                          <Text style={styles.noPatientsAddButtonText}>Agregar Primer Paciente</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </ScrollView>
                {getFilteredPatients().length > 5 && (
                  <TouchableOpacity
                    style={styles.scrollToTopButton}
                    onPress={() => {
                      // Scroll to top functionality
                    }}
                  >
                    <Ionicons name="arrow-up" size={20} color="white" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
            
            <View style={styles.patientSelectorModalActions}>
              <TouchableOpacity
                style={styles.patientSelectorCancelButton}
                onPress={() => setShowPatientSelector(false)}
              >
                <Text style={styles.patientSelectorCancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal para Agregar Nuevo Paciente */}
      <Modal
        visible={showAddPatientForm}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddPatientForm(false)}
      >
        <View style={styles.addPatientModalOverlay}>
          <View style={styles.addPatientModalContent}>
            <View style={styles.addPatientModalHeader}>
              <Text style={styles.addPatientModalTitle}>Agregar Nuevo Paciente</Text>
              <TouchableOpacity
                style={styles.addPatientCloseButton}
                onPress={() => setShowAddPatientForm(false)}
              >
                <Ionicons name="close-circle" size={28} color="#999" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.addPatientModalBody}>
              <Text style={styles.addPatientSubtitle}>
                Completa la información del nuevo paciente
              </Text>
              
              {/* Botón de recarga para debug */}
              <TouchableOpacity
                style={[styles.clientSelectorButton, { marginBottom: 20, backgroundColor: '#28a745' }]}
                onPress={async () => {
                  console.log('🔄 Botón de recarga presionado');
                  try {
                    setIsLoadingClients(true);
                    await UserService.initializeSampleUsers();
                    const users = await UserService.getClientUsers();
                    console.log('✅ Recarga exitosa:', users.length, 'usuarios');
                    setClientUsers(users);
                    setIsLoadingClients(false);
                  } catch (error) {
                    console.error('❌ Error en recarga:', error);
                    setIsLoadingClients(false);
                  }
                }}
              >
                <Text style={{ color: 'white', textAlign: 'center' }}>🔄 Recargar Usuarios</Text>
              </TouchableOpacity>


              

              
              {/* Campo de Nombre - Catálogo de Usuarios Cliente */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nombre Completo del Paciente *</Text>
                
                {/* Selector de catálogo desplegable */}
                <View style={styles.catalogSelectorContainer}>
                  <TouchableOpacity
                    style={styles.catalogSelectorButton}
                    onPress={() => {
                      console.log('🔘 Abriendo catálogo desplegable...');
                      setShowClientSelector(true);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.catalogSelectorContent}>
                      <Ionicons name="person" size={20} color="#667eea" />
                      <View style={styles.catalogSelectorTextContainer}>
                        {selectedClient ? (
                          <Text style={styles.catalogSelectorSelectedText}>
                            {selectedClient.name}
                          </Text>
                        ) : (
                          <Text style={styles.catalogSelectorPlaceholder}>
                            Seleccionar paciente del catálogo
                          </Text>
                        )}
                      </View>
                      <View style={styles.catalogSelectorInfo}>
                        <Text style={styles.catalogSelectorCount}>
                          {isLoadingClients 
                            ? 'Cargando...' 
                            : `${clientUsers.length} usuarios disponibles`
                          }
                        </Text>
                        <Ionicons 
                          name={isLoadingClients ? "hourglass" : "chevron-down"} 
                          size={20} 
                          color="#667eea" 
                        />
                      </View>
                    </View>
                  </TouchableOpacity>
                  
                  {/* Botón para agregar nuevo usuario si no existe */}
                  <TouchableOpacity
                    style={styles.addNewUserButton}
                    onPress={() => {
                      Alert.alert(
                        'Agregar Nuevo Usuario',
                        '¿Deseas crear un nuevo usuario cliente en el sistema?',
                        [
                          { text: 'Cancelar', style: 'cancel' },
                          { 
                            text: 'Crear Usuario', 
                            onPress: () => {
                              // Aquí se implementaría la creación de nuevo usuario
                              Alert.alert('Info', 'Funcionalidad de crear usuario en desarrollo');
                            }
                          }
                        ]
                      );
                    }}
                  >
                    <Ionicons name="add-circle" size={20} color="#4CAF50" />
                    <Text style={styles.addNewUserButtonText}>Nuevo Usuario</Text>
                  </TouchableOpacity>
                </View>
                
                {/* Información del paciente seleccionado */}
                {selectedClient && (
                  <View style={styles.selectedPatientInfo}>
                    <View style={styles.patientInfoRow}>
                      <Ionicons name="call" size={16} color="#4CAF50" />
                      <Text style={styles.patientInfoText}>{selectedClient.phone || 'Sin teléfono'}</Text>
                    </View>
                    <View style={styles.patientInfoRow}>
                      <Ionicons name="mail" size={16} color="#2196F3" />
                      <Text style={styles.patientInfoText}>{selectedClient.email || 'Sin email'}</Text>
                    </View>
                    <View style={styles.patientInfoRow}>
                      <Ionicons name="person-circle" size={16} color="#FF9800" />
                      <Text style={styles.patientInfoText}>Usuario del Sistema</Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Campo de Teléfono */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Teléfono</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="call" size={20} color="#667eea" />
                  <TextInput
                    style={styles.newPatientTextInput}
                    value={newPatient.phone}
                    onChangeText={(text) => setNewPatient(prev => ({ ...prev, phone: text }))}
                    placeholder="+1234567890"
                    placeholderTextColor="#999"
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              {/* Campo de Email */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="mail" size={20} color="#667eea" />
                  <TextInput
                    style={styles.newPatientTextInput}
                    value={newPatient.email}
                    onChangeText={(text) => setNewPatient(prev => ({ ...prev, email: text }))}
                    placeholder="paciente@email.com"
                    placeholderTextColor="#999"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>
            </View>
            
            <View style={styles.addPatientModalActions}>
              <TouchableOpacity
                style={styles.addPatientCancelButton}
                onPress={() => {
                  setShowAddPatientForm(false);
                  resetNewPatientForm();
                }}
                disabled={isAddingPatient}
              >
                <Text style={styles.addPatientCancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.addPatientSaveButton}
                onPress={handleAddNewPatient}
                disabled={isAddingPatient}
              >
                {isAddingPatient ? (
                  <>
                    <Ionicons name="hourglass" size={18} color="white" />
                    <Text style={styles.addPatientSaveButtonText}>Agregando...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={18} color="white" />
                    <Text style={styles.addPatientSaveButtonText}>Agregar Paciente</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal para Seleccionar Cliente del Catálogo */}
      <Modal
        visible={showClientSelector}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowClientSelector(false)}
        onShow={() => console.log('🎭 Modal del catálogo abierto')}
      >
        <View style={styles.clientSelectorModalOverlay}>
          <View style={styles.clientSelectorModalContent}>
            <View style={[styles.clientSelectorModalHeader, { backgroundColor: '#667eea' }]}>
              <Text style={[styles.clientSelectorModalTitle, { color: '#ffffff', fontSize: 24 }]}>
                📋 Catálogo de Usuarios Cliente del Sistema
              </Text>
              <TouchableOpacity
                style={styles.clientSelectorCloseButton}
                onPress={() => {
                  setShowClientSelector(false);
                  setIsClientSelectorFromAppointment(false);
                }}
              >
                <Ionicons name="arrow-back" size={28} color="#999" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.clientSelectorModalBody}>
              <Text style={styles.clientSelectorSubtitle}>
                Selecciona un usuario cliente existente del sistema para agregarlo como paciente
              </Text>
              
              {/* Campo de búsqueda mejorado */}
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#667eea" />
                <TextInput
                  style={styles.searchInput}
                  value={clientSearchQuery}
                  onChangeText={(text) => {
                    setClientSearchQuery(text);
                    generateSearchSuggestions(text);
                  }}
                  placeholder="Buscar en usuarios cliente del sistema..."
                  placeholderTextColor="#999"
                />
                {clientSearchQuery.length > 0 && (
                  <TouchableOpacity 
                    style={styles.clearSearchButton}
                    onPress={() => {
                      setClientSearchQuery('');
                      setPatientSearchSuggestions([]);
                    }}
                  >
                    <Ionicons name="close-circle" size={20} color="#999" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Sugerencias de búsqueda */}
              {patientSearchSuggestions.length > 0 && (
                <View style={styles.searchSuggestionsContainer}>
                  {patientSearchSuggestions.map((suggestion, index) => (
                    <TouchableOpacity
                      key={`suggestion-${suggestion}-${index}`}
                      style={styles.searchSuggestionItem}
                      onPress={() => handleSearchSuggestion(suggestion)}
                    >
                      <Ionicons name="search" size={16} color="#667eea" />
                      <Text style={styles.searchSuggestionText}>{suggestion}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Filtros y ordenamiento */}
              <View style={styles.patientFiltersContainer}>
                <View style={styles.filterButtonsRow}>
                  <TouchableOpacity
                    style={[
                      styles.filterButton,
                      patientFilter === 'all' && styles.filterButtonActive
                    ]}
                    onPress={() => setPatientFilter('all')}
                  >
                    <Text style={[
                      styles.filterButtonText,
                      patientFilter === 'all' && styles.filterButtonTextActive
                    ]}>Todos</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.filterButton,
                      patientFilter === 'frequent' && styles.filterButtonActive
                    ]}
                    onPress={() => setPatientFilter('frequent')}
                  >
                    <Ionicons name="star" size={16} color={patientFilter === 'frequent' ? 'white' : '#667eea'} />
                    <Text style={[
                      styles.filterButtonText,
                      patientFilter === 'frequent' && styles.filterButtonTextActive
                    ]}>Frecuentes</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.filterButton,
                      patientFilter === 'recent' && styles.filterButtonActive
                    ]}
                    onPress={() => setPatientFilter('recent')}
                  >
                    <Ionicons name="time" size={16} color={patientFilter === 'recent' ? 'white' : '#667eea'} />
                    <Text style={[
                      styles.filterButtonText,
                      patientFilter === 'recent' && styles.filterButtonTextActive
                    ]}>Recientes</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.sortButton}
                  onPress={() => setShowPatientFilters(!showPatientFilters)}
                >
                  <Ionicons name="funnel" size={16} color="#667eea" />
                  <Text style={styles.sortButtonText}>Ordenar</Text>
                </TouchableOpacity>
              </View>

              {/* Opciones de ordenamiento */}
              {showPatientFilters && (
                <View style={styles.sortOptionsContainer}>
                  <Text style={styles.sortOptionsTitle}>Ordenar por:</Text>
                  <View style={styles.sortOptionsRow}>
                    <TouchableOpacity
                      style={[
                        styles.sortOptionButton,
                        patientSortBy === 'name' && styles.sortOptionButtonActive
                      ]}
                      onPress={() => setPatientSortBy('name')}
                    >
                      <Text style={[
                        styles.sortOptionText,
                        patientSortBy === 'name' && styles.sortOptionTextActive
                      ]}>Nombre</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[
                        styles.sortOptionButton,
                        patientSortBy === 'lastVisit' && styles.sortOptionButtonActive
                      ]}
                      onPress={() => setPatientSortBy('lastVisit')}
                    >
                      <Text style={[
                        styles.sortOptionText,
                        patientSortBy === 'lastVisit' && styles.sortOptionTextActive
                      ]}>Última visita</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[
                        styles.sortOptionButton,
                        patientSortBy === 'frequency' && styles.sortOptionButtonActive
                      ]}
                      onPress={() => setPatientSortBy('frequency')}
                    >
                      <Text style={[
                        styles.sortOptionText,
                        patientSortBy === 'frequency' && styles.sortOptionButtonActive
                      ]}>Frecuencia</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Contador de resultados */}
              <View style={styles.resultsCounter}>
                <Text style={styles.resultsCounterText}>
                  {getFilteredPatients().length} paciente{getFilteredPatients().length !== 1 ? 's' : ''} encontrado{getFilteredPatients().length !== 1 ? 's' : ''}
                </Text>
              </View>
              
              {/* Lista de usuarios cliente mejorada */}
              <ScrollView style={styles.clientListContainer}>
                {getFilteredPatients().length > 0 ? (
                  getFilteredPatients().map((client) => {
                    const patientStats = getPatientStats(client.id);
                    const isFavorite = patientFavorites.includes(client.id);
                    
                    return (
                      <TouchableOpacity
                        key={client.id}
                        style={styles.clientItem}
                        onPress={() => handleClientSelect(client)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.clientItemContent}>
                          <View style={styles.clientItemAvatar}>
                            <Ionicons name="person" size={24} color="#667eea" />
                            {isFavorite && (
                              <View style={styles.favoriteBadge}>
                                <Ionicons name="star" size={12} color="#FFD700" />
                              </View>
                            )}
                          </View>
                          
                          <View style={styles.clientItemInfo}>
                            <View style={styles.clientItemHeader}>
                              <Text style={styles.clientItemName}>{client.name}</Text>
                              <TouchableOpacity
                                style={styles.favoriteButton}
                                onPress={(e) => {
                                  e.stopPropagation();
                                  togglePatientFavorite(client.id);
                                }}
                              >
                                <Ionicons 
                                  name={isFavorite ? "star" : "star-outline"} 
                                  size={20} 
                                  color={isFavorite ? "#FFD700" : "#ccc"} 
                                />
                              </TouchableOpacity>
                            </View>
                            
                            <Text style={styles.clientItemEmail}>{client.email}</Text>
                            {client.phone && (
                              <Text style={styles.clientItemPhone}>{client.phone}</Text>
                            )}
                            
                            {/* Estadísticas del paciente */}
                            <View style={styles.clientItemStats}>
                              <View style={styles.statItem}>
                                <Ionicons name="calendar" size={14} color="#4CAF50" />
                                <Text style={styles.statText}>{patientStats.totalVisits} visitas</Text>
                              </View>
                              <View style={styles.statItem}>
                                <Ionicons name="star" size={14} color="#FFC107" />
                                <Text style={styles.statText}>{patientStats.averageRating}</Text>
                              </View>
                              <View style={styles.statItem}>
                                <Ionicons name="time" size={14} color="#2196F3" />
                                <Text style={styles.statText}>{patientStats.preferredTime}</Text>
                              </View>
                            </View>
                          </View>
                          
                          <View style={styles.clientItemActions}>
                            <TouchableOpacity
                              style={styles.actionButton}
                              onPress={(e) => {
                                e.stopPropagation();
                                // Aquí se implementaría la funcionalidad de llamar
                                Alert.alert('Llamar', `Llamando a ${client.name}...`);
                              }}
                            >
                              <Ionicons name="call" size={16} color="#4CAF50" />
                            </TouchableOpacity>
                            
                            <TouchableOpacity
                              style={styles.actionButton}
                              onPress={(e) => {
                                e.stopPropagation();
                                // Aquí se implementaría la funcionalidad de enviar email
                                Alert.alert('Email', `Enviando email a ${client.email}...`);
                              }}
                            >
                              <Ionicons name="mail" size={16} color="#2196F3" />
                            </TouchableOpacity>
                            
                            <View style={styles.clientItemSelectIndicator}>
                              <Ionicons name="chevron-forward" size={20} color="#667eea" />
                            </View>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })
                ) : (
                  <View style={styles.noClientsContainer}>
                    <Ionicons name="people-outline" size={48} color="#999" />
                    <Text style={styles.noClientsText}>
                      {clientSearchQuery.trim() 
                        ? 'No se encontraron pacientes con esa búsqueda'
                        : 'No hay pacientes disponibles en el catálogo'
                      }
                    </Text>
                    <Text style={styles.noClientsSubtext}>
                      Intenta cambiar los filtros o la búsqueda
                    </Text>
                  </View>
                )}
              </ScrollView>
            </View>
            
            <View style={styles.clientSelectorModalActions}>
              <TouchableOpacity
                style={styles.clientSelectorCancelButton}
                onPress={() => setShowClientSelector(false)}
              >
                <Text style={styles.clientSelectorCancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

/** Normaliza fecha de cita a YYYY-MM-DD (local). */
function appointmentDateToYmd(dateStr: string): string {
  if (!dateStr) return '';
  const head = String(dateStr).match(/^(\d{4}-\d{2}-\d{2})/);
  if (head) return head[1];
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Función para generar horarios por defecto
const generateDefaultSchedule = () => {
  return {
    monday: {
      morning: { '08:00': true, '09:00': true, '10:00': true, '11:00': true, '12:00': true },
      afternoon: { '14:00': true, '15:00': true, '16:00': true, '17:00': true, '18:00': true },
      evening: { '19:00': false, '20:00': false, '21:00': false }
    },
    tuesday: {
      morning: { '08:00': true, '09:00': true, '10:00': true, '11:00': true, '12:00': true },
      afternoon: { '14:00': true, '15:00': true, '16:00': true, '17:00': true, '18:00': true },
      evening: { '19:00': false, '20:00': false, '21:00': false }
    },
    wednesday: {
      morning: { '08:00': true, '09:00': true, '10:00': true, '11:00': true, '12:00': true },
      afternoon: { '14:00': true, '15:00': true, '16:00': true, '17:00': true, '18:00': true },
      evening: { '19:00': false, '20:00': false, '21:00': false }
    },
    thursday: {
      morning: { '08:00': true, '09:00': true, '10:00': true, '11:00': true, '12:00': true },
      afternoon: { '14:00': true, '15:00': true, '16:00': true, '17:00': true, '18:00': true },
      evening: { '19:00': false, '20:00': false, '21:00': false }
    },
    friday: {
      morning: { '08:00': true, '09:00': true, '10:00': true, '11:00': true, '12:00': true },
      afternoon: { '14:00': true, '15:00': true, '16:00': true, '17:00': true, '18:00': true },
      evening: { '19:00': false, '20:00': false, '21:00': false }
    },
    saturday: {
      morning: { '09:00': true, '10:00': true, '11:00': true, '12:00': true },
      afternoon: { '14:00': true, '15:00': true, '16:00': true },
      evening: { '17:00': false, '18:00': false, '19:00': false }
    },
    sunday: {
      morning: { '09:00': false, '10:00': false, '11:00': false, '12:00': false },
      afternoon: { '14:00': false, '15:00': false, '16:00': false },
      evening: { '17:00': false, '18:00': false, '19:00': false }
    },
  };
};

// Pantalla de Horarios Profesional
function ProfessionalScheduleScreen({ forceOpenScheduleModal = false }: { forceOpenScheduleModal?: boolean }) {
  const { user, toggleUserType } = useAuth();
  const params = useLocalSearchParams<{ manageSchedule?: string }>();
  const router = useRouter();
  const {
    syncFromScheduleData,
    syncWithBackend,
    getAvailabilityByProfessional,
    isTimeSlotBlocked,
    getAvailableTimeSlots,
  } = useAvailability();
  const {
    appointments,
    refreshAppointments,
    confirmAppointment,
    rejectAppointment,
    cancelAppointmentAsProfessional,
    rescheduleAppointmentAsProfessional,
  } = useAppointments();
  const [refreshing, setRefreshing] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showAddScheduleModal, setShowAddScheduleModal] = useState(false);
  const [showDayPickerModal, setShowDayPickerModal] = useState(false);
  const [showPeriodPickerModal, setShowPeriodPickerModal] = useState(false);
  const [newScheduleData, setNewScheduleData] = useState({
    day: 'monday',
    timeSlot: 'morning',
    startTime: '09:00',
    endTime: '10:00',
    isAvailable: true,
  });
  const [weeklySchedule, setWeeklySchedule] = useState(generateDefaultSchedule());
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(true);
  const [hasCustomSchedule, setHasCustomSchedule] = useState(false);
  
  // Estados para el calendario con datos de BD
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(new Date());
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [dateSchedules, setDateSchedules] = useState<{ [date: string]: any }>({});
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(false);
  const [defaultTimeRanges, setDefaultTimeRanges] = useState([
    { start: '09:00', end: '12:00' },
    { start: '14:00', end: '18:00' },
  ]);
  const [replicateDays, setReplicateDays] = useState({
    sunday: false,
    monday: true,
    tuesday: true,
    wednesday: true,
    thursday: true,
    friday: true,
    saturday: false,
  });
  const [replicateScopeWeeks, setReplicateScopeWeeks] = useState(8);
  const [overwriteDatesWithSchedule, setOverwriteDatesWithSchedule] = useState(false);
  const [appointmentDuration, setAppointmentDuration] = useState(60);
  const [maxAppointmentsPerDay, setMaxAppointmentsPerDay] = useState(20);
  const [advanceBookingDays, setAdvanceBookingDays] = useState(30);
  const [breakStart, setBreakStart] = useState('12:00');
  const [breakEnd, setBreakEnd] = useState('14:00');
  const [isSavingBatch, setIsSavingBatch] = useState(false);

  const shouldOpenScheduleFromSettings = useMemo(() => {
    const raw = params?.manageSchedule;
    if (Array.isArray(raw)) {
      return raw.some((v) => v === '1' || v === 'true');
    }
    return raw === '1' || raw === 'true';
  }, [params?.manageSchedule]);

  useEffect(() => {
    if (shouldOpenScheduleFromSettings || forceOpenScheduleModal) {
      setShowScheduleModal(true);
    }
  }, [shouldOpenScheduleFromSettings, forceOpenScheduleModal]);

  const closeScheduleModal = () => {
    setShowScheduleModal(false);
    try {
      if (shouldOpenScheduleFromSettings || forceOpenScheduleModal) {
        router.replace('/(tabs)/settings' as never);
      } else {
        router.back();
      }
    } catch {
      router.replace('/(tabs)/settings' as never);
    }
  };

  const professionalUid = useMemo(
    () => String(user?._id || user?.id || user?.userId || '').trim(),
    [user?._id, user?.id, user?.userId]
  );

  const appointmentsByDate = useMemo(() => {
    const map: Record<string, number> = {};
    if (!professionalUid) return map;
    for (const a of appointments) {
      if (a.status === 'cancelled') continue;
      const pid = String(a.professionalId || '').trim();
      if (pid && pid !== professionalUid) continue;
      const key = appointmentDateToYmd(a.date);
      if (!key) continue;
      map[key] = (map[key] || 0) + 1;
    }
    return map;
  }, [appointments, professionalUid]);

  const sortProAppointments = (list: typeof appointments) =>
    [...list].sort((a, b) => {
      try {
        const tsa = String(a.time || '').split('-')[0].trim();
        const tsb = String(b.time || '').split('-')[0].trim();
        const dateA = a.date?.includes('-')
          ? new Date(`${a.date}T${tsa || '00:00'}`)
          : new Date(`${a.date} ${tsa}`);
        const dateB = b.date?.includes('-')
          ? new Date(`${b.date}T${tsb || '00:00'}`)
          : new Date(`${b.date} ${tsb}`);
        return dateA.getTime() - dateB.getTime();
      } catch {
        return 0;
      }
    });

  const pendingApprovalAppointments = useMemo(() => {
    if (!professionalUid) return [];
    const list = appointments.filter(
      (a) =>
        String(a.professionalId || '').trim() === professionalUid &&
        (a.status === 'pending' || a.status === 'pending_approval')
    );
    return sortProAppointments(list);
  }, [appointments, professionalUid]);

  const confirmedActiveAppointments = useMemo(() => {
    if (!professionalUid) return [];
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const list = appointments.filter((a) => {
      if (String(a.professionalId || '').trim() !== professionalUid) return false;
      if (a.status !== 'confirmed' && a.status !== 'pending_payment') return false;
      const ymd = appointmentDateToYmd(a.date);
      if (!ymd) return true;
      const d = new Date(`${ymd}T12:00:00`);
      d.setHours(0, 0, 0, 0);
      return d >= now;
    });
    return sortProAppointments(list);
  }, [appointments, professionalUid]);

  const [showGhRescheduleModal, setShowGhRescheduleModal] = useState(false);
  const [ghRescheduleTarget, setGhRescheduleTarget] = useState(null);
  const [ghRescheduleDate, setGhRescheduleDate] = useState('');
  const [ghRescheduleTime, setGhRescheduleTime] = useState('');
  const [ghRescheduleMarkedDates, setGhRescheduleMarkedDates] = useState({});

  const loadGhRescheduleMarkedDates = async (professionalId: string) => {
    try {
      const isMongoId = /^[a-fA-F0-9]{24}$/.test(String(professionalId).trim());
      if (!isMongoId) {
        setGhRescheduleMarkedDates({});
        return;
      }
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const base = getBackendBaseUrl();
      const url = `${base}/api/v1/date-schedules/${professionalId}/month/${year}/${month}`;
      const response = await fetch(url);
      if (!response.ok) {
        setGhRescheduleMarkedDates({});
        return;
      }
      const data = await response.json();
      const next: Record<string, unknown> = {};
      if (data.success && data.data && data.data.length > 0) {
        data.data.forEach((schedule: { date?: string; timeSlots?: string[]; isAvailable?: boolean }) => {
          const d = schedule.date;
          if (
            d &&
            schedule.timeSlots &&
            schedule.timeSlots.length > 0 &&
            schedule.isAvailable !== false
          ) {
            next[d] = {
              marked: true,
              selected: false,
              selectedColor: '#4CAF50',
              dotColor: '#4CAF50',
            };
          }
        });
      }
      setGhRescheduleMarkedDates(next);
    } catch {
      setGhRescheduleMarkedDates({});
    }
  };

  const closeGhRescheduleModal = () => {
    setShowGhRescheduleModal(false);
    setGhRescheduleTarget(null);
    setGhRescheduleDate('');
    setGhRescheduleTime('');
    setGhRescheduleMarkedDates({});
  };

  const openGhReschedule = async (apt: any) => {
    setGhRescheduleTarget(apt);
    setGhRescheduleDate(appointmentDateToYmd(apt.date) || String(apt.date || ''));
    const ts = String(apt.time || '').split('-')[0].trim() || String(apt.time || '');
    setGhRescheduleTime(ts);
    await loadGhRescheduleMarkedDates(professionalUid);
    setShowGhRescheduleModal(true);
  };

  const confirmGhReschedule = async () => {
    if (!ghRescheduleTarget?.id) return;
    const r = await rescheduleAppointmentAsProfessional(
      ghRescheduleTarget.id,
      ghRescheduleDate,
      ghRescheduleTime
    );
    if (!r.ok) {
      Alert.alert('No se pudo reprogramar', r.message || 'Intentá de nuevo.');
      return;
    }
    Alert.alert('Listo', 'Cita reprogramada. El paciente recibirá una notificación.');
    closeGhRescheduleModal();
  };

  const handleGhCancelConfirmed = (apt: any) => {
    Alert.alert(
      'Cancelar cita',
      '¿Confirmás la cancelación? El paciente recibirá una notificación.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, cancelar',
          style: 'destructive',
          onPress: async () => {
            const r = await cancelAppointmentAsProfessional(apt.id);
            if (!r.ok) {
              Alert.alert('Error', r.message || 'No se pudo cancelar.');
              return;
            }
            Alert.alert('Cita cancelada', 'Se notificó al paciente.');
          },
        },
      ]
    );
  };

  const handleOverviewDayPress = (dateStr: string) => {
    const dayAppointments = appointments.filter((a) => {
      if (a.status === 'cancelled') return false;
      return appointmentDateToYmd(a.date) === dateStr;
    });

    const apptLines =
      dayAppointments.length > 0
        ? dayAppointments.map(
            (a) =>
              `• ${a.time} — ${a.clientName || a.patientName || 'Cliente'} (${a.service})`
          )
        : ['• Sin citas este día'];

    const sched = dateSchedules[dateStr];
    let slotLines: string[] = [];
    if (sched?.timeSlots?.length) {
      slotLines = sched.timeSlots
        .filter((s) => s && s.start && s.end)
        .map(
          (s) => `• ${s.start}–${s.end}${s.isCustom ? ' (personalizado)' : ''}`
        );
    } else if (professionalUid) {
      const slots = getAvailableTimeSlots(
        professionalUid,
        new Date(`${dateStr}T12:00:00`)
      );
      slotLines =
        slots.length > 0
          ? slots.map((t) => `• ${t}`)
          : ['• Franjas según horario semanal (sin detalle por hora en este día)'];
    } else {
      slotLines = ['• —'];
    }

    const message = ['Citas', ...apptLines, '', 'Franjas / disponibilidad', ...slotLines].join(
      '\n'
    );
    Alert.alert(dateStr, message);
  };

  // Cargar horarios desde el backend al inicializar
  useEffect(() => {
    if (!professionalUid) {
      setIsLoadingSchedule(false);
      return;
    }

    let cancelled = false;

    const loadScheduleFromBackend = async () => {
      try {
        setIsLoadingSchedule(true);
        console.log('🔄 Cargando horarios desde backend...');

        const synced = await syncWithBackend(professionalUid);
        const availability =
          synced ?? getAvailabilityByProfessional(professionalUid);

        if (cancelled) return;

        if (availability && availability.timeSlots && availability.timeSlots.length > 0) {
          console.log('✅ Horarios encontrados en backend, convirtiendo...');
          const convertedSchedule = convertAvailabilityToSchedule(availability);
          setWeeklySchedule(convertedSchedule);
          setHasCustomSchedule(true);
          console.log('✅ Horarios cargados desde backend');
        } else {
          console.log('ℹ️ No hay horarios configurados, usando valores por defecto');
          setHasCustomSchedule(false);
        }
      } catch (error) {
        if (cancelled) return;
        console.error('❌ Error cargando horarios:', error);
        console.log('ℹ️ Usando horarios por defecto debido al error');
        setHasCustomSchedule(false);
      } finally {
        if (!cancelled) {
          setIsLoadingSchedule(false);
        }
      }
    };

    loadScheduleFromBackend();

    return () => {
      cancelled = true;
    };
  }, [professionalUid]);

  // Cargar horarios por fecha desde la base de datos
  const loadDateSchedulesFromDB = async (month: number, year: number) => {
    if (!professionalUid) return;

    setIsLoadingCalendar(true);
    try {
      const base = getBackendBaseUrl();
      console.log(`📅 Cargando horarios por fecha para ${month}/${year} - Usuario: ${professionalUid} → ${base}`);

      const response = await fetch(
        `${base}/api/v1/date-schedules/${professionalUid}/month/${year}/${month}`
      );
      
      console.log(`📅 Respuesta del servidor: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Datos recibidos del servidor:', data);
        
        if (data.success && data.data && Array.isArray(data.data)) {
          console.log(`📅 Total de horarios encontrados: ${data.data.length}`);
          
          // Convertir array a objeto para FullCalendar
          const schedulesObject: { [date: string]: any } = {};
          data.data.forEach((schedule: any) => {
            console.log(`📅 Procesando horario para fecha: ${schedule.date}`, schedule);
            schedulesObject[schedule.date] = schedule;
          });
          
          setDateSchedules(schedulesObject);
          
          // Extraer fechas con horarios para mostrar en el calendario
          const datesWithSchedules = data.data
            .filter((schedule: any) => {
              const hasTimeSlots = schedule.timeSlots && schedule.timeSlots.length > 0;
              const isAvailable = schedule.isAvailable !== false;
              console.log(`📅 Fecha ${schedule.date}: hasTimeSlots=${hasTimeSlots}, isAvailable=${isAvailable}`);
              return hasTimeSlots && isAvailable;
            })
            .map((schedule: any) => schedule.date);
          
          setSelectedDates(datesWithSchedules);
          console.log('📅 Fechas marcadas como disponibles:', datesWithSchedules);
          console.log('📅 Objeto de horarios:', schedulesObject);
        } else {
          console.log('⚠️ No hay datos válidos en la respuesta');
          setDateSchedules({});
          setSelectedDates([]);
        }
      } else {
        console.log(`⚠️ Error del servidor: ${response.status} ${response.statusText}`);
        const errorText = await response.text();
        console.log('📅 Detalles del error:', errorText);
        setDateSchedules({});
        setSelectedDates([]);
      }
    } catch (error) {
      console.error('❌ Error cargando horarios por fecha:', error);
      setDateSchedules({});
      setSelectedDates([]);
    } finally {
      setIsLoadingCalendar(false);
    }
  };

  // Cargar horarios del mes actual al inicializar
  useEffect(() => {
    if (!professionalUid) return;
    const currentDate = new Date();
    loadDateSchedulesFromDB(currentDate.getMonth() + 1, currentDate.getFullYear());
  }, [professionalUid]);

  // Función para convertir disponibilidad del backend al formato de horarios
  const convertAvailabilityToSchedule = (availability) => {
    const schedule = generateDefaultSchedule();
    
    // Mapear días de la semana
    const dayMapping = {
      monday: 'monday',
      tuesday: 'tuesday', 
      wednesday: 'wednesday',
      thursday: 'thursday',
      friday: 'friday',
      saturday: 'saturday',
      sunday: 'sunday'
    };
    
    // Aplicar configuración de días disponibles
    Object.entries(availability.daysOfWeek).forEach(([day, isAvailable]) => {
      if (dayMapping[day] && !isAvailable) {
        // Si el día no está disponible, desactivar todos los horarios
        Object.keys(schedule[dayMapping[day]]).forEach(period => {
          Object.keys(schedule[dayMapping[day]][period]).forEach(time => {
            schedule[dayMapping[day]][period][time] = false;
          });
        });
      }
    });
    
    // Aplicar horarios específicos
    availability.timeSlots.forEach(timeSlot => {
      Object.keys(schedule).forEach(day => {
        if (availability.daysOfWeek[day]) {
          Object.keys(schedule[day]).forEach(period => {
            if (schedule[day][period].hasOwnProperty(timeSlot)) {
              schedule[day][period][timeSlot] = true;
            }
          });
        }
      });
    });
    
    return schedule;
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshAppointments();
      if (professionalUid) {
        await loadDateSchedulesFromDB(
          currentCalendarMonth.getMonth() + 1,
          currentCalendarMonth.getFullYear()
        );
      }
    } finally {
      setRefreshing(false);
    }
  };

  // Función para agregar un nuevo horario
  const addNewSchedule = () => {
    const { day, timeSlot, startTime, endTime, isAvailable } = newScheduleData;
    
    // Generar horarios entre startTime y endTime
    const timeSlots = generateTimeSlots(startTime, endTime);
    
    setWeeklySchedule(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [timeSlot]: {
          ...prev[day][timeSlot],
          ...timeSlots
        }
      }
    }));
    
    // Limpiar el formulario
    setNewScheduleData({
      day: 'monday',
      timeSlot: 'morning',
      startTime: '09:00',
      endTime: '10:00',
      isAvailable: true,
    });
    
    setShowAddScheduleModal(false);
    Alert.alert('✅ Éxito', 'Horario agregado correctamente');
  };

  // Función para generar horarios entre dos tiempos
  const generateTimeSlots = (start: string, end: string) => {
    const slots: { [key: string]: boolean } = {};
    const startHour = parseInt(start.split(':')[0]);
    const endHour = parseInt(end.split(':')[0]);
    
    for (let hour = startHour; hour < endHour; hour++) {
      const timeString = `${hour.toString().padStart(2, '0')}:00`;
      slots[timeString] = newScheduleData.isAvailable;
    }
    
    return slots;
  };

  // Función para seleccionar día
  const selectDay = (day: string) => {
    setNewScheduleData(prev => ({
      ...prev,
      day: day
    }));
    setShowDayPickerModal(false);
  };

  // Array de días disponibles
  const availableDays = [
    { key: 'monday', name: 'Lunes' },
    { key: 'tuesday', name: 'Martes' },
    { key: 'wednesday', name: 'Miércoles' },
    { key: 'thursday', name: 'Jueves' },
    { key: 'friday', name: 'Viernes' },
    { key: 'saturday', name: 'Sábado' },
    { key: 'sunday', name: 'Domingo' },
  ];

  // Función para seleccionar período
  const selectPeriod = (period: string) => {
    setNewScheduleData(prev => ({
      ...prev,
      timeSlot: period
    }));
    setShowPeriodPickerModal(false);
  };

  // Array de períodos disponibles
  const availablePeriods = [
    { key: 'morning', name: 'Mañana', timeRange: '9:00 - 12:00' },
    { key: 'afternoon', name: 'Tarde', timeRange: '14:00 - 17:00' },
    { key: 'evening', name: 'Noche', timeRange: '18:00 - 21:00' },
  ];

  const handleAcceptAppointment = (appointmentId: string) => {
    Alert.alert('Aceptar cita', '¿Confirmás esta reserva?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Aceptar',
        onPress: async () => {
          await confirmAppointment(appointmentId);
          Alert.alert('Listo', 'La cita quedó confirmada.');
        },
      },
    ]);
  };

  const handleRejectAppointment = (appointmentId: string) => {
    Alert.alert('Rechazar cita', '¿Rechazás esta solicitud?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Rechazar',
        style: 'destructive',
        onPress: async () => {
          await rejectAppointment(appointmentId);
          Alert.alert('Listo', 'La solicitud fue rechazada.');
        },
      },
    ]);
  };

  const toggleTimeSlot = (day: string, timeSlot: string, hour: string) => {
    setWeeklySchedule((prev: any) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [timeSlot]: {
          ...prev[day][timeSlot],
          [hour]: !prev[day][timeSlot][hour],
        },
      },
    }));
  };

  // Funciones para manejar el calendario
  const handleDateSelect = (date: string) => {
    console.log('📅 Fecha seleccionada:', date);
    setSelectedDates(prev => [...prev, date]);
  };

  const handleDateDeselect = (date: string) => {
    console.log('📅 Fecha deseleccionada:', date);
    setSelectedDates(prev => prev.filter(d => d !== date));
  };

  const handleMonthChange = (newMonth: Date) => {
    console.log('📅 Cambiando mes:', newMonth);
    setCurrentCalendarMonth(newMonth);
    loadDateSchedulesFromDB(newMonth.getMonth() + 1, newMonth.getFullYear());
  };

  const handleDateScheduleEdit = async (
    date: string,
    schedule: any,
    options?: { silent?: boolean; skipReload?: boolean }
  ) => {
    if (!professionalUid) return;

    try {
      console.log('📅 Editando horarios para fecha:', date, schedule);

      const base = getBackendBaseUrl();
      const response = await fetch(`${base}/api/v1/date-schedules/${professionalUid}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date,
          timeSlots: schedule.timeSlots || [],
          isAvailable: schedule.isAvailable !== false,
          notes: schedule.notes || '',
          professionalName: user.fullName || user.email,
        }),
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Horarios guardados:', result);
        if (!options?.skipReload) {
          loadDateSchedulesFromDB(
            currentCalendarMonth.getMonth() + 1,
            currentCalendarMonth.getFullYear()
          );
        }
        if (!options?.silent) {
          Alert.alert('Éxito', 'Horarios guardados correctamente');
        }
      } else {
        throw new Error('Error guardando horarios');
      }
    } catch (error) {
      console.error('❌ Error guardando horarios:', error);
      if (!options?.silent) {
        Alert.alert('Error', 'No se pudieron guardar los horarios');
      }
      throw error;
    }
  };

  const formatDateYmd = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const addHours = (hhmm: string, delta: number) => {
    const [h, m] = String(hhmm || '00:00').split(':').map((v) => parseInt(v, 10) || 0);
    const total = Math.max(0, Math.min(23 * 60 + 59, h * 60 + m + delta * 60));
    const nextH = String(Math.floor(total / 60)).padStart(2, '0');
    const nextM = String(total % 60).padStart(2, '0');
    return `${nextH}:${nextM}`;
  };

  const getDefaultTimeSlots = () =>
    defaultTimeRanges
      .filter((r) => r.start && r.end)
      .map((r) => ({ start: r.start, end: r.end, isCustom: false }));

  const saveAllSelectedDates = async () => {
    if (!selectedDates.length) {
      Alert.alert('Sin fechas', 'Seleccioná al menos una fecha.');
      return;
    }
    if (isSavingBatch) return;
    setIsSavingBatch(true);
    const slots = getDefaultTimeSlots();
    let saved = 0;
    try {
      for (const date of selectedDates) {
        await handleDateScheduleEdit(
          date,
          {
            timeSlots: slots,
            isAvailable: true,
            notes: '',
          },
          { silent: true, skipReload: true }
        );
        saved += 1;
      }
      await loadDateSchedulesFromDB(
        currentCalendarMonth.getMonth() + 1,
        currentCalendarMonth.getFullYear()
      );
      Alert.alert('✅ Horarios guardados', `Se guardaron ${saved} fechas.`);
    } catch {
      Alert.alert('Error', `Se guardaron ${saved} fechas antes de un error. Intentá de nuevo.`);
    } finally {
      setIsSavingBatch(false);
    }
  };

  const applyTemplateToCalendar = () => {
    const enabledDays = new Set(
      Object.entries(replicateDays)
        .filter(([, enabled]) => enabled)
        .map(([day]) => day)
    );
    const mapJsDay: Record<string, number> = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
    };
    const targetJsDays = new Set(
      Object.keys(mapJsDay).filter((k) => enabledDays.has(k)).map((k) => mapJsDay[k])
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(today);
    end.setDate(today.getDate() + replicateScopeWeeks * 7);

    const generated: string[] = [];
    for (let d = new Date(today); d <= end; d.setDate(d.getDate() + 1)) {
      if (targetJsDays.has(d.getDay())) {
        generated.push(formatDateYmd(d));
      }
    }

    setSelectedDates((prev) => {
      const next = overwriteDatesWithSchedule ? generated : Array.from(new Set([...prev, ...generated]));
      return next.sort();
    });
    Alert.alert('✅ Plantilla aplicada', `Se actualizaron ${generated.length} fechas del calendario.`);
  };

  const getDayName = (day: string) => {
    const dayNames: { [key: string]: string } = {
      monday: 'Lunes',
      tuesday: 'Martes',
      wednesday: 'Miércoles',
      thursday: 'Jueves',
      friday: 'Viernes',
      saturday: 'Sábado',
      sunday: 'Domingo',
    };
    return dayNames[day] || day;
  };

  const getTimeSlotName = (timeSlot: string) => {
    const timeSlotNames: { [key: string]: string } = {
      morning: 'Mañana',
      afternoon: 'Tarde',
      evening: 'Noche',
    };
    return timeSlotNames[timeSlot] || timeSlot;
  };

  const getTimeRange = (timeSlot: string) => {
    const timeRanges: { [key: string]: string } = {
      morning: '9:00 - 12:00',
      afternoon: '14:00 - 17:00',
      evening: '18:00 - 21:00',
    };
    return timeRanges[timeSlot] || '';
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <View style={styles.headerContainer}>
          <Text style={styles.headerTitle}>Gestión de Horarios</Text>
          {isLoadingSchedule ? (
            <View style={styles.statusIndicator}>
              <ActivityIndicator size="small" color="#667eea" />
              <Text style={styles.statusText}>Cargando...</Text>
            </View>
          ) : hasCustomSchedule ? (
            <View style={[styles.statusIndicator, styles.customSchedule]}>
              <Ionicons name="checkmark-circle" size={16} color="#4caf50" />
              <Text style={[styles.statusText, styles.customText]}>Personalizado</Text>
            </View>
          ) : (
            <View style={[styles.statusIndicator, styles.defaultSchedule]}>
              <Ionicons name="time-outline" size={16} color="#ff9800" />
              <Text style={[styles.statusText, styles.defaultText]}>Por defecto</Text>
            </View>
          )}
        </View>
        <Text style={styles.headerSubtitle}>Configura tu disponibilidad</Text>
      </View>

      <View style={styles.scheduleSection}>
        <Text style={styles.scheduleSectionTitle}>Vista de agenda</Text>
        <Text style={styles.scheduleSectionDescription}>
          Mes con citas (número en el día) y disponibilidad en verde. Toca un día para ver citas y
          franjas.
        </Text>
        {isLoadingCalendar ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#667eea" />
            <Text style={styles.loadingText}>Cargando calendario...</Text>
          </View>
        ) : (
          <FullCalendar
            variant="overview"
            selectedDates={[]}
            onDateSelect={() => {}}
            onDateDeselect={() => {}}
            currentMonth={currentCalendarMonth}
            onMonthChange={handleMonthChange}
            dateSchedules={dateSchedules}
            appointmentsByDate={appointmentsByDate}
            onOverviewDayPress={handleOverviewDayPress}
          />
        )}
      </View>

      {/* Citas pendientes de aprobación (datos reales) */}
      <View style={styles.pendingSection}>
        <Text style={styles.sectionTitle}>Citas pendientes de aprobación</Text>
        <Text style={styles.sectionSubtitle}>
          {pendingApprovalAppointments.length === 0
            ? 'No hay solicitudes esperando tu respuesta.'
            : `${pendingApprovalAppointments.length} cita${
                pendingApprovalAppointments.length !== 1 ? 's' : ''
              } por confirmar o rechazar`}
        </Text>

        {pendingApprovalAppointments.map((appointment) => (
          <View key={appointment.id} style={styles.pendingCard}>
            <View style={styles.pendingHeader}>
              <View style={styles.pendingInfo}>
                <Text style={styles.patientName}>
                  {appointment.clientName || appointment.patientName || 'Paciente'}
                </Text>
                <Text style={styles.serviceName}>{appointment.service}</Text>
                <Text style={styles.pendingAppointmentTime}>
                  {appointment.date} • {appointment.time}
                </Text>
              </View>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>
                  {appointment.status === 'pending_approval' ? 'Por aprobar' : 'Pendiente'}
                </Text>
              </View>
            </View>

            <View style={styles.pendingDetails}>
              {(appointment.patientPhone || appointment.clientPhone) && (
                <View style={styles.detailRow}>
                  <Ionicons name="call" size={16} color="#666" />
                  <Text style={styles.detailText}>
                    {appointment.patientPhone || appointment.clientPhone || '—'}
                  </Text>
                </View>
              )}
              {(appointment.patientEmail || appointment.clientEmail) && (
                <View style={styles.detailRow}>
                  <Ionicons name="mail" size={16} color="#666" />
                  <Text style={styles.detailText}>
                    {appointment.patientEmail || appointment.clientEmail || '—'}
                  </Text>
                </View>
              )}
              {appointment.notes ? (
                <View style={styles.detailRow}>
                  <Ionicons name="document-text" size={16} color="#666" />
                  <Text style={styles.detailText}>{appointment.notes}</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, styles.acceptButton]}
                onPress={() => handleAcceptAppointment(appointment.id)}
              >
                <Ionicons name="checkmark" size={20} color="white" />
                <Text style={styles.actionButtonText}>Aceptar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.rejectButton]}
                onPress={() => handleRejectAppointment(appointment.id)}
              >
                <Ionicons name="close" size={20} color="white" />
                <Text style={styles.actionButtonText}>Rechazar</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>

      {/* Citas confirmadas (hoy o futuras): cancelar / reprogramar */}
      <View style={styles.pendingSection}>
        <Text style={styles.sectionTitle}>Citas confirmadas</Text>
        <Text style={styles.sectionSubtitle}>
          {confirmedActiveAppointments.length === 0
            ? 'No tenés turnos confirmados a partir de hoy.'
            : `${confirmedActiveAppointments.length} turno${
                confirmedActiveAppointments.length !== 1 ? 's' : ''
              } activo${confirmedActiveAppointments.length !== 1 ? 's' : ''}`}
        </Text>

        {confirmedActiveAppointments.map((appointment) => (
          <View key={appointment.id} style={styles.confirmedAgendaCard}>
            <View style={styles.pendingHeader}>
              <View style={styles.pendingInfo}>
                <Text style={styles.patientName}>
                  {appointment.clientName || appointment.patientName || 'Paciente'}
                </Text>
                <Text style={styles.serviceName}>{appointment.service}</Text>
                <Text style={styles.pendingAppointmentTime}>
                  {appointment.date} • {appointment.time}
                </Text>
              </View>
              <View style={[styles.statusBadge, styles.confirmedAgendaBadge]}>
                <Text style={styles.statusText}>
                  {appointment.status === 'pending_payment' ? 'Pago pendiente' : 'Confirmada'}
                </Text>
              </View>
            </View>
            {appointment.notes ? (
              <View style={styles.pendingDetails}>
                <View style={styles.detailRow}>
                  <Ionicons name="document-text" size={16} color="#666" />
                  <Text style={styles.detailText}>{appointment.notes}</Text>
                </View>
              </View>
            ) : null}
            <View style={styles.ghManageRow}>
              <TouchableOpacity
                style={[styles.ghManageBtn, styles.ghRescheduleBtn]}
                onPress={() => openGhReschedule(appointment)}
              >
                <Ionicons name="calendar-outline" size={18} color="#e65100" />
                <Text style={styles.ghRescheduleBtnText}>Reprogramar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.ghManageBtn, styles.ghCancelBtn]}
                onPress={() => handleGhCancelConfirmed(appointment)}
              >
                <Ionicons name="close-circle-outline" size={18} color="#c62828" />
                <Text style={styles.ghCancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.actionsSection}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => setShowAddScheduleModal(true)}
        >
          <Ionicons name="add-circle" size={20} color="white" />
          <Text style={styles.actionButtonText}>Agregar Horario</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.secondaryButton]}
          onPress={() => setShowScheduleModal(true)}
        >
          <Ionicons name="settings" size={20} color="#667eea" />
          <Text style={styles.secondaryButtonText}>Configurar Horarios</Text>
        </TouchableOpacity>
        
        {hasCustomSchedule && (
          <TouchableOpacity 
            style={styles.resetButton} 
            onPress={() => {
              Alert.alert(
                'Restablecer Horarios',
                '¿Estás seguro de que quieres restablecer a los horarios por defecto?',
                [
                  { text: 'Cancelar', style: 'cancel' },
                  { 
                    text: 'Restablecer', 
                    style: 'destructive',
                    onPress: () => {
                      setWeeklySchedule(generateDefaultSchedule());
                      setHasCustomSchedule(false);
                      Alert.alert('Éxito', 'Horarios restablecidos a valores por defecto');
                    }
                  }
                ]
              );
            }}
          >
            <Ionicons name="refresh-outline" size={20} color="#ff9800" />
            <Text style={styles.resetButtonText}>Restablecer por Defecto</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Modal para gestionar horarios - formato clásico 20/04 */}
      <Modal
        visible={showScheduleModal}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={closeScheduleModal}
      >
        <View style={{ flex: 1, backgroundColor: '#f5f6fb' }}>
          <View style={{ backgroundColor: '#667eea', paddingTop: 50, paddingHorizontal: 16, paddingBottom: 12 }}>
            <TouchableOpacity
              onPress={closeScheduleModal}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={{ position: 'absolute', left: 12, top: 52, padding: 8, zIndex: 20 }}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={{ color: '#fff', fontSize: 22, fontWeight: '700', textAlign: 'center' }}>⏰ Gestión de Horarios</Text>
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
            <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 14 }}>
              <Text style={{ fontSize: 22, fontWeight: '700', color: '#222', marginBottom: 6 }}>📅 Seleccionar Fechas Disponibles</Text>
              <Text style={{ fontSize: 16, color: '#6b7280', marginBottom: 12 }}>
                Solo las fechas que marques aquí (y guardes con horarios) aparecen como disponibles en el calendario de reservas de los clientes.
              </Text>
              {isLoadingCalendar ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#667eea" />
                  <Text style={styles.loadingText}>Cargando horarios...</Text>
                </View>
              ) : (
                <FullCalendar
                  selectedDates={selectedDates}
                  onDateSelect={handleDateSelect}
                  onDateDeselect={handleDateDeselect}
                  currentMonth={currentCalendarMonth}
                  onMonthChange={handleMonthChange}
                  onDateScheduleEdit={handleDateScheduleEdit}
                  dateSchedules={dateSchedules}
                />
              )}
            </View>

            {selectedDates.length > 0 && (
              <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 14 }}>
                <Text style={{ fontSize: 22, fontWeight: '700', color: '#222', marginBottom: 10 }}>Fechas Seleccionadas:</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {selectedDates.map((date) => (
                    <View key={date} style={{ backgroundColor: '#5f7ce8', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 }}>
                      <Text style={{ color: '#fff', fontWeight: '700' }}>{date.slice(8)}/{parseInt(date.slice(5, 7), 10)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 14 }}>
              <Text style={{ fontSize: 22, fontWeight: '700', color: '#222', marginBottom: 8 }}>⏰ Horarios por Defecto</Text>
              <Text style={{ fontSize: 16, color: '#6b7280', marginBottom: 12 }}>
                Configura los horarios que se aplicarán a todas las fechas seleccionadas.
              </Text>
              {defaultTimeRanges.map((slot, idx) => (
                <View key={`default-slot-${idx}`} style={{ marginBottom: 10 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={{ color: '#6b7280', fontWeight: '600' }}>Inicio</Text>
                    <Text style={{ color: '#6b7280', fontWeight: '600' }}>Fin</Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: '#f3f4ff', borderRadius: 10, alignItems: 'center', justifyContent: 'space-between' }}>
                      <TouchableOpacity onPress={() => setDefaultTimeRanges((prev) => prev.map((p, i) => (i === idx ? { ...p, start: addHours(p.start, -1) } : p)))} style={{ padding: 10 }}>
                        <Ionicons name="remove" size={18} color="#667eea" />
                      </TouchableOpacity>
                      <Text style={{ fontWeight: '700', color: '#1f2937' }}>{slot.start}</Text>
                      <TouchableOpacity onPress={() => setDefaultTimeRanges((prev) => prev.map((p, i) => (i === idx ? { ...p, start: addHours(p.start, 1) } : p)))} style={{ padding: 10 }}>
                        <Ionicons name="add" size={18} color="#667eea" />
                      </TouchableOpacity>
                    </View>
                    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: '#f3f4ff', borderRadius: 10, alignItems: 'center', justifyContent: 'space-between' }}>
                      <TouchableOpacity onPress={() => setDefaultTimeRanges((prev) => prev.map((p, i) => (i === idx ? { ...p, end: addHours(p.end, -1) } : p)))} style={{ padding: 10 }}>
                        <Ionicons name="remove" size={18} color="#667eea" />
                      </TouchableOpacity>
                      <Text style={{ fontWeight: '700', color: '#1f2937' }}>{slot.end}</Text>
                      <TouchableOpacity onPress={() => setDefaultTimeRanges((prev) => prev.map((p, i) => (i === idx ? { ...p, end: addHours(p.end, 1) } : p)))} style={{ padding: 10 }}>
                        <Ionicons name="add" size={18} color="#667eea" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
            </View>

            <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 14 }}>
              <Text style={{ fontSize: 22, fontWeight: '700', color: '#222', marginBottom: 8 }}>📆 Replicar en semanas / meses</Text>
              <Text style={{ fontSize: 16, color: '#6b7280', marginBottom: 12 }}>
                Configurá los horarios por defecto arriba, elegí qué días de la semana y por cuánto tiempo.
              </Text>
              <Text style={{ fontWeight: '700', marginBottom: 8 }}>Días de la semana</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                {[
                  { k: 'sunday', l: 'Dom' }, { k: 'monday', l: 'Lun' }, { k: 'tuesday', l: 'Mar' },
                  { k: 'wednesday', l: 'Mié' }, { k: 'thursday', l: 'Jue' }, { k: 'friday', l: 'Vie' }, { k: 'saturday', l: 'Sáb' },
                ].map((d) => (
                  <TouchableOpacity
                    key={d.k}
                    onPress={() => setReplicateDays((prev) => ({ ...prev, [d.k]: !prev[d.k] }))}
                    style={{ backgroundColor: replicateDays[d.k] ? '#5f7ce8' : '#eceef4', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 }}
                  >
                    <Text style={{ color: replicateDays[d.k] ? '#fff' : '#555', fontWeight: '700' }}>{d.l}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={{ fontWeight: '700', marginBottom: 8 }}>Alcance desde hoy</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                {[4, 8, 12, 24].map((w) => (
                  <TouchableOpacity
                    key={`scope-${w}`}
                    onPress={() => setReplicateScopeWeeks(w)}
                    style={{ borderWidth: 1.5, borderColor: replicateScopeWeeks === w ? '#5f7ce8' : '#d1d5db', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 }}
                  >
                    <Text style={{ color: '#374151', fontWeight: '700' }}>{w === 24 ? '~6 meses' : `${w} sem.`}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                onPress={() => setOverwriteDatesWithSchedule((v) => !v)}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}
              >
                <Text style={{ color: '#374151', flex: 1 }}>Sobrescribir días que ya tienen horario</Text>
                <Ionicons name={overwriteDatesWithSchedule ? 'toggle' : 'toggle-outline'} size={40} color={overwriteDatesWithSchedule ? '#5f7ce8' : '#c7ccd8'} />
              </TouchableOpacity>
              <TouchableOpacity onPress={applyTemplateToCalendar} style={{ backgroundColor: '#49b34f', borderRadius: 12, padding: 14, alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: '800' }}>📋 Aplicar plantilla al calendario</Text>
              </TouchableOpacity>
            </View>

            <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 14 }}>
              <Text style={{ fontSize: 22, fontWeight: '700', textAlign: 'center', marginBottom: 6 }}>⚙️ Configuración General</Text>
              <Text style={{ fontSize: 16, color: '#6b7280', textAlign: 'center', marginBottom: 12 }}>
                Configuración adicional para la gestión de horarios
              </Text>
              <View style={{ gap: 10 }}>
                {[
                  { label: 'Duración de Citas', value: appointmentDuration, unit: 'min', setValue: setAppointmentDuration },
                  { label: 'Citas Máximas por Día', value: maxAppointmentsPerDay, unit: 'citas', setValue: setMaxAppointmentsPerDay },
                  { label: 'Anticipación de Reservas', value: advanceBookingDays, unit: 'días', setValue: setAdvanceBookingDays },
                ].map((cfg) => (
                  <View key={cfg.label} style={{ backgroundColor: '#f8f9ff', borderRadius: 14, padding: 12 }}>
                    <Text style={{ fontWeight: '700', marginBottom: 8 }}>{cfg.label}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                      <TouchableOpacity onPress={() => cfg.setValue(Math.max(1, cfg.value - 1))} style={{ backgroundColor: '#fff', borderRadius: 999, padding: 8 }}>
                        <Ionicons name="remove" size={18} color="#667eea" />
                      </TouchableOpacity>
                      <Text style={{ fontWeight: '800', color: '#4c63d2' }}>{cfg.value} {cfg.unit}</Text>
                      <TouchableOpacity onPress={() => cfg.setValue(cfg.value + 1)} style={{ backgroundColor: '#fff', borderRadius: 999, padding: 8 }}>
                        <Ionicons name="add" size={18} color="#667eea" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
                <View style={{ backgroundColor: '#f8f9ff', borderRadius: 14, padding: 12 }}>
                  <Text style={{ fontWeight: '700', marginBottom: 8 }}>☕ Tiempo de Descanso</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: '#fff', borderRadius: 10, alignItems: 'center', justifyContent: 'space-between' }}>
                      <TouchableOpacity onPress={() => setBreakStart(addHours(breakStart, -1))} style={{ padding: 10 }}>
                        <Ionicons name="chevron-down" size={18} color="#667eea" />
                      </TouchableOpacity>
                      <Text style={{ fontWeight: '700' }}>{breakStart}</Text>
                      <TouchableOpacity onPress={() => setBreakStart(addHours(breakStart, 1))} style={{ padding: 10 }}>
                        <Ionicons name="chevron-up" size={18} color="#667eea" />
                      </TouchableOpacity>
                    </View>
                    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: '#fff', borderRadius: 10, alignItems: 'center', justifyContent: 'space-between' }}>
                      <TouchableOpacity onPress={() => setBreakEnd(addHours(breakEnd, -1))} style={{ padding: 10 }}>
                        <Ionicons name="chevron-down" size={18} color="#667eea" />
                      </TouchableOpacity>
                      <Text style={{ fontWeight: '700' }}>{breakEnd}</Text>
                      <TouchableOpacity onPress={() => setBreakEnd(addHours(breakEnd, 1))} style={{ padding: 10 }}>
                        <Ionicons name="chevron-up" size={18} color="#667eea" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </ScrollView>

          <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eceef4', paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              onPress={() => {
                setSelectedDates([]);
                setDateSchedules({});
                setDefaultTimeRanges([{ start: '09:00', end: '12:00' }, { start: '14:00', end: '18:00' }]);
                setReplicateScopeWeeks(8);
                setOverwriteDatesWithSchedule(false);
              }}
              style={{ flex: 1, backgroundColor: '#ff6f47', borderRadius: 999, paddingVertical: 12, alignItems: 'center' }}
            >
              <Text style={{ color: '#fff', fontWeight: '800' }}>⏱ Restablecer</Text>
            </TouchableOpacity>
            <TouchableOpacity
              disabled={isSavingBatch}
              onPress={saveAllSelectedDates}
              style={{ flex: 1.4, backgroundColor: isSavingBatch ? '#8fa0eb' : '#5f7ce8', borderRadius: 999, paddingVertical: 12, alignItems: 'center' }}
            >
              <Text style={{ color: '#fff', fontWeight: '800' }}>
                {isSavingBatch ? '💾 Guardando...' : `💾 Guardar ${selectedDates.length} Fechas`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal para agregar nuevo horario */}
      <Modal
        visible={showAddScheduleModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Agregar Nuevo Horario</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowAddScheduleModal(false)}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Día de la Semana</Text>
              <View style={styles.pickerContainer}>
                <TouchableOpacity
                  style={styles.pickerButton}
                  onPress={() => setShowDayPickerModal(true)}
                >
                  <Text style={styles.pickerText}>
                    {getDayName(newScheduleData.day)}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#666" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Período del Día</Text>
              <View style={styles.pickerContainer}>
                <TouchableOpacity
                  style={styles.pickerButton}
                  onPress={() => setShowPeriodPickerModal(true)}
                >
                  <Text style={styles.pickerText}>
                    {getTimeSlotName(newScheduleData.timeSlot)}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#666" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Hora de Inicio</Text>
              <View style={styles.pickerContainer}>
                <TouchableOpacity
                  style={styles.pickerButton}
                  onPress={() => {
                    // Aquí se podría implementar un picker de hora
                    Alert.alert('Seleccionar Hora Inicio', 'Funcionalidad de picker de hora');
                  }}
                >
                  <Text style={styles.pickerText}>
                    {newScheduleData.startTime}
                  </Text>
                  <Ionicons name="time" size={20} color="#666" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Hora de Fin</Text>
              <View style={styles.pickerContainer}>
                <TouchableOpacity
                  style={styles.pickerButton}
                  onPress={() => {
                    // Aquí se podría implementar un picker de hora
                    Alert.alert('Seleccionar Hora Fin', 'Funcionalidad de picker de hora');
                  }}
                >
                  <Text style={styles.pickerText}>
                    {newScheduleData.endTime}
                  </Text>
                  <Ionicons name="time" size={20} color="#666" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Disponibilidad</Text>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  newScheduleData.isAvailable && styles.toggleButtonActive
                ]}
                onPress={() => setNewScheduleData(prev => ({
                  ...prev,
                  isAvailable: !prev.isAvailable
                }))}
              >
                <Text style={[
                  styles.toggleButtonText,
                  newScheduleData.isAvailable && styles.toggleButtonTextActive
                ]}>
                  {newScheduleData.isAvailable ? 'Disponible' : 'No Disponible'}
                </Text>
                <Ionicons
                  name={newScheduleData.isAvailable ? "checkmark-circle" : "close-circle"}
                  size={20}
                  color={newScheduleData.isAvailable ? "#4CAF50" : "#F44336"}
                />
              </TouchableOpacity>
            </View>
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setShowAddScheduleModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.modalButton, styles.saveButton]}
              onPress={addNewSchedule}
            >
              <Text style={styles.saveButtonText}>Agregar Horario</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal para seleccionar día */}
      <Modal
        visible={showDayPickerModal}
        animationType="slide"
        presentationStyle="overFullScreen"
        transparent={true}
      >
        <View style={styles.dayPickerOverlay}>
          <View style={styles.dayPickerContainer}>
            <View style={styles.dayPickerHeader}>
              <Text style={styles.dayPickerTitle}>Seleccionar Día</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowDayPickerModal(false)}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.dayPickerContent}>
              {availableDays.map((day) => (
                <TouchableOpacity
                  key={day.key}
                  style={[
                    styles.dayOption,
                    newScheduleData.day === day.key && styles.dayOptionSelected
                  ]}
                  onPress={() => selectDay(day.key)}
                >
                  <Text style={[
                    styles.dayOptionText,
                    newScheduleData.day === day.key && styles.dayOptionTextSelected
                  ]}>
                    {day.name}
                  </Text>
                  {newScheduleData.day === day.key && (
                    <Ionicons name="checkmark" size={20} color="#4CAF50" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal para seleccionar período */}
      <Modal
        visible={showPeriodPickerModal}
        animationType="slide"
        presentationStyle="overFullScreen"
        transparent={true}
      >
        <View style={styles.dayPickerOverlay}>
          <View style={styles.dayPickerContainer}>
            <View style={styles.dayPickerHeader}>
              <Text style={styles.dayPickerTitle}>Seleccionar Período</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowPeriodPickerModal(false)}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.dayPickerContent}>
              {availablePeriods.map((period) => (
                <TouchableOpacity
                  key={period.key}
                  style={[
                    styles.dayOption,
                    newScheduleData.timeSlot === period.key && styles.dayOptionSelected
                  ]}
                  onPress={() => selectPeriod(period.key)}
                >
                  <View style={styles.periodInfo}>
                    <Text style={[
                      styles.dayOptionText,
                      newScheduleData.timeSlot === period.key && styles.dayOptionTextSelected
                    ]}>
                      {period.name}
                    </Text>
                    <Text style={[
                      styles.periodTimeRange,
                      newScheduleData.timeSlot === period.key && styles.dayOptionTextSelected
                    ]}>
                      {period.timeRange}
                    </Text>
                  </View>
                  {newScheduleData.timeSlot === period.key && (
                    <Ionicons name="checkmark" size={20} color="#4CAF50" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showGhRescheduleModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeGhRescheduleModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity style={styles.closeButton} onPress={closeGhRescheduleModal}>
              <Ionicons name="arrow-back" size={24} color="#666" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Reprogramar cita</Text>
            <View style={styles.closeButton} />
          </View>
          <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
            {ghRescheduleTarget ? (
              <>
                <Text style={styles.scheduleSectionDescription}>
                  {ghRescheduleTarget.service} ·{' '}
                  {ghRescheduleTarget.clientName || ghRescheduleTarget.patientName || 'Paciente'}
                </Text>
                <Text style={[styles.sectionSubtitle, { marginTop: 8 }]}>
                  Elegí nueva fecha y hora. El paciente recibirá una notificación.
                </Text>
                <Text style={[styles.formLabel, { marginTop: 16 }]}>Nueva fecha</Text>
                <CustomCalendar
                  onDateSelect={(dateString) => {
                    setGhRescheduleDate(dateString);
                    setGhRescheduleTime('');
                  }}
                  markedDates={ghRescheduleMarkedDates}
                  selectedDate={ghRescheduleDate}
                />
                <Text style={[styles.formLabel, { marginTop: 16 }]}>Hora</Text>
                <TimeSlotSelector
                  selectedTime={ghRescheduleTime}
                  onTimeSelect={(t) => setGhRescheduleTime(t)}
                  selectedDate={ghRescheduleDate}
                  professionalId={professionalUid}
                  clinicId={user?.clinicId || '1'}
                  serviceId={ghRescheduleTarget.serviceId || '1'}
                  placeholder="Seleccionar horario..."
                />
                <View style={[styles.actionButtons, { marginTop: 24, marginBottom: 32 }]}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.secondaryButton]}
                    onPress={closeGhRescheduleModal}
                  >
                    <Text style={styles.secondaryButtonText}>Cerrar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      styles.acceptButton,
                      (!ghRescheduleDate || !ghRescheduleTime) && { opacity: 0.45 },
                    ]}
                    disabled={!ghRescheduleDate || !ghRescheduleTime}
                    onPress={confirmGhReschedule}
                  >
                    <Text style={styles.actionButtonText}>Confirmar</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : null}
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
}

// Pantalla de Pacientes Profesional
function ProfessionalPatientsScreen() {
  const { user, toggleUserType } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Estados para el modal de agregar paciente
  const [showAddPatientModal, setShowAddPatientModal] = useState(false);
  const [newPatient, setNewPatient] = useState({
    name: '',
    phone: '',
    email: '',
    dateOfBirth: '',
    address: '',
    emergencyContact: '',
    medicalHistory: '',
    diagnosis: '',
    treatmentPlan: '',
    insurance: '',
    occupation: '',
    maritalStatus: '',
    emergencyContactPhone: '',
    emergencyContactRelationship: '',
    notes: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Estados para el modal de agendar cita
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedPatientForSchedule, setSelectedPatientForSchedule] = useState<any>(null);
  const [newAppointment, setNewAppointment] = useState({
    service: '',
    date: '',
    time: '',
    notes: '',
  });
  const [isScheduling, setIsScheduling] = useState(false);

  // Estados para gestión avanzada de pacientes
  const [showPatientDetailsModal, setShowPatientDetailsModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [showEditPatientModal, setShowEditPatientModal] = useState(false);
  const [editingPatient, setEditingPatient] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [patientToDelete, setPatientToDelete] = useState<any>(null);
  
  // Estados para filtros y ordenamiento
  const [patientFilter, setPatientFilter] = useState('all'); // all, active, new, inactive
  const [patientSortBy, setPatientSortBy] = useState('name'); // name, lastVisit, nextAppointment, sessions
  const [showFilters, setShowFilters] = useState(false);
  
  // Estados para estadísticas
  const [showStatsModal, setShowStatsModal] = useState(false);
  
  // Estados para exportar datos
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState('csv');

  // Función para calcular edad
  const calculateAge = (dateOfBirth: string) => {
    if (!dateOfBirth) return '';
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age.toString();
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const [patients, setPatients] = useState([
    {
      id: '1',
      name: 'María González',
      lastVisit: '2024-01-10',
      nextAppointment: '2024-01-15',
      status: 'Activo',
      phone: '+1234567890',
      email: 'maria.gonzalez@email.com',
      age: '35',
      diagnosis: 'Ansiedad y estrés laboral',
      treatmentPlan: 'Terapia cognitivo-conductual',
      sessionsCompleted: 8,
      dateOfBirth: '1989-05-15',
      address: 'Calle Principal 123, Ciudad',
      emergencyContact: 'Carlos González',
      emergencyContactPhone: '+1234567891',
      emergencyContactRelationship: 'Esposo',
      insurance: 'Seguro Médico ABC',
      occupation: 'Contadora',
      maritalStatus: 'Casada',
      medicalHistory: 'Sin antecedentes médicos relevantes',
      notes: 'Paciente muy comprometida con su tratamiento',
      createdAt: '2023-06-01',
      lastUpdated: '2024-01-10',
    },
    {
      id: '2',
      name: 'Carlos Ruiz',
      lastVisit: '2024-01-08',
      nextAppointment: '2024-01-16',
      status: 'Activo',
      phone: '+1234567891',
      email: 'carlos.ruiz@email.com',
      age: '42',
      diagnosis: 'Depresión moderada',
      treatmentPlan: 'Terapia interpersonal + medicación',
      sessionsCompleted: 12,
      dateOfBirth: '1982-03-22',
      address: 'Avenida Central 456, Ciudad',
      emergencyContact: 'Ana Ruiz',
      emergencyContactPhone: '+1234567892',
      emergencyContactRelationship: 'Hermana',
      insurance: 'Seguro Médico XYZ',
      occupation: 'Ingeniero',
      maritalStatus: 'Soltero',
      medicalHistory: 'Historial de depresión familiar',
      notes: 'Paciente responde bien a la medicación',
      createdAt: '2023-04-15',
      lastUpdated: '2024-01-08',
    },
    {
      id: '3',
      name: 'Ana Martínez',
      lastVisit: '2024-01-05',
      nextAppointment: '2024-01-18',
      status: 'Nuevo',
      phone: '+1234567892',
      email: 'ana.martinez@email.com',
      age: '28',
      diagnosis: 'Evaluación inicial',
      treatmentPlan: 'Pendiente de evaluación',
      sessionsCompleted: 1,
      dateOfBirth: '1996-08-10',
      address: 'Calle Nueva 789, Ciudad',
      emergencyContact: 'Miguel Martínez',
      emergencyContactPhone: '+1234567893',
      emergencyContactRelationship: 'Padre',
      insurance: 'Seguro Médico DEF',
      occupation: 'Estudiante',
      maritalStatus: 'Soltera',
      medicalHistory: 'Sin antecedentes médicos',
      notes: 'Primera consulta, requiere evaluación completa',
      createdAt: '2024-01-05',
      lastUpdated: '2024-01-05',
    },
    {
      id: '4',
      name: 'Luis Rodríguez',
      lastVisit: '2024-01-03',
      nextAppointment: '2024-01-20',
      status: 'Activo',
      phone: '+1234567893',
      email: 'luis.rodriguez@email.com',
      age: '39',
      diagnosis: 'Problemas de pareja',
      treatmentPlan: 'Terapia familiar sistémica',
      sessionsCompleted: 6,
      dateOfBirth: '1985-11-18',
      address: 'Avenida Norte 321, Ciudad',
      emergencyContact: 'Sofía Rodríguez',
      emergencyContactPhone: '+1234567894',
      emergencyContactRelationship: 'Esposa',
      insurance: 'Seguro Médico GHI',
      occupation: 'Abogado',
      maritalStatus: 'Casado',
      medicalHistory: 'Sin antecedentes médicos relevantes',
      notes: 'Paciente comprometido con la terapia familiar',
      createdAt: '2023-09-15',
      lastUpdated: '2024-01-03',
    },
    {
      id: '5',
      name: 'Patricia López',
      lastVisit: '2024-01-01',
      nextAppointment: '2024-01-22',
      status: 'Activo',
      phone: '+1234567894',
      email: 'patricia.lopez@email.com',
      age: '45',
      diagnosis: 'Trastorno de ansiedad generalizada',
      treatmentPlan: 'Terapia de aceptación y compromiso',
      sessionsCompleted: 15,
      dateOfBirth: '1979-04-25',
      address: 'Calle Sur 654, Ciudad',
      emergencyContact: 'Roberto López',
      emergencyContactPhone: '+1234567895',
      emergencyContactRelationship: 'Hermano',
      insurance: 'Seguro Médico JKL',
      occupation: 'Maestra',
      maritalStatus: 'Divorciada',
      medicalHistory: 'Historial de ansiedad familiar',
      notes: 'Paciente muy disciplinada con ejercicios de relajación',
      createdAt: '2022-11-10',
      lastUpdated: '2024-01-01',
    },
    {
      id: '6',
      name: 'Roberto Silva',
      lastVisit: '2023-12-28',
      nextAppointment: '2024-01-25',
      status: 'Activo',
      phone: '+1234567895',
      email: 'roberto.silva@email.com',
      age: '31',
      diagnosis: 'Trastorno de pánico',
      treatmentPlan: 'Terapia de exposición + relajación',
      sessionsCompleted: 10,
      dateOfBirth: '1993-02-14',
      address: 'Avenida Este 987, Ciudad',
      emergencyContact: 'Laura Silva',
      emergencyContactPhone: '+1234567896',
      emergencyContactRelationship: 'Madre',
      insurance: 'Seguro Médico MNO',
      occupation: 'Diseñador',
      maritalStatus: 'Soltero',
      medicalHistory: 'Sin antecedentes médicos',
      notes: 'Paciente progresando bien con la terapia de exposición',
      createdAt: '2023-07-20',
      lastUpdated: '2023-12-28',
    },
    {
      id: '7',
      name: 'Carmen Herrera',
      lastVisit: '2023-12-25',
      nextAppointment: '2024-01-26',
      status: 'Activo',
      phone: '+1234567896',
      email: 'carmen.herrera@email.com',
      age: '38',
      diagnosis: 'Trastorno obsesivo-compulsivo',
      treatmentPlan: 'Terapia cognitivo-conductual + ERP',
      sessionsCompleted: 18,
      dateOfBirth: '1986-09-30',
      address: 'Calle Oeste 147, Ciudad',
      emergencyContact: 'Jorge Herrera',
      emergencyContactPhone: '+1234567897',
      emergencyContactRelationship: 'Esposo',
      insurance: 'Seguro Médico PQR',
      occupation: 'Enfermera',
      maritalStatus: 'Casada',
      medicalHistory: 'Historial de TOC en familia',
      notes: 'Paciente muy comprometida con ERP',
      createdAt: '2022-06-15',
      lastUpdated: '2023-12-25',
    },
    {
      id: '8',
      name: 'Fernando Vargas',
      lastVisit: '2023-12-20',
      nextAppointment: '2024-01-29',
      status: 'Activo',
      phone: '+1234567897',
      email: 'fernando.vargas@email.com',
      age: '52',
      diagnosis: 'Trastorno de estrés postraumático',
      treatmentPlan: 'EMDR + terapia de procesamiento',
      sessionsCompleted: 22,
      dateOfBirth: '1972-12-05',
      address: 'Avenida Principal 258, Ciudad',
      emergencyContact: 'Elena Vargas',
      emergencyContactPhone: '+1234567898',
      emergencyContactRelationship: 'Esposa',
      insurance: 'Seguro Médico STU',
      occupation: 'Policía',
      maritalStatus: 'Casado',
      medicalHistory: 'Ex militar, exposición a eventos traumáticos',
      notes: 'Paciente respondiendo bien a EMDR',
      createdAt: '2022-03-10',
      lastUpdated: '2023-12-20',
    },
  ]);

  const handleAddNewPatient = () => {
    setShowAddPatientModal(true);
  };

  const handleSubmitNewPatient = async () => {
    if (!newPatient.name.trim() || !newPatient.phone.trim()) {
      Alert.alert('Error', 'El nombre y teléfono son campos obligatorios');
      return;
    }

    setIsSubmitting(true);
    try {
      // Simular proceso de guardado
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Aquí implementarías la lógica real para guardar el paciente
      const patientToAdd = {
        id: Date.now().toString(),
        name: newPatient.name.trim(),
        lastVisit: new Date().toISOString().split('T')[0],
        nextAppointment: '',
        status: 'Nuevo',
        phone: newPatient.phone.trim(),
        email: newPatient.email.trim(),
        age: newPatient.dateOfBirth ? calculateAge(newPatient.dateOfBirth) : '',
        diagnosis: newPatient.diagnosis || 'Pendiente de evaluación',
        treatmentPlan: newPatient.treatmentPlan || 'Pendiente de planificación',
        sessionsCompleted: 0,
        dateOfBirth: newPatient.dateOfBirth,
        address: newPatient.address,
        emergencyContact: newPatient.emergencyContact,
        emergencyContactPhone: newPatient.emergencyContactPhone || '',
        emergencyContactRelationship: newPatient.emergencyContactRelationship || '',
        insurance: newPatient.insurance || '',
        occupation: newPatient.occupation || '',
        maritalStatus: newPatient.maritalStatus || '',
        medicalHistory: newPatient.medicalHistory,
        notes: newPatient.notes || '',
        createdAt: new Date().toISOString().split('T')[0],
        lastUpdated: new Date().toISOString().split('T')[0],
      };

      // Agregar el paciente a la lista usando setPatients
      setPatients(prevPatients => [...prevPatients, patientToAdd]);

      Alert.alert(
        '✅ Paciente Agregado',
        `${patientToAdd.name} ha sido agregado exitosamente a tu lista de pacientes.`,
        [
          {
            text: 'OK',
            onPress: () => {
              setShowAddPatientModal(false);
              resetNewPatientForm();
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert('❌ Error', 'No se pudo agregar el paciente. Inténtalo de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetNewPatientForm = () => {
    setNewPatient({
      name: '',
      phone: '',
      email: '',
      dateOfBirth: '',
      address: '',
      emergencyContact: '',
      medicalHistory: '',
      diagnosis: '',
      treatmentPlan: '',
      insurance: '',
      occupation: '',
      maritalStatus: '',
      emergencyContactPhone: '',
      emergencyContactRelationship: '',
      notes: '',
    });
  };

  const handleCancelAddPatient = () => {
    Alert.alert(
      'Cancelar',
      '¿Estás seguro de que quieres cancelar? Se perderán los datos ingresados.',
      [
        { text: 'Continuar Editando', style: 'cancel' },
        {
          text: 'Sí, Cancelar',
          style: 'destructive',
          onPress: () => {
            setShowAddPatientModal(false);
            resetNewPatientForm();
          },
        },
      ]
    );
  };

  const handleScheduleAppointment = (patient: any) => {
    setSelectedPatientForSchedule(patient);
    setNewAppointment({
      service: '',
      date: '',
      time: '',
      notes: '',
    });
    setShowScheduleModal(true);
  };

  const handleSubmitAppointment = async () => {
    if (!newAppointment.service.trim() || !newAppointment.date.trim() || !newAppointment.time.trim()) {
      Alert.alert('Error', 'Por favor completa todos los campos obligatorios');
      return;
    }

    setIsScheduling(true);
    try {
      // Simular proceso de programación
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Aquí implementarías la lógica real para programar la cita
      Alert.alert(
        '✅ Cita Programada',
        `Cita programada exitosamente para ${selectedPatientForSchedule.name} el ${newAppointment.date} a las ${newAppointment.time}.`,
        [
          {
            text: 'OK',
            onPress: () => {
              setShowScheduleModal(false);
              setSelectedPatientForSchedule(null);
              setNewAppointment({ service: '', date: '', time: '', notes: '' });
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert('❌ Error', 'No se pudo programar la cita. Inténtalo de nuevo.');
    } finally {
      setIsScheduling(false);
    }
  };

  const resetAppointmentForm = () => {
    setNewAppointment({
      service: '',
      date: '',
      time: '',
      notes: '',
    });
  };

  const handleCancelSchedule = () => {
    Alert.alert(
      'Cancelar Programación',
      '¿Estás seguro de que quieres cancelar? Se perderán los datos ingresados.',
      [
        { text: 'Continuar Editando', style: 'cancel' },
        {
          text: 'Sí, Cancelar',
          style: 'destructive',
          onPress: () => {
            setShowScheduleModal(false);
            setSelectedPatientForSchedule(null);
            resetAppointmentForm();
          },
        },
      ]
    );
  };

  // Funciones avanzadas de gestión de pacientes
  const handleViewPatientDetails = (patient: any) => {
    setSelectedPatient(patient);
    setShowPatientDetailsModal(true);
  };

  const handleEditPatient = (patient: any) => {
    setEditingPatient({ ...patient });
    setShowEditPatientModal(true);
  };

  const handleDeletePatient = (patient: any) => {
    setPatientToDelete(patient);
    setShowDeleteConfirmation(true);
  };

  const confirmDeletePatient = () => {
    if (patientToDelete) {
      setPatients(prevPatients => 
        prevPatients.filter(p => p.id !== patientToDelete.id)
      );
      setShowDeleteConfirmation(false);
      setPatientToDelete(null);
      Alert.alert('✅ Paciente Eliminado', `${patientToDelete.name} ha sido eliminado de tu lista de pacientes.`);
    }
  };

  const handleSaveEditPatient = async () => {
    if (!editingPatient.name.trim() || !editingPatient.phone.trim()) {
      Alert.alert('Error', 'El nombre y teléfono son campos obligatorios');
      return;
    }

    setIsEditing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setPatients(prevPatients => 
        prevPatients.map(p => 
          p.id === editingPatient.id ? { ...editingPatient, lastUpdated: new Date().toISOString().split('T')[0] } : p
        )
      );

      Alert.alert('✅ Paciente Actualizado', `${editingPatient.name} ha sido actualizado exitosamente.`);
      setShowEditPatientModal(false);
      setEditingPatient(null);
    } catch (error) {
      Alert.alert('❌ Error', 'No se pudo actualizar el paciente. Inténtalo de nuevo.');
    } finally {
      setIsEditing(false);
    }
  };

  const handleCallPatient = (patient: any) => {
    Alert.alert(
      'Llamar Paciente',
      `¿Deseas llamar a ${patient.name}?\n\nTeléfono: ${patient.phone}`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Llamar', onPress: () => console.log('Llamando a:', patient.phone) }
      ]
    );
  };

  const handleEmailPatient = (patient: any) => {
    Alert.alert(
      'Enviar Email',
      `¿Deseas enviar un email a ${patient.name}?\n\nEmail: ${patient.email}`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Enviar Email', onPress: () => console.log('Enviando email a:', patient.email) }
      ]
    );
  };

  // Funciones de filtrado y ordenamiento
  const getFilteredPatients = () => {
    let filteredPatients = [...patients];
    
    // Aplicar filtros
    if (patientFilter === 'active') {
      filteredPatients = filteredPatients.filter(p => p.status === 'Activo');
    } else if (patientFilter === 'new') {
      filteredPatients = filteredPatients.filter(p => p.status === 'Nuevo');
    } else if (patientFilter === 'inactive') {
      filteredPatients = filteredPatients.filter(p => p.status === 'Inactivo');
    }
    
    // Aplicar búsqueda
    if (searchQuery && searchQuery.trim()) {
      const query = (searchQuery || '').toLowerCase();
      filteredPatients = filteredPatients.filter(p =>
        p.name && p.name.toLowerCase().includes(query) ||
        p.email && p.email.toLowerCase().includes(query) ||
        p.phone && p.phone.includes(query) ||
        p.diagnosis && p.diagnosis.toLowerCase().includes(query)
      );
    }
    
    // Aplicar ordenamiento
    filteredPatients.sort((a, b) => {
      switch (patientSortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'lastVisit':
          return new Date(b.lastVisit).getTime() - new Date(a.lastVisit).getTime();
        case 'nextAppointment':
          return new Date(a.nextAppointment || '9999-12-31').getTime() - new Date(b.nextAppointment || '9999-12-31').getTime();
        case 'sessions':
          return b.sessionsCompleted - a.sessionsCompleted;
        default:
          return 0;
      }
    });
    
    return filteredPatients;
  };

  const getPatientStats = () => {
    const totalPatients = patients.length;
    const activePatients = patients.filter(p => p.status === 'Activo').length;
    const newPatients = patients.filter(p => p.status === 'Nuevo').length;
    const totalSessions = patients.reduce((sum, p) => sum + p.sessionsCompleted, 0);
    const avgSessionsPerPatient = totalPatients > 0 ? (totalSessions / totalPatients).toFixed(1) : '0';
    
    return {
      totalPatients,
      activePatients,
      newPatients,
      totalSessions,
      avgSessionsPerPatient,
    };
  };

  const handleExportPatients = () => {
    const stats = getPatientStats();
    const exportData = {
      stats,
      patients: getFilteredPatients(),
      exportDate: new Date().toISOString(),
      format: exportFormat,
    };
    
    console.log('Exportando datos:', exportData);
    Alert.alert('✅ Datos Exportados', `Se han exportado ${exportData.patients.length} pacientes en formato ${exportFormat.toUpperCase()}.`);
    setShowExportModal(false);
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Gestión de Pacientes</Text>
            <Text style={styles.headerSubtitle}>Administra tu lista de pacientes</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.headerButton, styles.statsButton]}
              onPress={() => setShowStatsModal(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="analytics" size={18} color="#FF9800" />
              <Text style={styles.statsButtonText}>Estadísticas</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.headerButton, styles.exportButton]}
              onPress={() => setShowExportModal(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="download" size={18} color="#667eea" />
              <Text style={styles.exportButtonText}>Exportar</Text>
            </TouchableOpacity>
            
          <TouchableOpacity
            style={styles.addPatientButton}
            onPress={handleAddNewPatient}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={20} color="white" />
            <Text style={styles.addPatientButtonText}>Nuevo Paciente</Text>
          </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar pacientes..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Filtros y ordenamiento */}
      <View style={styles.filtersContainer}>
        <View style={styles.filterButtonsRow}>
          <TouchableOpacity
            style={[styles.filterButton, patientFilter === 'all' && styles.filterButtonActive]}
            onPress={() => setPatientFilter('all')}
          >
            <Text style={[styles.filterButtonText, patientFilter === 'all' && styles.filterButtonTextActive]}>
              Todos ({patients.length})
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.filterButton, patientFilter === 'active' && styles.filterButtonActive]}
            onPress={() => setPatientFilter('active')}
          >
            <Text style={[styles.filterButtonText, patientFilter === 'active' && styles.filterButtonTextActive]}>
              Activos ({patients.filter(p => p.status === 'Activo').length})
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.filterButton, patientFilter === 'new' && styles.filterButtonActive]}
            onPress={() => setPatientFilter('new')}
          >
            <Text style={[styles.filterButtonText, patientFilter === 'new' && styles.filterButtonTextActive]}>
              Nuevos ({patients.filter(p => p.status === 'Nuevo').length})
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sortContainer}>
          <TouchableOpacity
            style={styles.sortButton}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Ionicons name="funnel" size={16} color="#667eea" />
            <Text style={styles.sortButtonText}>Ordenar</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Opciones de ordenamiento */}
      {showFilters && (
        <View style={styles.sortOptionsContainer}>
          <Text style={styles.sortOptionsTitle}>Ordenar por:</Text>
          <View style={styles.sortOptionsRow}>
            <TouchableOpacity
              style={[styles.sortOptionButton, patientSortBy === 'name' && styles.sortOptionButtonActive]}
              onPress={() => setPatientSortBy('name')}
            >
              <Text style={[styles.sortOptionText, patientSortBy === 'name' && styles.sortOptionTextActive]}>
                Nombre
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.sortOptionButton, patientSortBy === 'lastVisit' && styles.sortOptionButtonActive]}
              onPress={() => setPatientSortBy('lastVisit')}
            >
              <Text style={[styles.sortOptionText, patientSortBy === 'lastVisit' && styles.sortOptionTextActive]}>
                Última visita
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.sortOptionButton, patientSortBy === 'nextAppointment' && styles.sortOptionButtonActive]}
              onPress={() => setPatientSortBy('nextAppointment')}
            >
              <Text style={[styles.sortOptionText, patientSortBy === 'nextAppointment' && styles.sortOptionTextActive]}>
                Próxima cita
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.sortOptionButton, patientSortBy === 'sessions' && styles.sortOptionButtonActive]}
              onPress={() => setPatientSortBy('sessions')}
            >
              <Text style={[styles.sortOptionText, patientSortBy === 'sessions' && styles.sortOptionTextActive]}>
                Sesiones
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.statsContainer}>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Ionicons name="people" size={24} color="#4CAF50" />
            <Text style={styles.statNumber}>{getPatientStats().totalPatients}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="checkmark-circle" size={24} color="#2196F3" />
            <Text style={styles.statNumber}>{getPatientStats().activePatients}</Text>
            <Text style={styles.statLabel}>Activos</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="star" size={24} color="#FF9800" />
            <Text style={styles.statNumber}>{getPatientStats().newPatients}</Text>
            <Text style={styles.statLabel}>Nuevos</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="trending-up" size={24} color="#9C27B0" />
            <Text style={styles.statNumber}>{getPatientStats().avgSessionsPerPatient}</Text>
            <Text style={styles.statLabel}>Promedio</Text>
          </View>
        </View>
      </View>

      <View style={styles.patientsList}>
        {getFilteredPatients().map((patient) => (
          <View key={patient.id} style={styles.patientCard}>
            <View style={styles.patientHeader}>
              <View style={styles.patientHeaderLeft}>
              <Text style={styles.patientName}>{patient.name}</Text>
                <View style={styles.patientSubInfo}>
                  <Text style={styles.patientAge}>{patient.age} años</Text>
                  <Text style={styles.patientOccupation}>{patient.occupation}</Text>
                </View>
              </View>
              <View style={styles.patientHeaderRight}>
              <View style={[
                styles.statusBadge,
                { backgroundColor: patient.status === 'Nuevo' ? '#FF9800' : '#4CAF50' }
              ]}>
                <Text style={styles.statusText}>{patient.status}</Text>
              </View>
                <TouchableOpacity
                  style={styles.moreOptionsButton}
                  onPress={() => {
                    Alert.alert(
                      'Opciones del Paciente',
                      `¿Qué deseas hacer con ${patient.name}?`,
                      [
                        { text: 'Ver Detalles', onPress: () => handleViewPatientDetails(patient) },
                        { text: 'Editar', onPress: () => handleEditPatient(patient) },
                        { text: 'Agendar Cita', onPress: () => handleScheduleAppointment(patient) },
                        { text: 'Llamar', onPress: () => handleCallPatient(patient) },
                        { text: 'Enviar Email', onPress: () => handleEmailPatient(patient) },
                        { text: 'Cancelar', style: 'cancel' },
                        { 
                          text: 'Eliminar', 
                          style: 'destructive',
                          onPress: () => handleDeletePatient(patient)
                        },
                      ]
                    );
                  }}
                >
                  <Ionicons name="ellipsis-vertical" size={20} color="#666" />
                </TouchableOpacity>
            </View>
            </View>
            
            <View style={styles.patientInfo}>
              <View style={styles.infoRow}>
                <Ionicons name="call" size={16} color="#666" />
                <Text style={styles.infoText}>{patient.phone}</Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="mail" size={16} color="#666" />
                <Text style={styles.infoText}>{patient.email}</Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="calendar" size={16} color="#666" />
                <Text style={styles.infoText}>Próxima: {patient.nextAppointment || 'Sin programar'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="medical" size={16} color="#666" />
                <Text style={styles.infoText}>{patient.diagnosis}</Text>
            </View>
            </View>
            
                          <View style={styles.patientStats}>
                <View style={styles.statItem}>
                  <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                  <Text style={styles.statText}>{patient.sessionsCompleted} sesiones</Text>
                </View>
              <View style={styles.statItem}>
                <Ionicons name="time" size={16} color="#2196F3" />
                <Text style={styles.statText}>Última: {patient.lastVisit}</Text>
              </View>
            </View>
            
            <View style={styles.patientActions}>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => handleScheduleAppointment(patient)}
              >
                <Ionicons name="calendar" size={16} color="white" />
                <Text style={styles.actionButtonText}>Agendar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, styles.secondaryButton]}
                onPress={() => handleCallPatient(patient)}
              >
                <Ionicons name="call" size={16} color="#667eea" />
                <Text style={styles.secondaryButtonText}>Llamar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, styles.tertiaryButton]}
                onPress={() => handleEmailPatient(patient)}
              >
                <Ionicons name="mail" size={16} color="#FF9800" />
                <Text style={styles.tertiaryButtonText}>Email</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
        
        {getFilteredPatients().length === 0 && (
          <View style={styles.noPatientsContainer}>
            <Ionicons name="people-outline" size={80} color="#ddd" />
            <Text style={styles.noPatientsTitle}>
              {searchQuery.trim() ? 'No se encontraron pacientes' : 'No hay pacientes registrados'}
            </Text>
            <Text style={styles.noPatientsSubtitle}>
              {searchQuery.trim() 
                ? 'Intenta con otro término de búsqueda o cambia los filtros'
                : 'Comienza agregando tu primer paciente'
              }
            </Text>
            {!searchQuery.trim() && (
              <TouchableOpacity
                style={styles.noPatientsAddButton}
                onPress={handleAddNewPatient}
                activeOpacity={0.8}
              >
                <Ionicons name="add-circle" size={20} color="white" />
                <Text style={styles.noPatientsAddButtonText}>Agregar Primer Paciente</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>



      {/* Modal para agregar nuevo paciente */}
      <Modal
        visible={showAddPatientModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Agregar Nuevo Paciente</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleCancelAddPatient}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Información Personal */}
            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>Información Personal</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.formLabel}>Nombre Completo *</Text>
                <TextInput
                  style={styles.textInput}
                  value={newPatient.name}
                  onChangeText={(text) => setNewPatient(prev => ({ ...prev, name: text }))}
                  placeholder="Ingresa el nombre completo"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.formLabel}>Teléfono *</Text>
                <TextInput
                  style={styles.textInput}
                  value={newPatient.phone}
                  onChangeText={(text) => setNewPatient(prev => ({ ...prev, phone: text }))}
                  placeholder="+1234567890"
                  placeholderTextColor="#999"
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.formLabel}>Email</Text>
                <TextInput
                  style={styles.textInput}
                  value={newPatient.email}
                  onChangeText={(text) => setNewPatient(prev => ({ ...prev, email: text }))}
                  placeholder="paciente@email.com"
                  placeholderTextColor="#999"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.formLabel}>Fecha de Nacimiento</Text>
                <TextInput
                  style={styles.textInput}
                  value={newPatient.dateOfBirth}
                  onChangeText={(text) => setNewPatient(prev => ({ ...prev, dateOfBirth: text }))}
                  placeholder="DD/MM/AAAA"
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            {/* Información de Contacto */}
            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>Información de Contacto</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.formLabel}>Dirección</Text>
                <TextInput
                  style={styles.textInput}
                  value={newPatient.address}
                  onChangeText={(text) => setNewPatient(prev => ({ ...prev, address: text }))}
                  placeholder="Ingresa la dirección completa"
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={2}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.formLabel}>Contacto de Emergencia</Text>
                <TextInput
                  style={styles.textInput}
                  value={newPatient.emergencyContact}
                  onChangeText={(text) => setNewPatient(prev => ({ ...prev, emergencyContact: text }))}
                  placeholder="Nombre y teléfono del contacto de emergencia"
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            {/* Información Médica */}
            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>Información Médica</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.formLabel}>Historial Médico</Text>
                <TextInput
                  style={styles.textInput}
                  value={newPatient.medicalHistory}
                  onChangeText={(text) => setNewPatient(prev => ({ ...prev, medicalHistory: text }))}
                  placeholder="Condiciones médicas, alergias, medicamentos..."
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={handleCancelAddPatient}
              disabled={isSubmitting}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.modalButton, styles.saveButton]}
              onPress={handleSubmitNewPatient}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Text style={styles.saveButtonText}>Guardando...</Text>
              ) : (
                <Text style={styles.saveButtonText}>Guardar Paciente</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal para programar cita */}
      <Modal
        visible={showScheduleModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Programar Cita</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleCancelSchedule}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {selectedPatientForSchedule && (
              <>
                <View style={styles.patientInfoCard}>
                  <Text style={styles.patientInfoTitle}>Información del Paciente</Text>
                  <View style={styles.patientInfoRow}>
                    <Ionicons name="person" size={16} color="#667eea" />
                    <Text style={styles.patientInfoText}>
                      {selectedPatientForSchedule.name}
                    </Text>
                  </View>
                  <View style={styles.patientInfoRow}>
                    <Ionicons name="call" size={16} color="#667eea" />
                    <Text style={styles.patientInfoText}>
                      {selectedPatientForSchedule.phone}
                    </Text>
                  </View>
                  <View style={styles.patientInfoRow}>
                    <Ionicons name="mail" size={16} color="#667eea" />
                    <Text style={styles.patientInfoText}>
                      {selectedPatientForSchedule.email}
                    </Text>
                  </View>
                </View>

                <View style={styles.formSection}>
                  <Text style={styles.formLabel}>Servicio *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={newAppointment.service}
                    onChangeText={(text) => setNewAppointment(prev => ({ ...prev, service: text }))}
                    placeholder="Ej: Consulta médica, terapia, etc."
                    placeholderTextColor="#999"
                  />
                </View>

                <View style={styles.formSection}>
                  <Text style={styles.formLabel}>Fecha *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={newAppointment.date}
                    onChangeText={(text) => setNewAppointment(prev => ({ ...prev, date: text }))}
                    placeholder="DD/MM/AAAA"
                    placeholderTextColor="#999"
                  />
                </View>

                <View style={styles.formSection}>
                  <Text style={styles.formLabel}>Hora *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={newAppointment.time}
                    onChangeText={(text) => setNewAppointment(prev => ({ ...prev, time: text }))}
                    placeholder="HH:MM"
                    placeholderTextColor="#999"
                  />
                </View>

                <View style={styles.formSection}>
                  <Text style={styles.formLabel}>Notas Adicionales</Text>
                  <TextInput
                    style={styles.textInput}
                    value={newAppointment.notes}
                    onChangeText={(text) => setNewAppointment(prev => ({ ...prev, notes: text }))}
                    placeholder="Observaciones, síntomas, etc."
                    placeholderTextColor="#999"
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </View>
              </>
            )}
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={handleCancelSchedule}
              disabled={isScheduling}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.modalButton, styles.saveButton]}
              onPress={handleSubmitAppointment}
              disabled={isScheduling}
            >
              {isScheduling ? (
                <Text style={styles.saveButtonText}>Programando...</Text>
              ) : (
                <Text style={styles.saveButtonText}>Programar Cita</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal para editar paciente */}
      <Modal
        visible={showEditPatientModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Editar Paciente</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowEditPatientModal(false)}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {editingPatient && (
              <>
                {/* Información Personal */}
                <View style={styles.formSection}>
                  <Text style={styles.formSectionTitle}>Información Personal</Text>
                  
                  <View style={styles.inputGroup}>
                    <Text style={styles.formLabel}>Nombre Completo *</Text>
                    <TextInput
                      style={styles.textInput}
                      value={editingPatient.name}
                      onChangeText={(text) => setEditingPatient(prev => ({ ...prev, name: text }))}
                      placeholder="Nombre y apellidos del paciente"
                      placeholderTextColor="#999"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.formLabel}>Teléfono *</Text>
                    <TextInput
                      style={styles.textInput}
                      value={editingPatient.phone}
                      onChangeText={(text) => setEditingPatient(prev => ({ ...prev, phone: text }))}
                      placeholder="Número de teléfono"
                      placeholderTextColor="#999"
                      keyboardType="phone-pad"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.formLabel}>Email</Text>
                    <TextInput
                      style={styles.textInput}
                      value={editingPatient.email}
                      onChangeText={(text) => setEditingPatient(prev => ({ ...prev, email: text }))}
                      placeholder="Correo electrónico"
                      placeholderTextColor="#999"
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.formLabel}>Fecha de Nacimiento</Text>
                    <TextInput
                      style={styles.textInput}
                      value={editingPatient.dateOfBirth}
                      onChangeText={(text) => setEditingPatient(prev => ({ ...prev, dateOfBirth: text }))}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor="#999"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.formLabel}>Dirección</Text>
                    <TextInput
                      style={styles.textInput}
                      value={editingPatient.address}
                      onChangeText={(text) => setEditingPatient(prev => ({ ...prev, address: text }))}
                      placeholder="Dirección completa"
                      placeholderTextColor="#999"
                      multiline
                      numberOfLines={2}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.formLabel}>Ocupación</Text>
                    <TextInput
                      style={styles.textInput}
                      value={editingPatient.occupation}
                      onChangeText={(text) => setEditingPatient(prev => ({ ...prev, occupation: text }))}
                      placeholder="Profesión u ocupación"
                      placeholderTextColor="#999"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.formLabel}>Estado Civil</Text>
                    <TextInput
                      style={styles.textInput}
                      value={editingPatient.maritalStatus}
                      onChangeText={(text) => setEditingPatient(prev => ({ ...prev, maritalStatus: text }))}
                      placeholder="Soltero, casado, divorciado..."
                      placeholderTextColor="#999"
                    />
                  </View>
                </View>

                {/* Información de Emergencia */}
                <View style={styles.formSection}>
                  <Text style={styles.formSectionTitle}>Contacto de Emergencia</Text>
                  
                  <View style={styles.inputGroup}>
                    <Text style={styles.formLabel}>Nombre del Contacto</Text>
                    <TextInput
                      style={styles.textInput}
                      value={editingPatient.emergencyContact}
                      onChangeText={(text) => setEditingPatient(prev => ({ ...prev, emergencyContact: text }))}
                      placeholder="Nombre del contacto de emergencia"
                      placeholderTextColor="#999"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.formLabel}>Teléfono de Emergencia</Text>
                    <TextInput
                      style={styles.textInput}
                      value={editingPatient.emergencyContactPhone}
                      onChangeText={(text) => setEditingPatient(prev => ({ ...prev, emergencyContactPhone: text }))}
                      placeholder="Teléfono del contacto de emergencia"
                      placeholderTextColor="#999"
                      keyboardType="phone-pad"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.formLabel}>Relación</Text>
                    <TextInput
                      style={styles.textInput}
                      value={editingPatient.emergencyContactRelationship}
                      onChangeText={(text) => setEditingPatient(prev => ({ ...prev, emergencyContactRelationship: text }))}
                      placeholder="Familiar, amigo, etc."
                      placeholderTextColor="#999"
                    />
                  </View>
                </View>

                {/* Información Médica */}
                <View style={styles.formSection}>
                  <Text style={styles.formSectionTitle}>Información Médica</Text>
                  
                  <View style={styles.inputGroup}>
                    <Text style={styles.formLabel}>Diagnóstico</Text>
                    <TextInput
                      style={styles.textInput}
                      value={editingPatient.diagnosis}
                      onChangeText={(text) => setEditingPatient(prev => ({ ...prev, diagnosis: text }))}
                      placeholder="Diagnóstico principal"
                      placeholderTextColor="#999"
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.formLabel}>Plan de Tratamiento</Text>
                    <TextInput
                      style={styles.textInput}
                      value={editingPatient.treatmentPlan}
                      onChangeText={(text) => setEditingPatient(prev => ({ ...prev, treatmentPlan: text }))}
                      placeholder="Plan de tratamiento actual"
                      placeholderTextColor="#999"
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.formLabel}>Historial Médico</Text>
                    <TextInput
                      style={styles.textInput}
                      value={editingPatient.medicalHistory}
                      onChangeText={(text) => setEditingPatient(prev => ({ ...prev, medicalHistory: text }))}
                      placeholder="Condiciones médicas, alergias, medicamentos..."
                      placeholderTextColor="#999"
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.formLabel}>Seguro Médico</Text>
                    <TextInput
                      style={styles.textInput}
                      value={editingPatient.insurance}
                      onChangeText={(text) => setEditingPatient(prev => ({ ...prev, insurance: text }))}
                      placeholder="Compañía de seguro médico"
                      placeholderTextColor="#999"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.formLabel}>Notas Adicionales</Text>
                    <TextInput
                      style={styles.textInput}
                      value={editingPatient.notes}
                      onChangeText={(text) => setEditingPatient(prev => ({ ...prev, notes: text }))}
                      placeholder="Observaciones adicionales"
                      placeholderTextColor="#999"
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                    />
                  </View>
                </View>
              </>
            )}
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setShowEditPatientModal(false)}
              disabled={isEditing}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.modalButton, styles.saveButton]}
              onPress={handleSaveEditPatient}
              disabled={isEditing}
            >
              {isEditing ? (
                <Text style={styles.saveButtonText}>Guardando...</Text>
              ) : (
                <Text style={styles.saveButtonText}>Guardar Cambios</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

export default function ConditionalScreen({ screenName, forceOpenScheduleModal = false, children }: ConditionalScreenProps) {
  const { user } = useAuth();
  const isProfessional = isProfessionalUser(user);

  // Si es profesional, mostrar pantallas específicas
  if (isProfessional) {
    switch (screenName) {
      case 'dashboard':
        return <ProfessionalDashboardScreen />;
      case 'schedule':
        return <ProfessionalScheduleScreen forceOpenScheduleModal={forceOpenScheduleModal} />;
      case 'patients':
        return <ProfessionalPatientsScreen />;
      default:
        return <>{children}</>;
    }
  }

  // Si es cliente, mostrar pantallas normales
  return <>{children}</>;
}

// Estilos condicionales para web y móvil
const getPlatformStyles = () => {
  const isWeb = Platform.OS === 'web';
  const { width } = Dimensions.get('window');
  
  return {
    // Espaciado adaptativo
    padding: isWeb ? 20 : 15,
    margin: isWeb ? 10 : 8,
    
    // Tamaños de fuente adaptativos
    titleFontSize: isWeb ? 24 : 22,
    subtitleFontSize: isWeb ? 16 : 14,
    bodyFontSize: isWeb ? 14 : 13,
    
    // Bordes y sombras
    borderRadius: isWeb ? 8 : 6,
    shadowProps: isWeb ? {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
    } : {
      elevation: 3,
    },
    
    // Layout responsivo
    maxWidth: width > 768 ? '80%' : '100%',
    containerPadding: width > 768 ? 30 : 20,
  };
};

const platformStyles = getPlatformStyles();

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: platformStyles.padding,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  exportButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e1e1e1',
  },
  exportButtonText: {
    color: '#667eea',
    fontSize: 14,
    fontWeight: '600',
  },
  statsButton: {
    backgroundColor: '#fff3e0',
    borderWidth: 1,
    borderColor: '#ffcc80',
  },
  statsButtonText: {
    color: '#FF9800',
    fontSize: 14,
    fontWeight: '600',
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: platformStyles.titleFontSize,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  addPatientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#667eea',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  addPatientButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  headerLeft: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  dateText: {
    fontSize: 16,
    color: '#666',
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e1e1e1',
    backgroundColor: '#f8f9fa',
  },
  toggleButtonActive: {
    backgroundColor: '#e8f5e8',
    borderColor: '#4CAF50',
  },
  toggleButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  toggleButtonTextActive: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  pickerContainer: {
    marginBottom: 16,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e1e1e1',
    backgroundColor: 'white',
  },
      pickerText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  dayPickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayPickerContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  dayPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  dayPickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  dayPickerContent: {
    padding: 20,
  },
  dayOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f8f9fa',
  },
  dayOptionSelected: {
    backgroundColor: '#e8f5e8',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  dayOptionText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  dayOptionTextSelected: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  periodInfo: {
    flex: 1,
  },
  periodTimeRange: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  periodTimeRangeSelected: {
    color: '#4CAF50',
  },
  statsContainer: {
    padding: 20,
  },
  singleStatCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    alignSelf: 'center',
    minWidth: 120,
  },
  singleStatNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  singleStatLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
  section: {
    padding: 20,
  },
  appointmentCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  appointmentTime: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  appointmentInfo: {
    marginTop: 5,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  serviceName: {
    fontSize: 14,
    color: '#666',
  },
  actionsSection: {
    padding: 20,
    gap: 12,
  },
  actionButton: {
    backgroundColor: '#667eea',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  secondaryButton: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#667eea',
  },
  secondaryButtonText: {
    color: '#667eea',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  // Estilos para citas pendientes
  pendingSection: {
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  pendingCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pendingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  pendingInfo: {
    flex: 1,
  },
  pendingAppointmentTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  pendingDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  rejectButton: {
    backgroundColor: '#F44336',
  },
  confirmedAgendaCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  confirmedAgendaBadge: {
    backgroundColor: '#4CAF50',
  },
  ghManageRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 10,
  },
  ghManageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  ghRescheduleBtn: {
    backgroundColor: '#fff8e1',
    borderColor: '#ffcc80',
  },
  ghRescheduleBtnText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
    color: '#e65100',
  },
  ghCancelBtn: {
    backgroundColor: '#ffebee',
    borderColor: '#ffcdd2',
  },
  ghCancelBtnText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
    color: '#c62828',
  },
  // Estilos para el modal de gestión de horarios
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 8,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  dayScheduleCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dayScheduleTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  timeSlotSection: {
    marginBottom: 24,
  },
  timeSlotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  timeSlotTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  toggleAllButton: {
    backgroundColor: '#f0f2ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#667eea',
  },
  toggleAllText: {
    fontSize: 12,
    color: '#667eea',
    fontWeight: '500',
  },
  hoursGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  hourToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e1e1e1',
    minWidth: 80,
  },
  hourToggleActive: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  hourText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  hourTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  hourIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#e1e1e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hourIndicatorActive: {
    backgroundColor: 'white',
  },
  modalActions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e1e1e1',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 6,
    minHeight: 52,
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  saveButton: {
    backgroundColor: '#667eea',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    textAlign: 'center',
  },
  // Estilos para pantalla de pacientes
  searchContainer: {
    paddingHorizontal: 0,
    paddingBottom: 12,
    width: '100%',
    alignItems: 'center',
  },
  
  // Estilos para filtros y ordenamiento
  filtersContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  filterButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    width: '100%',
  },
  filterButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e1e1e1',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  filterButtonActive: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  filterButtonTextActive: {
    color: 'white',
  },
  sortContainer: {
    alignItems: 'center',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e1e1e1',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    alignSelf: 'center',
  },
  sortButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  sortOptionsContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e1e1e1',
    width: '100%',
    alignSelf: 'center',
  },
  sortOptionsTitle: {
    fontSize: 16,
    color: '#333',
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
    width: '100%',
    alignSelf: 'center',
  },
  sortOptionsRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-around',
    width: '100%',
    alignSelf: 'center',
  },
  sortOptionButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e1e1e1',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sortOptionButtonActive: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  sortOptionText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  sortOptionTextActive: {
    color: 'white',
  },
  
  // Estilos para tarjetas de pacientes mejoradas
  patientHeaderLeft: {
    flex: 1,
  },
  patientSubInfo: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 4,
  },
  patientAge: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  patientOccupation: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  patientHeaderRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  moreOptionsButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
  },
  patientStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  tertiaryButton: {
    backgroundColor: '#FF9800',
    borderColor: '#FF9800',
  },
  tertiaryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Estilos para modales adicionales
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  detailLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
    minWidth: 120,
  },
  detailValue: {
    fontSize: 16,
    color: '#666',
    flex: 1,
  },
  notesText: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  
  // Estilos para modal de eliminación
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  deleteModalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    margin: 20,
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  deleteModalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  deleteModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginTop: 16,
    textAlign: 'center',
  },
  deleteModalBody: {
    marginBottom: 24,
  },
  deleteModalText: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 12,
  },
  deleteModalPatientName: {
    fontWeight: '700',
    color: '#333',
  },
  deleteModalSubtext: {
    fontSize: 14,
    color: '#999',
    lineHeight: 20,
    textAlign: 'center',
  },
  deleteModalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  deleteModalButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  deleteButton: {
    backgroundColor: '#FF6B6B',
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Estilos para modal de exportación
  exportFormatContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 16,
    marginTop: 16,
  },
  exportFormatButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e1e1e1',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  exportFormatButtonActive: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  exportFormatText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  exportFormatTextActive: {
    color: 'white',
  },
  exportSummaryContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
  },
  exportSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  exportSummaryLabel: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  exportSummaryValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  
  // Estilos para modal de estadísticas
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
    marginTop: 16,
  },
  statCardLarge: {
    width: '48%',
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e1e1e1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statNumberLarge: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
    marginVertical: 8,
  },
  statLabelLarge: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
    textAlign: 'center',
  },
  diagnosisStatsContainer: {
    marginTop: 16,
  },
  diagnosisStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  diagnosisName: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    flex: 1,
  },
  diagnosisCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 100,
  },
  diagnosisBar: {
    height: 8,
    backgroundColor: '#667eea',
    borderRadius: 4,
    marginRight: 8,
  },
  diagnosisCount: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '600',
    minWidth: 20,
  },
  ageStatsContainer: {
    marginTop: 16,
  },
  ageStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  ageRange: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    flex: 1,
  },
  ageCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 100,
  },
  ageBar: {
    height: 8,
    backgroundColor: '#4CAF50',
    borderRadius: 4,
    marginRight: 8,
  },
  ageCount: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
    minWidth: 20,
  },
  monthlyStatsContainer: {
    marginTop: 16,
  },
  monthlyStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  monthName: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    flex: 1,
    textTransform: 'capitalize',
  },
  monthlyCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 100,
  },
  monthlyBar: {
    height: 8,
    backgroundColor: '#FF9800',
    borderRadius: 4,
    marginRight: 8,
  },
  monthlyCount: {
    fontSize: 14,
    color: '#FF9800',
    fontWeight: '600',
    minWidth: 20,
  },
  
  // Estilos para estados vacíos mejorados
  noPatientsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    flex: 1,
    justifyContent: 'center',
    width: '100%',
    alignSelf: 'center',
  },
  noPatientsTitle: {
    fontSize: 18,
    color: '#333',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  noPatientsSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 32,
  },
  noPatientsAddButton: {
    backgroundColor: '#667eea',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  noPatientsAddButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e1e1e1',
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#333',
    paddingVertical: 6,
  },
  patientsList: {
    padding: 20,
  },
  patientCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  patientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  patientInfo: {
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  patientActions: {
    flexDirection: 'row',
    gap: 12,
  },

  // Estilos para el modal de agregar paciente
  formSection: {
    marginBottom: 24,
  },
  formSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  inputGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e1e1e1',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    minHeight: 48,
  },
  // Estilos para el modal de programación de citas
  patientInfoCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  patientInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  patientInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  patientInfoText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
  },

  // Estilos para el modal de nueva cita
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  clearButton: {
    backgroundColor: '#fff3cd',
    borderWidth: 1,
    borderColor: '#ffeaa7',
  },
  clearButtonText: {
    color: '#856404',
    fontSize: 11,
    fontWeight: '500',
  },

  // Estilos para el modal de nueva cita mejorado
  newAppointmentModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  newAppointmentModalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    width: '100%',
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  newAppointmentModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fafafa',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  newAppointmentModalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  newAppointmentModalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 12,
  },
  newAppointmentCloseButton: {
    padding: 4,
  },
  newAppointmentModalBody: {
    padding: 24,
    maxHeight: 400,
  },
  serviceInfoCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  serviceInfoText: {
    fontSize: 16,
    color: '#666',
    marginLeft: 12,
    flex: 1,
  },
  serviceInfoHighlight: {
    color: '#4CAF50',
    fontWeight: '600',
  },

  dateTimeRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  dateTimeField: {
    flex: 1,
  },
  contactRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  contactField: {
    flex: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e1e1e1',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginTop: 8,
  },
  newAppointmentTextInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 12,
    marginLeft: 12,
    minHeight: 48,
  },
  notesContainer: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e1e1e1',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  notesIcon: {
    marginTop: 4,
  },
  notesTextInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  newAppointmentModalActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#fafafa',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    gap: 16,
  },
  newAppointmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    minWidth: 65,
    gap: 3,
  },
  createButton: {
    backgroundColor: '#667eea',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  createButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#ccc',
    shadowColor: '#ccc',
    shadowOpacity: 0.1,
    elevation: 1,
  },

  dateSelectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e1e1e1',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 8,
    justifyContent: 'space-between',
  },
  dateSelectorText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
    flex: 1,
  },

  // Estilos para el modal del selector de fecha
  datePickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  datePickerModalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    width: '100%',
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  datePickerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fafafa',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  datePickerModalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  datePickerCloseButton: {
    padding: 4,
  },
  datePickerModalBody: {
    padding: 24,
  },
  datePickerSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  calendarContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    padding: 20,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  calendarNavButton: {
    padding: 8,
    backgroundColor: '#f0f2ff',
    borderRadius: 8,
  },
  calendarMonthYear: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textTransform: 'capitalize',
  },
  weekDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  weekDayText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    width: 40,
    textAlign: 'center',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  dayButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 2,
    borderRadius: 20,
  },
  dayButtonCurrentMonth: {
    backgroundColor: 'white',
  },
  dayButtonToday: {
    backgroundColor: '#667eea',
  },
  dayButtonSelected: {
    backgroundColor: '#4CAF50',
  },
  dayButtonAvailable: {
    backgroundColor: '#e8f5e8',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  dayButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  dayButtonTextCurrentMonth: {
    color: '#333',
  },
  dayButtonTextToday: {
    color: 'white',
  },
  dayButtonTextSelected: {
    color: 'white',
  },
  dayButtonTextUnavailable: {
    color: '#ccc',
  },
  datePickerModalActions: {
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#fafafa',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  datePickerCancelButton: {
    backgroundColor: '#f8f9fa',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e1e1e1',
  },
  datePickerCancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  patientSelectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e1e1e1',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 8,
    justifyContent: 'space-between',
  },
  patientSelectorButtonSelected: {
    backgroundColor: '#f0f8ff',
    borderColor: '#4CAF50',
    borderWidth: 2,
  },
  patientSelectorText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
    flex: 1,
  },
  patientSelectorTextSelected: {
    color: '#4CAF50',
    fontWeight: '600',
  },

  // Estilos para el modal del selector de pacientes
  patientSelectorModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  patientSelectorModalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    width: '100%',
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  patientSelectorModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fafafa',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },

  patientSelectorModalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  patientSelectorCloseButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  patientSelectorModalBody: {
    padding: 24,
    flex: 1,
    minHeight: 400,
  },

  patientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e8e8e8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  patientItemAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  patientItemInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  patientItemName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 6,
  },
  patientItemPhone: {
    fontSize: 15,
    color: '#555',
    marginBottom: 4,
    fontWeight: '500',
  },
  patientItemEmail: {
    fontSize: 15,
    color: '#777',
    fontWeight: '500',
  },
  patientItemArrow: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
  },
  patientItemSeparator: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 8,
    marginHorizontal: 20,
  },
  patientItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  patientItemBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0f2fe',
  },
  patientItemBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4CAF50',
    marginLeft: 4,
  },
  patientItemDetails: {
    gap: 6,
  },
  patientItemDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  noPatientsContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  noPatientsIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#e9ecef',
    borderStyle: 'dashed',
  },
  noPatientsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#555',
    marginTop: 20,
    marginBottom: 12,
    textAlign: 'center',
  },
  noPatientsSubtitle: {
    fontSize: 16,
    color: '#777',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  noPatientsAddButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  noPatientsAddButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  patientSelectorModalActions: {
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#fafafa',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  patientSelectorPatientsListContainer: {
    flex: 1,
    marginTop: 12,
    backgroundColor: '#fafafa',
    borderRadius: 16,
    overflow: 'hidden',
  },
  patientSelectorPatientsList: {
    flex: 1,
    paddingHorizontal: 4,
    backgroundColor: 'transparent',
  },
  patientSelectorPatientsListContent: {
    paddingBottom: 20,
    minHeight: '100%',
  },

  scrollToTopButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },

  // Estilos para el formulario integrado de nuevo paciente
  addPatientFormContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e8e8e8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  addPatientFormHeader: {
    marginBottom: 20,
  },
  addPatientFormTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 6,
  },
  addPatientFormSubtitle: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  addPatientFormFields: {
    marginBottom: 20,
  },
  addPatientFormActions: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
  },
  addPatientFormButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  cancelFormButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e1e1e1',
  },
  cancelFormButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  saveFormButton: {
    backgroundColor: '#4CAF50',
  },
  saveFormButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },

  // Estilos para la información de pacientes disponibles
  patientsInfoContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  patientsInfoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  patientsInfoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  patientsInfoCount: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  patientsInfoCountText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1976d2',
  },
  patientsInfoSubtitle: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  modalTopSection: {
    marginBottom: 20,
  },
  patientSelectorCancelButton: {
    backgroundColor: '#f8f9fa',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e1e1e1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  patientSelectorCancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  searchAndAddContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  addNewPatientButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 20,
    marginHorizontal: 4,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 2,
    borderColor: '#45a049',
  },
  addNewPatientButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addNewPatientButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },

  // Estilos para el modal de agregar nuevo paciente
  addPatientModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  addPatientModalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    width: '100%',
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  addPatientModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fafafa',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  addPatientModalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  addPatientCloseButton: {
    padding: 4,
  },
  addPatientModalBody: {
    padding: 24,
  },
  addPatientSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  newPatientTextInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 12,
    marginLeft: 12,
    minHeight: 48,
  },
  addPatientModalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#fafafa',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    gap: 12,
  },
  addPatientCancelButton: {
    backgroundColor: '#f8f9fa',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e1e1e1',
    flex: 1,
  },
  addPatientSaveButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    flex: 1,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  addPatientCancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  addPatientSaveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },

  // Estilos específicos para el modal del selector de pacientes
  patientSelectorSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#e1e1e1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  patientSelectorSearchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  patientsInfoTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchIconContainer: {
    padding: 4,
  },
  clearSearchButton: {
    padding: 4,
    marginLeft: 8,
  },
  addNewPatientIconContainer: {
    padding: 4,
  },
  addNewPatientTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  addNewPatientButtonSubtext: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  addNewPatientArrowContainer: {
    padding: 4,
  },
  patientItemSelectIndicator: {
    position: 'absolute',
    right: 16,
    top: '50%',
    marginTop: -10,
    opacity: 0,
  },

  // Estilos para el selector de clientes del catálogo
  clientSelectorButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e1e1e1',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  clientSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  clientSelectorTextContainer: {
    flex: 1,
  },
  clientSelectorSelectedText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  clientSelectorPlaceholder: {
    fontSize: 16,
    color: '#999',
    fontWeight: '400',
  },
  clientSelectorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clientSelectorCount: {
    fontSize: 12,
    color: '#667eea',
    fontWeight: '500',
  },

  // Estilos para el modal del selector de clientes
  clientSelectorModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  clientSelectorModalContent: {
    width: '90%',
    maxWidth: 500,
    maxHeight: '85%',
    backgroundColor: '#ffeb3b',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
    alignSelf: 'center',
  },
  clientSelectorModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#fafafa',
    backgroundColor: '#e8f4fd',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  clientSelectorModalTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#ff0000',
  },
  clientSelectorCloseButton: {
    padding: 4,
  },
  clientSelectorModalBody: {
    padding: 28,
    flex: 1,
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },
  clientSelectorSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    lineHeight: 24,
    textAlign: 'center',
    paddingHorizontal: 32,
    alignSelf: 'center',
    width: '100%',
  },

  clientListContainer: {
    flex: 1,
    minHeight: 500,
    paddingVertical: 12,
    width: '100%',
    alignSelf: 'center',
  },
  clientItem: {
    backgroundColor: 'white',
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  clientItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  clientItemAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e1e1e1',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  clientItemInfo: {
    flex: 1,
  },
  clientItemName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  clientItemEmail: {
    fontSize: 16,
    color: '#666',
    marginBottom: 6,
    fontWeight: '500',
  },
  clientItemPhone: {
    fontSize: 14,
    color: '#999',
    fontWeight: '500',
  },
  clientItemSelectIndicator: {
    padding: 4,
  },
  noClientsContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    flex: 1,
    justifyContent: 'center',
    width: '100%',
    alignSelf: 'center',
  },
  noClientsText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 20,
    width: '100%',
    alignSelf: 'center',
  },
  clientSelectorModalActions: {
    flexDirection: 'row',
    paddingHorizontal: 32,
    paddingVertical: 24,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#fafafa',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  clientSelectorCancelButton: {
    backgroundColor: '#f8f9fa',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e1e1e1',
    flex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  clientSelectorCancelButtonText: {
    color: '#666',
    fontSize: 17,
    fontWeight: '600',
  },

  // Estilos para el catálogo mejorado de pacientes
  searchSuggestionsContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginTop: 8,
    maxHeight: 200,
    width: '100%',
    alignSelf: 'center',
  },
  searchSuggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
    justifyContent: 'center',
  },
  searchSuggestionText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
    textAlign: 'center',
    flex: 1,
  },
  patientFiltersContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 20,
    paddingHorizontal: 8,
    width: '100%',
    alignSelf: 'center',
  },
  filterButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    width: '100%',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e1e1e1',
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  filterButtonActive: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  filterButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  filterButtonTextActive: {
    color: 'white',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e1e1e1',
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    alignSelf: 'center',
  },
  sortButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  sortOptionsContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
    padding: 24,
    marginTop: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e1e1e1',
    width: '100%',
    alignSelf: 'center',
  },
  sortOptionsTitle: {
    fontSize: 18,
    color: '#333',
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
    width: '100%',
    alignSelf: 'center',
  },
  sortOptionsRow: {
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'space-around',
    width: '100%',
    alignSelf: 'center',
  },
  sortOptionButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e1e1e1',
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sortOptionButtonActive: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  sortOptionText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  sortOptionTextActive: {
    color: 'white',
  },
  resultsCounter: {
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    marginHorizontal: 8,
    width: '100%',
    alignSelf: 'center',
  },
  resultsCounterText: {
    fontSize: 16,
    color: '#667eea',
    fontWeight: '600',
  },
  favoriteBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 2,
  },
  clientItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  favoriteButton: {
    padding: 4,
  },
  clientItemStats: {
    flexDirection: 'row',
    gap: 24,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  clientItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingLeft: 20,
  },
  noClientsSubtext: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
    width: '100%',
    alignSelf: 'center',
  },

  // Estilos para el catálogo mejorado de pacientes
  catalogSelectorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#e1e1e1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  catalogSelectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e1e1e1',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 8,
    justifyContent: 'space-between',
  },
  catalogSelectorButtonSelected: {
    backgroundColor: '#f0f8ff',
    borderColor: '#4CAF50',
    borderWidth: 2,
  },
  catalogSelectorTextContainer: {
    flex: 1,
  },
  catalogSelectorSelectedText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  catalogSelectorPlaceholder: {
    fontSize: 16,
    color: '#999',
    fontWeight: '400',
  },
  catalogSelectorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  catalogSelectorCount: {
    fontSize: 12,
    color: '#667eea',
    fontWeight: '500',
  },
     addNewUserButton: {
     backgroundColor: '#4CAF50',
     borderRadius: 16,
     paddingVertical: 16,
     paddingHorizontal: 20,
     marginBottom: 20,
     marginHorizontal: 4,
     shadowColor: '#4CAF50',
     shadowOffset: { width: 0, height: 4 },
     shadowOpacity: 0.3,
     shadowRadius: 8,
     elevation: 4,
     borderWidth: 2,
     borderColor: '#45a049',
   },
   addNewUserButtonText: {
     color: 'white',
     fontSize: 16,
     fontWeight: '600',
     marginLeft: 8,
   },
   selectedPatientInfo: {
     marginBottom: 20,
   },
   patientInfoRow: {
     flexDirection: 'row',
     alignItems: 'center',
     marginBottom: 8,
   },
   patientInfoText: {
     fontSize: 14,
     color: '#333',
     marginLeft: 8,
   },
     catalogSelectorContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  // Estilos específicos para gestión de horarios
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  customSchedule: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
  },
  customText: {
    color: '#4caf50',
  },
  defaultSchedule: {
    backgroundColor: 'rgba(255, 152, 0, 0.2)',
  },
  defaultText: {
    color: '#ff9800',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff3e0',
    borderWidth: 1,
    borderColor: '#ff9800',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 12,
    gap: 8,
  },
  resetButtonText: {
    color: '#ff9800',
    fontSize: 14,
    fontWeight: '600',
  },
  // Estilos para horarios bloqueados
  hourToggleBlocked: {
    backgroundColor: '#f5f5f5',
    borderColor: '#d32f2f',
    borderWidth: 2,
    opacity: 0.7,
  },
  hourTextBlocked: {
    color: '#d32f2f',
    fontWeight: 'bold',
  },
  hourIndicatorBlocked: {
    backgroundColor: '#d32f2f',
  },
  blockedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(211, 47, 47, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  blockedText: {
    fontSize: 10,
    color: '#d32f2f',
    fontWeight: 'bold',
    textAlign: 'center',
  },

});
