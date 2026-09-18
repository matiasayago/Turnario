import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    Alert,
    Image,
    KeyboardAvoidingView,
    Linking,
    Modal,
    Platform,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ProfessionalCalendar from '../../components/ProfessionalCalendar';
import ProfessionalPatientPicker from '../../components/ProfessionalPatientPicker';
import TimeSlotSelector from '../../components/TimeSlotSelector';
import { getBackendBaseUrl, resolveMediaUrl } from '../../config/backend';
import { getBookableTimeSlotsForProfessionalDate, expoTimeToSlotKey } from '../../services/bookingSlotsService';
import { createPaymentPreference, openMercadoPagoDirectly } from '../../config/mercadopago';
import {
  getServicesByCategory,
  professionalOffersService,
  SERVICE_CATEGORIES,
  SERVICES,
  searchServices,
} from '../../constants/services';
import { useAppointments, type Appointment } from '../../contexts/AppointmentContext';
import { useAuth } from '../../contexts/AuthContext';
import { useMedicalHistory } from '../../contexts/MedicalHistoryContext';
import { historyPatientIdFromAppointment } from '../../utils/historyPatientId';
import { useAvailability } from '../../contexts/AvailabilityContext';
import { useReservaConSena } from '../../contexts/ReservaConSenaContext';
import { useNewAppointment } from '../../contexts/NewAppointmentContext';
import { simpleAuthService } from '../../services/simpleAuthService';

const BACKEND_URL = getBackendBaseUrl();

/** Precio de consulta por defecto si el directorio no trae `price` */
const CLIENT_RESERVA_TOTAL_AMOUNT = 10000;

function resolveProfessionalMongoId(
  isProfessionalUser: boolean,
  userId: string | undefined,
  appointment: {
    professionalId: string;
    professionalName: string;
  },
  directory: { id: string; name: string }[]
): string {
  if (isProfessionalUser) {
    return userId || '';
  }
  if (appointment.professionalId && appointment.professionalId.length === 24) {
    return appointment.professionalId;
  }
  const found = directory.find((p) => p.name === appointment.professionalName);
  return found?.id || '';
}

// Fecha calendario YYYY-MM-DD: parsear como fecha local, no UTC (evita mostrar el día anterior).
const formatDateForDisplay = (isoDate: string) => {
  if (!isoDate) return '';
  const s = String(isoDate).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-').map((n) => parseInt(n, 10));
    const date = new Date(y, m - 1, d);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    }
  }
  try {
    const date = new Date(isoDate);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    }
  } catch {
    /* ignore */
  }
  return isoDate;
};

/** Hoy en calendario local YYYY-MM-DD (no usar toISOString: en UTC desfasa respecto a las fechas de las citas). */
function getLocalTodayYmd(): string {
  const t = new Date();
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, '0');
  const d = String(t.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function appointmentDateYmd(aptDate: string): string | null {
  const s = String(aptDate || '').trim();
  const head = s.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(head)) return head;
  return null;
}

function getDashboardStatusMeta(status: string): { label: string; color: string } {
  switch (status) {
    case 'completed':
    case 'finished':
      return { label: 'Completada', color: '#2196F3' };
    case 'confirmed':
      return { label: 'Confirmada', color: '#4CAF50' };
    case 'pending_approval':
      return { label: 'Por confirmar', color: '#FF9800' };
    case 'pending_payment':
      return { label: 'Pago pendiente', color: '#FF9800' };
    case 'pending':
      return { label: 'Pendiente', color: '#FF9800' };
    case 'cancelled':
      return { label: 'Cancelada', color: '#F44336' };
    default:
      return { label: status || '—', color: '#999' };
  }
}

/** Fecha guardada en el formulario: ISO (YYYY-MM-DD) desde ProfessionalCalendar, o legado "día de mes". */
function parseAppointmentFormDateToLocal(dateStr: string): Date | null {
  if (!dateStr || !String(dateStr).trim()) return null;
  const s = String(dateStr).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-').map((n) => parseInt(n, 10));
    const dt = new Date(y, m - 1, d);
    return isNaN(dt.getTime()) ? null : dt;
  }
  const parts = s.split(' de ');
  if (parts.length >= 2) {
    const dayNum = parseInt(parts[0], 10);
    const monthLabel = parts.slice(1).join(' de ');
    const ref = new Date(`${monthLabel} 1, 2024`);
    const monthIndex = ref.getMonth();
    if (!isNaN(dayNum) && !isNaN(monthIndex)) {
      const dt = new Date(new Date().getFullYear(), monthIndex, dayNum);
      return isNaN(dt.getTime()) ? null : dt;
    }
  }
  const fallback = new Date(s);
  return isNaN(fallback.getTime()) ? null : fallback;
}

