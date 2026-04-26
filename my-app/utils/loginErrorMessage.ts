/**
 * Mensajes claros para fallos de POST /api/v1/auth/login (sin filtrar datos sensibles).
 */
export function buildLoginFailureMessage(
  status: number,
  body: Record<string, unknown>
): string {
  const errorCode = typeof body.error === 'string' ? body.error : '';

  if (Array.isArray(body.errors)) {
    const arr = body.errors as { msg?: string }[];
    const msgs = arr.map((e) => (typeof e.msg === 'string' ? e.msg.trim() : '')).filter(Boolean);
    if (msgs.length) return msgs.join('\n');
  }

  const msg = typeof body.message === 'string' ? body.message.trim() : '';

  if (status === 503 || errorCode === 'DATABASE_UNAVAILABLE') {
    return 'El servidor no puede acceder a la base de datos en este momento. Probá más tarde o avisá al administrador.';
  }
  if (errorCode === 'ACCOUNT_DISABLED') {
    return 'Tu cuenta está desactivada. Contactá soporte.';
  }
  if (status === 401 && errorCode === 'INVALID_CREDENTIALS') {
    return 'Email o contraseña incorrectos.';
  }
  if (status === 401 && msg.toLowerCase().includes('credencial')) {
    return 'Email o contraseña incorrectos.';
  }
  if (status === 400) {
    return msg || 'Revisá el email y la contraseña.';
  }
  if (status === 429) {
    return 'Demasiadas peticiones desde esta red. Esperá unos minutos o reiniciá el backend (límite por IP).';
  }
  if (status >= 500) {
    return 'Error en el servidor. Intentá de nuevo más tarde.';
  }
  return msg || `No se pudo iniciar sesión (código ${status}).`;
}
