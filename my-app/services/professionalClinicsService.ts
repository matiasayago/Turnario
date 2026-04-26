import { getBackendBaseUrl } from '../config/backend';
import { simpleAuthService } from './simpleAuthService';

export type ProfessionalClinicPayload = {
  clinics: unknown[];
  selectedClinicIndex: number;
};

function url(): string {
  return `${getBackendBaseUrl()}/api/users/professional-clinics`;
}

/** Obtiene consultorios del usuario profesional desde el backend. */
export async function fetchProfessionalClinicsFromBackend(): Promise<ProfessionalClinicPayload | null> {
  const token = await simpleAuthService.getToken();
  if (!token) return null;
  try {
    const res = await fetch(url(), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    const json = (await res.json().catch(() => ({}))) as {
      success?: boolean;
      data?: ProfessionalClinicPayload;
      message?: string;
    };
    if (!res.ok || !json.success || !json.data) {
      return null;
    }
    const { clinics, selectedClinicIndex } = json.data;
    if (!Array.isArray(clinics)) return null;
    return {
      clinics,
      selectedClinicIndex:
        typeof selectedClinicIndex === 'number' && !Number.isNaN(selectedClinicIndex)
          ? selectedClinicIndex
          : 0,
    };
  } catch {
    return null;
  }
}

/** Persiste consultorios en el backend (profesional autenticado). */
export async function saveProfessionalClinicsToBackend(
  clinics: unknown[],
  selectedClinicIndex: number
): Promise<{ ok: boolean; message?: string }> {
  const token = await simpleAuthService.getToken();
  if (!token) {
    return { ok: false, message: 'No hay sesión. Iniciá sesión para sincronizar con el servidor.' };
  }
  try {
    const res = await fetch(url(), {
      method: 'PUT',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ clinics, selectedClinicIndex }),
    });
    const json = (await res.json().catch(() => ({}))) as {
      success?: boolean;
      message?: string;
    };
    if (!res.ok || !json.success) {
      const msg =
        (typeof json.message === 'string' && json.message) || `Error del servidor (${res.status})`;
      return { ok: false, message: msg };
    }
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error de red';
    return { ok: false, message: msg };
  }
}
