import { getBackendBaseUrl } from '../config/backend';

export type BackendHealthResult = { path: string; data: Record<string, unknown> };

/**
 * Comprueba salud del backend sin asumir JSON (.json() falla si apuntás a Metro u otro servicio).
 * Prueba /api/v1/health y /api/health (el servidor en src solo exponía la segunda).
 */
export async function fetchBackendHealth(
  baseUrl?: string,
  signal?: AbortSignal
): Promise<BackendHealthResult> {
  const base = (baseUrl ?? getBackendBaseUrl()).replace(/\/$/, '');
  const paths = ['/api/v1/health', '/api/health'] as const;
  let lastNonJsonSnippet = '';

  for (const path of paths) {
    const res = await fetch(`${base}${path}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal,
    });
    const text = await res.text();
    let data: unknown;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      lastNonJsonSnippet = text.trim().slice(0, 120).replace(/\r?\n/g, ' ');
      continue;
    }

    const statusOk =
      data &&
      typeof data === 'object' &&
      (data as { status?: string }).status === 'OK';

    if (res.ok && statusOk) {
      return { path, data: data as Record<string, unknown> };
    }
  }

  if (lastNonJsonSnippet) {
    throw new Error(
      `La URL no devolvió JSON de health (¿puerto de Expo/Metro o servidor equivocado?). Respuesta: ${lastNonJsonSnippet}`
    );
  }

  throw new Error(
    'El backend no respondió status OK en /api/v1/health ni /api/health. Verificá que el API Turnario esté en ejecución y EXPO_PUBLIC_BACKEND_URL.'
  );
}
