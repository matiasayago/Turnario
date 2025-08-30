import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Modal,
  TextInput,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { useAppointments } from '../../contexts/AppointmentContext';
import { SERVICES, searchServices } from '../../constants/services';
import { createPaymentPreference, openMercadoPagoDirectly } from '../../config/mercadopago';

export default function DashboardScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { appointments } = useAppointments();
  
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  
  // Estados para el modal de nueva cita del profesional
  const [showNewAppointmentModal, setShowNewAppointmentModal] = useState(false);
  const [newProfessionalAppointment, setNewProfessionalAppointment] = useState({
    service: user?.userType === 'professional' ? (user?.service || '') : '', // Servicio solo para profesionales
    date: '',
    time: '',
    patientName: '',
    patientPhone: '',
    patientEmail: '',
    professionalName: '', // Nombre del profesional para modo cliente
    notes: '',
  });
  const [isCreatingAppointment, setIsCreatingAppointment] = useState(false);
  const [notificationsSent, setNotificationsSent] = useState<string[]>([]);
  
  // Estados para el calendario de disponibilidad
  const [showDatePickerModal, setShowDatePickerModal] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState('');
  
  // Estados para el selector de horarios
  const [showTimePickerModal, setShowTimePickerModal] = useState(false);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);
  
  // Estados para el catálogo de pacientes
  const [showPatientCatalogModal, setShowPatientCatalogModal] = useState(false);
  const [patientSearchQuery, setPatientSearchQuery] = useState('');
  const [catalogView, setCatalogView] = useState<'list' | 'grid'>('list');
  
  // Estados para el selector de servicios
  const [showServiceSelectorModal, setShowServiceSelectorModal] = useState(false);
  const [serviceSearchQuery, setServiceSearchQuery] = useState('');
  
  // Estados para el selector de profesionales
  const [showProfessionalSelectorModal, setShowProfessionalSelectorModal] = useState(false);
  const [professionalSearchQuery, setProfessionalSearchQuery] = useState('');
  
  // Estados para el modal de pago de seña
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentData, setPaymentData] = useState({
    cardNumber: '',
    cardHolder: '',
    expiryDate: '',
    cvv: '',
  });

  // Estados para MercadoPago
  const [showMercadoPagoModal, setShowMercadoPagoModal] = useState(false);
  const [mercadoPagoPreference, setMercadoPagoPreference] = useState<any>(null);
  const [isCreatingMercadoPagoPreference, setIsCreatingMercadoPagoPreference] = useState(false);

  const isProfessional = user?.userType === 'professional';

  const onRefresh = async () => {
    setRefreshing(true);
    // Simular refresh
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleLogout = async () => {
    await logout();
  };

  const openModal = () => {
    console.log('🎯 Botón presionado - isProfessional:', isProfessional);
    console.log('🎯 Estado actual de showModal:', showModal);
    console.log('🎯 Llamando a setShowModal(true)');
    setShowModal(true);
    console.log('🎯 setShowModal(true) ejecutado');
  };

  // Función para resetear el formulario de nueva cita
  const resetNewAppointmentForm = () => {
    setNewProfessionalAppointment({
      service: isProfessional ? (user?.service || '') : '', // Mantener servicio solo para profesionales
      date: '',
      time: '',
      patientName: '',
      patientPhone: '',
      patientEmail: '',
      professionalName: '', // Resetear nombre del profesional
      notes: '',
    });
    setSelectedDate('');
    setAvailableTimeSlots([]);
    console.log('🔄 Formulario de nueva cita reseteado');
  };

  // Función para seleccionar paciente
  const handlePatientSelection = () => {
    // Abrir el catálogo de pacientes
    setShowPatientCatalogModal(true);
  };

  // Función para seleccionar un paciente del catálogo
  const handlePatientSelect = (patient: any) => {
    setNewProfessionalAppointment(prev => ({
      ...prev,
      patientName: patient.name,
      patientPhone: patient.phone || '',
      patientEmail: patient.email || '',
    }));
    
    // Cerrar el catálogo de pacientes
    setShowPatientCatalogModal(false);
    setPatientSearchQuery('');
    
    // Volver al formulario de Crear Nueva Cita
    setShowModal(true);
  };

  // Función para filtrar pacientes según la búsqueda
  const getFilteredPatients = () => {
    if (!patientSearchQuery.trim()) {
      return availablePatients;
    }
    
    const query = patientSearchQuery.toLowerCase();
    return availablePatients.filter(patient =>
      patient.name.toLowerCase().includes(query) ||
      patient.email.toLowerCase().includes(query) ||
      patient.phone.includes(query)
    );
  };

  // Función para filtrar servicios según la búsqueda
  const getFilteredServices = () => {
    if (!serviceSearchQuery.trim()) {
      return availableServices;
    }
    
    // Usar la función de búsqueda del sistema
    const filteredServiceNames = searchServices(serviceSearchQuery);
    return availableServices.filter(service => 
      filteredServiceNames.includes(service.name)
    );
  };

  // Función para seleccionar un servicio
  const handleServiceSelect = (service: any) => {
    setNewProfessionalAppointment(prev => ({
      ...prev,
      service: service.name,
      professionalName: '', // Resetear profesional al cambiar servicio
    }));
    
    // Cerrar el selector de servicios
    setShowServiceSelectorModal(false);
    setServiceSearchQuery('');
    
    // Volver al formulario de Crear Nueva Cita
    setShowModal(true);
  };

  // Función para filtrar profesionales según el servicio seleccionado y búsqueda
  const getFilteredProfessionals = () => {
    const selectedService = newProfessionalAppointment.service;
    
    // Si no hay servicio seleccionado, no mostrar profesionales
    if (!selectedService) {
      return [];
    }
    
    // Filtrar profesionales que ofrezcan el servicio seleccionado
    let filtered = availableProfessionals.filter(professional =>
      professional.services.includes(selectedService)
    );
    
    // Aplicar búsqueda adicional si hay query
    if (professionalSearchQuery.trim()) {
      const query = professionalSearchQuery.toLowerCase();
      filtered = filtered.filter(professional =>
        professional.name.toLowerCase().includes(query) ||
        professional.specialty.toLowerCase().includes(query) ||
        professional.location.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  };

  // Función para seleccionar un profesional
  const handleProfessionalSelect = (professional: any) => {
    setNewProfessionalAppointment(prev => ({
      ...prev,
      professionalName: professional.name,
    }));
    
    // Cerrar el selector de profesionales
    setShowProfessionalSelectorModal(false);
    setProfessionalSearchQuery('');
    
    // Volver al formulario de Crear Nueva Cita
    setShowModal(true);
  };

  // Función para crear preferencia de pago en MercadoPago
  const handleMercadoPagoPayment = async () => {
    try {
      setIsCreatingMercadoPagoPreference(true);
      
      console.log('💳 Creando preferencia de pago en MercadoPago...');
      
      // Crear preferencia de pago
      const preference = await createPaymentPreference({
        title: `Seña - ${newProfessionalAppointment.service}`,
        amount: 2000, // $2000 ARS
        description: `Seña para cita con ${newProfessionalAppointment.professionalName} - ${newProfessionalAppointment.service} - ${newProfessionalAppointment.date} ${newProfessionalAppointment.time}`,
        externalReference: `appointment_${Date.now()}`,
        payerEmail: user?.email || 'cliente@example.com',
        payerName: user?.fullName || 'Cliente',
      });

      console.log('✅ Preferencia de MercadoPago creada:', preference);
      
      // Guardar la preferencia y mostrar el modal
      setMercadoPagoPreference(preference);
      setShowMercadoPagoModal(true);
      
      // Mostrar confirmación de preferencia creada
      Alert.alert(
        '✅ Preferencia Creada',
        'Se ha creado exitosamente la preferencia de pago en MercadoPago.\n\nAhora puedes proceder a realizar el pago de la seña.',
        [{ text: 'Continuar', style: 'default' }]
      );
      
    } catch (error) {
      console.error('❌ Error creando preferencia de MercadoPago:', error);
      Alert.alert(
        'Error de Pago', 
        'No se pudo crear la preferencia de pago en MercadoPago.\n\nVerifica tu conexión a internet e intenta nuevamente.',
        [{ text: 'Reintentar', style: 'default' }]
      );
    } finally {
      setIsCreatingMercadoPagoPreference(false);
    }
  };

  // Función para abrir MercadoPago
  const openMercadoPago = async () => {
    try {
      console.log('💳 Intentando abrir MercadoPago...');
      
      // Usar la función directa que abre MercadoPago con una URL válida
      const result = await openMercadoPagoDirectly();
      
      if (result.success) {
        console.log('✅ MercadoPago abierto exitosamente');
        
        // Cerrar el modal después de abrir
        setShowMercadoPagoModal(false);
        
        // Mostrar confirmación
        Alert.alert(
          '✅ Pago Iniciado',
          'Has sido redirigido a MercadoPago para completar el pago de la seña.\n\nUna vez completado el pago, tu cita quedará confirmada.',
          [{ text: 'Entendido', style: 'default' }]
        );
      } else {
        console.log('❌ No se pudo abrir MercadoPago:', result.message);
        
        // Mostrar error y opciones alternativas
        Alert.alert(
          'No se puede abrir MercadoPago',
          'No se pudo abrir MercadoPago directamente. Esto puede ser porque:\n\n• Es una URL de prueba\n• Necesitas abrir en navegador\n\n¿Quieres intentar abrir en el navegador?',
          [
            { 
              text: 'Abrir en Navegador', 
              onPress: async () => {
                try {
                  // Intentar abrir en el navegador web
                  const webUrl = 'https://www.mercadopago.com.ar';
                  await Linking.openURL(webUrl);
                  console.log('✅ MercadoPago abierto en navegador');
                } catch (error) {
                  console.error('❌ Error abriendo en navegador:', error);
                  Alert.alert('Error', 'No se pudo abrir el navegador. Intenta manualmente.');
                }
              }
            },
            { text: 'Cancelar', style: 'cancel' }
          ]
        );
      }
    } catch (error) {
      console.error('❌ Error abriendo MercadoPago:', error);
      Alert.alert(
        'Error',
        'Hubo un problema al abrir MercadoPago. Intenta nuevamente.',
        [{ text: 'OK', style: 'default' }]
      );
    }
  };

  // Lista de servicios disponibles del sistema
  const availableServices = SERVICES.map((service, index) => {
    // Determinar duración y precio según el tipo de servicio
    let duration = '45 min';
    let price = 15000;
    
    if (service.includes('Consulta') || service.includes('Evaluación')) {
      duration = '30 min';
      price = 12000;
    } else if (service.includes('Terapia') || service.includes('Tratamiento')) {
      duration = '60 min';
      price = 18000;
    } else if (service.includes('Rehabilitación') || service.includes('Fisioterapia')) {
      duration = '45 min';
      price = 15000;
    } else if (service.includes('Entrenamiento') || service.includes('Masaje')) {
      duration = '60 min';
      price = 20000;
    }
    
    return {
      id: (index + 1).toString(),
      name: service,
      description: `Servicio profesional de ${service.toLowerCase()}`,
      duration,
      price,
    };
  });

  // Lista de profesionales disponibles por servicio
  const availableProfessionals = [
    {
      id: '1',
      name: 'Dr. Carlos Mendoza',
      specialty: 'Psicología y Salud Mental',
      services: ['Consulta Psicológica', 'Terapia Cognitivo-Conductual', 'Terapia Familiar', 'Psicología Infantil'],
      rating: 4.8,
      experience: '15 años',
      location: 'Buenos Aires',
      avatar: 'CM',
    },
    {
      id: '2',
      name: 'Dra. María González',
      specialty: 'Medicina General',
      services: ['Consulta Médica General', 'Consulta de Pediatría', 'Consulta de Geriatría'],
      rating: 4.9,
      experience: '12 años',
      location: 'Buenos Aires',
      avatar: 'MG',
    },
    {
      id: '3',
      name: 'Lic. Juan Pérez',
      specialty: 'Fisioterapia',
      services: ['Fisioterapia General', 'Fisioterapia Deportiva', 'Rehabilitación Post-Quirúrgica'],
      rating: 4.7,
      experience: '8 años',
      location: 'Buenos Aires',
      avatar: 'JP',
    },
    {
      id: '4',
      name: 'Dra. Ana Silva',
      specialty: 'Nutrición',
      services: ['Consulta Nutricional', 'Nutrición Clínica', 'Nutrición Pediátrica', 'Nutrición Deportiva'],
      rating: 4.6,
      experience: '10 años',
      location: 'Buenos Aires',
      avatar: 'AS',
    },
    {
      id: '5',
      name: 'Dr. Roberto Torres',
      specialty: 'Odontología',
      services: ['Consulta Odontológica General', 'Limpieza Dental', 'Tratamiento de Caries', 'Ortodoncia'],
      rating: 4.8,
      experience: '18 años',
      location: 'Buenos Aires',
      avatar: 'RT',
    },
    {
      id: '6',
      name: 'Lic. Laura Fernández',
      specialty: 'Terapia Ocupacional',
      services: ['Terapia Ocupacional General', 'Terapia Ocupacional Pediátrica', 'Rehabilitación de Mano'],
      rating: 4.5,
      experience: '6 años',
      location: 'Buenos Aires',
      avatar: 'LF',
    },
  ];

  // Lista de pacientes disponibles
  const availablePatients = [
    {
      id: '1',
      name: 'Ana Martínez',
      phone: '+54 9 11 1234-5678',
      email: 'ana.martinez@email.com',
      lastVisit: '15/12/2024'
    },
    {
      id: '2',
      name: 'Carlos López',
      phone: '+54 9 11 2345-6789',
      email: 'carlos.lopez@email.com',
      lastVisit: '10/12/2024'
    },
    {
      id: '3',
      name: 'María González',
      phone: '+54 9 11 3456-7890',
      email: 'maria.gonzalez@email.com',
      lastVisit: '08/12/2024'
    },
    {
      id: '4',
      name: 'Juan Pérez',
      phone: '+54 9 11 4567-8901',
      email: 'juan.perez@email.com',
      lastVisit: '05/12/2024'
    },
    {
      id: '5',
      name: 'Laura Rodríguez',
      phone: '+54 9 11 5678-9012',
      email: 'laura.rodriguez@email.com',
      lastVisit: '03/12/2024'
    },
    {
      id: '6',
      name: 'Roberto Silva',
      phone: '+54 9 11 6789-0123',
      email: 'roberto.silva@email.com',
      lastVisit: '01/12/2024'
    }
  ];

  // Función para crear cita y enviar notificación al cliente
  const handleCreateAppointmentAndNotifyClient = async () => {
    try {
      setIsCreatingAppointment(true);
      
      // Validar campos según el tipo de usuario
      if (isProfessional) {
        // Para profesionales: validar paciente, fecha y hora
        if (!newProfessionalAppointment.patientName || !newProfessionalAppointment.date || !newProfessionalAppointment.time) {
          Alert.alert('Error', 'Por favor completa todos los campos obligatorios.');
          return;
        }
        } else {
        // Para clientes: validar servicio, profesional, fecha y hora
        if (!newProfessionalAppointment.service || !newProfessionalAppointment.professionalName || !newProfessionalAppointment.date || !newProfessionalAppointment.time) {
          Alert.alert('Error', 'Por favor completa todos los campos obligatorios.');
          return;
        }
      }

      // Generar ID único para la cita
      const appointmentId = `appointment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Crear objeto de cita según el tipo de usuario
      const newAppointment = isProfessional ? {
        // Para profesionales
        id: appointmentId,
        service: newProfessionalAppointment.service,
        professional: user?.fullName || 'Profesional',
        professionalId: user?.id || 'prof_unknown',
        date: newProfessionalAppointment.date,
        time: newProfessionalAppointment.time,
        patientName: newProfessionalAppointment.patientName,
        patientPhone: newProfessionalAppointment.patientPhone,
        patientEmail: newProfessionalAppointment.patientEmail,
        notes: newProfessionalAppointment.notes,
        status: 'pending_payment',
        createdAt: new Date().toISOString(),
        depositRequired: true,
        depositAmount: 2000,
        totalAmount: 10000,
      } : {
        // Para clientes
        id: appointmentId,
        service: newProfessionalAppointment.service,
        professional: newProfessionalAppointment.professionalName,
        professionalId: 'prof_client_selected',
        date: newProfessionalAppointment.date,
        time: newProfessionalAppointment.time,
        patientName: user?.fullName || 'Cliente',
        patientPhone: user?.phone || '',
        patientEmail: user?.email || '',
        notes: newProfessionalAppointment.notes,
        status: 'pending_payment',
        createdAt: new Date().toISOString(),
        depositRequired: true,
        depositAmount: 2000,
        totalAmount: 10000,
      };

      console.log('📋 Cita creada:', newAppointment);

      // Aquí se guardaría la cita en la base de datos
      // await saveAppointmentToDatabase(newAppointment);

      // Mostrar confirmación según el tipo de usuario
      if (isProfessional) {
        Alert.alert(
          '✅ Cita Creada Exitosamente',
          `La cita para ${newProfessionalAppointment.patientName} ha sido creada.\n\nServicio: ${newProfessionalAppointment.service}\nFecha: ${newProfessionalAppointment.date}\nHora: ${newProfessionalAppointment.time}\n\nSe ha enviado una notificación al cliente para que pague la seña de $2000.`,
          [
            {
              text: 'Ver Detalles',
              onPress: () => {
                console.log('📋 Mostrando detalles de la cita:', newAppointment);
              }
            },
            {
              text: 'Crear Otra Cita',
              onPress: () => {
                setShowModal(false);
                resetNewAppointmentForm();
              }
            }
          ]
        );
    } else {
        Alert.alert(
          '✅ Reserva Creada Exitosamente',
          `Tu cita ha sido reservada exitosamente.\n\nServicio: ${newProfessionalAppointment.service}\nProfesional: ${newProfessionalAppointment.professionalName}\nFecha: ${newProfessionalAppointment.date}\nHora: ${newProfessionalAppointment.time}\n\nPara confirmar tu cita, debes pagar la seña de $2000.`,
          [
            {
              text: 'Ver Detalles',
              onPress: () => {
                console.log('📋 Mostrando detalles de la reserva:', newAppointment);
              }
            },
            {
              text: 'Pagar Seña',
              onPress: () => {
                console.log('💳 Iniciando pago con MercadoPago...');
                handleMercadoPagoPayment();
              }
            }
          ]
        );
      }

      // Cerrar el modal y resetear el formulario
      setShowModal(false);
      resetNewAppointmentForm();

    } catch (error) {
      console.error('❌ Error creando cita:', error);
      Alert.alert('Error', 'No se pudo crear la cita. Intenta nuevamente.');
    } finally {
      setIsCreatingAppointment(false);
    }
  };

  // Funciones para el calendario de disponibilidad
  const getProfessionalAvailability = () => {
    // Disponibilidad por defecto (lunes a viernes)
    return {
      'monday': true,
      'tuesday': true,
      'wednesday': true,
      'thursday': true,
      'friday': true,
      'saturday': false,
      'sunday': false
    };
  };

  const isDateAvailable = (date: Date) => {
    const availability = getProfessionalAvailability();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[date.getDay()] as keyof typeof availability;
    return availability[dayName];
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const firstDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    
    const days = [];
    
    // Agregar días del mes anterior para completar la primera semana
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const prevMonthLastDay = new Date(year, month, 0).getDate();
      days.push({
        day: prevMonthLastDay - i,
        isCurrentMonth: false,
        isAvailable: false,
      });
    }
    
    // Agregar días del mes actual
    for (let day = 1; day <= daysInMonth; day++) {
      const checkDate = new Date(year, month, day);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      days.push({
        day,
        isCurrentMonth: true,
        isAvailable: isDateAvailable(checkDate) && checkDate >= today,
      });
    }
    
    // Agregar días del mes siguiente para completar la última semana
    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      days.push({
        day,
        isCurrentMonth: false,
        isAvailable: false,
      });
    }
    
    return days;
  };

  // Efecto para monitorear el estado del modal
  useEffect(() => {
    console.log('🎯 useEffect - showModal cambió a:', showModal);
  }, [showModal]);

  // Efecto para generar horarios disponibles cuando se selecciona una fecha
  useEffect(() => {
    if (newProfessionalAppointment.date) {
      const timeSlots = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '15:30', '16:00', '17:00'];
      setAvailableTimeSlots(timeSlots);
    }
  }, [newProfessionalAppointment.date]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.welcomeText}>
              ¡Hola, {isProfessional ? 'Dr. ' : ''}{user?.fullName || 'Usuario'}!
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
          <TouchableOpacity style={styles.toggleButton} onPress={() => {}}>
          <Ionicons name="swap-horizontal" size={24} color="#667eea" />
        </TouchableOpacity>
      </View>

      <View style={styles.statsContainer}>
        <Text style={styles.sectionTitle}>
          {isProfessional ? 'Resumen del Día' : 'Resumen del Día'}
        </Text>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Ionicons name={isProfessional ? "people" : "calendar"} size={24} color="#4CAF50" />
            <Text style={styles.statNumber}>{isProfessional ? '8' : '3'}</Text>
            <Text style={styles.statLabel}>
              {isProfessional ? 'Pacientes Hoy' : 'Citas Hoy'}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="time" size={24} color="#2196F3" />
            <Text style={styles.statNumber}>{isProfessional ? '6' : '2'}</Text>
            <Text style={styles.statLabel}>
              {isProfessional ? 'Citas Pendientes' : 'Pendientes'}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
            <Text style={styles.statNumber}>{isProfessional ? '2' : '1'}</Text>
            <Text style={styles.statLabel}>
              {isProfessional ? 'Completadas' : 'Completadas'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {isProfessional ? 'Próximas Citas' : 'Próximas Citas'}
        </Text>
              <View style={styles.emptyAppointmentsContainer}>
                <Ionicons name="calendar-outline" size={48} color="#ccc" />
                <Text style={styles.emptyAppointmentsTitle}>No tienes citas programadas</Text>
                <Text style={styles.emptyAppointmentsSubtitle}>
                  {isProfessional ? 'No hay citas pendientes para hoy' : 'Reserva tu primera cita usando el botón de abajo'}
                </Text>
              </View>
      </View>

        <View style={styles.actionContainer}>
        <TouchableOpacity 
          style={styles.actionButton}
            onPress={openModal}
          >
            <Ionicons name="add-circle" size={20} color="white" />
          <Text style={styles.actionButtonText}>
              {isProfessional ? 'Reservar Cita' : 'Reservar con Seña'}
          </Text>
        </TouchableOpacity>
        

      </View>

        {/* Modal principal de reserva de cita */}
        <Modal
          visible={showModal}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <KeyboardAvoidingView 
            style={styles.modalContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <Text style={styles.modalTitle}>
                  {isProfessional ? 'Crear Nueva Cita' : 'Reservar Cita con Seña'}
                </Text>
                {!isProfessional && (
                  <View style={styles.formProgressContainer}>
                    <Text style={styles.formProgressText}>
                      {(() => {
                        const completedFields = [
                          newProfessionalAppointment.service,
                          newProfessionalAppointment.professionalName,
                          newProfessionalAppointment.date,
                          newProfessionalAppointment.time
                        ].filter(Boolean).length;
                        return `${completedFields}/4 campos completados`;
                      })()}
                    </Text>
                    <View style={styles.formProgressBar}>
                      <View 
                        style={[
                          styles.formProgressFill, 
                          { 
                            width: `${(() => {
                              const completedFields = [
                                newProfessionalAppointment.service,
                                newProfessionalAppointment.professionalName,
                                newProfessionalAppointment.date,
                                newProfessionalAppointment.time
                              ].filter(Boolean).length;
                              return (completedFields / 4) * 100;
                            })()}%` 
                          }
                        ]} 
                      />
                    </View>
                  </View>
                )}
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  setShowModal(false);
                  resetNewAppointmentForm();
                }}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Servicio *</Text>
                {isProfessional ? (
                  <View style={[styles.serviceSelectorButton, styles.serviceSelectorButtonDisabled]}>
                    <Text style={[
                      styles.serviceSelectorText,
                      !newProfessionalAppointment.service && styles.serviceSelectorPlaceholder
                    ]}>
                      {newProfessionalAppointment.service || 'Servicio no configurado'}
                    </Text>
                    <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[
                      styles.serviceSelectorButton,
                      newProfessionalAppointment.service && styles.serviceSelectorButtonValid
                    ]}
                    onPress={() => setShowServiceSelectorModal(true)}
                  >
                    <Text style={[
                      styles.serviceSelectorText,
                      !newProfessionalAppointment.service && styles.serviceSelectorPlaceholder
                    ]}>
                      {newProfessionalAppointment.service || 'Seleccionar servicio...'}
                    </Text>
                    {newProfessionalAppointment.service ? (
                      <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                    ) : (
                      <Ionicons name="chevron-down" size={20} color="#667eea" />
                    )}
                  </TouchableOpacity>
                )}
              </View>

              {isProfessional ? (
              <View style={styles.formSection}>
                  <Text style={styles.formLabel}>Paciente *</Text>
                  <TouchableOpacity
                    style={styles.patientSelectorButton}
                    onPress={handlePatientSelection}
                  >
                    <Text style={[
                      styles.patientSelectorText,
                      !newProfessionalAppointment.patientName && styles.patientSelectorPlaceholder
                    ]}>
                      {newProfessionalAppointment.patientName || 'Seleccionar paciente...'}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color="#667eea" />
                  </TouchableOpacity>
                </View>
              ) : (
              <View style={styles.formSection}>
                  <Text style={styles.formLabel}>Profesional *</Text>
                  <TouchableOpacity
                    style={[
                      styles.patientSelectorButton,
                      !newProfessionalAppointment.service && styles.serviceSelectorButtonDisabled,
                      newProfessionalAppointment.professionalName && styles.patientSelectorButtonValid
                    ]}
                    onPress={() => {
                      if (newProfessionalAppointment.service) {
                        setShowProfessionalSelectorModal(true);
                      } else {
                        Alert.alert('Info', 'Primero debes seleccionar un servicio');
                      }
                    }}
                    disabled={!newProfessionalAppointment.service}
                  >
                    <Text style={[
                      styles.patientSelectorText,
                      !newProfessionalAppointment.professionalName && styles.patientSelectorPlaceholder
                    ]}>
                      {newProfessionalAppointment.professionalName || 'Seleccionar profesional...'}
                    </Text>
                    {newProfessionalAppointment.professionalName ? (
                      <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                    ) : (
                      <Ionicons name="chevron-down" size={20} color="#667eea" />
                    )}
                  </TouchableOpacity>
                </View>
              )}

             <View style={styles.formSection}>
               <Text style={styles.formLabel}>Fecha *</Text>
               <TouchableOpacity
                  style={[
                    styles.dateSelectorButton,
                    newProfessionalAppointment.date && styles.dateSelectorButtonValid
                  ]}
                  onPress={() => setShowDatePickerModal(true)}
               >
                 <Text style={[
                   styles.dateSelectorText,
                    !newProfessionalAppointment.date && styles.dateSelectorPlaceholder
                 ]}>
                    {newProfessionalAppointment.date || 'Seleccionar fecha disponible...'}
                 </Text>
                  {newProfessionalAppointment.date ? (
                    <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                  ) : (
                    <Ionicons name="calendar" size={20} color="#667eea" />
                  )}
               </TouchableOpacity>
             </View>

             <View style={styles.formSection}>
               <Text style={styles.formLabel}>Hora *</Text>
                       <TouchableOpacity
                         style={[
                    styles.timeSelectorButton,
                    !newProfessionalAppointment.date && styles.timeSelectorButtonDisabled,
                    newProfessionalAppointment.time && styles.timeSelectorButtonValid
                  ]}
                  onPress={() => {
                    if (newProfessionalAppointment.date) {
                      setShowTimePickerModal(true);
                    }
                  }}
                  disabled={!newProfessionalAppointment.date}
                       >
                         <Text style={[
                    styles.timeSelectorText,
                    !newProfessionalAppointment.time && styles.timeSelectorPlaceholder
                         ]}>
                    {newProfessionalAppointment.time || 
                      (newProfessionalAppointment.date 
                        ? 'Seleccionar horario disponible...' 
                        : 'Primero selecciona una fecha')}
                         </Text>
                  {newProfessionalAppointment.time ? (
                    <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                  ) : (
                    <Ionicons 
                      name="time" 
                      size={20} 
                      color={newProfessionalAppointment.date ? "#667eea" : "#ccc"} 
                    />
                  )}
                </TouchableOpacity>
             </View>

              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Notas</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={newProfessionalAppointment.notes}
                  onChangeText={(text) => setNewProfessionalAppointment(prev => ({ ...prev, notes: text }))}
                  placeholder="Agregar notas o comentarios..."
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={3}
                />
              </View>

              {/* Botón de debug temporal */}
              {!isProfessional && (
                <View style={styles.formSection}>
                  <TouchableOpacity
                    style={styles.debugButton}
                    onPress={() => {
                      Alert.alert(
                        'DEBUG - Valores del Formulario',
                        `Servicio: "${newProfessionalAppointment.service}"\n` +
                        `Profesional: "${newProfessionalAppointment.professionalName}"\n` +
                        `Fecha: "${newProfessionalAppointment.date}"\n` +
                        `Hora: "${newProfessionalAppointment.time}"\n\n` +
                        `Tipo de usuario: ${user?.userType}\n` +
                        `isProfessional: ${isProfessional}`,
                        [{ text: 'OK', style: 'default' }]
                      );
                    }}
                  >
                    <Text style={styles.debugButtonText}>🔍 Debug - Ver Valores</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Detalle de costos */}
              <View style={styles.costSection}>
                <Text style={styles.costSectionTitle}>Detalle de Costos</Text>
                
                <View style={styles.costRow}>
                  <Text style={styles.costLabel}>Costo de la Consulta:</Text>
                  <Text style={styles.costValue}>$10,000</Text>
                </View>
                
                <View style={styles.costRow}>
                  <Text style={styles.costLabel}>Seña (20%):</Text>
                  <Text style={styles.costValue}>$2,000</Text>
                </View>
                
                <View style={styles.costDivider} />
                
                <View style={styles.costRow}>
                  <Text style={styles.costLabel}>Total a pagar:</Text>
                  <Text style={styles.costTotal}>$10,000</Text>
                </View>
                
                <View style={styles.costNote}>
                  <Text style={styles.costNoteText}>
                    * La seña de $2,000 se debe pagar para confirmar la cita
                  </Text>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowModal(false);
                  resetNewAppointmentForm();
                }}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={async () => {
                  // Debug: Mostrar valores actuales
                  console.log('🔍 DEBUG - Valores del formulario:', {
                    service: newProfessionalAppointment.service,
                    professionalName: newProfessionalAppointment.professionalName,
                    date: newProfessionalAppointment.date,
                    time: newProfessionalAppointment.time,
                    isProfessional,
                    userType: user?.userType
                  });

                  // Validar que todos los campos estén completos según el tipo de usuario
                  if (isProfessional) {
                    if (!newProfessionalAppointment.patientName || !newProfessionalAppointment.date || !newProfessionalAppointment.time) {
                      Alert.alert(
                        'Campos Incompletos', 
                        'Para crear una cita debes completar:\n\n• Paciente\n• Fecha\n• Hora',
                        [{ text: 'Entendido', style: 'default' }]
                      );
                      return;
                    }
                  } else {
                    // Validación específica para clientes
                    const missingFields = [];
                    
                    if (!newProfessionalAppointment.service || newProfessionalAppointment.service.trim() === '') {
                      missingFields.push('• Servicio');
                    }
                    if (!newProfessionalAppointment.professionalName || newProfessionalAppointment.professionalName.trim() === '') {
                      missingFields.push('• Profesional');
                    }
                    if (!newProfessionalAppointment.date || newProfessionalAppointment.date.trim() === '') {
                      missingFields.push('• Fecha');
                    }
                    if (!newProfessionalAppointment.time || newProfessionalAppointment.time.trim() === '') {
                      missingFields.push('• Hora');
                    }
                    
                    console.log('🔍 DEBUG - Campos faltantes:', missingFields);
                    console.log('🔍 DEBUG - Longitud de campos:', {
                      service: newProfessionalAppointment.service?.length,
                      professionalName: newProfessionalAppointment.professionalName?.length,
                      date: newProfessionalAppointment.date?.length,
                      time: newProfessionalAppointment.time?.length
                    });
                    
                    if (missingFields.length > 0) {
                      Alert.alert(
                        'Reserva Incompleta', 
                        `Para reservar tu cita con seña debes completar:\n\n${missingFields.join('\n')}`,
                        [{ text: 'Entendido', style: 'default' }]
                      );
                      return;
                    }
                  }
                  
                  // Crear la cita y enviar notificación al cliente
                  console.log('🚀 DEBUG - Ejecutando handleCreateAppointmentAndNotifyClient...');
                  try {
                    await handleCreateAppointmentAndNotifyClient();
                    console.log('✅ DEBUG - handleCreateAppointmentAndNotifyClient completado exitosamente');
                  } catch (error) {
                    console.error('❌ DEBUG - Error en handleCreateAppointmentAndNotifyClient:', error);
                    Alert.alert('Error', 'Hubo un problema al crear la reserva. Revisa la consola para más detalles.');
                  }
                }}
                disabled={isCreatingAppointment}
              >
                {isCreatingAppointment ? (
                  <Text style={styles.saveButtonText}>Creando...</Text>
                ) : (
                  <Text style={styles.saveButtonText}>
                    {isProfessional ? 'Crear Cita y Notificar Cliente' : 'Reservar Cita con Seña'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Modal selector de fecha */}
      <Modal
          visible={showDatePickerModal}
        animationType="slide"
          transparent={false}
          onRequestClose={() => setShowDatePickerModal(false)}
      >
          <View style={styles.datePickerModalContainer}>
            <View style={styles.datePickerModalHeader}>
              <Text style={styles.datePickerModalTitle}>Seleccionar Fecha</Text>
            <TouchableOpacity
                onPress={() => setShowDatePickerModal(false)}
                style={styles.datePickerCloseButton}
            >
                <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

            <View style={styles.calendarContainer}>
              {/* Navegación del mes */}
              <View style={styles.calendarNavigation}>
                <TouchableOpacity
                  style={styles.calendarNavButton}
                  onPress={() => {
                    setCurrentMonth(prev => {
                      const newMonth = new Date(prev);
                      newMonth.setMonth(prev.getMonth() - 1);
                      return newMonth;
                    });
                  }}
                >
                  <Ionicons name="chevron-back" size={24} color="#007AFF" />
                </TouchableOpacity>
                
                <Text style={styles.calendarMonthText}>
                  {currentMonth.toLocaleDateString('es-ES', { 
                    month: 'long', 
                    year: 'numeric' 
                  })}
             </Text>
             
                   <TouchableOpacity
                  style={styles.calendarNavButton}
                  onPress={() => {
                    setCurrentMonth(prev => {
                      const newMonth = new Date(prev);
                      newMonth.setMonth(prev.getMonth() + 1);
                      return newMonth;
                    });
                  }}
                >
                  <Ionicons name="chevron-forward" size={24} color="#007AFF" />
                   </TouchableOpacity>
               </View>

              {/* Días de la semana */}
              <View style={styles.weekDaysContainer}>
                {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((day, index) => (
                  <Text key={`weekday-${day}-${index}`} style={styles.weekDayText}>{day}</Text>
                ))}
             </View>
             
              {/* Calendario */}
              <View style={styles.calendarGrid}>
                {getDaysInMonth(currentMonth).map((dayObj, index) => (
                 <TouchableOpacity
                    key={`day-${dayObj.day}-${index}`}
                    style={[
                      styles.calendarDay,
                      !dayObj.isCurrentMonth && styles.calendarDayOtherMonth,
                      !dayObj.isAvailable && styles.calendarDayUnavailable,
                      dayObj.isAvailable && styles.calendarDayAvailable
                    ]}
                   onPress={() => {
                      if (dayObj.isAvailable) {
                        const selectedDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), dayObj.day);
                        // Mostrar solo el día disponible en formato más simple
                        const formattedDate = selectedDate.toLocaleDateString('es-ES', {
                          day: 'numeric',
                          month: 'long'
                        });
                        setNewProfessionalAppointment(prev => ({ ...prev, date: formattedDate }));
                        setShowDatePickerModal(false);
                      }
                    }}
                    disabled={!dayObj.isAvailable}
                  >
                    <Text style={[
                      styles.calendarDayText,
                      !dayObj.isCurrentMonth && styles.calendarDayTextOtherMonth,
                      !dayObj.isAvailable && styles.calendarDayTextUnavailable,
                      dayObj.isAvailable && styles.calendarDayTextAvailable
                    ]}>
                      {dayObj.day}
                    </Text>
                 </TouchableOpacity>
               ))}
                 </View>
            </View>
        </View>
      </Modal>

        {/* Modal selector de hora */}
      <Modal
          visible={showTimePickerModal}
        animationType="slide"
          transparent={false}
          onRequestClose={() => setShowTimePickerModal(false)}
      >
          <View style={styles.timePickerModalContainer}>
            <View style={styles.timePickerModalHeader}>
              <Text style={styles.timePickerModalTitle}>Seleccionar Hora</Text>
            <TouchableOpacity
                onPress={() => setShowTimePickerModal(false)}
                style={styles.timePickerCloseButton}
            >
                <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

            <View style={styles.timeSlotsContainer}>
              {availableTimeSlots.map((time, index) => (
                <TouchableOpacity
                  key={`time-${time}-${index}`}
                  style={styles.timeSlotItem}
                  onPress={() => {
                    setNewProfessionalAppointment(prev => ({ ...prev, time }));
                    setShowTimePickerModal(false);
                  }}
                >
                  <Text style={styles.timeSlotText}>{time}</Text>
                  <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Modal>

        {/* Modal de catálogo de pacientes */}
        <Modal
          visible={showPatientCatalogModal}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <KeyboardAvoidingView 
            style={styles.modalContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Seleccionar Paciente</Text>
                 <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  setShowPatientCatalogModal(false);
                  setPatientSearchQuery('');
                }}
              >
                <Ionicons name="close" size={24} color="#666" />
                 </TouchableOpacity>
               </View>
             
            <View style={styles.catalogHeader}>
             <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#666" />
                 <TextInput
                   style={styles.searchInput}
                  placeholder="Buscar paciente..."
                  value={patientSearchQuery}
                  onChangeText={setPatientSearchQuery}
                   placeholderTextColor="#999"
                 />
              </View>
              
              <View style={styles.viewToggleContainer}>
                   <TouchableOpacity
                  style={[
                    styles.viewToggleButton,
                    catalogView === 'list' && styles.viewToggleButtonActive
                  ]}
                  onPress={() => setCatalogView('list')}
                >
                  <Ionicons 
                    name="list" 
                    size={20} 
                    color={catalogView === 'list' ? '#667eea' : '#666'} 
                  />
                   </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.viewToggleButton,
                    catalogView === 'grid' && styles.viewToggleButtonActive
                  ]}
                  onPress={() => setCatalogView('grid')}
                >
                  <Ionicons 
                    name="grid" 
                    size={20} 
                    color={catalogView === 'grid' ? '#667eea' : '#666'} 
                  />
                </TouchableOpacity>
               </View>
             </View>
             
            <ScrollView style={styles.catalogContent}>
              {catalogView === 'list' ? (
                // Vista de lista
                <View style={styles.patientList}>
                  {getFilteredPatients().map((patient) => (
               <TouchableOpacity
                      key={patient.id}
                      style={styles.patientListItem}
                      onPress={() => handlePatientSelect(patient)}
                    >
                      <View style={styles.patientAvatar}>
                        <Text style={styles.patientInitials}>
                          {patient.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.patientInfo}>
                        <Text style={styles.patientName}>{patient.name}</Text>
                        <Text style={styles.patientDetails}>
                          {patient.phone} • {patient.email}
                        </Text>
                        {patient.lastVisit && (
                          <Text style={styles.patientLastVisit}>
                            Última visita: {patient.lastVisit}
                          </Text>
                        )}
                      </View>
                      <Ionicons name="chevron-forward" size={20} color="#666" />
               </TouchableOpacity>
             ))}
                </View>
              ) : (
                // Vista de cuadrícula
                <View style={styles.patientGrid}>
                  {getFilteredPatients().map((patient) => (
                   <TouchableOpacity
                      key={patient.id}
                      style={styles.patientGridItem}
                      onPress={() => handlePatientSelect(patient)}
                    >
                      <View style={styles.patientAvatar}>
                        <Text style={styles.patientInitials}>
                          {patient.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </Text>
                      </View>
                      <Text style={styles.patientGridName}>{patient.name}</Text>
                      <Text style={styles.patientGridPhone}>{patient.phone}</Text>
                   </TouchableOpacity>
                  ))}
               </View>
             )}
           </ScrollView>
          </KeyboardAvoidingView>
       </Modal>

        {/* Modal de selección de servicios */}
      <Modal
          visible={showServiceSelectorModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
          <KeyboardAvoidingView 
            style={styles.modalContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
          <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Seleccionar Servicio</Text>
            <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  setShowServiceSelectorModal(false);
                  setServiceSearchQuery('');
                }}
              >
                <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

            <View style={styles.catalogHeader}>
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#666" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Buscar servicio..."
                  value={serviceSearchQuery}
                  onChangeText={setServiceSearchQuery}
                  placeholderTextColor="#999"
                />
              </View>
            </View>
            
            <ScrollView style={styles.catalogContent}>
              <View style={styles.serviceList}>
                {getFilteredServices().map((service) => (
              <TouchableOpacity
                    key={service.id}
                    style={styles.serviceListItem}
                    onPress={() => handleServiceSelect(service)}
                  >
                    <View style={styles.serviceIcon}>
                      <Ionicons name="medical" size={24} color="#667eea" />
                  </View>
                    <View style={styles.serviceInfo}>
                      <Text style={styles.serviceName}>{service.name}</Text>
                      <Text style={styles.serviceDescription}>{service.description}</Text>
                      <View style={styles.serviceDetails}>
                        <Text style={styles.serviceDuration}>{service.duration}</Text>
                        <Text style={styles.servicePrice}>${service.price.toLocaleString()}</Text>
                </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#666" />
              </TouchableOpacity>
            ))}
              </View>
          </ScrollView>
          </KeyboardAvoidingView>
      </Modal>

        {/* Modal de selección de profesionales */}
       <Modal
          visible={showProfessionalSelectorModal}
         animationType="slide"
         presentationStyle="pageSheet"
       >
          <KeyboardAvoidingView 
            style={styles.modalContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
           <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Seleccionar Profesional</Text>
             <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  setShowProfessionalSelectorModal(false);
                  setProfessionalSearchQuery('');
                }}
              >
                <Ionicons name="close" size={24} color="#666" />
             </TouchableOpacity>
           </View>

            <View style={styles.catalogHeader}>
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#666" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Buscar profesional..."
                  value={professionalSearchQuery}
                  onChangeText={setProfessionalSearchQuery}
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            <ScrollView style={styles.catalogContent}>
              {getFilteredProfessionals().length > 0 ? (
                <View style={styles.professionalList}>
                  {getFilteredProfessionals().map((professional) => (
                    <TouchableOpacity
                      key={professional.id}
                      style={styles.professionalListItem}
                      onPress={() => handleProfessionalSelect(professional)}
                    >
                      <View style={styles.professionalAvatar}>
                        <Text style={styles.professionalInitials}>
                          {professional.avatar}
                 </Text>
               </View>
                      <View style={styles.professionalInfo}>
                        <Text style={styles.professionalName}>{professional.name}</Text>
                        <Text style={styles.professionalSpecialty}>{professional.specialty}</Text>
                        <View style={styles.professionalDetails}>
                          <View style={styles.professionalRating}>
                            <Ionicons name="star" size={16} color="#FFD700" />
                            <Text style={styles.professionalRatingText}>{professional.rating}</Text>
           </View>
                          <Text style={styles.professionalExperience}>{professional.experience}</Text>
                          <Text style={styles.professionalLocation}>{professional.location}</Text>
         </View>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color="#666" />
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyStateContainer}>
                  <Ionicons name="people-outline" size={48} color="#ccc" />
                  <Text style={styles.emptyStateTitle}>
                    {newProfessionalAppointment.service 
                      ? 'No hay profesionales disponibles para este servicio'
                      : 'Selecciona un servicio primero'
                    }
                  </Text>
                  <Text style={styles.emptyStateSubtitle}>
                    {newProfessionalAppointment.service 
                      ? 'Intenta con otro servicio o contacta soporte'
                      : 'El profesional aparecerá una vez que selecciones el servicio'
                    }
                  </Text>
                </View>
              )}
       </ScrollView>
          </KeyboardAvoidingView>
        </Modal>

        {/* Modal de MercadoPago */}
         <Modal
          visible={showMercadoPagoModal}
           animationType="slide"
          presentationStyle="pageSheet"
        >
          <KeyboardAvoidingView 
            style={styles.modalContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
               <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pagar Seña con MercadoPago</Text>
                 <TouchableOpacity
                   style={styles.closeButton}
                onPress={() => setShowMercadoPagoModal(false)}
                 >
                   <Ionicons name="close" size={24} color="#666" />
                 </TouchableOpacity>
               </View>

            <View style={styles.modalContent}>
                 <View style={styles.formSection}>
                <Text style={styles.formLabel}>Detalles del Pago</Text>
                <View style={styles.paymentDetailsContainer}>
                  <View style={styles.paymentDetailRow}>
                    <Text style={styles.paymentDetailLabel}>Servicio:</Text>
                    <Text style={styles.paymentDetailValue}>{newProfessionalAppointment.service}</Text>
                 </View>
                  <View style={styles.paymentDetailRow}>
                    <Text style={styles.paymentDetailLabel}>Profesional:</Text>
                    <Text style={styles.paymentDetailValue}>{newProfessionalAppointment.professionalName}</Text>
                  </View>
                  <View style={styles.paymentDetailRow}>
                    <Text style={styles.paymentDetailLabel}>Fecha y Hora:</Text>
                    <Text style={styles.paymentDetailValue}>{newProfessionalAppointment.date} - {newProfessionalAppointment.time}</Text>
                  </View>
                  <View style={styles.paymentDetailRow}>
                    <Text style={styles.paymentDetailLabel}>Monto a Pagar:</Text>
                    <Text style={styles.paymentDetailValue}>$2,000 ARS</Text>
                  </View>
                </View>
                 </View>

                 <View style={styles.formSection}>
                <Text style={styles.formLabel}>Información del Cliente</Text>
                <View style={styles.paymentDetailsContainer}>
                  <View style={styles.paymentDetailRow}>
                    <Text style={styles.paymentDetailLabel}>Nombre:</Text>
                    <Text style={styles.paymentDetailValue}>{user?.fullName || 'Cliente'}</Text>
                  </View>
                  <View style={styles.paymentDetailRow}>
                    <Text style={styles.paymentDetailLabel}>Email:</Text>
                    <Text style={styles.paymentDetailValue}>{user?.email || 'cliente@example.com'}</Text>
                  </View>
                </View>
                 </View>

              <View style={styles.costNote}>
                <Text style={styles.costNoteText}>
                  💳 Al confirmar, serás redirigido a MercadoPago para completar el pago de la seña
                </Text>
                 </View>

              {/* Información del pago */}
              <View style={styles.paymentInfoContainer}>
                <View style={styles.paymentInfoRow}>
                  <Ionicons name="information-circle" size={20} color="#3B82F6" />
                  <Text style={styles.paymentInfoText}>
                    Pago de seña para confirmar tu cita
                  </Text>
                </View>
                <Text style={styles.paymentInfoSubtext}>
                  Al presionar "Pagar con MercadoPago" serás redirigido para completar el pago
                </Text>
              </View>
                 </View>

            <View style={styles.modalActions}>
                   <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowMercadoPagoModal(false)}
                   >
                     <Text style={styles.cancelButtonText}>Cancelar</Text>
                   </TouchableOpacity>
                   
                   <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={openMercadoPago}
                disabled={!mercadoPagoPreference || isCreatingMercadoPagoPreference}
              >
                {isCreatingMercadoPagoPreference ? (
                  <Text style={styles.saveButtonText}>Creando Pago...</Text>
                ) : (
                  <Text style={styles.saveButtonText}>
                    {mercadoPagoPreference ? 'Pagar con MercadoPago' : 'Procesando...'}
                  </Text>
                )}
                   </TouchableOpacity>
                 </View>
          </KeyboardAvoidingView>
         </Modal>
      </ScrollView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
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
    fontSize: 14,
    color: '#666',
    textTransform: 'capitalize',
  },
  toggleButton: {
    padding: 8,
    backgroundColor: '#f0f2ff',
    borderRadius: 8,
  },
  statsContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15,
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
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  section: {
    padding: 20,
  },
  emptyAppointmentsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyAppointmentsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyAppointmentsSubtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
  actionContainer: {
    padding: 20,
    gap: 15,
  },
  actionButton: {
    backgroundColor: '#667eea',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
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
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#667eea',
  },
  secondaryButtonText: {
    color: '#667eea',
  },
  
  // Estilos del modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#374151',
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  modalText: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 20,
    textAlign: 'center',
  },
  formSection: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  formText: {
    fontSize: 14,
    color: '#6B7280',
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
  },
  formActions: {
    marginTop: 20,
  },
  formButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cancelButtonText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Estilos para el modal de reserva de cita
  modalScrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  selectorButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#FFFFFF',
  },
  selectorButtonText: {
    fontSize: 14,
    color: '#374151',
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#374151',
    backgroundColor: '#FFFFFF',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  confirmButton: {
    backgroundColor: '#667eea',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginTop: 20,
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Estilos para el selector de servicios
  serviceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  serviceItemText: {
    fontSize: 16,
    color: '#374151',
  },
  
  // Estilos para el selector de profesionales
  professionalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  professionalInfo: {
    flex: 1,
  },
  professionalName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  professionalService: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  professionalDetails: {
    flexDirection: 'row',
    gap: 16,
  },
  professionalRating: {
    fontSize: 12,
    color: '#F59E0B',
  },
  professionalPrice: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
  },
  
  // Estilos para el calendario
  calendarContainer: {
    padding: 20,
  },
  calendarNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  calendarNavButton: {
    padding: 8,
  },
  calendarMonthText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    textTransform: 'capitalize',
  },
  weekDaysContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  weekDayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  calendarDayOtherMonth: {
    backgroundColor: '#F9FAFB',
  },
  calendarDayUnavailable: {
    backgroundColor: '#F3F4F6',
  },
  calendarDayAvailable: {
    backgroundColor: '#E8F5E9', // Verde claro para días disponibles
  },
  calendarDayText: {
    fontSize: 16,
    color: '#374151',
  },
  calendarDayTextOtherMonth: {
    color: '#9CA3AF',
  },
  calendarDayTextUnavailable: {
    color: '#D1D5DB',
  },
  calendarDayTextAvailable: {
    color: '#2E7D32', // Verde oscuro para el texto de días disponibles
  },
  
  // Estilos para el selector de hora
  timeSlotsContainer: {
    padding: 20,
  },
  timeSlotItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  timeSlotText: {
    fontSize: 16,
    color: '#374151',
  },
  
  // Estilos para el modal de nueva cita
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#667eea',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
  },
  closeButton: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 15,
    backgroundColor: '#F8FAFC',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cancelButton: {
    backgroundColor: '#F1F5F9',
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  cancelButtonText: {
    color: '#64748B',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#667eea',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Estilos para el formulario de nueva cita
  formSection: {
    marginBottom: 20,
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#667eea',
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#667eea',
    marginBottom: 10,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 14,
    fontSize: 14,
    color: '#374151',
    backgroundColor: '#F8FAFC',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  
  // Estilos para selectores
  serviceSelectorButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#667eea',
    borderRadius: 10,
    padding: 14,
    backgroundColor: '#F0F9FF',
  },
  serviceSelectorButtonDisabled: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
  },
  serviceSelectorText: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '500',
  },
  serviceSelectorPlaceholder: {
    color: '#94A3B8',
  },
  
  patientSelectorButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#667eea',
    borderRadius: 10,
    padding: 14,
    backgroundColor: '#F0F9FF',
  },
  patientSelectorText: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '500',
  },
  patientSelectorPlaceholder: {
    color: '#94A3B8',
  },
  
  dateSelectorButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#667eea',
    borderRadius: 10,
    padding: 14,
    backgroundColor: '#F0F9FF',
  },
  dateSelectorText: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '500',
  },
  dateSelectorPlaceholder: {
    color: '#94A3B8',
  },
  
  timeSelectorButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#667eea',
    borderRadius: 10,
    padding: 14,
    backgroundColor: '#F0F9FF',
  },
  timeSelectorButtonDisabled: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
  },
  timeSelectorText: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '500',
  },
  timeSelectorPlaceholder: {
    color: '#94A3B8',
  },
  
  // Estilos para el catálogo de pacientes
  catalogHeader: {
    flexDirection: 'column',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 15,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 10,
    fontSize: 14,
    color: '#374151',
  },
  viewToggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 4,
  },
  viewToggleButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
  },
  viewToggleButtonActive: {
    backgroundColor: '#E2E8F0',
  },
  catalogContent: {
    flex: 1,
    padding: 20,
  },
  patientList: {
    //
  },
  patientListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  patientAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  patientInitials: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  patientDetails: {
    fontSize: 14,
    color: '#6B7280',
  },
  patientLastVisit: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  patientGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  patientGridItem: {
    width: '48%', // Para 2 columnas en cuadrícula
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  patientGridName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  patientGridPhone: {
    fontSize: 14,
    color: '#6B7280',
  },

  // Estilos para el modal de fecha
  datePickerModalContainer: {
    flex: 1,
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    alignSelf: 'center',
    alignContent: 'center',
    justifyContent: 'center',
  },
  datePickerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  datePickerModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#374151',
  },
  datePickerCloseButton: {
    padding: 4,
  },

  // Estilos para el modal de hora
  timePickerModalContainer: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  timePickerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  timePickerModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#374151',
  },
  timePickerCloseButton: {
    padding: 4,
  },

  // Estilos para el detalle de costos
  costSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 2,
    borderTopColor: '#E2E8F0',
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  costSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#667eea',
    marginBottom: 15,
    textAlign: 'center',
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
  },
  costLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  costValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  costDivider: {
    height: 2,
    backgroundColor: '#667eea',
    marginVertical: 15,
    borderRadius: 1,
  },
  costTotal: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  costNote: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  costNoteText: {
    fontSize: 12,
    color: '#166534',
    textAlign: 'center',
    fontWeight: '500',
  },

  // Estilos para el selector de servicios
  serviceList: {
    padding: 20,
  },
  serviceListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  serviceIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F0F9FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  serviceDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  serviceDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  serviceDuration: {
    fontSize: 12,
    color: '#667eea',
    fontWeight: '500',
  },
  servicePrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
  },

  // Estilos para el selector de profesionales
  professionalList: {
    padding: 20,
  },
  professionalListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  professionalAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#667eea',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  professionalInitials: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  professionalInfo: {
    flex: 1,
  },
  professionalName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  professionalSpecialty: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  professionalDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  professionalRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  professionalRatingText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  professionalExperience: {
    fontSize: 12,
    color: '#667eea',
    fontWeight: '500',
  },
  professionalLocation: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  emptyStateContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Estilos para campos válidos
  serviceSelectorButtonValid: {
    borderColor: '#4CAF50',
    backgroundColor: '#F0FDF4',
  },
  patientSelectorButtonValid: {
    borderColor: '#4CAF50',
    backgroundColor: '#F0FDF4',
  },
  dateSelectorButtonValid: {
    borderColor: '#4CAF50',
    backgroundColor: '#F0FDF4',
  },
  timeSelectorButtonValid: {
    borderColor: '#4CAF50',
    backgroundColor: '#F0FDF4',
  },

  // Estilos para el progreso del formulario
  modalHeaderLeft: {
    flex: 1,
  },
  formProgressContainer: {
    marginTop: 8,
  },
  formProgressText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  formProgressBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  formProgressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 2,
  },

  // Estilos para el botón de debug
  debugButton: {
    backgroundColor: '#FF6B6B',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  debugButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },

  // Estilos para el modal de MercadoPago
  paymentDetailsContainer: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  paymentDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  paymentDetailLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  paymentDetailValue: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },

  // Estilos para el estado de la preferencia
  preferenceStatusContainer: {
    backgroundColor: '#F0FDF4',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  preferenceStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  preferenceStatusText: {
    fontSize: 14,
    color: '#166534',
    fontWeight: '600',
    marginLeft: 8,
  },
  preferenceIdText: {
    fontSize: 12,
    color: '#059669',
    fontFamily: 'monospace',
  },
  
  // Estilos para el botón de prueba de URLs
  testUrlButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  testUrlButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Estilos para la información de pago
  paymentInfoContainer: {
    backgroundColor: '#EFF6FF',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  paymentInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  paymentInfoText: {
    fontSize: 14,
    color: '#1E40AF',
    fontWeight: '600',
    marginLeft: 8,
  },
  paymentInfoSubtext: {
    fontSize: 12,
    color: '#3B82F6',
    marginLeft: 28,
  },
});
