import { getBackendBaseUrl } from '../config/backend';

const BASE = () => `${getBackendBaseUrl()}/api/medical-authorizations`;

async function parseJsonSafe(res: Response): Promise<Record<string, unknown>> {
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export interface MedicalAuthorizationScope {
  consultations: boolean;
  documents: boolean;
  prescriptions: boolean;
  treatments: boolean;
  labResults: boolean;
  imaging: boolean;
}

export interface MedicalAuthorizationDto {
  _id: string;
  patientId: string;
  professionalId: string;
  professionalName?: string;
  patientName?: string;
  authorizationType: string;
  status: string;
  grantedBy?: string;
  scope?: MedicalAuthorizationScope;
  notes?: string;
  grantedAt?: string;
  revokedAt?: string;
  expiresAt?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

function mapLeanDoc(raw: Record<string, unknown>): MedicalAuthorizationDto {
  const id = String(raw._id ?? '');
  return {
    _id: id,
    patientId: String(raw.patientId ?? ''),
    professionalId: String(raw.professionalId ?? ''),
    professionalName: raw.professionalName != null ? String(raw.professionalName) : '',
    patientName: raw.patientName != null ? String(raw.patientName) : '',
    authorizationType: String(raw.authorizationType ?? 'limited_access'),
    status: String(raw.status ?? 'pending'),
    grantedBy: raw.grantedBy != null ? String(raw.grantedBy) : undefined,
    scope: raw.scope as MedicalAuthorizationScope | undefined,
    notes: raw.notes != null ? String(raw.notes) : undefined,
    grantedAt: raw.grantedAt != null ? String(raw.grantedAt) : undefined,
    revokedAt: raw.revokedAt != null ? String(raw.revokedAt) : undefined,
    expiresAt: raw.expiresAt != null ? String(raw.expiresAt) : undefined,
    isActive: !!raw.isActive,
    createdAt: raw.createdAt != null ? String(raw.createdAt) : undefined,
    updatedAt: raw.updatedAt != null ? String(raw.updatedAt) : undefined,
  };
}

export const medicalAuthorizationService = {
  async list(token: string): Promise<MedicalAuthorizationDto[]> {
    const res = await fetch(BASE(), {
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    });
    const json = await parseJsonSafe(res);
    if (!res.ok) {
      const msg =
        (typeof json.message === 'string' && json.message) || `HTTP ${res.status}`;
      throw new Error(msg);
    }
    const data = json.data;
    if (!Array.isArray(data)) return [];
    return data.map((x) => mapLeanDoc(x as Record<string, unknown>));
  },

  async createRequest(
    token: string,
    body: {
      patientId: string;
      authorizationType?: string;
      scope?: Partial<MedicalAuthorizationScope>;
      notes?: string;
    }
  ): Promise<MedicalAuthorizationDto> {
    const res = await fetch(BASE(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    const json = await parseJsonSafe(res);
    if (!res.ok) {
      const msg =
        (typeof json.message === 'string' && json.message) || `HTTP ${res.status}`;
      throw new Error(msg);
    }
    const raw = json.data;
    if (!raw || typeof raw !== 'object') throw new Error('Respuesta inválida');
    return mapLeanDoc(raw as Record<string, unknown>);
  },

  async grant(token: string, id: string, validDays?: number): Promise<MedicalAuthorizationDto> {
    const res = await fetch(`${BASE()}/${encodeURIComponent(id)}/grant`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ validDays: validDays ?? 365 }),
    });
    const json = await parseJsonSafe(res);
    if (!res.ok) {
      const msg =
        (typeof json.message === 'string' && json.message) || `HTTP ${res.status}`;
      throw new Error(msg);
    }
    const raw = json.data;
    if (!raw || typeof raw !== 'object') throw new Error('Respuesta inválida');
    return mapLeanDoc(raw as Record<string, unknown>);
  },

  async reject(token: string, id: string, reason?: string): Promise<MedicalAuthorizationDto> {
    const res = await fetch(`${BASE()}/${encodeURIComponent(id)}/reject`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ reason: reason || '' }),
    });
    const json = await parseJsonSafe(res);
    if (!res.ok) {
      const msg =
        (typeof json.message === 'string' && json.message) || `HTTP ${res.status}`;
      throw new Error(msg);
    }
    const raw = json.data;
    if (!raw || typeof raw !== 'object') throw new Error('Respuesta inválida');
    return mapLeanDoc(raw as Record<string, unknown>);
  },

  async revoke(token: string, id: string, reason?: string): Promise<MedicalAuthorizationDto> {
    const res = await fetch(`${BASE()}/${encodeURIComponent(id)}/revoke`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ reason: reason || '' }),
    });
    const json = await parseJsonSafe(res);
    if (!res.ok) {
      const msg =
        (typeof json.message === 'string' && json.message) || `HTTP ${res.status}`;
      throw new Error(msg);
    }
    const raw = json.data;
    if (!raw || typeof raw !== 'object') throw new Error('Respuesta inválida');
    return mapLeanDoc(raw as Record<string, unknown>);
  },

  async cancelPending(token: string, id: string): Promise<void> {
    const res = await fetch(`${BASE()}/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    });
    const json = await parseJsonSafe(res);
    if (!res.ok) {
      const msg =
        (typeof json.message === 'string' && json.message) || `HTTP ${res.status}`;
      throw new Error(msg);
    }
  },
};
