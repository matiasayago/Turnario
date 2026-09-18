import { getBackendApiV1Url } from '../config/backend';
import simpleAuthService from './simpleAuthService';

/** Misma base que citas/disponibilidad (`EXPO_PUBLIC_API_URL` o host + /api/v1). */
function expoPaymentsBase(): string {
  return getBackendApiV1Url().replace(/\/$/, '');
}

function parsePaymentErrorBody(json: Record<string, unknown>, status: number): string {
  const top = json.message;
  if (typeof top === 'string' && top.trim()) return top;
  const err = json.error;
  if (err && typeof err === 'object' && typeof (err as { message?: string }).message === 'string') {
    const m = (err as { message: string }).message;
    if (m.trim()) {
      const path = (err as { path?: string }).path;
      return typeof path === 'string'
        ? `${m} (${path}). Reiniciá my-app/backend tras actualizar y revisá MERCADOPAGO_ACCESS_TOKEN.`
        : m;
    }
  }
  if (status === 404 || status === 503) {
    return (
      (typeof top === 'string' && top.trim()) ||
      `Pagos no disponibles (HTTP ${status}). Revisá MERCADOPAGO_ACCESS_TOKEN en el backend y reiniciá el servidor.`
    );
  }
  return `Error ${status}`;
}

export interface ExpoPaymentPreferenceResponse {
  preferenceId: string;
  initPoint: string;
  sandboxInitPoint: string;
  appointmentId: string;
  amount: number;
  externalReference?: string;
}

export interface ExpoPaymentStatusResponse {
  status: string;
  paymentStatus: string;
  depositAmount: number;
  service?: string;
  date?: string;
  time?: string;
}

export async function createExpoPaymentPreference(
  appointmentId: string,
  amount?: number,
  description?: string
): Promise<ExpoPaymentPreferenceResponse> {
  const token = await simpleAuthService.getToken();
  if (!token) {
    throw new Error('Iniciá sesión para pagar');
  }
  const res = await fetch(`${expoPaymentsBase()}/expo-payments/create-preference`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      appointmentId,
      ...(typeof amount === 'number' && amount > 0 ? { amount } : {}),
      ...(description ? { description } : {}),
    }),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok || !json.success) {
    throw new Error(parsePaymentErrorBody(json, res.status));
  }
  return json.data as ExpoPaymentPreferenceResponse;
}

export async function getExpoPaymentStatus(
  appointmentId: string
): Promise<ExpoPaymentStatusResponse> {
  const token = await simpleAuthService.getToken();
  if (!token) {
    throw new Error('Sesión requerida');
  }
  const res = await fetch(
    `${expoPaymentsBase()}/expo-payments/status/${encodeURIComponent(appointmentId)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok || !json.success) {
    throw new Error(parsePaymentErrorBody(json, res.status));
  }
  return json.data as ExpoPaymentStatusResponse;
}

/** URL de checkout: en desarrollo preferimos sandbox si viene en la respuesta. */
export function getMercadoPagoCheckoutUrl(data: {
  initPoint?: string;
  sandboxInitPoint?: string;
}): string {
  if (typeof __DEV__ !== 'undefined' && __DEV__ && data.sandboxInitPoint) {
    return data.sandboxInitPoint;
  }
  return data.initPoint || data.sandboxInitPoint || '';
}
