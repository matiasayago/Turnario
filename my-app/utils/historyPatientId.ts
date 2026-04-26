import type { Appointment } from '../contexts/AppointmentContext';

/**
 * Clave estable del paciente alineada con `patientsFromCitas` en stats:
 * clientId Mongo → email → nombre normalizado.
 */
export function historyPatientIdFromAppointment(apt: Appointment): string | null {
  const name = (apt.clientName || apt.patientName || 'Cliente').trim();
  const email = (apt.patientEmail || '').trim();
  let key = String(apt.clientId || '').trim();
  if (!key) {
    const em = email.toLowerCase();
    if (em) key = `__e:${em}`;
    else {
      const nm = name.toLowerCase();
      if (nm && nm !== 'cliente') key = `__n:${nm}`;
    }
  }
  return key || null;
}
