import { getBackendBaseUrl } from '../config/backend';
import { createAuthHeaders } from './api';

export async function confirmGooglePlaySubscription(params: {
  authToken: string;
  purchaseToken: string;
  productId: string;
  packageName?: string;
}): Promise<{ success: boolean; message?: string }> {
  const url = `${getBackendBaseUrl().replace(/\/$/, '')}/api/subscriptions/google-play/confirm`;
  const body: Record<string, string> = {
    purchaseToken: params.purchaseToken,
    productId: params.productId,
  };
  if (params.packageName) body.packageName = params.packageName;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      ...createAuthHeaders(params.authToken),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const json = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    message?: string;
  };

  if (!res.ok) {
    throw new Error(json.message || `Error ${res.status}`);
  }
  if (!json.success) {
    throw new Error(json.message || 'No se pudo activar Turnario Pro');
  }
  return { success: true };
}
