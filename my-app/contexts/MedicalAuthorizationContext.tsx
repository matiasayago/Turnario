import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { useAppointments } from './AppointmentContext';
import { useNotifications } from './NotificationContext';
import { simpleAuthService } from '../services/simpleAuthService';
import {
  medicalAuthorizationService,
  type MedicalAuthorizationDto,
} from '../services/medicalAuthorizationService';

type MedicalAccessOutcome = 'granted_auth' | 'granted_relationship' | 'denied';

/** Solo lectura: sin logs ni notificaciones (seguro de usar durante render). */
function getMedicalAccessOutcome(
  authorizations: MedicalAuthorization[],
  relationships: PatientProfessionalRelationship[],
  professionalId: string,
  patientId: string,
  resourceType: string
): MedicalAccessOutcome {
  const pid = String(professionalId);
  const patId = String(patientId);

  const activeAuth = authorizations.find(
    (auth) =>
      String(auth.professionalId) === pid &&
      String(auth.patientId) === patId &&
      auth.status === 'granted' &&
      auth.isActive &&
      (auth.scope.consultations || auth.scope.documents) &&
      (!auth.expiresAt || auth.expiresAt > new Date())
  );
  if (activeAuth) return 'granted_auth';

  const activeRelationship = relationships.find(
    (rel) =>
      String(rel.professionalId) === pid &&
      String(rel.patientId) === patId &&
      rel.isActive &&
      rel.lastConsultationDate &&
      Date.now() - rel.lastConsultationDate.getTime() < 7 * 24 * 60 * 60 * 1000
  );
  if (activeRelationship && resourceType === 'consultation') return 'granted_relationship';

  return 'denied';
}

function mapDtoToAuthorization(d: MedicalAuthorizationDto): MedicalAuthorization {
  const scope = d.scope ?? {
    consultations: true,
    documents: false,
    prescriptions: false,
    treatments: false,
    labResults: false,
    imaging: false,
  };
  return {
    id: d._id,
    patientId: d.patientId,
    professionalId: d.professionalId,
    professionalName: d.professionalName || '',
    patientName: d.patientName || undefined,
    authorizationType: d.authorizationType as MedicalAuthorization['authorizationType'],
    status: d.status as MedicalAuthorization['status'],
    grantedAt: d.grantedAt ? new Date(d.grantedAt) : undefined,
    revokedAt: d.revokedAt ? new Date(d.revokedAt) : undefined,
    expiresAt: d.expiresAt ? new Date(d.expiresAt) : undefined,
    isActive: !!(d.isActive ?? d.status === 'granted'),
    grantedBy: (d.grantedBy as MedicalAuthorization['grantedBy']) || 'patient',
    scope,
    notes: d.notes,
    createdAt: d.createdAt ? new Date(d.createdAt) : new Date(),
    updatedAt: d.updatedAt ? new Date(d.updatedAt) : new Date(),
  };
}

