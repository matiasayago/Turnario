import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ConditionalScreen from '../../components/ConditionalScreen';
import CustomCalendar from '../../components/CustomCalendar';
import TimeSlotSelector from '../../components/TimeSlotSelector';
import { getBackendBaseUrl } from '../../config/backend';
import { openMercadoPagoDirectly } from '../../config/mercadopago';
import {
  getServicesByCategory,
  professionalOffersService,
  SERVICE_CATEGORIES,
  SERVICES,
  searchServices,
} from '../../constants/services';
import { useAppointments } from '../../contexts/AppointmentContext';
import { useAuth } from '../../contexts/AuthContext';
import { useAvailability } from '../../contexts/AvailabilityContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { useNewAppointment } from '../../contexts/NewAppointmentContext';
import { useReservaConSena } from '../../contexts/ReservaConSenaContext';
import { canClientCancelAppointment } from '../../utils/appointmentCancellationPolicy';
import { getBookableTimeSlotsForProfessionalDate } from '../../services/bookingSlotsService';
import { simpleAuthService } from '../../services/simpleAuthService';
import { consumeOpenManageScheduleModalRequest } from '../../utils/scheduleNavigation';

/** Parsea YYYY-MM-DD como fecha local (no UTC) para evitar desfase de un día en AR. */
function parseLocalYmd(dateInput: string): Date | null {
  const s = String(dateInput || '').trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split('-').map((n) => parseInt(n, 10));
  const date = new Date(y, m - 1, d);
  return Number.isNaN(date.getTime()) ? null : date;
}

const BACKEND_URL = getBackendBaseUrl();

const CLIENT_RESERVA_TOTAL_AMOUNT = 10000;

