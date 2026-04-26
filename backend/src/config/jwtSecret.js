/**
 * Misma clave para firmar (auth) y verificar (middleware).
 * Si JWT_SECRET no está definido, se usa una clave fija SOLO para desarrollo
 * (evita 500 en registro/login por configuración olvidada).
 */
function getJwtSecret() {
  const fromEnv = process.env.JWT_SECRET;
  if (fromEnv && typeof fromEnv === 'string' && fromEnv.trim().length >= 8) {
    return fromEnv.trim();
  }
  console.warn(
    '[jwt] JWT_SECRET no está definido o tiene menos de 8 caracteres. Usando clave fija de DESARROLLO. Configurá JWT_SECRET en producción.'
  );
  return 'turnario-dev-jwt-secret-no-usar-en-produccion';
}

module.exports = { getJwtSecret };
