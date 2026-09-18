/**
 * Parsea fecha (YYYY-MM-DD o similar) + hora (HH:mm) a epoch ms en zona local del servidor.
 * @returns {number|null}
 */
function parseAppointmentStartMs(dateRaw, timeRaw) {
  const dateStr = String(dateRaw || '').trim().slice(0, 10);
  const timeStr = String(timeRaw || '').trim();
  const timeMatch = timeStr.match(/^(\d{1,2}):(\d{2})/);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr) || !timeMatch) return null;

  const year = Number(dateStr.slice(0, 4));
  const month = Number(dateStr.slice(5, 7)) - 1;
  const day = Number(dateStr.slice(8, 10));
  const hour = Math.min(23, parseInt(timeMatch[1], 10));
  const minute = Math.min(59, parseInt(timeMatch[2], 10));
  const ms = new Date(year, month, day, hour, minute, 0, 0).getTime();
  return Number.isFinite(ms) ? ms : null;
}

module.exports = { parseAppointmentStartMs };
