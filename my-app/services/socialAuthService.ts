import { formatBackendConnectionError, getBackendBaseUrl } from '../config/backend';
import type { AuthResponse } from './authService';
import { simpleAuthService } from './simpleAuthService';

/**
 * Decodifica el payload del id_token de Google (sin verificar firma en el cliente;
 * en producción el backend puede validar el token con la API de Google).
 */
export function decodeGoogleIdTokenPayload(idToken: string): {
  sub: string;
  email: string;
  fullName: string;
} {
  const i = idToken.indexOf('.');
  const j = idToken.indexOf('.', i + 1);
  if (i === -1 || j === -1) {
    throw new Error('Token de Google inválido.');
  }
  const segment = idToken.slice(i + 1, j);
  const b64 = segment.replace(/-/g, '+').replace(/_/g, '/');
  const pad = (4 - (b64.length % 4)) % 4;
  const padded = b64 + '='.repeat(pad);
  if (typeof globalThis.atob !== 'function') {
    throw new Error('Este entorno no puede decodificar el token de Google.');
  }
  const bin = globalThis.atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let k = 0; k < bin.length; k++) bytes[k] = bin.charCodeAt(k);
  const json = new TextDecoder('utf-8').decode(bytes);
  const payload = JSON.parse(json) as Record<string, unknown>;
  const sub = String(payload.sub || '');
  const email = String(payload.email || '').trim().toLowerCase();
  const fromGiven =
    `${String(payload.given_name || '').trim()} ${String(payload.family_name || '').trim()}`.trim();
  const name =
    String(payload.name || '').trim() ||
    fromGiven ||
    (email ? email.split('@')[0] : '');
  const cleanedName = name.replace(/\s+/g, ' ').trim();
  const fullName = cleanedName.length >= 2 ? cleanedName : 'Usuario Google';
  if (!sub) {
    throw new Error('Token de Google sin identificador.');
  }
  if (!email) {
    throw new Error(
      'Tu cuenta de Google no compartió el correo. Probá con otra cuenta o revisá los permisos de la app.'
    );
  }
  return { sub, email, fullName };
}

export async function checkGoogleAccountExists(
  googleId: string,
  email: string
): Promise<boolean> {
  const url = `${getBackendBaseUrl()}/api/v1/auth/google/check`;
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ googleId, email }),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(formatBackendConnectionError(url, msg));
  }
  let body: Record<string, unknown> = {};
  try {
    body = (await response.json()) as Record<string, unknown>;
  } catch {
    /* vacío */
  }
  if (!response.ok) {
    const message =
      (typeof body.message === 'string' && body.message.trim()) || `Error ${response.status}`;
    throw new Error(message);
  }
  return body.exists === true;
}

export async function exchangeGoogleIdToken(
  idToken: string,
  userType?: 'client' | 'professional'
): Promise<AuthResponse> {
  const { sub, email, fullName } = decodeGoogleIdTokenPayload(idToken);
  const url = `${getBackendBaseUrl()}/api/v1/auth/google`;
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        googleId: sub,
        email,
        fullName,
        userType: userType ?? 'client',
      }),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(formatBackendConnectionError(url, msg));
  }
  let body: Record<string, unknown> = {};
  try {
    body = (await response.json()) as Record<string, unknown>;
  } catch {
    /* vacío */
  }
  if (!response.ok) {
    const message =
      (typeof body.message === 'string' && body.message.trim()) || `Error ${response.status}`;
    throw new Error(message);
  }
  return simpleAuthService.setSessionFromApiSuccess(body);
}

export async function exchangeAppleSignIn(params: {
  appleUserId: string;
  email: string | null;
  fullName: string | null;
}): Promise<AuthResponse> {
  const url = `${getBackendBaseUrl()}/api/v1/auth/apple`;
  const bodyPayload: Record<string, string> = {
    appleUserId: params.appleUserId,
    userType: 'client',
  };
  if (params.email) {
    bodyPayload.email = params.email.trim().toLowerCase();
  }
  if (params.fullName && params.fullName.trim()) {
    bodyPayload.fullName = params.fullName.trim();
  }
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(bodyPayload),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(formatBackendConnectionError(url, msg));
  }
  let body: Record<string, unknown> = {};
  try {
    body = (await response.json()) as Record<string, unknown>;
  } catch {
    /* vacío */
  }
  if (!response.ok) {
    const message =
      (typeof body.message === 'string' && body.message.trim()) || `Error ${response.status}`;
    throw new Error(message);
  }
  return simpleAuthService.setSessionFromApiSuccess(body);
}
