const MS_PER_HOUR = 60 * 60 * 1000;

/** Antelación mínima (horas) para que el paciente pueda cancelar un turno. */
export const CLIENT_CANCEL_MIN_HOURS_ADVANCE = 48;

/**
 * Interpreta inicio del turno en hora local (fecha YYYY-MM-DD + hora HH:mm).
 */
export function getAppointmentStartTimeMs(dateStr: string, timeStr: string): number | null {
  const ds = String(dateStr || '').trim();
  const ts = String(timeStr || '').trim();
  const dm = /^(\d{4})-(\d{2})-(\d{2})/.exec(ds);
  if (!dm) {
    const d = new Date(ds);
    return Number.isNaN(d.getTime()) ? null : d.getTime();
  }
  const y = parseInt(dm[1], 10);
  const mo = parseInt(dm[2], 10) - 1;
  const day = parseInt(dm[3], 10);
  const tm = /^(\d{1,2}):(\d{2})/.exec(ts);
  const h = tm ? parseInt(tm[1], 10) : 0;
  const min = tm ? parseInt(tm[2], 10) : 0;
  const t = new Date(y, mo, day, h, min, 0, 0).getTime();
  return Number.isNaN(t) ? null : t;
}

export function canClientCancelAppointment(
  dateStr: string,
  timeStr: string,
  minHoursAdvance: number = CLIENT_CANCEL_MIN_HOURS_ADVANCE
): { ok: boolean; message?: string } {
  const start = getAppointmentStartTimeMs(dateStr, timeStr);
  if (start == null) {
    return { ok: false, message: 'No se pudo verificar la fecha del turno.' };
  }
  const now = Date.now();
  if (start <= now) {
    return { ok: false, message: 'Este turno ya pasó o está en curso.' };
  }
  const msRemaining = start - now;
  const required = minHoursAdvance * MS_PER_HOUR;
  if (msRemaining < required) {
    return {
      ok: false,
      message: `Solo podés cancelar con al menos ${minHoursAdvance} horas de anticipación respecto del horario del turno.`,
    };
  }
  return { ok: true };
}