// Tipos para el sistema de autorizaciones médicas
export interface MedicalAuthorization {
  id: string;
  patientId: string;
  professionalId: string;
  professionalName: string;
  patientName?: string;
  authorizationType: 'full_access' | 'limited_access' | 'consultation_only';
  status: 'pending' | 'granted' | 'revoked';
  grantedAt?: Date;
  revokedAt?: Date;
  expiresAt?: Date;
  isActive: boolean;
  grantedBy: 'patient' | 'system' | 'admin';
  scope: {
    consultations: boolean;
    documents: boolean;
    prescriptions: boolean;
    treatments: boolean;
    labResults: boolean;
    imaging: boolean;
  };
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PatientProfessionalRelationship {
  id: string;
  patientId: string;
  professionalId: string;
  /** Nombre legible desde citas (clientName / patientName). */
  patientName?: string;
  relationshipType: 'current_patient' | 'former_patient' | 'consultation_only';
  firstConsultationDate: Date;
  lastConsultationDate: Date;
  totalConsultations: number;
  isActive: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MedicalAccessLog {
  id: string;
  professionalId: string;
  patientId: string;
  accessType: 'view_consultation' | 'view_document' | 'view_prescription' | 'view_treatment' | 'view_summary' | 'request_authorization' | 'grant_authorization' | 'revoke_authorization' | 'access_granted' | 'access_relationship' | 'access_denied';
  recordId: string;
  recordType: string;
  accessDate: Date;
  ipAddress?: string;
  userAgent?: string;
  isAuthorized: boolean;
  reason?: string;
  createdAt: Date;
}

export interface MedicalAuthorizationFilters {
  patientId?: string;
  professionalId?: string;
  authorizationType?: string;
  isActive?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
}

export type RequestAuthorizationResult =
  | { success: true }
  | { success: false; message: string };

interface MedicalAuthorizationContextType {
  // Estado
  authorizations: MedicalAuthorization[];
  relationships: PatientProfessionalRelationship[];
  accessLogs: MedicalAccessLog[];
  isLoading: boolean;
  error: string | null;

  // Funciones de autorización
  checkAccess: (professionalId: string, patientId: string, resourceType: string) => boolean;
  requestAuthorization: (
    patientId: string,
    type: 'full_access' | 'limited_access' | 'consultation_only',
    scope: MedicalAuthorization['scope'],
    notes?: string
  ) => Promise<RequestAuthorizationResult>;
  grantAuthorization: (authorizationId: string, validDays?: number) => Promise<boolean>;
  rejectAuthorization: (authorizationId: string, reason?: string) => Promise<boolean>;
  revokeAuthorization: (authorizationId: string, reason?: string) => Promise<boolean>;
  cancelPendingAuthorization: (authorizationId: string) => Promise<boolean>;
  
  // Funciones de relaciones
  getPatientRelationships: (professionalId: string) => PatientProfessionalRelationship[];
  getProfessionalRelationships: (patientId: string) => PatientProfessionalRelationship[];
  updateRelationship: (patientId: string, professionalId: string, relationshipType: string) => Promise<boolean>;
  
  // Funciones de auditoría
  logAccess: (professionalId: string, patientId: string, accessType: string, recordId: string, recordType: string, isAuthorized: boolean, reason?: string) => Promise<void>;
  getAccessLogs: (filters?: MedicalAuthorizationFilters) => MedicalAccessLog[];
  
  // Funciones de utilidad
  canAccessMedicalHistory: (professionalId: string, patientId: string) => boolean;
  getAuthorizedProfessionals: (patientId: string) => string[];
  getAuthorizedPatients: (professionalId: string) => string[];
  refreshAuthorizations: () => Promise<void>;
}

const MedicalAuthorizationContext = createContext<MedicalAuthorizationContextType | undefined>(undefined);

export const useMedicalAuthorization = () => {
  const context = useContext(MedicalAuthorizationContext);
  if (context === undefined) {
    throw new Error('useMedicalAuthorization must be used within a MedicalAuthorizationProvider');
  }
  return context;
};

export const MedicalAuthorizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { addNotification } = useNotifications();
  const [authorizations, setAuthorizations] = useState<MedicalAuthorization[]>([]);
  const [relationships, setRelationships] = useState<PatientProfessionalRelationship[]>([]);
  const [accessLogs, setAccessLogs] = useState<MedicalAccessLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { user } = useAuth();
  
  // Usar useAppointments de forma segura
  let appointments: any[] = [];
  try {
    const appointmentsContext = useAppointments();
    appointments = appointmentsContext.appointments || [];
  } catch (error) {
    console.warn('AppointmentContext no disponible, usando array vacío:', error);
    appointments = [];
  }

  // Inicializar datos desde API
  const initializeData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const token = await simpleAuthService.getToken();
      if (!token) {
        setAuthorizations([]);
        return;
      }
      const list = await medicalAuthorizationService.list(token);
      setAuthorizations(list.map(mapDtoToAuthorization));
    } catch (err) {
      console.error('Error inicializando autorizaciones médicas:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar autorizaciones médicas');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      initializeData();
    } else {
      setAuthorizations([]);
      setError(null);
    }
  }, [user, initializeData]);

  const updateRelationshipsFromAppointments = useCallback(() => {
    if (!appointments.length) return;

    const newRelationships: PatientProfessionalRelationship[] = [];
    const relationshipMap = new Map<string, PatientProfessionalRelationship>();

    const pickNameFromAppointment = (a: (typeof appointments)[0]): string => {
      const cn = typeof a.clientName === 'string' ? a.clientName.trim() : '';
      const pn = typeof a.patientName === 'string' ? a.patientName.trim() : '';
      return pn || cn || '';
    };

    const mergePatientName = (current: string | undefined, incoming: string): string | undefined => {
      const inc = incoming.trim();
      if (!inc) return current;
      const cur = (current || '').trim();
      if (!cur) return inc;
      if (inc.length > cur.length && inc !== 'Cliente') return inc;
      if (cur === 'Cliente' && inc !== 'Cliente') return inc;
      return cur;
    };

    appointments.forEach((appointment) => {
      const patientId = appointment.clientId ?? (appointment as { patientId?: string }).patientId;
      const profId = appointment.professionalId;
      if (patientId == null || patientId === '' || profId == null || profId === '') {
        return;
      }
      const key = `${profId}-${patientId}`;
      const apptName = pickNameFromAppointment(appointment);

      if (!relationshipMap.has(key)) {
        const newRelationship: PatientProfessionalRelationship = {
          id: `rel_${Date.now()}_${key}`,
          patientId: String(patientId),
          professionalId: String(profId),
          patientName: apptName || undefined,
          relationshipType: 'consultation_only',
          firstConsultationDate: new Date(appointment.createdAt),
          lastConsultationDate: new Date(appointment.createdAt),
          totalConsultations: 1,
          isActive: appointment.status === 'completed' || appointment.status === 'confirmed',
          createdAt: new Date(appointment.createdAt),
          updatedAt: new Date(appointment.createdAt),
        };

        relationshipMap.set(key, newRelationship);
        newRelationships.push(newRelationship);
      } else {
        const existing = relationshipMap.get(key)!;
        existing.totalConsultations++;
        existing.lastConsultationDate = new Date(appointment.createdAt);
        existing.isActive = appointment.status === 'completed' || appointment.status === 'confirmed';
        existing.updatedAt = new Date(appointment.createdAt);
        existing.patientName = mergePatientName(existing.patientName, apptName);

        if (existing.totalConsultations > 1) {
          existing.relationshipType = 'current_patient';
        }
      }
    });

    setRelationships(prev => {
      const updated = [...prev];
      newRelationships.forEach((newRel) => {
        const existingIndex = updated.findIndex(
          (r) =>
            String(r.patientId) === String(newRel.patientId) &&
            String(r.professionalId) === String(newRel.professionalId)
        );

        if (existingIndex >= 0) {
          const prevRow = updated[existingIndex];
          updated[existingIndex] = {
            ...prevRow,
            ...newRel,
            patientName: mergePatientName(prevRow.patientName, newRel.patientName || ''),
          };
        } else {
          updated.push(newRel);
        }
      });
      
      return updated;
    });
  }, [appointments]);

  useEffect(() => {
    if (appointments.length > 0) {
      updateRelationshipsFromAppointments();
    }
  }, [appointments, updateRelationshipsFromAppointments]);

  // Función para enviar notificaciones automáticas
  const sendAuthorizationNotification = useCallback((
    type: 'request' | 'granted' | 'revoked' | 'access_attempt' | 'access_denied',
    professionalId: string,
    patientId: string,
    details: string
  ) => {
    try {
      let title = '';
      let message = '';
      let notificationType: 'appointment_request' | 'appointment_confirmed' | 'appointment_cancelled' | 'reminder' | 'payment_required' | 'payment_successful' = 'reminder';

      switch (type) {
        case 'request':
          title = 'Nueva Solicitud de Autorización Médica';
          message = `Se ha solicitado acceso a tu historial médico. ${details}`;
          break;
        case 'granted':
          title = 'Autorización Médica Aprobada';
          message = `Tu solicitud de acceso médico ha sido aprobada. ${details}`;
          break;
        case 'revoked':
          title = 'Autorización Médica Revocada';
          message = `Tu acceso médico ha sido revocado. ${details}`;
          break;
        case 'access_attempt':
          title = 'Acceso a Historial Médico';
          message = `Un profesional ha accedido a tu historial médico. ${details}`;
          break;
        case 'access_denied':
          title = 'Acceso Médico Denegado';
          message = `Se ha denegado el acceso a historial médico. ${details}`;
          break;
      }

      // Enviar notificación al paciente
      addNotification({
        type: notificationType,
        title,
        message,
        recipientId: patientId,
        senderId: professionalId,
        senderName: 'Sistema de Autorizaciones'
      });

      // Enviar notificación al profesional
      addNotification({
        type: notificationType,
        title,
        message,
        recipientId: professionalId,
        senderId: patientId,
        senderName: 'Sistema de Autorizaciones'
      });

      console.log(`✅ Notificación de autorización enviada: ${type}`);
    } catch (error) {
      console.error('❌ Error al enviar notificación de autorización:', error);
    }
  }, [addNotification]);

  const requestAuthorization = useCallback(
    async (
      patientId: string,
      type: 'full_access' | 'limited_access' | 'consultation_only',
      scope: MedicalAuthorization['scope'],
      notes?: string
    ): Promise<RequestAuthorizationResult> => {
      if (!user || user.userType !== 'professional') {
        const message = 'Solo el profesional puede solicitar autorización';
        setError(message);
        return { success: false, message };
      }
      const professionalId = String((user as { _id?: string })._id ?? user.id ?? '');
      try {
        setIsLoading(true);
        setError(null);
        const token = await simpleAuthService.getToken();
        if (!token) {
          const message = 'Sesión no válida';
          setError(message);
          return { success: false, message };
        }
        await medicalAuthorizationService.createRequest(token, {
          patientId,
          authorizationType: type,
          scope,
          notes,
        });
        await initializeData();
        sendAuthorizationNotification('request', professionalId, patientId, `Tipo: ${type}`);
        return { success: true };
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error al solicitar autorización';
        setError(msg);
        console.error('❌ Error al solicitar autorización:', err);
        return { success: false, message: msg };
      } finally {
        setIsLoading(false);
      }
    },
    [user, initializeData, sendAuthorizationNotification]
  );

  const grantAuthorization = useCallback(
    async (authorizationId: string, validDays?: number): Promise<boolean> => {
      if (!user || user.userType !== 'client') {
        setError('Solo el paciente puede aprobar la solicitud');
        return false;
      }
      try {
        setIsLoading(true);
        setError(null);
        const token = await simpleAuthService.getToken();
        if (!token) {
          setError('Sesión no válida');
          return false;
        }
        const dto = await medicalAuthorizationService.grant(token, authorizationId, validDays);
        const authorization = mapDtoToAuthorization(dto);
        await initializeData();
        sendAuthorizationNotification(
          'granted',
          authorization.professionalId,
          authorization.patientId,
          `Acceso ${authorization.authorizationType} aprobado`
        );
        return true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error al otorgar autorización';
        setError(msg);
        console.error('❌ Error al otorgar autorización:', err);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [user, initializeData, sendAuthorizationNotification]
  );

  const rejectAuthorization = useCallback(
    async (authorizationId: string, reason?: string): Promise<boolean> => {
      if (!user || user.userType !== 'client') {
        setError('Solo el paciente puede rechazar la solicitud');
        return false;
      }
      try {
        setIsLoading(true);
        setError(null);
        const token = await simpleAuthService.getToken();
        if (!token) {
          setError('Sesión no válida');
          return false;
        }
        const dto = await medicalAuthorizationService.reject(token, authorizationId, reason);
        const authorization = mapDtoToAuthorization(dto);
        await initializeData();
        sendAuthorizationNotification(
          'revoked',
          authorization.professionalId,
          authorization.patientId,
          'Solicitud rechazada por el paciente'
        );
        return true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error al rechazar solicitud';
        setError(msg);
        console.error('❌ Error al rechazar:', err);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [user, initializeData, sendAuthorizationNotification]
  );

  const cancelPendingAuthorization = useCallback(
    async (authorizationId: string): Promise<boolean> => {
      if (!user || user.userType !== 'professional') {
        setError('Solo el profesional puede cancelar su solicitud');
        return false;
      }
      try {
        setIsLoading(true);
        setError(null);
        const token = await simpleAuthService.getToken();
        if (!token) {
          setError('Sesión no válida');
          return false;
        }
        const row = authorizations.find((a) => a.id === authorizationId);
        await medicalAuthorizationService.cancelPending(token, authorizationId);
        await initializeData();
        if (row) {
          sendAuthorizationNotification(
            'revoked',
            row.professionalId,
            row.patientId,
            'El profesional canceló la solicitud pendiente'
          );
        }
        return true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error al cancelar solicitud';
        setError(msg);
        console.error('❌ Error al cancelar solicitud:', err);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [user, authorizations, initializeData, sendAuthorizationNotification]
  );

  const revokeAuthorization = useCallback(
    async (authorizationId: string, reason?: string): Promise<boolean> => {
      try {
        setIsLoading(true);
        setError(null);
        const authorization = authorizations.find((auth) => auth.id === authorizationId);
        if (!authorization) {
          setError('Autorización no encontrada');
          return false;
        }
        if (authorization.status !== 'granted' || !authorization.isActive) {
          setError('No hay autorización activa para revocar');
          return false;
        }
        const token = await simpleAuthService.getToken();
        if (!token) {
          setError('Sesión no válida');
          return false;
        }
        await medicalAuthorizationService.revoke(token, authorizationId, reason);
        await initializeData();

        setRelationships((prev) =>
          prev.map((rel) =>
            rel.professionalId === authorization.professionalId &&
            rel.patientId === authorization.patientId
              ? {
                  ...rel,
                  isActive: false,
                  notes: `Autorización revocada: ${reason || 'Sin motivo especificado'}`,
                }
              : rel
          )
        );

        sendAuthorizationNotification(
          'revoked',
          authorization.professionalId,
          authorization.patientId,
          `Acceso ${authorization.authorizationType} revocado. Motivo: ${reason || 'Sin motivo especificado'}`
        );
        return true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error al revocar autorización';
        setError(msg);
        console.error('❌ Error al revocar autorización:', err);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [authorizations, initializeData, sendAuthorizationNotification]
  );

  // Registrar acceso
  const logAccess = useCallback(async (professionalId: string, patientId: string, accessType: string, recordId: string, recordType: string, isAuthorized: boolean, reason?: string): Promise<void> => {
    try {
      const accessLog: MedicalAccessLog = {
        id: `log_${Date.now()}`,
        professionalId,
        patientId,
        accessType: accessType as any,
        recordId,
        recordType,
        accessDate: new Date(),
        isAuthorized,
        reason,
        createdAt: new Date(),
      };

      setAccessLogs(prev => [accessLog, ...prev]);
      
      console.log('✅ Acceso registrado:', { accessType, recordType, isAuthorized });
    } catch (error) {
      console.error('Error registrando acceso:', error);
    }
  }, []);

  const checkAccess = useCallback((professionalId: string, patientId: string, resourceType: string): boolean => {
    try {
      const outcome = getMedicalAccessOutcome(
        authorizations,
        relationships,
        professionalId,
        patientId,
        resourceType
      );

      if (outcome === 'granted_auth') {
        logAccess(professionalId, patientId, 'access_granted', 'single', resourceType, true, 'Acceso autorizado');
        if (resourceType === 'consultation' || resourceType === 'document') {
          sendAuthorizationNotification(
            'access_attempt',
            professionalId,
            patientId,
            `Acceso a ${resourceType} del historial médico`
          );
        }
        return true;
      }

      if (outcome === 'granted_relationship') {
        logAccess(professionalId, patientId, 'access_relationship', 'single', resourceType, true, 'Acceso por relación activa');
        return true;
      }

      logAccess(professionalId, patientId, 'access_denied', 'single', resourceType, false, 'Sin autorización activa');
      sendAuthorizationNotification(
        'access_denied',
        professionalId,
        patientId,
        `Intento de acceso a ${resourceType} denegado por falta de autorización`
      );
      return false;
    } catch (error) {
      console.error('❌ Error al verificar acceso:', error);
      return false;
    }
  }, [authorizations, relationships, logAccess, sendAuthorizationNotification]);

  const getPatientRelationships = useCallback((professionalId: string): PatientProfessionalRelationship[] => {
    const pid = String(professionalId);
    return relationships.filter((rel) => String(rel.professionalId) === pid);
  }, [relationships]);

  const getProfessionalRelationships = useCallback((patientId: string): PatientProfessionalRelationship[] => {
    const patId = String(patientId);
    return relationships.filter((rel) => String(rel.patientId) === patId);
  }, [relationships]);

  // Actualizar relación
  const updateRelationship = useCallback(async (patientId: string, professionalId: string, relationshipType: string): Promise<boolean> => {
    try {
      setRelationships(prev => 
        prev.map(rel => 
          rel.patientId === patientId && rel.professionalId === professionalId
            ? { ...rel, relationshipType: relationshipType as any, updatedAt: new Date() }
            : rel
        )
      );

      console.log('✅ Relación actualizada:', { patientId, professionalId, relationshipType });
      return true;
    } catch (error) {
      console.error('Error actualizando relación:', error);
      return false;
    }
  }, []);

  // Obtener logs de acceso
  const getAccessLogs = useCallback((filters?: MedicalAuthorizationFilters): MedicalAccessLog[] => {
    let filteredLogs = [...accessLogs];

    if (filters?.professionalId) {
      filteredLogs = filteredLogs.filter(log => log.professionalId === filters.professionalId);
    }

    if (filters?.patientId) {
      filteredLogs = filteredLogs.filter(log => log.patientId === filters.patientId);
    }

    if (filters?.dateFrom) {
      filteredLogs = filteredLogs.filter(log => log.accessDate >= filters.dateFrom!);
    }

    if (filters?.dateTo) {
      filteredLogs = filteredLogs.filter(log => log.accessDate <= filters.dateTo!);
    }

    return filteredLogs;
  }, [accessLogs]);

  // Verificar si puede acceder al historial médico
  const canAccessMedicalHistory = useCallback((professionalId: string, patientId: string): boolean => {
    return (
      getMedicalAccessOutcome(authorizations, relationships, professionalId, patientId, 'consultation') !==
      'denied'
    );
  }, [authorizations, relationships]);

  // Obtener profesionales autorizados para un paciente
  const authIsActiveGrant = useCallback((auth: MedicalAuthorization): boolean => {
    if (auth.status !== 'granted' || !auth.isActive) return false;
    if (auth.expiresAt && auth.expiresAt <= new Date()) return false;
    return true;
  }, []);

  const getAuthorizedProfessionals = useCallback(
    (patientId: string): string[] => {
      return authorizations
        .filter((auth) => auth.patientId === patientId && authIsActiveGrant(auth))
        .map((auth) => auth.professionalId);
    },
    [authorizations, authIsActiveGrant]
  );

  const getAuthorizedPatients = useCallback(
    (professionalId: string): string[] => {
      return authorizations
        .filter((auth) => auth.professionalId === professionalId && authIsActiveGrant(auth))
        .map((auth) => auth.patientId);
    },
    [authorizations, authIsActiveGrant]
  );

  // Refrescar autorizaciones
  const refreshAuthorizations = useCallback(async () => {
    await initializeData();
  }, [initializeData]);

  const contextValue: MedicalAuthorizationContextType = useMemo(() => ({
    // Estado
    authorizations,
    relationships,
    accessLogs,
    isLoading,
    error,

    // Funciones de autorización
    checkAccess,
    requestAuthorization,
    grantAuthorization,
    rejectAuthorization,
    revokeAuthorization,
    cancelPendingAuthorization,
    
    // Funciones de relaciones
    getPatientRelationships,
    getProfessionalRelationships,
    updateRelationship,
    
    // Funciones de auditoría
    logAccess,
    getAccessLogs,
    
    // Funciones de utilidad
    canAccessMedicalHistory,
    getAuthorizedProfessionals,
    getAuthorizedPatients,
    refreshAuthorizations,
  }), [
    authorizations,
    relationships,
    accessLogs,
    isLoading,
    error,
    checkAccess,
    requestAuthorization,
    grantAuthorization,
    rejectAuthorization,
    revokeAuthorization,
    cancelPendingAuthorization,
    getPatientRelationships,
    getProfessionalRelationships,
    updateRelationship,
    logAccess,
    getAccessLogs,
    canAccessMedicalHistory,
    getAuthorizedProfessionals,
    getAuthorizedPatients,
    refreshAuthorizations,
  ]);

  return (
    <MedicalAuthorizationContext.Provider value={contextValue}>
      {children}
    </MedicalAuthorizationContext.Provider>
  );
};
