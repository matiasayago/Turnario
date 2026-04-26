import { getBackendBaseUrl } from '../config/backend';
import simpleAuthService from './simpleAuthService';

export type PickedPatientRow = {
  rowKey: string;
  clientId: string | null;
  name: string;
  email: string;
  phone: string;
  lastVisit?: string;
  source: 'my_patients' | 'app_user';
};

function isMongoId(s: string): boolean {
  return /^[a-fA-F0-9]{24}$/.test(String(s).trim());
}

export async function fetchMyPatientsFromAppointments(professionalId: string): Promise<PickedPatientRow[]> {
  const token = await simpleAuthService.getToken();
  if (!token || !isMongoId(professionalId)) return [];
  const url = `${getBackendBaseUrl()}/api/v1/appointments/expo/professional/${professionalId}/patients`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    try {
      const errText = await res.text();
      console.warn('[Mis pacientes]', res.status, url, errText.slice(0, 200));
    } catch {
      console.warn('[Mis pacientes]', res.status, url);
    }
    return [];
  }
  const json = await res.json();
  if (!json.success || !Array.isArray(json.data)) {
    console.warn('[Mis pacientes] respuesta inesperada:', json);
    return [];
  }
  return json.data.map(
    (row: {
      rowKey?: string;
      clientId?: string | null;
      name?: string;
      email?: string;
      phone?: string;
      lastVisit?: string;
    }) => ({
      rowKey: String(row.rowKey || row.clientId || row.email || Math.random()),
      clientId: row.clientId ? String(row.clientId) : null,
      name: row.name || 'Paciente',
      email: row.email || '',
      phone: row.phone || '',
      lastVisit: row.lastVisit,
      source: 'my_patients' as const,
    })
  );
}

export async function searchRegisteredClients(q: string): Promise<PickedPatientRow[]> {
  const token = await simpleAuthService.getToken();
  const term = q.trim();
  if (!token || term.length < 2) return [];
  const params = new URLSearchParams({ role: 'client', search: term, limit: '40' });
  const res = await fetch(`${getBackendBaseUrl()}/api/users?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  const json = await res.json();
  if (!json.success || !Array.isArray(json.data)) return [];
  return json.data.map((u: { _id?: string; fullName?: string; email?: string; phone?: string }) => {
    const id = String(u._id || '');
    return {
      rowKey: `user:${id}`,
      clientId: id,
      name: u.fullName || 'Cliente',
      email: u.email || '',
      phone: u.phone || '',
      source: 'app_user' as const,
    };
  });
}