function resolveProfessionalMongoId(
  isProfessionalUser: boolean,
  userId: string | undefined,
  appointment: { professionalId: string; professionalName: string },
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

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const modalActionPaddingBottom =
    Platform.OS === 'android'
      ? Math.max(insets.bottom + 24, 44)
      : Math.max(insets.bottom + 12, 24);
  const params = useLocalSearchParams<{ manageSchedule?: string | string[] }>();
  const { user } = useAuth();
  const [forceOpenFromSettings, setForceOpenFromSettings] = useState(false);
  const forceOpenScheduleModal = useMemo(() => {
    const raw = params?.manageSchedule;
    const fromQuery = Array.isArray(raw) ? raw.includes('1') || raw.includes('true') : raw === '1' || raw === 'true';
    return fromQuery || forceOpenFromSettings;
  }, [params?.manageSchedule, forceOpenFromSettings]);

  useEffect(() => {
    setForceOpenFromSettings(consumeOpenManageScheduleModalRequest());
  }, []);

  const { addNotification } = useNotifications();
  const {
    addAppointment,
    getUpcomingAppointments,
    appointments,
    refreshAppointments,
    cancelAppointmentAsClient,
    rescheduleAppointmentAsClient,
    cancelAppointmentAsProfessional,
    rescheduleAppointmentAsProfessional,
  } = useAppointments();
  const { shouldOpenReservaConSenaModal, closeReservaConSenaModal, openReservaConSenaModal } = useReservaConSena();
  const { openHoyBookingForm } = useNewAppointment();
  const { availableProfessionals, refreshProfessionalDirectory } = useAvailability();
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
    professionalId: '',
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

  // Estados para los selectores modales
  const [showServiceSelectorModal, setShowServiceSelectorModal] = useState(false);
  const [showProfessionalSelectorModal, setShowProfessionalSelectorModal] = useState(false);
  const [showDatePickerModal, setShowDatePickerModal] = useState(false);
  const [showTimePickerModal, setShowTimePickerModal] = useState(false);
  
  // Estados para búsquedas
  const [serviceSearchQuery, setServiceSearchQuery] = useState('');
  const [selectedServiceCategory, setSelectedServiceCategory] = useState<string>('Todas');
  const [professionalSearchQuery, setProfessionalSearchQuery] = useState('');
  const [professionalClinicQuery, setProfessionalClinicQuery] = useState('');
  
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
  const [markedDates, setMarkedDates] = useState<{[key: string]: any}>({});
  const [availableSlots, setAvailableSlots] = useState<Array<{date: string; slots: string[]}>>([]);

  // Estados para configuración de disponibilidad
  const [showAvailabilityConfigModal, setShowAvailabilityConfigModal] = useState(false);
  const [showScheduleConfigModal, setShowScheduleConfigModal] = useState(false);

  const [isSubmittingClientReserva, setIsSubmittingClientReserva] = useState(false);

  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleTarget, setRescheduleTarget] = useState<{
    id: string;
    professionalId: string;
    professional: string;
    service: string;
    date: string;
    time: string;
    serviceId?: string;
  } | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [rescheduleMarkedDates, setRescheduleMarkedDates] = useState<Record<string, unknown>>({});

  const clientCalendarUserId = String(user?._id ?? user?.id ?? '').trim();
  const professionalCalendarUserId = clientCalendarUserId;

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

  /** Cliente: crear cita con seña en el backend y abrir pago Mercado Pago */
  const submitClientReservaConSenaFromCalendar = async () => {
    if (isProfessional) {
      Alert.alert('Profesional', 'La creación de citas desde este formulario está en desarrollo. Usá la pestaña Hoy o el flujo de paciente.');
      return;
    }
    const missing: string[] = [];
    if (!newProfessionalAppointment.service?.trim()) missing.push('• Servicio');
    if (!newProfessionalAppointment.professionalName?.trim()) missing.push('• Profesional');
    if (!newProfessionalAppointment.date?.trim()) missing.push('• Fecha');
    if (!newProfessionalAppointment.time?.trim()) missing.push('• Hora');
    if (missing.length) {
      Alert.alert(
        'Reserva incompleta',
        `Completá:\n\n${missing.join('\n')}`,
        [{ text: 'Entendido' }]
      );
      return;
    }

    const clientMongoId = String(user?._id || user?.id || '').trim();
    const professionalMongoId = resolveProfessionalMongoId(
      false,
      user?._id || user?.id,
      {
        professionalId: newProfessionalAppointment.professionalId,
        professionalName: newProfessionalAppointment.professionalName,
      },
      availableProfessionals
    );

    if (!professionalMongoId || professionalMongoId.length !== 24) {
      Alert.alert(
        'Profesional',
        'No se pudo determinar el ID del profesional. Elegí de nuevo el profesional en el listado.'
      );
      return;
    }
    if (!clientMongoId) {
      Alert.alert('Sesión', 'No se pudo identificar tu usuario. Iniciá sesión nuevamente.');
      return;
    }

    const clientRequiresSenia =
      !!selectedClientBookingProfessional &&
      selectedClientBookingProfessional.clientBookingRequiresDeposit !== false;
    const clientTotalForApi = consultationPriceClientBooking;
    const clientDepositForApi = clientRequiresSenia ? clientSeniaPreviewAmount : 0;

    setIsSubmittingClientReserva(true);
    try {
      let appointmentDuration = 30;
      try {
        const availabilityResponse = await fetch(
          `${BACKEND_URL}/api/v1/availability/${professionalMongoId}`
        );
        if (availabilityResponse.ok) {
          const availabilityData = await availabilityResponse.json();
          if (availabilityData.success && availabilityData.data?.appointmentDuration) {
            appointmentDuration = availabilityData.data.appointmentDuration;
          }
        }
      } catch {
        /* duración por defecto */
      }

      const authHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      const token = await simpleAuthService.getToken();
      if (token) authHeaders.Authorization = `Bearer ${token}`;

      const dateStr = String(newProfessionalAppointment.date).split('T')[0];
      const patientName = user?.fullName || 'Cliente';

      const response = await fetch(`${BACKEND_URL}/api/v1/appointments/create`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          professionalId: professionalMongoId,
          clientId: clientMongoId,
          service: newProfessionalAppointment.service,
          date: dateStr,
          time: newProfessionalAppointment.time,
          duration: appointmentDuration,
          patientName,
          patientPhone: user?.phone || '',
          patientEmail: user?.email || '',
          notes: newProfessionalAppointment.notes || '',
          status: clientRequiresSenia ? 'pending_payment' : 'pending_approval',
          totalAmount: clientTotalForApi,
          professional: newProfessionalAppointment.professionalName,
          bookingSource: 'client',
          requireDeposit: clientRequiresSenia,
          depositAmount: clientDepositForApi,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error('❌ Error creando cita (calendario):', response.status, errText);
        Alert.alert(
          'No se pudo reservar',
          response.status === 409
            ? 'Ese horario ya no está disponible. Elegí otro turno.'
            : 'Revisá tu conexión e intentá de nuevo.'
        );
        return;
      }

      const savedAppointment = await response.json();
      const mongoAppointmentId =
        savedAppointment?.success && savedAppointment?.data?._id
          ? String(savedAppointment.data._id)
          : '';
      if (!mongoAppointmentId || mongoAppointmentId.length !== 24) {
        Alert.alert('Error', 'La respuesta del servidor no incluyó la cita. Intentá de nuevo.');
        return;
      }

      const serverRow = savedAppointment?.data;
      const needsDepositPayment =
        serverRow?.status === 'pending_payment' &&
        serverRow?.paymentStatus === 'pending' &&
        Number(serverRow?.depositAmount) > 0;
      const depositToCharge = Number.isFinite(Number(serverRow?.depositAmount))
        ? Number(serverRow.depositAmount)
        : clientDepositForApi;

      try {
        const professionalIdToUse = professionalMongoId;
        const scheduleResponse = await fetch(
          `${BACKEND_URL}/api/v1/date-schedules/${professionalIdToUse}/${dateStr}`
        );
        if (scheduleResponse.ok) {
          const scheduleData = await scheduleResponse.json();
          if (scheduleData.success && scheduleData.data?.timeSlots) {
            const reservedTime = newProfessionalAppointment.time;
            const updatedTimeSlots: { start: string; end: string; isCustom: boolean }[] = [];
            scheduleData.data.timeSlots.forEach((slot: { start: string; end: string }) => {
              const slotStart = slot.start;
              const slotEnd = slot.end;
              const reservedMinutes =
                parseInt(reservedTime.split(':')[0], 10) * 60 +
                parseInt(reservedTime.split(':')[1], 10);
              const slotStartMinutes =
                parseInt(slotStart.split(':')[0], 10) * 60 + parseInt(slotStart.split(':')[1], 10);
              const slotEndMinutes =
                parseInt(slotEnd.split(':')[0], 10) * 60 + parseInt(slotEnd.split(':')[1], 10);
              if (reservedMinutes < slotStartMinutes || reservedMinutes >= slotEndMinutes) {
                updatedTimeSlots.push({ ...slot, isCustom: false });
              } else {
                if (slotStartMinutes < reservedMinutes) {
                  updatedTimeSlots.push({ start: slotStart, end: reservedTime, isCustom: false });
                }
                const reservedEndMinutes = reservedMinutes + appointmentDuration;
                if (reservedEndMinutes < slotEndMinutes) {
                  const reservedEndHour = Math.floor(reservedEndMinutes / 60);
                  const reservedEndMin = reservedEndMinutes % 60;
                  const reservedEndTime = `${String(reservedEndHour).padStart(2, '0')}:${String(reservedEndMin).padStart(2, '0')}`;
                  updatedTimeSlots.push({ start: reservedEndTime, end: slotEnd, isCustom: false });
                }
              }
            });
            await fetch(`${BACKEND_URL}/api/v1/date-schedules/${professionalIdToUse}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                professionalId: professionalIdToUse,
                professionalName: newProfessionalAppointment.professionalName,
                date: dateStr,
                timeSlots: updatedTimeSlots,
                isAvailable: updatedTimeSlots.length > 0,
              }),
            });
          }
        }
      } catch (e) {
        console.warn('⚠️ No se pudo actualizar horarios disponibles:', e);
      }

      await addAppointment({
        id: mongoAppointmentId,
        professionalId: professionalMongoId,
        professional: newProfessionalAppointment.professionalName,
        service: newProfessionalAppointment.service,
        date: dateStr,
        time: newProfessionalAppointment.time,
        patientName,
        patientPhone: user?.phone || '',
        patientEmail: user?.email || '',
        notes: newProfessionalAppointment.notes || '',
        totalAmount: clientTotalForApi,
        status: needsDepositPayment ? 'pending_payment' : 'pending_approval',
        clientId: clientMongoId,
        patientId: clientMongoId,
      });
      await refreshAppointments();

      if (needsDepositPayment) {
        openReservaConSenaModal({
          appointmentId: mongoAppointmentId,
          depositAmount: depositToCharge,
          service: newProfessionalAppointment.service,
          date: dateStr,
          time: newProfessionalAppointment.time,
          professional: newProfessionalAppointment.professionalName,
          professionalName: newProfessionalAppointment.professionalName,
          professionalId: professionalMongoId,
        });
      } else {
        Alert.alert(
          'Solicitud enviada',
          'Tu reserva quedó registrada. El profesional debe confirmarla; te avisaremos por notificaciones.'
        );
      }
    } catch (error) {
      console.error('❌ submitClientReservaConSenaFromCalendar:', error);
      Alert.alert('Error', 'No se pudo completar la reserva. Intentá nuevamente.');
    } finally {
      setIsSubmittingClientReserva(false);
    }
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
      professionalId: '',
      serviceId: '',
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
      professionalId: '', // Evitar mantener un ID de profesional incompatible
    }));
    
    // Cerrar el selector de servicios
    setShowServiceSelectorModal(false);
    setServiceSearchQuery('');
    
    // Volver al formulario de Crear Nueva Cita
    setShowModal(true);
  };

  /** Meses hacia adelante con date-schedules (misma fuente que Gestión de horarios en Configuración). */
  const DATE_SCHEDULE_MONTHS_AHEAD = 6;

  // Función para cargar fechas disponibles del profesional (solo días guardados en date-schedules)
  const loadProfessionalAvailableDates = async (professionalId: string, displayName?: string) => {
    try {
      console.log(
        `📅 Cargando fechas disponibles para: ${displayName || professionalId} (id: ${professionalId})`
      );

      const isMongoId = /^[a-fA-F0-9]{24}$/.test(String(professionalId).trim());
      if (!isMongoId) {
        console.warn('⚠️ Profesional sin ObjectId de Mongo: no se consultan fechas en el servidor.');
        setMarkedDates({});
        setAvailableSlots([]);
        return;
      }
      console.log(`🌐 URL Backend: ${BACKEND_URL}`);

      const newMarkedDates: { [key: string]: any } = {};
      const slotsByDate = new Map<string, string[]>();
      const now = new Date();
      const candidateDates = new Set<string>();

      for (let i = 0; i < DATE_SCHEDULE_MONTHS_AHEAD; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
        const year = d.getFullYear();
        const month = d.getMonth() + 1;
        const url = `${BACKEND_URL}/api/v1/date-schedules/${professionalId}/month/${year}/${month}`;
        const response = await fetch(url);
        if (!response.ok) continue;
        const data = await response.json();
        if (!data.success || !Array.isArray(data.data) || data.data.length === 0) continue;

        data.data.forEach((schedule: any) => {
          if (
            schedule.date &&
            schedule.timeSlots &&
            schedule.timeSlots.length > 0 &&
            schedule.isAvailable !== false
          ) {
            candidateDates.add(String(schedule.date).slice(0, 10));
          }
        });
      }

      const bookableList = await Promise.all(
        [...candidateDates].map(async (dateYmd) => {
          const bookable = await getBookableTimeSlotsForProfessionalDate(professionalId, dateYmd);
          return { dateYmd, bookable };
        })
      );

      for (const { dateYmd, bookable } of bookableList) {
        if (!bookable.length) continue;
        newMarkedDates[dateYmd] = {
          marked: true,
          selected: false,
          selectedColor: '#4CAF50',
          dotColor: '#4CAF50',
        };
        slotsByDate.set(dateYmd, bookable);
      }

      const newAvailableSlots = [...slotsByDate.entries()].map(([date, slots]) => ({
        date,
        slots,
      }));

      setMarkedDates(newMarkedDates);
      setAvailableSlots(newAvailableSlots);
      console.log(
        `📆 ${Object.keys(newMarkedDates).length} fechas desde Gestión de horarios (date-schedules)`
      );
    } catch (error) {
      console.error('❌ Error cargando fechas del profesional:', error);
      setMarkedDates({});
      setAvailableSlots([]);
    }
  };

  /** Fechas disponibles para el modal de reprogramación (no mezcla con la reserva nueva). */
  /** Incluye `includeDateYmd` aunque no queden franjas libres (misma fecha del turno a reprogramar). */
  const loadRescheduleMarkedDates = async (professionalId: string, includeDateYmd?: string) => {
    try {
      const isMongoId = /^[a-fA-F0-9]{24}$/.test(String(professionalId).trim());
      if (!isMongoId) {
        setRescheduleMarkedDates({});
        return;
      }
      const includeYmd = includeDateYmd ? String(includeDateYmd).slice(0, 10) : '';
      const next: Record<string, unknown> = {};
      const now = new Date();
      const candidateDates = new Set<string>();
      for (let i = 0; i < DATE_SCHEDULE_MONTHS_AHEAD; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
        const year = d.getFullYear();
        const month = d.getMonth() + 1;
        const url = `${BACKEND_URL}/api/v1/date-schedules/${professionalId}/month/${year}/${month}`;
        const response = await fetch(url);
        if (!response.ok) continue;
        const data = await response.json();
        if (!data.success || !Array.isArray(data.data)) continue;
        data.data.forEach((schedule: { date?: string; timeSlots?: unknown[]; isAvailable?: boolean }) => {
          const day = schedule.date ? String(schedule.date).slice(0, 10) : '';
          if (
            day &&
            schedule.timeSlots &&
            schedule.timeSlots.length > 0 &&
            schedule.isAvailable !== false
          ) {
            candidateDates.add(day);
          }
        });
      }

      await Promise.all(
        [...candidateDates].map(async (day) => {
          const bookable = await getBookableTimeSlotsForProfessionalDate(professionalId, day);
          if (bookable.length > 0 || (includeYmd && day === includeYmd)) {
            next[day] = {
              marked: true,
              selected: false,
              selectedColor: '#4CAF50',
              dotColor: '#4CAF50',
            };
          }
        })
      );

      setRescheduleMarkedDates(next);
    } catch {
      setRescheduleMarkedDates({});
    }
  };

  const closeRescheduleModal = () => {
    setShowRescheduleModal(false);
    setRescheduleTarget(null);
    setRescheduleDate('');
    setRescheduleTime('');
    setRescheduleMarkedDates({});
  };

  const openRescheduleForAppointment = async (apt: {
    id: string;
    professionalId: string;
    professional: string;
    service: string;
    date: string;
    time: string;
    serviceId?: string;
    status: string;
  }) => {
    const activeClientStatus =
      apt.status === 'confirmed' ||
      apt.status === 'pending' ||
      apt.status === 'pending_approval' ||
      apt.status === 'pending_payment';
    if (!activeClientStatus) {
      Alert.alert('No disponible', 'Solo podés reprogramar citas activas (confirmadas o pendientes).');
      return;
    }
    if (!isProfessional) {
      const gate = canClientCancelAppointment(apt.date, apt.time);
      if (!gate.ok) {
        Alert.alert('No podés reprogramar', gate.message || '');
        return;
      }
    }
    setRescheduleTarget({
      id: apt.id,
      professionalId: apt.professionalId,
      professional: apt.professional,
      service: apt.service,
      date: apt.date,
      time: apt.time,
      serviceId: apt.serviceId,
    });
    setRescheduleDate(apt.date);
    setRescheduleTime(apt.time);
    await loadRescheduleMarkedDates(apt.professionalId, apt.date);
    setShowRescheduleModal(true);
  };

  const confirmReschedule = async () => {
    if (!rescheduleTarget) return;
    const r = isProfessional
      ? await rescheduleAppointmentAsProfessional(
          rescheduleTarget.id,
          rescheduleDate,
          rescheduleTime
        )
      : await rescheduleAppointmentAsClient(
          rescheduleTarget.id,
          rescheduleDate,
          rescheduleTime
        );
    if (!r.ok) {
      Alert.alert('No se pudo reprogramar', r.message || 'Intentá de nuevo.');
      return;
    }
    Alert.alert(
      'Cita reprogramada',
      isProfessional
        ? 'El turno quedó actualizado. El paciente recibirá una notificación en la app.'
        : 'Pediste un nuevo horario. Queda pendiente hasta que el profesional lo confirme.'
    );
    closeRescheduleModal();
  };

  const handleCancelAppointmentFromCalendar = (apt: {
    id: string;
    date: string;
    time: string;
  }) => {
    if (isProfessional) {
      Alert.alert(
        'Cancelar cita',
        '¿Confirmás la cancelación? El paciente recibirá una notificación en la app.',
        [
          { text: 'No', style: 'cancel' },
          {
            text: 'Sí, cancelar',
            style: 'destructive',
            onPress: async () => {
              try {
                const r = await cancelAppointmentAsProfessional(apt.id);
                if (!r.ok) {
                  Alert.alert('No se pudo cancelar', r.message || 'Intentá de nuevo.');
                  return;
                }
                Alert.alert('Cita cancelada', 'La cita fue cancelada y se notificó al paciente.');
              } catch {
                Alert.alert('Error', 'No se pudo cancelar la cita.');
              }
            },
          },
        ]
      );
      return;
    }
    const gate = canClientCancelAppointment(apt.date, apt.time);
    if (!gate.ok) {
      Alert.alert('No podés cancelar este turno', gate.message || '');
      return;
    }
    Alert.alert(
      'Cancelar cita',
      '¿Confirmás la cancelación? Solo está permitida con al menos 48 horas de anticipación. El profesional recibirá un aviso.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, cancelar',
          style: 'destructive',
          onPress: async () => {
            try {
              const r = await cancelAppointmentAsClient(apt.id);
              if (!r.ok) {
                Alert.alert('No se pudo cancelar', r.message || 'Intentá de nuevo.');
                return;
              }
              Alert.alert('Cita cancelada', 'Tu cita fue cancelada y se notificó al profesional.');
            } catch {
              Alert.alert('Error', 'No se pudo cancelar la cita.');
            }
          },
        },
      ]
    );
  };

  // Función para seleccionar un profesional
  const handleProfessionalSelect = async (professional: {
    id: string;
    name: string;
    specialty?: string;
  }) => {
    setNewProfessionalAppointment((prev) => ({
      ...prev,
      professionalName: professional.name,
      professionalId: professional.id,
    }));

    await loadProfessionalAvailableDates(professional.id, professional.name);
    
    // Cerrar el selector de profesionales
    setShowProfessionalSelectorModal(false);
    setProfessionalSearchQuery('');
    setProfessionalClinicQuery('');
    
    // Volver al formulario de Crear Nueva Cita
    setShowModal(true);
  };

  // Función para obtener servicios filtrados
  const getFilteredServices = () => {
    let filtered: string[] = [...SERVICES];
    if (selectedServiceCategory !== 'Todas') {
      filtered = getServicesByCategory(selectedServiceCategory);
    }
    if (serviceSearchQuery.trim()) {
      const results = new Set<string>(searchServices(serviceSearchQuery) as string[]);
      filtered = filtered.filter((service) => results.has(service));
    }
    return filtered;
  };

  // Mismo criterio que en Hoy (index): catálogo SERVICES + directorio API + mocks
  const getFilteredProfessionals = () => {
    const selectedService = newProfessionalAppointment.service;
    const hasSearch = professionalSearchQuery.trim().length > 0;
    const hasClinic = professionalClinicQuery.trim().length > 0;

    let list = availableProfessionals;
    if (selectedService?.trim()) {
      list = availableProfessionals.filter((p) =>
        professionalOffersService(p, selectedService, { strict: true })
      );
      if (list.length === 0) {
        list = availableProfessionals.filter((p) =>
          professionalOffersService(p, selectedService, { strict: false })
        );
      }
    } else if (!hasSearch && !hasClinic) {
      return [];
    }

    console.log(
      `🔍 Calendario — servicio "${selectedService || '(ninguno)'}": ${list.length} profesional(es)`
    );

    if (hasSearch) {
      const query = professionalSearchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          (p.specialty && p.specialty.toLowerCase().includes(query)) ||
          (p.location && p.location.toLowerCase().includes(query)) ||
          (Array.isArray(p.clinicNames) &&
            p.clinicNames.some((n) => String(n).toLowerCase().includes(query)))
      );
    }

    if (hasClinic) {
      const cq = professionalClinicQuery.toLowerCase().trim();
      list = list.filter((p) => {
        const loc = (p.location || '').toLowerCase();
        const clinics = Array.isArray(p.clinicNames) ? p.clinicNames : [];
        return loc.includes(cq) || clinics.some((n) => String(n).toLowerCase().includes(cq));
      });
    }

    return list;
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
      clientId: user?._id ?? user?.id ?? 'cliente',
      clientName: user?.fullName || 'Cliente',
    });
    
    // Enviar notificación al profesional
    addNotification({
      type: 'appointment_request',
      title: 'Nueva Solicitud de Cita',
      message: `Nueva solicitud de cita para ${selectedServiceOld}`,
      recipientId: professionalId,
      senderId: user?._id ?? user?.id ?? 'cliente',
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

  // Las fechas marcadas vienen solo de date-schedules (Gestión de horarios), no de datos de prueba.
  useEffect(() => {
    setMarkedDates({});
    setAvailableSlots([]);
  }, []);

  // Debug: Mostrar cuándo cambian las fechas marcadas
  useEffect(() => {
    console.log('🔄 markedDates actualizado - Total:', Object.keys(markedDates).length);
  }, [markedDates]);

  // Función para obtener horarios disponibles de una fecha específica
  const getAvailableTimeSlots = (date: string) => {
    const availableSlot = availableSlots.find(slot => slot.date === date);
    return availableSlot ? availableSlot.slots : [];
  };

  // Función para formatear la fecha en español
  const formatDateInSpanish = (dateString: string) => {
    const date = parseLocalYmd(dateString) || new Date(dateString);
    if (Number.isNaN(date.getTime())) return String(dateString || '');
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    return date.toLocaleDateString('es-ES', options);
  };

  return (
    <ConditionalScreen screenName="schedule" forceOpenScheduleModal={forceOpenScheduleModal}>
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
            const upcomingAppointments = getUpcomingAppointments(
              isProfessional ? professionalCalendarUserId : clientCalendarUserId
            );
            console.log(
              '🔍 Debug Calendar - Citas próximas para usuario:',
              isProfessional ? professionalCalendarUserId : clientCalendarUserId
            );
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
              const appointmentDate = parseLocalYmd(String(appointment.date || ''));
              const day = appointmentDate ? appointmentDate.getDate() : '';
              const month = appointmentDate
                ? appointmentDate.toLocaleDateString('es-ES', { month: 'short' })
                : '';
              
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
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor:
                            appointment.status === 'confirmed'
                              ? '#4CAF50'
                              : appointment.status === 'cancelled'
                                ? '#F44336'
                                : '#FFC107',
                        },
                      ]}
                    >
                      <Text style={styles.statusText}>
                        {appointment.status === 'confirmed'
                          ? 'Confirmado'
                          : appointment.status === 'pending' ||
                              appointment.status === 'pending_approval' ||
                              appointment.status === 'pending_payment'
                            ? 'Pendiente'
                            : appointment.status === 'cancelled'
                              ? 'Cancelado'
                              : 'Otro'}
                      </Text>
                    </View>
                  </View>

                  {(appointment.status === 'confirmed' ||
                    appointment.status === 'pending' ||
                    appointment.status === 'pending_approval' ||
                    appointment.status === 'pending_payment') && (
                    <View style={styles.appointmentClientActions}>
                      <TouchableOpacity
                        style={[styles.appointmentClientActionBtn, styles.appointmentRescheduleBtn]}
                        onPress={() => openRescheduleForAppointment(appointment)}
                      >
                        <Ionicons name="calendar-outline" size={16} color="#e65100" />
                        <Text style={styles.appointmentRescheduleBtnText}>Reprogramar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.appointmentClientActionBtn, styles.appointmentCancelBtn]}
                        onPress={() => handleCancelAppointmentFromCalendar(appointment)}
                      >
                        <Ionicons name="close-circle-outline" size={16} color="#c62828" />
                        <Text style={styles.appointmentCancelBtnText}>Cancelar</Text>
                      </TouchableOpacity>
                    </View>
                  )}
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
                  // Mismo formulario de Reservar Cita que en la pestaña Hoy
                  openHoyBookingForm();
                  router.push('/(tabs)' as never);
                }
              }}
            >
              <Ionicons name="add-circle" size={20} color="white" />
              <Text style={styles.actionButtonText}>
                {isProfessional ? 'Nueva Cita (Prof)' : 'Reservar cita'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Botones de configuración para profesionales */}
          {isProfessional && (
            <View style={styles.configButtonsContainer}>
              <TouchableOpacity
                style={styles.configButton}
                onPress={() => {
                  console.log('🎯 Abriendo configuración de horarios');
                  setShowScheduleConfigModal(true);
                }}
              >
                <Ionicons name="time-outline" size={20} color="#667eea" />
                <Text style={styles.configButtonText}>Configurar Horarios</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.configButton}
                onPress={() => {
                  const uid = String(user?._id || user?.id || '').trim();
                  if (uid && /^[a-fA-F0-9]{24}$/.test(uid)) {
                    loadProfessionalAvailableDates(uid, user?.fullName);
                  }
                  setShowAvailabilityConfigModal(true);
                }}
              >
                <Ionicons name="calendar-outline" size={20} color="#667eea" />
                <Text style={styles.configButtonText}>Gestionar Disponibilidad</Text>
              </TouchableOpacity>
            </View>
          )}
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
                  onPress={async () => {
                    let pid = '';
                    let displayName = '';
                    if (isProfessional) {
                      pid = String(user?._id || user?.id || '').trim();
                      displayName = user?.fullName || 'Profesional';
                    } else {
                      pid = String(
                        newProfessionalAppointment.professionalId ||
                          availableProfessionals.find(
                            (p) => p.name === newProfessionalAppointment.professionalName
                          )?.id ||
                          ''
                      ).trim();
                      displayName = newProfessionalAppointment.professionalName || '';
                    }
                    if (pid && /^[a-fA-F0-9]{24}$/.test(pid)) {
                      await loadProfessionalAvailableDates(pid, displayName || undefined);
                    }
                    setShowDatePickerModal(true);
                  }}
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
                <TimeSlotSelector
                  selectedTime={newProfessionalAppointment.time}
                  onTimeSelect={(time: string) => setNewProfessionalAppointment(prev => ({ ...prev, time }))}
                  selectedDate={newProfessionalAppointment.date}
                  professionalId={availableProfessionals.find(prof => prof.name === newProfessionalAppointment.professionalName)?.id}
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

              {/* Detalle de costos (cliente; seña solo si el profesional la admite) */}
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
                        <View style={styles.costRow}>
                          <Text style={styles.costLabel}>Saldo a pagar:</Text>
                          <Text style={styles.costTotal}>
                            ${Math.max(
                              0,
                              Math.round(consultationPriceClientBooking - clientSeniaPreviewAmount)
                            ).toLocaleString('es-AR')}
                          </Text>
                        </View>
                      </>
                    )}
                  <View style={styles.costNote}>
                    <Text style={styles.costNoteText}>
                      {selectedClientBookingProfessional &&
                      selectedClientBookingProfessional.clientBookingRequiresDeposit !== false
                        ? 'La seña se cobra al momento de la reserva para confirmar tu cita. El saldo se paga al finalizar el servicio.'
                        : selectedClientBookingProfessional
                          ? 'Este profesional no requiere seña: solo abonás el costo de la consulta según lo acordado con el consultorio.'
                          : 'Seleccioná un profesional para ver si la reserva incluye seña.'}
                    </Text>
                  </View>
                </View>
              )}

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
                    if (isProfessional) {
                      Alert.alert(
                        'Profesional',
                        'Usá la pestaña Hoy o el selector de paciente para crear citas confirmadas.'
                      );
                      return;
                    }
                    submitClientReservaConSenaFromCalendar();
                  }}
                  disabled={isSubmittingClientReserva}
                >
                  {isSubmittingClientReserva ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.submitButtonText}>Reservar Cita</Text>
                  )}
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
                onPress={() => {
                  setShowServiceSelectorModal(false);
                  setServiceSearchQuery('');
                  setSelectedServiceCategory('Todas');
                }}
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

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.categoryScroll}
                contentContainerStyle={styles.categoryScrollContent}
              >
                {SERVICE_CATEGORIES.map((category) => {
                  const active = selectedServiceCategory === category;
                  return (
                    <TouchableOpacity
                      key={category}
                      style={[styles.categoryChip, active && styles.categoryChipActive]}
                      onPress={() => setSelectedServiceCategory(category)}
                    >
                      <Text style={[styles.categoryChipText, active && styles.categoryChipTextActive]}>
                        {category}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              
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
                onPress={() => {
                  setShowProfessionalSelectorModal(false);
                  setProfessionalSearchQuery('');
                  setProfessionalClinicQuery('');
                }}
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

              <View style={[styles.searchContainer, { marginTop: 8 }]}>
                <View style={styles.searchInputContainer}>
                  <Ionicons name="business" size={20} color="#999" style={styles.searchIcon} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Filtrar por consultorio..."
                    value={professionalClinicQuery}
                    onChangeText={setProfessionalClinicQuery}
                    placeholderTextColor="#999"
                  />
                  {professionalClinicQuery.length > 0 && (
                    <TouchableOpacity
                      style={styles.clearButton}
                      onPress={() => setProfessionalClinicQuery('')}
                    >
                      <Ionicons name="close-circle" size={20} color="#999" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              
              {getFilteredProfessionals().length === 0 ? (
                <View style={{ padding: 24, alignItems: 'center' }}>
                  <Text style={{ color: '#666', textAlign: 'center' }}>
                    {newProfessionalAppointment.service
                      ? 'No hay profesionales para este servicio. Probá otro rubro o revisá la conexión al backend.'
                      : 'Elegí primero un servicio para ver profesionales.'}
                  </Text>
                </View>
              ) : (
                getFilteredProfessionals().map((professional) => (
                  <TouchableOpacity
                    key={professional.id}
                    style={styles.professionalOption}
                    onPress={() => handleProfessionalSelect(professional)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.professionalOptionText}>{professional.name}</Text>
                      {!!professional.specialty && (
                        <Text style={{ color: '#888', fontSize: 13 }}>{professional.specialty}</Text>
                      )}
                      {Array.isArray(professional.clinicNames) && professional.clinicNames.length > 0 ? (
                        <Text style={{ color: '#6366E1', fontSize: 12, marginTop: 4 }} numberOfLines={2}>
                          {professional.clinicNames.join(' · ')}
                        </Text>
                      ) : null}
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#999" />
                  </TouchableOpacity>
                ))
              )}
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
              
              {/* Indicador de fechas cargadas */}
              <View style={styles.dateIndicator}>
                <Ionicons name={Object.keys(markedDates).length > 0 ? "checkmark-circle" : "alert-circle"} size={20} color={Object.keys(markedDates).length > 0 ? "#4CAF50" : "#FF9800"} />
                <Text style={styles.dateIndicatorText}>
                  {Object.keys(markedDates).length > 0 
                    ? `${Object.keys(markedDates).length} fechas disponibles` 
                    : 'No hay fechas disponibles cargadas'}
                </Text>
              </View>
              
              {/* Debug Info - Primeras fechas */}
              {Object.keys(markedDates).length > 0 && (
                <View style={styles.debugInfo}>
                  <Text style={styles.debugInfoTitle}>🔍 Debug Info:</Text>
                  <Text style={styles.debugInfoText}>
                    Primeras 3: {Object.keys(markedDates).slice(0, 3).join(', ')}
                  </Text>
                  <Text style={styles.debugInfoText}>
                    Últimas 3: {Object.keys(markedDates).slice(-3).join(', ')}
                  </Text>
                </View>
              )}
              
              {/* Leyenda del calendario */}
              <View style={styles.calendarLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendBox, styles.legendAvailable]} />
                  <Text style={styles.legendText}>Disponible</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendBox, styles.legendToday]} />
                  <Text style={styles.legendText}>Hoy</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendBox, styles.legendSelected]} />
                  <Text style={styles.legendText}>Seleccionado</Text>
                </View>
              </View>
              
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

        {/* Cliente: reprogramar cita desde Calendario */}
        <Modal
          visible={showRescheduleModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={closeRescheduleModal}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity style={styles.backButton} onPress={closeRescheduleModal}>
                <Ionicons name="arrow-back" size={24} color="#666" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Reprogramar cita</Text>
              <View style={styles.placeholderButton} />
            </View>

            <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
              {rescheduleTarget ? (
                <>
                  <Text style={styles.modalSubtitle}>
                    {rescheduleTarget.service} · {rescheduleTarget.professional}
                  </Text>
                  <Text style={styles.rescheduleHint}>
                    {isProfessional
                      ? 'Elegí nueva fecha y horario para este paciente. Se le enviará una notificación en la app.'
                      : 'Elegí una nueva fecha (con disponibilidad del profesional) y horario. Al menos 48 h antes del turno actual. Quedará pendiente hasta que el profesional confirme.'}
                  </Text>

                  <Text style={styles.formLabel}>Nueva fecha</Text>
                  <View style={styles.calendarContainer}>
                    {Object.keys(rescheduleMarkedDates).length === 0 ? (
                      <Text style={styles.rescheduleNoDates}>
                        No hay fechas cargadas desde el servidor para este profesional. Podés escribir la
                        fecha en formato AAAA-MM-DD abajo o probar más tarde.
                      </Text>
                    ) : null}
                    <CustomCalendar
                      onDateSelect={(dateString) => {
                        setRescheduleDate(dateString);
                        setRescheduleTime('');
                      }}
                      markedDates={rescheduleMarkedDates}
                      selectedDate={rescheduleDate}
                    />
                  </View>

                  <Text style={styles.formLabel}>Hora</Text>
                  <TimeSlotSelector
                    selectedTime={rescheduleTime}
                    onTimeSelect={(time: string) => setRescheduleTime(time)}
                    selectedDate={rescheduleDate}
                    professionalId={rescheduleTarget.professionalId}
                    clinicId={user?.clinicId || '1'}
                    serviceId={rescheduleTarget.serviceId || '1'}
                    placeholder="Seleccionar horario disponible..."
                    style={styles.timeSlotSelector}
                  />

                  <View style={styles.rescheduleActions}>
                    <TouchableOpacity
                      style={[styles.formButton, styles.cancelButton]}
                      onPress={closeRescheduleModal}
                    >
                      <Text style={styles.cancelButtonText}>Cerrar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.formButton,
                        styles.submitButton,
                        (!rescheduleDate || !rescheduleTime) && styles.formButtonDisabled,
                      ]}
                      disabled={!rescheduleDate || !rescheduleTime}
                      onPress={confirmReschedule}
                    >
                      <Text style={styles.submitButtonText}>Confirmar</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : null}
              <View style={styles.bottomSpacing} />
            </ScrollView>
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

            <View style={[styles.modalActions, { paddingBottom: modalActionPaddingBottom }]}>
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
               <Text style={styles.modalTitle}>Reservar Cita</Text>
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

       {/* Modal de Configuración de Horarios */}
       <Modal
         visible={showScheduleConfigModal}
         animationType="slide"
         presentationStyle="pageSheet"
       >
         <View style={styles.modalContainer}>
           <View style={styles.modalHeader}>
             <Text style={styles.modalTitle}>Configurar Horarios</Text>
             <TouchableOpacity
               style={styles.closeButton}
               onPress={() => setShowScheduleConfigModal(false)}
             >
               <Ionicons name="close" size={24} color="#666" />
             </TouchableOpacity>
           </View>
           <ScrollView style={styles.modalContent}>
             <View style={styles.configSection}>
               <Text style={styles.configSectionTitle}>⚙️ Configuración de Horarios</Text>
               <Text style={styles.configSectionDescription}>
                 Configura tus horarios de trabajo por defecto para cada día de la semana.
               </Text>
               
               <TouchableOpacity
                 style={styles.configActionButton}
                 onPress={() => {
                   Alert.alert(
                     'Configurar Horarios',
                     'Esta funcionalidad te llevará a la pantalla de configuración de horarios donde podrás establecer tus horarios de trabajo por día de la semana.',
                     [
                       { text: 'Cancelar', style: 'cancel' },
                       { 
                         text: 'Ir a Configuración', 
                         onPress: () => {
                           setShowScheduleConfigModal(false);
                           router.push('/availability-settings');
                         }
                       }
                     ]
                   );
                 }}
               >
                 <Ionicons name="time" size={20} color="#667eea" />
                 <Text style={styles.configActionButtonText}>Configurar Horarios por Día</Text>
                 <Ionicons name="chevron-forward" size={20} color="#667eea" />
               </TouchableOpacity>
             </View>
           </ScrollView>
         </View>
       </Modal>

       {/* Modal de Gestión de Disponibilidad */}
       <Modal
         visible={showAvailabilityConfigModal}
         animationType="slide"
         presentationStyle="pageSheet"
       >
         <View style={styles.modalContainer}>
           <View style={styles.modalHeader}>
             <Text style={styles.modalTitle}>Gestionar Disponibilidad</Text>
             <TouchableOpacity
               style={styles.closeButton}
               onPress={() => setShowAvailabilityConfigModal(false)}
             >
               <Ionicons name="close" size={24} color="#666" />
             </TouchableOpacity>
           </View>
           <ScrollView style={styles.modalContent}>
             <View style={styles.configSection}>
               <Text style={styles.configSectionTitle}>📅 Gestión de Disponibilidad</Text>
               <Text style={styles.configSectionDescription}>
                 Selecciona las fechas específicas en las que estarás disponible para atender pacientes.
               </Text>
               
               {/* Indicador de fechas cargadas */}
               <View style={styles.dateIndicator}>
                 <Ionicons name={Object.keys(markedDates).length > 0 ? "checkmark-circle" : "alert-circle"} size={20} color={Object.keys(markedDates).length > 0 ? "#4CAF50" : "#FF9800"} />
                 <Text style={styles.dateIndicatorText}>
                   {Object.keys(markedDates).length > 0 
                     ? `${Object.keys(markedDates).length} fechas disponibles configuradas` 
                     : 'No hay fechas disponibles configuradas'}
                 </Text>
               </View>
               
               {/* Calendario integrado */}
               <CustomCalendar
                 onDateSelect={(dateString) => {
                   Alert.alert(
                     'Fecha Seleccionada',
                     `Has seleccionado: ${dateString}\n\n¿Quieres cambiar la disponibilidad de esta fecha?`,
                     [
                       { text: 'Cancelar', style: 'cancel' },
                       { 
                         text: 'Configurar', 
                         onPress: () => {
                           console.log('Configurar disponibilidad para:', dateString);
                           // Aquí puedes agregar lógica para marcar/desmarcar la fecha
                         }
                       }
                     ]
                   );
                 }}
                 markedDates={markedDates}
                 selectedDate=""
               />
               
               <View style={styles.availabilityActions}>
                 <TouchableOpacity
                   style={[styles.configActionButton, styles.secondaryAction]}
                   onPress={() => {
                     setShowAvailabilityConfigModal(false);
                     router.push('/availability-settings');
                   }}
                 >
                   <Ionicons name="settings" size={20} color="#667eea" />
                   <Text style={styles.configActionButtonText}>Configuración Avanzada</Text>
                   <Ionicons name="chevron-forward" size={20} color="#667eea" />
                 </TouchableOpacity>
               </View>
             </View>
           </ScrollView>
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
  appointmentClientActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 10,
  },
  appointmentClientActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  appointmentRescheduleBtn: {
    backgroundColor: '#fff8e1',
    borderColor: '#ffcc80',
  },
  appointmentRescheduleBtnText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
    color: '#e65100',
  },
  appointmentCancelBtn: {
    backgroundColor: '#ffebee',
    borderColor: '#ffcdd2',
  },
  appointmentCancelBtnText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
    color: '#c62828',
  },
  rescheduleHint: {
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  rescheduleNoDates: {
    fontSize: 13,
    color: '#888',
    marginBottom: 12,
  },
  rescheduleActions: {
    flexDirection: 'row',
    marginTop: 24,
    gap: 12,
  },
  formButtonDisabled: {
    opacity: 0.45,
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
  configButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 12,
  },
  configButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#667eea',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  configButtonText: {
    color: '#667eea',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  configSection: {
    marginBottom: 24,
  },
  configSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  configSectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    lineHeight: 20,
  },
  configActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e1e1e1',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  configActionButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginLeft: 12,
  },
  availabilityActions: {
    marginTop: 20,
  },
  secondaryAction: {
    backgroundColor: '#F3F4F6',
    borderColor: '#667eea',
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
  categoryScroll: {
    marginBottom: 14,
    maxHeight: 44,
  },
  categoryScrollContent: {
    paddingRight: 8,
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
  submitButton: {
    backgroundColor: '#667eea',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
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
  selectorButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  calendarSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  dateIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  dateIndicatorText: {
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: '600',
  },
  debugInfo: {
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  debugInfoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E65100',
    marginBottom: 8,
  },
  debugInfoText: {
    fontSize: 12,
    color: '#E65100',
    marginBottom: 4,
    fontFamily: 'monospace',
  },
  calendarLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendBox: {
    width: 20,
    height: 20,
    borderRadius: 4,
  },
  legendAvailable: {
    backgroundColor: '#e8f5e9',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  legendToday: {
    backgroundColor: '#f0f8ff',
    borderWidth: 2,
    borderColor: '#667eea',
  },
  legendSelected: {
    backgroundColor: '#667eea',
  },
  legendText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  bottomSpacing: {
    height: 20,
  },
  
  // Estilos para el TimeSlotSelector
  timeSlotSelector: {
    marginTop: 4,
  },
});
