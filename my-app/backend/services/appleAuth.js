const https = require('https');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const APPLE_ISSUER = 'https://appleid.apple.com';
const APPLE_KEYS_URL = 'https://appleid.apple.com/auth/keys';
const DEFAULT_BUNDLE_ID = 'com.turnariopro.app';

let cachedKeys = null;
let cachedAt = 0;
const CACHE_MS = 60 * 60 * 1000;

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let raw = '';
        res.on('data', (c) => {
          raw += c;
        });
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 400) {
            reject(new Error(`Apple JWKS HTTP ${res.statusCode}`));
            return;
          }
          try {
            resolve(JSON.parse(raw));
          } catch (e) {
            reject(e);
          }
        });
      })
      .on('error', reject);
  });
}

async function getApplePublicKeys() {
  const now = Date.now();
  if (cachedKeys && now - cachedAt < CACHE_MS) return cachedKeys;
  const json = await fetchJson(APPLE_KEYS_URL);
  cachedKeys = Array.isArray(json.keys) ? json.keys : [];
  cachedAt = now;
  return cachedKeys;
}

function jwkToPem(jwk) {
  const keyObject = crypto.createPublicKey({ key: jwk, format: 'jwk' });
  return keyObject.export({ type: 'spki', format: 'pem' });
}

/**
 * Verifica el identityToken de Sign in with Apple.
 * @returns {{ appleUserId: string, email: string|null, emailVerified: boolean }}
 */
async function verifyAppleIdentityToken(identityToken, options = {}) {
  const token = String(identityToken || '').trim();
  if (!token || token.split('.').length !== 3) {
    throw Object.assign(new Error('Token de Apple inválido.'), { status: 400 });
  }

  const decoded = jwt.decode(token, { complete: true });
  if (!decoded || !decoded.header || !decoded.payload) {
    throw Object.assign(new Error('No se pudo leer el token de Apple.'), { status: 400 });
  }

  const kid = decoded.header.kid;
  const keys = await getApplePublicKeys();
  const jwk = keys.find((k) => k.kid === kid);
  if (!jwk) {
    cachedKeys = null;
    const refreshed = await getApplePublicKeys();
    const retry = refreshed.find((k) => k.kid === kid);
    if (!retry) {
      throw Object.assign(new Error('Clave pública de Apple no encontrada.'), { status: 401 });
    }
    return verifyWithKey(token, retry, options);
  }
  return verifyWithKey(token, jwk, options);
}

function verifyWithKey(token, jwk, options) {
  const bundleId = String(
    options.bundleId || process.env.APPLE_BUNDLE_ID || DEFAULT_BUNDLE_ID
  ).trim();
  const pem = jwkToPem(jwk);
  let payload;
  try {
    payload = jwt.verify(token, pem, {
      algorithms: ['RS256'],
      issuer: APPLE_ISSUER,
      audience: bundleId,
    });
  } catch (e) {
    throw Object.assign(
      new Error(e?.message || 'Token de Apple no válido o expirado.'),
      { status: 401 }
    );
  }

  const appleUserId = String(payload.sub || '').trim();
  if (!appleUserId) {
    throw Object.assign(new Error('Token de Apple sin identificador.'), { status: 401 });
  }

  const emailRaw = payload.email != null ? String(payload.email).trim().toLowerCase() : '';
  const email = emailRaw.includes('@') ? emailRaw : null;
  const emailVerified =
    payload.email_verified === true ||
    payload.email_verified === 'true' ||
    Boolean(email);

  return { appleUserId, email, emailVerified };
}

module.exports = {
  verifyAppleIdentityToken,
  DEFAULT_BUNDLE_ID,
};
