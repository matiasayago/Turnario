/**
 * Orígenes permitidos para CORS y Socket.IO.
 * Usá `FRONTEND_URL` o `CORS_ORIGINS` con URLs separadas por coma (sin espacios si podés).
 * Ej. producción: https://app.turnario.com,https://admin.turnario.com
 */
function getCorsOriginOption() {
  const raw =
    process.env.FRONTEND_URL ||
    process.env.CORS_ORIGINS ||
    'http://localhost:3000';
  const list = String(raw)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (list.length === 0) return 'http://localhost:3000';
  if (list.length === 1) return list[0];
  return list;
}

module.exports = { getCorsOriginOption };
