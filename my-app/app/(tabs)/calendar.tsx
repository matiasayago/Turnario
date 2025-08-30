import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import ConditionalScreen from '../../components/ConditionalScreen';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { useAppointments } from '../../contexts/AppointmentContext';
import { useReservaConSena } from '../../contexts/ReservaConSenaContext';
import CustomCalendar from '../../components/CustomCalendar';
import { openMercadoPagoDirectly } from '../../config/mercadopago';
import { SERVICES, searchServices } from '../../constants/services';

export default function CalendarScreen() {
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  const { addAppointment, getUpcomingAppointments, appointments } = useAppointments();
  const { shouldOpenReservaConSenaModal, closeReservaConSenaModal, openReservaConSenaModal } = useReservaConSena();
  const [refreshing, setRefreshing] = useState(false);
  const isProfessional = user?.userType === 'professional';
  
  // Estados para el modal principal de reserva (igual que en Hoy)
  const [showModal, setShowModal] = useState(false);
  const [newProfessionalAppointment, setNewProfessionalAppointment] = useState({
    service: isProfessional ? (user?.service || '') : '',
    date: '',
    time: '',
    patientName: '',
    patientPhone: '',
    patientEmail: '',
    professionalName: '',
    notes: '',
  });
  
  // Estados para los selectores modales
  const [showServiceSelectorModal, setShowServiceSelectorModal] = useState(false);
  const [showProfessionalSelectorModal, setShowProfessionalSelectorModal] = useState(false);
  const [showDatePickerModal, setShowDatePickerModal] = useState(false);
  const [showTimePickerModal, setShowTimePickerModal] = useState(false);
  
  // Estados para búsquedas
  const [serviceSearchQuery, setServiceSearchQuery] = useState('');
  const [professionalSearchQuery, setProfessionalSearchQuery] = useState('');
  
  // Estados para el calendario
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState('');
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);
  
  // Estados para el modal de pago
  const [showMercadoPagoModal, setShowMercadoPagoModal] = useState(false);
  const [isCreatingMercadoPagoPreference, setIsCreatingMercadoPagoPreference] = useState(false);
  
  // Estados para el modal de reserva con seña (mantener compatibilidad)
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [serviceFilter, setServiceFilter] = useState('');
  const [professionalFilter, setProfessionalFilter] = useState('');
  const [selectedServiceOld, setSelectedServiceOld] = useState('');
  const [selectedProfessionalOld, setSelectedProfessionalOld] = useState('');
  const [selectedDateOld, setSelectedDateOld] = useState('');
  const [selectedTimeOld, setSelectedTimeOld] = useState('');
  const [notesOld, setNotesOld] = useState('');
  const [showDateModal, setShowDateModal] = useState(false);
  const [markedDates, setMarkedDates] = useState({});
  const [availableSlots, setAvailableSlots] = useState([]);

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  // Función para abrir el modal de reserva con seña desde la tab "Calendario"
  const handleOpenReservaConSena = () => {
    console.log('🎯 Abriendo modal completo de Reserva con Seña desde Calendario');
    // Usar el estado local showModal en lugar del contexto
    setShowModal(true);
  };

  // Función para cerrar el modal de reserva con seña
  const handleCloseReservaConSenaModal = () => {
    console.log('🎯 Cerrando modal de Reserva con Seña');
    setShowModal(false);
    resetNewAppointmentForm();
  };

  // Función para resetear el formulario de nueva cita
  const resetNewAppointmentForm = () => {
    setNewProfessionalAppointment({
      service: isProfessional ? (user?.service || '') : '',
      date: '',
      time: '',
      patientName: '',
      patientPhone: '',
      patientEmail: '',
      professionalName: '',
      notes: '',
    });
    setSelectedDate('');
    setAvailableTimeSlots([]);
    console.log('🔄 Formulario de nueva cita reseteado');
  };

  // Función para seleccionar un servicio
  const handleServiceSelect = (service: string) => {
    setNewProfessionalAppointment(prev => ({
      ...prev,
      service: service,
      professionalName: '', // Resetear profesional al cambiar servicio
    }));
    
    // Cerrar el selector de servicios
    setShowServiceSelectorModal(false);
    setServiceSearchQuery('');
    
    // Volver al formulario de Crear Nueva Cita
    setShowModal(true);
  };

  // Función para seleccionar un profesional
  const handleProfessionalSelect = (professional: string) => {
    setNewProfessionalAppointment(prev => ({
      ...prev,
      professionalName: professional,
    }));
    
    // Cerrar el selector de profesionales
    setShowProfessionalSelectorModal(false);
    setProfessionalSearchQuery('');
    
    // Volver al formulario de Crear Nueva Cita
    setShowModal(true);
  };

  // Función para obtener servicios filtrados
  const getFilteredServices = () => {
    if (!serviceSearchQuery.trim()) return SERVICES;
    return searchServices(serviceSearchQuery);
  };

  // Función para obtener profesionales filtrados
  const getFilteredProfessionals = () => {
    const allProfessionals = [
      'Dr. Ana Martínez - Psicología Clínica',
      'Dr. Carlos López - Medicina General',
      'Sofía Rodríguez - Peluquería',
      'Lic. Emilia Vargas - Fonoaudióloga de Articulación',
      'Lic. Benjamín Herrera - Fonoaudiólogo de Comprensión',
      'Lic. Isidora Silva - Fonoaudiólogo de Expresión',
      
      // Nutricionistas
      'Lic. Camila Torres - Nutricionista Clínica',
      'Lic. Diego Morales - Nutricionista Deportivo',
      'Lic. Valeria Jiménez - Nutricionista Pediátrica',
      
      // Fisioterapeutas
      'Lic. Roberto Silva - Fisioterapeuta Ortopédico',
      'Lic. Gabriela Herrera - Fisioterapeuta Neurológico',
      'Lic. Fernando Morales - Fisioterapeuta Deportivo',
      
      // Odontólogos
      'Dr. Patricia Vargas - Odontóloga General',
      'Dr. Manuel Torres - Odontólogo Pediátrico',
      'Dra. Lucía Morales - Ortodoncista',
      
      // Psicopedagogos
      'Lic. Carmen Jiménez - Psicopedagoga',
      'Lic. Andrés Silva - Psicopedagogo',
      'Lic. Mariana Herrera - Psicopedagoga Especializada',
      
      // Terapistas Ocupacionales
      'Lic. Rodrigo Vargas - Terapista Ocupacional',
      'Lic. Daniela Torres - Terapista Ocupacional Pediátrica',
      'Lic. Sebastián Morales - Terapista Ocupacional Geriátrico'
    ];
    
    // Si no hay búsqueda, devolver todos los profesionales
    if (!professionalSearchQuery.trim()) {
      return allProfessionals;
    }
    
    // Si hay búsqueda, filtrar por el término
    const query = professionalSearchQuery.toLowerCase();
    return allProfessionals.filter(professional => 
      professional.toLowerCase().includes(query)
    );
  };

  // Función para crear preferencia de pago en MercadoPago


  // Función para abrir MercadoPago
  const openMercadoPago = async () => {
    try {
      setIsCreatingMercadoPagoPreference(true);
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
    } finally {
      setIsCreatingMercadoPagoPreference(false);
    }
  };

  const handleBookAppointment = () => {
    if (!selectedServiceOld || !selectedProfessionalOld || !selectedDateOld || !selectedTimeOld) {
      Alert.alert('Error', 'Por favor completa todos los campos obligatorios');
      return;
    }

    // Mapeo de nombres de profesionales a sus IDs reales
    const professionalIdMapping: { [key: string]: string } = {
      'Dr. Carlos Mendoza': 'prof_002',
      'Dr. Ana Martínez': 'prof_001',
      'Dr. María González': 'prof_003',
      'Dr. Alejandro Torres': 'prof_004',
      'Dr. Roberto Silva': 'prof_005',
      'Dr. Fernando Vargas': 'prof_006',
      'Dr. Miguel Ángel Rojas': 'prof_007',
      'Dr. Ricardo González': 'prof_008',
      'Dra. Patricia López': 'prof_009',
      'Dra. Isabel Fernández': 'prof_010',
      'Dra. Marcela Silva': 'prof_011',
      'Dr. Andrés Herrera': 'prof_012',
      'Dra. Carolina Ruiz': 'prof_013',
      'Dr. Felipe Torres': 'prof_014',
      'Dra. Verónica Castro': 'prof_015',
      'Dr. Sebastián Morales': 'prof_016',
      'Dra. Natalia Vargas': 'prof_017',
      'Dr. Leonardo Silva': 'prof_018',
      'Dra. Mariana Herrera': 'prof_019',
      'Dr. Cristóbal Mendoza': 'prof_020',
      'Dra. Francisca López': 'prof_021',
    };

    // Obtener el ID real del profesional o generar uno basado en el nombre
    const professionalId = professionalIdMapping[selectedProfessionalOld.split(' - ')[0]] || 
                          (selectedProfessionalOld.split(' - ')[0] || '').toLowerCase().replace(/\s+/g, '_');
    
    console.log('🔍 Debug - Profesional seleccionado:', selectedProfessionalOld);
    console.log('🔍 Debug - ID del profesional:', professionalId);
    
    // Agregar la cita al contexto
    addAppointment({
      service: selectedServiceOld,
      professional: selectedProfessionalOld,
      professionalId: professionalId,
      date: selectedDateOld,
      time: selectedTimeOld,
      notes: notesOld,
      clientId: user?.id || 'cliente',
      clientName: user?.fullName || 'Cliente',
    });
    
    // Enviar notificación al profesional
    addNotification({
      type: 'appointment_request',
      title: 'Nueva Solicitud de Cita',
      message: `Nueva solicitud de cita para ${selectedServiceOld}`,
      recipientId: professionalId,
      senderId: user?.id || 'cliente',
      senderName: user?.fullName || 'Cliente',
      appointmentData: {
        service: selectedServiceOld,
        date: selectedDateOld,
        time: selectedTimeOld,
        notes: notesOld,
      },
    });

    // Aquí iría la lógica para guardar la cita en la API
    console.log('Solicitud de cita enviada:', {
      service: selectedServiceOld,
      professional: selectedProfessionalOld,
      date: selectedDateOld,
      time: selectedTimeOld,
      notes: notesOld,
      status: 'pending',
    });

    Alert.alert(
      '¡Cita Solicitada!',
      `Tu solicitud de cita para ${selectedServiceOld} con ${selectedProfessionalOld} ha sido enviada para el ${selectedDateOld} a las ${selectedTimeOld}. El profesional recibirá una notificación y deberá confirmarla.`,
      [
        {
          text: 'OK',
          onPress: () => {
            setShowBookingModal(false);
            // Limpiar el formulario
            setSelectedServiceOld('');
            setSelectedProfessionalOld('');
            setSelectedDateOld('');
            setSelectedTimeOld('');
            setNotesOld('');
          },
        },
      ]
    );
  };

  const services = [
    // Psicología y Salud Mental
    'Consulta Psicológica',
    'Terapia Cognitivo-Conductual',
    'Terapia Psicoanalítica',
    'Terapia Familiar',
    'Terapia de Pareja',
    'Psicología Infantil',
    'Psicología Adolescente',
    'Psicología del Deporte',
    'Psicología Laboral',
    'Terapia de Grupo',
    'Evaluación Psicológica',
    'Intervención en Crisis',
    
    // Medicina General y Especialidades
    'Consulta Médica General',
    'Consulta de Pediatría',
    'Consulta de Geriatría',
    'Consulta de Ginecología',
    'Consulta de Cardiología',
    'Consulta de Dermatología',
    'Consulta de Endocrinología',
    'Consulta de Gastroenterología',
    'Consulta de Neurología',
    'Consulta de Oftalmología',
    'Consulta de Otorrinolaringología',
    'Consulta de Traumatología',
    'Consulta de Urología',
    'Consulta de Oncología',
    'Consulta de Reumatología',
    'Consulta de Neumología',
    
    // Terapias Físicas y Rehabilitación
    'Fisioterapia General',
    'Fisioterapia Deportiva',
    'Fisioterapia Neurológica',
    'Fisioterapia Respiratoria',
    'Fisioterapia Pediátrica',
    'Fisioterapia Geriátrica',
    'Rehabilitación Post-Quirúrgica',
    'Rehabilitación Neurológica',
    'Rehabilitación Cardíaca',
    'Rehabilitación Pulmonar',
    'Terapia Manual',
    'Punción Seca',
    'Electroterapia',
    'Hidroterapia',
    'Crioterapia',
    'Termoterapia',
    
    // Terapias Ocupacionales
    'Terapia Ocupacional General',
    'Terapia Ocupacional Pediátrica',
    'Terapia Ocupacional Geriátrica',
    'Terapia Ocupacional Neurológica',
    'Terapia Ocupacional Psiquiátrica',
    'Rehabilitación de Mano',
    'Adaptación del Hogar',
    'Evaluación de Conducción',
    'Terapia de Actividades de la Vida Diaria',
    
    // Terapias del Lenguaje y Comunicación
    'Terapia de Lenguaje',
    'Terapia de Habla',
    'Terapia de Voz',
    'Terapia de Deglución',
    'Terapia de Fluidez',
    'Terapia de Articulación',
    'Terapia de Comprensión',
    'Terapia de Expresión',
    'Terapia de Lectura y Escritura',
    'Terapia de Comunicación Aumentativa',
    
    // Nutrición y Dietética
    'Consulta Nutricional',
    'Nutrición Clínica',
    'Nutrición Pediátrica',
    'Nutrición Deportiva',
    'Nutrición Geriátrica',
    'Nutrición para Embarazadas',
    'Nutrición para Diabéticos',
    'Nutrición para Hipertensos',
    'Nutrición para Celíacos',
    'Nutrición para Alergias',
    'Planificación de Menús',
    'Educación Nutricional',
    
    // Psicopedagogía y Educación
    'Psicopedagogía General',
    'Evaluación Psicopedagógica',
    'Intervención en Dificultades de Aprendizaje',
    'Tratamiento de Dislexia',
    'Tratamiento de Discalculia',
    'Tratamiento de TDAH',
    'Técnicas de Estudio',
    'Orientación Vocacional',
    'Apoyo Escolar',
    'Estimulación Cognitiva',
    
    // Terapias Alternativas y Complementarias
    'Acupuntura',
    'Quiropraxia',
    'Osteopatía',
    'Reflexología',
    'Masaje Terapéutico',
    'Masaje Deportivo',
    'Masaje Relajante',
    'Yoga Terapéutico',
    'Pilates Terapéutico',
    'Tai Chi Terapéutico',
    'Meditación Guiada',
    'Terapia de Respiración',
    'Entrenador Personal',
    'Entrenamiento Funcional',
    'Entrenamiento de Fuerza',
    'Entrenamiento Cardiovascular',
    'Entrenamiento de Resistencia',
    'Entrenamiento de Flexibilidad',
    'Entrenamiento de Equilibrio',
    'Entrenamiento de Coordinación',
    'Entrenamiento de Velocidad',
    'Entrenamiento de Agilidad',
    'Entrenamiento de Potencia',
    'Entrenamiento de Core',
    'Entrenamiento de Postura',
    'Entrenamiento de Movilidad',
    'Entrenamiento de Recuperación',
    'Entrenamiento de Prevención de Lesiones',
    'Entrenamiento para Deportes Específicos',
    'Entrenamiento para Embarazadas',
    'Entrenamiento para Adultos Mayores',
    'Entrenamiento para Niños y Adolescentes',
    'Entrenamiento para Personas con Discapacidad',
    'Entrenamiento para Rehabilitación',
    'Entrenamiento para Rendimiento Deportivo',
    'Entrenamiento para Pérdida de Peso',
    'Entrenamiento para Ganancia Muscular',
    'Entrenamiento para Mejora de la Salud',
    'Entrenamiento para Reducción del Estrés',
    'Entrenamiento para Mejora del Sueño',
    'Entrenamiento para Mejora de la Energía',
    'Entrenamiento para Mejora de la Concentración',
    'Entrenamiento para Mejora de la Memoria',
    'Entrenamiento para Mejora de la Creatividad',
    'Entrenamiento para Mejora de la Productividad',
    'Entrenamiento para Mejora de la Calidad de Vida',
    
    // Servicios de Diagnóstico
    'Evaluación Funcional',
    'Evaluación Postural',
    'Evaluación de Marcha',
    'Evaluación de Equilibrio',
    'Evaluación de Fuerza',
    'Evaluación de Flexibilidad',
    'Evaluación de Coordinación',
    'Evaluación de Resistencia',
    'Test de Esfuerzo',
    'Análisis de Movimiento',
    
    // Servicios Especializados
    'Terapia de Integración Sensorial',
    'Terapia de Estimulación Temprana',
    'Terapia de Rehabilitación Vestibular',
    'Terapia de Rehabilitación del Suelo Pélvico',
    'Terapia de Rehabilitación del Dolor Crónico',
    'Terapia de Rehabilitación del Cáncer',
    'Terapia de Rehabilitación del VIH',
    'Terapia de Rehabilitación de la Obesidad',
    'Terapia de Rehabilitación del Tabaquismo',
    'Terapia de Rehabilitación del Alcoholismo',
    
    // Servicios de Prevención
    'Educación para la Salud',
    'Prevención de Caídas',
    'Prevención de Lesiones Deportivas',
    'Prevención de Problemas Posturales',
    'Prevención de Dolor de Espalda',
    'Prevención de Problemas Cardiovasculares',
    'Prevención de Problemas Respiratorios',
    'Prevención de Problemas Digestivos',
    'Prevención de Problemas del Sueño',
    'Prevención del Estrés',
    
    // Servicios de Emergencia y Urgencia
    'Atención de Emergencias',
    'Primeros Auxilios',
    'Reanimación Cardiopulmonar',
    'Manejo del Dolor Agudo',
    'Manejo de Crisis',
    'Intervención en Urgencias',
    'Estabilización de Pacientes',
    'Traslado de Pacientes',
    'Acompañamiento en Emergencias',
    'Apoyo Familiar en Crisis',
    
    // Servicios de Seguimiento
    'Seguimiento de Tratamiento',
    'Control de Evolución',
    'Ajuste de Terapias',
    'Reevaluación Periódica',
    'Mantenimiento de Resultados',
    'Prevención de Recaídas',
    'Apoyo Continuo',
    'Monitoreo de Progreso',
    'Ajuste de Objetivos',
    'Planificación de Alta',
    
    // Servicios de Apoyo y Educación
    'Educación del Paciente',
    'Educación de la Familia',
    'Entrenamiento de Cuidadores',
    'Apoyo Psicosocial',
    'Orientación Familiar',
    'Consejería',
    'Acompañamiento Terapéutico',
    'Apoyo en la Transición',
    'Preparación para Procedimientos',
    'Recuperación Post-Procedimiento',
    
    // Servicios de Investigación y Evaluación
    'Participación en Estudios Clínicos',
    'Evaluación de Nuevas Terapias',
    'Investigación en Rehabilitación',
    'Evaluación de Resultados',
    'Análisis de Datos Clínicos',
    'Desarrollo de Protocolos',
    'Validación de Instrumentos',
    'Investigación en Calidad de Vida',
    'Estudios de Satisfacción',
    'Evaluación de Costo-Efectividad'
  ];

  const professionals = [
    // Psicólogos y Psicoterapeutas
    'Dr. María González - Psicóloga Clínica',
    'Lic. Sofía Ramírez - Psicóloga Infantil',
    'Dr. Alejandro Torres - Psicólogo del Deporte',
    'Lic. Valeria Mendoza - Psicóloga Laboral',
    'Dr. Roberto Silva - Psicólogo Cognitivo-Conductual',
    'Lic. Camila Herrera - Psicóloga de Parejas',
    'Dr. Fernando Vargas - Psicólogo Psicoanalítico',
    'Lic. Daniela Castro - Psicóloga de Familia',
    'Dr. Miguel Ángel Rojas - Psicólogo de Crisis',
    'Lic. Gabriela Morales - Psicóloga de Grupo',
    
    // Médicos y Especialistas
    'Dr. Ana Martínez - Médica General',
    'Dr. Carlos Mendoza - Pediatra',
    'Dra. Patricia López - Geriatra',
    'Dra. Isabel Fernández - Ginecóloga',
    'Dr. Ricardo González - Cardiólogo',
    'Dra. Marcela Silva - Dermatóloga',
    'Dr. Andrés Herrera - Endocrinólogo',
    'Dra. Carolina Ruiz - Gastroenteróloga',
    'Dr. Felipe Torres - Neurólogo',
    'Dra. Verónica Castro - Oftalmóloga',
    'Dr. Sebastián Morales - Otorrinolaringólogo',
    'Dra. Natalia Vargas - Traumatóloga',
    'Dr. Leonardo Silva - Urólogo',
    'Dra. Mariana Herrera - Oncóloga',
    'Dr. Cristóbal Mendoza - Reumatólogo',
    'Dra. Francisca López - Neumóloga',
    
    // Fisioterapeutas
    'Lic. Pedro López - Fisioterapeuta General',
    'Lic. María José Silva - Fisioterapeuta Deportiva',
    'Lic. Francisco Torres - Fisioterapeuta Neurológico',
    'Lic. Catalina Herrera - Fisioterapeuta Respiratoria',
    'Lic. Matías Castro - Fisioterapeuta Pediátrico',
    'Lic. Javiera Morales - Fisioterapeuta Geriátrica',
    'Lic. Nicolás Vargas - Fisioterapeuta Post-Quirúrgico',
    'Lic. Constanza Silva - Fisioterapeuta de Rehabilitación',
    'Lic. Diego Herrera - Fisioterapeuta Manual',
    'Lic. Antonia Castro - Fisioterapeuta de Punción Seca',
    
    // Terapeutas Ocupacionales
    'Lic. Carlos Ruiz - Terapeuta Ocupacional General',
    'Lic. Valentina Silva - Terapeuta Ocupacional Pediátrica',
    'Lic. Felipe Morales - Terapeuta Ocupacional Geriátrica',
    'Lic. Fernanda Vargas - Terapeuta Ocupacional Neurológica',
    'Lic. Cristóbal Herrera - Terapeuta Ocupacional Psiquiátrica',
    'Lic. Magdalena Castro - Terapeuta Ocupacional de Mano',
    'Lic. Ignacio Silva - Terapeuta Ocupacional de Adaptación',
    'Lic. Trinidad Morales - Terapeuta Ocupacional de Evaluación',
    
    // Fonoaudiólogos
    'Lic. Roberto Díaz - Fonoaudiólogo General',
    'Lic. María Ignacia Herrera - Fonoaudióloga de Habla',
    'Lic. Vicente Silva - Fonoaudiólogo de Voz',
    'Lic. Josefina Morales - Fonoaudióloga de Deglución',
    'Lic. Agustín Castro - Fonoaudiólogo de Fluidez',
    'Lic. Emilia Vargas - Fonoaudióloga de Articulación',
    'Lic. Benjamín Herrera - Fonoaudiólogo de Comprensión',
    'Lic. Isidora Silva - Fonoaudiólogo de Expresión',
    
    // Nutricionistas
    'Lic. Laura Sánchez - Nutricionista Clínica',
    'Lic. Tomás Morales - Nutricionista Pediátrico',
    'Lic. Martina Castro - Nutricionista Deportiva',
    'Lic. Joaquín Silva - Nutricionista Geriátrico',
    'Lic. Emilia Herrera - Nutricionista para Embarazadas',
    'Lic. Vicente Vargas - Nutricionista para Diabéticos',
    'Lic. Agustina López - Nutricionista para Hipertensos',
    'Lic. Santiago Morales - Nutricionista para Celíacos',
    
    // Psicopedagogos
    'Lic. Carmen Vega - Psicopedagoga General',
    'Lic. Lucas Silva - Psicopedagogo de Evaluación',
    'Lic. Sofía Morales - Psicopedagoga de Intervención',
    'Lic. Matías Castro - Psicopedagogo de Dislexia',
    'Lic. Antonia Herrera - Psicopedagoga de Discalculia',
    'Lic. Benjamín Vargas - Psicopedagogo de TDAH',
    'Lic. Emilia Silva - Psicopedagoga de Técnicas de Estudio',
    'Lic. Vicente Morales - Psicopedagogo de Orientación Vocacional',
    
    // Terapeutas Alternativos
    'Lic. Diego Morales - Terapeuta Familiar',
    'Dr. Patricia Silva - Acupunturista',
    'Lic. Francisco Herrera - Quiropráctico',
    'Dr. Carolina Castro - Osteópata',
    'Lic. Magdalena Vargas - Reflexóloga',
    'Lic. Cristóbal Silva - Masajista Terapéutico',
    'Lic. Trinidad Morales - Masajista Deportivo',
    'Lic. Ignacio Herrera - Masajista Relajante',
    'Lic. Emilia Castro - Instructora de Yoga Terapéutico',
    'Lic. Vicente Silva - Instructor de Pilates Terapéutico',
    
    // Entrenadores Personales
    'Lic. Rodrigo Martínez - Entrenador Personal',
    'Lic. Carolina Herrera - Entrenadora Personal Funcional',
    'Lic. Felipe Torres - Entrenador de Fuerza',
    'Lic. Valentina Silva - Entrenadora Cardiovascular',
    'Lic. Cristóbal Morales - Entrenador de Resistencia',
    'Lic. Antonia Castro - Entrenadora de Flexibilidad',
    'Lic. Benjamín Vargas - Entrenador de Equilibrio',
    'Lic. Emilia Herrera - Entrenadora de Coordinación',
    'Lic. Vicente Silva - Entrenador de Velocidad',
    'Lic. Agustina Morales - Entrenadora de Agilidad',
    'Lic. Santiago Castro - Entrenador de Potencia',
    'Lic. Trinidad Herrera - Entrenadora de Core',
    'Lic. Ignacio Silva - Entrenador de Postura',
    'Lic. Emilia Morales - Entrenadora de Movilidad',
    'Lic. Vicente Castro - Entrenador de Recuperación',
    'Lic. Agustina Vargas - Entrenadora de Prevención de Lesiones',
    'Lic. Santiago Herrera - Entrenador para Deportes Específicos',
    'Lic. Trinidad Castro - Entrenadora para Embarazadas',
    'Lic. Benjamín Silva - Entrenador para Adultos Mayores',
    'Lic. Antonia Morales - Entrenadora para Niños y Adolescentes',
    'Lic. Emilia Herrera - Entrenadora para Personas con Discapacidad',
    'Lic. Vicente Castro - Entrenador para Rehabilitación',
    'Lic. Agustina Silva - Entrenadora para Rendimiento Deportivo',
    'Lic. Santiago Morales - Entrenador para Pérdida de Peso',
    'Lic. Trinidad Herrera - Entrenadora para Ganancia Muscular',
    'Lic. Ignacio Castro - Entrenador para Mejora de la Salud',
    'Lic. Emilia Silva - Entrenadora para Reducción del Estrés',
    'Lic. Vicente Morales - Entrenador para Mejora del Sueño',
    'Lic. Agustina Herrera - Entrenadora para Mejora de la Energía',
    'Lic. Santiago Castro - Entrenador para Mejora de la Concentración',
    'Lic. Trinidad Silva - Entrenadora para Mejora de la Memoria',
    'Lic. Benjamín Morales - Entrenador para Mejora de la Creatividad',
    'Lic. Antonia Herrera - Entrenadora para Mejora de la Productividad',
    'Lic. Emilia Castro - Entrenadora para Mejora de la Calidad de Vida',
    
    // Especialistas en Evaluación
    'Lic. Mariana Herrera - Evaluadora Funcional',
    'Lic. Felipe Morales - Evaluador Postural',
    'Lic. Catalina Castro - Evaluadora de Marcha',
    'Lic. Matías Silva - Evaluador de Equilibrio',
    'Lic. Javiera Vargas - Evaluadora de Fuerza',
    'Lic. Nicolás Herrera - Evaluador de Flexibilidad',
    'Lic. Constanza Morales - Evaluadora de Coordinación',
    'Lic. Diego Castro - Evaluador de Resistencia',
    
    // Especialistas en Prevención
    'Lic. Antonia Silva - Educadora para la Salud',
    'Lic. Benjamín Morales - Especialista en Prevención de Caídas',
    'Lic. Emilia Herrera - Especialista en Prevención Deportiva',
    'Lic. Vicente Castro - Especialista en Prevención Postural',
    'Lic. Agustina Vargas - Especialista en Prevención del Dolor',
    'Lic. Santiago Silva - Especialista en Prevención Cardiovascular',
    'Lic. Trinidad Morales - Especialista en Prevención Respiratoria',
    
    // Especialistas en Emergencias
    'Dr. Roberto Herrera - Médico de Emergencias',
    'Lic. María José Castro - Especialista en Primeros Auxilios',
    'Lic. Francisco Silva - Instructor de RCP',
    'Lic. Catalina Morales - Especialista en Manejo del Dolor',
    'Lic. Matías Herrera - Especialista en Crisis',
    'Lic. Javiera Castro - Especialista en Urgencias',
    'Lic. Nicolás Silva - Especialista en Estabilización',
    'Lic. Constanza Morales - Especialista en Traslados',
    
    // Especialistas en Seguimiento
    'Lic. Diego Herrera - Especialista en Seguimiento',
    'Lic. Antonia Castro - Especialista en Control de Evolución',
    'Lic. Benjamín Silva - Especialista en Ajuste de Terapias',
    'Lic. Emilia Morales - Especialista en Reevaluación',
    'Lic. Vicente Vargas - Especialista en Mantenimiento',
    'Lic. Agustina Herrera - Especialista en Prevención de Recaídas',
    'Lic. Santiago Castro - Especialista en Apoyo Continuo',
    'Lic. Trinidad Silva - Especialista en Monitoreo',
    
    // Especialistas en Educación y Apoyo
    'Lic. Ignacio Morales - Educador del Paciente',
    'Lic. Emilia Herrera - Educadora de la Familia',
    'Lic. Vicente Castro - Entrenador de Cuidadores',
    'Lic. Agustina Silva - Especialista en Apoyo Psicosocial',
    'Lic. Santiago Morales - Orientador Familiar',
    'Lic. Trinidad Herrera - Consejero',
    'Lic. Benjamín Castro - Acompañante Terapéutico',
    'Lic. Antonia Silva - Especialista en Transiciones',
    
    // Especialistas en Investigación
    'Dr. Mariana Morales - Investigadora Clínica',
    'Lic. Felipe Herrera - Investigador en Rehabilitación',
    'Lic. Catalina Castro - Evaluadora de Resultados',
    'Lic. Matías Silva - Analista de Datos Clínicos',
    'Lic. Javiera Morales - Desarrolladora de Protocolos',
    'Lic. Nicolás Herrera - Validadora de Instrumentos',
    'Lic. Constanza Castro - Investigadora en Calidad de Vida',
    'Lic. Diego Silva - Investigador en Satisfacción',
    'Lic. Antonia Morales - Evaluadora de Costo-Efectividad'
  ];

  const timeSlots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
    '17:00', '17:30', '18:00', '18:30',
  ];



  // Función para generar fechas marcadas y disponibilidad
  const generateAvailability = () => {
    const today = new Date();
    const marked = {};
    const slots = [];
    
    // Horarios predecibles para pruebas
    const availableHours = {
      0: [], // Domingo - no disponible
      1: [8, 9, 10, 11, 14, 15, 16, 17], // Lunes - horario completo
      2: [8, 9, 10, 11, 14, 15, 16, 17], // Martes - horario completo
      3: [8, 9, 10, 11, 14, 15, 16, 17], // Miércoles - horario completo
      4: [8, 9, 10, 11, 14, 15, 16, 17], // Jueves - horario completo
      5: [8, 9, 10, 11, 14, 15, 16, 17], // Viernes - horario completo
      6: [9, 10, 11, 12], // Sábado - solo mañana
    };
    
    // Generar disponibilidad para los próximos 30 días
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      const dateString = date.toISOString().split('T')[0];
      const dayOfWeek = date.getDay();
      
      // Excluir domingos
      if (dayOfWeek !== 0) {
        // Para pruebas: hacer que la mayoría de fechas estén disponibles
        const isAvailable = i < 25; // 25 de 30 fechas disponibles para pruebas
        
        if (isAvailable) {
          marked[dateString] = {
            marked: true,
            dotColor: '#4CAF50',
            textColor: '#333',
            selectedColor: '#667eea',
          };
          
          // Generar horarios consistentes para pruebas
          const daySlots = [];
          const hoursForDay = availableHours[dayOfWeek];
          
          // Para pruebas: incluir la mayoría de horarios
          for (const hour of hoursForDay) {
            // Incluir horarios en punto
            daySlots.push(`${hour.toString().padStart(2, '0')}:00`);
            
            // Incluir algunos horarios de media hora para variedad
            if (hour < 17) { // No incluir 17:30
              daySlots.push(`${hour.toString().padStart(2, '0')}:30`);
            }
          }
          
          slots.push({
            date: dateString,
            slots: daySlots,
          });
        }
      }
    }
    
    setMarkedDates(marked);
    setAvailableSlots(slots);
  };

  // Efecto para generar disponibilidad cuando se selecciona un profesional
  useEffect(() => {
    if (selectedProfessionalOld) {
      generateAvailability();
    }
  }, [selectedProfessionalOld]);

  // Función para obtener horarios disponibles de una fecha específica
  const getAvailableTimeSlots = (date: string) => {
    const availableSlot = availableSlots.find(slot => slot.date === date);
    return availableSlot ? availableSlot.slots : [];
  };

  // Función para formatear la fecha en español
  const formatDateInSpanish = (dateString: string) => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    return date.toLocaleDateString('es-ES', options);
  };

  return (
    <ConditionalScreen screenName="schedule">
      <ScrollView 
        style={styles.container} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Calendario</Text>
          <Text style={styles.headerSubtitle}>
            {isProfessional ? 'Gestiona tus citas y disponibilidad' : 'Reserva tu cita con profesionales'}
          </Text>
        </View>

        <View style={styles.calendarContainer}>
          <Text style={styles.sectionTitle}>
            {isProfessional ? 'Horarios de Hoy' : 'Próximas Citas'}
          </Text>
          
          {(() => {
            const upcomingAppointments = getUpcomingAppointments(user?.id || '');
            console.log('🔍 Debug Calendar - Citas próximas para usuario:', user?.id);
            console.log('🔍 Debug Calendar - Total de citas en el sistema:', appointments?.length || 0);
            console.log('🔍 Debug Calendar - Citas próximas encontradas:', upcomingAppointments.length);
            console.log('🔍 Debug Calendar - Citas próximas:', upcomingAppointments);
            
            if (upcomingAppointments.length === 0) {
              return (
                <View style={styles.emptyAppointmentsContainer}>
                  <Ionicons name="calendar-outline" size={48} color="#ccc" />
                  <Text style={styles.emptyAppointmentsTitle}>No tienes citas programadas</Text>
                  <Text style={styles.emptyAppointmentsSubtitle}>
                    {isProfessional ? 'No hay citas pendientes para hoy' : 'Reserva tu primera cita usando el botón de abajo'}
                  </Text>
                </View>
              );
            }
            
            return upcomingAppointments.slice(0, 5).map((appointment) => {
              const appointmentDate = new Date(appointment.date);
              const day = appointmentDate.getDate();
              const month = appointmentDate.toLocaleDateString('es-ES', { month: 'short' });
              
              return (
                <View key={appointment.id} style={styles.appointmentCard}>
                  <View style={styles.appointmentHeader}>
                    <View style={styles.dateContainer}>
                      <Text style={styles.dateDay}>{day}</Text>
                      <Text style={styles.dateMonth}>{month}</Text>
                    </View>
                    <View style={styles.appointmentInfo}>
                      <Text style={styles.appointmentTime}>{appointment.time}</Text>
                      <Text style={styles.professionalName}>
                        {isProfessional ? appointment.clientName : appointment.professional}
                      </Text>
                      <Text style={styles.serviceName}>{appointment.service}</Text>
                      {!isProfessional && appointment.notes && (
                        <Text style={styles.appointmentNotes}>Notas: {appointment.notes}</Text>
                      )}
                    </View>
                    <View style={[
                      styles.statusBadge, 
                      { 
                        backgroundColor: appointment.status === 'confirmed' ? '#4CAF50' : 
                                       appointment.status === 'pending' ? '#FFC107' : '#F44336' 
                      }
                    ]}>
                      <Text style={styles.statusText}>
                        {appointment.status === 'confirmed' ? 'Confirmado' : 
                         appointment.status === 'pending' ? 'Pendiente' : 'Cancelado'}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            });
          })()}
        </View>

        <View style={styles.actionsSection}>
          {/* Botón de acción principal */}
          <View style={styles.actionContainer}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                if (isProfessional) {
                  // Para profesionales: abrir modal de nueva cita
                  setShowBookingModal(true);
                } else {
                  // Para clientes: abrir modal de reserva con seña
                  console.log('🎯 Cliente solicitando abrir modal de reserva con seña desde Calendario');
                  handleOpenReservaConSena();
                }
              }}
            >
              <Ionicons name="calendar-plus" size={20} color="white" />
              <Text style={styles.actionButtonText}>
                {isProfessional ? 'Nueva Cita (Prof)' : 'Reservar con Seña'}
              </Text>
            </TouchableOpacity>


          </View>
        </View>

        {/* Modal principal de reserva de cita (igual que en Hoy) */}
        <Modal
          visible={showModal}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <View style={styles.modalContainer}>
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
                onPress={handleCloseReservaConSenaModal}
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
                    onPress={() => Alert.alert('Paciente', 'Selector en desarrollo')}
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
                
                <View style={styles.costRow}>
                  <Text style={styles.costLabel}>Saldo a pagar:</Text>
                  <Text style={styles.costTotal}>$8,000</Text>
                </View>
                
                <View style={styles.costNote}>
                  <Text style={styles.costNoteText}>
                    💡 La seña se cobra al momento de la reserva para confirmar tu cita. 
                    El saldo se paga al finalizar el servicio.
                  </Text>
                </View>
              </View>

              {/* Botones de acción */}
              <View style={styles.formActions}>
                <TouchableOpacity
                  style={[styles.formButton, styles.cancelButton]}
                  onPress={handleCloseReservaConSenaModal}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.formButton, styles.submitButton]}
                  onPress={() => {
                    Alert.alert('Reserva', 'Formulario enviado correctamente');
                    handleCloseReservaConSenaModal();
                  }}
                >
                  <Text style={styles.submitButtonText}>Reservar Cita</Text>
                </TouchableOpacity>
              </View>
              
              {/* Espacio adicional al final para asegurar que los botones sean visibles */}
              <View style={styles.bottomSpacing} />
            </ScrollView>
          </View>
        </Modal>

        {/* Modal para seleccionar servicio */}
        <Modal
          visible={showServiceSelectorModal}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setShowServiceSelectorModal(false)}
              >
                <Ionicons name="arrow-back" size={24} color="#666" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Seleccionar Servicio</Text>
              <View style={styles.placeholderButton} />
            </View>

            <ScrollView style={styles.modalContent}>
              <Text style={styles.modalSubtitle}>
                Elige el tipo de servicio que necesitas:
              </Text>
              
              {/* Campo de búsqueda */}
              <View style={styles.searchContainer}>
                <View style={styles.searchInputContainer}>
                  <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Buscar servicio..."
                    value={serviceSearchQuery}
                    onChangeText={setServiceSearchQuery}
                    placeholderTextColor="#999"
                  />
                  {serviceSearchQuery.length > 0 && (
                    <TouchableOpacity
                      style={styles.clearButton}
                      onPress={() => setServiceSearchQuery('')}
                    >
                      <Ionicons name="close-circle" size={20} color="#999" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              
              {/* Lista de servicios filtrados */}
              {getFilteredServices().map((service) => (
                <TouchableOpacity
                  key={service}
                  style={styles.serviceOption}
                  onPress={() => handleServiceSelect(service)}
                >
                  <Text style={styles.serviceOptionText}>{service}</Text>
                  <Ionicons name="chevron-forward" size={20} color="#999" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Modal>

        {/* Modal para seleccionar profesional */}
        <Modal
          visible={showProfessionalSelectorModal}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setShowProfessionalSelectorModal(false)}
              >
                <Ionicons name="arrow-back" size={24} color="#666" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Seleccionar Profesional</Text>
              <View style={styles.placeholderButton} />
            </View>

            <ScrollView style={styles.modalContent}>
              <Text style={styles.modalSubtitle}>
                Elige el profesional que te atenderá:
              </Text>
              
              {/* Filtro por servicio seleccionado */}
              {newProfessionalAppointment.service && (
                <View style={styles.serviceFilterContainer}>
                  <Text style={styles.serviceFilterLabel}>
                    Servicio seleccionado: <Text style={styles.serviceFilterValue}>{newProfessionalAppointment.service}</Text>
                  </Text>
                  <TouchableOpacity
                    style={styles.clearServiceFilterButton}
                    onPress={() => setNewProfessionalAppointment(prev => ({ ...prev, service: '' }))}
                  >
                    <Ionicons name="close-circle" size={20} color="#666" />
                  </TouchableOpacity>
                </View>
              )}
              
              {/* Campo de búsqueda por nombre */}
              <View style={styles.searchContainer}>
                <View style={styles.searchInputContainer}>
                  <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Buscar profesional por nombre..."
                    value={professionalSearchQuery}
                    onChangeText={setProfessionalSearchQuery}
                    placeholderTextColor="#999"
                  />
                  {professionalSearchQuery.length > 0 && (
                    <TouchableOpacity
                      style={styles.clearButton}
                      onPress={() => setProfessionalSearchQuery('')}
                    >
                      <Ionicons name="close-circle" size={20} color="#999" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              
              {/* Lista de profesionales filtrados */}
              {getFilteredProfessionals().map((professional) => (
                <TouchableOpacity
                  key={professional}
                  style={styles.professionalOption}
                  onPress={() => handleProfessionalSelect(professional)}
                >
                  <Text style={styles.professionalOptionText}>{professional}</Text>
                  <Ionicons name="chevron-forward" size={20} color="#999" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Modal>

        {/* Modal para seleccionar fecha */}
        <Modal
          visible={showDatePickerModal}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setShowDatePickerModal(false)}
              >
                <Ionicons name="arrow-back" size={24} color="#666" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Seleccionar Fecha</Text>
              <View style={styles.placeholderButton} />
            </View>

            <View style={styles.calendarContainer}>
              <Text style={styles.calendarSubtitle}>
                Fechas disponibles para {newProfessionalAppointment.professionalName || 'el profesional'}
              </Text>
              
              <CustomCalendar
                onDateSelect={(dateString) => {
                  setNewProfessionalAppointment(prev => ({ ...prev, date: dateString }));
                  setShowDatePickerModal(false);
                }}
                markedDates={markedDates}
                selectedDate={newProfessionalAppointment.date}
              />
            </View>
          </View>
        </Modal>

        {/* Modal de selección de hora */}
        <Modal
          visible={showTimePickerModal}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setShowTimePickerModal(false)}
              >
                <Ionicons name="arrow-back" size={24} color="#666" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Seleccionar Hora</Text>
              <View style={styles.placeholderButton} />
            </View>

            <View style={styles.modalContent}>
              <Text style={styles.modalSubtitle}>
                Horarios disponibles para {newProfessionalAppointment.date || 'la fecha seleccionada'}
              </Text>
              
              <View style={styles.timeGrid}>
                {timeSlots.map((time) => (
                  <TouchableOpacity
                    key={time}
                    style={[
                      styles.timeOption,
                      newProfessionalAppointment.time === time && styles.timeOptionSelected,
                    ]}
                    onPress={() => {
                      setNewProfessionalAppointment(prev => ({ ...prev, time }));
                      setShowTimePickerModal(false);
                    }}
                  >
                    <Text style={[
                      styles.timeOptionText,
                      newProfessionalAppointment.time === time && styles.timeOptionTextSelected,
                    ]}>
                      {time}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </Modal>

        {/* Modal de MercadoPago */}
        <Modal
          visible={showMercadoPagoModal}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>💳 Pago con MercadoPago</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowMercadoPagoModal(false)}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <Text style={styles.modalSubtitle}>
                Detalles del pago de la seña:
              </Text>

              {/* Detalles del pago */}
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
                  <Text style={styles.paymentDetailLabel}>Fecha:</Text>
                  <Text style={styles.paymentDetailValue}>{newProfessionalAppointment.date}</Text>
                </View>
                <View style={styles.paymentDetailRow}>
                  <Text style={styles.paymentDetailLabel}>Hora:</Text>
                  <Text style={styles.paymentDetailValue}>{newProfessionalAppointment.time}</Text>
                </View>
                <View style={styles.paymentDetailRow}>
                  <Text style={styles.paymentDetailLabel}>Monto de la seña:</Text>
                  <Text style={styles.paymentDetailValue}>$2000 ARS</Text>
                </View>
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
                  Al presionar &quot;Pagar con MercadoPago&quot; serás redirigido para completar el pago
                </Text>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowMercadoPagoModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={openMercadoPago}
                disabled={isCreatingMercadoPagoPreference}
              >
                <Text style={styles.confirmButtonText}>
                  {isCreatingMercadoPagoPreference ? 'Creando...' : 'Pagar con MercadoPago'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
       </ScrollView>

       {/* Modal de Reservar Cita con Seña */}
       {console.log('🎯 Render - Modal visible:', shouldOpenReservaConSenaModal, 'isProfessional:', isProfessional)}
       {console.log('🎯 Condición modal:', !isProfessional && shouldOpenReservaConSenaModal)}
       {console.log('🎯 isProfessional valor:', isProfessional)}
       {console.log('🎯 shouldOpenReservaConSenaModal valor:', shouldOpenReservaConSenaModal)}
       
       {/* Modal completo de Reservar Cita con Seña */}
       <Modal
         visible={!isProfessional && shouldOpenReservaConSenaModal}
         animationType="slide"
         presentationStyle="pageSheet"
         onRequestClose={handleCloseReservaConSenaModal}
       >
         <View style={styles.modalOverlay}>
           <View style={styles.modalContent}>
             <View style={styles.modalHeader}>
               <Text style={styles.modalTitle}>💳 Reservar Cita con Seña</Text>
               <TouchableOpacity
                 style={styles.closeButton}
                 onPress={handleCloseReservaConSenaModal}
               >
                 <Ionicons name="close" size={24} color="#666" />
               </TouchableOpacity>
             </View>

             <View style={styles.modalBody}>
               <Text style={styles.reservaTitle}>Completa el formulario</Text>
               <Text style={styles.reservaSubtitle}>
                 Llena los campos para reservar tu cita con seña
               </Text>
               
               {/* CAMPO 1: Servicio */}
               <View style={styles.formSection}>
                 <Text style={styles.formLabel}>Servicio *</Text>
                 <TouchableOpacity
                   style={[styles.textInput, styles.selectorButton]}
                   onPress={() => Alert.alert('Servicio', 'Selector en desarrollo')}
                 >
                   <Text style={styles.selectorText}>Selecciona un servicio...</Text>
                   <Ionicons name="chevron-down" size={20} color="#666" />
                 </TouchableOpacity>
               </View>

               <View style={styles.formSection}>
                 <Text style={styles.formLabel}>Profesional *</Text>
                 <TouchableOpacity
                   style={styles.textInput}
                   onPress={() => Alert.alert('Profesional', 'Selector en desarrollo')}
                 >
                   <Text style={styles.selectorText}>Selecciona un profesional...</Text>
                 </TouchableOpacity>
               </View>

               <View style={styles.formSection}>
                 <Text style={styles.formLabel}>Fecha *</Text>
                 <TouchableOpacity
                   style={styles.textInput}
                   onPress={() => Alert.alert('Fecha', 'Selector en desarrollo')}
                 >
                   <Text style={styles.selectorText}>Selecciona una fecha...</Text>
                 </TouchableOpacity>
               </View>

               <View style={styles.formSection}>
                 <Text style={styles.formLabel}>Hora *</Text>
                 <TouchableOpacity
                   style={styles.textInput}
                   onPress={() => Alert.alert('Hora', 'Selector en desarrollo')}
                 >
                   <Text style={styles.selectorText}>Selecciona una hora...</Text>
                 </TouchableOpacity>
               </View>

               <View style={styles.formSection}>
                 <Text style={styles.formLabel}>Notas (opcional)</Text>
                 <TextInput
                   style={[styles.textInput, styles.textArea]}
                   placeholder="Agrega notas adicionales..."
                   placeholderTextColor="#999"
                   multiline
                   numberOfLines={3}
                   textAlignVertical="top"
                 />
               </View>

               {/* Botones de acción */}
               <View style={styles.formActions}>
                 <TouchableOpacity
                   style={[styles.formButton, styles.cancelButton]}
                   onPress={handleCloseReservaConSenaModal}
                 >
                   <Text style={styles.cancelButtonText}>Cancelar</Text>
                 </TouchableOpacity>
                 
                 <TouchableOpacity
                   style={[styles.formButton, styles.submitButton]}
                   onPress={() => {
                     Alert.alert('Reserva', 'Formulario enviado correctamente');
                     handleCloseReservaConSenaModal();
                   }}
                 >
                   <Text style={styles.submitButtonText}>Reservar Cita</Text>
                 </TouchableOpacity>
               </View>
             </View>
           </View>
         </View>
       </Modal>
       </ConditionalScreen>
     );
   }

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContent: {
    paddingBottom: 120, // Espacio para el botón fijo en la parte inferior
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  calendarContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  appointmentCard: {
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
  appointmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateContainer: {
    alignItems: 'center',
    marginRight: 16,
    minWidth: 50,
  },
  dateDay: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#667eea',
  },
  dateMonth: {
    fontSize: 12,
    color: '#666',
    textTransform: 'uppercase',
  },
  appointmentInfo: {
    flex: 1,
  },
  appointmentTime: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '500',
    marginBottom: 4,
  },
  professionalName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  serviceName: {
    fontSize: 14,
    color: '#666',
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
  actionsSection: {
    padding: 20,
    marginBottom: 30,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e1e1e1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
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
    minWidth: 200,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  // Estilos para el modal de reserva
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
    backgroundColor: 'white',
  },
  modalHeaderLeft: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  closeButton: {
    padding: 8,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  formSection: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  serviceSelectorButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e1e1e1',
    borderRadius: 8,
    padding: 16,
    minHeight: 56,
  },
  serviceSelectorButtonDisabled: {
    backgroundColor: '#F3F4F6',
    borderColor: '#D1D5DB',
  },
  serviceSelectorText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    flex: 1,
  },
  serviceSelectorPlaceholder: {
    color: '#999',
  },
  serviceSelectorButtonValid: {
    backgroundColor: '#F0FDF4',
    borderColor: '#4CAF50',
  },
  dateSelectorButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e1e1e1',
    borderRadius: 8,
    padding: 16,
    minHeight: 56,
  },
  dateSelectorButtonValid: {
    backgroundColor: '#F0FDF4',
    borderColor: '#4CAF50',
  },
  dateSelectorText: {
    fontSize: 16,
    color: '#999',
    fontWeight: '500',
    flex: 1,
  },
  dateSelectorPlaceholder: {
    color: '#ccc',
  },
  backButton: {
    padding: 8,
  },
  placeholderButton: {
    width: 40,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  serviceOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e1e1e1',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  serviceOptionText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    flex: 1,
  },
  professionalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e1e1e1',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  professionalOptionText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    flex: 1,
  },
  searchContainer: {
    marginBottom: 20,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e1e1e1',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    padding: 0,
  },
  clearButton: {
    marginLeft: 12,
    padding: 4,
  },
  noResultsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noResultsText: {
    fontSize: 18,
    color: '#666',
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  noResultsSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  serviceFilterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
    borderWidth: 1,
    borderColor: '#b3d9ff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  serviceFilterLabel: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  serviceFilterValue: {
    fontWeight: '600',
    color: '#667eea',
  },
  clearServiceFilterButton: {
    padding: 4,
  },
  clearAllFiltersButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 16,
  },
  clearAllFiltersText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e1e1e1',
    minWidth: 80,
    alignItems: 'center',
  },
  timeOptionSelected: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  timeOptionText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  timeOptionTextSelected: {
    color: 'white',
    fontWeight: '600',
  },
  notesInput: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e1e1e1',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: '#333',
    textAlignVertical: 'top',
    minHeight: 80,
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
  cancelButton: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#e1e1e1',
  },
  confirmButton: {
    backgroundColor: '#667eea',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  patientSelectorButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e1e1e1',
    borderRadius: 8,
    padding: 16,
    minHeight: 56,
  },
  patientSelectorText: {
    fontSize: 16,
    color: '#999',
    fontWeight: '500',
    flex: 1,
  },
  patientSelectorPlaceholder: {
    color: '#ccc',
  },
  patientSelectorButtonValid: {
    backgroundColor: '#F0FDF4',
    borderColor: '#4CAF50',
  },
  textInput: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e1e1e1',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: '#333',
  },
  textArea: {
    textAlignVertical: 'top',
    minHeight: 80,
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 20,
    paddingHorizontal: 0,
    gap: 12,
  },
  formButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minHeight: 56,
  },
  cancelButton: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#e1e1e1',
  },
  submitButton: {
    backgroundColor: '#667eea',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  debugButton: {
    backgroundColor: '#E5E7EB',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  debugButtonText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    width: '80%',
    maxWidth: 400,
  },
  reservaTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  reservaSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
  },
  selectorText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    flex: 1,
  },
  timeSelectorButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e1e1e1',
    borderRadius: 8,
    padding: 16,
    minHeight: 56,
  },
  timeSelectorText: {
    fontSize: 16,
    color: '#999',
    fontWeight: '500',
    flex: 1,
  },
  timeSelectorButtonDisabled: {
    backgroundColor: '#E5E7EB',
    borderColor: '#e1e1e1',
  },
  timeSelectorButtonValid: {
    backgroundColor: '#F0FDF4',
    borderColor: '#4CAF50',
  },
  timeSelectorPlaceholder: {
    color: '#ccc',
  },
  costSection: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 8,
    marginTop: 20,
  },
  costSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#667eea',
    marginBottom: 12,
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  costLabel: {
    fontSize: 14,
    color: '#374151',
  },
  costValue: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
  },
  costTotal: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '700',
  },
  costNote: {
    backgroundColor: '#F0FDF4',
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
    padding: 12,
    marginTop: 12,
  },
  costNoteText: {
    fontSize: 12,
    color: '#166534',
    lineHeight: 16,
  },
  paymentDetailsContainer: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  paymentDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  paymentDetailLabel: {
    fontSize: 14,
    color: '#374151',
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
  formProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  formProgressText: {
    fontSize: 14,
    color: '#666',
    marginRight: 12,
  },
  formProgressBar: {
    height: 8,
    backgroundColor: '#e1e1e1',
    borderRadius: 4,
  },
  formProgressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  emptyAppointmentsContainer: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: 'white',
    borderRadius: 12,
    marginTop: 16,
  },
  emptyAppointmentsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyAppointmentsSubtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
  appointmentNotes: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 4,
  },
  calendarContainer: {
    padding: 20,
  },
  calendarSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  bottomSpacing: {
    height: 20,
  },
});