export default function DashboardScreen() {
  const routeParams = useLocalSearchParams<{
    newProfessionalAppointmentRequest?: string;
    patientId?: string;
    patientName?: string;
    patientEmail?: string;
    patientPhone?: string;
  }>();
  const processedAppointmentRequest = useRef('');
  const insets = useSafeAreaInsets();
  const modalActionPaddingBottom =
    Platform.OS === 'android'
      ? Math.max(insets.bottom + 24, 44)
      : Math.max(insets.bottom + 12, 24);
  const router = useRouter();
  const { user, logout, hasProAccess } = useAuth();
  const { appointments, addAppointment, refreshAppointments, getUpcomingAppointments, completeAppointment, confirmAppointment, rejectAppointment } =
    useAppointments();
  const { recordProfessionalSession, loadPatientHistory } = useMedicalHistory();
  const { isDateAvailable, availableProfessionals, refreshProfessionalDirectory } = useAvailability();
  
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
    /** ObjectId Mongo del cliente si se eligió usuario registrado o paciente con cuenta */
    patientClientId: '',
    professionalName: user?.userType === 'professional' ? (user?.fullName || '') : '', // Nombre del profesional
    professionalId: '', // ID del profesional seleccionado
    serviceId: '',
    notes: '',
  });
  const selectedClientBookingProfessional = useMemo(() => {
    const id = String(newProfessionalAppointment.professionalId || '').trim();
    const name = String(newProfessionalAppointment.professionalName || '').trim();
    if (id) {
      const byId = availableProfessionals.find((p) => String(p.id) === id);
      if (byId) return byId;
    }
    if (name) {
      return availableProfessionals.find((p) => p.name === name) ?? null;
    }
    return null;
  }, [
    availableProfessionals,
    newProfessionalAppointment.professionalId,
    newProfessionalAppointment.professionalName,
  ]);
  const consultationPriceClientBooking = useMemo(() => {
    const p = selectedClientBookingProfessional;
    if (p && typeof p.price === 'number' && !Number.isNaN(p.price) && p.price > 0) {
      return p.price;
    }
    return CLIENT_RESERVA_TOTAL_AMOUNT;
  }, [selectedClientBookingProfessional]);
  const clientDepositPct = useMemo(() => {
    const p = selectedClientBookingProfessional;
    const raw = p && typeof p.depositPercentage === 'number' ? p.depositPercentage : 20;
    if (!Number.isFinite(raw) || raw < 0) return 20;
    return Math.min(100, Math.round(raw));
  }, [selectedClientBookingProfessional]);
  const clientSeniaPreviewAmount = useMemo(
    () => Math.max(1, Math.round(consultationPriceClientBooking * (clientDepositPct / 100))),
    [consultationPriceClientBooking, clientDepositPct]
  );
  const [isCreatingAppointment, setIsCreatingAppointment] = useState(false);
  const [notificationsSent, setNotificationsSent] = useState<string[]>([]);
  const [expandedAppointmentId, setExpandedAppointmentId] = useState<string | null>(null);
  const [sessionModalAppointment, setSessionModalAppointment] = useState<Appointment | null>(null);
  const [sessionFormNotes, setSessionFormNotes] = useState('');
  const [sessionFormTreatment, setSessionFormTreatment] = useState('');
  const [sessionModalCompletesAppointment, setSessionModalCompletesAppointment] = useState(false);
  const [isSavingProfessionalSession, setIsSavingProfessionalSession] = useState(false);
  
  // Estados para el calendario de disponibilidad
  const [showDatePickerModal, setShowDatePickerModal] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState('');
  
  // Estados para el selector de horarios
  const [showTimePickerModal, setShowTimePickerModal] = useState(false);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);
  
  // Estados para el catálogo de pacientes
  const [showPatientCatalogModal, setShowPatientCatalogModal] = useState(false);
  
  // Estados para el selector de servicios
  const [showServiceSelectorModal, setShowServiceSelectorModal] = useState(false);
  const [serviceSearchQuery, setServiceSearchQuery] = useState('');
  const [selectedServiceCategory, setSelectedServiceCategory] = useState<string>('Todas');
  
  // Estados para el selector de profesionales
  const [showProfessionalSelectorModal, setShowProfessionalSelectorModal] = useState(false);
  const [professionalSearchQuery, setProfessionalSearchQuery] = useState('');
  const [professionalClinicQuery, setProfessionalClinicQuery] = useState('');
  
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

  useEffect(() => {
    const requestId = String(routeParams.newProfessionalAppointmentRequest || '');
    if (
      !isProfessional ||
      !requestId ||
      processedAppointmentRequest.current === requestId
    ) {
      return;
    }
    processedAppointmentRequest.current = requestId;
    setNewProfessionalAppointment((previous) => ({
      ...previous,
      service: user?.service || previous.service || '',
      patientName: String(routeParams.patientName || ''),
      patientPhone: String(routeParams.patientPhone || ''),
      patientEmail: String(routeParams.patientEmail || ''),
      patientClientId: String(routeParams.patientId || ''),
    }));
    setShowModal(true);
  }, [
    isProfessional,
    user?.service,
    routeParams.newProfessionalAppointmentRequest,
    routeParams.patientId,
    routeParams.patientName,
    routeParams.patientEmail,
    routeParams.patientPhone,
  ]);
  const { openReservaConSenaModal } = useReservaConSena();
  const { shouldOpenHoyBookingForm, closeHoyBookingForm } = useNewAppointment();

  const loggedUserId = String(user?._id ?? user?.id ?? '').trim();
  /** Citas del paciente logueado (backend guarda clientId = ObjectId usuario). */
  const isClientOwnedAppointment = (apt: Appointment) => {
    if (!loggedUserId) return false;
    return String(apt.clientId ?? '') === loggedUserId;
  };

  /** Solo paciente: citas de hoy (fecha API YYYY-MM-DD) y clientId del usuario. */
  const getTodayAppointmentsCount = () => {
    if (!appointments?.length || isProfessional) return 0;
    const todayYmd = getLocalTodayYmd();
    return appointments.filter((appointment) => {
      if (!isClientOwnedAppointment(appointment)) return false;
      const ymd = appointmentDateYmd(appointment.date);
      return ymd === todayYmd;
    }).length;
  };

  const getTodayAppointments = () => {
    if (!appointments?.length || isProfessional) return [];
    const todayYmd = getLocalTodayYmd();
    return appointments.filter((appointment) => {
      if (!isClientOwnedAppointment(appointment)) return false;
      const ymd = appointmentDateYmd(appointment.date);
      return ymd === todayYmd;
    });
  };

  // Función para obtener las citas próximas del usuario
  const getUserUpcomingAppointments = () => {
    const userId = user?._id || user?.id;
    console.log('🔍 getUserUpcomingAppointments - userId:', userId);
    console.log('🔍 getUserUpcomingAppointments - user completo:', user);
    if (!userId && user?.userType === 'professional') {
      // Si es profesional, mostrar todas las citas
      console.log('👨‍⚕️ Profesional sin userId específico, mostrando todas las citas');
      return getUpcomingAppointments(''); // Pasar string vacío para que el filtro acepte todas
    }
    if (!userId) return [];
    return getUpcomingAppointments(userId);
  };

  const handleMarkAppointmentComplete = (appointmentId: string) => {
    const appointment = appointments.find((item) => String(item.id) === String(appointmentId));
    if (!appointment) {
      Alert.alert('Error', 'No se encontró la cita.');
      return;
    }
    Alert.alert(
      'Marcar como completada',
      'Podés agregar las notas y el tratamiento de esta sesión antes de completarla.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Continuar',
          onPress: () => openProfessionalSessionModal(appointment, true),
        },
      ]
    );
  };

  const handleConfirmAppointment = (appointmentId: string) => {
    Alert.alert('Confirmar cita', '¿Confirmás esta reserva?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Confirmar',
        onPress: async () => {
          try {
            await confirmAppointment(appointmentId);
            Alert.alert('Listo', 'La cita quedó confirmada.');
          } catch (e) {
            Alert.alert(
              'Error',
              e instanceof Error ? e.message : 'No se pudo confirmar la cita.'
            );
          }
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
          try {
            await rejectAppointment(appointmentId);
            Alert.alert('Listo', 'La solicitud fue rechazada.');
          } catch (e) {
            Alert.alert(
              'Error',
              e instanceof Error ? e.message : 'No se pudo rechazar la cita.'
            );
          }
        },
      },
    ]);
  };

  const closeProfessionalSessionModal = () => {
    setSessionModalAppointment(null);
    setSessionFormNotes('');
    setSessionFormTreatment('');
    setSessionModalCompletesAppointment(false);
  };

  const openProfessionalSessionModal = (
    apt: Appointment,
    completeAfterSave = false
  ) => {
    setSessionModalAppointment(apt);
    setSessionFormNotes('');
    setSessionFormTreatment('');
    setSessionModalCompletesAppointment(completeAfterSave);
  };

  const handleSaveProfessionalSession = async () => {
    if (!sessionModalAppointment || !user) return;
    const pid = historyPatientIdFromAppointment(sessionModalAppointment);
    if (!pid) {
      Alert.alert(
        'Paciente sin identificador',
        'Este turno no tiene cliente con cuenta ni datos suficientes (email o nombre). Agregá email en la cita o al paciente para vincular el historial.'
      );
      return;
    }
    const proId = String(user.id || user._id || '').trim();
    if (!proId) {
      Alert.alert('Error', 'No se pudo identificar al profesional.');
      return;
    }
    setIsSavingProfessionalSession(true);
    try {
      if (sessionModalCompletesAppointment) {
        await completeAppointment(sessionModalAppointment.id, {
          notes: sessionFormNotes,
          treatmentSummary: sessionFormTreatment,
        });
        if (/^[a-fA-F0-9]{24}$/.test(pid)) {
          await loadPatientHistory(pid);
        }
        Alert.alert('Listo', 'La sesión se guardó y la cita quedó completada.');
      } else if (sessionFormNotes.trim() || sessionFormTreatment.trim()) {
        await recordProfessionalSession({
          patientId: pid,
          professionalId: proId,
          professionalName: user.fullName || (user as { name?: string }).name || 'Profesional',
          serviceLabel: sessionModalAppointment.service || 'Consulta',
          appointmentDateYmd: sessionModalAppointment.date,
          appointmentTime: sessionModalAppointment.time,
          appointmentId: sessionModalAppointment.id,
          notes: sessionFormNotes,
          treatmentSummary: sessionFormTreatment,
        });
        Alert.alert('Guardado', 'La sesión quedó registrada en el historial del paciente.');
      } else {
        Alert.alert('Faltan datos', 'Agregá una nota y/o tratamiento de la sesión.');
        return;
      }
      closeProfessionalSessionModal();
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'No se pudo guardar la sesión.'
      );
    } finally {
      setIsSavingProfessionalSession(false);
    }
  };

  // Función para obtener pacientes de hoy (profesionales)
  const getTodayPatientsCount = () => {
    if (!isProfessional || appointments.length === 0) return 0;

    const todayYmd = getLocalTodayYmd();

    const todayAppointments = appointments.filter((apt) => {
      const ymd = appointmentDateYmd(apt.date);
      if (!ymd) return false;
      return (
        ymd === todayYmd &&
        (apt.status === 'confirmed' ||
          apt.status === 'pending' ||
          apt.status === 'pending_approval')
      );
    });

    return todayAppointments.length;
  };

  // Solicitudes / pagos pendientes que requieren acción del profesional o del flujo
  const getProfessionalPendingCount = () => {
    if (!isProfessional || appointments.length === 0) return 0;

    return appointments.filter(
      (apt) =>
        apt.status === 'pending_approval' ||
        apt.status === 'pending_payment' ||
        apt.status === 'pending'
    ).length;
  };

  // Función para contar citas completadas hoy (profesionales)
  const getTodayCompletedCount = () => {
    if (!isProfessional || appointments.length === 0) return 0;

    const todayYmd = getLocalTodayYmd();

    return appointments.filter((apt) => {
      const ymd = appointmentDateYmd(apt.date);
      if (!ymd) return false;
      const done = apt.status === 'completed' || apt.status === 'finished';
      return ymd === todayYmd && done;
    }).length;
  };

  // Función para contar las citas pendientes del usuario logueado (paciente)
  const getPendingAppointmentsCount = () => {
    if (!appointments || appointments.length === 0) return 0;
    if (!loggedUserId) return 0;

    return appointments.filter((appointment) => {
      if (!isClientOwnedAppointment(appointment)) return false;
      return (
        appointment.status === 'pending' ||
        appointment.status === 'pending_payment' ||
        appointment.status === 'pending_approval'
      );
    }).length;
  };

  // Completadas = realizadas (no confundir con "confirmada" por el profesional)
  const getCompletedAppointmentsCount = () => {
    if (!appointments || appointments.length === 0) return 0;
    if (!loggedUserId) return 0;

    return appointments.filter((appointment) => {
      if (!isClientOwnedAppointment(appointment)) return false;
      return appointment.status === 'completed' || appointment.status === 'finished';
    }).length;
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshAppointments();
    } finally {
      setRefreshing(false);
    }
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
      patientClientId: '',
      professionalName: '', // Resetear nombre del profesional
      professionalId: '', // Resetear ID del profesional
      serviceId: '',
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

  // Función para filtrar servicios según la búsqueda
  const getFilteredServices = () => {
    let filtered = availableServices;

    if (selectedServiceCategory !== 'Todas') {
      const categoryServices = new Set(getServicesByCategory(selectedServiceCategory));
      filtered = filtered.filter((service) => categoryServices.has(service.name));
    }

    if (serviceSearchQuery.trim()) {
      const filteredServiceNames = new Set(searchServices(serviceSearchQuery));
      filtered = filtered.filter((service) => filteredServiceNames.has(service.name));
    }

    return filtered;
  };

  // Función para seleccionar un servicio
  const handleServiceSelect = (service: any) => {
    setNewProfessionalAppointment(prev => ({
      ...prev,
      service: service.name,
      professionalName: '', // Resetear profesional al cambiar servicio
      professionalId: '', // Evitar mantener un ID incompatible con el nuevo servicio
    }));
    
    // Cerrar el selector de servicios
    setShowServiceSelectorModal(false);
    setServiceSearchQuery('');
    void refreshProfessionalDirectory();
    
    // Volver al formulario de Crear Nueva Cita
    setShowModal(true);
  };

  // Función para filtrar profesionales según el servicio seleccionado y búsqueda
  const getFilteredProfessionals = () => {
    const selectedService = newProfessionalAppointment.service;
    const hasSearch = professionalSearchQuery.trim().length > 0;
    const hasClinic = professionalClinicQuery.trim().length > 0;

    // Sin servicio: permitir listar/filtrar si hay búsqueda o consultorio
    let filtered = availableProfessionals;
    if (selectedService?.trim()) {
      filtered = availableProfessionals.filter((professional) =>
        professionalOffersService(professional, selectedService, { strict: true })
      );
      // Si el match estricto dejó vacío (rubro vs catálogo), reintentar más flexible
      if (filtered.length === 0) {
        filtered = availableProfessionals.filter((professional) =>
          professionalOffersService(professional, selectedService, { strict: false })
        );
      }
    } else if (!hasSearch && !hasClinic) {
      return [];
    }

    if (hasSearch) {
      const query = professionalSearchQuery.toLowerCase();
      filtered = filtered.filter(
        (professional) =>
          professional.name.toLowerCase().includes(query) ||
          (professional.specialty &&
            professional.specialty.toLowerCase().includes(query)) ||
          (professional.location?.toLowerCase().includes(query) ?? false) ||
          (Array.isArray(professional.clinicNames) &&
            professional.clinicNames.some((n) => String(n).toLowerCase().includes(query)))
      );
    }

    if (hasClinic) {
      const cq = professionalClinicQuery.toLowerCase().trim();
      filtered = filtered.filter((professional) => {
        const loc = (professional.location || '').toLowerCase();
        const clinics = Array.isArray(professional.clinicNames) ? professional.clinicNames : [];
        return (
          loc.includes(cq) ||
          clinics.some((n) => String(n).toLowerCase().includes(cq))
        );
      });
    }

    return filtered;
  };

  // Función para cargar fechas disponibles del profesional
  const loadProfessionalAvailableDates = async (professionalId: string) => {
    try {
      console.log(`📅 Cargando fechas disponibles para profesional ID: ${professionalId}`);
      
      // Obtener el mes y año actual
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1; // +1 porque getMonth() devuelve 0-11
      
      // Usar el endpoint correcto: /api/v1/date-schedules/{userId}/month/{year}/{month}
      const url = `${BACKEND_URL}/api/v1/date-schedules/${professionalId}/month/${year}/${month}`;
      console.log(`🌐 Consultando: ${url}`);
      
      // Llamar al backend para obtener horarios del mes
      const response = await fetch(url);
      console.log(`📥 Response status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Respuesta del backend - Horarios encontrados: ${data.count}`);
        
        if (data.success && data.data && data.data.length > 0) {
          console.log(`📆 ${data.count} fechas configuradas encontradas`);
          console.log(`📆 Primeras fechas:`, data.data.slice(0, 3).map((s: any) => s.date));
        } else {
          console.warn('⚠️ No se encontraron fechas configuradas para este profesional');
        }
      } else {
        console.error('❌ Error al obtener horarios del profesional:', response.status);
        const errorText = await response.text();
        console.error('❌ Error response:', errorText);
      }
    } catch (error) {
      console.error('❌ Error cargando fechas del profesional:', error);
    }
  };

  // Función para seleccionar un profesional
  const handleProfessionalSelect = async (professional: any) => {
    console.log(`👤 Profesional seleccionado:`, professional);
    console.log(`🆔 ID del profesional:`, professional.id);
    
    setNewProfessionalAppointment(prev => ({
      ...prev,
      professionalName: professional.name,
      professionalId: professional.id, // Guardar el ID del profesional
    }));
    
    // Cargar fechas disponibles del profesional
    await loadProfessionalAvailableDates(professional.id);
    
    // Cerrar el selector de profesionales
    setShowProfessionalSelectorModal(false);
    setProfessionalSearchQuery('');
    setProfessionalClinicQuery('');
    
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

  // Lista de servicios disponibles del sistema (precio/duración dependen del profesional)
  const availableServices = SERVICES.map((service, index) => ({
    id: (index + 1).toString(),
    name: service,
    description: `Servicio profesional de ${service.toLowerCase()}`,
  }));

  // Lista de profesionales disponibles por servicio
  // availableProfessionals ahora viene del contexto

  // Función para crear cita y enviar notificación al cliente
  const handleCreateAppointmentAndNotifyClient = async () => {
    /** _id de ExpoAppointment si el POST al backend fue OK (para contexto y bloqueo) */
    let mongoAppointmentId: string | undefined;
    /** Cliente: cita guardada en Mongo con seña → abrir pago Mercado Pago */
    let clientSavedWithDeposit = false;
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

      const clientRequiresSenia =
        !isProfessional &&
        !!selectedClientBookingProfessional &&
        selectedClientBookingProfessional.clientBookingRequiresDeposit !== false;
      const clientTotalForApi = consultationPriceClientBooking;
      const clientDepositForApi = clientRequiresSenia ? clientSeniaPreviewAmount : 0;
      let depositAmountForPaymentModal = clientDepositForApi;

      const clientMongoId = String(user?._id || user?.id || '').trim();
      const professionalMongoId = resolveProfessionalMongoId(
        isProfessional,
        user?._id || user?.id,
        {
          professionalId: newProfessionalAppointment.professionalId,
          professionalName: newProfessionalAppointment.professionalName,
        },
        availableProfessionals
      );

      if (!isProfessional && (!professionalMongoId || professionalMongoId.length !== 24)) {
        Alert.alert(
          'Profesional',
          'No se pudo determinar el ID del profesional. Elegí de nuevo el profesional en el listado.'
        );
        return;
      }

      if (!isProfessional && !clientMongoId) {
        Alert.alert('Sesión', 'No se pudo identificar tu usuario. Iniciá sesión nuevamente.');
        return;
      }

      const pickedPid = String(newProfessionalAppointment.patientClientId || '').trim();
      const professionalChosenClientId =
        isProfessional && /^[a-fA-F0-9]{24}$/.test(pickedPid) ? pickedPid : '';

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
        status: 'confirmed', // ✅ Confirmada directamente para pruebas
        createdAt: new Date().toISOString(),
        depositRequired: false, // ✅ Sin seña para pruebas
        depositAmount: 0,
        totalAmount: 10000,
      } : {
        // Para clientes
        id: appointmentId,
        service: newProfessionalAppointment.service,
        professional: newProfessionalAppointment.professionalName,
        professionalId: professionalMongoId,
        date: newProfessionalAppointment.date,
        time: newProfessionalAppointment.time,
        patientName: user?.fullName || 'Cliente',
        patientPhone: user?.phone || '',
        patientEmail: user?.email || '',
        notes: newProfessionalAppointment.notes,
        status: clientRequiresSenia ? 'pending_payment' : 'pending_approval',
        createdAt: new Date().toISOString(),
        depositRequired: clientRequiresSenia,
        depositAmount: clientDepositForApi,
        totalAmount: clientTotalForApi,
      };

      console.log('📋 Cita creada:', newAppointment);
      let appointmentDuration = 30; // Valor por defecto

      // 1. Guardar la cita en la base de datos
      try {
        console.log('💾 Guardando cita en la base de datos...');
        
        // Obtener la duración de la cita desde la configuración del profesional
        const professionalIdForDuration = isProfessional
          ? (user?._id || user?.id || '')
          : professionalMongoId;

        if (professionalIdForDuration && professionalIdForDuration.length === 24) {
          try {
            console.log('🔍 Obteniendo configuración del profesional para duración...');
            const availabilityResponse = await fetch(`${BACKEND_URL}/api/v1/availability/${professionalIdForDuration}`);
            if (availabilityResponse.ok) {
              const availabilityData = await availabilityResponse.json();
              if (availabilityData.success && availabilityData.data && availabilityData.data.appointmentDuration) {
                appointmentDuration = availabilityData.data.appointmentDuration;
                console.log(`⏱️ Duración de cita configurada: ${appointmentDuration} minutos`);
              } else {
                console.log('⚠️ No se encontró appointmentDuration en la configuración, usando valor por defecto: 30 minutos');
              }
            }
          } catch (error) {
            console.warn('⚠️ Error obteniendo configuración del profesional, usando duración por defecto:', error);
          }
        }
        
        const authHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
        const token = await simpleAuthService.getToken();
        if (token) authHeaders.Authorization = `Bearer ${token}`;

        const response = await fetch(`${BACKEND_URL}/api/v1/appointments/create`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({
            professionalId: isProfessional ? (user?._id || user?.id) : professionalMongoId,
            clientId: isProfessional
              ? professionalChosenClientId || undefined
              : clientMongoId,
            service: newAppointment.service,
            date: newAppointment.date,
            time: newAppointment.time,
            duration: appointmentDuration,
            patientName: newAppointment.patientName,
            patientPhone: newAppointment.patientPhone,
            patientEmail: newAppointment.patientEmail,
            notes: newAppointment.notes,
            status: isProfessional
              ? 'confirmed'
              : clientRequiresSenia
                ? 'pending_payment'
                : 'pending_approval',
            totalAmount: newAppointment.totalAmount,
            professional: newAppointment.professional,
            bookingSource: isProfessional ? 'professional' : 'client',
            ...(isProfessional
              ? {}
              : {
                  requireDeposit: clientRequiresSenia,
                  depositAmount: clientDepositForApi,
                }),
          }),
        });

        if (response.ok) {
          const savedAppointment = await response.json();
          console.log('✅ Cita guardada en la base de datos:', savedAppointment);
          if (
            savedAppointment?.success &&
            savedAppointment?.data &&
            savedAppointment.data._id
          ) {
            mongoAppointmentId = String(savedAppointment.data._id);
            const d = savedAppointment.data;
            if (!isProfessional && mongoAppointmentId.length === 24) {
              clientSavedWithDeposit =
                d.status === 'pending_payment' &&
                d.paymentStatus === 'pending' &&
                Number(d.depositAmount) > 0;
              if (clientSavedWithDeposit && Number(d.depositAmount) > 0) {
                depositAmountForPaymentModal = Number(d.depositAmount);
              }
            }
          }
        } else {
          const errorText = await response.text();
          console.error('❌ Error guardando cita en DB:', response.status, errorText);
        }
      } catch (error) {
        console.error('❌ Error guardando cita en base de datos:', error);
        // Continuar con el flujo aunque falle el guardado en DB
      }

      // 2. Marcar el horario como ocupado eliminándolo de los disponibles
      try {
        console.log('🔒 Marcando horario como ocupado...');
        const professionalIdToUse = isProfessional
          ? (user?._id || user?.id || '')
          : professionalMongoId;
        
        if (professionalIdToUse && professionalIdToUse.length === 24) {
          // Obtener el schedule actual de la fecha
          const scheduleResponse = await fetch(`${BACKEND_URL}/api/v1/date-schedules/${professionalIdToUse}/${newAppointment.date}`);
          
          if (scheduleResponse.ok) {
            const scheduleData = await scheduleResponse.json();
            console.log('📊 Schedule actual:', scheduleData);
            
            if (scheduleData.success && scheduleData.data) {
              const reservedTime = newAppointment.time;
              console.log('🎯 Horario a bloquear:', reservedTime);
              console.log('📊 TimeSlots actuales:', scheduleData.data.timeSlots);
              
              // Filtrar y dividir slots que contengan el horario reservado
              const updatedTimeSlots: any[] = [];
              
              scheduleData.data.timeSlots.forEach(slot => {
                const slotStart = slot.start;
                const slotEnd = slot.end;
                
                // Convertir horarios a minutos para comparación
                const reservedMinutes = parseInt(reservedTime.split(':')[0]) * 60 + parseInt(reservedTime.split(':')[1]);
                const slotStartMinutes = parseInt(slotStart.split(':')[0]) * 60 + parseInt(slotStart.split(':')[1]);
                const slotEndMinutes = parseInt(slotEnd.split(':')[0]) * 60 + parseInt(slotEnd.split(':')[1]);
                
                // Si el horario reservado está fuera de este slot, mantenerlo
                if (reservedMinutes < slotStartMinutes || reservedMinutes >= slotEndMinutes) {
                  updatedTimeSlots.push(slot);
                } else {
                  // El horario está dentro de este slot, dividir el slot
                  console.log(`🔪 Dividiendo slot ${slotStart}-${slotEnd} para excluir ${reservedTime}`);
                  
                  // Crear slot antes del horario reservado (si existe espacio)
                  if (slotStartMinutes < reservedMinutes) {
                    updatedTimeSlots.push({
                      start: slotStart,
                      end: reservedTime,
                      isCustom: false
                    });
                  }
                  
                  // Crear slot después del bloque reservado (usa duración configurada del profesional)
                  const reservedEndMinutes = reservedMinutes + appointmentDuration;
                  if (reservedEndMinutes < slotEndMinutes) {
                    const reservedEndHour = Math.floor(reservedEndMinutes / 60);
                    const reservedEndMin = reservedEndMinutes % 60;
                    const reservedEndTime = `${reservedEndHour.toString().padStart(2, '0')}:${reservedEndMin.toString().padStart(2, '0')}`;
                    
                    updatedTimeSlots.push({
                      start: reservedEndTime,
                      end: slotEnd,
                      isCustom: false
                    });
                  }
                }
              });
              
              console.log('🔄 TimeSlots actualizados (sin el horario reservado):', updatedTimeSlots);
              
              // Actualizar el schedule en la base de datos
              const updateResponse = await fetch(`${BACKEND_URL}/api/v1/date-schedules/${professionalIdToUse}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  professionalId: professionalIdToUse,
                  professionalName: user?.fullName || 'Profesional',
                  date: newAppointment.date,
                  timeSlots: updatedTimeSlots,
                  isAvailable: updatedTimeSlots.length > 0,
                }),
              });
              
              if (updateResponse.ok) {
                const updateResult = await updateResponse.json();
                console.log('✅ Horario marcado como ocupado en la base de datos:', updateResult);
              } else {
                const errorText = await updateResponse.text();
                console.error('❌ Error actualizando horarios disponibles:', errorText);
              }
            }
          }
        }
      } catch (error) {
        console.error('❌ Error marcando horario como ocupado:', error);
        // Continuar con el flujo aunque falle la actualización
      }

      // 3. Agregar la cita al contexto para que aparezca inmediatamente
      try {
        await addAppointment({
          id: mongoAppointmentId,
          professionalId: newAppointment.professionalId,
          professional: newAppointment.professional,
          service: newAppointment.service,
          date: newAppointment.date,
          time: newAppointment.time,
          patientName: newAppointment.patientName,
          patientPhone: newAppointment.patientPhone,
          patientEmail: newAppointment.patientEmail,
          notes: newAppointment.notes,
          totalAmount: newAppointment.totalAmount,
          status: isProfessional
            ? 'confirmed'
            : clientSavedWithDeposit
              ? 'pending_payment'
              : 'pending_approval',
          clientId: isProfessional ? professionalChosenClientId || '' : clientMongoId,
          patientId: isProfessional ? professionalChosenClientId || '' : clientMongoId,
        });
        console.log('✅ Cita agregada al contexto y aparecerá en la vista de hoy');
        
        // Refrescar las citas para asegurar que aparezca en la vista de hoy
        await refreshAppointments();
        console.log('🔄 Citas refrescadas, la nueva cita debería aparecer en la vista de hoy');

        if (clientSavedWithDeposit && mongoAppointmentId) {
          openReservaConSenaModal({
            appointmentId: mongoAppointmentId,
            depositAmount: depositAmountForPaymentModal,
            service: newAppointment.service,
            date: newAppointment.date,
            time: newAppointment.time,
            professional: newProfessionalAppointment.professionalName,
            professionalName: newProfessionalAppointment.professionalName,
            professionalId: professionalMongoId,
          });
        }
      } catch (error) {
        console.error('❌ Error agregando cita al contexto:', error);
        // Continuar con el flujo aunque falle la actualización del contexto
      }

      // Mostrar confirmación según el tipo de usuario
      if (isProfessional) {
        Alert.alert(
          '✅ Cita Creada y Confirmada',
          `La cita para ${newProfessionalAppointment.patientName} ha sido creada y confirmada automáticamente.\n\nServicio: ${newProfessionalAppointment.service}\nFecha: ${formatDateForDisplay(newProfessionalAppointment.date)}\nHora: ${newProfessionalAppointment.time}\n\nSe ha enviado una notificación al cliente.`,
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
    } else if (clientSavedWithDeposit) {
        // El modal de pago (DepositPaymentHost) se abre automáticamente; no duplicar con Alert.
      } else if (mongoAppointmentId) {
        Alert.alert(
          'Solicitud enviada',
          'Tu reserva quedó registrada. El profesional debe confirmarla; te avisaremos por notificaciones.',
          [{ text: 'Entendido', style: 'default' }]
        );
      } else {
        Alert.alert(
          'No se pudo registrar',
          'No pudimos guardar tu reserva en el servidor. Revisá tu conexión e intentá de nuevo.',
          [{ text: 'Entendido', style: 'default' }]
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

  // Función para verificar si una fecha está disponible para el profesional seleccionado
  const checkDateAvailability = (date: Date) => {
    // Verificar que la fecha sea válida
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      console.error('❌ Fecha inválida en checkDateAvailability:', date);
      return false;
    }
    
    if (!newProfessionalAppointment.professionalName) {
      // Si no hay profesional seleccionado, usar disponibilidad por defecto
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayName = dayNames[date.getDay()];
      const defaultAvailability = {
        'monday': true,
        'tuesday': true,
        'wednesday': true,
        'thursday': true,
        'friday': true,
        'saturday': true,
        'sunday': false
      };
      return defaultAvailability[dayName as keyof typeof defaultAvailability];
    }

    // Obtener el ID del profesional seleccionado
    const selectedProfessional = availableProfessionals.find(prof => 
      prof.name === newProfessionalAppointment.professionalName
    );
    
    if (!selectedProfessional) return false;

    // Usar la función isDateAvailable del contexto de disponibilidad
    // que ahora verifica la configuración real de la base de datos
    return isDateAvailable(selectedProfessional.id, date);
  };

  const getDaysInMonth = (date: Date) => {
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
    
    const days: { day: number; isCurrentMonth: boolean; isAvailable: boolean }[] = [];
    
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
      
      // Verificar que la fecha sea válida
      if (isNaN(checkDate.getTime())) {
        console.error('❌ Fecha inválida generada en getDaysInMonth:', { year, month, day });
        continue;
      }
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      days.push({
        day,
        isCurrentMonth: true,
        isAvailable: checkDateAvailability(checkDate) && checkDate >= today,
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

  // Abrir el mismo formulario de Reservar Cita cuando lo piden Calendario / Configuración
  useEffect(() => {
    if (!shouldOpenHoyBookingForm || isProfessional) return;
    setShowModal(true);
    closeHoyBookingForm();
  }, [shouldOpenHoyBookingForm, isProfessional, closeHoyBookingForm]);

  // Efecto para actualizar el nombre del profesional cuando el usuario cambie
  useEffect(() => {
    if (user?.userType === 'professional' && user?.fullName) {
      setNewProfessionalAppointment(prev => ({
        ...prev,
        professionalName: user.fullName,
        service: user.service || prev.service
      }));
    }
  }, [user]);

  // Efecto para actualizar la vista cuando cambian las citas
  useEffect(() => {
    const todayAppointments = getTodayAppointments();
    console.log('🔄 Citas de hoy actualizadas:', todayAppointments.length);
    console.log('📋 Detalles de citas de hoy:', todayAppointments.map(apt => ({
      id: apt.id,
      patientName: apt.patientName,
      time: apt.time,
      service: apt.service
    })));
  }, [appointments]);

  useEffect(() => {
    let cancelled = false;
    const defaultTimeSlots = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '15:30', '16:00', '17:00'];
    const blockingStatuses = new Set([
      'pending',
      'pending_approval',
      'pending_payment',
      'confirmed',
      'completed',
      'finished',
    ]);

    (async () => {
      if (newProfessionalAppointment.date && newProfessionalAppointment.professionalName) {
        const selectedProfessional = availableProfessionals.find(
          (prof) => prof.name === newProfessionalAppointment.professionalName
        );

        if (selectedProfessional) {
          const selectedDate = parseAppointmentFormDateToLocal(newProfessionalAppointment.date);
          if (!selectedDate) {
            if (!cancelled) setAvailableTimeSlots(defaultTimeSlots);
            return;
          }
          const ymd = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
          const slots = await getBookableTimeSlotsForProfessionalDate(selectedProfessional.id, ymd);

          const localOccupied = new Set(
            appointments
              .filter((apt) => {
                if (!blockingStatuses.has(String(apt.status))) return false;
                const aptDate = String(apt.date || '').slice(0, 10);
                const samePro =
                  String(apt.professionalId || '') === String(selectedProfessional.id) ||
                  String(apt.professional || '') === String(selectedProfessional.name);
                return samePro && aptDate === ymd;
              })
              .map((apt) => expoTimeToSlotKey(String(apt.time || '')) || String(apt.time || '').trim())
              .filter(Boolean)
          );

          const filtered = (slots.length > 0 ? slots : []).filter(
            (s) => !localOccupied.has(expoTimeToSlotKey(s) || s)
          );
          if (!cancelled) setAvailableTimeSlots(filtered);
        } else if (!cancelled) {
          setAvailableTimeSlots(defaultTimeSlots);
        }
      } else if (newProfessionalAppointment.date) {
        if (!cancelled) setAvailableTimeSlots(defaultTimeSlots);
      } else if (!cancelled) {
        setAvailableTimeSlots([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    newProfessionalAppointment.date,
    newProfessionalAppointment.professionalName,
    availableProfessionals,
    appointments,
  ]);

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

      {isProfessional && !hasProAccess() ? (
        <TouchableOpacity
          style={styles.subscribeBanner}
          activeOpacity={0.88}
          onPress={() => router.push('/subscribe' as Href)}
          accessibilityRole="button"
          accessibilityLabel="Suscribirse a Turnario Pro"
        >
          <View style={styles.subscribeBannerIconWrap}>
            <Ionicons name="sparkles" size={22} color="#667eea" />
          </View>
          <View style={styles.subscribeBannerTextCol}>
            <Text style={styles.subscribeBannerTitle}>Turnario Pro</Text>
            <Text style={styles.subscribeBannerSubtitle}>
              Activá tu plan desde Google Play para usar todas las funciones.
            </Text>
          </View>
          <View style={styles.subscribeBannerCta}>
            <Text style={styles.subscribeBannerCtaText}>Suscribirse</Text>
            <Ionicons name="chevron-forward" size={18} color="#fff" />
          </View>
        </TouchableOpacity>
      ) : null}

      <View style={styles.statsContainer}>
        <Text style={styles.sectionTitle}>
          {isProfessional ? 'Resumen del Día' : 'Resumen del Día'}
        </Text>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Ionicons name={isProfessional ? "people" : "calendar"} size={24} color="#4CAF50" />
            <Text style={styles.statNumber}>{isProfessional ? getTodayPatientsCount() : getTodayAppointmentsCount()}</Text>
            <Text style={styles.statLabel}>
              {isProfessional ? 'Pacientes Hoy' : 'Citas Hoy'}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="time" size={24} color="#2196F3" />
            <Text style={styles.statNumber}>{isProfessional ? getProfessionalPendingCount() : getPendingAppointmentsCount()}</Text>
            <Text style={styles.statLabel}>
              {isProfessional ? 'Citas Pendientes' : 'Pendientes'}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
            <Text style={styles.statNumber}>{isProfessional ? getTodayCompletedCount() : getCompletedAppointmentsCount()}</Text>
            <Text style={styles.statLabel} numberOfLines={1}>
              {isProfessional ? 'Completadas Hoy' : 'Completadas'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {isProfessional ? 'Próximas Citas' : 'Próximas Citas'}
        </Text>
        {(() => {
          const upcomingAppointments = getUserUpcomingAppointments();
          console.log('📋 Citas próximas del usuario:', upcomingAppointments.length);
          console.log('📋 Detalles de citas próximas:', upcomingAppointments.map(apt => ({
            id: apt.id,
            patientName: apt.patientName,
            date: apt.date,
            time: apt.time,
            service: apt.service,
            status: apt.status
          })));
          
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
          
          return (
            <View style={styles.appointmentsList}>
              {upcomingAppointments.map((appointment) => {
                const statusMeta = getDashboardStatusMeta(appointment.status);
                const isPendingForPro =
                  isProfessional &&
                  (appointment.status === 'pending' ||
                    appointment.status === 'pending_approval' ||
                    appointment.status === 'pending_payment');
                const canMarkComplete =
                  isProfessional &&
                  appointment.status === 'confirmed';
                const HeaderWrapper = isProfessional ? TouchableOpacity : View;
                const headerPressProps = isProfessional
                  ? {
                      activeOpacity: 0.7 as const,
                      onPress: () =>
                        setExpandedAppointmentId((prev) =>
                          prev === appointment.id ? null : appointment.id
                        ),
                    }
                  : {};
                return (
                  <View key={appointment.id} style={styles.appointmentCard}>
                    <HeaderWrapper style={styles.appointmentHeader} {...headerPressProps}>
                      <Ionicons
                        name={isProfessional ? 'person' : 'medical'}
                        size={20}
                        color="#4CAF50"
                      />
                      <Text style={styles.appointmentTitle}>
                        {isProfessional
                          ? appointment.patientName || appointment.clientName
                          : appointment.professional}
                      </Text>
                      <View style={[styles.statusBadge, { backgroundColor: statusMeta.color }]}>
                        <Text style={styles.statusText}>{statusMeta.label}</Text>
                      </View>
                      {isProfessional ? (
                        <Ionicons
                          name={expandedAppointmentId === appointment.id ? 'chevron-up' : 'chevron-down'}
                          size={22}
                          color="#666"
                          style={{ marginLeft: 4 }}
                        />
                      ) : null}
                    </HeaderWrapper>
                    <View style={styles.appointmentDetails}>
                      <Text style={styles.appointmentService}>{appointment.service}</Text>
                      <Text style={styles.appointmentDateTime}>
                        {appointment.date} - {appointment.time}
                      </Text>
                      {appointment.notes ? (
                        <Text style={styles.appointmentNotes}>{appointment.notes}</Text>
                      ) : null}
                      {isProfessional && expandedAppointmentId === appointment.id ? (
                        <View style={styles.appointmentExpanded}>
                          <Text style={styles.appointmentExpandHint}>
                            Registrá notas y tratamiento de esta sesión para el historial del paciente (Gestión de
                            pacientes).
                          </Text>
                          <TouchableOpacity
                            style={styles.sessionHistoryButton}
                            onPress={() => openProfessionalSessionModal(appointment)}
                            activeOpacity={0.85}
                          >
                            <Ionicons name="clipboard" size={20} color="#fff" style={{ marginRight: 8 }} />
                            <Text style={styles.sessionHistoryButtonText}>Notas y tratamiento de la sesión</Text>
                          </TouchableOpacity>
                        </View>
                      ) : null}
                      {isPendingForPro ? (
                        <View style={styles.pendingActionRow}>
                          <TouchableOpacity
                            style={[styles.pendingActionButton, styles.confirmAppointmentButton]}
                            onPress={() => handleConfirmAppointment(appointment.id)}
                            activeOpacity={0.85}
                          >
                            <Ionicons name="checkmark" size={18} color="#fff" style={{ marginRight: 6 }} />
                            <Text style={styles.completeAppointmentButtonText}>Confirmar</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.pendingActionButton, styles.rejectAppointmentButton]}
                            onPress={() => handleRejectAppointment(appointment.id)}
                            activeOpacity={0.85}
                          >
                            <Ionicons name="close" size={18} color="#fff" style={{ marginRight: 6 }} />
                            <Text style={styles.completeAppointmentButtonText}>Rechazar</Text>
                          </TouchableOpacity>
                        </View>
                      ) : null}
                      {canMarkComplete && (
                        <TouchableOpacity
                          style={styles.completeAppointmentButton}
                          onPress={() => handleMarkAppointmentComplete(appointment.id)}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="checkmark-done" size={18} color="#fff" style={{ marginRight: 8 }} />
                          <Text style={styles.completeAppointmentButtonText}>Marcar como completada</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          );
        })()}
      </View>

        <View style={styles.actionContainer}>
        <TouchableOpacity
          style={styles.actionButton}
            onPress={openModal}
          >
            <Ionicons name="add-circle" size={20} color="white" />
          <Text style={styles.actionButtonText}>
              {isProfessional ? 'Nueva Cita (Prof)' : 'Reservar Cita'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.profileButton]}
          onPress={() => router.push('/user-profile')}
        >
          <Ionicons name="person-circle" size={20} color="white" />
          <Text style={styles.actionButtonText}>
            Ver Perfil Completo
          </Text>
        </TouchableOpacity>

        {isProfessional && (
          <TouchableOpacity
            style={[styles.actionButton, styles.calendarButton]}
            onPress={() => router.push('/calendar')}
          >
            <Ionicons name="calendar" size={20} color="white" />
            <Text style={styles.actionButtonText}>
              Mi Calendario
            </Text>
          </TouchableOpacity>
        )}

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
                  {isProfessional ? 'Crear Nueva Cita' : 'Reservar Cita'}
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
                        void refreshProfessionalDirectory();
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
                    {newProfessionalAppointment.date ? formatDateForDisplay(newProfessionalAppointment.date) : 'Seleccionar fecha disponible...'}
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
               <TimeSlotSelector
                 selectedTime={newProfessionalAppointment.time}
                 onTimeSelect={(time: string) => setNewProfessionalAppointment(prev => ({ ...prev, time }))}
                 selectedDate={newProfessionalAppointment.date}
                 professionalId={isProfessional ? (user?._id || user?.id || user?.userId || '3') : availableProfessionals.find(prof => prof.name === newProfessionalAppointment.professionalName)?.id}
                 clinicId={user?.clinicId || '1'}
                 serviceId={newProfessionalAppointment.serviceId || '1'}
                 placeholder="Seleccionar horario disponible..."
                 style={styles.timeSlotSelector}
               />
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

              {/* Detalle de costos (solo cliente; seña según perfil del profesional) */}
              {!isProfessional && (
                <View style={styles.costSection}>
                  <Text style={styles.costSectionTitle}>Detalle de Costos</Text>
                  <View style={styles.costRow}>
                    <Text style={styles.costLabel}>Costo de la Consulta:</Text>
                    <Text style={styles.costValue}>
                      ${Math.round(consultationPriceClientBooking).toLocaleString('es-AR')}
                    </Text>
                  </View>
                  {selectedClientBookingProfessional &&
                    selectedClientBookingProfessional.clientBookingRequiresDeposit !== false && (
                      <>
                        <View style={styles.costRow}>
                          <Text style={styles.costLabel}>Seña ({clientDepositPct}%):</Text>
                          <Text style={styles.costValue}>
                            ${clientSeniaPreviewAmount.toLocaleString('es-AR')}
                          </Text>
                        </View>
                        <View style={styles.costDivider} />
                      </>
                    )}
                  <View style={styles.costRow}>
                    <Text style={styles.costLabel}>Total a pagar:</Text>
                    <Text style={styles.costTotal}>
                      ${Math.round(consultationPriceClientBooking).toLocaleString('es-AR')}
                    </Text>
                  </View>
                  <View style={styles.costNote}>
                    <Text style={styles.costNoteText}>
                      {selectedClientBookingProfessional &&
                      selectedClientBookingProfessional.clientBookingRequiresDeposit !== false
                        ? `* La seña de $${clientSeniaPreviewAmount.toLocaleString('es-AR')} se debe pagar para confirmar la cita`
                        : selectedClientBookingProfessional
                          ? 'Este profesional no requiere seña: solo pagás el costo de la consulta al momento del servicio (salvo que el consultorio indique lo contrario).'
                          : 'Seleccioná un profesional para ver si la reserva incluye seña.'}
                    </Text>
                  </View>
                </View>
              )}
            </ScrollView>

            <View style={[styles.modalActions, { paddingBottom: modalActionPaddingBottom }]}>
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
                    const missingFields: string[] = [];
                    
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
                    {isProfessional ? 'Crear Cita y Notificar Cliente' : 'Confirmar Cita'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Modal selector de fecha mejorado */}
        <ProfessionalCalendar
          visible={showDatePickerModal}
          onClose={() => setShowDatePickerModal(false)}
          onDateSelect={(formattedDate) => {
            setNewProfessionalAppointment(prev => ({ ...prev, date: formattedDate }));
          }}
          professionalId={isProfessional ? (user?._id || user?.id || user?.userId || '3') : (newProfessionalAppointment.professionalId || availableProfessionals.find(prof => prof.name === newProfessionalAppointment.professionalName)?.id || '3')}
          selectedDate={newProfessionalAppointment.date}
          isProfessional={isProfessional}
        />

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

        <ProfessionalPatientPicker
          visible={showPatientCatalogModal}
          professionalId={String(user?._id || user?.id || '')}
          onClose={() => setShowPatientCatalogModal(false)}
          onSelect={(p) => {
            const mongoId =
              p.clientId && /^[a-fA-F0-9]{24}$/.test(p.clientId) ? p.clientId : '';
            setNewProfessionalAppointment((prev) => ({
              ...prev,
              patientName: p.name,
              patientPhone: p.phone || '',
              patientEmail: p.email || '',
              patientClientId: mongoId,
            }));
            setShowPatientCatalogModal(false);
            setShowModal(true);
          }}
        />

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
                  setSelectedServiceCategory('Todas');
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

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.categoryScroll}
              contentContainerStyle={styles.categoryScrollContent}
            >
              {SERVICE_CATEGORIES.map((category) => {
                const isActive = selectedServiceCategory === category;
                return (
                  <TouchableOpacity
                    key={category}
                    style={[styles.categoryChip, isActive && styles.categoryChipActive]}
                    onPress={() => setSelectedServiceCategory(category)}
                  >
                    <Text style={[styles.categoryChipText, isActive && styles.categoryChipTextActive]}>
                      {category}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            
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
                  setProfessionalClinicQuery('');
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
              <View style={[styles.searchContainer, { marginTop: 10 }]}>
                <Ionicons name="business" size={20} color="#666" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Filtrar por consultorio..."
                  value={professionalClinicQuery}
                  onChangeText={setProfessionalClinicQuery}
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
                        {resolveMediaUrl(professional.image || professional.profileImage) ? (
                          <Image
                            source={{
                              uri: resolveMediaUrl(
                                professional.image || professional.profileImage
                              )!,
                            }}
                            style={styles.professionalAvatarImage}
                          />
                        ) : (
                          <Text style={styles.professionalInitials}>
                            {professional.avatar}
                          </Text>
                        )}
                      </View>
                      <View style={styles.professionalInfo}>
                        <Text style={styles.professionalName}>{professional.name}</Text>
                        <Text style={styles.professionalSpecialty}>{professional.specialty}</Text>
                        {Array.isArray(professional.clinicNames) && professional.clinicNames.length > 0 ? (
                          <Text style={styles.professionalClinics} numberOfLines={2}>
                            {professional.clinicNames.join(' · ')}
                          </Text>
                        ) : null}
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
                      ? availableProfessionals.length === 0
                        ? 'No se pudo cargar el directorio. Revisá que el teléfono esté en la misma Wi‑Fi que el backend y tocá Reintentar.'
                        : 'Probá otro servicio (ej. Entrenamiento Personal) o Reintentar'
                      : 'El profesional aparecerá una vez que selecciones el servicio'}
                  </Text>
                  <TouchableOpacity
                    style={{ marginTop: 16, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#667eea', borderRadius: 8 }}
                    onPress={() => void refreshProfessionalDirectory()}
                  >
                    <Text style={{ color: '#fff', fontWeight: '600' }}>Reintentar carga</Text>
                  </TouchableOpacity>
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
                    <Text style={styles.paymentDetailValue}>{formatDateForDisplay(newProfessionalAppointment.date)} - {newProfessionalAppointment.time}</Text>
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

            <View style={[styles.modalActions, { paddingBottom: modalActionPaddingBottom }]}>
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

        <Modal
          visible={!!sessionModalAppointment}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={closeProfessionalSessionModal}
        >
          <KeyboardAvoidingView
            style={styles.modalContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Notas y tratamiento · sesión</Text>
              <TouchableOpacity onPress={closeProfessionalSessionModal} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
              {sessionModalAppointment ? (
                <View style={styles.formSection}>
                  <Text style={styles.formLabel}>Paciente</Text>
                  <Text style={styles.sessionModalMeta}>
                    {sessionModalAppointment.patientName ||
                      sessionModalAppointment.clientName ||
                      '—'}
                  </Text>
                  <Text style={styles.formLabel}>Turno</Text>
                  <Text style={styles.sessionModalMeta}>
                    {sessionModalAppointment.date} · {sessionModalAppointment.time} ·{' '}
                    {sessionModalAppointment.service}
                  </Text>
                  <Text style={styles.formLabel}>Notas de la sesión</Text>
                  <TextInput
                    style={[styles.textInput, styles.sessionMultilineInput]}
                    placeholder="Evolución, observaciones, acuerdos…"
                    value={sessionFormNotes}
                    onChangeText={setSessionFormNotes}
                    multiline
                    textAlignVertical="top"
                  />
                  <Text style={styles.formLabel}>Tratamiento / indicaciones de esta sesión</Text>
                  <TextInput
                    style={[styles.textInput, styles.sessionMultilineInput]}
                    placeholder="Técnicas aplicadas, tareas, medicación indicada…"
                    value={sessionFormTreatment}
                    onChangeText={setSessionFormTreatment}
                    multiline
                    textAlignVertical="top"
                  />
                  <TouchableOpacity
                    style={[
                      styles.sessionSaveButton,
                      isSavingProfessionalSession && { opacity: 0.65 },
                    ]}
                    onPress={() => void handleSaveProfessionalSession()}
                    disabled={isSavingProfessionalSession}
                    activeOpacity={0.9}
                  >
                    <Ionicons name="save" size={20} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.sessionSaveButtonText}>
                      {isSavingProfessionalSession
                        ? 'Guardando...'
                        : sessionModalCompletesAppointment
                          ? 'Guardar y completar cita'
                          : 'Guardar en historial'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </ScrollView>
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
  subscribeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 4,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: '#667eea',
    borderRadius: 12,
    gap: 12,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  subscribeBannerIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subscribeBannerTextCol: {
    flex: 1,
    minWidth: 0,
  },
  subscribeBannerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
  },
  subscribeBannerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.92)',
    lineHeight: 16,
  },
  subscribeBannerCta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.15)',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 2,
  },
  subscribeBannerCtaText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
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
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minWidth: 100,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
    flexWrap: 'nowrap',
    minWidth: 80,
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
  profileButton: {
    backgroundColor: '#4CAF50',
    marginTop: 12,
  },
  calendarButton: {
    backgroundColor: '#FF9800',
    marginTop: 12,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#667eea',
  },
  secondaryButtonText: {
    color: '#667eea',
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
  
  // Estilos para el selector de hora (lista en modal)
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
    paddingBottom: Platform.OS === 'android' ? 34 : 20,
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
  categoryScroll: {
    marginHorizontal: 20,
    marginBottom: 8,
    maxHeight: 44,
  },
  categoryScrollContent: {
    paddingRight: 20,
    alignItems: 'center',
  },
  categoryChip: {
    paddingHorizontal: 12,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#fff',
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  categoryChipActive: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  categoryChipText: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '600',
  },
  categoryChipTextActive: {
    color: '#fff',
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
    overflow: 'hidden',
  },
  professionalAvatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
    marginBottom: 4,
  },
  professionalClinics: {
    fontSize: 12,
    color: '#6366E1',
    marginBottom: 6,
    fontWeight: '500',
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
  
  // Estilos para el TimeSlotSelector
  timeSlotSelector: {
    marginTop: 4,
  },
  
  // Estilos para las tarjetas de citas
  appointmentsList: {
    gap: 12,
  },
  appointmentCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  appointmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  appointmentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  appointmentDetails: {
    marginLeft: 28,
  },
  appointmentService: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  appointmentDateTime: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
    marginBottom: 4,
  },
  appointmentNotes: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  completeAppointmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#2196F3',
    borderRadius: 10,
  },
  pendingActionRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 10,
  },
  pendingActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  confirmAppointmentButton: {
    backgroundColor: '#4CAF50',
  },
  rejectAppointmentButton: {
    backgroundColor: '#F44336',
  },
  completeAppointmentButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  appointmentExpanded: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e0e0e0',
  },
  appointmentExpandHint: {
    fontSize: 13,
    color: '#555',
    marginBottom: 10,
    lineHeight: 18,
  },
  sessionHistoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#00897B',
    borderRadius: 10,
  },
  sessionHistoryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  sessionModalMeta: {
    fontSize: 15,
    color: '#333',
    marginBottom: 12,
  },
  sessionMultilineInput: {
    minHeight: 100,
    paddingTop: 12,
    marginBottom: 14,
  },
  sessionSaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    paddingVertical: 14,
    backgroundColor: '#4CAF50',
    borderRadius: 10,
  },
  sessionSaveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
