const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const ACTIVE_STATES = new Set([
  'SUBSCRIPTION_STATE_ACTIVE',
  'SUBSCRIPTION_STATE_FREE_TRIAL',
  'SUBSCRIPTION_STATE_IN_GRACE_PERIOD',
]);

const INACTIVE_STATES = new Set([
  'SUBSCRIPTION_STATE_EXPIRED',
  'SUBSCRIPTION_STATE_CANCELED',
  'SUBSCRIPTION_STATE_REVOKED',
]);

/**
 * Verifica compra con Google Play Developer API (subscriptions v2) y hace acknowledge v1.
 * @param {{ packageName: string; purchaseToken: string; productId: string }} args
 * @returns {Promise<{ ok: boolean; code?: string; message?: string; expiresAt?: Date|null; subscriptionState?: string|null; devBypass?: boolean }>}
 */
async function verifyGooglePlaySubscription({ packageName, purchaseToken, productId }) {
  const keyFileRaw = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_KEYFILE;
  const keyFile = keyFileRaw ? path.resolve(keyFileRaw) : null;
  const hasKey = keyFile && fs.existsSync(keyFile);

  if (!hasKey) {
    const bypass = process.env.ALLOW_PLAY_SUBSCRIPTION_DEV_BYPASS === '1';
    if (bypass) {
      return {
        ok: true,
        devBypass: true,
        expiresAt: new Date(Date.now() + 30 * 86400000),
        subscriptionState: 'DEV_BYPASS',
      };
    }
    return {
      ok: false,
      code: 'NO_GOOGLE_CREDENTIALS',
      message:
        'Configurá GOOGLE_PLAY_SERVICE_ACCOUNT_KEYFILE (JSON de cuenta de servicio con rol Finanzas en Play Console) o ALLOW_PLAY_SUBSCRIPTION_DEV_BYPASS=1 solo en desarrollo.',
    };
  }

  const auth = new google.auth.GoogleAuth({
    keyFile,
    scopes: ['https://www.googleapis.com/auth/androidpublisher'],
  });
  const client = await auth.getClient();
  const androidpublisher = google.androidpublisher({ version: 'v3', auth: client });

  const { data } = await androidpublisher.purchases.subscriptionsv2.get({
    packageName,
    token: purchaseToken,
  });

  const state = data.subscriptionState || null;
  const lineItems = Array.isArray(data.lineItems) ? data.lineItems : [];
  let maxExpiryMs = null;
  for (const li of lineItems) {
    if (li && li.expiryTime) {
      const t = new Date(li.expiryTime).getTime();
      if (!Number.isNaN(t) && (maxExpiryMs == null || t > maxExpiryMs)) {
        maxExpiryMs = t;
      }
    }
  }
  const expiresAt = maxExpiryMs != null ? new Date(maxExpiryMs) : null;

  const expiryOk = !!(expiresAt && expiresAt.getTime() > Date.now());
  const stateOk = ACTIVE_STATES.has(state);
  const explicitlyInactive = INACTIVE_STATES.has(state);

  if (explicitlyInactive) {
    return {
      ok: false,
      code: 'SUBSCRIPTION_NOT_ACTIVE',
      message: `La suscripción no está activa en Google Play (estado: ${state || 'desconocido'}).`,
      subscriptionState: state,
      expiresAt,
    };
  }

  if (!stateOk && !expiryOk) {
    return {
      ok: false,
      code: 'SUBSCRIPTION_NOT_ACTIVE',
      message: `La suscripción no está activa en Google Play (estado: ${state || 'desconocido'}).`,
      subscriptionState: state,
      expiresAt,
    };
  }

  try {
    await androidpublisher.purchases.subscriptions.acknowledge({
      packageName,
      subscriptionId: productId,
      token: purchaseToken,
    });
  } catch (err) {
    console.warn('[googlePlaySubscriptionVerify] acknowledge:', err && err.message ? err.message : err);
  }

  return {
    ok: true,
    expiresAt,
    subscriptionState: state,
  };
}

module.exports = {
  verifyGooglePlaySubscription,
};
