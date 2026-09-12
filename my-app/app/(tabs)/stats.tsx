import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Alert,
    Modal,
    Platform,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AddPatientForm from '../../components/AddPatientForm';
import { useAppointments, type Appointment } from '../../contexts/AppointmentContext';
import { useAuth } from '../../contexts/AuthContext';
import { useMedicalHistory } from '../../contexts/MedicalHistoryContext';
import ProfessionalPatientManagement from '../../components/ProfessionalPatientManagement';
import { fetchMyPatientsFromAppointments } from '../../services/patientDirectoryService';
import { getBackendBaseUrl } from '../../config/backend';
import { simpleAuthService } from '../../services/simpleAuthService';

const normProfEmail = (e: string | undefined) => String(e || '').trim().toLowerCase();

/** Fecha de cita como YYYY-MM-DD (API Expo). */
function appointmentDateYmd(aptDate: string): string | null {
  const s = String(aptDate || '').trim();
  const head = s.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(head)) return head;
  return null;
}

/** Claves probadas al cargar (email estable tras login; id por si cambió el formato del objeto user). */
function patientsLoadKeys(user: { email?: string; _id?: string; id?: string }): string[] {
  const email = normProfEmail(user.email);
  const id = String(user._id ?? user.id ?? '').trim();
  const keys: string[] = [];
  if (email) keys.push(`@turnario/prof_patients_v2/e:${email}`);
  if (id) {
    keys.push(`@turnario/prof_patients_v2/id:${id}`);
    keys.push(`@turnario/professional_patients_v1/${id}`);
  }
  return [...new Set(keys)];
}

/** Una sola clave donde siempre guardamos (preferir email). */
function patientsSaveKey(user: { email?: string; _id?: string; id?: string } | null): string | null {
  if (!user) return null;
  const email = normProfEmail(user.email);
  if (email) return `@turnario/prof_patients_v2/e:${email}`;
  const id = String(user._id ?? user.id ?? '').trim();
  return id ? `@turnario/prof_patients_v2/id:${id}` : null;
}

function mapApiPatientToStatsPatient(row: {
  clientId: string | null;
  name: string;
  email: string;
  phone: string;
  lastVisit?: string;
}) {
  const stableId = String(row.clientId || row.email || row.name || Math.random()).trim();
  return {
    id: stableId,
    clientId: row.clientId || '',
    userId: row.clientId || '',
    patientClientId: row.clientId || '',
    name: row.name || 'Paciente',
    email: row.email || '',
    phone: row.phone || '',
    status: 'active' as const,
    lastVisit: row.lastVisit || '',
    visits: 0,
    notes: '',
    dateOfBirth: '',
    address: '',
    emergencyContact: '',
    emergencyContactPhone: '',
    emergencyContactRelationship: '',
    medicalHistory: '',
    diagnosis: '',
    treatmentPlan: '',
    insurance: '',
    occupation: '',
    maritalStatus: '',
    allergies: '',
    gender: '',
  };
}

