/**
 * Inicio del turno Expo en ms (fecha local del servidor, mismo criterio que la app con YYYY-MM-DD + HH:mm).
 * @param {string} dateStr
 * @param {string} timeStr
 * @returns {number|null}
 */
function parseExpoAppointmentStartMs(dateStr, timeStr) {
  const ds = String(dateStr || '').trim();
  const ts = String(timeStr || '').trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ds);
  if (!m) return null;
  const tm = /^(\d{1,2}):(\d{2})/.exec(ts);
  const h = tm ? parseInt(tm[1], 10) : 0;
  const min = tm ? parseInt(tm[2], 10) : 0;
  const t = new Date(
    parseInt(m[1], 10),
    parseInt(m[2], 10) - 1,
    parseInt(m[3], 10),
    h,
    min,
    0,
    0
  ).getTime();
  return Number.isNaN(t) ? null : t;
}

module.exports = { parseExpoAppointmentStartMs };
