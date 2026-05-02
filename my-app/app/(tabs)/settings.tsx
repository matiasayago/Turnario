// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Linking,
  Share,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { useNotificationSettings } from '../../contexts/NotificationSettingsContext';
import { useAppointments } from '../../contexts/AppointmentContext';
import { useReviews } from '../../contexts/ReviewContext';
import { useNewAppointment } from '../../contexts/NewAppointmentContext';
import { useReservaConSena } from '../../contexts/ReservaConSenaContext';
import { SERVICES, getServicesByCategory, professionalOffersService } from '../../constants/services';
import { getBackendBaseUrl } from '../../config/backend';
import { createPaymentPreference, MERCADOPAGO_CONFIG } from '../../config/mercadopago';
import { userService } from '../../services';
import { isProfessionalUser } from '../../utils/userType';
import { useUsers, useServices } from '../../hooks';
import { MedicalAuthorizationModal } from '../../components/MedicalAuthorizationModal';
import { useAvailability } from '../../contexts/AvailabilityContext';
import { getBookableTimeSlotsForProfessionalDate } from '../../services/bookingSlotsService';
import simpleAuthService from '../../services/simpleAuthService';

function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const modalActionPaddingBottom =
    Platform.OS === 'android'
      ? Math.max(insets.bottom + 24, 44)
      : Math.max(insets.bottom + 12, 24);
  const scrollContentBottomPadding =
    Platform.OS === 'android'
      ? Math.max(insets.bottom + 140, 170)
      : Math.max(insets.bottom + 120, 140);
  const { user, logout, updateUserProfile } = useAuth();
  const { shouldOpenNewAppointmentModal, closeNewAppointmentModal } = useNewAppointment();
  const { shouldOpenReservaConSenaModal, appointmentData, closeReservaConSenaModal } = useReservaConSena();
  const { reviews, addReview, deleteReview } = useReviews();
  const { availableProfessionals } = useAvailability();
  const isProfessional = isProfessionalUser(user);
  
  // Usar hooks de la API
  const { clients, loading: usersLoading, error: usersError, refreshUsers } = useUsers();
  const { activeServices, loading: servicesLoading, error: servicesError, refreshServices } = useServices();
  
  // Debug: Verificar estado inicial del contexto
  console.log('🔍 SettingsScreen - Estado inicial del contexto:', {
    shouldOpenNewAppointmentModal,
    closeNewAppointmentModal: typeof closeNewAppointmentModal
  });

  // Efecto para actualizar el servicio del formulario cuando cambie el usuario
  useEffect(() => {
    if (user?.service && user.service !== newProfessionalAppointment.service) {
      setNewProfessionalAppointment(prev => ({
        ...prev,
        service: user.service || ''
      }));
      console.log('🔄 Servicio del formulario actualizado:', user.service);
    }
  }, [user?.service]);

  
  
  // Estados para el modal de edición de perfil
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState({
    fullName: user?.fullName || '',
    phone: user?.phone || '',
    email: user?.email || '',
    service: user?.service || '',
  });
  const [isEditing, setIsEditing] = useState(false);
  
  // Estados para el selector de servicios
  const [showServiceSelector, setShowServiceSelector] = useState(false);
  const [serviceSearchQuery, setServiceSearchQuery] = useState('');
  const [selectedServiceCategory, setSelectedServiceCategory] = useState<string>('Todas');
  const [serviceSelectionMode, setServiceSelectionMode] = useState<'profile' | 'appointment'>('profile');
  
  // Estados para el modal de nueva cita del profesional
  const [showNewAppointmentModal, setShowNewAppointmentModal] = useState(false);
  const [newProfessionalAppointment, setNewProfessionalAppointment] = useState({
    service: user?.service || '', // Inicializar con el servicio del profesional
    date: '',
    time: '',
    patientName: '',
    patientPhone: '',
    patientEmail: '',
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

  // Estados para configuración de precios y señas
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [showDepositHistoryModal, setShowDepositHistoryModal] = useState(false);
  const [isOnlineDepositEnabled, setIsOnlineDepositEnabled] = useState(true);
  const [showMedicalAuthorizationModal, setShowMedicalAuthorizationModal] = useState(false);
  const [servicePricing, setServicePricing] = useState({
    basePrice: 10000,
    depositPercentage: 20,
    depositAmount: 2000,
  });

  // Datos de ejemplo para el historial de señas
  const [depositHistory, setDepositHistory] = useState([
    {
      id: '1',
      patientName: 'María González',
      service: 'Consulta Psicológica',
      date: '2024-01-15',
      time: '15:00',
      depositAmount: 2000,
      totalAmount: 10000,
      status: 'Pagado',
      paymentMethod: 'Mercado Pago',
      paymentDate: '2024-01-10',
      notes: 'Primera consulta, paciente refiere ansiedad',
    },
    {
      id: '2',
      patientName: 'Carlos Ruiz',
      service: 'Terapia Cognitivo-Conductual',
      date: '2024-01-16',
      time: '10:00',
      depositAmount: 2400,
      totalAmount: 12000,
      status: 'Pagado',
      paymentMethod: 'Mercado Pago',
      paymentDate: '2024-01-11',
      notes: 'Seguimiento de terapia para depresión',
    },
    {
      id: '3',
      patientName: 'Ana Martínez',
      service: 'Consulta Psicológica',
      date: '2024-01-17',
      time: '14:00',
      depositAmount: 2000,
      totalAmount: 10000,
      status: 'Pagado',
      paymentMethod: 'Mercado Pago',
      paymentDate: '2024-01-12',
      notes: 'Nueva paciente, evaluación inicial',
    },
    {
      id: '4',
      patientName: 'Luis Rodríguez',
      service: 'Terapia Familiar',
      date: '2024-01-18',
      time: '11:00',
      depositAmount: 2200,
      totalAmount: 11000,
      status: 'Pagado',
      paymentMethod: 'Mercado Pago',
      paymentDate: '2024-01-13',
      notes: 'Seguimiento de terapia familiar',
    },
    {
      id: '5',
      patientName: 'Patricia López',
      service: 'Consulta Psicológica',
      date: '2024-01-19',
      time: '16:00',
      depositAmount: 2000,
      totalAmount: 10000,
      status: 'Pagado',
      paymentMethod: 'Mercado Pago',
      paymentDate: '2024-01-14',
      notes: 'Consulta de seguimiento mensual',
    },
  ]);
  
  // Estados para Mercado Pago
  const [showMercadoPagoModal, setShowMercadoPagoModal] = useState(false);
  const [mercadoPagoPreference, setMercadoPagoPreference] = useState<any>(null);
  const [isCreatingMercadoPagoPreference, setIsCreatingMercadoPagoPreference] = useState(false);
  const [paymentSummary, setPaymentSummary] = useState({
    service: '',
    professional: '',
    date: '',
    time: '',
    amount: 0,
    depositAmount: 0,
    depositPercentage: 0,
  });
  
  // Estados para el sistema de notificaciones de pago
  const [showPaymentNotificationModal, setShowPaymentNotificationModal] = useState(false);
  const [pendingPaymentAppointment, setPendingPaymentAppointment] = useState<any>(null);
  const [showPaymentSuccessModal, setShowPaymentSuccessModal] = useState(false);
  const [paymentSuccessData, setPaymentSuccessData] = useState<any>(null);

  // Estados para reserva de cita del cliente
  const [showClientBookingModal, setShowClientBookingModal] = useState(false);
  const [clientBookingData, setClientBookingData] = useState({
    professionalId: '',
    professionalName: '',
    service: '',
    date: '',
    time: '',
    notes: '',
  });
  
  // Estados para filtrado de servicios y profesionales
  const [availableServices, setAvailableServices] = useState<string[]>([]);
  const [filteredProfessionals, setFilteredProfessionals] = useState<{
    id: string;
    name: string;
    service: string;
    rating: number;
    price: number;
  }[]>([]);
  const [showClientServiceSelector, setShowClientServiceSelector] = useState(false);
  const [showProfessionalSelector, setShowProfessionalSelector] = useState(false);
  const [showHelpSupportModal, setShowHelpSupportModal] = useState(false);
  const supportEmail = (process.env.EXPO_PUBLIC_SUPPORT_EMAIL || 'matiasayago@gmail.com').trim();
  const supportPhone = (process.env.EXPO_PUBLIC_SUPPORT_PHONE || '+5491159572137').trim();
  const supportWhatsAppPhone = (
    process.env.EXPO_PUBLIC_SUPPORT_WHATSAPP_PHONE || '5491159572137'
  )
    .trim()
    .replace(/[^\d]/g, '');
  
  // Estados para el calendario del cliente
  const [showClientDatePickerModal, setShowClientDatePickerModal] = useState(false);
  const [clientCurrentMonth, setClientCurrentMonth] = useState(new Date());
  const [clientSelectedDate, setClientSelectedDate] = useState('');
  const [clientSelectedDateIso, setClientSelectedDateIso] = useState('');
  const [clientAvailableDatesSet, setClientAvailableDatesSet] = useState<Set<string>>(new Set());
  
  // Estados para los horarios del cliente
  const [showClientTimePickerModal, setShowClientTimePickerModal] = useState(false);
  const [clientAvailableTimeSlots, setClientAvailableTimeSlots] = useState<string[]>([]);
  
  // Efecto para cargar servicios desde la API
  useEffect(() => {
    if (activeServices && activeServices.length > 0) {
      const serviceNames = activeServices.map(service => service.name);
      setAvailableServices(serviceNames);
      console.log('🔧 Servicios cargados desde la API:', serviceNames);
    }
  }, [activeServices]);

  // Efecto para abrir el modal de reserva con seña cuando se active desde la tab "Hoy"
  useEffect(() => {
    if (shouldOpenReservaConSenaModal && !isProfessional) {
      // Si hay datos de cita, pre-llenar el formulario
      if (appointmentData) {
        setClientBookingData(prev => {
          const newData = {
            ...prev,
            professionalId: String(appointmentData.professionalId || prev.professionalId || ''),
            service: appointmentData.service || '',
            professionalName: appointmentData.professional || '', // Campo correcto para el profesional
            date: appointmentData.date || '',
            time: appointmentData.time || '',
            notes: appointmentData.notes || '',
          };
          return newData;
        });
      } else {
        // Si no hay datos de notificación, limpiar el formulario para que esté vacío
        setClientBookingData({
          professionalId: '',
          professionalName: '',
          service: '',
          date: '',
          time: '',
          notes: '',
        });
      }
      
      // Abrir el modal ANTES de cerrar el contexto
      setShowClientBookingModal(true);
      
      // Cerrar el contexto DESPUÉS de abrir el modal
      setTimeout(() => {
        closeReservaConSenaModal();
      }, 100);
    }
  }, [shouldOpenReservaConSenaModal, isProfessional, appointmentData, closeReservaConSenaModal]);


  
  // Estados para el catálogo de pacientes (UNIFICADO)
  const [showPatientCatalogModal, setShowPatientCatalogModal] = useState(false);
  const [showAddPatientModal, setShowAddPatientModal] = useState(false);
  const [showPatientDetailsModal, setShowPatientDetailsModal] = useState(false);
  const [showEditPatientModal, setShowEditPatientModal] = useState(false);
  const [selectedPatientForDetails, setSelectedPatientForDetails] = useState<any>(null);
  const [patientSearchQuery, setPatientSearchQuery] = useState('');
  const [catalogView, setCatalogView] = useState<'list' | 'add'>('list'); // 'list' o 'add'
  const [newPatientData, setNewPatientData] = useState({
    fullName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    address: '',
    emergencyContact: '',
    medicalHistory: '',
    allergies: '',
    notes: '',
  });
  const [editingPatientData, setEditingPatientData] = useState({
    fullName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    address: '',
    emergencyContact: '',
    medicalHistory: '',
    allergies: '',
    notes: '',
  });

  // useEffect para cargar datos del paciente cuando se selecciona
  React.useEffect(() => {
    if (selectedPatientForDetails && showEditPatientModal) {
      console.log('🔄 useEffect: Cargando datos del paciente en modal de edición');
      console.log('👤 Paciente seleccionado:', selectedPatientForDetails);
      
      const patientDataForEditing = {
        fullName: selectedPatientForDetails.name || '',
        email: selectedPatientForDetails.email || '',
        phone: selectedPatientForDetails.phone || '',
        dateOfBirth: selectedPatientForDetails.dateOfBirth || 'No especificada',
        gender: selectedPatientForDetails.gender || 'No especificado',
        address: selectedPatientForDetails.address || 'No especificada',
        emergencyContact: selectedPatientForDetails.emergencyContact || 'No especificado',
        medicalHistory: selectedPatientForDetails.medicalHistory || 'Sin historial registrado',
        allergies: selectedPatientForDetails.allergies || 'Sin alergias registradas',
        notes: selectedPatientForDetails.notes || `Paciente ${selectedPatientForDetails.status === 'active' ? 'activo' : 'inactivo'} con ${selectedPatientForDetails.visits || 0} visita${selectedPatientForDetails.visits !== 1 ? 's' : ''}. Última visita: ${selectedPatientForDetails.lastVisit || 'No registrada'}`,
      };
      
      console.log('📝 Datos preparados en useEffect:', patientDataForEditing);
      setEditingPatientData(patientDataForEditing);
    }
  }, [selectedPatientForDetails, showEditPatientModal]);

  // useEffect adicional para asegurar que los datos se carguen cuando se abra el modal de edición
  React.useEffect(() => {
    if (showEditPatientModal && selectedPatientForDetails) {
      console.log('🔄 useEffect adicional: Modal de edición abierto, cargando datos...');
      console.log('👤 Paciente seleccionado:', selectedPatientForDetails);
      
      // Forzar la carga de datos
      const patientDataForEditing = {
        fullName: selectedPatientForDetails.name || '',
        email: selectedPatientForDetails.email || '',
        phone: selectedPatientForDetails.phone || '',
        dateOfBirth: selectedPatientForDetails.dateOfBirth || 'No especificada',
        gender: selectedPatientForDetails.gender || 'No especificado',
        address: selectedPatientForDetails.address || 'No especificada',
        emergencyContact: selectedPatientForDetails.emergencyContact || 'No especificado',
        medicalHistory: selectedPatientForDetails.medicalHistory || 'Sin historial registrado',
        allergies: selectedPatientForDetails.allergies || 'Sin alergias registradas',
        notes: selectedPatientForDetails.notes || `Paciente ${selectedPatientForDetails.status === 'active' ? 'activo' : 'inactivo'} con ${selectedPatientForDetails.visits || 0} visita${selectedPatientForDetails.visits !== 1 ? 's' : ''}. Última visita: ${selectedPatientForDetails.lastVisit || 'No registrada'}`,
      };
      
      console.log('📝 Datos preparados en useEffect adicional:', patientDataForEditing);
      setEditingPatientData(patientDataForEditing);
    }
  }, [showEditPatientModal]);

  // Estados para el catálogo de usuarios cliente del sistema
  const [clientUsers, setClientUsers] = useState<any[]>([]);
  const [showClientSelector, setShowClientSelector] = useState(false);
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
    // const [userSearchText, setUserSearchText] = useState('');
  // const [selectedUser, setSelectedUser] = useState<any>(null);
  // const [allUsers, setAllUsers] = useState([
  //   { id: '1', name: 'Ana Martínez', email: 'ana@email.com', phone: '+54 9 11 1234-5678', userType: 'client' },
  //   { id: '2', name: 'Luis Rodríguez', email: 'luis@email.com', phone: '+54 9 11 2345-6789', userType: 'client' },
  //   { id: '3', name: 'María González', email: 'maria@email.com', phone: '+54 9 11 3456-7890', userType: 'patient' },
  //   { id: '4', name: 'Carlos Silva', email: 'carlos@email.com', phone: '+54 9 11 4567-8901', userType: 'client' },
  //   { id: '5', name: 'Laura Torres', email: 'laura@email.com', phone: '+54 9 11 5678-9012', userType: 'patient' },
  //   { id: '6', name: 'Roberto Fernández', email: 'roberto@email.com', phone: '+54 9 11 6789-0123', userType: 'client' },
  //   { id: '7', name: 'Carmen Ruiz', email: 'carmen@email.com', phone: '+54 9 11 7890-1234', userType: 'patient' },
  //   { id: '8', name: 'Diego Morales', email: 'diego@email.com', phone: '+54 9 11 8901-2345', userType: 'client' },
  //   { id: '9', name: 'Sofía Herrera', email: 'sofia@email.com', phone: '+54 9 11 9012-3456', userType: 'patient' },
  //   { id: '10', name: 'Javier Castro', email: 'javier@email.com', phone: '+54 9 11 0123-4567', userType: 'client' }
  // ]);
  
  // Estados para el calendario y horarios
  // const [selectedDate, setSelectedDate] = useState('');
  // const [selectedTime, setSelectedTime] = useState('');
  // const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // Estados para el modal de configuración de notificaciones
  const [showNotificationSettingsModal, setShowNotificationSettingsModal] = useState(false);
  const { settings, updateSettings, resetToDefaults } = useNotificationSettings();
  const notificationsUiState = {
    appointments:
      settings.appointmentRequests ||
      settings.appointmentConfirmations ||
      settings.appointmentReminders ||
      settings.appointmentCancellations ||
      settings.reminderNotifications,
    messages: settings.messageNotifications,
    reviews: settings.reviewNotifications,
    promotions: settings.marketingNotifications,
    sound: settings.soundEnabled,
    vibration: settings.vibrationEnabled,
  };
  const toggleNotificationType = async (
    key: 'appointments' | 'messages' | 'reviews' | 'promotions' | 'sound' | 'vibration'
  ) => {
    const value = !notificationsUiState[key];
    switch (key) {
      case 'appointments':
        await updateSettings({
          appointmentRequests: value,
          appointmentConfirmations: value,
          appointmentReminders: value,
          appointmentCancellations: value,
          reminderNotifications: value,
          generalNotifications: value || notificationsUiState.messages || notificationsUiState.reviews,
        });
        break;
      case 'messages':
        await updateSettings({
          messageNotifications: value,
          generalNotifications: value || notificationsUiState.appointments || notificationsUiState.reviews,
        });
        break;
      case 'reviews':
        await updateSettings({
          reviewNotifications: value,
          generalNotifications: value || notificationsUiState.appointments || notificationsUiState.messages,
        });
        break;
      case 'promotions':
        await updateSettings({ marketingNotifications: value });
        break;
      case 'sound':
        await updateSettings({ soundEnabled: value });
        break;
      case 'vibration':
        await updateSettings({ vibrationEnabled: value });
        break;
      default:
        break;
    }
  };

  
  // Estados para el modal de Mis Citas
  const [showMyAppointmentsModal, setShowMyAppointmentsModal] = useState(false);
  const [appointmentFilter, setAppointmentFilter] = useState<'all' | 'pending' | 'confirmed' | 'cancelled'>('all');
  
  // Estados para el modal de Mis Reseñas
  const [showMyReviewsModal, setShowMyReviewsModal] = useState(false);
  const [showAddReviewModal, setShowAddReviewModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [newReview, setNewReview] = useState({
    rating: 5 as 1 | 2 | 3 | 4 | 5,
    comment: '',
  });

  // Estados para el modal de Profesionales Favoritos
  const [showFavoritesModal, setShowFavoritesModal] = useState(false);
  const [favoriteProfessionals, setFavoriteProfessionals] = useState([
    {
      id: '1',
      name: 'Dr. Carlos Mendoza',
      service: 'Psicología Clínica',
      specialization: 'Terapia Cognitivo-Conductual',
      rating: 4.8,
      totalReviews: 127,
      avatar: '👨‍⚕️',
      isOnline: true,
      lastSeen: 'Hace 2 horas',
      consultationPrice: 15000,
      consultationDuration: '50 min',
      location: 'Palermo, CABA',
      availability: 'Lun-Vie 9:00-18:00',
      description: 'Especialista en ansiedad, depresión y trastornos del estado de ánimo. Más de 15 años de experiencia clínica.',
      contactInfo: {
        phone: '+54 11 1234-5678',
        email: 'dr.mendoza@email.com',
        website: 'www.drmendoza.com.ar'
      }
    },
    {
      id: '2',
      name: 'Dra. Ana Martínez',
      service: 'Psicología Infantil',
      specialization: 'Psicología del Desarrollo',
      rating: 4.9,
      totalReviews: 89,
      avatar: '👩‍⚕️',
      isOnline: false,
      lastSeen: 'Hace 1 día',
      consultationPrice: 12000,
      consultationDuration: '45 min',
      location: 'Belgrano, CABA',
      availability: 'Mar-Jue 10:00-19:00',
      description: 'Especialista en niños y adolescentes. Terapia familiar y orientación a padres. Enfoque lúdico y empático.',
      contactInfo: {
        phone: '+54 11 9876-5432',
        email: 'dra.martinez@email.com',
        website: 'www.anamartinez.com.ar'
      }
    },
    {
      id: '3',
      name: 'Lic. Roberto Silva',
      service: 'Terapia de Pareja',
      specialization: 'Terapia Sistémica Familiar',
      rating: 4.7,
      totalReviews: 156,
      avatar: '👨‍⚕️',
      isOnline: true,
      lastSeen: 'En línea',
      consultationPrice: 18000,
      consultationDuration: '60 min',
      location: 'Recoleta, CABA',
      availability: 'Lun-Sáb 8:00-20:00',
      description: 'Especialista en relaciones de pareja y conflictos familiares. Certificado en terapia sistémica y mediación.',
      contactInfo: {
        phone: '+54 11 5555-1234',
        email: 'lic.silva@email.com',
        website: 'www.robbertosilva.com.ar'
      }
    }
  ]);
  const [showAddFavoriteModal, setShowAddFavoriteModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');

  // Estados para el modal de Privacidad y Seguridad
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [privacySettings, setPrivacySettings] = useState({
    profileVisibility: 'public', // 'public', 'contacts', 'private'
    showOnlineStatus: true,
    allowNotifications: true,
    dataSharing: false,
    locationSharing: false,
    analyticsSharing: false,
  });

  // Estados para el modal de Configuración de Pagos
  const [showPaymentSettingsModal, setShowPaymentSettingsModal] = useState(false);
  const [paymentSettings, setPaymentSettings] = useState({
    // Configuración de tarjetas
    cards: [
      { id: '1', type: 'visa', last4: '1234', expiry: '12/25', isDefault: true },
      { id: '2', type: 'mastercard', last4: '5678', expiry: '06/26', isDefault: false },
    ],
    // Configuración de pagos automáticos
    autoPayments: {
      enabled: true,
      minAmount: 1000,
      maxAmount: 50000,
    },
    // Configuración de facturación
    billing: {
      email: 'usuario@email.com',
      address: 'Av. Corrientes 1234, CABA',
      taxId: '20-12345678-9',
    },
    // Configuración de notificaciones de pago
    paymentNotifications: {
      successful: true,
      failed: true,
      pending: true,
      refunds: true,
    },
    // Configuración de cuenta receptora para profesionales
    receivingAccount: {
      accountType: 'bank', // 'bank', 'mercadopago', 'paypal', 'crypto'
      bankAccount: {
        bankName: 'Banco de la Nación Argentina',
        accountType: 'corriente', // 'corriente', 'caja_ahorro'
        accountNumber: '1234567890',
        cbu: '0110123456789012345678',
        holderName: 'Dr. Carlos Mendoza',
        holderId: '20-12345678-9',
      },
      mercadopago: {
        email: 'dr.mendoza@mercadopago.com',
        phone: '+54 11 1234-5678',
        cvu: '0000003100012345678901',
      },
      paypal: {
        email: 'dr.mendoza@paypal.com',
        businessName: 'Consultorio Dr. Mendoza',
      },
      crypto: {
        walletAddress: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
        network: 'Bitcoin',
      },
      // Configuración de comisiones y retenciones
      fees: {
        platformFee: 2.5, // Porcentaje de comisión de la plataforma
        taxRetention: 21, // IVA retenido
        transferFee: 0, // Comisión por transferencia
      },
      // Configuración de pagos
      paymentSchedule: {
        automaticTransfers: true,
        transferFrequency: 'weekly', // 'daily', 'weekly', 'monthly'
        minimumAmount: 5000, // Monto mínimo para transferir
        transferDay: 'friday', // Día de la semana para transferencias
      }
    }
  });

  // Estados para el modal de Gestionar Horarios
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string>('monday'); // Día seleccionado por defecto
  const [selectedWeek, setSelectedWeek] = useState<number>(1); // Semana seleccionada (1-4)
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth()); // Mes seleccionado (0-11)
  const [scheduleSettings, setScheduleSettings] = useState({
    workingDays: {
      monday: { 
        enabled: true, 
        morning: { enabled: true, start: '08:00', end: '12:00' },
        afternoon: { enabled: true, start: '14:00', end: '18:00' },
        evening: { enabled: false, start: '19:00', end: '22:00' }
      },
      tuesday: { 
        enabled: true, 
        morning: { enabled: true, start: '08:00', end: '12:00' },
        afternoon: { enabled: true, start: '14:00', end: '18:00' },
        evening: { enabled: false, start: '19:00', end: '22:00' }
      },
      wednesday: { 
        enabled: true, 
        morning: { enabled: true, start: '08:00', end: '12:00' },
        afternoon: { enabled: true, start: '14:00', end: '18:00' },
        evening: { enabled: false, start: '19:00', end: '22:00' }
      },
      thursday: { 
        enabled: true, 
        morning: { enabled: true, start: '08:00', end: '12:00' },
        afternoon: { enabled: true, start: '14:00', end: '18:00' },
        evening: { enabled: false, start: '19:00', end: '22:00' }
      },
      friday: { 
        enabled: true, 
        morning: { enabled: true, start: '08:00', end: '12:00' },
        afternoon: { enabled: true, start: '14:00', end: '18:00' },
        evening: { enabled: false, start: '19:00', end: '22:00' }
      },
      saturday: { 
        enabled: false, 
        morning: { enabled: false, start: '09:00', end: '13:00' },
        afternoon: { enabled: false, start: '14:00', end: '18:00' },
        evening: { enabled: false, start: '19:00', end: '22:00' }
      },
      sunday: { 
        enabled: false, 
        morning: { enabled: false, start: '09:00', end: '13:00' },
        afternoon: { enabled: false, start: '14:00', end: '18:00' },
        evening: { enabled: false, start: '19:00', end: '22:00' }
      },
    },
    breakTime: { start: '12:00', end: '14:00' },
    appointmentDuration: 30, // minutos
    maxAppointmentsPerDay: 20,
    advanceBookingDays: 30,
  });

  // Estados para el modal de Gestionar Pacientes
  const [showPatientManagementModal, setShowPatientManagementModal] = useState(false);
  const [showAddPatientForm, setShowAddPatientForm] = useState(false);
  const [newPatient, setNewPatient] = useState({
    fullName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    address: '',
    emergencyContact: '',
    medicalHistory: '',
    allergies: '',
    notes: '',
  });
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [showPatientDetails, setShowPatientDetails] = useState(false);
  const [showEditPatientForm, setShowEditPatientForm] = useState(false);
  
  // Estados adicionales para gestión de pacientes
  const [patientManagementSearchQuery, setPatientManagementSearchQuery] = useState('');
  const [patientManagementFilter, setPatientManagementFilter] = useState('all');
  const [showPatientImportModal, setShowPatientImportModal] = useState(false);
  const [showPatientExportModal, setShowPatientExportModal] = useState(false);
  
  // Estados para el modal de Configuración de Consultorio
  const [showClinicSettingsModal, setShowClinicSettingsModal] = useState(false);
  const [showClinicSelectorModal, setShowClinicSelectorModal] = useState(false);
  const [clinics, setClinics] = useState<any[]>([
    {
      id: `clinic_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      clinicName: 'Consultorio Dr. Carlos Mendoza',
      address: 'Av. Corrientes 1234, CABA',
      email: 'dr.mendoza@consultorio.com',
      phone: '+54 11 1234-5678',
      website: 'www.consultoriomendoza.com',
      paymentMethods: ['Efectivo', 'Tarjeta de crédito', 'Transferencia'],
      receipts: true,
      logo: '',
      phoneHours: {
        start: '09:00',
        end: '18:00',
        days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
      },
      emergencyContact: '+54 11 9876-5432',
    }
  ]);
  const [selectedClinicIndex, setSelectedClinicIndex] = useState(0);

  const selectedClinic = clinics[selectedClinicIndex] || clinics[0];
  const updateClinicField = (key: string, value: any) => {
    setClinics(prev => prev.map((c, i) => i === selectedClinicIndex ? { ...c, [key]: value } : c));
  };
  const handleAddClinic = () => {
    const newClinic = {
      id: `clinic_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      clinicName: `Consultorio ${clinics.length + 1}`,
      address: '',
      email: '',
      phone: '',
      website: '',
      paymentMethods: [],
      receipts: true,
      logo: '',
      phoneHours: {
        start: '09:00',
        end: '17:00',
        days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
      },
      emergencyContact: '',
    };
    setClinics(prev => [...prev, newClinic]);
    setSelectedClinicIndex(clinics.length);
  };
  
  // Contexto de citas
  const { getUpcomingAppointments, addAppointment, updateAppointmentStatus, refreshAppointments } = useAppointments();
  
  // Contexto de reseñas
  // const { addReview, deleteReview } = useReviews();
  
  // Contexto de notificaciones
  const { addNotification } = useNotifications();

  // Efecto para escuchar cuando se debe abrir el modal de nueva cita desde el dashboard
  // Este efecto se activa cuando el botón "Nueva Cita" del Dashboard presiona openNewAppointmentModal()
  // Solo se activa cuando NO estamos en el proceso de agregar paciente
  useEffect(() => {
    console.log('🔍 useEffect ejecutándose...');
    console.log('🔍 useEffect - shouldOpenNewAppointmentModal:', shouldOpenNewAppointmentModal);
    console.log('🔍 useEffect - catalogView:', catalogView);
    console.log('🔍 useEffect - showNewAppointmentModal:', showNewAppointmentModal);
    console.log('🔍 useEffect - Tipo de shouldOpenNewAppointmentModal:', typeof shouldOpenNewAppointmentModal);
    
    // Solo ejecutar si realmente se debe abrir el modal
    if (shouldOpenNewAppointmentModal) {
      console.log('🔍 Contexto activado, verificando condiciones...');
      
      if (catalogView === 'list') {
        console.log('⚠️ Abriendo modal de nueva cita automáticamente');
        // Resetear el formulario antes de abrir el modal
        resetNewAppointmentForm();
        // Agregar un delay para asegurar que el estado se actualice correctamente
        setTimeout(() => {
          setShowNewAppointmentModal(true);
          closeNewAppointmentModal();
        }, 100);
      } else {
        console.log('🚫 Bloqueando apertura automática del modal de cita porque estamos en vista de agregar paciente');
        // También cerrar el contexto para evitar futuras activaciones
        closeNewAppointmentModal();
      }
    } else {
      console.log('🔍 Contexto no activado, no se hace nada');
    }
  }, [shouldOpenNewAppointmentModal, closeNewAppointmentModal, catalogView, showNewAppointmentModal]);
  


  const handleLogout = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro de que quieres cerrar sesión?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Cerrar Sesión',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              router.replace('/login' as never);
            } catch (error) {
              console.error('Error al cerrar sesión:', error);
              Alert.alert('Error', 'No se pudo cerrar sesión correctamente. Intenta nuevamente.');
            }
          },
        },
      ]
    );
  };

  const handleEditProfile = () => {
    // Inicializar el estado de edición con los datos actuales del usuario
    setEditingProfile({
      fullName: user?.fullName || '',
      phone: user?.phone || '',
      email: user?.email || '',
      service: user?.service || '',
    });
    setShowEditProfileModal(true);
  };

  const handleNotifications = () => {
    setShowNotificationSettingsModal(true);
  };

  const handlePaymentSettings = () => {
    setShowPaymentSettingsModal(true);
  };

  const handlePatientSelection = () => {
    // En lugar de abrir un modal, aquí podrías:
    // 1. Navegar a una pantalla de catálogo completa
    // 2. Cambiar a una vista de catálogo en pantalla completa
    // 3. Expandir la vista actual
    
    // Por ahora, vamos a cambiar a una vista de catálogo en pantalla completa
    setShowNewAppointmentModal(false); // Cerrar el modal de nueva cita
    setShowPatientCatalogModal(true); // Abrir el catálogo de pacientes
    setCatalogView('list'); // Siempre empezar con la vista de lista
  };

  const handlePatientSelect = (patient: any) => {
    console.log('🔍 Paciente seleccionado:', patient);
    
    // Guardar el paciente seleccionado para mostrar sus detalles
    setSelectedPatientForDetails(patient);
    
    // Preparar los datos para edición - mapear campos disponibles y generar defaults
    const patientDataForEditing = {
      fullName: patient.name || '',
      email: patient.email || '',
      phone: patient.phone || '',
      dateOfBirth: patient.dateOfBirth || 'No especificada',
      gender: patient.gender || 'No especificado',
      address: patient.address || 'No especificada',
      emergencyContact: patient.emergencyContact || 'No especificado',
      medicalHistory: patient.medicalHistory || 'Sin historial registrado',
      allergies: patient.allergies || 'Sin alergias registradas',
      notes: patient.notes || `Paciente ${patient.status === 'active' ? 'activo' : 'inactivo'} con ${patient.visits || 0} visita${patient.visits !== 1 ? 's' : ''}. Última visita: ${patient.lastVisit || 'No registrada'}`,
    };
    
    console.log('📝 Datos preparados para edición:', patientDataForEditing);
    
    setEditingPatientData(patientDataForEditing);
    
    // Abrir el modal de detalles del paciente
    setShowPatientDetailsModal(true);
  };

  // Función para abrir el modal de edición
  const handleEditPatient = (patient: any) => {
    console.log('✏️ Abriendo modal de edición...');
    console.log('👤 Paciente recibido como parámetro:', patient);
    console.log('🔍 Estado del modal de detalles:', showPatientDetailsModal);
    
    // Verificar que tenemos los datos del paciente
    if (!patient) {
      console.log('❌ ERROR: No hay paciente recibido para editar');
      Alert.alert(
        '❌ Error',
        'No hay paciente recibido para editar. Por favor, selecciona un paciente primero.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    // IMPORTANTE: Actualizar selectedPatientForDetails antes de abrir el modal de edición
    console.log('🔄 Actualizando selectedPatientForDetails...');
    setSelectedPatientForDetails(patient);
    
    // Cargar los datos del paciente directamente aquí antes de abrir el modal
    console.log('🔄 Cargando datos del paciente directamente...');
    const patientDataForEditing = {
      fullName: patient.name || '',
      email: patient.email || '',
      phone: patient.phone || '',
      dateOfBirth: patient.dateOfBirth || 'No especificada',
      gender: patient.gender || 'No especificado',
      address: patient.address || 'No especificada',
      emergencyContact: patient.emergencyContact || 'No especificado',
      medicalHistory: patient.medicalHistory || 'Sin historial registrado',
      allergies: patient.allergies || 'Sin alergias registradas',
      notes: patient.notes || `Paciente ${patient.status === 'active' ? 'activo' : 'inactivo'} con ${patient.visits || 0} visita${patient.visits !== 1 ? 's' : ''}. Última visita: ${patient.lastVisit || 'No registrada'}`,
    };
    
    console.log('📝 Datos preparados directamente:', patientDataForEditing);
    setEditingPatientData(patientDataForEditing);
    
    // Ahora abrir el modal de edición
    setShowEditPatientModal(true);
  };

  // Función para guardar los cambios del paciente
  const isMongoObjectId = (value: unknown) =>
    typeof value === 'string' && /^[a-fA-F0-9]{24}$/.test(value.trim());

  const handleSavePatientChanges = async () => {
    console.log('💎 Guardando cambios del paciente...');
    console.log('📝 Datos a guardar:', editingPatientData);
    
    // Verificar que tenemos un paciente seleccionado
    if (!selectedPatientForDetails) {
      console.log('❌ ERROR: No hay paciente seleccionado para guardar');
      Alert.alert(
        '❌ Error',
        'No hay paciente seleccionado para guardar.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    // Crear el objeto del paciente actualizado
    const updatedPatient = {
      ...selectedPatientForDetails,
      name: editingPatientData.fullName,
      email: editingPatientData.email,
      phone: editingPatientData.phone,
      dateOfBirth: editingPatientData.dateOfBirth,
      gender: editingPatientData.gender,
      address: editingPatientData.address,
      emergencyContact: editingPatientData.emergencyContact,
      medicalHistory: editingPatientData.medicalHistory,
      allergies: editingPatientData.allergies,
      notes: editingPatientData.notes,
    };
    
    console.log('🔄 Paciente actualizado:', updatedPatient);
    
    try {
      const patientId = String(updatedPatient.id || '').trim();
      if (isMongoObjectId(patientId)) {
        const token = await simpleAuthService.getToken();
        if (!token) {
          throw new Error('No hay sesión activa para actualizar el paciente.');
        }

        const response = await fetch(`${getBackendBaseUrl()}/api/users/${patientId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            fullName: editingPatientData.fullName,
            email: editingPatientData.email,
            phone: String(editingPatientData.phone || '').replace(/[^\d+]/g, ''),
            notes: editingPatientData.notes,
          }),
        });
        const json = await response.json().catch(() => ({}));
        if (!response.ok || !json?.success) {
          const msg =
            json?.message ||
            json?.error ||
            `No se pudo actualizar el paciente (HTTP ${response.status}).`;
          throw new Error(msg);
        }

        await refreshUsers();
        await refreshAppointments();
      }

      // Actualizar el paciente seleccionado para detalles
      setSelectedPatientForDetails(updatedPatient);

      // Cerrar ambos modales
      setShowEditPatientModal(false);
      setShowPatientDetailsModal(false);

      Alert.alert(
        '✅ Paciente Actualizado',
        `La información de ${editingPatientData.fullName} se ha guardado correctamente.`,
        [{ text: 'OK' }]
      );
      console.log('✅ Paciente guardado exitosamente:', updatedPatient);
    } catch (error: any) {
      console.error('❌ Error guardando paciente:', error);
      Alert.alert(
        'Error',
        error?.message || 'No se pudo guardar en backend. Se mantuvieron solo cambios locales.'
      );
    }
  };

  // Función para cancelar edición de paciente (botón físico y cerrar)
  const handleCancelEditPatient = () => {
    setShowEditPatientModal(false);
  };

  // Función para cancelar la edición del perfil
  const handleCancelEdit = () => {
    setIsEditing(false);
    setShowEditProfileModal(false);
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
    const dayName = dayNames[date.getDay()];
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



  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth);
    if (direction === 'prev') {
      newMonth.setMonth(newMonth.getMonth() - 1);
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1);
    }
    setCurrentMonth(newMonth);
  };

  // Función para resetear el formulario de nueva cita
  const resetNewAppointmentForm = () => {
    setNewProfessionalAppointment({
      service: user?.service || '', // Mantener el servicio del profesional
      date: '',
      time: '',
      patientName: '',
      patientPhone: '',
      patientEmail: '',
      notes: '',
    });
    setSelectedDate('');
    setAvailableTimeSlots([]);
    console.log('🔄 Formulario de nueva cita reseteado (servicio mantenido)');
  };

  // Función para crear cita y enviar notificación al cliente
  const handleCreateAppointmentAndNotifyClient = async () => {
    try {
      setIsCreatingAppointment(true);
      
      // Validar que todos los campos estén completos
      if (!newProfessionalAppointment.patientName || !newProfessionalAppointment.date || !newProfessionalAppointment.time) {
        Alert.alert('Error', 'Por favor completa todos los campos obligatorios.');
        return;
      }

      // Generar ID único para la cita
      const appointmentId = `appointment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Crear objeto de cita
      const newAppointment = {
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
        status: 'pending_payment', // Estado: pendiente de pago
        createdAt: new Date().toISOString(),
        depositRequired: true,
        depositAmount: calculateDeposit(), // 20% del servicio
        totalAmount: 10000, // Precio base del servicio
      };

      console.log('📋 Cita creada:', newAppointment);

      // Aquí se guardaría la cita en la base de datos
      // await saveAppointmentToDatabase(newAppointment);

      // Enviar notificación al cliente para que pague la seña
      await sendClientPaymentNotification(newAppointment);

      // Mostrar confirmación al profesional
      Alert.alert(
        '✅ Cita Creada Exitosamente',
        `La cita para ${newProfessionalAppointment.patientName} ha sido creada y se ha enviado una notificación para que pague la seña de $${calculateDeposit()}.\n\nUna vez que el cliente realice el pago, la cita se confirmará automáticamente.`,
        [
          {
            text: 'Ver Detalles',
            onPress: () => {
              // Aquí se podría mostrar un modal con los detalles de la cita
              console.log('📋 Mostrando detalles de la cita:', newAppointment);
            }
          },
          {
            text: 'Crear Otra Cita',
            onPress: () => {
              setShowNewAppointmentModal(false);
              resetNewAppointmentForm();
            }
          }
        ]
      );

      // Cerrar el modal y resetear el formulario
      setShowNewAppointmentModal(false);
      resetNewAppointmentForm();

    } catch (error) {
      console.error('❌ Error creando cita:', error);
      Alert.alert('Error', 'No se pudo crear la cita. Intenta nuevamente.');
    } finally {
      setIsCreatingAppointment(false);
    }
  };

  // Función para obtener el ID del usuario por email
  const getUserIdByEmail = (email: string) => {
    // Mapeo de emails a IDs para usuarios predefinidos
    const emailToIdMap: { [key: string]: string } = {
      'ana.martinez@email.com': 'cliente_002',
      'cliente@turnario.com': 'cliente_001',
      'demo@turnario.com': 'demo_001',
      'profesional@turnario.com': 'prof_001',
      'carlos.mendoza@turnario.com': 'prof_002',
    };
    
    return emailToIdMap[email] || email; // Si no está en el mapeo, usar el email
  };

  // Función para enviar notificación de pago al cliente
  const sendClientPaymentNotification = async (appointment: any) => {
    try {
      console.log('📱 Enviando notificación de pago al cliente:', appointment.patientName);
      console.log('🔍 Datos de la cita que se enviarán en la notificación:');
      console.log('  - Servicio:', appointment.service);
      console.log('  - Profesional:', appointment.professional);
      console.log('  - Fecha:', appointment.date);
      console.log('  - Hora:', appointment.time);
      console.log('  - Notas:', appointment.notes);
      
      // Obtener el ID del usuario por email
      const recipientId = getUserIdByEmail(appointment.patientEmail);
      console.log('📱 ID del destinatario:', recipientId, 'para email:', appointment.patientEmail);
      
      // Crear notificación para el cliente usando el contexto
      const notificationData = {
        type: 'payment_required',
        title: '💳 Pago de Seña Requerido',
        message: `Tienes una cita pendiente con ${appointment.professional} para ${appointment.service} el ${appointment.date} a las ${appointment.time}. Debes pagar la seña de $${appointment.depositAmount} para confirmar tu reserva.`,
        recipientId: recipientId, // ID del usuario, no email
        senderId: appointment.professionalId,
        senderName: appointment.professional,
        appointmentData: {
          service: appointment.service,
          date: appointment.date,
          time: appointment.time,
          notes: `Seña requerida: $${appointment.depositAmount}`,
          professional: appointment.professional,
          professionalId: appointment.professionalId,
          depositAmount: appointment.depositAmount,
          totalAmount: appointment.totalAmount,
        },
      };
      
      console.log('📋 Datos de la notificación que se enviará:');
      console.log('  - appointmentData.service:', notificationData.appointmentData.service);
      console.log('  - appointmentData.date:', notificationData.appointmentData.date);
      console.log('  - appointmentData.time:', notificationData.appointmentData.time);
      console.log('  - appointmentData.professional:', notificationData.appointmentData.professional);
      
      addNotification(notificationData);

      console.log('✅ Notificación de pago enviada exitosamente al cliente:', recipientId);
      
      return true;
      
    } catch (error) {
      console.error('❌ Error enviando notificación al cliente:', error);
      return false;
    }
  };

  // Función para confirmar cita automáticamente después del pago
  const confirmAppointmentAfterPayment = async (appointmentId: string) => {
    try {
      console.log('✅ Confirmando cita después del pago:', appointmentId);
      
      // Actualizar el estado de la cita a 'confirmed' en el contexto
      updateAppointmentStatus(appointmentId, 'confirmed');
      console.log('✅ Estado de cita actualizado a "confirmed"');
      
      // Enviar notificación de confirmación al profesional
      addNotification({
        type: 'appointment_confirmed',
        title: '✅ Cita Confirmada',
        message: 'El cliente ha pagado la seña y la cita ha sido confirmada automáticamente.',
        recipientId: user?.id || 'prof_unknown',
        senderId: 'system',
        senderName: 'Sistema',
        appointmentData: {
          service: 'Servicio confirmado',
          date: new Date().toLocaleDateString(),
          time: new Date().toLocaleTimeString(),
          notes: 'Cita confirmada después del pago de seña',
        },
      });

      console.log('✅ Notificación de confirmación enviada al profesional');
      
      return true;
      
    } catch (error) {
      console.error('❌ Error confirmando cita:', error);
      return false;
    }
  };

  // Función para abrir modal de notificación de pago (cuando el cliente hace clic en la notificación)
  const openPaymentNotificationModal = (appointment: any) => {
    console.log('💳 Abriendo modal de notificación de pago para:', appointment);
    setPendingPaymentAppointment(appointment);
    setShowPaymentNotificationModal(true);
  };

  // Función para procesar pago exitoso y enviar notificaciones
  const handleSuccessfulPayment = async (appointment: any) => {
    try {
      console.log('💳 Procesando pago exitoso para cita:', appointment.id);
      
      // Confirmar la cita automáticamente
      await confirmAppointmentAfterPayment(appointment.id);
      
      // Enviar notificación de éxito al cliente
      const clientSuccessNotification = {
        id: `success_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'payment_successful',
        title: '✅ Pago Exitoso',
        message: `Tu seña de $${appointment.depositAmount} ha sido procesada correctamente. Tu cita con ${appointment.professional} para ${appointment.service} el ${appointment.date} a las ${appointment.time} ha sido confirmada.`,
        recipientId: appointment.patientEmail,
        recipientName: appointment.patientName,
        appointmentData: {
          appointmentId: appointment.id,
          status: 'confirmed',
          confirmedAt: new Date().toISOString(),
        },
        createdAt: new Date().toISOString(),
        read: false,
      };

      console.log('✅ Notificación de éxito al cliente creada:', clientSuccessNotification);
      
      // Configurar datos para el modal de éxito
      setPaymentSuccessData({
        appointment: appointment,
        notification: clientSuccessNotification,
        depositAmount: appointment.depositAmount,
        totalAmount: appointment.totalAmount,
      });
      
      // Cerrar modal de pago y mostrar modal de éxito
      setShowPaymentNotificationModal(false);
      setShowPaymentSuccessModal(true);
      
      // Aquí se enviarían las notificaciones reales
      // await sendPushNotification(clientSuccessNotification);
      
      return true;
      
    } catch (error) {
      console.error('❌ Error procesando pago exitoso:', error);
      Alert.alert('Error', 'No se pudo procesar el pago. Intenta nuevamente.');
      return false;
    }
  };

  // Función para simular pago con Mercado Pago
  const processMercadoPagoPayment = async (appointment: any) => {
    try {
      console.log('💳 Procesando pago con Mercado Pago para:', appointment.id);
      
      // Simular procesamiento de pago
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simular pago exitoso
      console.log('✅ Pago procesado exitosamente');
      
      // Procesar pago exitoso
      await handleSuccessfulPayment(appointment);
      
    } catch (error) {
      console.error('❌ Error procesando pago con Mercado Pago:', error);
      Alert.alert('Error', 'No se pudo procesar el pago. Intenta nuevamente.');
    }
  };

  // Funciones para el pago de seña
  const calculateDeposit = (servicePrice: number = 10000) => {
    // Por defecto $10,000 (pesos argentinos) - 20% de seña
    return Math.round(servicePrice * 0.20);
  };

  const handlePaymentSubmit = async () => {
    if (!paymentData.cardNumber || !paymentData.cardHolder || !paymentData.expiryDate || !paymentData.cvv) {
      Alert.alert('Error', 'Por favor completa todos los campos del pago');
      return;
    }

    setIsProcessingPayment(true);
    
    // Simular procesamiento de pago
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setIsProcessingPayment(false);
    
    // Simular pago exitoso
    Alert.alert(
      '✅ Pago Exitoso',
      `Seña de $${paymentAmount} procesada correctamente.\n\nTu cita ha sido confirmada y está programada para el ${newProfessionalAppointment.date} a las ${newProfessionalAppointment.time}.`,
      [
        {
          text: 'Ver Cita',
          onPress: () => {
            setShowPaymentModal(false);
            setShowNewAppointmentModal(false);
            resetNewAppointmentForm();
            // Aquí se podría navegar a una pantalla de citas confirmadas
          }
        }
      ]
    );
  };

  const openPaymentModal = () => {
    // Calcular monto de seña basado en el servicio
    const depositAmount = calculateDeposit();
    setPaymentAmount(depositAmount);
    setShowPaymentModal(true);
  };

  // Función para crear preferencia de Mercado Pago
  const handleMercadoPagoPayment = async () => {
    try {
      setIsCreatingMercadoPagoPreference(true);
      
      // Preparar datos del pago
      const paymentData = {
        title: `Seña - ${newProfessionalAppointment.service}`,
        amount: paymentAmount,
        description: `Seña del 20% para cita con ${user?.fullName} - ${newProfessionalAppointment.date} ${newProfessionalAppointment.time}`,
        externalReference: `appointment_${Date.now()}`,
        payerEmail: user?.email || 'cliente@email.com',
        payerName: user?.fullName || 'Cliente',
      };

      console.log('💳 Creando preferencia de Mercado Pago:', paymentData);

      // Crear preferencia de pago
      const preference = await createPaymentPreference(paymentData);
      
      console.log('💳 Preferencia creada:', preference);
      
      setMercadoPagoPreference(preference);
      setShowMercadoPagoModal(true);
      
    } catch (error) {
      console.error('❌ Error creando preferencia de Mercado Pago:', error);
      Alert.alert('Error', 'No se pudo crear la preferencia de pago. Intenta nuevamente.');
    } finally {
      setIsCreatingMercadoPagoPreference(false);
    }
  };

  // Función para abrir Mercado Pago
  const openMercadoPago = () => {
    if (mercadoPagoPreference) {
      // En un entorno real, esto abriría la URL de Mercado Pago
      // Por ahora, simulamos la apertura
      console.log('💳 Abriendo Mercado Pago:', mercadoPagoPreference.init_point);
      
      Alert.alert(
        '💳 Mercado Pago',
        `Preferencia creada: ${mercadoPagoPreference.id}\n\nURL: ${mercadoPagoPreference.init_point}`,
        [
          {
            text: 'Simular Pago Exitoso',
            onPress: () => {
              setShowMercadoPagoModal(false);
              Alert.alert(
                '✅ Pago Exitoso',
                'La seña ha sido procesada correctamente en Mercado Pago. Tu cita ha sido confirmada.',
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      // Aquí podrías redirigir a una pantalla de confirmación
                    },
                  },
                ]
              );
            },
          },
          {
            text: 'Cancelar',
            style: 'cancel',
          },
        ]
      );
    }
  };

  // Funciones para manejar horarios disponibles
  const getAvailableTimeSlots = (date: string) => {
    if (!date) return [];
    
    // Horarios disponibles por defecto (mañana y tarde)
    const timeSlots = [
      '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', // Mañana
      '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', // Tarde
      '17:00', '17:30', '18:00', '18:30' // Tarde-noche
    ];
    
    // En un sistema real, aquí se verificarían las citas existentes
    // y se filtrarían los horarios ocupados
    return timeSlots;
  };

  const handleDateSelection = (day: number, month: number, year: number) => {
    const selectedDateObj = new Date(year, month, day);
    const formattedDate = selectedDateObj.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    
    setSelectedDate(formattedDate);
    setNewProfessionalAppointment(prev => ({ ...prev, date: formattedDate }));
    
    // Generar horarios disponibles para la fecha seleccionada
    const timeSlots = getAvailableTimeSlots(formattedDate);
    setAvailableTimeSlots(timeSlots);
    
    // Resetear la hora seleccionada al cambiar la fecha
    setNewProfessionalAppointment(prev => ({ ...prev, time: '' }));
    
    setShowDatePickerModal(false);
  };

  const handleTimeSelection = (time: string) => {
    setNewProfessionalAppointment(prev => ({ ...prev, time }));
    setShowTimePickerModal(false);
  };

  // Funciones para el catálogo de usuarios cliente del sistema
  const loadClientUsers = async () => {
    try {
      console.log('🔄 Cargando usuarios cliente del sistema...');
      setIsLoadingClients(true);
      
      // Inicializar usuarios de ejemplo
      // Obtener usuarios cliente
      const users = await userService.getClients();
      console.log('✅ Usuarios cliente cargados:', users.length);
      
      setClientUsers(users);
    } catch (error) {
      console.error('❌ Error cargando usuarios cliente:', error);
      setClientUsers([]);
    } finally {
      setIsLoadingClients(false);
    }
  };

  // Función para seleccionar un cliente del catálogo
  const handleClientSelect = (client: any) => {
    console.log('👤 Cliente seleccionado:', client);
    
    setSelectedClient(client);
    setNewPatientData(prev => ({
      ...prev,
      fullName: client.fullName,
      email: client.email || '',
      phone: client.phone || '',
    }));
    
    setShowClientSelector(false);
    setClientSearchQuery('');
  };

  // Función para filtrar usuarios cliente
  const getFilteredClientUsers = () => {
    let filteredUsers = [...clients];
    
    // Aplicar búsqueda
    if (clientSearchQuery && clientSearchQuery.trim()) {
      const query = clientSearchQuery.toLowerCase();
      filteredUsers = filteredUsers.filter(user =>
        user.fullName && user.fullName.toLowerCase().includes(query) ||
        user.email && user.email.toLowerCase().includes(query) ||
        (user.phone && user.phone.includes(query))
      );
    }
    
    // Ordenar por nombre
    filteredUsers.sort((a, b) => a.fullName.localeCompare(b.fullName));
    
    return filteredUsers;
  };

  // Funciones para el calendario
  // const handleDateSelection = (date: string) => {
  //   setSelectedDate(date);
  //   setSelectedTime(''); // Resetear hora al cambiar fecha
  // };

  // const handleTimeSelection = (time: string) => {
  //   setSelectedTime(time);
  //   setNewProfessionalAppointment(prev => ({
  //     ...prev,
  //     appointmentDate: selectedDate,
  //     appointmentTime: time,
  //   }));
  // };

  // const getAvailableDates = () => {
  //   const today = new Date();
  //   const availableDates = [];
    
  //   // Generar fechas disponibles para los próximos 30 días
  //   for (let i = 0; i < 30; i++) {
  //     const date = new Date(today);
  //       date.setDate(today.getDate() + i);
      
  //     // Solo incluir días laborables (lunes a viernes)
  //     const dayOfWeek = date.getDay();
  //     if (dayOfWeek >= 1 && dayOfWeek <= 5) {
  //       availableDates.push(date);
  //     }
  //   }
    
  //   return availableDates;
  // };

  // const getProfessionalAvailability = () => {
  //   const userEmail = user?.email || '';
    
  //   if (__DEV__) {
  //     console.log('Usuario actual:', user);
  //     console.log('Email del usuario:', userEmail);
  //   }
    
  //   // Disponibilidad específica por profesional
  //   const professionalAvailability = {
  //     'dr.carlos.mendoza': {
  //       'monday': true,
  //       'tuesday': true,
  //       'wednesday': true,
  //       'thursday': true,
  //       'friday': true,
  //       'saturday': false,
  //       'sunday': false
  //     },
  //     'dr.maria.gonzalez': {
  //       'monday': true,
  //       'tuesday': true,
  //       'wednesday': false, // No trabaja miércoles
  //       'thursday': true,
  //       'friday': true,
  //       'saturday': false,
  //       'sunday': false
  //     },
  //     'default': {
  //       'monday': true,
  //       'tuesday': true,
  //       'wednesday': true,
  //       'thursday': true,
  //       'friday': true,
  //       'saturday': false,
  //       'sunday': false
  //     }
  //   };

  //   // Buscar en la lista de profesionales predefinidos
  //   const predefinedProfessionals = [
  //     { email: 'dr.carlos.mendoza@turnario.com', key: 'dr.carlos.mendoza' },
  //     { email: 'dr.maria.gonzalez@turnario.com', key: 'dr.maria.gonzalez' }
  //   ];
    
  //   const professionalKey = predefinedProfessionals.find(p => p.email === userEmail)?.key;
  //   if (__DEV__) {
  //     console.log('Clave del profesional encontrada:', professionalKey);
  //     console.log('Disponibilidad que se va a usar:', professionalAvailability[professionalKey] || professionalAvailability.default);
  //   }
    
  //   return professionalAvailability[professionalKey] || professionalAvailability.default;
  // };

  // const isDateAvailable = (date: Date) => {
  //   const availability = getProfessionalAvailability();
  //   const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  //   const dayName = dayNames[date.getDay()];
  //   const isAvailable = availability[dayName];
    
  //   // Verificar si la fecha está en el mes actual
  //   const currentMonthDate = new Date(currentMonth);
  //   const isCurrentMonth = date.getMonth() === currentMonthDate.getMonth() && 
  //                         date.getFullYear() === currentMonthDate.getFullYear();
    
  //   // Debug: mostrar información de disponibilidad (solo en desarrollo)
  //   if (__DEV__) {
  //     console.log(`Fecha: ${date.toDateString()}, Día: ${dayName}, Disponible: ${isAvailable}, Mes actual: ${isCurrentMonth}`);
  //   }
    
  //   // PRUEBA TEMPORAL: hacer que algunos días específicos sean no disponibles
  //   const dayOfMonth = date.getDate();
  //   if (dayOfMonth === 15 || dayOfMonth === 16 || dayOfMonth === 17) {
  //     if (__DEV__) {
  //       console.log(`DÍA NO DISPONIBLE FORZADO: ${date.toDateString()}`);
  //     }
  //     return false;
  //   }
    
  //   // Solo los días del mes actual pueden ser seleccionables
  //   return isAvailable && isCurrentMonth;
  // };

  // const getAvailableDatesForCalendar = () => {
  //   const currentMonthDate = new Date(currentMonth);
  //   const year = currentMonthDate.getFullYear();
  //   const month = currentMonthDate.getMonth();
    
  //   // Obtener el primer día del mes
  //   const firstDay = new Date(year, month, 1);
  //   // Obtener el último día del mes
  //   const lastDay = new Date(year, month + 1, 0);
    
  //   // Obtener el día de la semana del primer día (0 = domingo, 1 = lunes, etc.)
  //   const firstDayOfWeek = firstDay.getDay();
    
  //   // Generar todas las fechas del mes
  //   const allDates = [];
    
  //   // Agregar días del mes anterior para completar la primera semana
  //   for (let i = firstDayOfWeek - 1; i >= 0; i--) {
  //     // Calcular la fecha del mes anterior de manera más segura
  //     let prevMonth = month - 1;
  //     let prevYear = year;
      
  //     if (prevMonth < 0) {
  //       prevMonth = 11;
  //       prevYear = year - 1;
  //     }
      
  //     const lastDayOfPrevMonth = new Date(prevYear, prevMonth + 1, 0).getDate();
  //     const prevDate = new Date(prevYear, prevMonth, lastDayOfPrevMonth - i);
      
  //     // Verificar que la fecha sea válida antes de agregarla
  //     if (!isNaN(prevDate.getTime())) {
  //       allDates.push({ date: prevDate, index: allDates.length, type: 'prev' });
  //     }
  //   }
    
  //   // Agregar todos los días del mes actual
  //   for (let day = 1; day <= lastDay.getDate(); day++) {
  //     const date = new Date(year, month, day);
  //       allDates.push({ date: date, index: allDates.length, type: 'current' });
  //   }
    
  //   // Agregar días del mes siguiente para completar la última semana
  //   const lastDayOfWeek = lastDay.getDay();
  //   for (let i = 1; i <= 6 - lastDayOfWeek; i++) {
  //     const nextDate = new Date(year, month + 1, i);
  //       allDates.push({ date: nextDate, index: allDates.length, type: 'next' });
  //   }
    
  //   // Organizar en semanas de 7 días
  //   const weeks = [];
  //   for (let i = 0; i < allDates.length; i += 7) {
  //     weeks.push(allDates.slice(i, i + 7));
  //   }
    
  //   // Verificar que no haya fechas duplicadas
  //   const uniqueTimestamps = new Set(allDates.map(d => d.date.getTime()));
  //   if (allDates.length !== uniqueTimestamps.size) {
  //     console.error('❌ ERROR: Se detectaron fechas duplicadas en el calendario');
  //     console.error('❌ Total de fechas:', allDates.length);
  //     console.error('❌ Timestamps únicos:', uniqueTimestamps.size);
      
  //     // Encontrar fechas duplicadas específicas
  //     const duplicateDates = allDates.filter((dateObj, index) => 
  //       allDates.findIndex(d => d.date.getTime() === dateObj.date.getTime()) !== index
  //     );
      
  //     console.error('❌ Fechas duplicadas encontradas:', duplicateDates.map(d => ({
  //       date: d.date.toDateString(),
  //       timestamp: d.date.getTime(),
  //       type: d.type,
  //       index: d.index
  //     })));
      
  //     // Mostrar todas las fechas para debug
  //     console.error('🔍 Todas las fechas generadas:', allDates.map(d => ({
  //       date: d.date.toDateString(),
  //       timestamp: d.date.toDateString(), 
  //       timestamp: d.date.getTime(), 
  //       index: d.index, 
  //       type: d.type 
  //     })));
  //   }
    
  //   return { allDates, weeks };
  // };

  // const getAvailableDatesForCalendarRobust = () => {
  //   const currentMonthDate = new Date(currentMonth);
  //   const year = currentMonthDate.getFullYear();
  //   const month = currentMonthDate.getMonth();
    
  //   // Generar fechas de manera más robusta usando timestamps únicos
  //   const allDates = [];
  //   const usedTimestamps = new Set();
    
  //   // Obtener el primer día del mes
  //   const firstDay = new Date(year, month, 1);
  //   const lastDay = new Date(year, month + 1, 0);
    
  //   // Obtener el día de la semana del primer día
  //   const firstDayOfWeek = firstDay.getDay();
    
  //   // Agregar días del mes anterior
  //   for (let i = firstDayOfWeek - 1; i >= 0; i--) {
  //     // Calcular la fecha del mes anterior de manera más segura
  //     let prevMonth = month - 1;
  //     let prevYear = year;
      
  //     if (prevMonth < 0) {
  //       prevMonth = 11;
  //       prevYear = year - 1;
  //     }
      
  //     const lastDayOfPrevMonth = new Date(prevYear, prevMonth + 1, 0).getDate();
  //     const prevDate = new Date(prevYear, prevMonth, lastDayOfPrevMonth - i);
      
  //     // Verificar que la fecha sea válida antes de agregarla
  //     if (!isNaN(prevDate.getTime()) && !usedTimestamps.has(prevDate.getTime())) {
  //       allDates.push({ date: prevDate, index: allDates.length, type: 'prev' });
  //       usedTimestamps.add(prevDate.getTime());
  //     }
  //   }
    
  //   // Agregar días del mes actual
  //   for (let day = 1; day <= lastDay.getDate(); day++) {
  //     const date = new Date(year, month, day);
  //     if (!usedTimestamps.has(date.getTime())) {
  //       allDates.push({ date: date, index: allDates.length, type: 'current' });
  //       usedTimestamps.add(date.getTime());
  //     }
  //   }
    
  //   // Agregar días del mes siguiente
  //   const lastDayOfWeek = lastDay.getDay();
  //   for (let i = 1; i <= 6 - lastDayOfWeek; i++) {
  //     const nextDate = new Date(year, month + 1, i);
  //     if (!usedTimestamps.has(nextDate.getTime())) {
  //         allDates.push({ date: nextDate, index: allDates.length, type: 'next' });
  //         usedTimestamps.add(nextDate.getTime());
  //     }
  //   }
    
  //   // Organizar en semanas
  //   const weeks = [];
  //   for (let i = 0; i < allDates.length; i += 7) {
  //     weeks.push(allDates.slice(i, i + 7));
  //   }
    
  //   // Validar que todas las fechas tengan la estructura correcta
  //   const validDates = allDates.filter(d => d && d.date && typeof d.date.toDateString === 'function');
    
  //   if (validDates.length !== allDates.length) {
  //     console.error('❌ ERROR: Algunas fechas no tienen la estructura correcta');
  //     console.error('❌ Fechas inválidas encontradas:', allDates.filter(d => !d || !d.date || typeof d.date.toDateString !== 'function'));
  //   }
    
  //   if (__DEV__) {
  //     console.log('Fechas regeneradas de manera robusta:', validDates.map(d => d.date.toDateString()));
  //     console.log('Verificando duplicados robustos:', validDates.length === usedTimestamps.size ? 'No hay duplicados' : 'HAY DUPLICADOS');
  //   }
    
  //   return { allDates: validDates, weeks };
  // };

  // const getAvailableTimes = (date: string) => {
  //   // Horarios disponibles según el profesional
  //   const professionalSchedules = {
  //     'dr.carlos.mendoza': {
  //       'morning': ['08:00', '09:00', '10:00', '11:00'],
  //       'afternoon': ['14:00', '15:00', '16:00', '17:00'],
  //       'evening': ['18:00', '19:00']
  //     },
  //     'dr.maria.gonzalez': {
  //       'morning': ['08:30', '09:30', '10:30', '11:30'],
  //       'afternoon': ['15:00', '16:00', '17:00'],
  //       'evening': ['18:30', '19:30']
  //     },
  //     'default': {
  //       'morning': ['09:00', '10:00', '11:00'],
  //       'afternoon': ['14:00', '15:00', '16:00'],
  //       'evening': ['17:00', '18:00']
  //     }
  //   };

  //   // Obtener el email del usuario logueado
  //   const userEmail = user?.email || '';
  //   const predefinedProfessionals = [
  //     { email: 'dr.carlos.mendoza@turnario.com', key: 'dr.carlos.mendoza' },
  //     { email: 'dr.maria.gonzalez@turnario.com', key: 'dr.maria.gonzalez' }
  //   ];
    
  //   const professionalKey = predefinedProfessionals.find(p => p.email === userEmail)?.key;
  //   const schedule = professionalSchedules[professionalKey] || professionalSchedules.default;
    
  //   // Combinar todos los horarios disponibles
  //   return [...schedule.morning, ...schedule.afternoon, ...schedule.evening];
  // };

  // const formatDate = (date: Date) => {
  //   return date.toLocaleDateString('es-ES', {
  //     day: '2-digit',
  //     month: '2-digit',
  //     year: 'numeric'
  //   });
  // };

  // const formatDateForDisplay = (date: Date) => {
  //   return date.toLocaleDateString('es-ES', {
  //     weekday: 'long',
  //     day: '2-digit',
  //     month: 'long'
  //   });
  // };

  // const isDateSelected = (date: Date) => {
  //   return formatDate(date) === selectedDate;
  // };

  // const isCurrentMonthDate = (date: Date) => {
  //   const currentMonthDate = new Date(currentMonth);
  //   return date.getMonth() === currentMonthDate.getMonth() && 
  //          date.getFullYear() === currentMonthDate.getFullYear();
  // };

  // const generateUniqueKey = (date: Date, weekIndex: number, dateIndex: number) => {
  //   const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-week${weekIndex}-date${dateIndex}`;
  //   if (__DEV__) {
  //     console.log(`Clave única generada: ${key} para fecha: ${date.toDateString()}`);
  //     }
  //   return key;
  // };



  const handlePrivacy = () => {
    setShowPrivacyModal(true);
  };

  const handlePrivacySettingChange = (setting: string, value: any) => {
    setPrivacySettings(prev => ({
      ...prev,
      [setting]: value
    }));
  };

  const handleSavePrivacySettings = () => {
    // Aquí se guardarían las configuraciones en AsyncStorage o base de datos
    Alert.alert(
      '✅ Configuración Guardada',
      'Tus preferencias de privacidad han sido guardadas exitosamente.',
      [
        {
          text: 'OK',
          onPress: () => setShowPrivacyModal(false)
        }
      ]
    );
  };

  const handleResetPrivacySettings = () => {
    Alert.alert(
      '🔄 Restablecer Configuración',
      '¿Estás seguro de que quieres restablecer todas las configuraciones de privacidad a los valores predeterminados?',
      [
        {
          text: 'Cancelar',
          style: 'cancel'
        },
        {
          text: 'Restablecer',
          style: 'destructive',
          onPress: () => {
            setPrivacySettings({
              profileVisibility: 'public',
              showOnlineStatus: true,
              allowNotifications: true,
              dataSharing: false,
              locationSharing: false,
              analyticsSharing: false,
            });
            Alert.alert('✅ Restablecido', 'Configuraciones restablecidas a valores predeterminados.');
          }
        }
      ]
    );
  };

  const handleManageSchedule = () => {
    // Abrir directamente la configuración de horarios.
    router.push('/manage-schedule' as never);
  };

  const handleScheduleSettingChange = (category: string, setting: string, value: any) => {
    setScheduleSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category as keyof typeof prev],
        [setting]: value
      }
    }));
  };

  const handleWorkingDayChange = (day: string, setting: string, value: any) => {
    setScheduleSettings(prev => ({
      ...prev,
      workingDays: {
        ...prev.workingDays,
        [day]: {
          ...prev.workingDays[day as keyof typeof prev.workingDays],
          [setting]: value
        }
      }
    }));
  };

  // Función para obtener el nombre del mes
  const getMonthName = (monthIndex: number): string => {
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return months[monthIndex];
  };

  // Función para obtener el nombre de la semana
  const getWeekName = (weekNumber: number): string => {
    const weeks = ['Primera', 'Segunda', 'Tercera', 'Cuarta'];
    return weeks[weekNumber - 1];
  };

  // Función para navegar entre meses
  const navigateScheduleMonth = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setSelectedMonth(prev => prev === 0 ? 11 : prev - 1);
    } else {
      setSelectedMonth(prev => prev === 11 ? 0 : prev + 1);
    }
  };

  // Función para navegar entre semanas
  const navigateWeek = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setSelectedWeek(prev => prev === 1 ? 4 : prev - 1);
    } else {
      setSelectedWeek(prev => prev === 4 ? 1 : prev + 1);
    }
  };

  // Función para calcular la duración del descanso
  const calculateBreakDuration = (): number => {
    const startHour = parseInt(scheduleSettings.breakTime.start.split(':')[0]);
    const endHour = parseInt(scheduleSettings.breakTime.end.split(':')[0]);
    
    let duration = endHour - startHour;
    if (duration < 0) {
      duration += 24; // Maneja el caso de descanso que cruza la medianoche
    }
    
    return duration * 60; // Convertir a minutos
  };

  const handleSaveScheduleSettings = () => {
    // Aquí se guardarían las configuraciones en AsyncStorage o base de datos
    Alert.alert(
      '✅ Horarios Guardados',
      'Tu configuración de horarios ha sido guardada exitosamente.',
      [
        {
          text: 'OK',
          onPress: () => setShowScheduleModal(false)
        }
      ]
    );
  };

  const handleResetScheduleSettings = () => {
    Alert.alert(
      '🔄 Restablecer Horarios',
      '¿Estás seguro de que quieres restablecer todos los horarios a los valores predeterminados?',
      [
        {
          text: 'Cancelar',
          style: 'cancel'
        },
        {
          text: 'Restablecer',
          style: 'destructive',
          onPress: () => {
            setScheduleSettings({
              workingDays: {
                monday: { 
                  enabled: true, 
                  morning: { enabled: true, start: '08:00', end: '12:00' },
                  afternoon: { enabled: true, start: '14:00', end: '18:00' },
                  evening: { enabled: false, start: '19:00', end: '22:00' }
                },
                tuesday: { 
                  enabled: true, 
                  morning: { enabled: true, start: '08:00', end: '12:00' },
                  afternoon: { enabled: true, start: '14:00', end: '18:00' },
                  evening: { enabled: false, start: '19:00', end: '22:00' }
                },
                wednesday: { 
                  enabled: true, 
                  morning: { enabled: true, start: '08:00', end: '12:00' },
                  afternoon: { enabled: true, start: '14:00', end: '18:00' },
                  evening: { enabled: false, start: '19:00', end: '22:00' }
                },
                thursday: { 
                  enabled: true, 
                  morning: { enabled: true, start: '08:00', end: '12:00' },
                  afternoon: { enabled: true, start: '14:00', end: '18:00' },
                  evening: { enabled: false, start: '19:00', end: '22:00' }
                },
                friday: { 
                  enabled: true, 
                  morning: { enabled: true, start: '08:00', end: '12:00' },
                  afternoon: { enabled: true, start: '14:00', end: '18:00' },
                  evening: { enabled: false, start: '19:00', end: '22:00' }
                },
                saturday: { 
                  enabled: false, 
                  morning: { enabled: false, start: '09:00', end: '13:00' },
                  afternoon: { enabled: false, start: '14:00', end: '18:00' },
                  evening: { enabled: false, start: '19:00', end: '22:00' }
                },
                sunday: { 
                  enabled: false, 
                  morning: { enabled: false, start: '09:00', end: '13:00' },
                  afternoon: { enabled: false, start: '14:00', end: '18:00' },
                  evening: { enabled: false, start: '19:00', end: '22:00' }
                },
              },
              breakTime: { start: '12:00', end: '14:00' },
              appointmentDuration: 30,
              maxAppointmentsPerDay: 20,
              advanceBookingDays: 30,
            });
            Alert.alert('✅ Restablecido', 'Horarios restablecidos a valores predeterminados.');
          }
        }
      ]
    );
  };

  // Handlers para Configuración de Consultorio
  const handleManageClinic = () => {
    setShowClinicSettingsModal(true);
  };

  const handleSelectClinic = (clinicIndex: number) => {
    setSelectedClinicIndex(clinicIndex);
    setShowClinicSelectorModal(false);
  };

  // Funciones para el sistema de pagos y señas
  const handleDepositHistory = () => {
    // Abrir modal de historial de señas
    setShowDepositHistoryModal(true);
  };

  const handleServicePricing = () => {
    // Abrir modal de configuración de precios y señas
    setShowPricingModal(true);
  };

  // Funciones para el panel de cliente
  const handleClientPaymentMethods = () => {
    // Mostrar métodos de pago configurados
    Alert.alert('Métodos de Pago', 'Tarjetas de crédito/débito, transferencias bancarias y pagos en efectivo son aceptados.');
  };

  const handleBookAppointmentWithDeposit = () => {
    // Abrir modal de reserva de cita con seña para clientes
    setShowClientBookingModal(true);
  };

  const handleSubmitClientBookingRequest = () => {
    const appointmentRequestId = `request_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    addNotification({
      type: 'appointment_request',
      title: '📩 Nueva Solicitud de Cita',
      message: `${user?.fullName || 'Cliente'} solicitó una cita para ${clientBookingData.service} el ${clientBookingData.date} a las ${clientBookingData.time || 'por definir'}.`,
      recipientId: clientBookingData.professionalId || clientBookingData.professionalName || 'prof_unknown',
      senderId: user?.id || 'client_unknown',
      senderName: user?.fullName || 'Cliente',
      appointmentData: {
        appointmentId: appointmentRequestId,
        service: clientBookingData.service,
        date: clientBookingData.date,
        time: clientBookingData.time || 'Por definir',
        notes: clientBookingData.notes || 'Sin notas',
        professional: clientBookingData.professionalName,
      },
    });

    Alert.alert(
      '✅ Solicitud enviada',
      'La reserva quedó como solicitud. El profesional la confirmará desde notificaciones.',
      [{ text: 'Entendido' }]
    );

    setShowClientBookingModal(false);
  };

  // Funciones para filtrado de servicios y profesionales
  const handleClientServiceSelection = (selectedService: string) => {
    setClientBookingData(prev => ({ ...prev, service: selectedService, professionalId: '', professionalName: '', date: '', time: '' }));
    setClientSelectedDate('');
    setClientSelectedDateIso('');
    setClientAvailableTimeSlots([]);
    setClientAvailableDatesSet(new Set());
    setShowClientServiceSelector(false);
    
    // Filtrar desde el directorio real de profesionales (API + fallback local)
    const filtered = availableProfessionals
      .filter((professional) =>
        professionalOffersService(professional, selectedService, { strict: true })
      )
      .map((professional) => ({
        id: String(professional.id),
        name: professional.name,
        service: selectedService,
        rating: Number(professional.rating || 4.5),
        price: Number(professional.price || 10000),
      }));

    console.log(
      `🔎 Settings — servicio "${selectedService}" => ${filtered.length} profesional(es)`
    );
    setFilteredProfessionals(filtered);
    
    // El profesional se selecciona en el siguiente modal
  };

  const handleProfessionalSelection = (professional: { id: string; name: string; service: string; rating: number; price: number }) => {
    setClientBookingData(prev => ({ 
      ...prev, 
      professionalId: professional.id,
      professionalName: professional.name,
      service: professional.service,
      date: '',
      time: '',
    }));
    setClientSelectedDate('');
    setClientSelectedDateIso('');
    setClientAvailableTimeSlots([]);
    setShowProfessionalSelector(false);
    
    // Actualizar el precio de la seña basado en el profesional seleccionado
    const depositAmount = Math.round(professional.price * 0.20);
    setPaymentAmount(depositAmount);
  };

  // Funciones para el calendario del cliente
  const getSelectedProfessionalId = (): string => {
    if (clientBookingData.professionalId) return String(clientBookingData.professionalId);
    const byName = filteredProfessionals.find((p) => p.name === clientBookingData.professionalName);
    return byName ? String(byName.id) : '';
  };

  const toYmdLocal = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const loadClientAvailableDates = async (professionalId: string, monthDate: Date) => {
    if (!professionalId) {
      setClientAvailableDatesSet(new Set());
      return;
    }
    try {
      const month = monthDate.getMonth() + 1;
      const year = monthDate.getFullYear();
      const base = getBackendBaseUrl();
      const urlV1 = `${base}/api/v1/date-schedules/${professionalId}/month/${year}/${month}`;
      const urlLegacy = `${base}/api/date-schedules/${professionalId}/month/${year}/${month}`;
      let response = await fetch(urlV1);
      if (!response.ok && response.status === 404) {
        response = await fetch(urlLegacy);
      }
      if (!response.ok) {
        setClientAvailableDatesSet(new Set());
        return;
      }
      const payload = await response.json();
      const list = Array.isArray(payload?.data) ? payload.data : [];
      const dates = list
        .filter((item: any) => item?.date && item?.isAvailable !== false && Array.isArray(item?.timeSlots) && item.timeSlots.length > 0)
        .map((item: any) => String(item.date));
      setClientAvailableDatesSet(new Set(dates));
    } catch (error) {
      console.warn('⚠️ No se pudieron cargar fechas disponibles del profesional:', error);
      setClientAvailableDatesSet(new Set());
    }
  };

  const isClientDateAvailable = (date: Date, professionalId: string) => {
    if (!professionalId) return false;
    
    // Verificar que no sea una fecha pasada
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) return false;
    
    // Verificar que no esté muy lejos en el futuro (máximo 3 meses)
    const maxDate = new Date();
    maxDate.setMonth(maxDate.getMonth() + 3);
    if (date > maxDate) return false;
    const ymd = toYmdLocal(date);
    return clientAvailableDatesSet.has(ymd);
  };

  const getClientDaysInMonth = (date: Date, professionalId: string) => {
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
      days.push({
        day,
        isCurrentMonth: true,
        isAvailable: isClientDateAvailable(checkDate, professionalId),
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

  const handleClientDateSelection = (day: number, isAvailable: boolean) => {
    if (!isAvailable) return;
    
    const selectedDate = new Date(clientCurrentMonth.getFullYear(), clientCurrentMonth.getMonth(), day);
    const selectedYmd = toYmdLocal(selectedDate);
    const formattedDate = selectedDate.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    console.log('🔍 Seleccionando fecha:', formattedDate);
    
    setClientSelectedDate(formattedDate);
    setClientSelectedDateIso(selectedYmd);
    setClientBookingData(prev => ({ ...prev, date: formattedDate, time: '' }));
    setShowClientDatePickerModal(false);
  };

  const navigateClientMonth = (direction: 'prev' | 'next') => {
    setClientCurrentMonth(prev => {
      const newMonth = new Date(prev);
      if (direction === 'prev') {
        newMonth.setMonth(prev.getMonth() - 1);
      } else {
        newMonth.setMonth(prev.getMonth() + 1);
      }
      return newMonth;
    });
  };

  // Funciones para generar horarios disponibles del cliente
  const loadClientAvailableTimeSlots = async (professionalId: string, selectedDateYmd: string) => {
    if (!professionalId || !selectedDateYmd) {
      setClientAvailableTimeSlots([]);
      return;
    }
    try {
      const slots = await getBookableTimeSlotsForProfessionalDate(professionalId, selectedDateYmd);
      setClientAvailableTimeSlots(Array.isArray(slots) ? slots : []);
    } catch (error) {
      console.warn('⚠️ No se pudieron cargar horarios disponibles:', error);
      setClientAvailableTimeSlots([]);
    }
  };

  const handleClientTimeSelection = (selectedTime: string) => {
    setClientBookingData(prev => ({ ...prev, time: selectedTime }));
    setShowClientTimePickerModal(false);
  };

  // Cargar horarios reales del profesional cuando se selecciona fecha
  useEffect(() => {
    const professionalId = getSelectedProfessionalId();
    if (!professionalId || !clientSelectedDateIso) {
      setClientAvailableTimeSlots([]);
      return;
    }
    void loadClientAvailableTimeSlots(professionalId, clientSelectedDateIso);
  }, [clientBookingData.professionalId, clientBookingData.professionalName, clientSelectedDateIso]);

  // Cargar fechas disponibles reales del mes cuando se abre el selector de fecha
  useEffect(() => {
    if (!showClientDatePickerModal) return;
    const professionalId = getSelectedProfessionalId();
    if (!professionalId) return;
    void loadClientAvailableDates(professionalId, clientCurrentMonth);
  }, [
    showClientDatePickerModal,
    clientCurrentMonth,
    clientBookingData.professionalId,
    clientBookingData.professionalName,
  ]);

  // useEffect para cargar usuarios cliente cuando se abra el modal
  useEffect(() => {
    if (showAddPatientModal) {
      loadClientUsers();
    }
  }, [showAddPatientModal]);

  const handleSaveClinicSettings = () => {
    const c = selectedClinic;
    if (!c || !c.clinicName.trim() || !c.email.trim() || !c.phone.trim()) {
      Alert.alert('Error', 'Por favor completa los campos obligatorios (Nombre del Consultorio, Email y Teléfono)');
      return;
    }

    Alert.alert(
      '✅ Configuración Guardada',
      'La configuración del consultorio ha sido guardada exitosamente',
      [
        {
          text: 'OK',
          onPress: () => setShowClinicSettingsModal(false),
        },
      ]
    );
  };

  // const handleResetClinicSettings = () => {
  //   Alert.alert(
  //     '🔄 Restablecer Configuración',
  //     '¿Estás seguro de que quieres restablecer la configuración del consultorio a los valores predeterminados?',
  //     [
  //       { text: 'Cancelar', style: 'cancel' },
  //       {
  //         text: 'Restablecer',
  //         style: 'destructive',
  //         onPress: () => {
  //           setClinics(prev => prev.map((c, i) => i === selectedClinicIndex ? ({
  //             ...c,
  //             clinicName: 'Consultorio Dr. Carlos Mendoza',
  //             address: 'Av. Corrientes 1234, CABA',
  //             email: 'dr.mendoza@consultorio.com',
  //             phone: '+54 11 1234-5678',
  //             website: 'www.consultoriomendoza.com',
  //             paymentMethods: ['Efectivo', 'Tarjeta de crédito', 'Transferencia'],
  //             receipts: true,
  //             logo: '',
  //             phoneHours: {
  //             start: '09:00',
  //             end: '18:00',
  //             days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
  //           },
  //           emergencyContact: '+54 11 9876-5432',
  //         }) : c));
  //         Alert.alert('✅ Restablecido', 'Configuración del consultorio restablecida a valores predeterminados.');
  //       }
  //     }
  //   ]
  //   );
  // };

  const handleManagePatients = () => {
    setShowPatientManagementModal(true);
  };

  // const handleAddPatient = () => {
  //   setShowAddPatientForm(true);
  // };

  // const handleSaveNewPatient = () => {
  //   if (!newPatientData.fullName.trim() || !newPatientData.phone.trim()) {
  //     Alert.alert('Error', 'Por favor completa los campos obligatorios (Nombre y Teléfono)');
  //     return;
  //   }

  //   // Aquí se guardaría el paciente en AsyncStorage o base de datos
  //   const patientData = {
  //     id: `patient_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  //     fullName: newPatientData.fullName,
  //     email: newPatientData.email || '',
  //     phone: newPatientData.phone,
  //     dateOfBirth: newPatientData.dateOfBirth || '',
  //     gender: newPatientData.gender || '',
  //     address: newPatientData.address || '',
  //     emergencyContact: newPatientData.emergencyContact || '',
  //     medicalHistory: newPatientData.medicalHistory || '',
  //     allergies: newPatientData.allergies || '',
  //     notes: newPatientData.notes || '',
  //     createdAt: new Date().toISOString(),
  //     professionalId: user?.id || '',
  //   };

  //   console.log('Nuevo paciente creado:', patientData);
    
  //   Alert.alert(
  //     '✅ Paciente Agregado',
  //     `${newPatientData.fullName} ha sido agregado exitosamente a tu lista de pacientes.`,
  //     [
  //       {
  //         text: 'OK',
  //         onPress: () => {
  //           handleCancelAddPatient();
  //         }
  //       }
  //     ]
  //   );
  // };

  // const handleViewPatientDetails = (patient: any) => {
  //   setSelectedPatient(patient);
  //   setShowPatientDetails(true);
  // };

  // const handleEditPatient = (patient: any) => {
  //   setSelectedPatient(patient);
  //   setNewPatient({
  //     fullName: patient.fullName || '',
  //     email: patient.email || '',
  //     phone: patient.phone || '',
  //     dateOfBirth: patient.dateOfBirth || '',
  //     gender: patient.gender || '',
  //     address: patient.address || '',
  //     emergencyContact: patient.emergencyContact || '',
  //     medicalHistory: patient.medicalHistory || '',
  //     allergies: patient.allergies || '',
  //     notes: patient.notes || '',
  //   });
  //   setShowEditPatientForm(true);
  // };

  // const handleUpdatePatient = () => {
  //   if (!newPatient.fullName.trim() || !newPatient.email.trim() || !newPatient.phone.trim()) {
  //     Alert.alert('Error', 'Por favor completa los campos obligatorios');
  //     return;
  //   }

  //   // Aquí se actualizaría el paciente en AsyncStorage o base de datos
  //   const updatedPatient = {
  //     ...selectedPatient,
  //     ...newPatient,
  //     updatedAt: new Date().toISOString(),
  //   };

  //   console.log('Paciente actualizado:', updatedPatient);
    
  //   Alert.alert(
  //     '✅ Paciente Actualizado',
  //     `${newPatient.fullName} ha sido actualizado exitosamente.`,
  //     [
  //       {
  //         text: 'OK',
  //         onPress: () => {
  //           setShowEditPatientForm(false);
  //           setShowPatientDetails(false);
  //           setSelectedPatient(null);
  //         }
  //       }
  //     ]
  //   );
  // };

  // const handleDeletePatient = (patient: any) => {
  //   Alert.alert(
  //     '🗑️´©Å Eliminar Paciente',
  //     `¿Estás seguro de que quieres eliminar a ${patient.fullName}? Esta acción no se puede deshacer.`,
  //     [
  //       {
  //         text: 'Cancelar',
  //         style: 'cancel'
  //       },
  //       {
  //         text: 'Eliminar',
  //         style: 'destructive',
  //         onPress: () => {
  //           // Aquí se eliminaría el paciente de AsyncStorage o base de datos
  //           console.log('Paciente eliminado:', patient);
  //           Alert.alert('✅ Eliminado', `${patient.fullName} ha sido eliminado de tu lista de pacientes.`);
  //         }
  //       }
  //     ]
  //   );
  // };

  // Funciones para el modal de gestión de pacientes
  const handleViewPatientDetails = (patient: any) => {
    setSelectedPatient(patient);
    setShowPatientDetails(true);
  };



  const handleScheduleAppointment = (patient: any) => {
    // Cerrar el modal de gestión y abrir el modal de nueva cita
    setShowPatientManagementModal(false);
    // Pre-llenar el formulario con los datos del paciente
    setNewProfessionalAppointment(prev => ({
      ...prev,
      patientName: patient.name,
      patientEmail: patient.email,
      patientPhone: patient.phone,
    }));
    setShowNewAppointmentModal(true);
  };

  const handleViewPatientHistory = (patient: any) => {
    const currentUserId = String(user?._id || user?.id || '');
    const patientAppointments = getUpcomingAppointments(currentUserId).filter((appointment) => {
      const byEmail =
        patient.email &&
        appointment.patientEmail &&
        String(appointment.patientEmail).toLowerCase() === String(patient.email).toLowerCase();
      const byName =
        patient.name &&
        appointment.patientName &&
        String(appointment.patientName).toLowerCase() === String(patient.name).toLowerCase();
      const byId =
        patient.id &&
        appointment.clientId &&
        String(appointment.clientId) === String(patient.id);
      return Boolean(byEmail || byName || byId);
    });

    const historyLines =
      patientAppointments.length > 0
        ? patientAppointments
            .slice(0, 8)
            .map(
              (apt) =>
                `• ${apt.date} ${apt.time} - ${apt.service} (${apt.status === 'confirmed' ? 'Confirmada' : apt.status})`
            )
            .join('\n')
        : '• No hay citas registradas aún para este paciente.';

    Alert.alert(
      '📋 Historial del Paciente',
      `Historial de ${patient.name}:\n\n` +
      `• Total de visitas: ${patient.visits}\n` +
      `• Última visita: ${patient.lastVisit}\n` +
      `• Estado: ${patient.status === 'active' ? 'Activo' : 'Inactivo'}\n` +
      `• Notas: ${patient.notes}\n\n` +
      `Últimas citas:\n${historyLines}`,
      [{ text: 'OK' }]
    );
  };

  const normalizePatientDate = (value?: string) => {
    if (!value) return null;
    if (value.includes('/')) {
      const [day, month, year] = value.split('/');
      if (!day || !month || !year) return null;
      const parsed = new Date(Number(year), Number(month) - 1, Number(day));
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const getRealPatientManagementList = () => {
    const currentUserId = String(user?._id || user?.id || '');
    const sourceAppointments = currentUserId ? getUpcomingAppointments(currentUserId) : [];
    const patientMap = new Map<string, any>();

    clients.forEach((client) => {
      const key = String(client._id || client.email || client.fullName || Math.random());
      patientMap.set(key, {
        id: String(client._id || key),
        name: client.fullName || 'Paciente',
        email: client.email || '',
        phone: client.phone || 'No especificado',
        status: client.isActive ? 'active' : 'inactive',
        lastVisit: '',
        visits: 0,
        notes: 'Paciente registrado en el sistema',
        dateOfBirth: '',
        gender: '',
        address: '',
        emergencyContact: '',
        medicalHistory: '',
        allergies: '',
      });
    });

    sourceAppointments.forEach((appointment) => {
      const rawKey =
        appointment.clientId ||
        (appointment.patientEmail ? String(appointment.patientEmail).toLowerCase() : '') ||
        (appointment.patientName ? String(appointment.patientName).toLowerCase() : '');
      const key = String(rawKey || `appointment_${appointment.id}`);
      const existing = patientMap.get(key) || {
        id: String(appointment.clientId || key),
        name: appointment.patientName || appointment.clientName || 'Paciente',
        email: appointment.patientEmail || '',
        phone: appointment.patientPhone || 'No especificado',
        status: 'active',
        lastVisit: '',
        visits: 0,
        notes: '',
        dateOfBirth: '',
        gender: '',
        address: '',
        emergencyContact: '',
        medicalHistory: '',
        allergies: '',
      };

      const appointmentDate = normalizePatientDate(String(appointment.date || ''));
      const currentLastVisitDate = normalizePatientDate(existing.lastVisit);
      const shouldReplaceLastVisit =
        appointmentDate &&
        (!currentLastVisitDate || appointmentDate.getTime() > currentLastVisitDate.getTime());

      patientMap.set(key, {
        ...existing,
        id: String(existing.id || appointment.clientId || key),
        name: existing.name || appointment.patientName || appointment.clientName || 'Paciente',
        email: existing.email || appointment.patientEmail || '',
        phone: existing.phone !== 'No especificado' ? existing.phone : appointment.patientPhone || 'No especificado',
        status: appointment.status === 'cancelled' ? existing.status : 'active',
        visits: Number(existing.visits || 0) + 1,
        lastVisit: shouldReplaceLastVisit ? String(appointment.date || '') : existing.lastVisit,
        notes:
          existing.notes && existing.notes !== 'Paciente registrado en el sistema'
            ? existing.notes
            : appointment.notes || 'Paciente con historial de citas registradas',
      });
    });

    let rows = Array.from(patientMap.values());

    if (patientManagementSearchQuery.trim()) {
      const query = patientManagementSearchQuery.toLowerCase();
      rows = rows.filter(
        (row) =>
          String(row.name || '').toLowerCase().includes(query) ||
          String(row.email || '').toLowerCase().includes(query) ||
          String(row.phone || '').includes(query)
      );
    }

    if (patientManagementFilter === 'active') {
      rows = rows.filter((row) => row.status === 'active');
    } else if (patientManagementFilter === 'inactive') {
      rows = rows.filter((row) => row.status === 'inactive');
    } else if (patientManagementFilter === 'recent') {
      const threshold = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      rows = rows.filter((row) => {
        const parsed = normalizePatientDate(row.lastVisit);
        return parsed ? parsed.getTime() >= threshold.getTime() : false;
      });
    }

    rows.sort((a, b) => Number(b.visits || 0) - Number(a.visits || 0));
    return rows;
  };

  const handleImportPatients = async () => {
    try {
      await refreshUsers();
      Alert.alert('✅ Pacientes actualizados', 'Se sincronizó la lista de pacientes desde el backend.');
    } catch (error) {
      Alert.alert('Error', 'No se pudo sincronizar la lista de pacientes.');
    }
  };

  const handleExportPatients = async () => {
    const rows = getRealPatientManagementList();
    if (!rows.length) {
      Alert.alert('📤 Exportar Pacientes', 'No hay pacientes para exportar.');
      return;
    }

    const escapeCsv = (value: unknown) => {
      const text = String(value ?? '').replace(/"/g, '""');
      return `"${text}"`;
    };
    const header = ['Nombre', 'Email', 'Telefono', 'Estado', 'Ultima visita', 'Visitas', 'Notas'];
    const csvLines = [
      header.join(','),
      ...rows.map((row) =>
        [
          escapeCsv(row.name),
          escapeCsv(row.email),
          escapeCsv(row.phone),
          escapeCsv(row.status === 'active' ? 'Activo' : 'Inactivo'),
          escapeCsv(row.lastVisit || ''),
          escapeCsv(row.visits || 0),
          escapeCsv(row.notes || ''),
        ].join(',')
      ),
    ];
    const csvContent = csvLines.join('\n');

    try {
      await Share.share({
        title: 'Pacientes Turnario',
        message: `Pacientes Turnario (CSV)\n\n${csvContent}`,
      });
    } catch (error) {
      console.error('❌ Error exportando pacientes:', error);
      Alert.alert('Error', 'No se pudo exportar el listado de pacientes.');
    }
  };

  const getFilteredPatients = () => {
    // Obtener pacientes del profesional logueado
    const userEmail = user?.email || '';
    const predefinedProfessionals = [
      { email: 'dr.carlos.mendoza@turnario.com', key: 'dr.carlos.mendoza' },
      { email: 'dr.maria.gonzalez@turnario.com', key: 'dr.maria.gonzalez' }
    ];
    
    const professionalKey = predefinedProfessionals.find(p => p.email === userEmail)?.key;
    
    // Mock data de pacientes por profesional
    const patientsByProfessional = {
      'dr.carlos.mendoza': [
        { id: '1', fullName: 'María González', email: 'maria.gonzalez@email.com', phone: '+54 9 11 1234-5678', dateOfBirth: '15/03/1985', gender: 'Femenino', address: 'Av. Corrientes 1234, CABA', emergencyContact: '+54 9 11 9876-5432', medicalHistory: 'Hipertensión controlada', allergies: 'Penicilina', notes: 'Paciente preferente' },
        { id: '2', fullName: 'Carlos Rodríguez', email: 'carlos.rodriguez@email.com', phone: '+54 9 11 2345-6789', dateOfBirth: '22/07/1978', gender: 'Masculino', address: 'Belgrano 567, CABA', emergencyContact: '+54 9 11 8765-4321', medicalHistory: 'Diabetes tipo 2', allergies: 'Ninguna', notes: 'Requiere seguimiento mensual' },
        { id: '3', fullName: 'Ana Martínez', email: 'ana.martinez@email.com', phone: '+54 9 11 3456-7890', dateOfBirth: '08/11/1992', gender: 'Femenino', address: 'Palermo 890, CABA', emergencyContact: '+54 9 11 7654-3210', medicalHistory: 'Asma leve', allergies: 'Polvo, ácaros', notes: 'Paciente deportista' },
      ],
      'dr.maria.gonzalez': [
        { id: '4', fullName: 'Luis Fernández', email: 'luis.fernandez@email.com', phone: '+54 9 11 4567-8901', dateOfBirth: '12/05/1980', gender: 'Masculino', address: 'Recoleta 234, CABA', emergencyContact: '+54 9 11 6543-2109', medicalHistory: 'Problemas cardíacos', allergies: 'Sulfamidas', notes: 'Control cada 3 meses' },
        { id: '5', fullName: 'Elena Silva', email: 'elena.silva@email.com', phone: '+54 9 11 5678-9012', dateOfBirth: '30/09/1987', gender: 'Femenino', address: 'Villa Crespo 456, CABA', emergencyContact: '+54 9 11 5432-1098', medicalHistory: 'Migrañas', allergies: 'Lactosa', notes: 'Paciente nuevo' },
      ],
      'default': []
    };
    
    const patients = patientsByProfessional[professionalKey as keyof typeof patientsByProfessional] || patientsByProfessional.default;
    
    if (patientSearchQuery.trim()) {
      return patients.filter(patient =>
        patient.fullName.toLowerCase().includes(patientSearchQuery.toLowerCase()) ||
        patient.email.toLowerCase().includes(patientSearchQuery.toLowerCase()) ||
        patient.phone.includes(patientSearchQuery)
      );
    }
    
    return patients;
  };

  const openExternalLink = async (url: string, errorMessage: string) => {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) {
        Alert.alert('No disponible', errorMessage);
        return;
      }
      await Linking.openURL(url);
    } catch (error) {
      console.warn('No se pudo abrir enlace externo:', error);
      Alert.alert('Error', errorMessage);
    }
  };

  const handleHelp = () => {
    setShowHelpSupportModal(true);
  };

  const handleSupportByEmail = () => {
    const subject = encodeURIComponent('Soporte Turnario');
    const body = encodeURIComponent('Hola equipo de Turnario, necesito ayuda con...');
    void openExternalLink(
      `mailto:${supportEmail}?subject=${subject}&body=${body}`,
      'No se pudo abrir el cliente de correo en este dispositivo.'
    );
  };

  const handleSupportByWhatsApp = () => {
    if (!supportWhatsAppPhone) {
      Alert.alert('No disponible', 'WhatsApp de soporte no configurado.');
      return;
    }
    const text = encodeURIComponent('Hola Turnario, necesito ayuda con la app.');
    void openExternalLink(
      `https://wa.me/${supportWhatsAppPhone}?text=${text}`,
      'No se pudo abrir WhatsApp en este dispositivo.'
    );
  };

  const handleSupportByPhone = () => {
    if (!supportPhone) {
      Alert.alert('No disponible', 'Teléfono de soporte no configurado.');
      return;
    }
    void openExternalLink(`tel:${supportPhone}`, 'No se pudo iniciar la llamada desde este dispositivo.');
  };

  const handleHelpFaq = () => {
    Alert.alert(
      'Preguntas frecuentes',
      '• Si no ves profesionales, revisá conexión y servicio seleccionado.\n• Si no llegan notificaciones, verificá permisos en la app.\n• Si una cita no aparece, cerrá y abrí sesión nuevamente.\n• Para soporte técnico, escribinos por email o WhatsApp.',
      [{ text: 'Entendido' }]
    );
  };

  const handleAbout = () => {
    Alert.alert('Acerca de', 'Turnario v1.0.0\n\nGestiona tus citas de manera fácil y eficiente.');
  };

  const handleTurnarioPro = () => {
    router.push('/subscribe' as never);
  };

  const handleConfigureAvailability = () => {
    router.push('/availability-settings' as never);
  };

  const handleMedicalAuthorizations = () => {
    setShowMedicalAuthorizationModal(true);
  };

  const handleSaveProfile = async () => {
    if (!editingProfile.fullName.trim()) {
      Alert.alert('Error', 'El nombre completo es obligatorio');
      return;
    }

    if (!editingProfile.email.trim()) {
      Alert.alert('Error', 'El email es obligatorio');
      return;
    }

    setIsEditing(true);
    try {
      // Llamar a la función updateUserProfile del contexto
      const success = await updateUserProfile({
        fullName: editingProfile.fullName.trim(),
        email: editingProfile.email.trim(),
        phone: editingProfile.phone.trim(),
        service: editingProfile.service?.trim() || '',
      });
      
      if (success) {
        Alert.alert(
          '✅ Perfil Actualizado',
          'Tu perfil ha sido actualizado exitosamente',
          [
            {
              text: 'OK',
              onPress: () => {
                setShowEditProfileModal(false);
                setIsEditing(false);
              },
            },
          ]
        );
      } else {
        throw new Error('Error al actualizar perfil');
      }
    } catch (error) {
      Alert.alert('❌ Error', 'No se pudo actualizar el perfil. Inténtalo de nuevo.');
      setIsEditing(false);
    }
  };



  const handleServiceSelection = () => {
    console.log('🔧 Abriendo modal de servicios...');
    console.log('🔧 Estado actual showServiceSelector:', showServiceSelector);
    setShowServiceSelector(true);
    setServiceSelectionMode('profile');
    console.log('🔧 Modal de servicios abierto');
  };

  const handleServiceSelect = (service: string) => {
    try {
      console.log('✅ Servicio seleccionado:', service, 'Modo:', serviceSelectionMode);
      
      if (!service || typeof service !== 'string') {
        console.error('Servicio inválido:', service);
        Alert.alert('Error', 'Servicio inválido seleccionado');
        return;
      }
      
      // Cerrar el modal
      setShowServiceSelector(false);
      
      // Limpiar la búsqueda y categoría
      setServiceSearchQuery('');
      setSelectedServiceCategory('Todas');
      
      if (serviceSelectionMode === 'profile') {
        // Actualizar el perfil en edición
        setEditingProfile(prev => ({ ...prev, service }));
        
        // Mostrar confirmación para el perfil
        Alert.alert(
          '✅ Servicio Seleccionado',
          `Has seleccionado: ${service}\n\nEste servicio se guardará en tu perfil como tu especialidad principal.`,
          [
            { 
              text: 'Cancelar',
              style: 'cancel',
              onPress: () => {
                console.log('Selección de servicio cancelada');
                // Revertir la selección
                setEditingProfile(prev => ({ ...prev, service: '' }));
                setShowServiceSelector(true);
              }
            },
            { 
              text: 'Confirmar',
              style: 'default',
              onPress: () => {
                console.log('Servicio confirmado para perfil:', service);
              }
            }
          ]
        );
      } else if (serviceSelectionMode === 'appointment') {
        // Actualizar el servicio para la nueva cita
        setNewProfessionalAppointment(prev => ({ ...prev, service }));
        
        // Mostrar confirmación para la cita
        Alert.alert(
          '✅ Servicio Seleccionado para Cita',
          `Has seleccionado: ${service}\n\nEste servicio se usará para la nueva cita.`,
          [
            { 
              text: 'Cambiar',
              style: 'cancel',
              onPress: () => {
                console.log('Cambiar servicio de cita');
                setShowServiceSelector(true);
                setServiceSelectionMode('appointment');
              }
            },
            { 
              text: 'Confirmar',
              style: 'default',
              onPress: () => {
                console.log('Servicio confirmado para cita:', service);
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error al seleccionar servicio:', error);
      Alert.alert('Error', 'No se pudo seleccionar el servicio');
    }
  };

  // Funciones para manejar el nuevo paciente
  const handleAddNewPatient = () => {
    console.log('🆕 Abriendo modal para agregar nuevo paciente...');
    setShowAddPatientModal(true);
  };

  const handleSaveNewPatient = () => {
    try {
      // Validar campos obligatorios
      if (!newPatientData.fullName.trim()) {
        Alert.alert('Error', 'El nombre completo es obligatorio');
        return;
      }

      if (!newPatientData.email.trim()) {
        Alert.alert('Error', 'El email es obligatorio');
        return;
      }

      if (!newPatientData.phone.trim()) {
        Alert.alert('Error', 'El teléfono es obligatorio');
        return;
      }

      // Aquí iría la lógica para guardar el paciente en la base de datos
      console.log('💎 Guardando nuevo paciente:', newPatientData);
      
      // Simular guardado exitoso
      Alert.alert(
        '✅ Paciente Creado',
        `El paciente ${newPatientData.fullName} ha sido creado exitosamente.`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Limpiar el formulario
              setNewPatientData({
                fullName: '',
                email: '',
                phone: '',
                dateOfBirth: '',
                gender: '',
                address: '',
                emergencyContact: '',
                medicalHistory: '',
                allergies: '',
                notes: '',
              });
              // Cerrar el modal
              setShowAddPatientModal(false);
              // Volver al catálogo de pacientes
              setShowPatientCatalogModal(true);
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error al guardar paciente:', error);
      Alert.alert('Error', 'No se pudo guardar el paciente');
    }
  };

  const handleCancelAddPatient = () => {
    // Limpiar el formulario
    setNewPatientData({
      fullName: '',
      email: '',
      phone: '',
      dateOfBirth: '',
      gender: '',
      address: '',
      emergencyContact: '',
      medicalHistory: '',
      allergies: '',
      notes: '',
    });
    // Cerrar el modal
    setShowAddPatientModal(false);
  };

  const getFilteredServices = () => {
    try {
      let filteredServices = [...SERVICES]; // Crear una copia para evitar mutaciones
      
      // Filtrar por categoría
      if (selectedServiceCategory !== 'Todas') {
        try {
          const categoryServices = getServicesByCategory(selectedServiceCategory);
          if (categoryServices && categoryServices.length > 0) {
            filteredServices = categoryServices;
          } else {
            console.log(`No se encontraron servicios para la categoría: ${selectedServiceCategory}`);
            filteredServices = [...SERVICES];
          }
        } catch (error) {
          console.warn('Error al filtrar por categoría:', error);
          filteredServices = [...SERVICES];
        }
      }
      
      // Filtrar por búsqueda
      if (serviceSearchQuery && serviceSearchQuery.trim()) {
        const searchTerm = (serviceSearchQuery || '').toLowerCase().trim();
        filteredServices = filteredServices.filter(service =>
          service && service.toLowerCase().includes(searchTerm)
        );
      }
      
      return filteredServices;
    } catch (error) {
      console.error('Error en getFilteredServices:', error);
      return [...SERVICES];
    }
  };

  const getServiceCategories = () => {
    return [
      'Todas',
      'Psicología y Salud Mental',
      'Medicina',
      'Fisioterapia',
      'Terapia Ocupacional',
      'Terapia del Lenguaje',
      'Nutrición',
      'Psicopedagogía',
      'Odontología',
      'Enfermería',
      'Terapias Alternativas',
      'Entrenamiento',
      'Masajes',
    ];
  };

  const handleNewAppointment = () => {
    console.log('🔄 handleNewAppointment ejecutándose...');
    console.log('👤 Usuario actual:', user);
    console.log('🔧 Servicio del usuario:', user?.service);
    console.log('📊 Estado actual showNewAppointmentModal:', showNewAppointmentModal);
    console.log('📊 Estado actual catalogView:', catalogView);
    console.log('📊 Estado actual shouldOpenNewAppointmentModal:', shouldOpenNewAppointmentModal);
    
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
              setShowEditProfileModal(true);
              setEditingProfile(prev => ({ ...prev, service: '' }));
            }
          }
        ]
      );
      return;
    }
    
    console.log('✅ Usuario tiene servicio configurado, procediendo a abrir modal...');
    
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
    
    setNewProfessionalAppointment({
      service: user.service, // Automáticamente colocar el servicio del profesional
      date: todayFormatted,
      time: nextHourFormatted,
      patientName: '',
      patientPhone: '',
      patientEmail: '',
      notes: '',
    });
    
    // Resetear el estado de notificaciones enviadas
    setNotificationsSent([]);
    
    console.log('🎯 Configurando showNewAppointmentModal a true...');
    setShowNewAppointmentModal(true);
    console.log('✅ showNewAppointmentModal configurado a true');
    
    // Verificar que el estado se actualizó correctamente
    setTimeout(() => {
      console.log('⏰ Estado después de 100ms showNewAppointmentModal:', showNewAppointmentModal);
    }, 100);
  };

  // const handleServiceSelectionForAppointment = () => {
  //   setShowServiceSelector(true);
  // };

  // const handleServiceSelectForAppointment = (service: string) => {
  //   const isDefaultService = service === user?.service;
    
  //   setNewProfessionalAppointment(prev => ({ ...prev, service }));
  //   setShowServiceSelector(false);
  //   setServiceSearchQuery('');
  //   setSelectedServiceCategory('Todas');
    
  //   // Mostrar mensaje informativo si cambió del servicio por defecto
  //   if (!isDefaultService && user?.service) {
  //     Alert.alert(
  //       'Servicio Cambiado',
  //       `Has cambiado el servicio de "${user.service}" a "${service}".\n\nPuedes restaurar tu servicio por defecto en cualquier momento usando el botón "Restaurar servicio por defecto".`,
  //       [{ text: 'Entendido' }]
  //     );
  //   }
  // };

  // const handleSubmitProfessionalAppointment = async () => {
  //   if (!newProfessionalAppointment.service.trim() || 
  //       !newProfessionalAppointment.date.trim() || 
  //       !newProfessionalAppointment.time.trim() ||
  //       !newProfessionalAppointment.patientName.trim()) {
  //     Alert.alert('Error', 'Por favor completa todos los campos obligatorios');
  //       return;
  //   }

  //   // Validar formato de fecha (DD/MM/AAAA)
  //   const dateRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
  //   const dateMatch = newProfessionalAppointment.date.match(dateRegex);
  //   if (!dateMatch) {
  //     Alert.alert('Error', 'El formato de fecha debe ser DD/MM/AAAA (ej: 25/12/2024)');
  //       return;
  //   }

  //   // Validar que la fecha no sea anterior a hoy
  //   const [day, month, year] = dateMatch.slice(1).map(Number);
  //   const appointmentDate = new Date(year, month - 1, day);
  //   const today = new Date();
  //   today.setHours(0, 0, 0, 0);
    
  //   if (appointmentDate < today) {
  //     Alert.alert('Error', 'No puedes crear citas para fechas pasadas');
  //       return;
  //   }

  //   // Validar formato de hora (HH:MM)
  //   const timeRegex = /^(\d{1,2}):(\d{2})$/;
  //   const timeMatch = newProfessionalAppointment.time.match(timeRegex);
  //   if (!timeMatch) {
  //     Alert.alert('Error', 'El formato de hora debe ser HH:MM (ej: 14:30)');
  //       return;
  //   }

  //   // Validar que la hora esté en un rango válido (0-23 horas, 0-59 minutos)
  //   const [hours, minutes] = timeMatch.slice(1).map(Number);
  //   if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
  //     Alert.alert('Error', 'La hora debe estar entre 00:00 y 23:59');
  //       return;
  //   }

  //   setIsCreatingAppointment(true);
  //   try {
  //     // Generar un ID único para el cliente (en un sistema real, esto vendría de una base de datos)
  //     const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
  //     // Crear la cita
  //     addAppointment({
  //       service: newProfessionalAppointment.service.trim(),
  //       professional: user?.fullName || 'Profesional',
  //       professionalId: user?.id || '',
  //       date: newProfessionalAppointment.date.trim(),
  //       time: newProfessionalAppointment.time.trim(),
  //       notes: newProfessionalAppointment.notes.trim(),
  //       clientName: clientId,
  //       clientName: newProfessionalAppointment.patientName.trim(),
  //     });
      
  //     // Enviar notificación al cliente
  //     addNotification({
  //       type: 'appointment_confirmed',
  //       title: '🎉 ¡Cita Confirmada!',
  //       message: `Tu cita con ${user?.fullName} para ${newProfessionalAppointment.service} ha sido confirmada para el ${newProfessionalAppointment.date} a las ${newProfessionalAppointment.time}.`,
  //       recipientId: clientId,
  //       senderId: user?.id || '',
  //       senderName: user?.fullName || 'Profesional',
  //       appointmentData: {
  //         service: newProfessionalAppointment.service.trim(),
  //         date: newProfessionalAppointment.date.trim(),
  //         time: newProfessionalAppointment.time.trim(),
  //         notes: newProfessionalAppointment.notes.trim(),
  //       },
  //     });
      
  //     // Simular un pequeño delay para mostrar el estado de carga
  //       await new Promise(resolve => setTimeout(resolve, 500));
      
  //     Alert.alert(
  //       '✅ Cita Creada Exitosamente',
  //       `Cita creada para ${newProfessionalAppointment.patientName} el ${newProfessionalAppointment.date} a las ${newProfessionalAppointment.time}.\n\nLa cita ha sido agregada a tu calendario y está marcada como confirmada.\n\n📱 Se ha enviado una notificación automática al cliente.`,
  //       [
  //         {
  //           text: 'Ver en Calendario',
  //           onPress: () => {
  //             // Aquí podrías navegar al calendario o cerrar el modal
  //             setShowNewAppointmentModal(false);
  //             resetProfessionalAppointmentForm();
  //           },
  //         },
  //         {
  //           text: 'Crear Otra Cita',
  //           onPress: () => {
  //             resetProfessionalAppointmentForm();
  //           },
  //         },
  //       ]
  //     );
  //   } catch (error) {
  //     console.error('Error creating appointment:', error);
  //     Alert.alert('❌ Error', 'No se pudo crear la cita. Inténtalo de nuevo.');
  //   } finally {
  //     setIsCreatingAppointment(false);
  //   }
  // };

  // const resetProfessionalAppointmentForm = () => {
  //   // Generar fecha de hoy en formato DD/MM/AAAA
  //   const today = new Date();
  //   const day = String(today.getDate()).padStart(2, '0');
  //   const month = String(today.getMonth() + 1).padStart(2, '0');
  //   const year = today.getFullYear();
  //   const todayFormatted = `${day}/${month}/${year}`;
    
  //   // Generar hora actual + 1 hora en formato HH:MM
  //   const nextHour = new Date(today.getTime() + 60 * 60 * 1000);
  //   const hours = String(nextHour.getHours()).padStart(2, '0');
  //   const minutes = String(nextHour.getMinutes()).padStart(2, '0');
  //   const nextHourFormatted = `${hours}:${minutes}`;
    
  //   setNewProfessionalAppointment({
  //     service: user?.service || '', // Mantener el servicio del profesional
  //     date: todayFormatted,
  //     time: nextHourFormatted,
  //     patientName: '',
  //       patientPhone: '',
  //       patientEmail: '',
  //       notes: '',
  //   });
    
  //   // Resetear el estado de notificaciones enviadas
  //   setNotificationsSent([]);
  // };

  // const handleAddNewPatient = () => {
  //   console.log('🔄 Abriendo modal de agregar paciente...');
  //   console.log('📊 Estado actual catalogView:', catalogView);
  //   console.log('📊 Estado actual showNewAppointmentModal:', showNewAppointmentModal);
  //   console.log('📊 Estado actual shouldOpenNewAppointmentModal:', shouldOpenNewAppointmentModal);
    
  //   // Verificar que no se esté activando el contexto automáticamente
  //   if (shouldOpenNewAppointmentModal) {
  //     console.log('⚠️ ADVERTENCIA: shouldOpenNewAppointmentModal ya está activo!');
  //   }
    
  //   setCatalogView('add');
  //   console.log('✅ Cambiando a vista de agregar paciente');
    
  //   // Verificar que el estado se actualizó correctamente
  //   setTimeout(() => {
  //     console.log('⏰ Estado después de 100ms catalogView:', catalogView);
  //     console.log('⏰ Estado después de 100ms showNewAppointmentModal:', showNewAppointmentModal);
  //     console.log('⏰ Estado después de 100ms shouldOpenNewAppointmentModal:', shouldOpenNewAppointmentModal);
  //   }, 100);
    
  //   // Verificar que el estado se actualizó correctamente después de más tiempo
  //   setTimeout(() => {
  //     console.log('⏰ Estado después de 500ms catalogView:', catalogView);
  //     console.log('⏰ Estado después de 500ms showNewAppointmentModal:', showNewAppointmentModal);
  //     console.log('⏰ Estado después de 500ms shouldOpenNewAppointmentModal:', shouldOpenNewAppointmentModal);
  //   }, 500);
  // };

  // const handleCancelAddPatient = () => {
  //   // Volver a la vista de lista de pacientes
  //   setCatalogView('list');
    
  //   // Limpiar el formulario
  //   setNewPatientData({
  //     fullName: '',
  //     email: '',
  //     phone: '',
  //     dateOfBirth: '',
  //     gender: '',
  //     address: '',
  //     emergencyContact: '',
  //     medicalHistory: '',
  //     allergies: '',
  //     notes: '',
  //   });
  //   setSelectedUser(null);
  //   setUserSearchText('');
  // };

  // const handleUserSelect = (user: any) => {
  //   setSelectedUser(user);
  //   setNewPatientData(prev => ({
  //     ...prev,
  //     fullName: user.name,
  //     email: user.email,
  //     phone: user.phone,
  //   }));
  // };



  // const handleCancelNewAppointment = () => {
  //   Alert.alert(
  //     'Cancelar Creación de Cita',
  //     '¿Estás seguro de que quieres cancelar? Se perderán los datos ingresados.',
  //     [
  //       { text: 'Continuar Editando', style: 'cancel' },
  //       {
  //         text: 'Sí, Cancelar',
  //         style: 'destructive',
  //         onPress: () => {
  //           setShowNewAppointmentModal(false);
  //           resetProfessionalAppointmentForm();
  //         },
  //       },
  //     ]
  //   );
  // };

  // const sendClientNotification = (type: 'appointment_confirmed' | 'reminder' | 'appointment_cancelled', message: string) => {
  //   if (!newProfessionalAppointment.patientName.trim()) {
  //     Alert.alert('Error', 'No hay información del cliente para enviar la notificación');
  //     return;
  //   }

  //   // Generar el mismo ID de cliente que se usará en la cita
  //   const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
  //   addNotification({
  //     type,
  //     title: type === 'appointment_confirmed' ? '🎉 ¡Cita Confirmada!' : 
  //            type === 'reminder' ? '⏰ Recordatorio de Cita' : '❌ Cita Cancelada',
  //     message,
  //     recipientId: clientId,
  //     senderId: user?.id || '',
  //     senderName: user?.fullName || 'Profesional',
  //     appointmentData: {
  //       service: newProfessionalAppointment.service.trim(),
  //       date: newProfessionalAppointment.date.trim(),
  //       time: newProfessionalAppointment.time.trim(),
  //       notes: newProfessionalAppointment.notes.trim(),
  //     },
  //   });

  //   console.log('📱 Notificación enviada al cliente:', {
  //     type,
  //     clientId,
  //     message,
  //     timestamp: new Date().toISOString()
  //   });

  //   // Actualizar el estado de notificaciones enviadas
  //   setNotificationsSent(prev => [...prev, type]);

  //   Alert.alert(
  //     '✅ Notificación Enviada',
  //     'La notificación ha sido enviada exitosamente al cliente.',
  //     [{ text: 'OK' }]
  //   );
  // };

  // const showAppointmentSummary = () => {
  //   if (!newProfessionalAppointment.service.trim() || 
  //       !newProfessionalAppointment.date.trim() || 
  //       !newProfessionalAppointment.time.trim() ||
  //       !newProfessionalAppointment.patientName.trim()) {
  //     Alert.alert('Error', 'Por favor completa todos los campos obligatorios');
  //     return;
  //   }

  //   Alert.alert(
  //     'Resumen de la Cita',
  //     `¿Confirmar la creación de esta cita?\n\n` +
  //     `👤 Paciente: ${newProfessionalAppointment.patientName}\n` +
  //     `📅 Fecha: ${newProfessionalAppointment.date}\n` +
  //     `🕐 Hora: ${newProfessionalAppointment.time}\n` +
  //     `🏥 Servicio: ${newProfessionalAppointment.service}\n` +
  //     `${newProfessionalAppointment.notes ? `📝 Notas: ${newProfessionalAppointment.notes}\n` : ''}` +
  //     `${newProfessionalAppointment.patientPhone ? `📞 Teléfono: ${newProfessionalAppointment.patientPhone}\n` : ''}` +
  //     `${newProfessionalAppointment.patientEmail ? `📧 Email: ${newProfessionalAppointment.patientEmail}` : ''}`,
  //     [
  //       { text: 'Revisar', style: 'cancel' },
  //       {
  //         text: 'Confirmar y Crear',
  //         style: 'default',
  //         onPress: handleSubmitProfessionalAppointment,
  //       },
  //     ]
  //   );
  // };

  const handleSaveNotificationSettings = async () => {
    try {
      // Las configuraciones se guardan automáticamente en el contexto
      Alert.alert(
        '✅ Configuración Guardada',
        'Tu configuración de notificaciones ha sido guardada exitosamente',
        [
          {
            text: 'OK',
            onPress: () => setShowNotificationSettingsModal(false),
          },
        ]
      );
    } catch (error) {
      Alert.alert('❌ Error', 'No se pudo guardar la configuración. Inténtalo de nuevo.');
    }
  };

  const handleResetNotificationSettings = () => {
    Alert.alert(
      'Restaurar Valores por Defecto',
      '¿Estás seguro de que quieres restaurar la configuración de notificaciones a los valores por defecto?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Restaurar',
          style: 'destructive',
          onPress: async () => {
            await resetToDefaults();
            Alert.alert('✅ Restaurado', 'La configuración ha sido restaurada a los valores por defecto.');
          },
        },
      ]
    );
  };

  const handleMisCitas = () => {
    // El modal de "Mis Citas" quedó fuera de esta pantalla; redirigimos al calendario
    // para que el acceso desde Panel de Cliente vuelva a funcionar.
    router.push('/(tabs)/calendar' as never);
  };

  // const getFilteredAppointments = () => {
  //   const userAppointments = getUpcomingAppointments(user?.id || '');
    
  //   if (appointmentFilter === 'all') {
  //     return userAppointments;
  //   }
    
  //   return userAppointments.filter(appointment => appointment.status === appointmentFilter);
  // };

  // const getStatusColor = (status: string) => {
  //   switch (status) {
  //     case 'confirmed':
  //       return '#4CAF50';
  //     case 'pending':
  //       return '#FFC107';
  //     case 'cancelled':
  //       return '#F44336';
  //     default:
  //       return '#999';
  //     }
  // };

  // const getStatusText = (status: string) => {
  //   switch (status) {
  //     case 'confirmed':
  //       return 'Confirmado';
  //     case 'pending':
  //       return 'Pendiente';
  //     case 'cancelled':
  //       return 'Cancelado';
  //     default:
  //       return 'Desconocido';
  //     }
  // };

  // const handleCancelAppointment = (appointmentId: string) => {
  //   Alert.alert(
  //     'Cancelar Cita',
  //     '¿Estás seguro de que quieres cancelar esta cita?',
  //     [
  //       { text: 'No', style: 'cancel' },
  //       {
  //         text: 'Sí, Cancelar',
  //         style: 'destructive',
  //         onPress: () => {
  //           // Aquí implementarías la lógica para cancelar la cita
  //           Alert.alert('✅ Cita Cancelada', 'Tu cita ha sido cancelada exitosamente.');
  //         },
  //       },
  //     ]
  //   );
  // };

  const handleMisResenas = () => {
    setShowMyReviewsModal(true);
  };

  const handleAddReview = (appointment: any) => {
    setSelectedAppointment(appointment);
    setNewReview({ rating: 5, comment: '' });
    setShowAddReviewModal(true);
  };

  const handleSubmitReview = async () => {
    if (!selectedAppointment || !newReview.comment.trim()) {
      Alert.alert('Error', 'Por favor completa todos los campos obligatorios');
      return;
    }

    try {
      const success = await addReview({
        clientId: user?.id || '',
        clientName: user?.fullName || '',
        professionalId: selectedAppointment.professionalId,
        professionalName: selectedAppointment.professional,
        service: selectedAppointment.service,
        rating: newReview.rating,
        comment: newReview.comment.trim(),
        appointmentId: selectedAppointment.id,
        appointmentDate: selectedAppointment.date,
        isVerified: true,
      });

      if (success) {
        Alert.alert(
          '✅ Reseña Enviada',
          'Tu reseña ha sido enviada exitosamente. ¡Gracias por tu feedback!',
          [
            {
              text: 'OK',
              onPress: () => {
                setShowAddReviewModal(false);
                setSelectedAppointment(null);
                setNewReview({ rating: 5, comment: '' });
              },
            },
          ]
        );
      } else {
        throw new Error('Error al enviar reseña');
      }
    } catch (error) {
      Alert.alert('❌ Error', 'No se pudo enviar la reseña. Inténtalo de nuevo.');
    }
  };

  const handleDeleteReview = (reviewId: string) => {
    Alert.alert(
      'Eliminar Reseña',
      '¿Estás seguro de que quieres eliminar esta reseña?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            const success = await deleteReview(reviewId);
            if (success) {
              Alert.alert('✅ Reseña Eliminada', 'Tu reseña ha sido eliminada exitosamente.');
            } else {
              Alert.alert('❌ Error', 'No se pudo eliminar la reseña. Inténtalo de nuevo.');
            }
          },
        },
      ]
    );
  };

  const renderStars = (rating: number, size: number = 16) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Ionicons
        key={`star-${rating}-${index}`}
        name={index < rating ? "star" : "star-outline"}
        size={size}
        color={index < rating ? "#FFD700" : "#ccc"}
      />
    ));
  };

  // Funciones para Profesionales Favoritos
  const handleFavorites = () => {
    setShowFavoritesModal(true);
  };

  const handleAddFavorite = () => {
    setShowAddFavoriteModal(true);
  };

  const handleRemoveFavorite = (professionalId: string) => {
    Alert.alert(
      'Eliminar de Favoritos',
      '¿Estás seguro de que quieres eliminar este profesional de tus favoritos?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            setFavoriteProfessionals(prev => 
              prev.filter(prof => prof.id !== professionalId)
            );
            Alert.alert('✅ Eliminado', 'Profesional removido de favoritos');
          },
        },
      ]
    );
  };

  const handleBookAppointment = (professional: any) => {
    Alert.alert(
      'Reservar Cita',
      `¿Quieres reservar una cita con ${professional.name}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Reservar',
          onPress: () => {
            setShowFavoritesModal(false);
            // Aquí se podría abrir el modal de reserva de citas
            Alert.alert('📅 Reserva', 'Redirigiendo a reserva de citas...');
          },
        },
      ]
    );
  };

  const handleContactProfessional = (professional: any) => {
    Alert.alert(
      'Contactar Profesional',
      `¿Cómo quieres contactar a ${professional.name}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: '📞 Llamar',
          onPress: () => Alert.alert('Llamar', `Llamando a ${professional.contactInfo.phone}`),
        },
        {
          text: '📧 Email',
          onPress: () => Alert.alert('Email', `Enviando email a ${professional.contactInfo.email}`),
        },
        {
          text: '🌐 Sitio Web',
          onPress: () => Alert.alert('Sitio Web', `Abriendo ${professional.contactInfo.website}`),
        },
      ]
    );
  };

  const filteredFavoriteProfessionals = favoriteProfessionals.filter(professional => {
    const matchesSearch = professional.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         professional.service.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         professional.specialization.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'Todas' || professional.service === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ['Todas', 'Psicología Clínica', 'Psicología Infantil', 'Terapia de Pareja', 'Terapia Familiar', 'Psicología Adolescente'];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <Ionicons name="person" size={40} color="#667eea" />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.fullName}</Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
            <Text style={styles.profileType}>
              {user?.userType === 'client' ? 'Cliente' : 'Profesional'}
            </Text>
            {isProfessional && (
              <Text style={styles.profileService}>
                {user?.service || 'Servicio no especificado'}
              </Text>
            )}
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Cuenta</Text>
        
        <TouchableOpacity style={styles.menuItem} onPress={handleEditProfile}>
          <View style={styles.menuItemLeft}>
            <Ionicons name="person-outline" size={24} color="#667eea" />
            <Text style={styles.menuItemText}>Editar Perfil</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={handleNotifications}>
          <View style={styles.menuItemLeft}>
            <Ionicons name="notifications-outline" size={24} color="#667eea" />
            <Text style={styles.menuItemText}>Notificaciones</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>

        {isProfessional && (
          <TouchableOpacity style={styles.menuItem} onPress={handleTurnarioPro}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="diamond-outline" size={24} color="#667eea" />
              <View>
                <Text style={styles.menuItemText}>Turnario Pro</Text>
                <Text style={{ fontSize: 13, color: '#777', marginTop: 2 }}>Suscripción · Google Play</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
        )}

        {isProfessional && (
          <TouchableOpacity style={styles.menuItem} onPress={handleConfigureAvailability}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="calendar-outline" size={24} color="#667eea" />
              <Text style={styles.menuItemText}>Configurar Disponibilidad</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.menuItem} onPress={handlePrivacy}>
          <View style={styles.menuItemLeft}>
            <Ionicons name="shield-outline" size={24} color="#667eea" />
            <Text style={styles.menuItemText}>Privacidad y Seguridad</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Aplicación</Text>
        
        <TouchableOpacity style={styles.menuItem} onPress={handleHelp}>
          <View style={styles.menuItemLeft}>
            <Ionicons name="help-circle-outline" size={24} color="#667eea" />
            <Text style={styles.menuItemText}>Ayuda y Soporte</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={handleAbout}>
          <View style={styles.menuItemLeft}>
            <Ionicons name="information-circle-outline" size={24} color="#667eea" />
            <Text style={styles.menuItemText}>Acerca de</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>
      </View>

      {/* Menú específico para profesionales */}
      {isProfessional && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Panel Profesional</Text>
          
          <TouchableOpacity style={styles.menuItem} onPress={handleManageSchedule}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="calendar" size={24} color="#4CAF50" />
              <Text style={styles.menuItemText}>Gestionar Horarios</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem} onPress={handleNewAppointment}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="add-circle" size={24} color="#FF6B35" />
              <Text style={styles.menuItemText}>Nueva Cita</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem} onPress={handleManagePatients}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="people" size={24} color="#2196F3" />
              <Text style={styles.menuItemText}>Gestionar Pacientes</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => Alert.alert('Info', 'Función en desarrollo')}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="analytics" size={24} color="#FF9800" />
              <Text style={styles.menuItemText}>Reportes y Estadísticas</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem} onPress={handlePaymentSettings}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="card" size={24} color="#9C27B0" />
              <Text style={styles.menuItemText}>Configuración de Pagos</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem} onPress={handleManageClinic}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="business" size={24} color="#607D8B" />
              <Text style={styles.menuItemText}>Configuración de Consultorio</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handleMedicalAuthorizations}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="shield-checkmark" size={24} color="#E91E63" />
              <Text style={styles.menuItemText}>Autorizaciones Médicas</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
        </View>
      )}

      {/* Sección de Pagos y Señas para profesionales */}
      {isProfessional && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pagos y Señas</Text>

          <View style={[styles.menuItem, { alignItems: 'center' }]}>
            <View style={[styles.menuItemLeft, { flex: 1, alignItems: 'flex-start' }]}>
              <Ionicons name="wallet-outline" size={24} color="#FF9800" />
              <View style={{ flex: 1 }}>
                <Text style={styles.menuItemText}>Reservas online con seña</Text>
                <Text style={{ fontSize: 14, color: '#666', marginTop: 2 }}>
                  Si está activo, el cliente paga la seña en la app para confirmar.
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => setIsOnlineDepositEnabled((prev) => !prev)}
              style={{ paddingHorizontal: 4, paddingVertical: 4 }}
            >
              <Ionicons
                name={isOnlineDepositEnabled ? 'toggle' : 'toggle-outline'}
                size={38}
                color={isOnlineDepositEnabled ? '#4CAF50' : '#ccc'}
              />
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity style={styles.menuItem} onPress={handleDepositHistory}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="receipt" size={24} color="#FF9800" />
              <Text style={styles.menuItemText}>Historial de Señas</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem} onPress={handleServicePricing}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="pricetag" size={24} color="#4CAF50" />
              <Text style={styles.menuItemText}>Precios y Señas</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
        </View>
      )}

      {/* Menú específico para clientes */}
      {!isProfessional && (
        <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Panel de Cliente</Text>
        
        <TouchableOpacity style={styles.menuItem} onPress={handleMisCitas}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="calendar" size={24} color="#4CAF50" />
              <Text style={styles.menuItemText}>Mis Citas</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem} onPress={handleMisResenas}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="star" size={24} color="#FFD700" />
              <Text style={styles.menuItemText}>Mis Reseñas</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem} onPress={handleClientPaymentMethods}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="card" size={24} color="#9C27B0" />
              <Text style={styles.menuItemText}>Métodos de Pago</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem} onPress={handleBookAppointmentWithDeposit}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="calendar" size={24} color="#4CAF50" />
              <Text style={styles.menuItemText}>Reservar Cita con Seña</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem} onPress={handleFavorites}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="heart" size={24} color="#E91E63" />
              <Text style={styles.menuItemText}>Profesionales Favoritos</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.section}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="#ff6b6b" />
          <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Turnario v1.0.0</Text>
      </View>

      {/* Modal de Edición de Perfil */}
      <Modal
        visible={showEditProfileModal}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCancelEdit}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView 
            style={styles.modalContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Editar Perfil</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleCancelEdit}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Nombre Completo *</Text>
              <TextInput
                style={styles.textInput}
                value={editingProfile.fullName}
                onChangeText={(text) => setEditingProfile(prev => ({ ...prev, fullName: text }))}
                placeholder="Ingresa tu nombre completo"
                placeholderTextColor="#999"
                editable={!isEditing}
              />
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Email *</Text>
              <TextInput
                style={styles.textInput}
                value={editingProfile.email}
                onChangeText={(text) => setEditingProfile(prev => ({ ...prev, email: text }))}
                placeholder="tu@email.com"
                placeholderTextColor="#999"
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!isEditing}
              />
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Teléfono</Text>
              <TextInput
                style={styles.textInput}
                value={editingProfile.phone}
                onChangeText={(text) => setEditingProfile(prev => ({ ...prev, phone: text }))}
                placeholder="+54 9 11 1234-5678"
                placeholderTextColor="#999"
                keyboardType="phone-pad"
                editable={!isEditing}
              />
            </View>

            {isProfessional && (
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Servicio que Ofrece</Text>
                <TouchableOpacity
                  style={styles.serviceSelectorButton}
                  onPress={handleServiceSelection}
                  disabled={isEditing}
                >
                  <Text style={[
                    styles.serviceSelectorText,
                    !editingProfile.service && styles.serviceSelectorPlaceholder
                  ]}>
                    {editingProfile.service || 'Selecciona un servicio...'}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#667eea" />
                </TouchableOpacity>
                <Text style={styles.formNote}>
                  Selecciona el servicio principal que ofreces
                </Text>
              </View>
            )}

            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Tipo de Usuario</Text>
              <View style={styles.userTypeDisplay}>
                <Ionicons 
                  name={isProfessional ? "medical" : "person"} 
                  size={20} 
                  color="#667eea" 
                />
                <Text style={styles.userTypeText}>
                  {isProfessional ? 'Profesional' : 'Cliente'}
                </Text>
              </View>
              <Text style={styles.userTypeNote}>
                El tipo de usuario no se puede modificar
              </Text>
            </View>
          </ScrollView>

          <View style={[styles.modalActions, { paddingBottom: modalActionPaddingBottom }]}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={handleCancelEdit}
              disabled={isEditing}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.modalButton, styles.saveButton]}
              onPress={handleSaveProfile}
              disabled={isEditing}
            >
              {isEditing ? (
                <Text style={styles.saveButtonText}>Guardando...</Text>
              ) : (
                <Text style={styles.saveButtonText}>Guardar Cambios</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Modal de Configuración de Notificaciones */}
      <Modal
        visible={showNotificationSettingsModal}
        transparent={true}
        onRequestClose={() => setShowNotificationSettingsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Configuración de Notificaciones</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowNotificationSettingsModal(false)}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Tipos de Notificaciones</Text>
                <TouchableOpacity
                  style={styles.switchOption}
                  onPress={() => void toggleNotificationType('appointments')}
                >
                  <Text style={styles.switchText}>Citas y Recordatorios</Text>
                  <Ionicons
                    name={notificationsUiState.appointments ? "toggle" : "toggle-outline"}
                    size={24}
                    color={notificationsUiState.appointments ? "#4CAF50" : "#ccc"}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.switchOption}
                  onPress={() => void toggleNotificationType('messages')}
                >
                  <Text style={styles.switchText}>Mensajes</Text>
                  <Ionicons
                    name={notificationsUiState.messages ? "toggle" : "toggle-outline"}
                    size={24}
                    color={notificationsUiState.messages ? "#4CAF50" : "#ccc"}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.switchOption}
                  onPress={() => void toggleNotificationType('reviews')}
                >
                  <Text style={styles.switchText}>Reseñas y Calificaciones</Text>
                  <Ionicons
                    name={notificationsUiState.reviews ? "toggle" : "toggle-outline"}
                    size={24}
                    color={notificationsUiState.reviews ? "#4CAF50" : "#ccc"}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.switchOption}
                  onPress={() => void toggleNotificationType('promotions')}
                >
                  <Text style={styles.switchText}>Promociones y Ofertas</Text>
                  <Ionicons
                    name={notificationsUiState.promotions ? "toggle" : "toggle-outline"}
                    size={24}
                    color={notificationsUiState.promotions ? "#4CAF50" : "#ccc"}
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Configuración de Sonido</Text>
                <TouchableOpacity
                  style={styles.switchOption}
                  onPress={() => void toggleNotificationType('sound')}
                >
                  <Text style={styles.switchText}>Sonido de Notificaciones</Text>
                  <Ionicons
                    name={notificationsUiState.sound ? "toggle" : "toggle-outline"}
                    size={24}
                    color={notificationsUiState.sound ? "#4CAF50" : "#ccc"}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.switchOption}
                  onPress={() => void toggleNotificationType('vibration')}
                >
                  <Text style={styles.switchText}>Vibración</Text>
                  <Ionicons
                    name={notificationsUiState.vibration ? "toggle" : "toggle-outline"}
                    size={24}
                    color={notificationsUiState.vibration ? "#4CAF50" : "#ccc"}
                  />
                </TouchableOpacity>
              </View>
            </ScrollView>

            <View
              style={[
                styles.privacyModalActions,
                { paddingBottom: modalActionPaddingBottom },
              ]}
            >
              <View style={styles.privacyPrimaryActions}>
                <TouchableOpacity
                  style={[styles.privacyActionButton, styles.cancelButton]}
                  onPress={() => setShowNotificationSettingsModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.privacyActionButton, styles.saveButton]}
                  onPress={handleSaveNotificationSettings}
                >
                  <Text style={styles.saveButtonText}>Guardar</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={[styles.privacyResetButton, styles.resetButton]}
                onPress={handleResetNotificationSettings}
              >
                <Text style={styles.resetButtonText}>Restablecer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Selector de Servicios */}
      <Modal
        visible={showServiceSelector}
        transparent={false}
        onRequestClose={() => setShowServiceSelector(false)}
        animationType="slide"
        presentationStyle="pageSheet"
        onShow={() => console.log('🎬 Modal de servicios visible:', showServiceSelector)}
      >
                <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {serviceSelectionMode === 'profile' ? 'Seleccionar Servicio para Perfil' : 'Seleccionar Servicio para Cita'}
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowServiceSelector(false)}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>

            <View style={styles.searchContainer}>
              <View style={styles.searchInputContainer}>
                <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Buscar servicios..."
                  value={serviceSearchQuery}
                  onChangeText={setServiceSearchQuery}
                  placeholderTextColor="#999"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="search"
                />
                {serviceSearchQuery.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setServiceSearchQuery('')}
                    style={styles.clearButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="close-circle" size={20} color="#999" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={styles.categoryContainer}>
              <Text style={styles.categoryTitle}>Categorías</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                contentContainerStyle={styles.categoryScrollContainer}
                keyboardShouldPersistTaps="handled"
              >
                {getServiceCategories().map((category) => (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.categoryButton,
                      selectedServiceCategory === category && styles.categoryButtonActive
                    ]}
                    onPress={() => setSelectedServiceCategory(category)}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.categoryButtonText,
                      selectedServiceCategory === category && styles.categoryButtonTextActive
                    ]}>
                      {category}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.servicesContainer}>
              <Text style={styles.servicesTitle}>
                Servicios Disponibles ({getFilteredServices().length})
              </Text>
              <ScrollView 
                style={styles.servicesList} 
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.servicesListContent}
              >
                {getFilteredServices().length > 0 ? (
                  getFilteredServices().map((service, index) => (
                    <TouchableOpacity
                      key={`${service}-${index}`}
                      style={styles.serviceItem}
                      onPress={() => handleServiceSelect(service)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.serviceItemContent}>
                        <Ionicons name="checkmark-circle-outline" size={20} color="#667eea" style={styles.serviceIcon} />
                        <Text style={styles.serviceItemText}>{service}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color="#ccc" />
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={styles.noServicesContainer}>
                    <Ionicons name="search-outline" size={48} color="#ccc" />
                    <Text style={styles.noServicesText}>
                      No se encontraron servicios
                    </Text>
                    <Text style={styles.noServicesSubtext}>
                      Intenta con otra búsqueda o categoría
                    </Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Modal de Nueva Cita */}
      <Modal
        visible={showNewAppointmentModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <KeyboardAvoidingView 
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Crear Nueva Cita</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => {
                setShowNewAppointmentModal(false);
                resetNewAppointmentForm();
              }}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Servicio *</Text>
              <View style={[styles.serviceSelectorButton, styles.serviceSelectorButtonDisabled]}>
                <Text style={[
                  styles.serviceSelectorText,
                  !newProfessionalAppointment.service && styles.serviceSelectorPlaceholder
                ]}>
                  {newProfessionalAppointment.service || 'Servicio no configurado'}
                </Text>
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
              </View>
            </View>

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

            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Fecha *</Text>
              <TouchableOpacity
                style={styles.dateSelectorButton}
                onPress={() => setShowDatePickerModal(true)}
              >
                <Text style={[
                  styles.dateSelectorText,
                  !newProfessionalAppointment.date && styles.dateSelectorPlaceholder
                ]}>
                  {newProfessionalAppointment.date || 'Seleccionar fecha disponible...'}
                </Text>
                <Ionicons name="calendar" size={20} color="#667eea" />
              </TouchableOpacity>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Hora *</Text>
              <TouchableOpacity
                style={[
                  styles.timeSelectorButton,
                  !newProfessionalAppointment.date && styles.timeSelectorButtonDisabled
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
                <Ionicons 
                  name="time" 
                  size={20} 
                  color={newProfessionalAppointment.date ? "#667eea" : "#ccc"} 
                />
              </TouchableOpacity>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Notas</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={newProfessionalAppointment.notes}
                onChangeText={(text) => setNewProfessionalAppointment(prev => ({ ...prev, notes: text }))}
                placeholder="Notas adicionales..."
                placeholderTextColor="#999"
                multiline
                numberOfLines={3}
              />
            </View>
          </ScrollView>

          <View
            style={[
              styles.modalActions,
              { paddingBottom: modalActionPaddingBottom },
            ]}
          >
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => {
                setShowNewAppointmentModal(false);
                resetNewAppointmentForm();
              }}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.modalButton, styles.saveButton]}
              onPress={() => {
                // Validar que todos los campos estén completos
                if (!newProfessionalAppointment.patientName || !newProfessionalAppointment.date || !newProfessionalAppointment.time) {
                  Alert.alert('Error', 'Por favor completa todos los campos obligatorios antes de crear la cita.');
                  return;
                }
                
                // Crear la cita y enviar notificación al cliente
                handleCreateAppointmentAndNotifyClient();
              }}
              disabled={isCreatingAppointment}
            >
              {isCreatingAppointment ? (
                <Text style={styles.saveButtonText}>Creando...</Text>
              ) : (
                <Text style={styles.saveButtonText}>Crear Cita y Notificar Cliente</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal de Pago de Seña */}
      <Modal
        visible={showPaymentModal}
        transparent={true}
        onRequestClose={() => setShowPaymentModal(false)}
        animationType="slide"
      >
        <View style={styles.calendarModalOverlay}>
          <View style={styles.calendarModalContent}>
            <View style={styles.calendarHeader}>
              <Text style={styles.calendarTitle}>Pago de Seña</Text>
              <TouchableOpacity
                style={styles.calendarNavButton}
                onPress={() => setShowPaymentModal(false)}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.paymentSummary}>
              <Text style={styles.paymentSummaryTitle}>Resumen de Cita</Text>
              <View style={styles.paymentSummaryRow}>
                <Text style={styles.paymentSummaryLabel}>Servicio:</Text>
                <Text style={styles.paymentSummaryValue}>{newProfessionalAppointment.service}</Text>
              </View>
              <View style={styles.paymentSummaryRow}>
                <Text style={styles.paymentSummaryLabel}>Fecha:</Text>
                <Text style={styles.paymentSummaryValue}>{newProfessionalAppointment.date}</Text>
              </View>
              <View style={styles.paymentSummaryRow}>
                <Text style={styles.paymentSummaryLabel}>Hora:</Text>
                <Text style={styles.paymentSummaryValue}>{newProfessionalAppointment.time}</Text>
              </View>
              <View style={styles.paymentSummaryRow}>
                <Text style={styles.paymentSummaryLabel}>Paciente:</Text>
                <Text style={styles.paymentSummaryValue}>{newProfessionalAppointment.patientName}</Text>
              </View>
            </View>

            <View style={styles.depositSection}>
              <Text style={styles.depositTitle}>Monto de Seña</Text>
              <Text style={styles.depositAmount}>${paymentAmount}</Text>
              <Text style={styles.depositNote}>* 20% del valor total del servicio</Text>
            </View>

            <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
              <View style={styles.paymentForm}>
                <View style={styles.formSection}>
                  <Text style={styles.formLabel}>Número de Tarjeta *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={paymentData.cardNumber}
                    onChangeText={(text) => setPaymentData(prev => ({ ...prev, cardNumber: text }))}
                    placeholder="1234 5678 9012 3456"
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                    maxLength={19}
                  />
                </View>

                <View style={styles.formSection}>
                  <Text style={styles.formLabel}>Titular de la Tarjeta *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={paymentData.cardHolder}
                    onChangeText={(text) => setPaymentData(prev => ({ ...prev, cardHolder: text }))}
                    placeholder="NOMBRE APELLIDO"
                    placeholderTextColor="#999"
                    autoCapitalize="characters"
                  />
                </View>

                <View style={styles.paymentRow}>
                  <View style={[styles.formSection, { flex: 1, marginRight: 10 }]}>
                    <Text style={styles.formLabel}>Vencimiento *</Text>
                    <TextInput
                      style={styles.textInput}
                      value={paymentData.expiryDate}
                      onChangeText={(text) => setPaymentData(prev => ({ ...prev, expiryDate: text }))}
                      placeholder="MM/AA"
                      placeholderTextColor="#999"
                      keyboardType="numeric"
                      maxLength={5}
                    />
                  </View>

                  <View style={[styles.formSection, { flex: 1, marginLeft: 10 }]}>
                    <Text style={styles.formLabel}>CVV *</Text>
                    <TextInput
                      style={styles.textInput}
                      value={paymentData.cvv}
                      onChangeText={(text) => setPaymentData(prev => ({ ...prev, cvv: text }))}
                      placeholder="123"
                      placeholderTextColor="#999"
                      keyboardType="numeric"
                      maxLength={4}
                    />
                  </View>
                </View>
              </View>
            </ScrollView>

            <View style={styles.paymentActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowPaymentModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handlePaymentSubmit}
                disabled={isProcessingPayment}
              >
                {isProcessingPayment ? (
                  <Text style={styles.saveButtonText}>Procesando...</Text>
                ) : (
                  <Text style={styles.saveButtonText}>Pagar Seña ${paymentAmount}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Configuración de Precios y Señas */}
      <Modal
        visible={showPricingModal}
        transparent={true}
        onRequestClose={() => setShowPricingModal(false)}
        animationType="slide"
      >
        <View style={styles.calendarModalOverlay}>
          <View style={styles.calendarModalContent}>
            <View style={styles.calendarHeader}>
              <Text style={styles.calendarTitle}>Configurar Precios y Señas</Text>
              <TouchableOpacity
                style={styles.calendarNavButton}
                onPress={() => setShowPricingModal(false)}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
              <View style={styles.pricingForm}>
                <View style={styles.formSection}>
                  <Text style={styles.formLabel}>Precio Base del Servicio</Text>
                  <TextInput
                    style={styles.textInput}
                    value={servicePricing.basePrice.toString()}
                    onChangeText={(text) => {
                      const price = parseInt(text) || 0;
                      setServicePricing(prev => ({
                        ...prev,
                        basePrice: price,
                        depositAmount: Math.round(price * (prev.depositPercentage / 100))
                      }));
                    }}
                    placeholder="10000"
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                  />
                  <Text style={styles.formNote}>Precio en pesos argentinos</Text>
                </View>

                <View style={styles.formSection}>
                  <Text style={styles.formLabel}>Porcentaje de Seña</Text>
                  <TextInput
                    style={styles.textInput}
                    value={servicePricing.depositPercentage.toString()}
                    onChangeText={(text) => {
                      const percentage = parseInt(text) || 0;
                      setServicePricing(prev => ({
                        ...prev,
                        depositPercentage: percentage,
                        depositAmount: Math.round(prev.basePrice * (percentage / 100))
                      }));
                    }}
                    placeholder="20"
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                    maxLength={2}
                  />
                  <Text style={styles.formNote}>Porcentaje mínimo requerido para confirmar cita</Text>
                </View>

                <View style={styles.depositPreview}>
                  <Text style={styles.depositPreviewTitle}>Vista Previa de Seña</Text>
                  <View style={styles.depositPreviewRow}>
                    <Text style={styles.depositPreviewLabel}>Precio del Servicio:</Text>
                    <Text style={styles.depositPreviewValue}>${servicePricing.basePrice}</Text>
                  </View>
                  <View style={styles.depositPreviewRow}>
                    <Text style={styles.depositPreviewLabel}>Porcentaje de Seña:</Text>
                    <Text style={styles.depositPreviewValue}>{servicePricing.depositPercentage}%</Text>
                  </View>
                  <View style={styles.depositPreviewRow}>
                    <Text style={styles.depositPreviewLabel}>Monto de Seña:</Text>
                    <Text style={styles.depositPreviewAmount}>${servicePricing.depositAmount}</Text>
                  </View>
                </View>
              </View>
            </ScrollView>

            <View style={styles.pricingActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowPricingModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={() => {
                  Alert.alert('✅ Configuración Guardada', 'Los precios y señas han sido configurados exitosamente.');
                  setShowPricingModal(false);
                }}
              >
                <Text style={styles.saveButtonText}>Guardar Configuración</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Reserva de Cita para Clientes */}
      <Modal
        visible={showClientBookingModal}
        transparent={true}
        onRequestClose={() => setShowClientBookingModal(false)}
        animationType="slide"
      >
        <View style={styles.calendarModalOverlay}>
          <View style={styles.calendarModalContent}>
            <View style={styles.calendarHeader}>
              <Text style={styles.calendarTitle}>Reservar Cita con Seña</Text>
              <TouchableOpacity
                style={styles.calendarNavButton}
                onPress={() => setShowClientBookingModal(false)}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
              <View style={styles.clientBookingForm}>
                <View style={styles.formSection}>
                  <Text style={styles.formLabel}>Servicio *</Text>
                  <TouchableOpacity
                    style={[styles.textInput, styles.selectorButton]}
                    onPress={() => setShowClientServiceSelector(true)}
                  >
                    <Text style={clientBookingData.service ? styles.selectorText : styles.selectorPlaceholder}>
                      {clientBookingData.service || 'Selecciona un servicio...'}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color="#666" />
                  </TouchableOpacity>
                </View>

                <View style={styles.formSection}>
                  <Text style={styles.formLabel}>Profesional *</Text>
                  <TouchableOpacity
                    style={[styles.textInput, styles.selectorButton]}
                    onPress={() => setShowProfessionalSelector(true)}
                    disabled={!clientBookingData.service}
                  >
                    <Text style={clientBookingData.professionalName ? styles.selectorText : styles.selectorPlaceholder}>
                      {clientBookingData.professionalName || (clientBookingData.service ? 'Selecciona un profesional...' : 'Primero selecciona un servicio')}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color="#666" />
                  </TouchableOpacity>
                </View>

                <View style={styles.formSection}>
                  <Text style={styles.formLabel}>Fecha *</Text>
                  <TouchableOpacity
                    style={[styles.textInput, styles.selectorButton]}
                    onPress={() => {
                      if (!clientBookingData.professionalName) {
                        Alert.alert('Error', 'Primero debes seleccionar un profesional para ver su disponibilidad.');
                        return;
                      }
                      setShowClientDatePickerModal(true);
                    }}
                    disabled={!clientBookingData.professionalName}
                  >
                    <Text style={clientBookingData.date ? styles.selectorText : styles.selectorPlaceholder}>
                      {clientBookingData.date || (clientBookingData.professionalName ? 'Selecciona una fecha...' : 'Primero selecciona un profesional')}
                    </Text>
                    <Ionicons name="calendar" size={20} color="#666" />
                  </TouchableOpacity>
                </View>

                <View style={styles.formSection}>
                  <Text style={styles.formLabel}>Hora *</Text>
                  <TouchableOpacity
                    style={[styles.textInput, styles.selectorButton]}
                    onPress={() => {
                      if (!clientBookingData.date) {
                        Alert.alert('Error', 'Primero debes seleccionar una fecha para ver los horarios disponibles.');
                        return;
                      }
                      
                      setShowClientTimePickerModal(true);
                    }}
                    disabled={!clientBookingData.date}
                  >
                    <Text style={clientBookingData.time ? styles.selectorText : styles.selectorPlaceholder}>
                      {clientBookingData.time || (clientBookingData.date ? 'Selecciona un horario...' : 'Primero selecciona una fecha')}
                    </Text>
                    <Ionicons name="time" size={20} color="#666" />
                  </TouchableOpacity>
                  {clientBookingData.date && (
                    <Text style={styles.availableSlotsInfo}>
                      {clientAvailableTimeSlots.length > 0 
                        ? `${clientAvailableTimeSlots.length} horarios disponibles`
                        : 'No hay horarios disponibles para esta fecha'
                      }
                    </Text>
                  )}
                  
                  {/* Debug Info - Solo para desarrollo */}
                  <Text style={styles.debugInfo}>
                    Debug: {clientAvailableTimeSlots.length} slots | 
                    Prof: {clientBookingData.professionalName ? 'Sí' : 'No'} | 
                    Fecha: {clientBookingData.date ? 'Sí' : 'No'}
                  </Text>
                  
                  {/* Debug adicional */}
                  <Text style={styles.debugInfo}>
                    Estado: {JSON.stringify(clientAvailableTimeSlots)}
                  </Text>
                </View>

                <View style={styles.formSection}>
                  <Text style={styles.formLabel}>Notas Adicionales</Text>
                  <TextInput
                    style={[styles.textInput, styles.textArea]}
                    value={clientBookingData.notes}
                    onChangeText={(text) => setClientBookingData(prev => ({ ...prev, notes: text }))}
                    placeholder="Información adicional..."
                    placeholderTextColor="#999"
                    multiline
                    numberOfLines={3}
                  />
                </View>

                <View style={styles.depositInfo}>
                  <Text style={styles.depositInfoTitle}>
                    {isOnlineDepositEnabled ? 'Información de Seña' : 'Confirmación Manual'}
                  </Text>
                  <View style={styles.depositInfoRow}>
                    <Text style={styles.depositInfoLabel}>Precio del Servicio:</Text>
                    <Text style={styles.depositInfoValue}>$10,000</Text>
                  </View>
                  <View style={styles.depositInfoRow}>
                    <Text style={styles.depositInfoLabel}>
                      {isOnlineDepositEnabled ? 'Seña Requerida (20%):' : 'Estado de la Reserva:'}
                    </Text>
                    <Text style={styles.depositInfoAmount}>
                      {isOnlineDepositEnabled ? '$2,000' : 'Solicitud pendiente'}
                    </Text>
                  </View>
                  <Text style={styles.depositInfoNote}>
                    {isOnlineDepositEnabled
                      ? '* La seña confirma tu reserva y se descuenta del precio total'
                      : '* Sin pago online: el profesional debe aprobar la solicitud desde notificaciones'}
                  </Text>
                </View>
              </View>
            </ScrollView>

            <View style={styles.clientBookingActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowClientBookingModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={() => {
                  // MODO PRUEBA: Quitar validación de hora para pruebas
                  if (!clientBookingData.professionalName || !clientBookingData.service || !clientBookingData.date) {
                    Alert.alert(
                      'Error',
                      `Por favor completa los campos obligatorios (Profesional, Servicio y Fecha) antes de ${isOnlineDepositEnabled ? 'proceder al pago' : 'enviar la solicitud'}.`
                    );
                    return;
                  }

                  if (!isOnlineDepositEnabled) {
                    handleSubmitClientBookingRequest();
                    return;
                  }

                  // Configurar datos para el pago
                  setPaymentAmount(2000); // Seña del 20%

                  // Configurar resumen del pago para Mercado Pago
                  setPaymentSummary({
                    service: clientBookingData.service,
                    professional: clientBookingData.professionalName,
                    date: clientBookingData.date,
                    time: clientBookingData.time || 'Por definir',
                    amount: 10000, // Precio total del servicio
                    depositAmount: 2000, // Seña del 20%
                    depositPercentage: 20,
                  });

                  // Cerrar modal de reserva y abrir modal de Mercado Pago
                  setShowClientBookingModal(false);
                  handleMercadoPagoPayment();
                }}
              >
                <Text style={styles.saveButtonText}>
                  {isOnlineDepositEnabled ? 'Proceder al Pago de Seña' : 'Enviar Solicitud de Reserva'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Selección de Servicio para Cliente */}
      <Modal
        visible={showClientServiceSelector}
        transparent={true}
        onRequestClose={() => setShowClientServiceSelector(false)}
        animationType="slide"
      >
        <View style={styles.calendarModalOverlay}>
          <View style={styles.calendarModalContent}>
            <View style={styles.calendarHeader}>
              <Text style={styles.calendarTitle}>Seleccionar Servicio</Text>
              <TouchableOpacity
                style={styles.calendarNavButton}
                onPress={() => setShowClientServiceSelector(false)}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
              <View style={styles.serviceList}>
                {availableServices.map((service, index) => (
                  <TouchableOpacity
                    key={`service-${service}-${index}`}
                    style={styles.serviceItem}
                    onPress={() => handleClientServiceSelection(service)}
                  >
                    <Text style={styles.serviceItemText}>{service}</Text>
                    <Ionicons name="chevron-forward" size={20} color="#ccc" />
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal de Ayuda y Soporte */}
      <Modal
        visible={showHelpSupportModal}
        transparent={true}
        onRequestClose={() => setShowHelpSupportModal(false)}
        animationType="slide"
      >
        <View style={styles.calendarModalOverlay}>
          <View style={styles.calendarModalContent}>
            <View style={styles.calendarHeader}>
              <Text style={styles.calendarTitle}>Ayuda y Soporte</Text>
              <TouchableOpacity
                style={styles.calendarNavButton}
                onPress={() => setShowHelpSupportModal(false)}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              <View style={styles.serviceList}>
                <View style={{ paddingHorizontal: 4, paddingBottom: 8 }}>
                  <Text style={{ fontSize: 13, color: '#666' }}>
                    Email: {supportEmail}
                  </Text>
                  <Text style={{ fontSize: 13, color: '#666', marginTop: 2 }}>
                    Teléfono: {supportPhone || 'No configurado'}
                  </Text>
                </View>

                <TouchableOpacity style={styles.serviceItem} onPress={handleSupportByEmail}>
                  <Text style={styles.serviceItemText}>Contactar por Email</Text>
                  <Ionicons name="mail-outline" size={20} color="#667eea" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.serviceItem} onPress={handleSupportByWhatsApp}>
                  <Text style={styles.serviceItemText}>Contactar por WhatsApp</Text>
                  <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.serviceItem} onPress={handleSupportByPhone}>
                  <Text style={styles.serviceItemText}>Llamar a Soporte</Text>
                  <Ionicons name="call-outline" size={20} color="#4CAF50" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.serviceItem} onPress={handleHelpFaq}>
                  <Text style={styles.serviceItemText}>Ver Preguntas Frecuentes</Text>
                  <Ionicons name="help-circle-outline" size={20} color="#FF9800" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.serviceItem}
                  onPress={() => {
                    setShowHelpSupportModal(false);
                    router.push('/terms-and-conditions' as never);
                  }}
                >
                  <Text style={styles.serviceItemText}>Términos y Condiciones</Text>
                  <Ionicons name="document-text-outline" size={20} color="#607D8B" />
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal de Selección de Profesional para Cliente */}
      <Modal
        visible={showProfessionalSelector}
        transparent={true}
        onRequestClose={() => setShowProfessionalSelector(false)}
        animationType="slide"
      >
        <View style={styles.calendarModalOverlay}>
          <View style={styles.calendarModalContent}>
            <View style={styles.calendarHeader}>
              <Text style={styles.calendarTitle}>Seleccionar Profesional</Text>
              <TouchableOpacity
                style={styles.calendarNavButton}
                onPress={() => setShowProfessionalSelector(false)}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
              <View style={styles.professionalList}>
                {filteredProfessionals.length > 0 ? (
                  filteredProfessionals.map((professional) => (
                    <TouchableOpacity
                      key={professional.id}
                      style={styles.professionalItem}
                      onPress={() => handleProfessionalSelection(professional)}
                    >
                      <View style={styles.professionalInfo}>
                        <Text style={styles.professionalName}>{professional.name}</Text>
                        <Text style={styles.professionalService}>{professional.service}</Text>
                        <View style={styles.professionalDetails}>
                          <Text style={styles.professionalRating}>⭐ {professional.rating}</Text>
                          <Text style={styles.professionalPrice}>${professional.price}</Text>
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color="#ccc" />
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={styles.noProfessionals}>
                    <Text style={styles.noProfessionalsText}>No hay profesionales disponibles para este servicio</Text>
                  </View>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal del Calendario para Cliente */}
      <Modal
        visible={showClientDatePickerModal}
        transparent={true}
        onRequestClose={() => setShowClientDatePickerModal(false)}
        animationType="slide"
      >
        <View style={styles.calendarModalOverlay}>
          <View style={styles.calendarModalContent}>
            <View style={styles.calendarHeader}>
              <Text style={styles.calendarTitle}>Seleccionar Fecha</Text>
              <TouchableOpacity
                style={styles.calendarNavButton}
                onPress={() => setShowClientDatePickerModal(false)}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.calendarNavigation}>
              <TouchableOpacity
                style={styles.calendarNavButton}
                onPress={() => navigateClientMonth('prev')}
              >
                <Ionicons name="chevron-back" size={24} color="#666" />
              </TouchableOpacity>
              
              <Text style={styles.calendarMonthText}>
                {clientCurrentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
              </Text>
              
              <TouchableOpacity
                style={styles.calendarNavButton}
                onPress={() => navigateClientMonth('next')}
              >
                <Ionicons name="chevron-forward" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.calendarGrid}>
              {/* Días de la semana */}
              <View style={styles.calendarWeekDays}>
                {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((day, index) => (
                  <Text key={`weekday-${day}-${index}`} style={styles.calendarWeekDay}>{day}</Text>
                ))}
              </View>
              
              {/* Días del mes */}
              <View style={styles.calendarDays}>
                {getClientDaysInMonth(clientCurrentMonth, getSelectedProfessionalId()).map((dayData, index) => (
                  <TouchableOpacity
                    key={`day-${dayData.day}-${index}`}
                    style={[
                      styles.calendarDay,
                      !dayData.isCurrentMonth && styles.calendarDayOtherMonth,
                      dayData.isAvailable && styles.calendarDayAvailable,
                      !dayData.isAvailable && dayData.isCurrentMonth && styles.calendarDayUnavailable,
                      clientSelectedDateIso &&
                        toYmdLocal(new Date(clientCurrentMonth.getFullYear(), clientCurrentMonth.getMonth(), dayData.day)) === clientSelectedDateIso &&
                        styles.calendarDaySelected
                    ]}
                    onPress={() => handleClientDateSelection(dayData.day, dayData.isAvailable)}
                    disabled={!dayData.isAvailable}
                  >
                    <Text style={[
                      styles.calendarDayText,
                      !dayData.isCurrentMonth && styles.calendarDayTextOtherMonth,
                      dayData.isAvailable && styles.calendarDayTextAvailable,
                      !dayData.isAvailable && dayData.isCurrentMonth && styles.calendarDayTextUnavailable,
                      clientSelectedDateIso &&
                        toYmdLocal(new Date(clientCurrentMonth.getFullYear(), clientCurrentMonth.getMonth(), dayData.day)) === clientSelectedDateIso &&
                        styles.calendarDayTextSelected
                    ]}>
                      {dayData.day}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            <View style={styles.calendarLegend}>
              <View style={styles.calendarLegendItem}>
                <View style={[styles.calendarLegendDot, styles.calendarLegendAvailable]} />
                <Text style={styles.calendarLegendText}>Disponible</Text>
              </View>
              <View style={styles.calendarLegendItem}>
                <View style={[styles.calendarLegendDot, styles.calendarLegendUnavailable]} />
                <Text style={styles.calendarLegendText}>No disponible</Text>
              </View>
              <View style={styles.calendarLegendItem}>
                <View style={[styles.calendarLegendDot, styles.calendarLegendSelected]} />
                <Text style={styles.calendarLegendText}>Seleccionado</Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Selección de Horarios para Cliente */}
      <Modal
        visible={showClientTimePickerModal}
        transparent={true}
        onRequestClose={() => setShowClientTimePickerModal(false)}
        animationType="slide"
      >
        <View style={styles.calendarModalOverlay}>
          <View style={styles.calendarModalContent}>
            <View style={styles.calendarHeader}>
              <Text style={styles.calendarTitle}>Seleccionar Horario</Text>
              <TouchableOpacity
                style={styles.calendarNavButton}
                onPress={() => setShowClientTimePickerModal(false)}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.timeSelectionInfo}>
              <Text style={styles.timeSelectionDate}>
                {clientBookingData.date}
              </Text>
              <Text style={styles.timeSelectionProfessional}>
                {clientBookingData.professionalName}
              </Text>
              <Text style={styles.timeSelectionService}>
                {clientBookingData.service}
              </Text>
            </View>
            
            <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
              {/* Debug Info en el modal */}
              <View style={styles.debugInfo}>
                <Text style={styles.debugInfo}>
                  Modal Debug: {clientAvailableTimeSlots.length} horarios | 
                  Array: {JSON.stringify(clientAvailableTimeSlots)}
                </Text>
              </View>
              
              <View style={styles.timeSlotsContainer}>
                {clientAvailableTimeSlots.length > 0 ? (
                  clientAvailableTimeSlots.map((timeSlot, index) => (
                    <TouchableOpacity
                      key={`timeslot-${timeSlot}-${index}`}
                      style={styles.timeSlotItem}
                      onPress={() => handleClientTimeSelection(timeSlot)}
                    >
                      <Text style={styles.timeSlotText}>{timeSlot}</Text>
                      <Ionicons name="chevron-forward" size={20} color="#ccc" />
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={styles.noTimeSlots}>
                    <Text style={styles.noTimeSlotsText}>No hay horarios disponibles para esta fecha</Text>
                    <Text style={styles.noTimeSlotsSubtext}>Intenta seleccionar otra fecha</Text>
                    <Text style={styles.debugInfo}>
                      Debug: clientAvailableTimeSlots está vacío
                    </Text>
                  </View>
                )}
              </View>
            </ScrollView>
            
            <View style={styles.timeSelectionActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowClientTimePickerModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Mercado Pago */}
      <Modal
        visible={showMercadoPagoModal}
        transparent={true}
        onRequestClose={() => setShowMercadoPagoModal(false)}
        animationType="slide"
      >
        <View style={styles.calendarModalOverlay}>
          <View style={styles.calendarModalContent}>
            <View style={styles.calendarHeader}>
              <Text style={styles.calendarTitle}>💳 Mercado Pago</Text>
              <TouchableOpacity
                style={styles.calendarNavButton}
                onPress={() => setShowMercadoPagoModal(false)}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.paymentSummaryContainer}>
              <Text style={styles.paymentSummaryTitle}>Resumen del Pago</Text>
              
              <View style={styles.paymentSummaryRow}>
                <Text style={styles.paymentSummaryLabel}>Servicio:</Text>
                <Text style={styles.paymentSummaryValue}>{newProfessionalAppointment.service}</Text>
              </View>
              
              <View style={styles.paymentSummaryRow}>
                <Text style={styles.paymentSummaryLabel}>Profesional:</Text>
                <Text style={styles.paymentSummaryValue}>{user?.fullName}</Text>
              </View>
              
              <View style={styles.paymentSummaryRow}>
                <Text style={styles.paymentSummaryLabel}>Fecha:</Text>
                <Text style={styles.paymentSummaryValue}>{newProfessionalAppointment.date}</Text>
              </View>
              
              <View style={styles.paymentSummaryRow}>
                <Text style={styles.paymentSummaryLabel}>Hora:</Text>
                <Text style={styles.paymentSummaryValue}>{newProfessionalAppointment.time}</Text>
              </View>
              
              <View style={styles.paymentSummaryRow}>
                <Text style={styles.paymentSummaryLabel}>Monto Total:</Text>
                <Text style={styles.paymentSummaryValue}>${paymentAmount}</Text>
              </View>
              
              <View style={styles.paymentSummaryRow}>
                <Text style={styles.paymentSummaryLabel}>Seña (20%):</Text>
                <Text style={styles.paymentSummaryValue}>${paymentAmount}</Text>
              </View>
            </View>
            
            <View style={styles.mercadoPagoActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.mercadoPagoButton]}
                onPress={openMercadoPago}
                disabled={!mercadoPagoPreference}
              >
                <Text style={styles.mercadoPagoButtonText}>
                  {mercadoPagoPreference ? 'Pagar con Mercado Pago' : 'Procesando...'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowMercadoPagoModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Notificación de Pago (cuando el cliente hace clic en la notificación) */}
      <Modal
        visible={showPaymentNotificationModal}
        transparent={true}
        onRequestClose={() => setShowPaymentNotificationModal(false)}
        animationType="slide"
      >
        <View style={styles.calendarModalOverlay}>
          <View style={styles.calendarModalContent}>
            <View style={styles.calendarHeader}>
              <Text style={styles.calendarTitle}>Pago de Seña Requerido</Text>
              <TouchableOpacity
                style={styles.calendarNavButton}
                onPress={() => setShowPaymentNotificationModal(false)}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            {pendingPaymentAppointment && (
              <>
                <View style={styles.paymentSummaryContainer}>
                  <Text style={styles.paymentSummaryTitle}>Detalles de la Cita</Text>
                  
                  <View style={styles.paymentSummaryRow}>
                    <Text style={styles.paymentSummaryLabel}>Servicio:</Text>
                    <Text style={styles.paymentSummaryValue}>{pendingPaymentAppointment.service}</Text>
                  </View>
                  
                  <View style={styles.paymentSummaryRow}>
                    <Text style={styles.paymentSummaryLabel}>Profesional:</Text>
                    <Text style={styles.paymentSummaryValue}>{pendingPaymentAppointment.professional}</Text>
                  </View>
                  
                  <View style={styles.paymentSummaryRow}>
                    <Text style={styles.paymentSummaryLabel}>Fecha:</Text>
                    <Text style={styles.paymentSummaryValue}>{pendingPaymentAppointment.date}</Text>
                  </View>
                  
                  <View style={styles.paymentSummaryRow}>
                    <Text style={styles.paymentSummaryLabel}>Hora:</Text>
                    <Text style={styles.paymentSummaryValue}>{pendingPaymentAppointment.time}</Text>
                  </View>
                  
                  <View style={styles.paymentSummaryRow}>
                    <Text style={styles.paymentSummaryLabel}>Monto Total:</Text>
                    <Text style={styles.paymentSummaryValue}>${pendingPaymentAppointment.totalAmount}</Text>
                  </View>
                  
                  <View style={styles.paymentSummaryRow}>
                    <Text style={styles.paymentSummaryLabel}>Seña Requerida (20%):</Text>
                    <Text style={styles.paymentSummaryValue}>${pendingPaymentAppointment.depositAmount}</Text>
                  </View>
                </View>
                
                <View style={styles.mercadoPagoActions}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.mercadoPagoButton]}
                    onPress={() => processMercadoPagoPayment(pendingPaymentAppointment)}
                  >
                    <Text style={styles.mercadoPagoButtonText}>Pagar con Mercado Pago</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => setShowPaymentNotificationModal(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancelar</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal de Pago Exitoso */}
      <Modal
        visible={showPaymentSuccessModal}
        transparent={true}
        onRequestClose={() => setShowPaymentSuccessModal(false)}
        animationType="slide"
      >
        <View style={styles.calendarModalOverlay}>
          <View style={styles.calendarModalContent}>
            <View style={styles.calendarHeader}>
              <Text style={styles.calendarTitle}>✅ Pago Exitoso</Text>
              <TouchableOpacity
                style={styles.calendarNavButton}
                onPress={() => setShowPaymentSuccessModal(false)}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            {paymentSuccessData && (
              <>
                <View style={styles.paymentSummaryContainer}>
                  <Text style={styles.paymentSummaryTitle}>¡Cita Confirmada!</Text>
                  
                  <View style={styles.paymentSummaryRow}>
                    <Text style={styles.paymentSummaryLabel}>Servicio:</Text>
                    <Text style={styles.paymentSummaryValue}>{paymentSuccessData.appointment.service}</Text>
                  </View>
                  
                  <View style={styles.paymentSummaryRow}>
                    <Text style={styles.paymentSummaryLabel}>Profesional:</Text>
                    <Text style={styles.paymentSummaryValue}>{paymentSuccessData.appointment.professional}</Text>
                  </View>
                  
                  <View style={styles.paymentSummaryRow}>
                    <Text style={styles.paymentSummaryLabel}>Fecha:</Text>
                    <Text style={styles.paymentSummaryValue}>{paymentSuccessData.appointment.date}</Text>
                  </View>
                  
                  <View style={styles.paymentSummaryRow}>
                    <Text style={styles.paymentSummaryLabel}>Hora:</Text>
                    <Text style={styles.paymentSummaryValue}>{paymentSuccessData.appointment.time}</Text>
                  </View>
                  
                  <View style={styles.paymentSummaryRow}>
                    <Text style={styles.paymentSummaryLabel}>Seña Pagada:</Text>
                    <Text style={styles.paymentSummaryValue}>${paymentSuccessData.depositAmount}</Text>
                  </View>
                  
                  <View style={styles.paymentSummaryRow}>
                    <Text style={styles.paymentSummaryLabel}>Total del Servicio:</Text>
                    <Text style={styles.paymentSummaryValue}>${paymentSuccessData.totalAmount}</Text>
                  </View>
                </View>
                
                <View style={styles.mercadoPagoActions}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.saveButton]}
                    onPress={() => setShowPaymentSuccessModal(false)}
                  >
                    <Text style={styles.saveButtonText}>Entendido</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal para Agregar Nuevo Paciente */}
      <Modal
        visible={showAddPatientModal}
        transparent={false}
        onRequestClose={handleCancelAddPatient}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderContent}>
              <Ionicons name="person-add" size={28} color="#4CAF50" />
              <Text style={styles.modalTitle}>Agregar Nuevo Paciente</Text>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleCancelAddPatient}
            >
              <Ionicons name="close-circle" size={28} color="#999" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.addPatientForm}
            contentContainerStyle={{ paddingBottom: scrollContentBottomPadding }}
            showsVerticalScrollIndicator={false}
          >
            {/* Información Personal */}
            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>Información Personal</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nombre Completo del Paciente *</Text>
                
                {/* Selector de catálogo desplegable */}
                <TouchableOpacity
                  style={styles.catalogSelectorButton}
                  onPress={() => {
                    console.log('📋 Abriendo catálogo de usuarios cliente...');
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

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="ejemplo@email.com"
                  value={newPatientData.email}
                  onChangeText={(text) => setNewPatientData(prev => ({ ...prev, email: text }))}
                  placeholderTextColor="#999"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Teléfono *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="+54 9 11 1234-5678"
                  value={newPatientData.phone}
                  onChangeText={(text) => setNewPatientData(prev => ({ ...prev, phone: text }))}
                  placeholderTextColor="#999"
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                  <Text style={styles.inputLabel}>Fecha de Nacimiento</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="DD/MM/AAAA"
                    value={newPatientData.dateOfBirth}
                    onChangeText={(text) => setNewPatientData(prev => ({ ...prev, dateOfBirth: text }))}
                    placeholderTextColor="#999"
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1, marginLeft: 10 }]}>
                  <Text style={styles.inputLabel}>Género</Text>
                  <TouchableOpacity
                    style={styles.genderSelector}
                    onPress={() => {
                      Alert.alert(
                        'Seleccionar Género',
                        'Elige una opción:',
                        [
                          { text: 'Masculino', onPress: () => setNewPatientData(prev => ({ ...prev, gender: 'masculino' })) },
                          { text: 'Femenino', onPress: () => setNewPatientData(prev => ({ ...prev, gender: 'femenino' })) },
                          { text: 'No binario', onPress: () => setNewPatientData(prev => ({ ...prev, gender: 'no_binario' })) },
                          { text: 'Prefiero no decir', onPress: () => setNewPatientData(prev => ({ ...prev, gender: 'no_especificar' })) },
                          { text: 'Cancelar', style: 'cancel' }
                        ]
                      );
                    }}
                  >
                    <Text style={[styles.genderSelectorText, { color: newPatientData.gender ? '#333' : '#999' }]}>
                      {newPatientData.gender || 'Seleccionar...'}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color="#999" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Dirección</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Ingresa la dirección completa"
                  value={newPatientData.address}
                  onChangeText={(text) => setNewPatientData(prev => ({ ...prev, address: text }))}
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={2}
                />
              </View>
            </View>

            {/* Información de Contacto de Emergencia */}
            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>Contacto de Emergencia</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nombre y Teléfono</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Nombre del contacto de emergencia y teléfono"
                  value={newPatientData.emergencyContact}
                  onChangeText={(text) => setNewPatientData(prev => ({ ...prev, emergencyContact: text }))}
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            {/* Información Médica */}
            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>Información Médica</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Historial Médico</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="Condiciones médicas previas, cirugías, etc."
                  value={newPatientData.medicalHistory}
                  onChangeText={(text) => setNewPatientData(prev => ({ ...prev, medicalHistory: text }))}
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Alergias</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Alergias conocidas (medicamentos, alimentos, etc.)"
                  value={newPatientData.allergies}
                  onChangeText={(text) => setNewPatientData(prev => ({ ...prev, allergies: text }))}
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Notas Adicionales</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="Información adicional relevante"
                  value={newPatientData.notes}
                  onChangeText={(text) => setNewPatientData(prev => ({ ...prev, notes: text }))}
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={3}
                />
              </View>
            </View>
          </ScrollView>

          {/* Botones de Acción */}
          <View style={[styles.modalActions, { paddingBottom: modalActionPaddingBottom }]}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancelAddPatient}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveNewPatient}
              activeOpacity={0.7}
            >
              <Text style={styles.saveButtonText}>Guardar Paciente</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal para Seleccionar Cliente del Catálogo */}
      <Modal
        visible={showClientSelector}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowClientSelector(false)}
      >
        <View style={styles.clientSelectorModalOverlay}>
          <View style={styles.clientSelectorModalContent}>
            <View style={styles.clientSelectorModalHeader}>
              <Text style={styles.clientSelectorModalTitle}>
                📋 Catálogo de Usuarios Cliente del Sistema
              </Text>
              <TouchableOpacity
                style={styles.clientSelectorCloseButton}
                onPress={() => setShowClientSelector(false)}
              >
                <Ionicons name="close-circle" size={28} color="#999" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.clientSelectorModalBody}>
              <Text style={styles.clientSelectorSubtitle}>
                Selecciona un usuario cliente existente del sistema para agregarlo como paciente
              </Text>
              
              {/* Campo de búsqueda */}
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#667eea" />
                <TextInput
                  style={styles.searchInput}
                  value={clientSearchQuery}
                  onChangeText={setClientSearchQuery}
                  placeholder="Buscar en usuarios cliente del sistema..."
                  placeholderTextColor="#999"
                />
                {clientSearchQuery.length > 0 && (
                  <TouchableOpacity 
                    style={styles.clearSearchButton}
                    onPress={() => setClientSearchQuery('')}
                  >
                    <Ionicons name="close-circle" size={20} color="#999" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Contador de resultados */}
              <View style={styles.resultsCounter}>
                <Text style={styles.resultsCounterText}>
                  {usersLoading 
                    ? 'Cargando usuarios...' 
                    : `${getFilteredClientUsers().length} usuario${getFilteredClientUsers().length !== 1 ? 's' : ''} encontrado${getFilteredClientUsers().length !== 1 ? 's' : ''}`
                  }
                </Text>
                {usersError && (
                  <Text style={[styles.resultsCounterText, { color: '#ff6b6b', fontSize: 12 }]}>
                    Error: {usersError}
                  </Text>
                )}
              </View>
              
              {/* Lista de usuarios cliente */}
              <ScrollView style={styles.clientListContainer}>
                {usersLoading ? (
                  <View style={styles.loadingContainer}>
                    <Ionicons name="hourglass" size={48} color="#667eea" />
                    <Text style={styles.loadingText}>Cargando usuarios...</Text>
                  </View>
                ) : getFilteredClientUsers().length > 0 ? (
                  getFilteredClientUsers().map((client) => (
                    <TouchableOpacity
                      key={client.id}
                      style={styles.clientItem}
                      onPress={() => handleClientSelect(client)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.clientItemContent}>
                        <View style={styles.clientItemAvatar}>
                          <Ionicons name="person" size={24} color="#667eea" />
                        </View>
                        
                        <View style={styles.clientItemInfo}>
                          <Text style={styles.clientItemName}>{client.fullName}</Text>
                          <Text style={styles.clientItemEmail}>{client.email}</Text>
                          {client.phone && (
                            <Text style={styles.clientItemPhone}>{client.phone}</Text>
                          )}
                        </View>
                        
                        <View style={styles.clientItemSelectIndicator}>
                          <Ionicons name="chevron-forward" size={20} color="#ccc" />
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={styles.noClientsContainer}>
                    <Ionicons name="people-outline" size={48} color="#999" />
                    <Text style={styles.noClientsText}>
                      {clientSearchQuery.trim() 
                        ? 'No se encontraron usuarios con esa búsqueda'
                        : usersError 
                          ? 'Error al cargar usuarios'
                          : 'No hay usuarios cliente disponibles en el sistema'
                      }
                    </Text>
                    <Text style={styles.noClientsSubtext}>
                      {usersError 
                        ? 'Intenta recargar la página'
                        : 'Intenta cambiar la búsqueda o crear un nuevo usuario'
                      }
                    </Text>
                    {usersError && (
                      <TouchableOpacity 
                        style={styles.retryButton}
                        onPress={refreshUsers}
                      >
                        <Text style={styles.retryButtonText}>🔄 Reintentar</Text>
                      </TouchableOpacity>
                    )}
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

      {/* Catálogo de Pacientes - VERSIÓN COMPLETAMENTE REORGANIZADA */}
      <Modal
        visible={showPatientCatalogModal}
        transparent={false}
        onRequestClose={() => setShowPatientCatalogModal(false)}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <View style={[styles.modalContainer, { height: '100%' }]}>
          {/* Header Principal con Mejor Organización */}
          <View style={styles.patientModalHeader}>
            <TouchableOpacity
              style={styles.patientBackButton}
              onPress={() => setShowPatientCatalogModal(false)}
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <View style={styles.patientHeaderContent}>
              <Text style={styles.patientModalTitle}>
                📋 Catálogo de Pacientes
              </Text>
              <Text style={styles.patientModalSubtitle}>
                Gestiona tu lista de pacientes
              </Text>
            </View>
          </View>

          {/* Panel de Estadísticas Compacto */}
          <View style={styles.patientStatsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>21</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>21</Text>
              <Text style={styles.statLabel}>Activos</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>Inactivos</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>5</Text>
              <Text style={styles.statLabel}>Nuevos</Text>
            </View>
          </View>

          {/* Sección de Búsqueda y Filtros Compacta */}
          <View style={styles.patientSearchSection}>
            {/* Barra de Búsqueda Principal */}
            <View style={styles.patientSearchContainer}>
              <View style={styles.patientSearchInputContainer}>
                <Ionicons name="search" size={20} color="#667eea" style={styles.patientSearchIcon} />
              <TextInput
                  style={styles.patientSearchInput}
                  placeholder="🔍 Buscar por nombre, email o teléfono..."
                value={patientSearchQuery}
                onChangeText={setPatientSearchQuery}
                placeholderTextColor="#999"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {patientSearchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => setPatientSearchQuery('')}
                    style={styles.patientClearButton}
                >
                  <Ionicons name="close-circle" size={20} color="#999" />
                </TouchableOpacity>
              )}
            </View>
          </View>

            {/* Filtros Compactos */}
            <View style={styles.patientFiltersContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.patientFiltersScroll}>
                <TouchableOpacity style={[styles.patientFilterChip, styles.patientFilterChipActive]}>
                  <Text style={[styles.patientFilterChipText, styles.patientFilterChipTextActive]}>Todos</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.patientFilterChip}>
                  <Text style={styles.patientFilterChipText}>Recientes</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.patientFilterChip}>
                  <Text style={styles.patientFilterChipText}>Frecuentes</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.patientFilterChip}>
                  <Text style={styles.patientFilterChipText}>Nuevos</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.patientFilterChip}>
                  <Text style={styles.patientFilterChipText}>Activos</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.patientFilterChip}>
                  <Text style={styles.patientFilterChipText}>Inactivos</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>

          {/* Lista de Pacientes con Mejor Organización */}
          <ScrollView style={styles.patientListContainer} showsVerticalScrollIndicator={false}>
            {[
              // Usuarios cliente existentes
              { id: 'cliente_001', name: 'Juan Pérez', email: 'cliente@turnario.com', phone: '+5491112345678', status: 'active', lastVisit: '2024-01-15', visits: 8, dateOfBirth: '15/03/1985', gender: 'Masculino', address: 'Av. Corrientes 1234, CABA', emergencyContact: '+5491198765432', medicalHistory: 'Hipertensión controlada', allergies: 'Penicilina', notes: 'Paciente preferente con buen cumplimiento del tratamiento' },
              { id: 'cliente_002', name: 'Ana Martínez', email: 'ana.martinez@email.com', phone: '+5491187654321', status: 'active', lastVisit: '2024-01-14', visits: 12, dateOfBirth: '22/07/1978', gender: 'Femenino', address: 'Belgrano 567, CABA', emergencyContact: '+5491187654321', medicalHistory: 'Diabetes tipo 2', allergies: 'Ninguna', notes: 'Requiere seguimiento mensual y control de glucemia' },
              
              // Nuevos usuarios cliente agregados
              { id: 'cliente_003', name: 'María González', email: 'maria.gonzalez@email.com', phone: '+5491123456789', status: 'active', lastVisit: '2024-01-16', visits: 5, dateOfBirth: '08/11/1992', gender: 'Femenino', address: 'Palermo 890, CABA', emergencyContact: '+5491123456789', medicalHistory: 'Asma leve', allergies: 'Polvo, ácaros', notes: 'Paciente deportista, controla bien su condición' },
              { id: 'cliente_004', name: 'Carlos Ruiz', email: 'carlos.ruiz@email.com', phone: '+5491134567890', status: 'active', lastVisit: '2024-01-13', visits: 7, dateOfBirth: '12/05/1980', gender: 'Masculino', address: 'Recoleta 234, CABA', emergencyContact: '+5491134567890', medicalHistory: 'Problemas cardíacos', allergies: 'Sulfamidas', notes: 'Control cada 3 meses, paciente estable' },
              { id: 'cliente_005', name: 'Luis Rodríguez', email: 'luis.rodriguez@email.com', phone: '+5491145678901', status: 'active', lastVisit: '2024-01-12', visits: 9, dateOfBirth: '30/09/1987', gender: 'Masculino', address: 'Villa Crespo 456, CABA', emergencyContact: '+5491145678901', medicalHistory: 'Migrañas', allergies: 'Lactosa', notes: 'Paciente nuevo, responde bien al tratamiento' },
              { id: 'cliente_006', name: 'Patricia López', email: 'patricia.lopez@email.com', phone: '+5491156789012', status: 'active', lastVisit: '2024-01-11', visits: 3, dateOfBirth: '14/02/1995', gender: 'Femenino', address: 'Caballito 789, CABA', emergencyContact: '+5491156789012', medicalHistory: 'Ansiedad', allergies: 'Ninguna', notes: 'Paciente joven, en tratamiento psicológico' },
              { id: 'cliente_007', name: 'Roberto Silva', email: 'roberto.silva@email.com', phone: '+5491167890123', status: 'active', lastVisit: '2024-01-10', visits: 6, dateOfBirth: '03/08/1975', gender: 'Masculino', address: 'San Telmo 321, CABA', emergencyContact: '+5491167890123', medicalHistory: 'Artritis', allergies: 'Antiinflamatorios', notes: 'Paciente crónico, requiere fisioterapia' },
              { id: 'cliente_008', name: 'Carmen Herrera', email: 'carmen.herrera@email.com', phone: '+5491178901234', status: 'active', lastVisit: '2024-01-09', visits: 4, dateOfBirth: '19/12/1983', gender: 'Femenino', address: 'Monserrat 654, CABA', emergencyContact: '+5491178901234', medicalHistory: 'Depresión', allergies: 'Ninguna', notes: 'Paciente en recuperación, buen progreso' },
              { id: 'cliente_009', name: 'Fernando Vargas', email: 'fernando.vargas@email.com', phone: '+5491189012345', status: 'active', lastVisit: '2024-01-08', visits: 11, dateOfBirth: '07/06/1970', gender: 'Masculino', address: 'Retiro 987, CABA', emergencyContact: '+5491189012345', medicalHistory: 'Problemas de sueño', allergies: 'Ninguna', notes: 'Paciente frecuente, mejora gradual' },
              { id: 'cliente_010', name: 'Sofía Morales', email: 'sofia.morales@email.com', phone: '+5491190123456', status: 'active', lastVisit: '2024-01-07', visits: 2, dateOfBirth: '25/10/1998', gender: 'Femenino', address: 'Puerto Madero 147, CABA', emergencyContact: '+5491190123456', medicalHistory: 'Estrés laboral', allergies: 'Ninguna', notes: 'Paciente nuevo, primera consulta exitosa' },
              { id: 'cliente_011', name: 'Diego Torres', email: 'diego.torres@email.com', phone: '+5491101234567', status: 'active', lastVisit: '2024-01-06', visits: 8, dateOfBirth: '11/04/1982', gender: 'Masculino', address: 'Colegiales 258, CABA', emergencyContact: '+5491101234567', medicalHistory: 'Problemas digestivos', allergies: 'Gluten', notes: 'Paciente con dieta especial, control regular' },
              { id: 'cliente_012', name: 'Valentina Castro', email: 'valentina.castro@email.com', phone: '+5491112345678', status: 'active', lastVisit: '2024-01-05', visits: 5, dateOfBirth: '16/01/1990', gender: 'Femenino', address: 'Chacarita 369, CABA', emergencyContact: '+5491112345678', medicalHistory: 'Trastorno de ansiedad', allergies: 'Ninguna', notes: 'Paciente en terapia, buen compromiso' },
              { id: 'cliente_013', name: 'Gabriel Herrera', email: 'gabriel.herrera@email.com', phone: '+5491123456789', status: 'active', lastVisit: '2024-01-04', visits: 7, dateOfBirth: '28/07/1988', gender: 'Masculino', address: 'Villa Ortúzar 741, CABA', emergencyContact: '+5491123456789', medicalHistory: 'Problemas de concentración', allergies: 'Ninguna', notes: 'Paciente con TDAH, tratamiento efectivo' },
              { id: 'cliente_014', name: 'Camila Ruiz', email: 'camila.ruiz@email.com', phone: '+5491134567890', status: 'active', lastVisit: '2024-01-03', visits: 3, dateOfBirth: '09/03/1993', gender: 'Femenino', address: 'Villa del Parque 852, CABA', emergencyContact: '+5491134567890', medicalHistory: 'Insomnio', allergies: 'Ninguna', notes: 'Paciente joven, mejora en calidad de sueño' },
              { id: 'cliente_015', name: 'Mateo Silva', email: 'mateo.silva@email.com', phone: '+5491145678901', status: 'active', lastVisit: '2024-01-02', visits: 6, dateOfBirth: '05/11/1985', gender: 'Masculino', address: 'Villa Devoto 963, CABA', emergencyContact: '+5491145678901', medicalHistory: 'Problemas de autoestima', allergies: 'Ninguna', notes: 'Paciente en proceso de crecimiento personal' },
              { id: 'cliente_016', name: 'Isabella Mendoza', email: 'isabella.mendoza@email.com', phone: '+5491156789012', status: 'active', lastVisit: '2024-01-01', visits: 4, dateOfBirth: '21/09/1991', gender: 'Femenino', address: 'Villa Pueyrredón 159, CABA', emergencyContact: '+5491156789012', medicalHistory: 'Trastorno alimentario', allergies: 'Ninguna', notes: 'Paciente en recuperación, apoyo nutricional' },
              { id: 'cliente_017', name: 'Santiago López', email: 'santiago.lopez@email.com', phone: '+5491167890123', status: 'active', lastVisit: '2023-12-31', visits: 9, dateOfBirth: '13/12/1979', gender: 'Masculino', address: 'Villa Urquiza 357, CABA', emergencyContact: '+5491167890123', medicalHistory: 'Problemas de pareja', allergies: 'Ninguna', notes: 'Paciente en terapia de pareja, comunicación mejorada' },
              { id: 'cliente_018', name: 'Lucía Fernández', email: 'lucia.fernandez@email.com', phone: '+5491178901234', status: 'active', lastVisit: '2023-12-30', visits: 2, dateOfBirth: '02/05/1996', gender: 'Femenino', address: 'Villa General Mitre 486, CABA', emergencyContact: '+5491178901234', medicalHistory: 'Fobia social', allergies: 'Ninguna', notes: 'Paciente nuevo, primera sesión de exposición' },
              { id: 'cliente_019', name: 'Julián González', email: 'julian.gonzalez@email.com', phone: '+5491189012345', status: 'active', lastVisit: '2023-12-29', visits: 5, dateOfBirth: '17/08/1984', gender: 'Masculino', address: 'Villa Santa Rita 753, CABA', emergencyContact: '+5491189012345', medicalHistory: 'Problemas de ira', allergies: 'Ninguna', notes: 'Paciente con técnicas de control emocional' },
              { id: 'cliente_020', name: 'Emma Martínez', email: 'emma.martinez@email.com', phone: '+5491190123456', status: 'active', lastVisit: '2023-12-28', visits: 7, dateOfBirth: '29/06/1989', gender: 'Femenino', address: 'Villa Luro 951, CABA', emergencyContact: '+5491190123456', medicalHistory: 'Trastorno obsesivo-compulsivo', allergies: 'Ninguna', notes: 'Paciente con TOC, tratamiento conductual exitoso' },
              
              // Usuario demo
              { id: 'demo_001', name: 'Usuario Demo', email: 'demo@turnario.com', phone: '+1234567890', status: 'active', lastVisit: '2024-01-17', visits: 1, dateOfBirth: '01/01/1990', gender: 'No especificado', address: 'Dirección demo', emergencyContact: 'No especificado', medicalHistory: 'Sin historial', allergies: 'Sin alergias', notes: 'Usuario de demostración del sistema' }
            ]
            .filter(patient => 
              patient.name && patient.name.toLowerCase().includes((patientSearchQuery || '').toLowerCase()) ||
              patient.email && patient.email.toLowerCase().includes((patientSearchQuery || '').toLowerCase()) ||
              patient.phone && patient.phone.includes(patientSearchQuery)
            )
            .map((patient) => (
              <TouchableOpacity
                key={patient.id}
                style={[styles.patientCard, patient.status === 'inactive' && styles.patientCardInactive]}
                onPress={() => handlePatientSelect(patient)}
                activeOpacity={0.7}
              >
                {/* Avatar y Estado */}
                <View style={styles.patientCardHeader}>
                  <View style={[styles.patientCardAvatar, patient.status === 'inactive' && styles.patientCardAvatarInactive]}>
                  <Ionicons name="person" size={24} color="white" />
                </View>
                  <View style={styles.patientCardStatusContainer}>
                    <View style={[styles.patientCardStatusBadge, 
                      patient.status === 'active' ? styles.patientCardStatusActive : styles.patientCardStatusInactive]}>
                      <Text style={styles.patientCardStatusText}>
                        {patient.status === 'active' ? '🟢 Activo' : '🔴 Inactivo'}
                      </Text>
                    </View>
                    <Text style={styles.patientCardVisits}>
                      {patient.visits} visita{patient.visits !== 1 ? 's' : ''}
                    </Text>
                  </View>
                </View>

                {/* Información Principal */}
                <View style={styles.patientCardInfo}>
                  <Text style={[styles.patientCardName, patient.status === 'inactive' && styles.patientCardNameInactive]}>
                    {patient.name}
                  </Text>
                  
                  {/* Detalles Organizados */}
                  <View style={styles.patientCardDetails}>
                    <View style={styles.patientCardDetailRow}>
                      <Ionicons name="mail" size={16} color="#667eea" />
                      <Text style={[styles.patientCardEmail, patient.status === 'inactive' && styles.patientCardEmailInactive]}>
                        {patient.email}
                      </Text>
                    </View>
                    <View style={styles.patientCardDetailRow}>
                      <Ionicons name="call" size={16} color="#667eea" />
                      <Text style={[styles.patientCardPhone, patient.status === 'inactive' && styles.patientCardPhoneInactive]}>
                        {patient.phone}
                      </Text>
                    </View>
                    <View style={styles.patientCardDetailRow}>
                      <Ionicons name="calendar" size={16} color="#667eea" />
                      <Text style={[styles.patientCardLastVisit, patient.status === 'inactive' && styles.patientCardLastVisitInactive]}>
                        Última visita: {patient.lastVisit}
                      </Text>
                  </View>
                </View>
                </View>

                {/* Indicador de Selección */}
                <View style={styles.patientCardIndicator}>
                  <Ionicons name="chevron-forward" size={20} color="#667eea" />
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
          
          {/* Botón Flotante Mejorado */}
          <TouchableOpacity
            style={styles.patientAddFAB}
            onPress={() => {
              setShowAddPatientModal(true);
              setShowPatientCatalogModal(false);
            }}
          >
            <Ionicons name="add" size={32} color="white" />
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Modal de Detalles del Paciente */}
      <Modal
        visible={showPatientDetailsModal}
        transparent={false}
        onRequestClose={() => setShowPatientDetailsModal(false)}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <View style={[styles.modalContainer, { height: '100%' }]}>
          {/* Header del Modal */}
          <View style={styles.patientDetailsHeader}>
            <TouchableOpacity
              style={styles.patientDetailsBackButton}
              onPress={() => setShowPatientDetailsModal(false)}
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <View style={styles.patientDetailsHeaderContent}>
              <Text style={styles.patientDetailsTitle}>
                👤 Detalles del Paciente
              </Text>
              <Text style={styles.patientDetailsSubtitle}>
                Información completa del paciente
              </Text>
            </View>
          </View>

          {/* Contenido del Modal */}
          <ScrollView
            style={styles.patientDetailsContent}
            contentContainerStyle={{ paddingBottom: scrollContentBottomPadding }}
            showsVerticalScrollIndicator={false}
          >
            {selectedPatientForDetails && (
              <>
                {/* Información Principal */}
                <View style={styles.patientInfoSection}>
                  <View style={styles.patientAvatarContainer}>
                    <View style={styles.patientAvatar}>
                      <Ionicons name="person" size={40} color="white" />
                    </View>
                    <View style={styles.patientStatusContainer}>
                      <View style={styles.patientStatusBadge}>
                        <Text style={styles.patientStatusText}>
                          🟢 Activo
                        </Text>
                      </View>
                      <Text style={styles.patientVisitsCount}>
                        {selectedPatientForDetails.visits || 0} visita{selectedPatientForDetails.visits !== 1 ? 's' : ''}
                      </Text>
                    </View>
                  </View>
                  
                  <Text style={styles.patientName}>{selectedPatientForDetails.name}</Text>
                  <Text style={styles.patientEmail}>{selectedPatientForDetails.email}</Text>
                  <Text style={styles.patientPhone}>{selectedPatientForDetails.phone}</Text>
                </View>

                {/* Información Detallada */}
                <View style={styles.patientDetailsSection}>
                  <Text style={styles.sectionTitle}>Información Personal</Text>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>ID:</Text>
                    <Text style={styles.detailValue}>{selectedPatientForDetails.id}</Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Última Visita:</Text>
                    <Text style={styles.detailValue}>{selectedPatientForDetails.lastVisit || 'No registrada'}</Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Estado:</Text>
                    <Text style={styles.detailValue}>
                      {selectedPatientForDetails.status === 'active' ? '🟢 Activo' : '🔴 Inactivo'}
                    </Text>
                  </View>
                </View>

                {/* Historial de Visitas */}
                <View style={styles.patientDetailsSection}>
                  <Text style={styles.sectionTitle}>🏥 Historial de Visitas</Text>
                  
                  <View style={styles.visitsSummary}>
                    <View style={styles.visitStatCard}>
                      <Text style={styles.visitStatNumber}>{selectedPatientForDetails.visits || 0}</Text>
                      <Text style={styles.visitStatLabel}>Total de Visitas</Text>
                    </View>
                    <View style={styles.visitStatCard}>
                      <Text style={styles.visitStatNumber}>
                        {selectedPatientForDetails.lastVisit ? 'Reciente' : 'N/A'}
                      </Text>
                      <Text style={styles.visitStatLabel}>Última Visita</Text>
                    </View>
                  </View>
                </View>

                {/* Notas y Comentarios */}
                <View style={styles.patientDetailsSection}>
                  <Text style={styles.sectionTitle}>📝 Notas y Comentarios</Text>
                  <Text style={styles.patientNotes}>
                    {selectedPatientForDetails.notes || 'No hay notas registradas para este paciente.'}
                  </Text>
                </View>
              </>
            )}
          </ScrollView>

          {/* Botones de Acción */}
          <View
            style={[
              styles.patientDetailsActions,
              { paddingBottom: modalActionPaddingBottom },
            ]}
          >
            <TouchableOpacity
              style={[styles.patientActionButton, styles.editButton]}
              onPress={() => handleEditPatient(selectedPatientForDetails)}
            >
              <Ionicons name="create" size={20} color="white" />
              <Text style={styles.patientActionButtonText}>✏️ Editar Paciente</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.patientActionButton, styles.scheduleButton]}
              onPress={() => {
                setShowPatientDetailsModal(false);
                // Aquí se implementaría la lógica para agendar cita
                Alert.alert(
                  '📅 Agendar Cita',
                  'Función en desarrollo - Próximamente podrás agendar citas directamente desde aquí.',
                  [{ text: 'OK' }]
                );
              }}
            >
              <Ionicons name="calendar" size={20} color="white" />
              <Text style={styles.patientActionButtonText}>📅 Agendar Cita</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de Edición del Paciente */}
      <Modal
        visible={showEditPatientModal}
        transparent={false}
        onRequestClose={handleCancelEditPatient}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <View style={[styles.modalContainer, { height: '100%' }]}>
          {/* Header del Modal */}
          <View style={[styles.editPatientHeader, { paddingTop: Math.max(insets.top + 8, 50) }]}>
            <TouchableOpacity
              style={styles.editPatientBackButton}
              onPress={handleCancelEditPatient}
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <View style={styles.editPatientHeaderContent}>
              <Text style={styles.editPatientTitle}>
                ✏️ Editar Paciente
              </Text>
              <Text style={styles.editPatientSubtitle}>
                Modifica la información del paciente
              </Text>
            </View>
          </View>

          {/* Botón de depuración temporal */}
          <TouchableOpacity 
            style={[styles.debugButton, { backgroundColor: '#FF6B6B', margin: 10, padding: 10, borderRadius: 8 }]}
            onPress={() => {
              console.log('🔍 DEBUG: Estado actual de editingPatientData:', editingPatientData);
              console.log('🔍 DEBUG: Paciente seleccionado:', selectedPatientForDetails);
              Alert.alert(
                '🔍 Debug Info',
                `Nombre: ${editingPatientData.fullName}\nEmail: ${editingPatientData.email}\nTeléfono: ${editingPatientData.phone}`,
                [{ text: 'OK' }]
              );
            }}
          >
            <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>🔍 Debug: Ver Datos</Text>
          </TouchableOpacity>

          {/* Formulario de Edición */}
          <ScrollView style={styles.editPatientForm} showsVerticalScrollIndicator={false}>
            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>Información Personal</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nombre Completo *</Text>
                <TextInput
                  style={styles.textInput}
                  value={editingPatientData.fullName}
                  onChangeText={(text) => setEditingPatientData(prev => ({ ...prev, fullName: text }))}
                  placeholder="Nombre completo del paciente"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email *</Text>
                <TextInput
                  style={styles.textInput}
                  value={editingPatientData.email}
                  onChangeText={(text) => setEditingPatientData(prev => ({ ...prev, email: text }))}
                  placeholder="Email del paciente"
                  placeholderTextColor="#999"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Teléfono *</Text>
                <TextInput
                  style={styles.textInput}
                  value={editingPatientData.phone}
                  onChangeText={(text) => setEditingPatientData(prev => ({ ...prev, phone: text }))}
                  placeholder="Teléfono del paciente"
                  placeholderTextColor="#999"
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Fecha de Nacimiento</Text>
                <TextInput
                  style={styles.textInput}
                  value={editingPatientData.dateOfBirth}
                  onChangeText={(text) => setEditingPatientData(prev => ({ ...prev, dateOfBirth: text }))}
                  placeholder="DD/MM/AAAA"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Género</Text>
                <TextInput
                  style={styles.textInput}
                  value={editingPatientData.gender}
                  onChangeText={(text) => setEditingPatientData(prev => ({ ...prev, gender: text }))}
                  placeholder="Género del paciente"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Dirección</Text>
                <TextInput
                  style={styles.textInput}
                  value={editingPatientData.address}
                  onChangeText={(text) => setEditingPatientData(prev => ({ ...prev, address: text }))}
                  placeholder="Dirección del paciente"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Contacto de Emergencia</Text>
                <TextInput
                  style={styles.textInput}
                  value={editingPatientData.emergencyContact}
                  onChangeText={(text) => setEditingPatientData(prev => ({ ...prev, emergencyContact: text }))}
                  placeholder="Contacto de emergencia"
                  placeholderTextColor="#999"
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Historial Médico</Text>
                <TextInput
                  style={styles.textArea}
                  value={editingPatientData.medicalHistory}
                  onChangeText={(text) => setEditingPatientData(prev => ({ ...prev, medicalHistory: text }))}
                  placeholder="Historial médico del paciente"
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Alergias</Text>
                <TextInput
                  style={styles.textInput}
                  value={editingPatientData.allergies}
                  onChangeText={(text) => setEditingPatientData(prev => ({ ...prev, allergies: text }))}
                  placeholder="Alergias del paciente"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Notas</Text>
                <TextInput
                  style={styles.textArea}
                  value={editingPatientData.notes}
                  onChangeText={(text) => setEditingPatientData(prev => ({ ...prev, notes: text }))}
                  placeholder="Notas adicionales sobre el paciente"
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            </View>
          </ScrollView>

          {/* Botones de Acción */}
          <View style={[styles.editPatientActions, { paddingBottom: modalActionPaddingBottom }]}>
            <TouchableOpacity
              style={[styles.editPatientButton, styles.cancelButton]}
              onPress={handleCancelEditPatient}
            >
              <Text style={styles.cancelButtonText}>❌ Cancelar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.editPatientButton, styles.saveButton]}
              onPress={handleSavePatientChanges}
            >
              <Text style={styles.saveButtonText}>💎 Guardar Cambios</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de Gestión de Pacientes */}
      <Modal
        visible={showPatientManagementModal}
        transparent={false}
        onRequestClose={() => setShowPatientManagementModal(false)}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <View style={[styles.modalContainer, { height: '100%' }]}>
          {/* Header del Modal */}
          <View
            style={[
              styles.patientManagementHeader,
              { paddingTop: Math.max(insets.top + 8, 12) },
            ]}
          >
            <TouchableOpacity
              style={styles.patientManagementBackButton}
              onPress={() => setShowPatientManagementModal(false)}
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <View style={styles.patientManagementHeaderContent}>
              <Text style={styles.patientManagementTitle}>
                🏥 Gestión de Pacientes
              </Text>
              <Text style={styles.patientManagementSubtitle}>
                Administra tu lista de pacientes
              </Text>
            </View>
          </View>

          {/* Panel de Estadísticas */}
          <View style={styles.patientManagementStats}>
            <View style={styles.patientManagementStatCard}>
              <Text style={styles.patientManagementStatNumber}>{getRealPatientManagementList().length}</Text>
              <Text style={styles.patientManagementStatLabel}>Total</Text>
            </View>
            <View style={styles.patientManagementStatCard}>
              <Text style={styles.patientManagementStatNumber}>
                {getRealPatientManagementList().filter((row) => row.status === 'active').length}
              </Text>
              <Text style={styles.patientManagementStatLabel}>Activos</Text>
            </View>
            <View style={styles.patientManagementStatCard}>
              <Text style={styles.patientManagementStatNumber}>
                {getRealPatientManagementList().filter((row) => row.status === 'inactive').length}
              </Text>
              <Text style={styles.patientManagementStatLabel}>Inactivos</Text>
            </View>
            <View style={styles.patientManagementStatCard}>
              <Text style={styles.patientManagementStatNumber}>
                {
                  getRealPatientManagementList().filter((row) => {
                    const parsed = normalizePatientDate(row.lastVisit);
                    return parsed
                      ? parsed.getTime() >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).getTime()
                      : false;
                  }).length
                }
              </Text>
              <Text style={styles.patientManagementStatLabel}>Nuevos</Text>
            </View>
          </View>

          {/* Barra de Acciones */}
          <View style={styles.patientManagementActions}>
            <TouchableOpacity 
              style={styles.patientManagementActionButton}
              onPress={() => {
                setShowAddPatientModal(true);
                setShowPatientManagementModal(false);
              }}
            >
              <Ionicons name="person-add" size={20} color="white" />
              <Text style={styles.patientManagementActionButtonText}>Agregar Paciente</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.patientManagementActionButton}
              onPress={handleImportPatients}
            >
              <Ionicons name="download" size={20} color="white" />
              <Text style={styles.patientManagementActionButtonText}>Importar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.patientManagementActionButton}
              onPress={handleExportPatients}
            >
              <Ionicons name="share" size={20} color="white" />
              <Text style={styles.patientManagementActionButtonText}>Exportar</Text>
            </TouchableOpacity>
          </View>

          {/* Filtros y Búsqueda */}
          <View style={styles.patientManagementSearchSection}>
            <View style={styles.patientManagementSearchContainer}>
              <Ionicons name="search" size={20} color="#667eea" style={styles.patientManagementSearchIcon} />
              <TextInput
                style={styles.patientManagementSearchInput}
                placeholder="🔍 Buscar pacientes..."
                value={patientManagementSearchQuery}
                onChangeText={setPatientManagementSearchQuery}
                placeholderTextColor="#999"
              />
            </View>
            
            <View style={styles.patientManagementFilters}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <TouchableOpacity
                  style={[styles.patientManagementFilterChip, patientManagementFilter === 'all' && styles.patientManagementFilterChipActive]}
                  onPress={() => setPatientManagementFilter('all')}
                >
                  <Text style={[styles.patientManagementFilterChipText, patientManagementFilter === 'all' && styles.patientManagementFilterChipTextActive]}>Todos</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.patientManagementFilterChip, patientManagementFilter === 'active' && styles.patientManagementFilterChipActive]}
                  onPress={() => setPatientManagementFilter('active')}
                >
                  <Text style={[styles.patientManagementFilterChipText, patientManagementFilter === 'active' && styles.patientManagementFilterChipTextActive]}>Activos</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.patientManagementFilterChip, patientManagementFilter === 'inactive' && styles.patientManagementFilterChipActive]}
                  onPress={() => setPatientManagementFilter('inactive')}
                >
                  <Text style={[styles.patientManagementFilterChipText, patientManagementFilter === 'inactive' && styles.patientManagementFilterChipTextActive]}>Inactivos</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.patientManagementFilterChip, patientManagementFilter === 'recent' && styles.patientManagementFilterChipActive]}
                  onPress={() => setPatientManagementFilter('recent')}
                >
                  <Text style={[styles.patientManagementFilterChipText, patientManagementFilter === 'recent' && styles.patientManagementFilterChipTextActive]}>Recientes</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>

          {/* Lista de Pacientes con Acciones */}
          <ScrollView style={styles.patientManagementList} showsVerticalScrollIndicator={false}>
            {getRealPatientManagementList().map((patient) => (
              <View key={patient.id} style={[styles.patientManagementCard, patient.status === 'inactive' && styles.patientManagementCardInactive]}>
                {/* Header de la Tarjeta */}
                <View style={styles.patientManagementCardHeader}>
                  <View style={styles.patientManagementCardAvatar}>
                    <Ionicons name="person" size={24} color="white" />
                  </View>
                  <View style={styles.patientManagementCardInfo}>
                    <Text style={styles.patientManagementCardName}>{patient.name}</Text>
                    <Text style={styles.patientManagementCardEmail}>{patient.email}</Text>
                    <Text style={styles.patientManagementCardPhone}>{patient.phone}</Text>
                  </View>
                  <View style={styles.patientManagementCardStatus}>
                    <View style={[styles.patientManagementStatusBadge, patient.status === 'active' ? styles.patientManagementStatusActive : styles.patientManagementStatusInactive]}>
                      <Text style={styles.patientManagementStatusText}>
                        {patient.status === 'active' ? '🟢 Activo' : '🔴 Inactivo'}
                      </Text>
                    </View>
                    <Text style={styles.patientManagementCardVisits}>{patient.visits} visita{patient.visits !== 1 ? 's' : ''}</Text>
                  </View>
                </View>

                {/* Detalles del Paciente */}
                <View style={styles.patientManagementCardDetails}>
                  <Text style={styles.patientManagementCardNotes}>
                    <Text style={styles.patientManagementCardNotesLabel}>Notas: </Text>
                    {patient.notes}
                  </Text>
                  <Text style={styles.patientManagementCardLastVisit}>
                    Última visita: {patient.lastVisit}
                  </Text>
                </View>

                {/* Acciones del Paciente */}
                <View style={styles.patientManagementCardActions}>
                  <TouchableOpacity 
                    style={styles.patientManagementAction}
                    onPress={() => handlePatientSelect(patient)}
                  >
                    <Ionicons name="eye" size={16} color="#667eea" />
                    <Text style={styles.patientManagementActionText}>Ver</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.patientManagementAction}
                    onPress={() => handleEditPatient(patient)}
                  >
                    <Ionicons name="create" size={16} color="#FF9800" />
                    <Text style={styles.patientManagementActionText}>Editar</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.patientManagementAction}
                    onPress={() => handleScheduleAppointment(patient)}
                  >
                    <Ionicons name="calendar" size={16} color="#4CAF50" />
                    <Text style={styles.patientManagementActionText}>Agendar</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.patientManagementAction}
                    onPress={() => handleViewPatientHistory(patient)}
                  >
                    <Ionicons name="time" size={16} color="#9C27B0" />
                    <Text style={styles.patientManagementActionText}>Historial</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* Modal del Calendario de Disponibilidad */}
      <Modal
        visible={showDatePickerModal}
        transparent={true}
        onRequestClose={() => setShowDatePickerModal(false)}
        animationType="slide"
      >
        <View style={styles.calendarModalOverlay}>
          <View style={styles.calendarModalContent}>
            <View style={styles.calendarHeader}>
              <TouchableOpacity
                style={styles.calendarNavButton}
                onPress={() => navigateMonth('prev')}
              >
                <Ionicons name="chevron-back" size={24} color="#667eea" />
              </TouchableOpacity>
              
              <Text style={styles.calendarMonthYear}>
                {currentMonth.toLocaleDateString('es-ES', { 
                  month: 'long', 
                  year: 'numeric' 
                })}
              </Text>
              
              <TouchableOpacity
                style={styles.calendarNavButton}
                onPress={() => navigateMonth('next')}
              >
                <Ionicons name="chevron-forward" size={24} color="#667eea" />
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
              {getDaysInMonth(currentMonth).map((day, index) => (
                <TouchableOpacity
                  key={`day-${day.day}-${index}`}
                  style={[
                    styles.dayButton,
                    day.isCurrentMonth && styles.dayButtonCurrentMonth,
                    day.isAvailable && styles.dayButtonAvailable,
                  ]}
                  onPress={() => {
                    if (day.isCurrentMonth && day.isAvailable) {
                      handleDateSelection(day.day, currentMonth.getMonth(), currentMonth.getFullYear());
                    }
                  }}
                  disabled={!day.isCurrentMonth || !day.isAvailable}
                >
                  <Text style={[
                    styles.dayButtonText,
                    day.isCurrentMonth && styles.dayButtonTextCurrentMonth,
                    day.isAvailable && styles.dayButtonTextAvailable,
                  ]}>
                    {day.day}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <View style={{ marginTop: 20, alignItems: 'center' }}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowDatePickerModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal del Selector de Horarios */}
      <Modal
        visible={showTimePickerModal}
        transparent={true}
        onRequestClose={() => setShowTimePickerModal(false)}
        animationType="slide"
      >
        <View style={styles.calendarModalOverlay}>
          <View style={styles.calendarModalContent}>
            <View style={styles.calendarHeader}>
              <Text style={styles.calendarTitle}>Horarios Disponibles</Text>
              <TouchableOpacity
                style={styles.calendarNavButton}
                onPress={() => setShowTimePickerModal(false)}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.timeSelectorSubtitle}>
              Fecha seleccionada: {selectedDate}
            </Text>
            
            <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
              <View style={styles.timeSlotsGrid}>
                {availableTimeSlots.map((time, index) => (
                  <TouchableOpacity
                    key={`time-${time}-${index}`}
                    style={styles.timeSlotButton}
                    onPress={() => handleTimeSelection(time)}
                  >
                    <Text style={styles.timeSlotText}>{time}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            
            <View style={{ marginTop: 20, alignItems: 'center' }}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowTimePickerModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Privacidad */}
      <Modal
        visible={showPrivacyModal}
        transparent={true}
        onRequestClose={() => setShowPrivacyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Privacidad y Seguridad</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowPrivacyModal(false)}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Visibilidad del Perfil</Text>
                <View style={styles.radioGroup}>
                  <TouchableOpacity
                    style={styles.radioOption}
                    onPress={() => handlePrivacySettingChange('profileVisibility', 'public')}
                  >
                    <Ionicons
                      name={privacySettings.profileVisibility === 'public' ? "radio-button-on" : "radio-button-off"}
                      size={20}
                      color="#667eea"
                    />
                    <Text style={styles.radioText}>Público</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.radioOption}
                    onPress={() => handlePrivacySettingChange('profileVisibility', 'contacts')}
                  >
                    <Ionicons
                      name={privacySettings.profileVisibility === 'contacts' ? "radio-button-on" : "radio-button-off"}
                      size={20}
                      color="#667eea"
                    />
                    <Text style={styles.radioText}>Solo Contactos</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.radioOption}
                    onPress={() => handlePrivacySettingChange('profileVisibility', 'private')}
                  >
                    <Ionicons
                      name={privacySettings.profileVisibility === 'private' ? "radio-button-on" : "radio-button-off"}
                      size={20}
                      color="#667eea"
                    />
                    <Text style={styles.radioText}>Privado</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Configuraciones Adicionales</Text>
                <TouchableOpacity
                  style={styles.switchOption}
                  onPress={() => handlePrivacySettingChange('showOnlineStatus', !privacySettings.showOnlineStatus)}
                >
                  <Text style={styles.switchText}>Mostrar Estado en Línea</Text>
                  <Ionicons
                    name={privacySettings.showOnlineStatus ? "toggle" : "toggle-outline"}
                    size={24}
                    color={privacySettings.showOnlineStatus ? "#4CAF50" : "#ccc"}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.switchOption}
                  onPress={() => handlePrivacySettingChange('allowNotifications', !privacySettings.allowNotifications)}
                >
                  <Text style={styles.switchText}>Permitir Notificaciones</Text>
                  <Ionicons
                    name={privacySettings.allowNotifications ? "toggle" : "toggle-outline"}
                    size={24}
                    color={privacySettings.allowNotifications ? "#4CAF50" : "#ccc"}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.switchOption}
                  onPress={() => handlePrivacySettingChange('dataSharing', !privacySettings.dataSharing)}
                >
                  <Text style={styles.switchText}>Compartir Datos de Uso</Text>
                  <Ionicons
                    name={privacySettings.dataSharing ? "toggle" : "toggle-outline"}
                    size={24}
                    color={privacySettings.dataSharing ? "#4CAF50" : "#ccc"}
                  />
                </TouchableOpacity>
              </View>
            </ScrollView>

            <View
              style={[
                styles.privacyModalActions,
                { paddingBottom: modalActionPaddingBottom },
              ]}
            >
              <View style={styles.privacyPrimaryActions}>
                <TouchableOpacity
                  style={[styles.privacyActionButton, styles.cancelButton]}
                  onPress={() => setShowPrivacyModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.privacyActionButton, styles.saveButton]}
                  onPress={handleSavePrivacySettings}
                >
                  <Text style={styles.saveButtonText}>Guardar</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={[styles.privacyResetButton, styles.resetButton]}
                onPress={handleResetPrivacySettings}
              >
                <Text style={styles.resetButtonText}>Restablecer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Configuración de Pagos */}
      <Modal
        visible={showPaymentSettingsModal}
        transparent={true}
        onRequestClose={() => setShowPaymentSettingsModal(false)}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Configuración de Pagos</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowPaymentSettingsModal(false)}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
              {/* Sección de Tarjetas */}
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Tarjetas de Crédito/Débito</Text>
                {paymentSettings.cards.map((card) => (
                  <View key={card.id} style={styles.cardItem}>
                    <View style={styles.cardInfo}>
                      <Ionicons 
                        name={card.type === 'visa' ? 'card' : 'card-outline'} 
                        size={24} 
                        color="#9C27B0" 
                      />
                      <View style={styles.cardDetails}>
                        <Text style={styles.cardText}>•••• •••• •••• {card.last4}</Text>
                        <Text style={styles.cardExpiry}>Expira: {card.expiry}</Text>
                      </View>
                    </View>
                    <View style={styles.cardActions}>
                      {card.isDefault && (
                        <View style={styles.defaultBadge}>
                          <Text style={styles.defaultBadgeText}>Predeterminada</Text>
                        </View>
                      )}
                      <TouchableOpacity style={styles.cardActionButton}>
                        <Ionicons name="create-outline" size={20} color="#666" />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.cardActionButton}>
                        <Ionicons name="trash-outline" size={20} color="#ff6b6b" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
                <TouchableOpacity style={styles.addCardButton}>
                  <Ionicons name="add-circle-outline" size={24} color="#9C27B0" />
                  <Text style={styles.addCardText}>Agregar Nueva Tarjeta</Text>
                </TouchableOpacity>
              </View>

              {/* Sección de Pagos Automáticos */}
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Pagos Automáticos</Text>
                <TouchableOpacity
                  style={styles.switchOption}
                  onPress={() => setPaymentSettings(prev => ({
                    ...prev,
                    autoPayments: { ...prev.autoPayments, enabled: !prev.autoPayments.enabled }
                  }))}
                >
                  <Text style={styles.switchText}>Habilitar Pagos Automáticos</Text>
                  <Ionicons
                    name={paymentSettings.autoPayments.enabled ? "toggle" : "toggle-outline"}
                    size={24}
                    color={paymentSettings.autoPayments.enabled ? "#4CAF50" : "#ccc"}
                  />
                </TouchableOpacity>
                {paymentSettings.autoPayments.enabled && (
                  <View style={styles.autoPaymentSettings}>
                    <Text style={styles.formLabel}>Monto Mínimo</Text>
                    <TextInput
                      style={styles.textInput}
                      value={paymentSettings.autoPayments.minAmount.toString()}
                      onChangeText={(text) => setPaymentSettings(prev => ({
                        ...prev,
                        autoPayments: { ...prev.autoPayments, minAmount: parseInt(text) || 0 }
                      }))}
                      keyboardType="numeric"
                      placeholder="1000"
                    />
                    <Text style={styles.formLabel}>Monto Máximo</Text>
                    <TextInput
                      style={styles.textInput}
                      value={paymentSettings.autoPayments.maxAmount.toString()}
                      onChangeText={(text) => setPaymentSettings(prev => ({
                        ...prev,
                        autoPayments: { ...prev.autoPayments, maxAmount: parseInt(text) || 0 }
                      }))}
                      keyboardType="numeric"
                      placeholder="50000"
                    />
                  </View>
                )}
              </View>

              {/* Sección de Facturación */}
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Información de Facturación</Text>
                <Text style={styles.formLabel}>Email de Facturación</Text>
                <TextInput
                  style={styles.textInput}
                  value={paymentSettings.billing.email}
                  onChangeText={(text) => setPaymentSettings(prev => ({
                    ...prev,
                    billing: { ...prev.billing, email: text }
                  }))}
                  placeholder="usuario@email.com"
                  keyboardType="email-address"
                />
                <Text style={styles.formLabel}>Dirección de Facturación</Text>
                <TextInput
                  style={styles.textInput}
                  value={paymentSettings.billing.address}
                  onChangeText={(text) => setPaymentSettings(prev => ({
                    ...prev,
                    billing: { ...prev.billing, address: text }
                  }))}
                  placeholder="Av. Corrientes 1234, CABA"
                />
                <Text style={styles.formLabel}>CUIT/CUIL</Text>
                <TextInput
                  style={styles.textInput}
                  value={paymentSettings.billing.taxId}
                  onChangeText={(text) => setPaymentSettings(prev => ({
                    ...prev,
                    billing: { ...prev.billing, taxId: text }
                  }))}
                  placeholder="20-12345678-9"
                  keyboardType="numeric"
                />
              </View>

              {/* Sección de Cuenta Receptora */}
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Cuenta para Recibir Pagos</Text>
                
                {/* Selector de tipo de cuenta */}
                <Text style={styles.formLabel}>Tipo de Cuenta</Text>
                <View style={styles.accountTypeSelector}>
                  <TouchableOpacity
                    style={[
                      styles.accountTypeButton,
                      paymentSettings.receivingAccount.accountType === 'bank' && styles.accountTypeButtonActive
                    ]}
                    onPress={() => setPaymentSettings(prev => ({
                      ...prev,
                      receivingAccount: { ...prev.receivingAccount, accountType: 'bank' }
                    }))}
                  >
                    <Ionicons name="business" size={20} color={paymentSettings.receivingAccount.accountType === 'bank' ? 'white' : '#666'} />
                    <Text style={[
                      styles.accountTypeButtonText,
                      paymentSettings.receivingAccount.accountType === 'bank' && styles.accountTypeButtonTextActive
                    ]}>Banco</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.accountTypeButton,
                      paymentSettings.receivingAccount.accountType === 'mercadopago' && styles.accountTypeButtonActive
                    ]}
                    onPress={() => setPaymentSettings(prev => ({
                      ...prev,
                      receivingAccount: { ...prev.receivingAccount, accountType: 'mercadopago' }
                    }))}
                  >
                    <Ionicons name="card" size={20} color={paymentSettings.receivingAccount.accountType === 'mercadopago' ? 'white' : '#666'} />
                    <Text style={[
                      styles.accountTypeButtonText,
                      paymentSettings.receivingAccount.accountType === 'mercadopago' && styles.accountTypeButtonTextActive
                    ]}>MercadoPago</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.accountTypeButton,
                      paymentSettings.receivingAccount.accountType === 'paypal' && styles.accountTypeButtonActive
                    ]}
                    onPress={() => setPaymentSettings(prev => ({
                      ...prev,
                      receivingAccount: { ...prev.receivingAccount, accountType: 'paypal' }
                    }))}
                  >
                    <Ionicons name="globe" size={20} color={paymentSettings.receivingAccount.accountType === 'paypal' ? 'white' : '#666'} />
                    <Text style={[
                      styles.accountTypeButtonText,
                      paymentSettings.receivingAccount.accountType === 'paypal' && styles.accountTypeButtonTextActive
                    ]}>PayPal</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.accountTypeButton,
                      paymentSettings.receivingAccount.accountType === 'crypto' && styles.accountTypeButtonActive
                    ]}
                    onPress={() => setPaymentSettings(prev => ({
                      ...prev,
                      receivingAccount: { ...prev.receivingAccount, accountType: 'crypto' }
                    }))}
                  >
                    <Ionicons name="logo-bitcoin" size={20} color={paymentSettings.receivingAccount.accountType === 'crypto' ? 'white' : '#666'} />
                    <Text style={[
                      styles.accountTypeButtonText,
                      paymentSettings.receivingAccount.accountType === 'crypto' && styles.accountTypeButtonTextActive
                    ]}>Crypto</Text>
                  </TouchableOpacity>
                </View>

                {/* Configuración de cuenta bancaria */}
                {paymentSettings.receivingAccount.accountType === 'bank' && (
                  <View style={styles.accountDetails}>
                    <Text style={styles.formLabel}>Banco</Text>
                    <TextInput
                      style={styles.textInput}
                      value={paymentSettings.receivingAccount.bankAccount.bankName}
                      onChangeText={(text) => setPaymentSettings(prev => ({
                        ...prev,
                        receivingAccount: {
                          ...prev.receivingAccount,
                          bankAccount: { ...prev.receivingAccount.bankAccount, bankName: text }
                        }
                      }))}
                      placeholder="Nombre del banco"
                    />
                    
                    <Text style={styles.formLabel}>Tipo de Cuenta</Text>
                    <View style={styles.radioGroup}>
                      <TouchableOpacity
                        style={styles.radioOption}
                        onPress={() => setPaymentSettings(prev => ({
                          ...prev,
                          receivingAccount: {
                            ...prev.receivingAccount,
                            bankAccount: { ...prev.receivingAccount.bankAccount, accountType: 'corriente' }
                          }
                        }))}
                      >
                        <Ionicons
                          name={paymentSettings.receivingAccount.bankAccount.accountType === 'corriente' ? "radio-button-on" : "radio-button-off"}
                          size={20}
                          color="#667eea"
                        />
                        <Text style={styles.radioText}>Cuenta Corriente</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.radioOption}
                        onPress={() => setPaymentSettings(prev => ({
                          ...prev,
                          receivingAccount: {
                            ...prev.receivingAccount,
                            bankAccount: { ...prev.receivingAccount.bankAccount, accountType: 'caja_ahorro' }
                          }
                        }))}
                      >
                        <Ionicons
                          name={paymentSettings.receivingAccount.bankAccount.accountType === 'caja_ahorro' ? "radio-button-on" : "radio-button-off"}
                          size={20}
                          color="#667eea"
                        />
                        <Text style={styles.radioText}>Caja de Ahorro</Text>
                      </TouchableOpacity>
                    </View>
                    
                    <Text style={styles.formLabel}>Número de Cuenta</Text>
                    <TextInput
                      style={styles.textInput}
                      value={paymentSettings.receivingAccount.bankAccount.accountNumber}
                      onChangeText={(text) => setPaymentSettings(prev => ({
                        ...prev,
                        receivingAccount: {
                          ...prev.receivingAccount,
                          bankAccount: { ...prev.receivingAccount.bankAccount, accountNumber: text }
                        }
                      }))}
                      placeholder="1234567890"
                      keyboardType="numeric"
                    />
                    
                    <Text style={styles.formLabel}>CBU</Text>
                    <TextInput
                      style={styles.textInput}
                      value={paymentSettings.receivingAccount.bankAccount.cbu}
                      onChangeText={(text) => setPaymentSettings(prev => ({
                        ...prev,
                        receivingAccount: {
                          ...prev.receivingAccount,
                          bankAccount: { ...prev.receivingAccount.bankAccount, cbu: text }
                        }
                      }))}
                      placeholder="0110123456789012345678"
                      keyboardType="numeric"
                    />
                    
                    <Text style={styles.formLabel}>Titular de la Cuenta</Text>
                    <TextInput
                      style={styles.textInput}
                      value={paymentSettings.receivingAccount.bankAccount.holderName}
                      onChangeText={(text) => setPaymentSettings(prev => ({
                        ...prev,
                        receivingAccount: {
                          ...prev.receivingAccount,
                          bankAccount: { ...prev.receivingAccount.bankAccount, holderName: text }
                        }
                      }))}
                      placeholder="Nombre completo del titular"
                    />
                    
                    <Text style={styles.formLabel}>CUIT/CUIL del Titular</Text>
                    <TextInput
                      style={styles.textInput}
                      value={paymentSettings.receivingAccount.bankAccount.holderId}
                      onChangeText={(text) => setPaymentSettings(prev => ({
                        ...prev,
                        receivingAccount: {
                          ...prev.receivingAccount,
                          bankAccount: { ...prev.receivingAccount.bankAccount, holderId: text }
                        }
                      }))}
                      placeholder="20-12345678-9"
                      keyboardType="numeric"
                    />
                  </View>
                )}

                {/* Configuración de MercadoPago */}
                {paymentSettings.receivingAccount.accountType === 'mercadopago' && (
                  <View style={styles.accountDetails}>
                    <Text style={styles.formLabel}>Email de MercadoPago</Text>
                    <TextInput
                      style={styles.textInput}
                      value={paymentSettings.receivingAccount.mercadopago.email}
                      onChangeText={(text) => setPaymentSettings(prev => ({
                        ...prev,
                        receivingAccount: {
                          ...prev.receivingAccount,
                          mercadopago: { ...prev.receivingAccount.mercadopago, email: text }
                        }
                      }))}
                      placeholder="usuario@mercadopago.com"
                      keyboardType="email-address"
                    />
                    
                    <Text style={styles.formLabel}>Teléfono</Text>
                    <TextInput
                      style={styles.textInput}
                      value={paymentSettings.receivingAccount.mercadopago.phone}
                      onChangeText={(text) => setPaymentSettings(prev => ({
                        ...prev,
                        receivingAccount: {
                          ...prev.receivingAccount,
                          mercadopago: { ...prev.receivingAccount.mercadopago, phone: text }
                        }
                      }))}
                      placeholder="+54 11 1234-5678"
                      keyboardType="phone-pad"
                    />
                    
                    <Text style={styles.formLabel}>CVU</Text>
                    <TextInput
                      style={styles.textInput}
                      value={paymentSettings.receivingAccount.mercadopago.cvu}
                      onChangeText={(text) => setPaymentSettings(prev => ({
                        ...prev,
                        receivingAccount: {
                          ...prev.receivingAccount,
                          mercadopago: { ...prev.receivingAccount.mercadopago, cvu: text }
                        }
                      }))}
                      placeholder="0000003100012345678901"
                      keyboardType="numeric"
                    />
                  </View>
                )}

                {/* Configuración de PayPal */}
                {paymentSettings.receivingAccount.accountType === 'paypal' && (
                  <View style={styles.accountDetails}>
                    <Text style={styles.formLabel}>Email de PayPal</Text>
                    <TextInput
                      style={styles.textInput}
                      value={paymentSettings.receivingAccount.paypal.email}
                      onChangeText={(text) => setPaymentSettings(prev => ({
                        ...prev,
                        receivingAccount: {
                          ...prev.receivingAccount,
                          paypal: { ...prev.receivingAccount.paypal, email: text }
                        }
                      }))}
                      placeholder="usuario@paypal.com"
                      keyboardType="email-address"
                    />
                    
                    <Text style={styles.formLabel}>Nombre del Negocio</Text>
                    <TextInput
                      style={styles.textInput}
                      value={paymentSettings.receivingAccount.paypal.businessName}
                      onChangeText={(text) => setPaymentSettings(prev => ({
                        ...prev,
                        receivingAccount: {
                          ...prev.receivingAccount,
                          paypal: { ...prev.receivingAccount.paypal, businessName: text }
                        }
                      }))}
                      placeholder="Nombre de tu consultorio o negocio"
                    />
                  </View>
                )}

                {/* Configuración de Crypto */}
                {paymentSettings.receivingAccount.accountType === 'crypto' && (
                  <View style={styles.accountDetails}>
                    <Text style={styles.formLabel}>Dirección de la Wallet</Text>
                    <TextInput
                      style={styles.textInput}
                      value={paymentSettings.receivingAccount.crypto.walletAddress}
                      onChangeText={(text) => setPaymentSettings(prev => ({
                        ...prev,
                        receivingAccount: {
                          ...prev.receivingAccount,
                          crypto: { ...prev.receivingAccount.crypto, walletAddress: text }
                        }
                      }))}
                      placeholder="bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh"
                    />
                    
                    <Text style={styles.formLabel}>Red</Text>
                    <TextInput
                      style={styles.textInput}
                      value={paymentSettings.receivingAccount.crypto.network}
                      onChangeText={(text) => setPaymentSettings(prev => ({
                        ...prev,
                        receivingAccount: {
                          ...prev.receivingAccount,
                          crypto: { ...prev.receivingAccount.crypto, network: text }
                        }
                      }))}
                      placeholder="Bitcoin, Ethereum, etc."
                    />
                  </View>
                )}

                {/* Configuración de comisiones y programación de pagos */}
                <View style={styles.formSection}>
                  <Text style={styles.formLabel}>Configuración de Pagos</Text>
                  
                  <Text style={styles.formLabel}>Transferencias Automáticas</Text>
                  <TouchableOpacity
                    style={styles.switchOption}
                    onPress={() => setPaymentSettings(prev => ({
                      ...prev,
                      receivingAccount: {
                        ...prev.receivingAccount,
                        paymentSchedule: {
                          ...prev.receivingAccount.paymentSchedule,
                          automaticTransfers: !prev.receivingAccount.paymentSchedule.automaticTransfers
                        }
                      }
                    }))}
                  >
                    <Text style={styles.switchText}>Habilitar Transferencias Automáticas</Text>
                    <Ionicons
                      name={paymentSettings.receivingAccount.paymentSchedule.automaticTransfers ? "toggle" : "toggle-outline"}
                      size={24}
                      color={paymentSettings.receivingAccount.paymentSchedule.automaticTransfers ? "#4CAF50" : "#ccc"}
                    />
                  </TouchableOpacity>
                  
                  {paymentSettings.receivingAccount.paymentSchedule.automaticTransfers && (
                    <View style={styles.paymentScheduleSettings}>
                      <Text style={styles.formLabel}>Frecuencia de Transferencias</Text>
                      <View style={styles.radioGroup}>
                        <TouchableOpacity
                          style={styles.radioOption}
                          onPress={() => setPaymentSettings(prev => ({
                            ...prev,
                            receivingAccount: {
                              ...prev.receivingAccount,
                              paymentSchedule: {
                                ...prev.receivingAccount.paymentSchedule,
                                transferFrequency: 'daily'
                              }
                            }
                          }))}
                        >
                          <Ionicons
                            name={paymentSettings.receivingAccount.paymentSchedule.transferFrequency === 'daily' ? "radio-button-on" : "radio-button-off"}
                            size={20}
                            color="#667eea"
                          />
                          <Text style={styles.radioText}>Diaria</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.radioOption}
                          onPress={() => setPaymentSettings(prev => ({
                            ...prev,
                            receivingAccount: {
                              ...prev.receivingAccount,
                              paymentSchedule: {
                                ...prev.receivingAccount.paymentSchedule,
                                transferFrequency: 'weekly'
                              }
                            }
                          }))}
                        >
                          <Ionicons
                            name={paymentSettings.receivingAccount.paymentSchedule.transferFrequency === 'weekly' ? "radio-button-on" : "radio-button-off"}
                            size={20}
                            color="#667eea"
                          />
                          <Text style={styles.radioText}>Semanal</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.radioOption}
                          onPress={() => setPaymentSettings(prev => ({
                            ...prev,
                            receivingAccount: {
                              ...prev.receivingAccount,
                              paymentSchedule: {
                                ...prev.receivingAccount.paymentSchedule,
                                transferFrequency: 'monthly'
                              }
                            }
                          }))}
                        >
                          <Ionicons
                            name={paymentSettings.receivingAccount.paymentSchedule.transferFrequency === 'monthly' ? "radio-button-on" : "radio-button-off"}
                            size={20}
                            color="#667eea"
                          />
                          <Text style={styles.radioText}>Mensual</Text>
                        </TouchableOpacity>
                      </View>
                      
                      <Text style={styles.formLabel}>Monto Mínimo para Transferir</Text>
                      <TextInput
                        style={styles.textInput}
                        value={paymentSettings.receivingAccount.paymentSchedule.minimumAmount.toString()}
                        onChangeText={(text) => setPaymentSettings(prev => ({
                          ...prev,
                          receivingAccount: {
                            ...prev.receivingAccount,
                            paymentSchedule: {
                              ...prev.receivingAccount.paymentSchedule,
                              minimumAmount: parseInt(text) || 0
                            }
                          }
                        }))}
                        placeholder="5000"
                        keyboardType="numeric"
                      />
                      
                      {paymentSettings.receivingAccount.paymentSchedule.transferFrequency === 'weekly' && (
                        <>
                          <Text style={styles.formLabel}>Día de la Semana para Transferencias</Text>
                          <View style={styles.daySelector}>
                            {['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'].map((day, index) => (
                              <TouchableOpacity
                                key={day}
                                style={[
                                  styles.dayButton,
                                  paymentSettings.receivingAccount.paymentSchedule.transferDay === day && styles.dayButtonActive
                                ]}
                                onPress={() => setPaymentSettings(prev => ({
                                  ...prev,
                                  receivingAccount: {
                                    ...prev.receivingAccount,
                                    paymentSchedule: {
                                      ...prev.receivingAccount.paymentSchedule,
                                      transferDay: day
                                    }
                                  }
                                }))}
                              >
                                <Text style={[
                                  styles.dayButtonText,
                                  paymentSettings.receivingAccount.paymentSchedule.transferDay === day && styles.dayButtonTextActive
                                ]}>
                                  {day.charAt(0).toUpperCase() + day.slice(1)}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </>
                      )}
                    </View>
                  )}
                </View>
              </View>

              {/* Sección de Notificaciones */}
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Notificaciones de Pago</Text>
                <TouchableOpacity
                  style={styles.switchOption}
                  onPress={() => setPaymentSettings(prev => ({
                    ...prev,
                    paymentNotifications: { ...prev.paymentNotifications, successful: !prev.paymentNotifications.successful }
                  }))}
                >
                  <Text style={styles.switchText}>Pagos Exitosos</Text>
                  <Ionicons
                    name={paymentSettings.paymentNotifications.successful ? "toggle" : "toggle-outline"}
                    size={24}
                    color={paymentSettings.paymentNotifications.successful ? "#4CAF50" : "#ccc"}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.switchOption}
                  onPress={() => setPaymentSettings(prev => ({
                    ...prev,
                    paymentNotifications: { ...prev.paymentNotifications, failed: !prev.paymentNotifications.failed }
                  }))}
                >
                  <Text style={styles.switchText}>Pagos Fallidos</Text>
                  <Ionicons
                    name={paymentSettings.paymentNotifications.failed ? "toggle" : "toggle-outline"}
                    size={24}
                    color={paymentSettings.paymentNotifications.failed ? "#4CAF50" : "#ccc"}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.switchOption}
                  onPress={() => setPaymentSettings(prev => ({
                    ...prev,
                    paymentNotifications: { ...prev.paymentNotifications, pending: !prev.paymentNotifications.pending }
                  }))}
                >
                  <Text style={styles.switchText}>Pagos Pendientes</Text>
                  <Ionicons
                    name={paymentSettings.paymentNotifications.pending ? "toggle" : "toggle-outline"}
                    size={24}
                    color={paymentSettings.paymentNotifications.pending ? "#4CAF50" : "#ccc"}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.switchOption}
                  onPress={() => setPaymentSettings(prev => ({
                    ...prev,
                    paymentNotifications: { ...prev.paymentNotifications, refunds: !prev.paymentNotifications.refunds }
                  }))}
                >
                  <Text style={styles.switchText}>Reembolsos</Text>
                  <Ionicons
                    name={paymentSettings.paymentNotifications.refunds ? "toggle" : "toggle-outline"}
                    size={24}
                    color={paymentSettings.paymentNotifications.refunds ? "#4CAF50" : "#ccc"}
                  />
                </TouchableOpacity>
              </View>
            </ScrollView>

            <View style={[styles.modalActions, { paddingBottom: modalActionPaddingBottom }]}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowPaymentSettingsModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={() => {
                  Alert.alert('✅ Configuración Guardada', 'La configuración de pagos ha sido guardada exitosamente.');
                  setShowPaymentSettingsModal(false);
                }}
              >
                <Text style={styles.saveButtonText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Historial de Señas */}
      <Modal
        visible={showDepositHistoryModal}
        transparent={true}
        onRequestClose={() => setShowDepositHistoryModal(false)}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Historial de Señas</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowDepositHistoryModal(false)}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
              {/* Resumen de Señas */}
              <View style={styles.depositSummary}>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryTitle}>Total de Señas</Text>
                  <Text style={styles.summaryAmount}>${depositHistory.reduce((sum, item) => sum + item.depositAmount, 0).toLocaleString()}</Text>
                  <Text style={styles.summarySubtitle}>{depositHistory.length} transacciones</Text>
                </View>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryTitle}>Total de Citas</Text>
                  <Text style={styles.summaryAmount}>${depositHistory.reduce((sum, item) => sum + item.totalAmount, 0).toLocaleString()}</Text>
                  <Text style={styles.summarySubtitle}>Valor total</Text>
                </View>
              </View>

              {/* Lista de Señas */}
              <View style={styles.depositList}>
                <Text style={styles.sectionTitle}>Transacciones Recientes</Text>
                {depositHistory.map((deposit) => (
                  <View key={deposit.id} style={styles.depositItem}>
                    <View style={styles.depositHeader}>
                      <View style={styles.depositInfo}>
                        <Text style={styles.patientName}>{deposit.patientName}</Text>
                        <Text style={styles.serviceName}>{deposit.service}</Text>
                        <Text style={styles.appointmentDate}>
                          {new Date(deposit.date).toLocaleDateString('es-ES', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })} a las {deposit.time}
                        </Text>
                      </View>
                      <View style={styles.depositAmounts}>
                        <Text style={styles.depositAmount}>${deposit.depositAmount.toLocaleString()}</Text>
                        <Text style={styles.totalAmount}>${deposit.totalAmount.toLocaleString()}</Text>
                    </View>
                  </View>
                    
                    <View style={styles.depositDetails}>
                      <View style={styles.detailRow}>
                        <Ionicons name="calendar" size={16} color="#667eea" />
                        <Text style={styles.detailText}>Cita: {deposit.date}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Ionicons name="time" size={16} color="#667eea" />
                        <Text style={styles.detailText}>Hora: {deposit.time}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Ionicons name="card" size={16} color="#667eea" />
                        <Text style={styles.detailText}>Método: {deposit.paymentMethod}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                        <Text style={styles.detailText}>Estado: {deposit.status}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Ionicons name="calendar-outline" size={16} color="#667eea" />
                        <Text style={styles.detailText}>Pago: {new Date(deposit.paymentDate).toLocaleDateString('es-ES')}</Text>
                      </View>
                    </View>

                    {deposit.notes && (
                      <View style={styles.notesSection}>
                        <Text style={styles.notesLabel}>Notas:</Text>
                        <Text style={styles.notesText}>{deposit.notes}</Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            </ScrollView>

            <View style={[styles.modalActions, { paddingBottom: modalActionPaddingBottom }]}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowDepositHistoryModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cerrar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.exportButton]}
                onPress={() => {
                  Alert.alert('📊 Exportar', 'Funcionalidad de exportación en desarrollo');
                }}
              >
                <Ionicons name="download-outline" size={20} color="#667eea" />
                <Text style={styles.exportButtonText}>Exportar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Configuración de Consultorio */}
      <Modal
        visible={showClinicSettingsModal}
        transparent={true}
        onRequestClose={() => setShowClinicSettingsModal(false)}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Configuración de Consultorio</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowClinicSettingsModal(false)}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
              {/* Selector de Consultorio */}
              <View style={styles.clinicSelector}>
                <Text style={styles.sectionTitle}>Consultorio Activo</Text>
                <View style={styles.clinicPickerContainer}>
                  <TouchableOpacity
                    style={styles.clinicPickerButton}
                    onPress={() => setShowClinicSelectorModal(true)}
                  >
                    <Text style={styles.clinicPickerText}>{selectedClinic.clinicName}</Text>
                    <Ionicons name="chevron-down" size={20} color="#667eea" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.addClinicButton}
                    onPress={handleAddClinic}
                  >
                    <Ionicons name="add" size={20} color="white" />
                    <Text style={styles.addClinicButtonText}>Nuevo</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Información Básica del Consultorio */}
              <View style={styles.clinicSection}>
                <Text style={styles.sectionTitle}>Información Básica</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Nombre del Consultorio *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={selectedClinic.clinicName}
                    onChangeText={(text) => updateClinicField('clinicName', text)}
                    placeholder="Nombre del consultorio"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Dirección</Text>
                  <TextInput
                    style={styles.textInput}
                    value={selectedClinic.address}
                    onChangeText={(text) => updateClinicField('address', text)}
                    placeholder="Dirección completa"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={selectedClinic.email}
                    onChangeText={(text) => updateClinicField('email', text)}
                    placeholder="Email del consultorio"
                    keyboardType="email-address"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Teléfono *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={selectedClinic.phone}
                    onChangeText={(text) => updateClinicField('phone', text)}
                    placeholder="Teléfono del consultorio"
                    keyboardType="phone-pad"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Sitio Web</Text>
                  <TextInput
                    style={styles.textInput}
                    value={selectedClinic.website}
                    onChangeText={(text) => updateClinicField('website', text)}
                    placeholder="www.tuconsultorio.com"
                  />
                </View>
              </View>

              {/* Horarios de Atención Telefónica */}
              <View style={styles.clinicSection}>
                <Text style={styles.sectionTitle}>Horarios de Atención Telefónica</Text>
                
                <View style={styles.timeRangeContainer}>
                  <View style={styles.timeInputGroup}>
                    <Text style={styles.inputLabel}>Hora de Inicio</Text>
                    <TouchableOpacity
                      style={styles.timePickerButton}
                      onPress={() => {
                        // Aquí se implementaría un selector de hora
                        Alert.alert('Hora de Inicio', 'Selector de hora en desarrollo');
                      }}
                    >
                      <Text style={styles.timePickerText}>{selectedClinic.phoneHours.start}</Text>
                      <Ionicons name="time" size={20} color="#667eea" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.timeInputGroup}>
                    <Text style={styles.inputLabel}>Hora de Cierre</Text>
                    <TouchableOpacity
                      style={styles.timePickerButton}
                      onPress={() => {
                        // Aquí se implementaría un selector de hora
                        Alert.alert('Hora de Cierre', 'Selector de hora en desarrollo');
                      }}
                    >
                      <Text style={styles.timePickerText}>{selectedClinic.phoneHours.end}</Text>
                      <Ionicons name="time" size={20} color="#667eea" />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.daysSelector}>
                  <Text style={styles.inputLabel}>Días de Atención</Text>
                  <View style={styles.daysGrid}>
                    {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day, index) => {
                      const dayKey = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'][index];
                      const isSelected = selectedClinic.phoneHours.days.includes(dayKey);
                      
                      return (
                        <TouchableOpacity
                          key={day}
                          style={[styles.dayButton, isSelected && styles.dayButtonSelected]}
                          onPress={() => {
                            const newDays = isSelected
                              ? selectedClinic.phoneHours.days.filter(d => d !== dayKey)
                              : [...selectedClinic.phoneHours.days, dayKey];
                            updateClinicField('phoneHours', { ...selectedClinic.phoneHours, days: newDays });
                          }}
                        >
                          <Text style={[styles.dayButtonText, isSelected && styles.dayButtonTextSelected]}>
                            {day}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </View>

              {/* Métodos de Pago */}
              <View style={styles.clinicSection}>
                <Text style={styles.sectionTitle}>Métodos de Pago Aceptados</Text>
                
                <View style={styles.paymentMethodsContainer}>
                  {['Efectivo', 'Tarjeta de crédito', 'Tarjeta de débito', 'Transferencia', 'Mercado Pago'].map((method) => {
                    const isSelected = selectedClinic.paymentMethods.includes(method);
                    
                    return (
                      <TouchableOpacity
                        key={method}
                        style={[styles.paymentMethodButton, isSelected && styles.paymentMethodButtonSelected]}
                        onPress={() => {
                          const newMethods = isSelected
                            ? selectedClinic.paymentMethods.filter(m => m !== method)
                            : [...selectedClinic.paymentMethods, method];
                          updateClinicField('paymentMethods', newMethods);
                        }}
                      >
                        <Ionicons 
                          name={isSelected ? "checkmark-circle" : "ellipse-outline"} 
                          size={20} 
                          color={isSelected ? "#4CAF50" : "#ccc"} 
                        />
                        <Text style={[styles.paymentMethodText, isSelected && styles.paymentMethodTextSelected]}>
                          {method}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Configuraciones Adicionales */}
              <View style={styles.clinicSection}>
                <Text style={styles.sectionTitle}>Configuraciones Adicionales</Text>
                
                <View style={styles.settingRow}>
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingLabel}>Emitir Recibos</Text>
                    <Text style={styles.settingDescription}>Generar recibos automáticamente para cada cita</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.toggleButton, selectedClinic.receipts && styles.toggleButtonActive]}
                    onPress={() => updateClinicField('receipts', !selectedClinic.receipts)}
                  >
                    <View style={[styles.toggleCircle, selectedClinic.receipts && styles.toggleCircleActive]} />
                  </TouchableOpacity>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Contacto de Emergencia</Text>
                  <TextInput
                    style={styles.textInput}
                    value={selectedClinic.emergencyContact}
                    onChangeText={(text) => updateClinicField('emergencyContact', text)}
                    placeholder="Teléfono de emergencia"
                    keyboardType="phone-pad"
                  />
                </View>
              </View>
            </ScrollView>

            <View style={[styles.modalActions, { paddingBottom: modalActionPaddingBottom }]}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowClinicSettingsModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSaveClinicSettings}
              >
                <Text style={styles.saveButtonText}>Guardar Cambios</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Selector de Consultorio */}
      <Modal
        visible={showClinicSelectorModal}
        transparent={true}
        onRequestClose={() => setShowClinicSelectorModal(false)}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🏥 Seleccionar Consultorio</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowClinicSelectorModal(false)}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
              {/* Lista de Consultorios */}
              <View style={styles.clinicListContainer}>
                {clinics.map((clinic, index) => (
                  <TouchableOpacity
                    key={clinic.id}
                    style={[
                      styles.clinicListItem,
                      index === selectedClinicIndex && styles.clinicListItemSelected
                    ]}
                    onPress={() => handleSelectClinic(index)}
                  >
                    <View style={styles.clinicListItemContent}>
                      <View style={styles.clinicListItemHeader}>
                        <Text style={styles.clinicListItemName}>{clinic.clinicName}</Text>
                        {index === selectedClinicIndex && (
                          <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                        )}
                      </View>
                      
                      {clinic.address && (
                        <Text style={styles.clinicListItemAddress}>
                          📍 {clinic.address}
                        </Text>
                      )}
                      
                      {clinic.phone && (
                        <Text style={styles.clinicListItemPhone}>
                          📞 {clinic.phone}
                        </Text>
                      )}
                      
                      {clinic.email && (
                        <Text style={styles.clinicListItemEmail}>
                          ✉️ {clinic.email}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Botón para agregar nuevo consultorio */}
              <TouchableOpacity
                style={styles.addClinicFromSelectorButton}
                onPress={() => {
                  setShowClinicSelectorModal(false);
                  handleAddClinic();
                }}
              >
                <Ionicons name="add-circle-outline" size={24} color="#667eea" />
                <Text style={styles.addClinicFromSelectorButtonText}>Agregar Nuevo Consultorio</Text>
              </TouchableOpacity>
            </ScrollView>

            <View style={[styles.modalActions, { paddingBottom: modalActionPaddingBottom }]}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowClinicSelectorModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Mis Reseñas */}
      <Modal
        visible={showMyReviewsModal}
        transparent={true}
        onRequestClose={() => setShowMyReviewsModal(false)}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>⭐ Mis Reseñas</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowMyReviewsModal(false)}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
              {/* Header con estadísticas */}
              <View style={styles.reviewsHeader}>
                <View style={styles.reviewsStats}>
                  <View style={styles.reviewStatItem}>
                    <Text style={styles.reviewStatNumber}>{reviews.length}</Text>
                    <Text style={styles.reviewStatLabel}>Total de Reseñas</Text>
                  </View>
                  <View style={styles.reviewStatItem}>
                    <Text style={styles.reviewStatNumber}>
                      {reviews.length > 0 
                        ? Math.round(reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length * 10) / 10
                        : 0
                      }
                    </Text>
                    <Text style={styles.reviewStatLabel}>Promedio</Text>
                  </View>
                </View>
              </View>

              {/* Lista de reseñas */}
              {reviews.length === 0 ? (
                <View style={styles.emptyReviewsContainer}>
                  <Ionicons name="star-outline" size={64} color="#ccc" />
                  <Text style={styles.emptyReviewsTitle}>No tienes reseñas aún</Text>
                  <Text style={styles.emptyReviewsSubtitle}>
                    Cuando hagas reseñas de tus citas, aparecerán aquí
                  </Text>
                </View>
              ) : (
                <View style={styles.reviewsList}>
                  {reviews.map((review) => (
                    <View key={review.id} style={styles.reviewCard}>
                      {/* Header de la reseña */}
                      <View style={styles.reviewHeader}>
                        <View style={styles.reviewHeaderLeft}>
                          <View style={styles.reviewStars}>
                            {renderStars(review.rating, 18)}
                          </View>
                          <Text style={styles.reviewDate}>
                            {new Date(review.createdAt).toLocaleDateString('es-ES', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.reviewActionsButton}
                          onPress={() => handleDeleteReview(review.id)}
                        >
                          <Ionicons name="ellipsis-vertical" size={20} color="#666" />
                        </TouchableOpacity>
                      </View>

                      {/* Información del profesional */}
                      <View style={styles.reviewProfessionalInfo}>
                        <View style={styles.reviewProfessionalAvatar}>
                          <Ionicons name="person" size={24} color="#667eea" />
                        </View>
                        <View style={styles.reviewProfessionalDetails}>
                          <Text style={styles.reviewProfessionalName}>
                            {review.professionalName}
                          </Text>
                          <Text style={styles.reviewService}>
                            {review.service}
                          </Text>
                        </View>
                      </View>

                      {/* Comentario de la reseña */}
                      {review.comment && (
                        <View style={styles.reviewComment}>
                          <Text style={styles.reviewCommentText}>
                            &quot;{review.comment}&quot;
                          </Text>
                        </View>
                      )}

                      {/* Información de la cita */}
                      <View style={styles.reviewAppointmentInfo}>
                        <View style={styles.reviewAppointmentItem}>
                          <Ionicons name="calendar" size={16} color="#4CAF50" />
                          <Text style={styles.reviewAppointmentText}>
                            {review.appointmentDate}
                          </Text>
                        </View>
                        <View style={styles.reviewAppointmentItem}>
                          <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                          <Text style={styles.reviewAppointmentText}>
                            Cita Completada
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal para Agregar Nueva Reseña */}
      <Modal
        visible={showAddReviewModal}
        transparent={true}
        onRequestClose={() => setShowAddReviewModal(false)}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>⭐ Nueva Reseña</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowAddReviewModal(false)}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
              {/* Información de la cita seleccionada */}
              {selectedAppointment && (
                <View style={styles.selectedAppointmentCard}>
                  <Text style={styles.selectedAppointmentTitle}>Cita a Reseñar</Text>
                  <View style={styles.selectedAppointmentInfo}>
                    <View style={styles.selectedAppointmentRow}>
                      <Ionicons name="person" size={16} color="#667eea" />
                      <Text style={styles.selectedAppointmentText}>
                        {selectedAppointment.professional}
                      </Text>
                    </View>
                    <View style={styles.selectedAppointmentRow}>
                      <Ionicons name="medical" size={16} color="#4CAF50" />
                      <Text style={styles.selectedAppointmentText}>
                        {selectedAppointment.service}
                      </Text>
                    </View>
                    <View style={styles.selectedAppointmentRow}>
                      <Ionicons name="calendar" size={16} color="#FF6B35" />
                      <Text style={styles.selectedAppointmentText}>
                        {selectedAppointment.date} - {selectedAppointment.time}
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Selector de calificación */}
              <View style={styles.ratingSection}>
                <Text style={styles.ratingSectionTitle}>Calificación</Text>
                <View style={styles.ratingStars}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity
                      key={star}
                      style={styles.ratingStarButton}
                      onPress={() => setNewReview(prev => ({ ...prev, rating: star as 1 | 2 | 3 | 4 | 5 }))}
                    >
                      <Ionicons
                        name={star <= newReview.rating ? "star" : "star-outline"}
                        size={32}
                        color={star <= newReview.rating ? "#FFD700" : "#ccc"}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.ratingText}>
                  {newReview.rating === 1 && "Muy Malo"}
                  {newReview.rating === 2 && "Malo"}
                  {newReview.rating === 3 && "Regular"}
                  {newReview.rating === 4 && "Bueno"}
                  {newReview.rating === 5 && "Excelente"}
                </Text>
              </View>

              {/* Campo de comentario */}
              <View style={styles.commentSection}>
                <Text style={styles.commentSectionTitle}>Comentario</Text>
                <TextInput
                  style={styles.commentTextInput}
                  value={newReview.comment}
                  onChangeText={(text) => setNewReview(prev => ({ ...prev, comment: text }))}
                  placeholder="Comparte tu experiencia con este profesional..."
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
                <Text style={styles.commentCharCount}>
                  {newReview.comment.length}/1000 caracteres
                </Text>
              </View>

              {/* Botones de acción */}
              <View style={styles.reviewModalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setShowAddReviewModal(false);
                    setSelectedAppointment(null);
                    setNewReview({ rating: 5, comment: '' });
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={handleSubmitReview}
                  disabled={!newReview.comment.trim()}
                >
                  <Text style={styles.saveButtonText}>Enviar Reseña</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <MedicalAuthorizationModal
        visible={showMedicalAuthorizationModal}
        onClose={() => setShowMedicalAuthorizationModal(false)}
      />

      {/* Modal de Profesionales Favoritos */}
      <Modal
        visible={showFavoritesModal}
        transparent={true}
        onRequestClose={() => setShowFavoritesModal(false)}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>❤️ Profesionales Favoritos</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowFavoritesModal(false)}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
              {/* Header con estadísticas */}
              <View style={styles.favoritesHeader}>
                <View style={styles.favoritesStats}>
                  <View style={styles.favoriteStatItem}>
                    <Text style={styles.favoriteStatNumber}>{favoriteProfessionals.length}</Text>
                    <Text style={styles.favoriteStatLabel}>Total de Favoritos</Text>
                  </View>
                  <View style={styles.favoriteStatItem}>
                    <Text style={styles.favoriteStatNumber}>
                      {favoriteProfessionals.filter(p => p.isOnline).length}
                    </Text>
                    <Text style={styles.favoriteStatLabel}>En Línea</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.addFavoriteButton}
                  onPress={handleAddFavorite}
                >
                  <Ionicons name="add" size={20} color="white" />
                  <Text style={styles.addFavoriteButtonText}>Agregar Favorito</Text>
                </TouchableOpacity>
              </View>

              {/* Filtros de búsqueda */}
              <View style={styles.favoritesFilters}>
                <View style={styles.searchContainer}>
                  <Ionicons name="search" size={20} color="#666" />
                  <TextInput
                    style={styles.searchInput}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Buscar profesionales..."
                    placeholderTextColor="#999"
                  />
                </View>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={styles.categoryScroll}
                >
                  {categories.map((category) => (
                    <TouchableOpacity
                      key={category}
                      style={[
                        styles.categoryButton,
                        selectedCategory === category && styles.categoryButtonActive
                      ]}
                      onPress={() => setSelectedCategory(category)}
                    >
                      <Text style={[
                        styles.categoryButtonText,
                        selectedCategory === category && styles.categoryButtonTextActive
                      ]}>
                        {category}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Lista de profesionales favoritos */}
              {filteredFavoriteProfessionals.length === 0 ? (
                <View style={styles.emptyFavoritesContainer}>
                  <Ionicons name="heart-outline" size={64} color="#ccc" />
                  <Text style={styles.emptyFavoritesTitle}>
                    {searchQuery || selectedCategory !== 'Todas' 
                      ? 'No se encontraron resultados' 
                      : 'No tienes favoritos aún'
                    }
                  </Text>
                  <Text style={styles.emptyFavoritesSubtitle}>
                    {searchQuery || selectedCategory !== 'Todas'
                      ? 'Intenta con otros términos de búsqueda'
                      : 'Agrega profesionales a tus favoritos para acceder rápido a ellos'
                    }
                  </Text>
                </View>
              ) : (
                <View style={styles.favoritesList}>
                  {filteredFavoriteProfessionals.map((professional) => (
                    <View key={professional.id} style={styles.favoriteCard}>
                      {/* Header de la tarjeta */}
                      <View style={styles.favoriteCardHeader}>
                        <View style={styles.favoriteCardHeaderLeft}>
                          <View style={styles.favoriteAvatar}>
                            <Text style={styles.favoriteAvatarText}>{professional.avatar}</Text>
                          </View>
                          <View style={styles.favoriteOnlineStatus}>
                            <View style={[
                              styles.onlineIndicator,
                              { backgroundColor: professional.isOnline ? '#10B981' : '#9CA3AF' }
                            ]} />
                            <Text style={styles.onlineStatusText}>
                              {professional.isOnline ? 'En línea' : professional.lastSeen}
                            </Text>
                          </View>
                        </View>
                        <TouchableOpacity
                          style={styles.favoriteActionsButton}
                          onPress={() => handleRemoveFavorite(professional.id)}
                        >
                          <Ionicons name="heart" size={24} color="#E91E63" />
                        </TouchableOpacity>
                      </View>

                      {/* Información del profesional */}
                      <View style={styles.favoriteProfessionalInfo}>
                        <Text style={styles.favoriteProfessionalName}>
                          {professional.name}
                        </Text>
                        <Text style={styles.favoriteProfessionalService}>
                          {professional.service}
                        </Text>
                        <Text style={styles.favoriteProfessionalSpecialization}>
                          {professional.specialization}
                        </Text>
                      </View>

                      {/* Calificación y reseñas */}
                      <View style={styles.favoriteRatingSection}>
                        <View style={styles.favoriteRating}>
                          <View style={styles.favoriteStars}>
                            {renderStars(Math.round(professional.rating), 16)}
                          </View>
                          <Text style={styles.favoriteRatingText}>
                            {professional.rating} ({professional.totalReviews} reseñas)
                          </Text>
                        </View>
                      </View>

                      {/* Información de consulta */}
                      <View style={styles.favoriteConsultationInfo}>
                        <View style={styles.favoriteConsultationItem}>
                          <Ionicons name="time" size={16} color="#4CAF50" />
                          <Text style={styles.favoriteConsultationText}>
                            {professional.consultationDuration}
                          </Text>
                        </View>
                        <View style={styles.favoriteConsultationItem}>
                          <Ionicons name="cash" size={16} color="#FF6B35" />
                          <Text style={styles.favoriteConsultationText}>
                            ${professional.consultationPrice.toLocaleString()}
                          </Text>
                        </View>
                        <View style={styles.favoriteConsultationItem}>
                          <Ionicons name="location" size={16} color="#667eea" />
                          <Text style={styles.favoriteConsultationText}>
                            {professional.location}
                          </Text>
                        </View>
                      </View>

                      {/* Descripción */}
                      <Text style={styles.favoriteDescription}>
                        {professional.description}
                      </Text>

                      {/* Disponibilidad */}
                      <View style={styles.favoriteAvailability}>
                        <Ionicons name="calendar" size={16} color="#9CA3AF" />
                        <Text style={styles.favoriteAvailabilityText}>
                          {professional.availability}
                        </Text>
                      </View>

                      {/* Botones de acción */}
                      <View style={styles.favoriteActions}>
                        <TouchableOpacity
                          style={[styles.favoriteActionButton, styles.bookAppointmentButton]}
                          onPress={() => handleBookAppointment(professional)}
                        >
                          <Ionicons name="calendar" size={16} color="white" />
                          <Text style={styles.bookAppointmentButtonText}>Reservar Cita</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.favoriteActionButton, styles.contactButton]}
                          onPress={() => handleContactProfessional(professional)}
                        >
                          <Ionicons name="chatbubble" size={16} color="#667eea" />
                          <Text style={styles.contactButtonText}>Contactar</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal para Agregar Nuevo Favorito */}
      <Modal
        visible={showAddFavoriteModal}
        transparent={true}
        onRequestClose={() => setShowAddFavoriteModal(false)}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>❤️ Agregar a Favoritos</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowAddFavoriteModal(false)}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
              <View style={styles.addFavoriteContent}>
                <Ionicons name="search" size={64} color="#E91E63" />
                <Text style={styles.addFavoriteTitle}>Buscar Profesionales</Text>
                <Text style={styles.addFavoriteSubtitle}>
                  Para agregar profesionales a tus favoritos, búscalos en la sección de exploración de profesionales
                </Text>
                
                <TouchableOpacity
                  style={styles.exploreProfessionalsButton}
                  onPress={() => {
                    setShowAddFavoriteModal(false);
                    Alert.alert('Explorar', 'Redirigiendo a exploración de profesionales...');
                  }}
                >
                  <Ionicons name="compass" size={20} color="white" />
                  <Text style={styles.exploreProfessionalsButtonText}>Explorar Profesionales</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#667eea',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  profileEmail: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 5,
  },
  profileType: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 3,
  },
  profileService: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    fontStyle: 'italic',
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuItemText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 15,
    fontWeight: '500',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ff6b6b',
    paddingVertical: 15,
    borderRadius: 10,
    marginTop: 10,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginLeft: 10,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  footerText: {
    fontSize: 14,
    color: '#999',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 0,
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 0,
    width: '100%',
    height: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    width: '100%',
    backgroundColor: '#fafafa',
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  modalContent: {
    flex: 1,
    backgroundColor: 'white',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  modalScrollContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  formSection: {
    marginBottom: 40,
    paddingHorizontal: 4,
  },
  formLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 18,
    color: '#333',
    backgroundColor: '#f8f9fa',
    minHeight: 56,
  },
  serviceSelectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#f8f9fa',
    minHeight: 56,
  },
  serviceSelectorText: {
    fontSize: 18,
    color: '#333',
  },
  serviceSelectorPlaceholder: {
    color: '#999',
  },
  serviceSelectorButtonDisabled: {
    backgroundColor: '#f0f0f0',
    borderColor: '#ccc',
  },
  formNote: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  userTypeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    minHeight: 56,
  },
  userTypeText: {
    fontSize: 18,
    color: '#333',
    marginLeft: 12,
    fontWeight: '500',
  },
  userTypeNote: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
    marginBottom: 0,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fafafa',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
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

  radioGroup: {
    marginTop: 10,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  radioText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 10,
  },
  switchOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  switchText: {
    fontSize: 16,
    color: '#333',
  },
  resetButton: {
    backgroundColor: '#FF9800',
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  privacyModalActions: {
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fafafa',
    gap: 10,
  },
  privacyPrimaryActions: {
    flexDirection: 'row',
    gap: 10,
  },
  privacyActionButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  privacyResetButton: {
    width: '100%',
    minHeight: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
  },
  searchIcon: {
    marginLeft: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  clearButton: {
    marginRight: 16,
    padding: 4,
  },
  categoryContainer: {
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  categoryScrollContainer: {
    paddingRight: 20,
  },
  categoryButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 10,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  categoryButtonActive: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  categoryButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  categoryButtonTextActive: {
    color: 'white',
  },
  servicesContainer: {
    flex: 1,
  },
  servicesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
    paddingHorizontal: 20,
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  serviceItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  serviceIcon: {
    marginRight: 12,
  },
  serviceItemText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  servicesList: {
    maxHeight: 300,
    paddingHorizontal: 20,
  },
  servicesListContent: {
    paddingBottom: 20,
  },
  patientSelectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: '#f8f9fa',
  },
  patientSelectorText: {
    fontSize: 16,
    color: '#333',
  },
  patientSelectorPlaceholder: {
    color: '#999',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  
  // Nuevos estilos para el modal mejorado de pacientes
  modalHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  patientsStatsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  patientsStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    gap: 8,
  },
  patientsStatsText: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '600',
  },
  patientItemAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  patientDetails: {
    marginTop: 4,
    gap: 4,
  },
  patientDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  patientSelectIndicator: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
  },
  
  // Nuevos estilos para el botón de agregar paciente
  newPatientButtonContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  newPatientButton: {
    backgroundColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 24,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 0,
    minWidth: 160,
  },
  newPatientButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  newPatientIconWrapper: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  newPatientButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  patientsList: {
    maxHeight: 300,
    paddingHorizontal: 20,
  },
  patientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  patientEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  patientPhone: {
    fontSize: 14,
    color: '#999',
  },
  noServicesContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  noServicesText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  noServicesSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
  // Estilos para el modal de configuración de pagos
  cardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: '#f8f9fa',
  },
  cardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardDetails: {
    marginLeft: 15,
  },
  cardText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  cardExpiry: {
    fontSize: 14,
    color: '#666',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  defaultBadge: {
    backgroundColor: '#4CAF50',
    color: 'white',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 10,
  },
  defaultBadgeText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '600',
  },
  cardActionButton: {
    padding: 8,
    marginLeft: 5,
  },
  addCardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderWidth: 2,
    borderColor: '#9C27B0',
    borderStyle: 'dashed',
    borderRadius: 8,
    marginTop: 10,
  },
  addCardText: {
    fontSize: 16,
    color: '#9C27B0',
    fontWeight: '600',
    marginLeft: 10,
  },
  autoPaymentSettings: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  // Estilos para la cuenta receptora
  accountTypeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  accountTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    marginBottom: 10,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  accountTypeButtonActive: {
    backgroundColor: '#9C27B0',
    borderColor: '#9C27B0',
  },
  accountTypeButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    marginLeft: 8,
  },
  accountTypeButtonTextActive: {
    color: 'white',
  },
  accountDetails: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  paymentScheduleSettings: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  daySelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  dayButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  dayButtonActive: {
    backgroundColor: '#9C27B0',
    borderColor: '#9C27B0',
  },
  dayButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  dayButtonTextActive: {
    color: 'white',
  },



  // Estilos para el header del catálogo de pacientes
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#667eea',
    marginLeft: 8,
  },
  headerSpacer: {
    width: 80, // Mismo ancho que el botón de volver para centrar el título
  },
  
  // Estilos para el selector de fecha
  dateSelectorButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateSelectorText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  dateSelectorPlaceholder: {
    color: '#999',
  },
  
  // Estilos para el modal del calendario
  calendarModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarModalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  calendarTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  calendarNavButton: {
    padding: 8,
  },
  calendarMonthYear: {
    fontSize: 16,
    fontWeight: '600',
    color: '#667eea',
  },
  weekDaysRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  weekDayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },

  
  // Estilos para el selector de horarios
  timeSelectorButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeSelectorButtonDisabled: {
    backgroundColor: '#f8f9fa',
    borderColor: '#e0e0e0',
  },
  timeSelectorText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  timeSelectorPlaceholder: {
    color: '#999',
  },
  timeSelectorSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  timeSlotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  timeSlotButton: {
    width: '48%',
    backgroundColor: '#e8f4fd',
    borderWidth: 1,
    borderColor: '#667eea',
    borderRadius: 8,
    paddingVertical: 15,
    paddingHorizontal: 10,
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeSlotText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#667eea',
  },
  
  // Estilos para el modal de pago
  paymentSummary: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  paymentSummaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  paymentSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  paymentSummaryLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  paymentSummaryValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  depositSection: {
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 16,
    backgroundColor: '#e8f4fd',
    borderRadius: 12,
  },
  depositTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  depositAmount: {
    fontSize: 32,
    fontWeight: '900',
    color: '#4CAF50',
    marginBottom: 4,
  },
  depositNote: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  paymentForm: {
    paddingHorizontal: 10,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  paymentActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: 'white',
  },
  
  // Estilos para el modal de precios
  pricingForm: {
    paddingHorizontal: 20,
  },

  depositPreview: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    marginBottom: 20,
  },
  depositPreviewTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  depositPreviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  depositPreviewLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  depositPreviewValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  depositPreviewAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4CAF50',
  },
  pricingActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: 'white',
  },
  
  // Estilos para el modal de reserva del cliente
  clientBookingForm: {
    paddingHorizontal: 20,
  },
  depositInfo: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    marginBottom: 20,
  },
  depositInfoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  depositInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  depositInfoLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  depositInfoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  depositInfoAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4CAF50',
  },
  depositInfoNote: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 8,
    textAlign: 'center',
  },
  clientBookingActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: 'white',
  },
  
  // Estilos para los selectores
  selectorButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 12,
  },
  selectorText: {
    color: '#333',
    fontSize: 16,
  },
  selectorPlaceholder: {
    color: '#999',
    fontSize: 16,
  },
  
  // Estilos para las listas de servicios y profesionales
  serviceList: {
    paddingHorizontal: 20,
  },

  professionalList: {
    paddingHorizontal: 20,
  },
  professionalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  professionalInfo: {
    flex: 1,
  },
  professionalName: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
    marginBottom: 4,
  },
  professionalService: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  professionalDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  professionalRating: {
    fontSize: 14,
    color: '#FF9800',
    fontWeight: '500',
  },
  professionalPrice: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  noProfessionals: {
    padding: 40,
    alignItems: 'center',
  },
  noProfessionalsText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  
  // Estilos para el calendario del cliente
  calendarNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  calendarMonthText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textTransform: 'capitalize',
  },
  calendarGrid: {
    padding: 20,
  },
  calendarWeekDays: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  calendarWeekDay: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    paddingVertical: 8,
  },
  calendarDays: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 1,
  },
  calendarDayOtherMonth: {
    opacity: 0.3,
  },
  calendarDayAvailable: {
    backgroundColor: '#e8f5e8',
    borderRadius: 8,
  },
  calendarDayUnavailable: {
    backgroundColor: '#f5e5e5',
    borderRadius: 8,
  },
  calendarDaySelected: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
  },
  calendarDayText: {
    fontSize: 16,
    fontWeight: '500',
  },
  calendarDayTextOtherMonth: {
    color: '#ccc',
  },
  calendarDayTextAvailable: {
    color: '#4CAF50',
  },
  calendarDayTextUnavailable: {
    color: '#f44336',
  },
  calendarDayTextSelected: {
    color: 'white',
    fontWeight: '700',
  },
  calendarLegend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#f8f9fa',
  },
  calendarLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  calendarLegendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  calendarLegendAvailable: {
    backgroundColor: '#4CAF50',
  },
  calendarLegendUnavailable: {
    backgroundColor: '#f44336',
  },
  calendarLegendSelected: {
    backgroundColor: '#4CAF50',
  },
  calendarLegendText: {
    fontSize: 12,
    color: '#666',
  },
  
  // Estilos para el selector de horarios del cliente
  availableSlotsInfo: {
    fontSize: 12,
    color: '#4CAF50',
    fontStyle: 'italic',
    marginTop: 4,
    textAlign: 'center',
  },
  timeSelectionInfo: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    marginBottom: 16,
    borderRadius: 8,
    marginHorizontal: 20,
  },
  timeSelectionDate: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  timeSelectionProfessional: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 4,
  },
  timeSelectionService: {
    fontSize: 14,
    color: '#4CAF50',
    textAlign: 'center',
    fontWeight: '600',
  },
  timeSlotsContainer: {
    paddingHorizontal: 20,
  },
  timeSlotItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: 'white',
    marginBottom: 8,
    borderRadius: 8,
  },

  noTimeSlots: {
    padding: 40,
    alignItems: 'center',
  },
  noTimeSlotsText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  noTimeSlotsSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  timeSelectionActions: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: 'white',
  },
  
  // Estilos para debug (solo desarrollo)
  debugInfo: {
    fontSize: 10,
    color: '#999',
    fontFamily: 'monospace',
    textAlign: 'center',
    marginTop: 8,
    padding: 4,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
  },
  
  // Estilos para Mercado Pago
  paymentSummaryContainer: {
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    margin: 20,
  },
  paymentSummaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  paymentSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  paymentSummaryLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  paymentSummaryValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  mercadoPagoActions: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: 'white',
  },
  mercadoPagoButton: {
    backgroundColor: '#009EE3',
    marginBottom: 10,
  },
  mercadoPagoButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },

  // Estilos completamente reorganizados para el catálogo de pacientes
  patientModalHeader: {
    backgroundColor: '#667eea',
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  patientBackButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginRight: 16,
  },
  patientHeaderContent: {
    flex: 1,
    alignItems: 'center',
  },
  patientModalTitle: {
    color: 'white',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  patientModalSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontWeight: '400',
  },
  patientStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: 'white',
    marginHorizontal: 12,
    marginTop: -12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    zIndex: 1,
  },
  statCard: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#667eea',
    marginBottom: 6,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textTransform: 'uppercase',
    fontWeight: '600',
    textAlign: 'center',
  },
  patientSearchSection: {
    backgroundColor: 'white',
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginTop: 8,
  },
  patientSearchContainer: {
    marginBottom: 16,
  },
  patientSearchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  patientSearchIcon: {
    marginRight: 12,
  },
  patientSearchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  patientClearButton: {
    padding: 4,
  },
  patientFiltersContainer: {
    marginTop: 8,
  },
  patientFiltersScroll: {
    flexGrow: 0,
  },
  patientFilterChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    minWidth: 80,
    alignItems: 'center',
  },
  patientFilterChipActive: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  patientFilterChipText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  patientFilterChipTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  patientListContainer: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 4,
  },
  patientCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  patientCardInactive: {
    opacity: 0.7,
    backgroundColor: '#f8f8f8',
  },
  patientCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  patientCardAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  patientCardAvatarInactive: {
    backgroundColor: '#999',
  },
  patientCardStatusContainer: {
    alignItems: 'flex-end',
  },
  patientCardStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 15,
    minWidth: 90,
    alignItems: 'center',
    marginBottom: 6,
  },
  patientCardStatusActive: {
    backgroundColor: '#e8f5e8',
    borderWidth: 1,
    borderColor: '#4caf50',
  },
  patientCardStatusInactive: {
    backgroundColor: '#ffeaea',
    borderWidth: 1,
    borderColor: '#f44336',
  },
  patientCardStatusText: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  patientCardVisits: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
    textAlign: 'center',
  },
  patientCardInfo: {
    flex: 1,
  },
  patientCardName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  patientCardNameInactive: {
    color: '#666',
  },
  patientCardDetails: {
    gap: 8,
  },
  patientCardDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  patientCardEmail: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  patientCardEmailInactive: {
    color: '#999',
  },
  patientCardPhone: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  patientCardPhoneInactive: {
    color: '#999',
  },
  patientCardLastVisit: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
    flex: 1,
  },
  patientCardLastVisitInactive: {
    color: '#ccc',
  },
  patientCardIndicator: {
    position: 'absolute',
    right: 16,
    top: '50%',
    marginTop: -10,
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
  },
  patientAddFAB: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 65,
    height: 65,
    borderRadius: 32.5,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 1000,
  },

  // Estilos para el modal de gestión de pacientes
  patientManagementHeader: {
    backgroundColor: '#667eea',
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  patientManagementBackButton: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginRight: 12,
  },
  patientManagementHeaderContent: {
    flex: 1,
    alignItems: 'center',
  },
  patientManagementTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 2,
  },
  patientManagementSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    fontWeight: '400',
  },
  patientManagementStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: 'white',
    marginHorizontal: 12,
    marginTop: -12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    zIndex: 1,
  },
  patientManagementStatCard: {
    alignItems: 'center',
    flex: 1,
  },
  patientManagementStatNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#667eea',
    marginBottom: 4,
  },
  patientManagementStatLabel: {
    fontSize: 10,
    color: '#666',
    textTransform: 'uppercase',
    fontWeight: '600',
    textAlign: 'center',
  },
  patientManagementActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: 'white',
    marginTop: 8,
  },
  patientManagementActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: 100,
    justifyContent: 'center',
  },
  patientManagementActionButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  patientManagementSearchSection: {
    backgroundColor: 'white',
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginTop: 8,
  },
  patientManagementSearchContainer: {
    marginBottom: 8,
  },
  patientManagementSearchInput: {
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
    color: '#333',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  patientManagementSearchIcon: {
    marginRight: 8,
  },
  patientManagementFilters: {
    marginTop: 8,
  },
  patientManagementFilterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    minWidth: 70,
    alignItems: 'center',
  },
  patientManagementFilterChipActive: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  patientManagementFilterChipText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  patientManagementFilterChipTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  patientManagementList: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 4,
  },
  patientManagementCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#f0f0e0',
  },
  patientManagementCardInactive: {
    opacity: 0.7,
    backgroundColor: '#f8f8f8',
  },
  patientManagementCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  patientManagementCardAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  patientManagementCardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  patientManagementCardName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  patientManagementCardEmail: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  patientManagementCardPhone: {
    fontSize: 12,
    color: '#666',
  },
  patientManagementCardStatus: {
    alignItems: 'flex-end',
  },
  patientManagementStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 80,
    alignItems: 'center',
    marginBottom: 4,
  },
  patientManagementStatusActive: {
    backgroundColor: '#e8f5e8',
    borderWidth: 1,
    borderColor: '#4caf50',
    borderColor: '#4caf50',
  },
  patientManagementStatusInactive: {
    backgroundColor: '#ffeaea',
    borderWidth: 1,
    borderColor: '#f44336',
  },
  patientManagementStatusText: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  patientManagementCardVisits: {
    fontSize: 10,
    color: '#666',
    fontWeight: '500',
    textAlign: 'center',
  },
  patientManagementCardDetails: {
    marginBottom: 8,
  },
  patientManagementCardNotes: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontStyle: 'italic',
  },
  patientManagementCardNotesLabel: {
    fontWeight: '600',
    color: '#333',
  },
  patientManagementCardLastVisit: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
  },
  patientManagementCardActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#f0f0e0',
    paddingTop: 8,
  },
  patientManagementAction: {
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
    minWidth: 60,
  },
  patientManagementActionText: {
    fontSize: 10,
    color: '#666',
    fontWeight: '500',
    marginTop: 2,
  },

  // Estilos para el modal de gestión de horarios
  scheduleModalContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scheduleModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#667eea',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
    elevation: 4,
  },
  scheduleModalBackButton: {
    padding: 10,
    marginRight: 10,
  },
  scheduleModalHeaderContent: {
    flex: 1,
  },
  scheduleModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  scheduleModalSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  scheduleModalContent: {
    flex: 1,
    padding: 20,
  },
  scheduleSection: {
    marginBottom: 30,
  },
  scheduleSectionDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  scheduleSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  workingDayCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  daySelectorContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 20,
  },
  daySelectorButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: '#e1e1e1',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 12,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  daySelectorButtonActive: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  daySelectorButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  daySelectorButtonTextActive: {
    color: 'white',
  },
  dayStatusIndicator: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: 'white',
    borderRadius: 10,
  },
  periodSelectorContainer: {
    marginBottom: 20,
    alignItems: 'center',
  },
  periodSelectorLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  periodSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 25,
    paddingHorizontal: 5,
    paddingVertical: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  periodNavButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 5,
  },
  periodSelectorValue: {
    minWidth: 120,
    paddingHorizontal: 20,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodSelectorText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  periodSelectorSubtext: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 2,
    fontStyle: 'italic',
  },
  configurationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  periodBadge: {
    backgroundColor: '#667eea',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  periodBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  workingDayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  workingDayInfo: {
    flex: 1,
  },
  workingDayName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  workingDayTime: {
    fontSize: 14,
    color: '#666',
  },
  workingDayToggle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ddd',
  },
  workingDayToggleActive: {
    backgroundColor: '#4CAF50',
    color: 'white',
  },
  workingDayTimeSettings: {
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  timeSlotSection: {
    marginBottom: 15,
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e1e1e1',
  },
  timeSlotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  timeSlotTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  timeSlotToggle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ddd',
  },
  timeSlotToggleActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  timeInputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeInputContainer: {
    flex: 1,
    marginHorizontal: 5,
  },
  timeInputLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
    fontWeight: '500',
  },
  timeInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e1e1e1',
  },
  timeInputText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  breakTimeCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  breakTimeHeader: {
    marginBottom: 15,
  },
  breakTimeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  breakTimeSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  breakTimeSettings: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  appointmentSettingsCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  appointmentSettingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  appointmentSettingInfo: {
    flex: 1,
  },
  appointmentSettingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 3,
  },
  appointmentSettingSubtitle: {
    fontSize: 12,
    color: '#666',
  },
  appointmentSettingValue: {
    alignItems: 'center',
  },
  appointmentSettingNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#667eea',
    marginBottom: 2,
  },
  appointmentSettingUnit: {
    fontSize: 12,
    color: '#666',
    textTransform: 'uppercase',
  },
  durationSelectorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#e1e1e1',
  },
  durationButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e1e1e1',
    marginHorizontal: 4,
  },
  durationValue: {
    alignItems: 'center',
    paddingHorizontal: 12,
    minWidth: 60,
  },
  durationNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#667eea',
    textAlign: 'center',
  },
  durationUnit: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
    marginTop: 2,
  },
  timeSelectorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#e1e1e1',
    marginTop: 8,
  },
  timeSelectorButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e1e1e1',
    marginHorizontal: 4,
  },
  timeDisplayContainer: {
    alignItems: 'center',
    paddingHorizontal: 12,
    minWidth: 80,
  },
  timeDisplayText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#667eea',
    textAlign: 'center',
  },
  timeDisplayLabel: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
    marginTop: 2,
  },
  breakDurationContainer: {
    alignItems: 'center',
    marginTop: 15,
    paddingVertical: 10,
    backgroundColor: '#e8f5e8',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  breakDurationLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
    textAlign: 'center',
  },
  breakTimeHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  breakTimeHeaderText: {
    marginLeft: 12,
    flex: 1,
  },
  breakTimeSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  breakTimeSelectorColumn: {
    flex: 1,
    alignItems: 'center',
  },
  breakTimeSelectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  breakTimeSelectorTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginLeft: 6,
  },
  enhancedTimeSelectorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 2,
    borderColor: '#e1e1e1',
    minWidth: 120,
  },
  enhancedTimeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e1e1e1',
    marginHorizontal: 4,
  },
  enhancedTimeDisplay: {
    alignItems: 'center',
    paddingHorizontal: 8,
    minWidth: 60,
  },
  enhancedTimeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#667eea',
    textAlign: 'center',
  },
  enhancedTimeUnit: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
    marginTop: 2,
  },
  breakTimeSeparator: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  breakTimeArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF3E0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  breakTimeSeparatorText: {
    fontSize: 12,
    color: '#FF6B35',
    fontWeight: '600',
    textAlign: 'center',
  },
  breakTimeSummary: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  breakTimeSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    justifyContent: 'center',
  },
  breakTimeSummaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 8,
  },
  breakTimeSummaryContent: {
    gap: 8,
  },
  breakTimeSummaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  breakTimeSummaryLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  breakTimeSummaryValue: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
  },
  breakTimeSummaryIntegrated: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E1E1E1',
    marginTop: 16,
  },
  breakTimeSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  // Nuevos estilos para el descanso mejorado
  breakTimeMainCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  breakTimeMainHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  breakTimeIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFF5F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 2,
    borderColor: '#FFE0D0',
  },
  breakTimeMainTitleContainer: {
    flex: 1,
  },
  breakTimeMainTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  breakTimeMainSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  breakTimeConfigContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  breakTimeSelectorCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  breakTimeSelectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  breakTimeSelectorTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 8,
  },
  breakTimeTimeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  breakTimeTimeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  breakTimeTimeValue: {
    alignItems: 'center',
    minWidth: 60,
  },
  breakTimeTimeText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  breakTimeTimeLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  breakTimeVisualSeparator: {
    alignItems: 'center',
    marginHorizontal: 16,
    minWidth: 80,
  },
  breakTimeArrowContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF5F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#FFE0D0',
  },
  breakTimeSeparatorText: {
    fontSize: 12,
    color: '#FF6B35',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  breakTimeSummaryCard: {
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  breakTimeSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  breakTimeSummaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0C4A6E',
    marginLeft: 8,
  },
  breakTimeSummaryContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
  },
  breakTimeSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakTimeSummaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  breakTimeSummaryLabel: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
    marginLeft: 6,
    marginRight: 8,
  },
  breakTimeSummaryValue: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '600',
  },
  scheduleModalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e1e1e1',
    elevation: 2,
  },
  scheduleModalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 120,
    justifyContent: 'center',
  },
  scheduleModalButtonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#FF6B35',
  },
  scheduleModalButtonPrimary: {
    backgroundColor: '#4CAF50',
  },
  scheduleModalButtonSecondaryText: {
    color: '#FF6B35',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  scheduleModalButtonPrimaryText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  // Estilos para el modal de historial de señas
  depositSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginHorizontal: 5,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontWeight: '500',
  },
  summaryAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 4,
  },
  summarySubtitle: {
    fontSize: 12,
    color: '#999',
  },
  depositList: {
    marginBottom: 20,
  },
  depositItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  depositHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  depositInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  serviceName: {
    fontSize: 14,
    color: '#667eea',
    marginBottom: 4,
    fontWeight: '500',
  },
  appointmentDate: {
    fontSize: 12,
    color: '#666',
  },
  depositAmounts: {
    alignItems: 'flex-end',
  },
  depositAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 2,
  },
  totalAmount: {
    fontSize: 14,
    color: '#666',
  },
  depositDetails: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
    marginBottom: 12,
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
  },
  notesSection: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  notesLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  exportButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#667eea',
  },
  exportButtonText: {
    color: '#667eea',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  // Estilos para el modal de configuración de consultorio
  clinicSelector: {
    marginBottom: 20,
  },
  clinicPickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  clinicPickerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e1e1e1',
  },
  clinicPickerText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  addClinicButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  addClinicButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  clinicSection: {
    marginBottom: 25,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e1e1e1',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#333',
  },
  timeRangeContainer: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 20,
  },
  timeInputGroup: {
    flex: 1,
  },
  timePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e1e1e1',
  },
  timePickerText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  daysSelector: {
    marginBottom: 20,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  dayButton: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#e1e1e1',
    justifyContent: 'center',
  },
  // Estilos para el selector de consultorio
  clinicListContainer: {
    marginBottom: 20,
  },
  clinicListItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  clinicListItemSelected: {
    borderColor: '#4CAF50',
    backgroundColor: '#f8fff8',
  },
  clinicListItemContent: {
    flex: 1,
  },
  clinicListItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  clinicListItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  clinicListItemAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  clinicListItemPhone: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  clinicListItemEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  addClinicFromSelectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: '#667eea',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginTop: 10,
    gap: 8,
  },
  addClinicFromSelectorButtonText: {
    color: '#667eea',
    fontSize: 16,
    fontWeight: '600',
  },
  dayButtonSelected: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  dayButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  dayButtonTextSelected: {
    color: 'white',
  },
  paymentMethodsContainer: {
    gap: 10,
    marginTop: 10,
  },
  paymentMethodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e1e1e1',
    gap: 12,
  },
  paymentMethodButtonSelected: {
    borderColor: '#4CAF50',
    backgroundColor: '#f0f8f0',
  },
  paymentMethodText: {
    fontSize: 16,
    color: '#333',
  },
  paymentMethodTextSelected: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e1e1e1',
    marginBottom: 16,
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
  },
  toggleButton: {
    width: 50,
    height: 28,
    backgroundColor: '#e1e1e1',
    borderRadius: 14,
    padding: 2,
    justifyContent: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#4CAF50',
  },
  toggleCircle: {
    width: 24,
    height: 24,
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleCircleActive: {
    transform: [{ translateX: 22 }],
  },
  // Estilos para el modal del selector de clientes
  clientSelectorModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clientSelectorModalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    width: '90%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  clientSelectorModalHeader: {
    backgroundColor: '#667eea',
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clientSelectorModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
  },
  clientSelectorCloseButton: {
    padding: 5,
  },
  clientSelectorModalBody: {
    padding: 20,
  },
  clientSelectorSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e1e1e1',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  clearSearchButton: {
    padding: 5,
  },
  resultsCounter: {
    marginBottom: 15,
  },
  resultsCounterText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  clientListContainer: {
    maxHeight: 400,
  },
  clientItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e1e1e1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  clientItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clientItemAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  clientItemInfo: {
    flex: 1,
  },
  clientItemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  clientItemEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  clientItemPhone: {
    fontSize: 14,
    color: '#999',
  },
  clientItemSelectIndicator: {
    padding: 5,
  },
  noClientsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noClientsText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 15,
    marginBottom: 8,
  },
  noClientsSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  clientSelectorModalActions: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e1e1e1',
  },
  clientSelectorCancelButton: {
    backgroundColor: '#f8f9fa',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  clientSelectorCancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  // Estilos para el catálogo mejorado de pacientes
  catalogSelectorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  catalogSelectorButton: {
    flex: 1,
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
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 8,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 2,
    borderColor: '#45a049',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addNewUserButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  selectedPatientInfo: {
    marginTop: 15,
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e1e1e1',
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
  // Estilos para el modal de reseñas
  reviewsHeader: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  reviewsStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  reviewStatItem: {
    alignItems: 'center',
  },
  reviewStatNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  reviewStatLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  emptyReviewsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyReviewsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyReviewsSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  reviewsList: {
    gap: 16,
  },
  reviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  reviewHeaderLeft: {
    flex: 1,
  },
  reviewStars: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  reviewDate: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  reviewActionsButton: {
    padding: 4,
  },
  reviewProfessionalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  reviewProfessionalAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F9FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  reviewProfessionalDetails: {
    flex: 1,
  },
  reviewProfessionalName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  reviewService: {
    fontSize: 14,
    color: '#6B7280',
  },
  reviewComment: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#667eea',
  },
  reviewCommentText: {
    fontSize: 14,
    color: '#374151',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  reviewAppointmentInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  reviewAppointmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  reviewAppointmentText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 6,
  },
  selectedAppointmentCard: {
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  selectedAppointmentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0C4A6E',
    marginBottom: 12,
  },
  selectedAppointmentInfo: {
    gap: 8,
  },
  selectedAppointmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedAppointmentText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 8,
  },
  ratingSection: {
    marginBottom: 20,
  },
  ratingSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  ratingStars: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 8,
  },
  ratingStarButton: {
    padding: 4,
    marginHorizontal: 2,
  },
  ratingText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    fontWeight: '500',
  },
  commentSection: {
    marginBottom: 20,
  },
  commentSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  commentTextInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#374151',
    backgroundColor: '#FFFFFF',
    minHeight: 100,
  },
  commentCharCount: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'right',
    marginTop: 4,
  },
  reviewModalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  // Estilos para el modal de profesionales favoritos
  favoritesHeader: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  favoritesStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  favoriteStatItem: {
    alignItems: 'center',
  },
  favoriteStatNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#DC2626',
    marginBottom: 4,
  },
  favoriteStatLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  addFavoriteButton: {
    backgroundColor: '#E91E63',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    alignSelf: 'center',
  },
  addFavoriteButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  favoritesFilters: {
    marginBottom: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#374151',
  },
  categoryScroll: {
    marginBottom: 8,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryButtonActive: {
    backgroundColor: '#E91E63',
    borderColor: '#E91E63',
  },
  categoryButtonText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  categoryButtonTextActive: {
    color: 'white',
  },
  emptyFavoritesContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyFavoritesTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyFavoritesSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  favoritesList: {
    gap: 16,
  },
  favoriteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  favoriteCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  favoriteCardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  favoriteAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F0F9FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#BAE6FD',
  },
  favoriteAvatarText: {
    fontSize: 24,
  },
  favoriteOnlineStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  onlineIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  onlineStatusText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  favoriteActionsButton: {
    padding: 4,
  },
  favoriteProfessionalInfo: {
    marginBottom: 12,
  },
  favoriteProfessionalName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  favoriteProfessionalService: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '600',
    marginBottom: 2,
  },
  favoriteProfessionalSpecialization: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  favoriteRatingSection: {
    marginBottom: 12,
  },
  favoriteRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  favoriteStars: {
    flexDirection: 'row',
    marginRight: 8,
  },
  favoriteRatingText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  favoriteConsultationInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  favoriteConsultationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: '30%',
    marginBottom: 8,
  },
  favoriteConsultationText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 6,
    fontWeight: '500',
  },
  favoriteDescription: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  favoriteAvailability: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  favoriteAvailabilityText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginLeft: 6,
    fontWeight: '500',
  },
  favoriteActions: {
    flexDirection: 'row',
    gap: 12,
  },
  favoriteActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  bookAppointmentButton: {
    backgroundColor: '#4CAF50',
  },
  bookAppointmentButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  contactButton: {
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  contactButtonText: {
    color: '#667eea',
    fontSize: 14,
    fontWeight: '600',
  },
  addFavoriteContent: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  addFavoriteTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  addFavoriteSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  exploreProfessionalsButton: {
    backgroundColor: '#667eea',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  exploreProfessionalsButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },

  // Estilos para el modal de detalles del paciente
  patientDetailsHeader: {
    backgroundColor: '#667eea',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  patientDetailsBackButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 1,
  },
  patientDetailsHeaderContent: {
    alignItems: 'center',
    marginTop: 20,
  },
  patientDetailsTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
    marginBottom: 8,
  },
  patientDetailsSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  patientDetailsContent: {
    flex: 1,
    padding: 20,
  },
  patientInfoSection: {
    alignItems: 'center',
    marginBottom: 30,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  patientAvatarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  patientAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#667eea',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  patientStatusContainer: {
    alignItems: 'flex-start',
  },
  patientStatusBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginBottom: 8,
  },
  patientStatusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  patientVisitsCount: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  patientName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  patientEmail: {
    fontSize: 16,
    color: '#667eea',
    marginBottom: 4,
    textAlign: 'center',
  },
  patientPhone: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  patientDetailsSection: {
    marginBottom: 25,
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    flex: 2,
    textAlign: 'right',
    fontWeight: '500',
  },
  visitsSummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  visitStatCard: {
    alignItems: 'center',
    padding: 15,
    backgroundColor: 'white',
    borderRadius: 8,
    minWidth: 100,
  },
  visitStatNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#667eea',
    marginBottom: 4,
  },
  visitStatLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  patientNotes: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  patientDetailsActions: {
    flexDirection: 'row',
    padding: 20,
    gap: 15,
  },
  patientActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 8,
    gap: 8,
  },
  editButton: {
    backgroundColor: '#FF9800',
  },
  scheduleButton: {
    backgroundColor: '#4CAF50',
  },
  patientActionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },

  // Estilos para el modal de edición del paciente
  editPatientHeader: {
    backgroundColor: '#FF9800',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  editPatientBackButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 1,
  },
  editPatientHeaderContent: {
    alignItems: 'center',
    marginTop: 20,
  },
  editPatientTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
    marginBottom: 8,
  },
  editPatientSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  editPatientForm: {
    flex: 1,
    padding: 20,
  },
  formSection: {
    marginBottom: 25,
  },
  formSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  inputGroup: {
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#555',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  editPatientActions: {
    flexDirection: 'row',
    padding: 20,
    gap: 15,
  },
  editPatientButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  
  // Estilos para estados de carga y error
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 16,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default SettingsScreen;

