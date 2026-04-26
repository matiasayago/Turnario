const https = require('https');

const CHUNK = 99;

/**
 * Envía notificaciones push vía API HTTP de Expo (sin SDK).
 * @param {{ tokens: string[]; title: string; body: string; data?: Record<string, string> }} opts
 */
function sendExpoPushBatch(opts) {
  const { tokens, title, body, data } = opts;
  if (!tokens || !tokens.length) return Promise.resolve({ ok: true, skipped: true });

  const unique = [...new Set(tokens.map((t) => String(t || '').trim()).filter(Boolean))];
  if (!unique.length) return Promise.resolve({ ok: true, skipped: true });

  const chunks = [];
  for (let i = 0; i < unique.length; i += CHUNK) {
    chunks.push(unique.slice(i, i + CHUNK));
  }

  const payloadFor = (batch) =>
    JSON.stringify(
      batch.map((to) => ({
        to,
        title,
        body,
        sound: 'default',
        priority: 'high',
        channelId: 'default',
        data: data || {},
      }))
    );

  return new Promise((resolve) => {
    let pending = chunks.length;
    const errors = [];

    const doneOne = () => {
      pending -= 1;
      if (pending <= 0) resolve({ ok: errors.length === 0, errors });
    };

    for (const batch of chunks) {
      const payload = payloadFor(batch);
      const req = https.request(
        {
          hostname: 'exp.host',
          port: 443,
          path: '/--/api/v2/push/send',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'Content-Length': Buffer.byteLength(payload),
          },
        },
        (res) => {
          let raw = '';
          res.on('data', (c) => {
            raw += c;
          });
          res.on('end', () => {
            if (res.statusCode && res.statusCode >= 400) {
              errors.push({ status: res.statusCode, body: raw.slice(0, 400) });
            }
            doneOne();
          });
        }
      );
      req.on('error', (err) => {
        errors.push({ message: err.message });
        doneOne();
      });
      req.write(payload);
      req.end();
    }
  });
}

module.exports = { sendExpoPushBatch };