export default function StatsScreen() {
  const routeParams = useLocalSearchParams<{
    editPatientRequest?: string;
    editPatient?: string;
  }>();
  const processedEditRequest = useRef('');
  const insets = useSafeAreaInsets();
  const modalActionPaddingBottom =
    Platform.OS === 'android'
      ? Math.max(insets.bottom + 24, 44)
      : Math.max(insets.bottom + 12, 24);
  const { user, hasProAccess } = useAuth();
  const { appointments, refreshAppointments } = useAppointments();
  const {
    getConsultationsByPatient,
    getTreatmentsByPatient,
    getDocumentsByPatient,
    getPrescriptionsByPatient,
    loadPatientHistory,
  } = useMedicalHistory();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const isProfessional = user?.userType === 'professional';
  const clientUserId = String(user?._id ?? user?.id ?? '').trim();

  const clientAppointmentStats = useMemo(() => {
    if (isProfessional || !clientUserId) {
      return {
        total: 0,
        completed: 0,
        cancelled: 0,
        totalSpent: 0,
        lastVisitLabel: '—',
        servicesUsed: 0,
      };
    }
    const mine = appointments.filter((a) => String(a.clientId) === clientUserId);
    const completed = mine.filter((a) => a.status === 'completed' || a.status === 'finished');
    const cancelled = mine.filter((a) => a.status === 'cancelled');
    const totalSpent = mine.reduce(
      (sum, a) => sum + (typeof a.totalAmount === 'number' && !Number.isNaN(a.totalAmount) ? a.totalAmount : 0),
      0
    );
    const servicesUsed = new Set(mine.map((a) => String(a.service || '').trim()).filter(Boolean)).size;

    const withDates = mine
      .map((a) => ({ a, ymd: appointmentDateYmd(a.date) }))
      .filter((x): x is { a: Appointment; ymd: string } => x.ymd !== null)
      .sort((x, y) => y.ymd.localeCompare(x.ymd));
    const last = withDates[0]?.a;
    let lastVisitLabel = 'Sin citas';
    if (last && withDates[0]?.ymd) {
      const [y, m, d] = withDates[0].ymd.split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      dt.setHours(0, 0, 0, 0);
      const diff = Math.floor((Date.now() - dt.getTime()) / 86400000);
      if (diff === 0) lastVisitLabel = 'Hoy';
      else if (diff === 1) lastVisitLabel = 'Ayer';
      else if (diff > 1 && diff < 14) lastVisitLabel = `Hace ${diff} días`;
      else lastVisitLabel = dt.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
    }

    return {
      total: mine.length,
      completed: completed.length,
      cancelled: cancelled.length,
      totalSpent,
      lastVisitLabel,
      servicesUsed,
    };
  }, [appointments, clientUserId, isProfessional]);

  const patientsLoadGeneration = useRef(0);
  const userRef = useRef(user);
  userRef.current = user;

  /** Identidad estable del profesional para no recargar desde disco en cada render del AuthContext. */
  const patientStoreUserKey = useMemo(() => {
    if (!isProfessional || !user) return '';
    return `${normProfEmail(user.email)}|${String(user._id ?? user.id ?? '')}`;
  }, [isProfessional, user?.email, user?._id, user?.id]);

  // Estados para el modal de Gestionar Pacientes
  const [showPatientManagementModal, setShowPatientManagementModal] = useState(false);
  const [showAddPatientForm, setShowAddPatientForm] = useState(false);
  const [showPatientHistoryModal, setShowPatientHistoryModal] = useState(false);
  const [selectedPatientForHistory, setSelectedPatientForHistory] = useState<any>(null);

  const emptyPatientForm = () => ({
    fullName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    address: '',
    emergencyContact: '',
    emergencyContactPhone: '',
    emergencyContactRelationship: '',
    medicalHistory: '',
    allergies: '',
    diagnosis: '',
    treatmentPlan: '',
    insurance: '',
    occupation: '',
    maritalStatus: '',
    notes: '',
    patientStatus: 'active' as 'active' | 'inactive',
    visitsCount: '',
    lastVisitDate: '',
  });

  // Estados para el formulario de nuevo / editar paciente (campos alineados con el modal de detalle)
  const [newPatientData, setNewPatientData] = useState(emptyPatientForm);

  // Estados para el selector de catálogo de usuarios
  const [showClientSelector, setShowClientSelector] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [clientUsers, setClientUsers] = useState<any[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);

  // Estados para el modal de agendar cita
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedPatientForSchedule, setSelectedPatientForSchedule] = useState<any>(null);
  const [newAppointment, setNewAppointment] = useState({
    service: '',
    date: '',
    time: '',
    notes: '',
  });

  // Estados para el calendario
  const [showDatePickerModal, setShowDatePickerModal] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshAppointments();
    } finally {
      setRefreshing(false);
    }
  };

  // useEffect para cargar usuarios cliente cuando se abra el modal
  useEffect(() => {
    if (showAddPatientForm) {
      loadClientUsers();
    }
  }, [showAddPatientForm]);

  const [patients, setPatients] = useState<any[]>([]);
  const [patientsPersistReady, setPatientsPersistReady] = useState(false);
  const FREE_PRO_PATIENT_LIMIT = 10;
  const isFreeProfessional = isProfessional && !hasProAccess();
  const reachedPatientLimit = isFreeProfessional && patients.length >= FREE_PRO_PATIENT_LIMIT;

  useEffect(() => {
    if (!isProfessional || !patientStoreUserKey) {
      patientsLoadGeneration.current += 1;
      setPatientsPersistReady(false);
      setPatients([]);
      return;
    }

    const u = userRef.current;
    if (!u) {
      setPatientsPersistReady(false);
      setPatients([]);
      return;
    }

    const gen = ++patientsLoadGeneration.current;
    let cancelled = false;

    (async () => {
      try {
        const keys = patientsLoadKeys(u);
        let loaded: any[] | null = null;

        for (const key of keys) {
          if (cancelled || gen !== patientsLoadGeneration.current) return;
          try {
            const raw = await AsyncStorage.getItem(key);
            if (!raw) continue;
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              loaded = parsed;
              break;
            }
          } catch {
            /* siguiente clave */
          }
        }

        if (cancelled || gen !== patientsLoadGeneration.current) return;

        const basePatients = loaded || [];
        setPatients(basePatients);

        const profId = String(u._id ?? u.id ?? '').trim();
        if (profId) {
          const fromApiRows = await fetchMyPatientsFromAppointments(profId);
          if (!cancelled && gen === patientsLoadGeneration.current && fromApiRows.length > 0) {
            const fromApi = fromApiRows.map(mapApiPatientToStatsPatient);
            const byKey = new Map<string, any>();

            // Priorizar lo real del backend y completar con datos manuales guardados.
            for (const p of fromApi) {
              const key = String(p.clientId || p.email || p.name).toLowerCase();
              byKey.set(key, p);
            }
            for (const p of basePatients) {
              const key = String(p.clientId || p.email || p.name || p.id || '').toLowerCase();
              if (!key) continue;
              if (byKey.has(key)) {
                byKey.set(key, { ...p, ...byKey.get(key) });
              } else {
                byKey.set(key, p);
              }
            }
            setPatients(Array.from(byKey.values()));
          }
        }

        const canonical = patientsSaveKey(u);
        if (canonical && loaded) {
          await AsyncStorage.setItem(canonical, JSON.stringify(loaded)).catch(() => {});
        }

        setPatientsPersistReady(true);
      } catch {
        if (!cancelled && gen === patientsLoadGeneration.current) {
          setPatients([]);
          setPatientsPersistReady(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isProfessional, patientStoreUserKey]);

  useEffect(() => {
    if (!isProfessional || !patientsPersistReady || !patientStoreUserKey) return;
    const u = userRef.current;
    if (!u) return;
    const key = patientsSaveKey(u);
    if (!key) return;
    AsyncStorage.setItem(key, JSON.stringify(patients)).catch(() => {});
  }, [patients, isProfessional, patientsPersistReady, patientStoreUserKey]);

  /** Pacientes únicos derivados de citas con este profesional (incluye email del usuario si el API hace populate). */
  const patientsFromCitas = useMemo(() => {
    const profId = String(user?._id || user?.id || '').trim();
    if (!profId || !appointments?.length) return [];

    const byClient = new Map<
      string,
      {
        id: string;
        name: string;
        email: string;
        phone: string;
        lastVisit: string;
        visits: number;
        notes: string;
      }
    >();

    for (const apt of appointments) {
      if (String(apt.professionalId) !== profId) continue;
      if (apt.status === 'cancelled') continue;

      const name = (apt.clientName || apt.patientName || 'Cliente').trim();
      const email = (apt.patientEmail || '').trim();
      const phone = (apt.patientPhone || '').trim();

      let key = String(apt.clientId || '').trim();
      if (!key) {
        const em = email.toLowerCase();
        if (em) key = `__e:${em}`;
        else {
          const nm = name.toLowerCase();
          if (nm && nm !== 'cliente') key = `__n:${nm}`;
        }
      }
      if (!key) continue;
      const cur = byClient.get(key);
      if (!cur) {
        byClient.set(key, {
          id: key,
          name,
          email,
          phone,
          lastVisit: apt.date,
          visits: 1,
          notes: (apt.notes || '').trim(),
        });
      } else {
        cur.visits += 1;
        if (apt.date > cur.lastVisit) cur.lastVisit = apt.date;
        if ((!cur.name || cur.name === 'Cliente') && name) cur.name = name;
        if (!cur.email && email) cur.email = email;
        if (!cur.phone && phone) cur.phone = phone;
      }
    }

    return Array.from(byClient.values()).map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      status: 'active' as const,
      lastVisit: row.lastVisit,
      visits: row.visits,
      notes: row.notes,
      dateOfBirth: '',
      address: '',
      emergencyContact: '',
      emergencyContactPhone: '',
      emergencyContactRelationship: '',
      medicalHistory: '',
      diagnosis: '',
      treatmentPlan: '',
      insurance: '',
      occupation: '',
      maritalStatus: '',
      allergies: '',
      gender: '',
    }));
  }, [appointments, user?._id, user?.id]);

  /** Lista mostrada: citas reales + pacientes demo/manuales (sin duplicar por id). */
  const displayPatients = useMemo(() => {
    const map = new Map<string, (typeof patients)[0]>();
    for (const p of patientsFromCitas) {
      map.set(String(p.id), { ...p });
    }
    for (const p of patients) {
      const k = String(p.id);
      if (map.has(k)) {
        map.set(k, { ...map.get(k)!, ...p });
      } else {
        map.set(k, p);
      }
    }
    return Array.from(map.values());
  }, [patientsFromCitas, patients]);

  const [patientHistoryData, setPatientHistoryData] = useState({
    appointments: [] as any[],
    treatments: [] as any[],
    medicalNotes: [] as any[],
    consultations: [] as any[],
    prescriptions: [] as any[],
    documents: [] as any[],
    progressTimeline: [] as any[],
  });

  // Funciones para la gestión de pacientes
  const handleViewPatientDetails = (patient: any) => {
    setSelectedPatientForDetails(patient);
    setShowPatientDetailsModal(true);
  };

  const handleEditPatient = async (patient: any) => {
    const patientId = String(patient?.clientId || patient?.id || '').trim();
    let source = patient;

    if (/^[a-fA-F0-9]{24}$/.test(patientId)) {
      try {
        const token = await simpleAuthService.getToken();
        if (token) {
          const response = await fetch(`${getBackendBaseUrl()}/api/v1/users/${patientId}`, {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/json',
            },
          });
          const json = await response.json().catch(() => ({}));
          const remote = json?._id ? json : json?.data;
          if (response.ok && remote) {
            source = {
              ...patient,
              id: String(remote._id || patientId),
              clientId: String(remote._id || patientId),
              name: remote.fullName || patient.name || '',
              email: remote.email || patient.email || '',
              phone: remote.phone || patient.phone || '',
              dateOfBirth: remote.dateOfBirth || '',
              gender: remote.gender || '',
              address:
                typeof remote.address === 'string'
                  ? remote.address
                  : remote.address?.street || patient.address || '',
              emergencyContact: remote.emergencyContact || '',
              medicalHistory: remote.medicalHistory || '',
              allergies: remote.allergies || '',
              notes: remote.clinicalNotes || patient.notes || '',
            };
          }
        }
      } catch {
        // Si falla la lectura remota, se edita con los datos locales disponibles.
      }
    }

    setEditingPatient(source);
    setNewPatientData({
      ...emptyPatientForm(),
      fullName: source.name || '',
      email: source.email || '',
      phone: source.phone || '',
      dateOfBirth: source.dateOfBirth || '',
      gender: source.gender || '',
      address: source.address || '',
      emergencyContact: source.emergencyContact || '',
      emergencyContactPhone: source.emergencyContactPhone || '',
      emergencyContactRelationship: source.emergencyContactRelationship || '',
      medicalHistory: source.medicalHistory || '',
      allergies: source.allergies || '',
      diagnosis: source.diagnosis || '',
      treatmentPlan: source.treatmentPlan || '',
      insurance: source.insurance || '',
      occupation: source.occupation || '',
      maritalStatus: source.maritalStatus || '',
      notes: source.notes || '',
      patientStatus: source.status === 'inactive' ? 'inactive' : 'active',
      visitsCount: source.visits != null ? String(source.visits) : '',
      lastVisitDate: source.lastVisit || '',
    });
    setShowEditPatientModal(true);
  };

  useEffect(() => {
    const requestId = String(routeParams.editPatientRequest || '');
    if (!requestId || processedEditRequest.current === requestId) return;
    const raw = Array.isArray(routeParams.editPatient)
      ? routeParams.editPatient[0]
      : routeParams.editPatient;
    if (!raw) return;
    try {
      const patient = JSON.parse(raw);
      processedEditRequest.current = requestId;
      handleEditPatient(patient);
    } catch {
      Alert.alert('Editar paciente', 'No se pudo abrir el formulario de edición.');
    }
  }, [routeParams.editPatientRequest, routeParams.editPatient]);

  const buildPatientHistoryForSelected = useCallback(
    (patient: any) => {
      const proId = String(user?._id || user?.id || '').trim();
      if (!proId || !patient) {
        return {
          appointments: [],
          treatments: [],
          medicalNotes: [],
          consultations: [],
          prescriptions: [],
          documents: [],
          progressTimeline: [],
        };
      }
      const norm = (s: string) =>
        String(s || '')
          .trim()
          .toLowerCase()
          .replace(/\s+/g, ' ');
      const normEmail = (s: string) => norm(s).replace(/\s/g, '');
      const digits = (s: string) => String(s || '').replace(/\D/g, '');
      const pName = norm(patient.name || patient.fullName || '');
      const pEmail = normEmail(patient.email || '');
      const pPhone = digits(patient.phone || '');
      const pClientId = String(
        patient.clientId || patient.userId || patient.patientClientId || ''
      ).trim();
      const selectedPatientId = String(patient.id || '').trim();

      const mine = (appointments || []).filter(
        (a) => String(a.professionalId || '').trim() === proId
      );
      const forPatient = mine.filter((a) => {
        if (pClientId.length === 24 && a.clientId && String(a.clientId) === pClientId) return true;
        const aEmail = normEmail(a.patientEmail || '');
        if (pEmail.length > 3 && aEmail && aEmail === pEmail) return true;
        const aPhone = digits(a.patientPhone || '');
        if (pPhone.length >= 7 && aPhone && aPhone === pPhone) return true;
        const aName = norm(a.patientName || a.clientName || '');
        if (
          pName.length > 1 &&
          aName &&
          (aName === pName || aName.includes(pName) || pName.includes(aName))
        ) {
          return true;
        }
        return false;
      });
      const relatedClientIds = Array.from(
        new Set(
          forPatient
            .map((a) => String(a.clientId || '').trim())
            .filter((id) => id.length > 0)
        )
      );
      const candidatePatientIds = Array.from(
        new Set([selectedPatientId, pClientId, ...relatedClientIds].filter((id) => id.length > 0))
      );

      const collectFromPatientIds = <T extends { id?: string }>(
        getter: (patientId: string) => T[]
      ): T[] => {
        const out: T[] = [];
        const seen = new Set<string>();
        for (const pid of candidatePatientIds) {
          const rows = getter(pid) || [];
          for (const row of rows) {
            const key = String(row?.id || `${pid}-${out.length}`);
            if (seen.has(key)) continue;
            seen.add(key);
            out.push(row);
          }
        }
        return out;
      };

      const formatDate = (value: unknown, fallback = '—'): string => {
        if (value instanceof Date && !isNaN(value.getTime())) return value.toISOString().slice(0, 10);
        const s = String(value || '').trim();
        if (!s) return fallback;
        const d = new Date(s);
        if (isNaN(d.getTime())) return s;
        return d.toISOString().slice(0, 10);
      };

      const sorted = [...forPatient].sort(
        (x, y) =>
          String(y.date).localeCompare(String(x.date)) ||
          String(x.time).localeCompare(String(y.time))
      );
      const apptRows = sorted.map((a) => {
        const st = a.status;
        const uiStatus =
          st === 'completed' || st === 'finished'
            ? 'completed'
            : st === 'cancelled'
              ? 'cancelled'
              : 'scheduled';
        return {
          id: a.id,
          date: a.date,
          time: a.time,
          service: a.service,
          professional: user?.fullName || a.professional || 'Vos',
          status: uiStatus,
          notes: a.notes || '',
          treatment: a.service,
          duration: 30,
          cost: typeof a.totalAmount === 'number' ? a.totalAmount : 0,
          paymentStatus: 'pending',
        };
      });
      const notesOut: any[] = [];
      const mh = patient.medicalHistory;
      if (mh && String(mh).trim() && !/^sin historial/i.test(String(mh).trim())) {
        notesOut.push({
          id: 'chart-note',
          date: patient.lastVisit || new Date().toISOString().slice(0, 10),
          type: 'Notas de ficha',
          content: String(mh),
          professional: user?.fullName || 'Vos',
        });
      }

      const mhConsultations = collectFromPatientIds(getConsultationsByPatient)
        .sort((a: any, b: any) => formatDate(b.date).localeCompare(formatDate(a.date)));
      const mhTreatments = collectFromPatientIds(getTreatmentsByPatient);
      const mhPrescriptions = collectFromPatientIds(getPrescriptionsByPatient);
      const mhDocuments = collectFromPatientIds(getDocumentsByPatient);

      for (const c of mhConsultations) {
        const dateStr = formatDate((c as any).date, patient.lastVisit || new Date().toISOString().slice(0, 10));
        const treatLine =
          (c as any).treatment && String((c as any).treatment).trim() && (c as any).treatment !== '—'
            ? `Tratamiento: ${(c as any).treatment}`
            : '';
        notesOut.push({
          id: `mh-${(c as any).id}`,
          date: dateStr,
          type: 'Sesión registrada',
          content: [(c as any).notes, treatLine].filter(Boolean).join('\n\n'),
          professional: (c as any).professionalName || user?.fullName || 'Profesional',
        });
      }

      const treatmentsOut = mhTreatments.map((t: any) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        status: t.status,
        progress: Number(t.progress || 0),
        completedSessions: Array.isArray(t.milestones)
          ? t.milestones.filter((m: any) => m.status === 'completed').length
          : 0,
        sessions: Math.max(1, Array.isArray(t.milestones) ? t.milestones.length : 1),
        startDate: formatDate(t.startDate),
        endDate: t.endDate ? formatDate(t.endDate) : '—',
        goals: Array.isArray(t.milestones) ? t.milestones.map((m: any) => m.title).filter(Boolean) : [],
      }));

      const consultationsOut = mhConsultations.map((c: any) => ({
        id: c.id,
        date: formatDate(c.date),
        type: c.type || 'follow_up',
        diagnosis: c.diagnosis || 'Sin diagnóstico registrado',
        symptoms: c.symptoms || 'Sin síntomas registrados',
        treatment: c.treatment || 'Sin tratamiento especificado',
        notes: c.notes || '',
        professionalName: c.professionalName || user?.fullName || 'Profesional',
      }));

      const prescriptionsOut = mhPrescriptions.map((p: any) => ({
        id: p.id,
        date: formatDate(p.date),
        status: p.status || 'active',
        instructions: p.instructions || '',
        medications: Array.isArray(p.medications)
          ? p.medications.map((m: any) => `${m.name || 'Medicamento'} ${m.dosage ? `(${m.dosage})` : ''}`.trim())
          : [],
      }));

      const documentsOut = mhDocuments.map((d: any) => ({
        id: d.id,
        date: formatDate(d.uploadDate || d.createdAt),
        type: d.type || 'document',
        title: d.title || d.fileName || 'Documento',
        description: d.description || '',
      }));

      const progressTimeline = [
        ...mhTreatments.flatMap((t: any) =>
          (Array.isArray(t.milestones) ? t.milestones : []).map((m: any) => ({
            id: `milestone-${t.id}-${m.id || m.title}`,
            date: formatDate(m.completedDate || m.targetDate, '—'),
            title: m.title || 'Hito de tratamiento',
            details: m.description || '',
            status: m.status || 'pending',
            source: t.name || 'Tratamiento',
          }))
        ),
        ...mhTreatments.flatMap((t: any, idx: number) =>
          (Array.isArray(t.notes) ? t.notes : []).map((note: string, noteIdx: number) => ({
            id: `treat-note-${t.id || idx}-${noteIdx}`,
            date: formatDate(t.updatedAt || t.startDate, '—'),
            title: 'Nota de evolución',
            details: note,
            status: 'completed',
            source: t.name || 'Tratamiento',
          }))
        ),
      ].sort((a, b) => String(b.date).localeCompare(String(a.date)));

      return {
        appointments: apptRows,
        treatments: treatmentsOut,
        medicalNotes: notesOut,
        consultations: consultationsOut,
        prescriptions: prescriptionsOut,
        documents: documentsOut,
        progressTimeline,
      };
    },
    [
      appointments,
      user?._id,
      user?.id,
      user?.fullName,
      getConsultationsByPatient,
      getTreatmentsByPatient,
      getPrescriptionsByPatient,
      getDocumentsByPatient,
    ]
  );

  const handleScheduleAppointment = (patient: any) => {
    setSelectedPatientForSchedule(patient);
    // Llenar automáticamente el servicio con el servicio del profesional
    setNewAppointment(prev => ({
      ...prev,
      service: user?.service || 'Consulta Médica'
    }));
    setShowScheduleModal(true);
  };

  useEffect(() => {
    if (showPatientHistoryModal && selectedPatientForHistory) {
      setPatientHistoryData(buildPatientHistoryForSelected(selectedPatientForHistory));
    }
  }, [showPatientHistoryModal, selectedPatientForHistory, buildPatientHistoryForSelected]);

  const handleViewPatientHistory = async (patient: any) => {
    const patientId = String(patient?.clientId || patient?.id || '').trim();
    if (!/^[a-fA-F0-9]{24}$/.test(patientId)) {
      Alert.alert('Historial', 'Este paciente no tiene una cuenta vinculada al historial clínico.');
      return;
    }
    router.push({
      pathname: '/(tabs)/settings',
      params: {
        patientHistoryRequest: String(Date.now()),
        patientId,
        patientName: String(patient?.name || patient?.fullName || 'Paciente'),
        patientEmail: String(patient?.email || ''),
        patientPhone: String(patient?.phone || ''),
        patientStatus: String(patient?.status || 'active'),
        patientLastVisit: String(patient?.lastVisit || ''),
        patientVisits: String(patient?.visits || patient?.sessionsCompleted || 0),
      },
    });
  };

  const handleAddNewPatient = () => {
    if (reachedPatientLimit) {
      Alert.alert(
        'Límite de pacientes en plan Free',
        `En el plan actual podés cargar hasta ${FREE_PRO_PATIENT_LIMIT} pacientes. Suscribite a Turnario Pro para agregar más.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Ver planes', onPress: () => router.push('/subscribe') },
        ]
      );
      return;
    }
    setShowAddPatientForm(true);
  };

  // Función para cargar usuarios cliente
  const loadClientUsers = async () => {
    setIsLoadingClients(true);
    try {
      // Simular carga de usuarios del sistema
      const mockUsers = [
        {
          _id: '1',
          fullName: 'Ana Martínez',
          email: 'ana.martinez@email.com',
          phone: '+54 9 11 1234-5678',
          userType: 'client',
          isActive: true,
          createdAt: '2024-01-15T10:30:00Z',
          updatedAt: '2024-01-15T10:30:00Z',
          isEmailVerified: true
        },
        {
          _id: '2',
          fullName: 'María González',
          email: 'maria.gonzalez@email.com',
          phone: '+54 9 11 3456-7890',
          userType: 'client',
          isActive: true,
          createdAt: '2024-01-20T14:45:00Z',
          updatedAt: '2024-01-20T14:45:00Z',
          isEmailVerified: true
        },
        {
          _id: '3',
          fullName: 'Carlos Silva',
          email: 'carlos.silva@email.com',
          phone: '+54 9 11 4567-8901',
          userType: 'client',
          isActive: true,
          createdAt: '2024-01-25T09:15:00Z',
          updatedAt: '2024-01-25T09:15:00Z',
          isEmailVerified: false
        }
      ];
      
      setClientUsers(mockUsers);
      console.log('✅ Usuarios cliente cargados:', mockUsers.length);
    } catch (error) {
      console.error('Error cargando usuarios cliente:', error);
      Alert.alert('Error', 'No se pudieron cargar los usuarios del sistema');
    } finally {
      setIsLoadingClients(false);
    }
  };

  // Función para manejar la selección de cliente
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
  };

  const handleSaveNewPatient = () => {
    if (reachedPatientLimit) {
      Alert.alert(
        'Límite alcanzado',
        `Ya tenés ${FREE_PRO_PATIENT_LIMIT} pacientes cargados en el plan actual. Activá Turnario Pro para seguir sumando.`,
        [{ text: 'Ver planes', onPress: () => router.push('/subscribe') }, { text: 'Cerrar', style: 'cancel' }]
      );
      return;
    }
    if (!newPatientData.fullName || !newPatientData.email || !newPatientData.phone) {
      Alert.alert('Error', 'Por favor completa los campos obligatorios (Nombre, Email, Teléfono)');
      return;
    }

    const newPatient = {
      id: (patients.length + 1).toString(),
      name: newPatientData.fullName,
      email: newPatientData.email,
      phone: newPatientData.phone,
      dateOfBirth: newPatientData.dateOfBirth,
      gender: newPatientData.gender,
      address: newPatientData.address,
      emergencyContact: newPatientData.emergencyContact,
      emergencyContactPhone: newPatientData.emergencyContactPhone || '',
      emergencyContactRelationship: newPatientData.emergencyContactRelationship || '',
      medicalHistory: newPatientData.medicalHistory,
      allergies: newPatientData.allergies || '',
      diagnosis: newPatientData.diagnosis || '',
      treatmentPlan: newPatientData.treatmentPlan || '',
      insurance: newPatientData.insurance || '',
      occupation: newPatientData.occupation || '',
      maritalStatus: newPatientData.maritalStatus || '',
      notes: newPatientData.notes,
      status: newPatientData.patientStatus === 'inactive' ? 'inactive' : 'active',
      lastVisit: newPatientData.lastVisitDate || new Date().toISOString().split('T')[0],
      visits: (() => {
        const v = parseInt(String(newPatientData.visitsCount || '0'), 10);
        return Number.isFinite(v) ? v : 0;
      })(),
    };

    setPatients([...patients, newPatient]);
    setNewPatientData(emptyPatientForm());
    setSelectedClient(null);
    setShowAddPatientForm(false);
    Alert.alert('✅ Paciente Creado', `El paciente ${newPatientData.fullName} ha sido creado exitosamente.`);
  };

  const handleCancelAddPatient = () => {
    setNewPatientData(emptyPatientForm());
    setSelectedClient(null);
    setShowAddPatientForm(false);
  };

  const handleSaveEditPatient = async () => {
    if (!newPatientData.fullName || !newPatientData.email || !newPatientData.phone) {
      Alert.alert('Error', 'Por favor completa los campos obligatorios (Nombre, Email, Teléfono)');
      return;
    }
    if (isSavingPatientEdit.current) return;

    const patientId = String(editingPatient?.clientId || editingPatient?.id || '').trim();
    if (!/^[a-fA-F0-9]{24}$/.test(patientId)) {
      Alert.alert(
        'No se puede guardar',
        'Este paciente no tiene una cuenta vinculada para guardar los cambios en la base de datos.'
      );
      return;
    }

    isSavingPatientEdit.current = true;
    try {
      const token = await simpleAuthService.getToken();
      if (!token) throw new Error('No hay sesión activa para actualizar el paciente.');

      const response = await fetch(`${getBackendBaseUrl()}/api/users/${patientId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fullName: newPatientData.fullName,
          email: newPatientData.email,
          phone: String(newPatientData.phone || '').replace(/[^\d+]/g, ''),
          dateOfBirth: newPatientData.dateOfBirth,
          gender: newPatientData.gender,
          address: newPatientData.address,
          emergencyContact: newPatientData.emergencyContact,
          medicalHistory: newPatientData.medicalHistory,
          allergies: newPatientData.allergies,
          notes: newPatientData.notes,
        }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json?.success) {
        throw new Error(json?.message || `No se pudo actualizar el paciente (HTTP ${response.status}).`);
      }

      const saved = json?.data || {};
      const nextName = String(saved.fullName || newPatientData.fullName || '').trim();
      const nextEmail = String(saved.email || newPatientData.email || '').trim();
      const nextPhone = String(saved.phone || newPatientData.phone || '').trim();

      setPatients((prev) =>
        prev.map((p) => {
          const sameId =
            String(p.clientId || p.id || '').trim() === patientId ||
            String(p.id || '').trim() === patientId;
          if (!sameId) return p;
          return {
            ...p,
            name: nextName || p.name,
            email: nextEmail || p.email,
            phone: nextPhone || p.phone,
            dateOfBirth: newPatientData.dateOfBirth || p.dateOfBirth,
            gender: newPatientData.gender || p.gender,
            address: newPatientData.address || p.address,
            emergencyContact: newPatientData.emergencyContact || p.emergencyContact,
            medicalHistory: newPatientData.medicalHistory || p.medicalHistory,
            allergies: newPatientData.allergies || p.allergies,
            notes: newPatientData.notes || p.notes,
          };
        })
      );

      await refreshAppointments();
      setEditingPatient(null);
      setNewPatientData(emptyPatientForm());
      setShowEditPatientModal(false);
      setPatientListRevision((current) => current + 1);
      Alert.alert('Paciente actualizado', 'Los cambios se guardaron en la base de datos.');
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'No se pudo guardar el paciente en la base de datos.'
      );
    } finally {
      isSavingPatientEdit.current = false;
    }
  };

  const handleCancelEditPatient = () => {
    setEditingPatient(null);
    setNewPatientData(emptyPatientForm());
    setShowEditPatientModal(false);
  };

  const handleSaveAppointment = () => {
    if (!newAppointment.service || !newAppointment.date || !newAppointment.time) {
      Alert.alert('Error', 'Por favor completa todos los campos obligatorios');
      return;
    }

    Alert.alert(
      '✅ Cita Agendada',
      `Cita agendada exitosamente para ${selectedPatientForSchedule?.name}:\n\n` +
      `📅 Fecha: ${newAppointment.date}\n` +
      `🕐 Hora: ${newAppointment.time}\n` +
      `🏥 Servicio: ${newAppointment.service}\n\n` +
      `Se enviará un recordatorio 24 horas antes de la cita.`,
      [{ text: 'OK' }]
    );
    
    setNewAppointment({
      service: '',
      date: '',
      time: '',
      notes: '',
    });
    setShowScheduleModal(false);
  };

  const handleCancelAppointment = () => {
    setNewAppointment({
      service: '',
      date: '',
      time: '',
      notes: '',
    });
    setShowScheduleModal(false);
  };

  // Función para obtener los días del mes
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: { day: number; isCurrentMonth: boolean; isAvailable: boolean }[] = [];
    
    // Días del mes anterior
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const day = new Date(year, month, -i);
      days.push({
        day: day.getDate(),
        isCurrentMonth: false,
        isAvailable: false
      });
    }
    
    // Días del mes actual
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(year, month, day);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      days.push({
        day,
        isCurrentMonth: true,
        isAvailable: currentDate >= today
      });
    }
    
    // Días del mes siguiente para completar la grilla
    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      days.push({
        day,
        isCurrentMonth: false,
        isAvailable: false
      });
    }
    
    return days;
  };

  // Estados para modales adicionales
  const [showPatientDetailsModal, setShowPatientDetailsModal] = useState(false);
  const [selectedPatientForDetails, setSelectedPatientForDetails] = useState<any>(null);
  const [showEditPatientModal, setShowEditPatientModal] = useState(false);
  const [editingPatient, setEditingPatient] = useState<any>(null);
  const isSavingPatientEdit = useRef(false);
  const [patientListRevision, setPatientListRevision] = useState(0);

  // Renderizar pantalla de estadísticas para clientes
  if (!isProfessional) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Estadísticas</Text>
            <Text style={styles.headerSubtitle}>Resumen de tu actividad</Text>
          </View>

          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { borderLeftColor: '#4CAF50' }]}>
              <View style={styles.statHeader}>
                <View style={[styles.statIcon, { backgroundColor: '#4CAF50' }]}>
                  <Ionicons name="calendar" size={24} color="white" />
                </View>
                <View style={styles.statInfo}>
                  <Text style={styles.statValue}>{clientAppointmentStats.total}</Text>
                  <Text style={styles.statTitle}>Total Citas</Text>
                  <Text style={styles.statSubtitle}>En total</Text>
                </View>
              </View>
            </View>

            <View style={[styles.statCard, { borderLeftColor: '#2196F3' }]}>
              <View style={styles.statHeader}>
                <View style={[styles.statIcon, { backgroundColor: '#2196F3' }]}>
                  <Ionicons name="checkmark-circle" size={24} color="white" />
                </View>
                <View style={styles.statInfo}>
                  <Text style={styles.statValue}>{clientAppointmentStats.completed}</Text>
                  <Text style={styles.statTitle}>Completadas</Text>
                  <Text style={styles.statSubtitle}>Exitosas</Text>
                </View>
              </View>
            </View>

            <View style={[styles.statCard, { borderLeftColor: '#F44336' }]}>
              <View style={styles.statHeader}>
                <View style={[styles.statIcon, { backgroundColor: '#F44336' }]}>
                  <Ionicons name="close-circle" size={24} color="white" />
                </View>
                <View style={styles.statInfo}>
                  <Text style={styles.statValue}>{clientAppointmentStats.cancelled}</Text>
                  <Text style={styles.statTitle}>Canceladas</Text>
                  <Text style={styles.statSubtitle}>No realizadas</Text>
                </View>
              </View>
            </View>

            <View style={[styles.statCard, { borderLeftColor: '#FF9800' }]}>
              <View style={styles.statHeader}>
                <View style={[styles.statIcon, { backgroundColor: '#FF9800' }]}>
                  <Ionicons name="card" size={24} color="white" />
                </View>
                <View style={styles.statInfo}>
                  <Text style={styles.statValue}>
                    {clientAppointmentStats.totalSpent > 0
                      ? `$${Math.round(clientAppointmentStats.totalSpent).toLocaleString('es-AR')}`
                      : '—'}
                  </Text>
                  <Text style={styles.statTitle}>Total registrado</Text>
                  <Text style={styles.statSubtitle}>Suma de importes en citas</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Resumen General</Text>
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Servicios distintos:</Text>
                <Text style={styles.summaryValue}>{clientAppointmentStats.servicesUsed}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Última cita (fecha):</Text>
                <Text style={styles.summaryValue}>{clientAppointmentStats.lastVisitLabel}</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Misma Gestión de Pacientes que Configuración; los modales quedan encima.
  return (
    <View style={styles.container}>
      <ProfessionalPatientManagement
        revision={patientListRevision}
        onAdd={() => {
          if (reachedPatientLimit) {
            Alert.alert(
              'Límite de pacientes en plan Free',
              `En el plan actual podés cargar hasta ${FREE_PRO_PATIENT_LIMIT} pacientes.`,
              [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Ver planes', onPress: () => router.push('/subscribe') },
              ]
            );
            return;
          }
          setShowAddPatientForm(true);
        }}
        onImport={() => {
          setPatientListRevision((current) => current + 1);
          Alert.alert('Pacientes', 'La lista se actualizó desde la base de datos.');
        }}
        onExport={(rows) => {
          Alert.alert('Exportar', `Se prepararon ${rows.length} pacientes para exportar.`);
        }}
        onView={handleViewPatientDetails}
        onEdit={handleEditPatient}
        onSchedule={(patient) =>
          router.navigate({
            pathname: '/(tabs)',
            params: {
              newProfessionalAppointmentRequest: String(Date.now()),
              patientId: String(patient.clientId || patient.id || ''),
              patientName: patient.name,
              patientEmail: patient.email,
              patientPhone: patient.phone,
            },
          })
        }
        onHistory={(patient) =>
          router.navigate({
            pathname: '/(tabs)/settings',
            params: {
              patientHistoryRequest: String(Date.now()),
              patientId: String(patient.clientId || patient.id || ''),
              patientName: patient.name,
              patientEmail: patient.email,
              patientPhone: patient.phone,
              patientStatus: patient.status,
              patientLastVisit: patient.lastVisit,
              patientVisits: String(patient.visits || 0),
            },
          })
        }
      />

      {/* Modal para Agregar Nuevo Paciente */}
      <Modal
        visible={showAddPatientForm}
        transparent={false}
        onRequestClose={() => setShowAddPatientForm(false)}
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
              onPress={() => setShowAddPatientForm(false)}
              activeOpacity={0.7}
            >
              <Ionicons name="close-circle" size={28} color="#999" />
            </TouchableOpacity>
          </View>

          <AddPatientForm
            newPatientData={newPatientData}
            setNewPatientData={setNewPatientData}
            selectedClient={selectedClient}
            setSelectedClient={setSelectedClient}
            showClientSelector={showClientSelector}
            setShowClientSelector={setShowClientSelector}
            clientUsers={clientUsers}
            isLoadingClients={isLoadingClients}
            onSave={handleSaveNewPatient}
            onCancel={handleCancelAddPatient}
          />

          {/* Botones de Acción */}
          <View style={[styles.formActions, { paddingBottom: modalActionPaddingBottom }]}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={handleCancelAddPatient}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.saveButton]}
              onPress={handleSaveNewPatient}
              activeOpacity={0.7}
            >
              <Text style={styles.saveButtonText}>Guardar Paciente</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal para Editar Paciente */}
      <Modal
        visible={showEditPatientModal}
        transparent={false}
        onRequestClose={() => setShowEditPatientModal(false)}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderContent}>
              <Ionicons name="create" size={28} color="#FF9800" />
              <Text style={styles.modalTitle}>Editar Paciente</Text>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowEditPatientModal(false)}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <AddPatientForm
            newPatientData={newPatientData}
            setNewPatientData={setNewPatientData}
            selectedClient={null}
            setSelectedClient={() => {}}
            showClientSelector={false}
            setShowClientSelector={() => {}}
            clientUsers={[]}
            isLoadingClients={false}
            onSave={handleSaveEditPatient}
            onCancel={handleCancelEditPatient}
            isEditMode
          />

          {/* Botones de Acción */}
          <View style={[styles.formActions, { paddingBottom: modalActionPaddingBottom }]}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={handleCancelEditPatient}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.saveButton]}
              onPress={handleSaveEditPatient}
              activeOpacity={0.7}
            >
              <Text style={styles.saveButtonText}>Actualizar Paciente</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal para Ver Detalles del Paciente */}
      <Modal
        visible={showPatientDetailsModal}
        transparent={false}
        onRequestClose={() => setShowPatientDetailsModal(false)}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderContent}>
              <Ionicons name="eye" size={28} color="#667eea" />
              <Text style={styles.modalTitle}>Detalles del Paciente</Text>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowPatientDetailsModal(false)}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.formContainer}>
              {/* Información Personal */}
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>👤 Información Personal</Text>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Nombre Completo:</Text>
                  <Text style={styles.detailValue}>{selectedPatientForDetails?.name || 'No especificado'}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Email:</Text>
                  <Text style={styles.detailValue}>{selectedPatientForDetails?.email || 'No especificado'}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Teléfono:</Text>
                  <Text style={styles.detailValue}>{selectedPatientForDetails?.phone || 'No especificado'}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Fecha de Nacimiento:</Text>
                  <Text style={styles.detailValue}>{selectedPatientForDetails?.dateOfBirth || 'No especificada'}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Dirección:</Text>
                  <Text style={styles.detailValue}>{selectedPatientForDetails?.address || 'No especificada'}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Género:</Text>
                  <Text style={styles.detailValue}>{selectedPatientForDetails?.gender || 'No especificado'}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Alergias:</Text>
                  <Text style={styles.detailValue}>{selectedPatientForDetails?.allergies || 'No especificadas'}</Text>
                </View>
              </View>

              {/* Contacto de Emergencia */}
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>🚨 Contacto de Emergencia</Text>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Nombre del Contacto:</Text>
                  <Text style={styles.detailValue}>{selectedPatientForDetails?.emergencyContact || 'No especificado'}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Teléfono:</Text>
                  <Text style={styles.detailValue}>{selectedPatientForDetails?.emergencyContactPhone || 'No especificado'}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Relación:</Text>
                  <Text style={styles.detailValue}>{selectedPatientForDetails?.emergencyContactRelationship || 'No especificada'}</Text>
                </View>
              </View>

              {/* Información Médica */}
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>🏥 Información Médica</Text>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Antecedentes Médicos:</Text>
                  <Text style={styles.detailValue}>{selectedPatientForDetails?.medicalHistory || 'No especificados'}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Diagnóstico:</Text>
                  <Text style={styles.detailValue}>{selectedPatientForDetails?.diagnosis || 'No especificado'}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Plan de Tratamiento:</Text>
                  <Text style={styles.detailValue}>{selectedPatientForDetails?.treatmentPlan || 'No especificado'}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Obra Social:</Text>
                  <Text style={styles.detailValue}>{selectedPatientForDetails?.insurance || 'No especificada'}</Text>
                </View>
              </View>

              {/* Información Adicional */}
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>ℹ️ Información Adicional</Text>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Ocupación:</Text>
                  <Text style={styles.detailValue}>{selectedPatientForDetails?.occupation || 'No especificada'}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Estado Civil:</Text>
                  <Text style={styles.detailValue}>{selectedPatientForDetails?.maritalStatus || 'No especificado'}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Notas Adicionales:</Text>
                  <Text style={styles.detailValue}>{selectedPatientForDetails?.notes || 'No especificadas'}</Text>
                </View>
              </View>

              {/* Estadísticas del Paciente */}
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>📊 Estadísticas</Text>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Estado:</Text>
                  <Text style={[styles.detailValue, { color: selectedPatientForDetails?.status === 'active' ? '#4CAF50' : '#F44336' }]}>
                    {selectedPatientForDetails?.status === 'active' ? '🟢 Activo' : '🔴 Inactivo'}
                  </Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Total de Visitas:</Text>
                  <Text style={styles.detailValue}>{selectedPatientForDetails?.visits || 0}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Última Visita:</Text>
                  <Text style={styles.detailValue}>{selectedPatientForDetails?.lastVisit || 'No registrada'}</Text>
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Botones de Acción */}
          <View style={styles.formActions}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setShowPatientDetailsModal(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>Cerrar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.saveButton]}
              onPress={() => {
                setShowPatientDetailsModal(false);
                handleEditPatient(selectedPatientForDetails);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.saveButtonText}>Editar Paciente</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal para Agendar Cita */}
      <Modal
        visible={showScheduleModal}
        transparent={false}
        onRequestClose={() => setShowScheduleModal(false)}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderContent}>
              <Ionicons name="calendar" size={28} color="#4CAF50" />
              <Text style={styles.modalTitle}>Agendar Cita</Text>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowScheduleModal(false)}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.formContainer}>
              {/* Información del Paciente */}
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>👤 Paciente</Text>
                <View style={styles.patientInfoCard}>
                  <View style={styles.patientInfoHeader}>
                    <View style={styles.patientInfoAvatar}>
                      <Ionicons name="person" size={24} color="white" />
                    </View>
                    <View style={styles.patientInfoDetails}>
                      <Text style={styles.patientInfoName}>{selectedPatientForSchedule?.name || 'Paciente'}</Text>
                      <Text style={styles.patientInfoEmail}>{selectedPatientForSchedule?.email || ''}</Text>
                      <Text style={styles.patientInfoPhone}>{selectedPatientForSchedule?.phone || ''}</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Detalles de la Cita */}
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>📅 Detalles de la Cita</Text>
                
                <View style={styles.inputRow}>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>Servicio *</Text>
                    <View style={styles.serviceInputContainer}>
                      <TextInput
                        style={[styles.textInput, styles.serviceInput]}
                        placeholder="Ej: Consulta Psicológica, Terapia Individual"
                        value={newAppointment.service}
                        onChangeText={(text) => setNewAppointment(prev => ({ ...prev, service: text }))}
                        placeholderTextColor="#999"
                      />
                      <TouchableOpacity
                        style={styles.editServiceButton}
                        onPress={() => {
                          // Permitir editar el servicio
                          Alert.alert(
                            'Editar Servicio',
                            '¿Deseas cambiar el servicio predeterminado?',
                            [
                              { text: 'Cancelar', style: 'cancel' },
                              { text: 'Editar', onPress: () => {
                                // El campo ya es editable, solo mostrar mensaje
                                Alert.alert('Info', 'Puedes editar el servicio directamente en el campo de texto');
                              }}
                            ]
                          );
                        }}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="create" size={16} color="#667eea" />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.serviceHelperText}>
                      💡 Servicio predeterminado: {user?.service || 'Consulta Médica'}
                    </Text>
                  </View>
                </View>

                <View style={styles.inputRow}>
                  <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                    <Text style={styles.inputLabel}>Fecha *</Text>
                    <TouchableOpacity
                      style={styles.dateSelectorButton}
                      onPress={() => {
                        setShowDatePickerModal(true);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={styles.dateSelectorContent}>
                        <Ionicons name="calendar" size={20} color="#667eea" />
                        <View style={styles.dateSelectorTextContainer}>
                          {newAppointment.date ? (
                            <Text style={styles.dateSelectorSelectedText}>{newAppointment.date}</Text>
                          ) : (
                            <Text style={styles.dateSelectorPlaceholder}>Seleccionar fecha</Text>
                          )}
                        </View>
                        <Ionicons name="chevron-down" size={16} color="#999" />
                      </View>
                    </TouchableOpacity>
                  </View>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>Hora *</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Ej: 10:00, 14:30"
                      value={newAppointment.time}
                      onChangeText={(text) => setNewAppointment(prev => ({ ...prev, time: text }))}
                      placeholderTextColor="#999"
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <View style={styles.inputRow}>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>Notas Adicionales</Text>
                    <TextInput
                      style={[styles.textInput, styles.textArea]}
                      placeholder="Notas sobre la cita, recordatorios especiales, etc."
                      value={newAppointment.notes}
                      onChangeText={(text) => setNewAppointment(prev => ({ ...prev, notes: text }))}
                      placeholderTextColor="#999"
                      multiline
                      numberOfLines={3}
                    />
                  </View>
                </View>
              </View>

              {/* Información Adicional */}
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>ℹ️ Información Adicional</Text>
                
                <View style={styles.infoCard}>
                  <View style={styles.infoRow}>
                    <Ionicons name="time" size={20} color="#667eea" />
                    <Text style={styles.infoText}>Duración estimada: 60 minutos</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Ionicons name="location" size={20} color="#667eea" />
                    <Text style={styles.infoText}>Ubicación: Consultorio Principal</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Ionicons name="card" size={20} color="#667eea" />
                    <Text style={styles.infoText}>Costo: $15,000 ARS</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Ionicons name="notifications" size={20} color="#667eea" />
                    <Text style={styles.infoText}>Recordatorio: 24 horas antes</Text>
                  </View>
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Botones de Acción */}
          <View style={styles.formActions}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={handleCancelAppointment}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.saveButton]}
              onPress={handleSaveAppointment}
              activeOpacity={0.7}
            >
              <Text style={styles.saveButtonText}>Agendar Cita</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal del Historial del Paciente */}
      <Modal
        visible={showPatientHistoryModal}
        transparent={false}
        onRequestClose={() => setShowPatientHistoryModal(false)}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderContent}>
              <Ionicons name="medical" size={28} color="#2196F3" />
              <Text style={styles.modalTitle}>
                Historial de{' '}
                {selectedPatientForHistory?.name ||
                  selectedPatientForHistory?.fullName ||
                  'Paciente'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowPatientHistoryModal(false)}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.historyContent} showsVerticalScrollIndicator={false}>
            {/* Resumen del Paciente */}
            <View style={styles.historySection}>
              <Text style={styles.historySectionTitle}>📊 Resumen General</Text>
              <View style={styles.summaryCards}>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryCardNumber}>{patientHistoryData.appointments.length}</Text>
                  <View style={styles.summaryCardTextContainer}>
                    <Text style={styles.summaryCardLabel}>Citas</Text>
                    <Text style={styles.summaryCardLabel}>Totales</Text>
                  </View>
                </View>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryCardNumber}>
                    {patientHistoryData.appointments.filter(apt => apt.status === 'completed').length}
                  </Text>
                  <View style={styles.summaryCardTextContainer}>
                    <Text style={styles.summaryCardLabel}>Completadas</Text>
                  </View>
                </View>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryCardNumber}>{patientHistoryData.treatments.length}</Text>
                  <View style={styles.summaryCardTextContainer}>
                    <Text style={styles.summaryCardLabel}>Tratamientos</Text>
                  </View>
                </View>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryCardNumber}>{patientHistoryData.medicalNotes.length}</Text>
                  <View style={styles.summaryCardTextContainer}>
                    <Text style={styles.summaryCardLabel}>Notas</Text>
                    <Text style={styles.summaryCardLabel}>Médicas</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Historial de Citas */}
            <View style={styles.historySection}>
              <Text style={styles.historySectionTitle}>📅 Historial de Citas</Text>
              {patientHistoryData.appointments.length === 0 ? (
                <Text style={styles.historyEmptyText}>
                  No hay citas registradas con este paciente en tu consulta en Turnario.
                </Text>
              ) : null}
              {patientHistoryData.appointments.map((appointment) => (
                <View key={appointment.id} style={styles.appointmentCard}>
                  <View style={styles.appointmentHeader}>
                    <View style={styles.appointmentDate}>
                      <Text style={styles.appointmentDateText}>{appointment.date}</Text>
                      <Text style={styles.appointmentTimeText}>{appointment.time}</Text>
                    </View>
                    <View
                      style={[
                        styles.appointmentStatus,
                        appointment.status === 'completed'
                          ? styles.appointmentStatusCompleted
                          : appointment.status === 'cancelled'
                            ? { backgroundColor: '#9E9E9E' }
                            : styles.appointmentStatusScheduled,
                      ]}
                    >
                      <Text style={styles.appointmentStatusText}>
                        {appointment.status === 'completed'
                          ? 'Completada'
                          : appointment.status === 'cancelled'
                            ? 'Cancelada'
                            : 'Programada'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.appointmentService}>{appointment.service}</Text>
                  <Text style={styles.appointmentProfessional}>
                    Profesional: {appointment.professional}
                  </Text>
                  <Text style={styles.appointmentNotes}>{appointment.notes}</Text>
                  <View style={styles.appointmentDetails}>
                    <Text style={styles.appointmentDetailText}>Duración: {appointment.duration} min</Text>
                    <Text style={styles.appointmentDetailText}>Costo: ${appointment.cost.toLocaleString()}</Text>
                    <Text style={styles.appointmentDetailText}>
                      Pago: {appointment.paymentStatus === 'paid' ? 'Pagado' : 'Pendiente'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Tratamientos */}
            <View style={styles.historySection}>
              <Text style={styles.historySectionTitle}>💊 Tratamientos</Text>
              {patientHistoryData.treatments.length === 0 ? (
                <Text style={styles.historyEmptyText}>
                  Sin tratamientos estructurados en sistema para este paciente.
                </Text>
              ) : null}
              {patientHistoryData.treatments.map((treatment) => (
                <View key={treatment.id} style={styles.treatmentCard}>
                  <View style={styles.treatmentHeader}>
                    <Text style={styles.treatmentName}>{treatment.name}</Text>
                    <View style={[
                      styles.treatmentStatus,
                      treatment.status === 'active' ? styles.treatmentStatusActive : styles.treatmentStatusInactive
                    ]}>
                      <Text style={styles.treatmentStatusText}>
                        {treatment.status === 'active' ? 'Activo' : 'Finalizado'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.treatmentDescription}>{treatment.description}</Text>
                  <View style={styles.treatmentProgress}>
                    <View style={styles.treatmentProgressBar}>
                      <View style={[styles.treatmentProgressFill, { width: `${treatment.progress}%` }]} />
                    </View>
                    <Text style={styles.treatmentProgressText}>{treatment.progress}% completado</Text>
                  </View>
                  <View style={styles.treatmentDetails}>
                    <Text style={styles.treatmentDetailText}>
                      Sesiones: {treatment.completedSessions}/{treatment.sessions}
                    </Text>
                    <Text style={styles.treatmentDetailText}>
                      Inicio: {treatment.startDate}
                    </Text>
                    <Text style={styles.treatmentDetailText}>
                      Fin: {treatment.endDate}
                    </Text>
                  </View>
                  <View style={styles.treatmentGoals}>
                    <Text style={styles.treatmentGoalsTitle}>Objetivos:</Text>
                    {(treatment.goals || []).map((goal: string, index: number) => (
                      <Text key={index} style={styles.treatmentGoalText}>• {goal}</Text>
                    ))}
                  </View>
                </View>
              ))}
            </View>

            {/* Secciones anteriores */}
            <View style={styles.historySection}>
              <Text style={styles.historySectionTitle}>📋 Secciones Anteriores</Text>
              {patientHistoryData.consultations.length === 0 &&
              patientHistoryData.prescriptions.length === 0 &&
              patientHistoryData.documents.length === 0 ? (
                <Text style={styles.historyEmptyText}>
                  Sin secciones clínicas previas registradas para este paciente.
                </Text>
              ) : null}

              {patientHistoryData.consultations.map((consultation) => (
                <View key={`consult-${consultation.id}`} style={styles.noteCard}>
                  <View style={styles.noteHeader}>
                    <Text style={styles.noteType}>Consulta {consultation.type}</Text>
                    <Text style={styles.noteDate}>{consultation.date}</Text>
                  </View>
                  <Text style={styles.noteContent}>Diagnóstico: {consultation.diagnosis}</Text>
                  <Text style={styles.noteContent}>Síntomas: {consultation.symptoms}</Text>
                  <Text style={styles.noteContent}>Tratamiento: {consultation.treatment}</Text>
                  {consultation.notes ? (
                    <Text style={styles.noteContent}>Notas: {consultation.notes}</Text>
                  ) : null}
                </View>
              ))}

              {patientHistoryData.prescriptions.map((prescription) => (
                <View key={`pres-${prescription.id}`} style={styles.noteCard}>
                  <View style={styles.noteHeader}>
                    <Text style={styles.noteType}>Prescripción</Text>
                    <Text style={styles.noteDate}>{prescription.date}</Text>
                  </View>
                  <Text style={styles.noteContent}>
                    Estado: {prescription.status === 'active' ? 'Activa' : 'Inactiva'}
                  </Text>
                  {prescription.medications.length > 0 ? (
                    <Text style={styles.noteContent}>
                      Medicación: {prescription.medications.join(', ')}
                    </Text>
                  ) : null}
                  {prescription.instructions ? (
                    <Text style={styles.noteContent}>Indicaciones: {prescription.instructions}</Text>
                  ) : null}
                </View>
              ))}

              {patientHistoryData.documents.map((document) => (
                <View key={`doc-${document.id}`} style={styles.noteCard}>
                  <View style={styles.noteHeader}>
                    <Text style={styles.noteType}>Documento: {document.type}</Text>
                    <Text style={styles.noteDate}>{document.date}</Text>
                  </View>
                  <Text style={styles.noteContent}>{document.title}</Text>
                  {document.description ? (
                    <Text style={styles.noteContent}>{document.description}</Text>
                  ) : null}
                </View>
              ))}
            </View>

            {/* Progreso */}
            <View style={styles.historySection}>
              <Text style={styles.historySectionTitle}>📈 Progreso del Paciente</Text>
              {patientHistoryData.progressTimeline.length === 0 ? (
                <Text style={styles.historyEmptyText}>
                  Todavía no hay hitos o notas de evolución registradas.
                </Text>
              ) : null}
              {patientHistoryData.progressTimeline.map((item) => (
                <View key={item.id} style={styles.noteCard}>
                  <View style={styles.noteHeader}>
                    <Text style={styles.noteType}>{item.title}</Text>
                    <Text style={styles.noteDate}>{item.date}</Text>
                  </View>
                  <Text style={styles.noteContent}>{item.details || 'Sin detalle adicional.'}</Text>
                  <Text style={styles.noteProfessional}>
                    {item.source} • {item.status === 'completed' ? 'Completado' : 'Pendiente'}
                  </Text>
                </View>
              ))}
            </View>

            {/* Notas Médicas */}
            <View style={styles.historySection}>
              <Text style={styles.historySectionTitle}>📝 Notas Médicas</Text>
              {patientHistoryData.medicalNotes.length === 0 ? (
                <Text style={styles.historyEmptyText}>
                  Sin notas además de la ficha del paciente (si la cargaste al editar).
                </Text>
              ) : null}
              {patientHistoryData.medicalNotes.map((note) => (
                <View key={note.id} style={styles.noteCard}>
                  <View style={styles.noteHeader}>
                    <Text style={styles.noteType}>{note.type}</Text>
                    <Text style={styles.noteDate}>{note.date}</Text>
                  </View>
                  <Text style={styles.noteContent}>{note.content}</Text>
                  <Text style={styles.noteProfessional}>{note.professional}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Modal del Calendario */}
      <Modal
        visible={showDatePickerModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowDatePickerModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderContent}>
              <Ionicons name="calendar" size={28} color="#667eea" />
              <Text style={styles.modalTitle}>Seleccionar Fecha</Text>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowDatePickerModal(false)}
              activeOpacity={0.7}
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
              {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((day, index) => (
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
                      const formattedDate = selectedDate.toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'long'
                      });
                      
                      // Si estamos en el modal de agendar cita, actualizar la fecha de la cita
                      if (showScheduleModal) {
                        setNewAppointment(prev => ({ ...prev, date: formattedDate }));
                      } else {
                        // Si estamos en el modal de agregar/editar paciente, actualizar la fecha de nacimiento
                        setNewPatientData(prev => ({ ...prev, dateOfBirth: formattedDate }));
                      }
                      
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

      {/* Modal para Seleccionar Cliente del Catálogo */}
      <Modal
        visible={showClientSelector}
        transparent={false}
        onRequestClose={() => setShowClientSelector(false)}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderContent}>
              <Ionicons name="people" size={28} color="#667eea" />
              <Text style={styles.modalTitle}>Seleccionar Paciente</Text>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowClientSelector(false)}
              activeOpacity={0.7}
            >
              <Ionicons name="close-circle" size={28} color="#999" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.clientListContainer}>
              {isLoadingClients ? (
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>Cargando usuarios...</Text>
                </View>
              ) : clientUsers.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="people-outline" size={48} color="#ccc" />
                  <Text style={styles.emptyText}>No hay usuarios disponibles</Text>
                </View>
              ) : (
                clientUsers.map((client) => (
                  <TouchableOpacity
                    key={client._id}
                    style={styles.clientItem}
                    onPress={() => handleClientSelect(client)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.clientItemContent}>
                      <View style={styles.clientItemHeader}>
                        <Text style={styles.clientItemName}>{client.fullName}</Text>
                        <View style={styles.clientItemStatus}>
                          <Ionicons 
                            name={client.isActive ? "checkmark-circle" : "close-circle"} 
                            size={16} 
                            color={client.isActive ? "#4CAF50" : "#f44336"} 
                          />
                          <Text style={[
                            styles.clientItemStatusText,
                            { color: client.isActive ? "#4CAF50" : "#f44336" }
                          ]}>
                            {client.isActive ? "Activo" : "Inactivo"}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.clientItemDetails}>
                        <View style={styles.clientItemDetail}>
                          <Ionicons name="mail" size={14} color="#666" />
                          <Text style={styles.clientItemDetailText}>{client.email}</Text>
                        </View>
                        <View style={styles.clientItemDetail}>
                          <Ionicons name="call" size={14} color="#666" />
                          <Text style={styles.clientItemDetailText}>{client.phone}</Text>
                        </View>
                        <View style={styles.clientItemDetail}>
                          <Ionicons name="calendar" size={14} color="#666" />
                          <Text style={styles.clientItemDetailText}>
                            Registrado: {new Date(client.createdAt).toLocaleDateString()}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#ccc" />
                  </TouchableOpacity>
                ))
              )}
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
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
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 20,
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  statInfo: {
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  statTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  statSubtitle: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  summaryCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 4,
  },
  trendContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 120,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  trendItem: {
    alignItems: 'center',
    flex: 1,
  },
  trendMonth: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  trendBarContainer: {
    height: 60,
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  trendBar: {
    width: 20,
    borderRadius: 10,
    minHeight: 4,
  },
  trendValue: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333',
  },
  trendNote: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  // Estilos optimizados para Android - Gestión de Pacientes
  patientManagementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#667eea',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
    elevation: 4,
  },
  patientManagementHeaderContent: {
    flex: 1,
  },
  patientManagementTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  patientManagementSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  patientManagementStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    elevation: 2,
  },
  patientManagementStatCard: {
    alignItems: 'center',
    flex: 1,
  },
  patientManagementStatNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  patientManagementStatLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  patientManagementActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 20,
    paddingHorizontal: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    elevation: 2,
  },
  patientManagementActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#667eea',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    elevation: 3,
    minWidth: 100,
    flex: 1,
    marginHorizontal: 4,
  },
  patientManagementActionButtonDisabled: {
    backgroundColor: '#94A3B8',
  },
  patientManagementActionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  patientManagementLimitHint: {
    fontSize: 13,
    color: '#6366E1',
    marginTop: 6,
    fontWeight: '600',
  },
  patientManagementSearchSection: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    elevation: 2,
  },
  patientManagementSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 15,
    elevation: 1,
  },
  patientManagementSearchIcon: {
    marginRight: 10,
  },
  patientManagementSearchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 16,
    color: '#333',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  patientManagementFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  patientManagementFilterChip: {
    backgroundColor: '#e0e0e0',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginHorizontal: 4,
    marginVertical: 2,
    elevation: 1,
  },
  patientManagementFilterChipActive: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  patientManagementFilterChipText: {
    fontSize: 12,
    color: '#666',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  patientManagementFilterChipTextActive: {
    color: 'white',
  },
  patientManagementList: {
    flex: 1,
    padding: 20,
  },
  patientManagementCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  patientManagementCardInactive: {
    opacity: 0.7,
  },
  patientManagementCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  patientManagementCardAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#667eea',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    elevation: 2,
  },
  patientManagementCardInfo: {
    flex: 1,
  },
  patientManagementCardName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  patientManagementCardEmail: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  patientManagementCardPhone: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  patientManagementCardStatus: {
    alignItems: 'flex-end',
  },
  patientManagementStatusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 1,
  },
  patientManagementStatusActive: {
    backgroundColor: '#4CAF50',
  },
  patientManagementStatusInactive: {
    backgroundColor: '#F44336',
  },
  patientManagementStatusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  patientManagementCardVisits: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  patientManagementCardDetails: {
    marginBottom: 10,
  },
  patientManagementCardNotes: {
    fontSize: 14,
    color: '#333',
    marginBottom: 5,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  patientManagementCardNotesLabel: {
    fontWeight: 'bold',
    color: '#666',
  },
  patientManagementCardLastVisit: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  patientManagementCardActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  patientManagementAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  patientManagementActionText: {
    fontSize: 12,
    color: '#667eea',
    marginLeft: 5,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  // Estilos adicionales para mejorar compatibilidad con Android
  androidSafeArea: {
    paddingTop: Platform.OS === 'android' ? 25 : 0,
  },
  androidCardShadow: {
    shadowColor: Platform.OS === 'android' ? undefined : '#000',
    shadowOffset: Platform.OS === 'android' ? undefined : { width: 0, height: 2 },
    shadowOpacity: Platform.OS === 'android' ? undefined : 0.1,
    shadowRadius: Platform.OS === 'android' ? undefined : 4,
    elevation: Platform.OS === 'android' ? 4 : 3,
  },
  androidTextFix: {
    includeFontPadding: false,
    textAlignVertical: 'center',
  },

  // Estilos para modales
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  modalHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    marginLeft: 12,
    letterSpacing: -0.5,
  },
  closeButton: {
    padding: 12,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScrollContent: {
    flex: 1,
    paddingHorizontal: 20,
  },

  // Estilos para formularios
  formContainer: {
    paddingVertical: 20,
  },
  formSection: {
    marginBottom: 30,
  },
  inputRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1F2937',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },

  // Estilos para el selector de fecha
  dateSelectorButton: {
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  dateSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateSelectorTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  dateSelectorSelectedText: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
  },
  dateSelectorPlaceholder: {
    fontSize: 16,
    color: '#9CA3AF',
    fontWeight: '400',
  },

  // Estilos para botones de formulario
  formActions: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 24,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fafafa',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
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
    color: '#6B7280',
    textAlign: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    textAlign: 'center',
  },

  // Estilos para el historial del paciente
  historyContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  historySection: {
    marginBottom: 30,
  },
  historySectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  historyEmptyText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  summaryCards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryCardNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#667eea',
    marginBottom: 4,
  },
  summaryCardLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    textAlign: 'center',
  },
  summaryCardTextContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  appointmentCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  appointmentDate: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appointmentDateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginRight: 8,
  },
  appointmentTimeText: {
    fontSize: 14,
    color: '#6B7280',
  },
  appointmentStatus: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  appointmentStatusCompleted: {
    backgroundColor: '#D1FAE5',
  },
  appointmentStatusScheduled: {
    backgroundColor: '#FEF3C7',
  },
  appointmentStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1F2937',
  },
  appointmentService: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  appointmentProfessional: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  appointmentNotes: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 12,
    lineHeight: 20,
  },
  appointmentDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  appointmentDetailText: {
    fontSize: 12,
    color: '#6B7280',
  },
  treatmentCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  treatmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  treatmentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  treatmentStatus: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  treatmentStatusActive: {
    backgroundColor: '#D1FAE5',
  },
  treatmentStatusInactive: {
    backgroundColor: '#FEE2E2',
  },
  treatmentStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1F2937',
  },
  treatmentDescription: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 12,
    lineHeight: 20,
  },
  treatmentProgress: {
    marginBottom: 12,
  },
  treatmentProgressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  treatmentProgressFill: {
    height: '100%',
    backgroundColor: '#667eea',
    borderRadius: 4,
  },
  treatmentProgressText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'right',
  },
  treatmentDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  treatmentDetailText: {
    fontSize: 12,
    color: '#6B7280',
  },
  treatmentGoals: {
    marginTop: 8,
  },
  treatmentGoalsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  treatmentGoalText: {
    fontSize: 12,
    color: '#4B5563',
    marginBottom: 2,
  },
  noteCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  noteType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#667eea',
  },
  noteDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  noteContent: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 8,
    lineHeight: 20,
  },
  noteProfessional: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'right',
  },

  // Estilos para el calendario
  calendarContainer: {
    flex: 1,
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  calendarNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  calendarNavButton: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
    minHeight: 44,
  },
  calendarMonthText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    textTransform: 'capitalize',
    letterSpacing: -0.3,
  },
  weekDaysContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  weekDayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7280',
    paddingVertical: 12,
    letterSpacing: 0.5,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 4,
  },
  calendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 2,
    borderRadius: 12,
    borderWidth: 0,
  },
  calendarDayOtherMonth: {
    backgroundColor: 'transparent',
  },
  calendarDayUnavailable: {
    backgroundColor: '#F3F4F6',
  },
  calendarDayAvailable: {
    backgroundColor: '#667eea',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  calendarDayText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  calendarDayTextOtherMonth: {
    color: '#D1D5DB',
    fontWeight: '400',
  },
  calendarDayTextUnavailable: {
    color: '#9CA3AF',
    fontWeight: '400',
  },
  calendarDayTextAvailable: {
    color: 'white',
    fontWeight: '700',
  },

  // Estilos para detalles del paciente
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    flex: 1,
    marginRight: 16,
  },
  detailValue: {
    fontSize: 14,
    color: '#1F2937',
    flex: 2,
    textAlign: 'right',
  },

  // Estilos para agendar cita
  patientInfoCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  patientInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  patientInfoAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#667eea',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  patientInfoDetails: {
    flex: 1,
  },
  patientInfoName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  patientInfoEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  patientInfoPhone: {
    fontSize: 14,
    color: '#6B7280',
  },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#4B5563',
    marginLeft: 12,
    flex: 1,
  },

  // Estilos para el campo de servicio
  serviceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  serviceInput: {
    flex: 1,
    paddingRight: 40,
  },
  editServiceButton: {
    position: 'absolute',
    right: 12,
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceHelperText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    fontStyle: 'italic',
  },
  // Estilos para el selector de catálogo
  catalogSelectorButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
  },
  catalogSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  catalogSelectorTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  catalogSelectorSelectedText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  catalogSelectorPlaceholder: {
    fontSize: 16,
    color: '#999',
  },
  catalogSelectorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  catalogSelectorCount: {
    fontSize: 12,
    color: '#667eea',
    marginRight: 8,
  },
  selectedPatientInfo: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
  },
  patientInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  patientInfoText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  genderSelector: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  genderSelectorText: {
    fontSize: 16,
  },
  // Estilos para el modal de selector de clientes
  clientListContainer: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
  },
  clientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  clientItemContent: {
    flex: 1,
  },
  clientItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  clientItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  clientItemStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clientItemStatusText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  clientItemDetails: {
    gap: 4,
  },
  clientItemDetail: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clientItemDetailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
});
