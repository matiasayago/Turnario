// @ts-nocheck
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import { getBackendBaseUrl } from '../config/backend';
import simpleAuthService from '../services/simpleAuthService';
import { useAuth } from './AuthContext';
import { useMedicalAuthorization } from './MedicalAuthorizationContext';

// Tipos para el sistema de historial médico
export interface MedicalConsultation {
  id: string;
  patientId: string;
  professionalId: string;
  professionalName: string;
  date: Date;
  type: 'initial' | 'follow_up' | 'emergency' | 'routine';
  symptoms: string;
  diagnosis: string;
  treatment: string;
  notes: string;
  status: 'completed' | 'pending' | 'cancelled';
  nextAppointment?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface MedicalDocument {
  id: string;
  patientId: string;
  professionalId: string;
  professionalName: string;
  type: 'lab_result' | 'imaging' | 'report' | 'certificate' | 'other';
  title: string;
  description: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  uploadDate: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Prescription {
  id: string;
  patientId: string;
  professionalId: string;
  professionalName: string;
  consultationId: string;
  date: Date;
  medications: Medication[];
  instructions: string;
  duration: string;
  status: 'active' | 'completed' | 'discontinued';
  refills: number;
  refillsRemaining: number;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  route: 'oral' | 'intravenous' | 'intramuscular' | 'topical' | 'other';
  quantity: number;
  unit: string;
  specialInstructions?: string;
}

export interface Treatment {
  id: string;
  patientId: string;
  professionalId: string;
  professionalName: string;
  consultationId: string;
  name: string;
  description: string;
  startDate: Date;
  endDate?: Date;
  status: 'active' | 'completed' | 'discontinued' | 'on_hold';
  progress: number; // 0-100
  notes: string[];
  milestones: TreatmentMilestone[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TreatmentMilestone {
  id: string;
  title: string;
  description: string;
  targetDate: Date;
  completedDate?: Date;
  status: 'pending' | 'completed' | 'overdue';
  notes?: string;
}

export interface MedicalHistoryFilters {
  dateFrom?: Date;
  dateTo?: Date;
  type?: string;
  professionalId?: string;
  status?: string;
  searchQuery?: string;
}

/** Registro de sesión desde un turno (dashboard profesional). */
export interface RecordProfessionalSessionInput {
  patientId: string;
  professionalId: string;
  professionalName: string;
  serviceLabel: string;
  appointmentDateYmd: string;
  appointmentTime: string;
  appointmentId: string;
  notes: string;
  treatmentSummary: string;
}

interface MedicalHistoryContextType {
  // Estado
  consultations: MedicalConsultation[];
  documents: MedicalDocument[];
  prescriptions: Prescription[];
  treatments: Treatment[];
  isLoading: boolean;
  
  // Acciones para consultas
  createConsultation: (consultation: Omit<MedicalConsultation, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateConsultation: (consultationId: string, updates: Partial<MedicalConsultation>) => Promise<void>;
  deleteConsultation: (consultationId: string) => Promise<void>;
  
  // Acciones para documentos
  uploadDocument: (document: Omit<MedicalDocument, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateDocument: (documentId: string, updates: Partial<MedicalDocument>) => Promise<void>;
  deleteDocument: (documentId: string) => Promise<void>;
  
  // Acciones para prescripciones
  createPrescription: (prescription: Omit<Prescription, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updatePrescription: (prescriptionId: string, updates: Partial<Prescription>) => Promise<void>;
  discontinuePrescription: (prescriptionId: string, reason: string) => Promise<void>;
  
  // Acciones para tratamientos
  startTreatment: (treatment: Omit<Treatment, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateTreatment: (treatmentId: string, updates: Partial<Treatment>) => Promise<void>;
  completeTreatment: (treatmentId: string, notes: string) => Promise<void>;
  addTreatmentMilestone: (treatmentId: string, milestone: Omit<TreatmentMilestone, 'id'>) => Promise<void>;
  updateMilestone: (treatmentId: string, milestoneId: string, updates: Partial<TreatmentMilestone>) => Promise<void>;
  recordProfessionalSession: (input: RecordProfessionalSessionInput) => Promise<void>;
  loadPatientHistory: (patientId: string) => Promise<void>;

  // Consultas
  getConsultationsByPatient: (patientId: string, filters?: MedicalHistoryFilters) => MedicalConsultation[];
  getDocumentsByPatient: (patientId: string, filters?: MedicalHistoryFilters) => MedicalDocument[];
  getPrescriptionsByPatient: (patientId: string, filters?: MedicalHistoryFilters) => Prescription[];
  getTreatmentsByPatient: (patientId: string, filters?: MedicalHistoryFilters) => Treatment[];
  
  // Estadísticas
  getPatientStats: (patientId: string) => {
    totalConsultations: number;
    activeTreatments: number;
    activePrescriptions: number;
    totalDocuments: number;
    lastVisit: Date | null;
  };
  
  // Utilidades
  searchMedicalHistory: (patientId: string, query: string) => {
    consultations: MedicalConsultation[];
    documents: MedicalDocument[];
    prescriptions: Prescription[];
    treatments: Treatment[];
  };
}

const MedicalHistoryContext = createContext<MedicalHistoryContextType | undefined>(undefined);

/** Coincide paciente aunque venga como ObjectId string o número legado */
function samePatientId(
  a: string | null | undefined,
  b: string | null | undefined
): boolean {
  return String(a ?? '').trim() === String(b ?? '').trim();
}

interface BackendClinicalSession {
  _id: string;
  patientId: string;
  professionalId: string;
  appointmentId: string;
  professionalName?: string;
  serviceLabel?: string;
  appointmentDateYmd: string;
  appointmentTime?: string;
  notes?: string;
  treatmentSummary?: string;
  recordedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

function mapClinicalSession(session: BackendClinicalSession): {
  consultation: MedicalConsultation;
  treatment: Treatment | null;
} {
  const createdAt = new Date(session.recordedAt || session.createdAt || Date.now());
  const updatedAt = new Date(session.updatedAt || session.recordedAt || Date.now());
  const service = String(session.serviceLabel || 'Consulta');
  const reference = [
    `Sesión ${session.appointmentDateYmd}`,
    session.appointmentTime,
    service,
  ]
    .filter(Boolean)
    .join(' · ');
  const consultation: MedicalConsultation = {
    id: String(session._id),
    patientId: String(session.patientId),
    professionalId: String(session.professionalId),
    professionalName: String(session.professionalName || 'Profesional'),
    date: createdAt,
    type: 'follow_up',
    symptoms: '',
    diagnosis: '',
    treatment: String(session.treatmentSummary || '—'),
    notes: [String(session.notes || '').trim(), reference].filter(Boolean).join('\n\n'),
    status: 'completed',
    createdAt,
    updatedAt,
  };
  const summary = String(session.treatmentSummary || '').trim();
  const treatment: Treatment | null = summary
    ? {
        id: `treatment_${session._id}`,
        patientId: String(session.patientId),
        professionalId: String(session.professionalId),
        professionalName: String(session.professionalName || 'Profesional'),
        consultationId: String(session._id),
        name: `Sesión · ${service}`,
        description: summary,
        startDate: createdAt,
        status: 'completed',
        progress: 100,
        notes: [reference],
        milestones: [],
        endDate: createdAt,
        createdAt,
        updatedAt,
      }
    : null;
  return { consultation, treatment };
}

export const useMedicalHistory = () => {
  const context = useContext(MedicalHistoryContext);
  if (!context) {
    throw new Error('useMedicalHistory debe ser usado dentro de MedicalHistoryProvider');
  }
  return context;
};

export const MedicalHistoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { checkAccess, logAccess } = useMedicalAuthorization();
  const [consultations, setConsultations] = useState<MedicalConsultation[]>([]);
  const [documents, setDocuments] = useState<MedicalDocument[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadPatientHistory = useCallback(async (patientId: string) => {
    const normalizedPatientId = String(patientId || '').trim();
    if (!/^[a-fA-F0-9]{24}$/.test(normalizedPatientId)) return;
    const token = await simpleAuthService.getToken();
    if (!token) throw new Error('Sesión no válida');

    setIsLoading(true);
    try {
      const response = await fetch(
        `${getBackendBaseUrl()}/api/v1/medical-history/patient/${normalizedPatientId}`,
        { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }
      );
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json.success || !Array.isArray(json.data)) {
        throw new Error(json.message || 'No se pudo cargar el historial clínico');
      }
      const mapped = (json.data as BackendClinicalSession[]).map(mapClinicalSession);
      const loadedConsultations = mapped.map((item) => item.consultation);
      const loadedTreatments = mapped
        .map((item) => item.treatment)
        .filter(Boolean) as Treatment[];

      setConsultations((previous) => [
        ...previous.filter((item) => !samePatientId(item.patientId, normalizedPatientId)),
        ...loadedConsultations,
      ]);
      setTreatments((previous) => [
        ...previous.filter((item) => !samePatientId(item.patientId, normalizedPatientId)),
        ...loadedTreatments,
      ]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Datos de ejemplo para desarrollo
  const mockConsultations: MedicalConsultation[] = [
    {
      id: 'cons1',
      patientId: 'patient1',
      professionalId: 'prof1',
      professionalName: 'Dr. Carlos Mendoza',
      date: new Date('2024-01-15'),
      type: 'initial',
      symptoms: 'Dolor de cabeza frecuente, fatiga, dificultad para concentrarse',
      diagnosis: 'Cefalea tensional y estrés laboral',
      treatment: 'Terapia cognitivo-conductual, técnicas de relajación, ejercicio regular',
      notes: 'Paciente presenta síntomas típicos de estrés laboral. Se recomienda seguimiento semanal.',
      status: 'completed',
      nextAppointment: new Date('2024-01-22'),
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-15')
    },
    {
      id: 'cons2',
      patientId: 'patient1',
      professionalId: 'prof1',
      professionalName: 'Dr. Carlos Mendoza',
      date: new Date('2024-01-22'),
      type: 'follow_up',
      symptoms: 'Mejora en la frecuencia del dolor de cabeza, menos fatiga',
      diagnosis: 'Cefalea tensional - Mejoría significativa',
      treatment: 'Continuar con terapia cognitivo-conductual, agregar meditación diaria',
      notes: 'Excelente progreso del paciente. Los síntomas han disminuido notablemente.',
      status: 'completed',
      nextAppointment: new Date('2024-02-05'),
      createdAt: new Date('2024-01-22'),
      updatedAt: new Date('2024-01-22')
    }
  ];

  const mockDocuments: MedicalDocument[] = [
    {
      id: 'doc1',
      patientId: 'patient1',
      professionalId: 'prof1',
      professionalName: 'Dr. Carlos Mendoza',
      type: 'lab_result',
      title: 'Análisis de Sangre Completo',
      description: 'Hemograma completo, perfil lipídico y glucemia en ayunas',
      fileUrl: 'https://example.com/lab_results.pdf',
      fileName: 'lab_results_2024_01_15.pdf',
      fileSize: 245760,
      uploadDate: new Date('2024-01-16'),
      isActive: true,
      createdAt: new Date('2024-01-16'),
      updatedAt: new Date('2024-01-16')
    },
    {
      id: 'doc2',
      patientId: 'patient1',
      professionalId: 'prof1',
      professionalName: 'Dr. Carlos Mendoza',
      type: 'report',
      title: 'Evaluación Psicológica Inicial',
      description: 'Informe completo de la evaluación psicológica inicial del paciente',
      fileUrl: 'https://example.com/psychological_evaluation.pdf',
      fileName: 'psychological_evaluation_2024_01_15.pdf',
      fileSize: 512000,
      uploadDate: new Date('2024-01-17'),
      isActive: true,
      createdAt: new Date('2024-01-17'),
      updatedAt: new Date('2024-01-17')
    }
  ];

  const mockPrescriptions: Prescription[] = [
    {
      id: 'pres1',
      patientId: 'patient1',
      professionalId: 'prof1',
      professionalName: 'Dr. Carlos Mendoza',
      consultationId: 'cons1',
      date: new Date('2024-01-15'),
      medications: [
        {
          id: 'med1',
          name: 'Paracetamol',
          dosage: '500mg',
          frequency: 'Cada 8 horas cuando sea necesario',
          route: 'oral',
          quantity: 20,
          unit: 'tabletas',
          specialInstructions: 'Tomar con alimentos si causa malestar estomacal'
        }
      ],
      instructions: 'Tomar medicamento solo cuando sea necesario para el dolor de cabeza',
      duration: '7 días',
      status: 'active',
      refills: 2,
      refillsRemaining: 2,
      expiresAt: new Date('2024-02-15'),
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-15')
    }
  ];

  const mockTreatments: Treatment[] = [
    {
      id: 'treat1',
      patientId: 'patient1',
      professionalId: 'prof1',
      professionalName: 'Dr. Carlos Mendoza',
      consultationId: 'cons1',
      name: 'Terapia Cognitivo-Conductual para Estrés',
      description: 'Tratamiento psicológico para manejo del estrés laboral y cefalea tensional',
      startDate: new Date('2024-01-15'),
      status: 'active',
      progress: 65,
      notes: [
        'Paciente muestra excelente compromiso con el tratamiento',
        'Los síntomas han disminuido significativamente',
        'Se han implementado técnicas de relajación exitosamente'
      ],
      milestones: [
        {
          id: 'mil1',
          title: 'Evaluación Inicial Completada',
          description: 'Completar evaluación psicológica completa',
          targetDate: new Date('2024-01-15'),
          completedDate: new Date('2024-01-15'),
          status: 'completed'
        },
        {
          id: 'mil2',
          title: 'Primera Sesión de Terapia',
          description: 'Implementar técnicas básicas de relajación',
          targetDate: new Date('2024-01-22'),
          completedDate: new Date('2024-01-22'),
          status: 'completed'
        },
        {
          id: 'mil3',
          title: 'Seguimiento y Ajustes',
          description: 'Evaluar progreso y ajustar tratamiento según sea necesario',
          targetDate: new Date('2024-02-05'),
          status: 'pending'
        }
      ],
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-22')
    }
  ];

  // Cliente: historial asociado al _id / id real del usuario (no "patient1"). Se fusionan datos demo + registros ya en memoria.
  useEffect(() => {
    if (!user) {
      setConsultations([]);
      setDocuments([]);
      setPrescriptions([]);
      setTreatments([]);
      return;
    }

    if (user.userType !== 'client') {
      setConsultations([]);
      setDocuments([]);
      setPrescriptions([]);
      setTreatments([]);
      return;
    }

    const uid = String(user._id || user.id || (user as { userId?: string }).userId || '').trim();
    if (!uid) {
      setConsultations([]);
      setDocuments([]);
      setPrescriptions([]);
      setTreatments([]);
      return;
    }

    if (/^[a-fA-F0-9]{24}$/.test(uid)) {
      setConsultations([]);
      setDocuments([]);
      setPrescriptions([]);
      setTreatments([]);
      loadPatientHistory(uid).catch((error) => {
        console.warn('No se pudo cargar el historial clínico:', error);
      });
      return;
    }

    setConsultations((prev) => {
      const fromMock = mockConsultations.map((c) => ({ ...c, patientId: uid }));
      const extra = prev.filter(
        (c) => samePatientId(c.patientId, uid) && !fromMock.some((m) => m.id === c.id)
      );
      return [...fromMock, ...extra];
    });
    setDocuments((prev) => {
      const fromMock = mockDocuments.map((d) => ({ ...d, patientId: uid }));
      const extra = prev.filter(
        (d) => samePatientId(d.patientId, uid) && !fromMock.some((m) => m.id === d.id)
      );
      return [...fromMock, ...extra];
    });
    setPrescriptions((prev) => {
      const fromMock = mockPrescriptions.map((p) => ({ ...p, patientId: uid }));
      const extra = prev.filter(
        (p) => samePatientId(p.patientId, uid) && !fromMock.some((m) => m.id === p.id)
      );
      return [...fromMock, ...extra];
    });
    setTreatments((prev) => {
      const fromMock = mockTreatments.map((t) => ({ ...t, patientId: uid }));
      const extra = prev.filter(
        (t) => samePatientId(t.patientId, uid) && !fromMock.some((m) => m.id === t.id)
      );
      return [...fromMock, ...extra];
    });
  }, [user?._id, user?.id, user?.userType, loadPatientHistory]);

  // Funciones para consultas médicas
  const createConsultation = useCallback(async (consultation: Omit<MedicalConsultation, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newConsultation: MedicalConsultation = {
      ...consultation,
      id: `cons_${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    setConsultations(prev => [...prev, newConsultation]);
    Alert.alert('✅ Éxito', 'Consulta médica creada exitosamente');
  }, []);

  const updateConsultation = useCallback(async (consultationId: string, updates: Partial<MedicalConsultation>) => {
    setConsultations(prev => prev.map(cons => 
      cons.id === consultationId 
        ? { ...cons, ...updates, updatedAt: new Date() }
        : cons
    ));
    Alert.alert('✅ Éxito', 'Consulta médica actualizada exitosamente');
  }, []);

  const deleteConsultation = useCallback(async (consultationId: string) => {
    setConsultations(prev => prev.filter(cons => cons.id !== consultationId));
    Alert.alert('✅ Éxito', 'Consulta médica eliminada exitosamente');
  }, []);

  // Funciones para documentos médicos
  const uploadDocument = useCallback(async (document: Omit<MedicalDocument, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newDocument: MedicalDocument = {
      ...document,
      id: `doc_${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    setDocuments(prev => [...prev, newDocument]);
    Alert.alert('✅ Éxito', 'Documento médico subido exitosamente');
  }, []);

  const updateDocument = useCallback(async (documentId: string, updates: Partial<MedicalDocument>) => {
    setDocuments(prev => prev.map(doc => 
      doc.id === documentId 
        ? { ...doc, ...updates, updatedAt: new Date() }
        : doc
    ));
    Alert.alert('✅ Éxito', 'Documento médico actualizado exitosamente');
  }, []);

  const deleteDocument = useCallback(async (documentId: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== documentId));
    Alert.alert('✅ Éxito', 'Documento médico eliminado exitosamente');
  }, []);

  // Funciones para prescripciones
  const createPrescription = useCallback(async (prescription: Omit<Prescription, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newPrescription: Prescription = {
      ...prescription,
      id: `pres_${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    setPrescriptions(prev => [...prev, newPrescription]);
    Alert.alert('✅ Éxito', 'Prescripción creada exitosamente');
  }, []);

  const updatePrescription = useCallback(async (prescriptionId: string, updates: Partial<Prescription>) => {
    setPrescriptions(prev => prev.map(pres => 
      pres.id === prescriptionId 
        ? { ...pres, ...updates, updatedAt: new Date() }
        : pres
    ));
    Alert.alert('✅ Éxito', 'Prescripción actualizada exitosamente');
  }, []);

  const discontinuePrescription = useCallback(async (prescriptionId: string, reason: string) => {
    setPrescriptions(prev => prev.map(pres => 
      pres.id === prescriptionId 
        ? { ...pres, status: 'discontinued', notes: [...(pres.instructions ? [pres.instructions] : []), `Discontinuada: ${reason}`], updatedAt: new Date() }
        : pres
    ));
    Alert.alert('✅ Éxito', 'Prescripción discontinuada exitosamente');
  }, []);

  // Funciones para tratamientos
  const startTreatment = useCallback(async (treatment: Omit<Treatment, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newTreatment: Treatment = {
      ...treatment,
      id: `treat_${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    setTreatments(prev => [...prev, newTreatment]);
    Alert.alert('✅ Éxito', 'Tratamiento iniciado exitosamente');
  }, []);

  const updateTreatment = useCallback(async (treatmentId: string, updates: Partial<Treatment>) => {
    setTreatments(prev => prev.map(treat => 
      treat.id === treatmentId 
        ? { ...treat, ...updates, updatedAt: new Date() }
        : treat
    ));
    Alert.alert('✅ Éxito', 'Tratamiento actualizado exitosamente');
  }, []);

  const completeTreatment = useCallback(async (treatmentId: string, notes: string) => {
    setTreatments(prev => prev.map(treat => 
      treat.id === treatmentId 
        ? { ...treat, status: 'completed', progress: 100, notes: [...treat.notes, `Completado: ${notes}`], endDate: new Date(), updatedAt: new Date() }
        : treat
    ));
    Alert.alert('✅ Éxito', 'Tratamiento completado exitosamente');
  }, []);

  const addTreatmentMilestone = useCallback(async (treatmentId: string, milestone: Omit<TreatmentMilestone, 'id'>) => {
    const newMilestone: TreatmentMilestone = {
      ...milestone,
      id: `mil_${Date.now()}`
    };
    
    setTreatments(prev => prev.map(treat => 
      treat.id === treatmentId 
        ? { ...treat, milestones: [...treat.milestones, newMilestone], updatedAt: new Date() }
        : treat
    ));
    Alert.alert('✅ Éxito', 'Hito del tratamiento agregado exitosamente');
  }, []);

  const updateMilestone = useCallback(async (treatmentId: string, milestoneId: string, updates: Partial<TreatmentMilestone>) => {
    setTreatments(prev => prev.map(treat => 
      treat.id === treatmentId 
        ? { 
            ...treat, 
            milestones: treat.milestones.map(mil => 
              mil.id === milestoneId ? { ...mil, ...updates } : mil
            ),
            updatedAt: new Date()
          }
        : treat
    ));
    Alert.alert('✅ Éxito', 'Hito del tratamiento actualizado exitosamente');
  }, []);

  const professionalCanAccessPatientRecords = useCallback(
    (patientId: string): boolean => {
      if (user?.userType !== 'professional') return true;
      const proId = String(user?.id ?? user?._id ?? '').trim();
      if (!proId || !patientId) return false;
      if (checkAccess(proId, patientId, 'consultation')) return true;
      return (
        consultations.some(
          (c) => samePatientId(c.patientId, patientId) && String(c.professionalId) === proId
        ) ||
        treatments.some(
          (t) => samePatientId(t.patientId, patientId) && String(t.professionalId) === proId
        )
      );
    },
    [user, checkAccess, consultations, treatments]
  );

  const recordProfessionalSession = useCallback(async (input: RecordProfessionalSessionInput) => {
    const notesTrim = input.notes.trim();
    const treatTrim = input.treatmentSummary.trim();
    if (!notesTrim && !treatTrim) {
      Alert.alert('Faltan datos', 'Agregá notas y/o tratamiento de la sesión.');
      return;
    }

    if (/^[a-fA-F0-9]{24}$/.test(String(input.appointmentId))) {
      const token = await simpleAuthService.getToken();
      if (!token) throw new Error('Sesión no válida');
      const response = await fetch(`${getBackendBaseUrl()}/api/v1/medical-history/session`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          appointmentId: input.appointmentId,
          notes: notesTrim,
          treatmentSummary: treatTrim,
          professionalName: input.professionalName,
          serviceLabel: input.serviceLabel,
        }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json.success || !json.data) {
        throw new Error(json.message || 'No se pudo guardar la sesión en el historial');
      }
      const mapped = mapClinicalSession(json.data as BackendClinicalSession);
      setConsultations((previous) => [
        ...previous.filter((item) => item.id !== mapped.consultation.id),
        mapped.consultation,
      ]);
      setTreatments((previous) => {
        const withoutCurrent = previous.filter(
          (item) => item.id !== `treatment_${mapped.consultation.id}`
        );
        return mapped.treatment ? [...withoutCurrent, mapped.treatment] : withoutCurrent;
      });
      return;
    }

    const now = new Date();
    const consId = `cons_${Date.now()}`;
    const s = (input.appointmentDateYmd || '').trim();
    let consultDate = new Date();
    if (s) {
      const d = new Date(s);
      if (!isNaN(d.getTime())) consultDate = d;
      else {
        const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
        if (m) consultDate = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
      }
    }
    const header = `Turno ${input.appointmentDateYmd} ${input.appointmentTime} · ${input.serviceLabel} · ref. ${input.appointmentId}`;
    const notesBlock = [notesTrim, header].filter(Boolean).join('\n\n');
    const newConsultation: MedicalConsultation = {
      id: consId,
      patientId: input.patientId,
      professionalId: input.professionalId,
      professionalName: input.professionalName,
      date: consultDate,
      type: 'follow_up',
      symptoms: '',
      diagnosis: '',
      treatment: treatTrim || '—',
      notes: notesBlock || header,
      status: 'completed',
      createdAt: now,
      updatedAt: now,
    };
    setConsultations((prev) => [...prev, newConsultation]);
    if (treatTrim) {
      const tid = `treat_${Date.now() + 1}`;
      const newTreatment: Treatment = {
        id: tid,
        patientId: input.patientId,
        professionalId: input.professionalId,
        professionalName: input.professionalName,
        consultationId: consId,
        name: `Sesión · ${input.serviceLabel}`,
        description: treatTrim,
        startDate: consultDate,
        status: 'active',
        progress: 0,
        notes: [header],
        milestones: [],
        createdAt: now,
        updatedAt: now,
      };
      setTreatments((prev) => [...prev, newTreatment]);
    }
  }, []);

  // Funciones de consulta con control de acceso
  const getConsultationsByPatient = useCallback((patientId: string, filters?: MedicalHistoryFilters): MedicalConsultation[] => {
    if (user?.userType === 'professional') {
      const proId = String(user?.id ?? user?._id ?? '').trim();
      if (!professionalCanAccessPatientRecords(patientId)) {
        console.warn('❌ Acceso denegado: Profesional no autorizado para ver consultas del paciente');
        return [];
      }
      logAccess(proId, patientId, 'view_consultation', 'multiple', 'consultation', true, 'Consulta de historial médico');
    }

    let filtered = consultations.filter((cons) => samePatientId(cons.patientId, patientId));
    
    if (filters) {
      if (filters.dateFrom) {
        filtered = filtered.filter(cons => cons.date >= filters.dateFrom!);
      }
      if (filters.dateTo) {
        filtered = filtered.filter(cons => cons.date <= filters.dateTo!);
      }
      if (filters.type) {
        filtered = filtered.filter(cons => cons.type === filters.type);
      }
      if (filters.professionalId) {
        filtered = filtered.filter(cons => cons.professionalId === filters.professionalId);
      }
      if (filters.status) {
        filtered = filtered.filter(cons => cons.status === filters.status);
      }
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        filtered = filtered.filter(cons => 
          cons.symptoms.toLowerCase().includes(query) ||
          cons.diagnosis.toLowerCase().includes(query) ||
          cons.treatment.toLowerCase().includes(query) ||
          cons.notes.toLowerCase().includes(query)
        );
      }
    }
    
    return filtered.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [consultations, user, logAccess, professionalCanAccessPatientRecords]);

  const getDocumentsByPatient = useCallback((patientId: string, filters?: MedicalHistoryFilters): MedicalDocument[] => {
    // Verificar acceso del usuario actual
    const viewerId = String(user?.id ?? user?._id ?? '').trim();
    if (user?.userType === 'professional') {
      const hasAccess = checkAccess(viewerId, patientId, 'document');
      if (!hasAccess) {
        console.warn('❌ Acceso denegado: Profesional no autorizado para ver documentos del paciente');
        return [];
      }
      
      // Registrar acceso autorizado
      logAccess(viewerId, patientId, 'view_document', 'multiple', 'document', true, 'Consulta de documentos médicos');
    }
    
    let filtered = documents.filter((doc) => samePatientId(doc.patientId, patientId));
    
    if (filters) {
      if (filters.dateFrom) {
        filtered = filtered.filter(doc => doc.uploadDate >= filters.dateFrom!);
      }
      if (filters.dateTo) {
        filtered = filtered.filter(doc => doc.uploadDate <= filters.dateTo!);
      }
      if (filters.type) {
        filtered = filtered.filter(doc => doc.type === filters.type);
      }
      if (filters.professionalId) {
        filtered = filtered.filter(doc => doc.professionalId === filters.professionalId);
      }
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        filtered = filtered.filter(doc => 
          doc.title.toLowerCase().includes(query) ||
          doc.description.toLowerCase().includes(query)
        );
      }
    }
    
    return filtered.sort((a, b) => b.uploadDate.getTime() - a.uploadDate.getTime());
  }, [documents, user, checkAccess, logAccess]);

  const getPrescriptionsByPatient = useCallback((patientId: string, filters?: MedicalHistoryFilters): Prescription[] => {
    // Verificar acceso del usuario actual
    const viewerIdPres = String(user?.id ?? user?._id ?? '').trim();
    if (user?.userType === 'professional') {
      const hasAccess = checkAccess(viewerIdPres, patientId, 'prescription');
      if (!hasAccess) {
        console.warn('❌ Acceso denegado: Profesional no autorizado para ver prescripciones del paciente');
        return [];
      }
      
      // Registrar acceso autorizado
      logAccess(viewerIdPres, patientId, 'view_prescription', 'multiple', 'prescription', true, 'Consulta de prescripciones médicas');
    }
    
    let filtered = prescriptions.filter((pres) => samePatientId(pres.patientId, patientId));
    
    if (filters) {
      if (filters.dateFrom) {
        filtered = filtered.filter(pres => pres.date >= filters.dateFrom!);
      }
      if (filters.dateTo) {
        filtered = filtered.filter(pres => pres.date <= filters.dateTo!);
      }
      if (filters.professionalId) {
        filtered = filtered.filter(pres => pres.professionalId === filters.professionalId);
      }
      if (filters.status) {
        filtered = filtered.filter(pres => pres.status === filters.status);
      }
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        filtered = filtered.filter(pres => 
          pres.medications.some(med => med.name.toLowerCase().includes(query)) ||
          pres.instructions.toLowerCase().includes(query)
        );
      }
    }
    
    return filtered.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [prescriptions, user, checkAccess, logAccess]);

  const getTreatmentsByPatient = useCallback((patientId: string, filters?: MedicalHistoryFilters): Treatment[] => {
    if (user?.userType === 'professional') {
      const proId = String(user?.id ?? user?._id ?? '').trim();
      if (!professionalCanAccessPatientRecords(patientId)) {
        console.warn('❌ Acceso denegado: Profesional no autorizado para ver tratamientos del paciente');
        return [];
      }
      logAccess(proId, patientId, 'view_treatment', 'multiple', 'treatment', true, 'Consulta de tratamientos médicos');
    }

    let filtered = treatments.filter((treat) => samePatientId(treat.patientId, patientId));
    
    if (filters) {
      if (filters.dateFrom) {
        filtered = filtered.filter(treat => treat.startDate >= filters.dateFrom!);
        }
      if (filters.dateTo) {
        filtered = filtered.filter(treat => treat.startDate <= filters.dateTo!);
      }
      if (filters.professionalId) {
        filtered = filtered.filter(treat => treat.professionalId === filters.professionalId);
      }
      if (filters.status) {
        filtered = filtered.filter(treat => treat.status === filters.status);
      }
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        filtered = filtered.filter(treat => 
          treat.name.toLowerCase().includes(query) ||
          treat.description.toLowerCase().includes(query) ||
          treat.notes.some(note => note.toLowerCase().includes(query))
        );
      }
    }
    
    return filtered.sort((a, b) => b.startDate.getTime() - a.startDate.getTime());
  }, [treatments, user, logAccess, professionalCanAccessPatientRecords]);

  // Estadísticas del paciente con control de acceso
  const getPatientStats = useCallback((patientId: string) => {
    if (user?.userType === 'professional') {
      const proId = String(user?.id ?? user?._id ?? '').trim();
      if (!professionalCanAccessPatientRecords(patientId)) {
        console.warn('❌ Acceso denegado: Profesional no autorizado para ver estadísticas del paciente');
        return {
          totalConsultations: 0,
          activeTreatments: 0,
          activePrescriptions: 0,
          totalDocuments: 0,
          lastVisit: null
        };
      }
      logAccess(proId, patientId, 'view_summary', 'stats', 'summary', true, 'Consulta de estadísticas médicas');
    }
    
    const patientConsultations = consultations.filter((cons) =>
      samePatientId(cons.patientId, patientId)
    );
    const patientDocuments = documents.filter((doc) => samePatientId(doc.patientId, patientId));
    const patientPrescriptions = prescriptions.filter((pres) =>
      samePatientId(pres.patientId, patientId)
    );
    const patientTreatments = treatments.filter((treat) =>
      samePatientId(treat.patientId, patientId)
    );

    return {
      totalConsultations: patientConsultations.length,
      activeTreatments: patientTreatments.filter(t => t.status === 'active').length,
      activePrescriptions: patientPrescriptions.filter(p => p.status === 'active').length,
      totalDocuments: patientDocuments.length,
      lastVisit: patientConsultations.length > 0 
        ? new Date(Math.max(...patientConsultations.map(c => c.date.getTime())))
        : null
    };
  }, [consultations, documents, prescriptions, treatments, user, logAccess, professionalCanAccessPatientRecords]);

  // Búsqueda en historial médico con control de acceso
  const searchMedicalHistory = useCallback((patientId: string, query: string) => {
    if (user?.userType === 'professional') {
      const proId = String(user?.id ?? user?._id ?? '').trim();
      if (!professionalCanAccessPatientRecords(patientId)) {
        console.warn('❌ Acceso denegado: Profesional no autorizado para buscar en historial del paciente');
        return {
          consultations: [],
          documents: [],
          prescriptions: [],
          treatments: []
        };
      }
      logAccess(proId, patientId, 'view_summary', 'search', 'summary', true, 'Búsqueda en historial médico');
    }
    
    const searchTerm = query.toLowerCase();
    
    const matchingConsultations = consultations.filter(
      (cons) =>
        samePatientId(cons.patientId, patientId) &&
        (cons.symptoms.toLowerCase().includes(searchTerm) ||
          cons.diagnosis.toLowerCase().includes(searchTerm) ||
          cons.treatment.toLowerCase().includes(searchTerm) ||
          cons.notes.toLowerCase().includes(searchTerm))
    );

    const matchingDocuments = documents.filter(
      (doc) =>
        samePatientId(doc.patientId, patientId) &&
        (doc.title.toLowerCase().includes(searchTerm) ||
          doc.description.toLowerCase().includes(searchTerm))
    );

    const matchingPrescriptions = prescriptions.filter(
      (pres) =>
        samePatientId(pres.patientId, patientId) &&
        (pres.medications.some((med) => med.name.toLowerCase().includes(searchTerm)) ||
          pres.instructions.toLowerCase().includes(searchTerm))
    );

    const matchingTreatments = treatments.filter(
      (treat) =>
        samePatientId(treat.patientId, patientId) &&
        (treat.name.toLowerCase().includes(searchTerm) ||
          treat.description.toLowerCase().includes(searchTerm) ||
          treat.notes.some((note) => note.toLowerCase().includes(searchTerm)))
    );

    return {
      consultations: matchingConsultations,
      documents: matchingDocuments,
      prescriptions: matchingPrescriptions,
      treatments: matchingTreatments
    };
  }, [consultations, documents, prescriptions, treatments, user, logAccess, professionalCanAccessPatientRecords]);

  const value: MedicalHistoryContextType = {
    // Estado
    consultations,
    documents,
    prescriptions,
    treatments,
    isLoading,
    
    // Acciones para consultas
    createConsultation,
    updateConsultation,
    deleteConsultation,
    
    // Acciones para documentos
    uploadDocument,
    updateDocument,
    deleteDocument,
    
    // Acciones para prescripciones
    createPrescription,
    updatePrescription,
    discontinuePrescription,
    
    // Acciones para tratamientos
    startTreatment,
    updateTreatment,
    completeTreatment,
    addTreatmentMilestone,
    updateMilestone,
    recordProfessionalSession,
    loadPatientHistory,

    // Consultas
    getConsultationsByPatient,
    getDocumentsByPatient,
    getPrescriptionsByPatient,
    getTreatmentsByPatient,
    
    // Estadísticas
    getPatientStats,
    
    // Utilidades
    searchMedicalHistory
  };

  return (
    <MedicalHistoryContext.Provider value={value}>
      {children}
    </MedicalHistoryContext.Provider>
  );
};
