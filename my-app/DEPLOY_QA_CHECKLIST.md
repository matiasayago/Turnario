# QA Checklist de Deploy a Produccion (Turnario)

Usar esta hoja como control operativo en cada salida a produccion.
Marcar cada item solo cuando este validado.

---

## 1) Pre-Deploy (Backend)

- [ ] API en entorno productivo con dominio HTTPS activo.
- [ ] `backend/.env` cargado con valores reales (sin placeholders).
- [ ] `NODE_ENV=production`.
- [ ] `MONGODB_URI` productiva accesible y estable.
- [ ] `JWT_SECRET` fuerte y unico por entorno.
- [ ] Mercado Pago en modo LIVE (`MERCADOPAGO_ACCESS_TOKEN` / `MERCADOPAGO_PUBLIC_KEY`).
- [ ] `FRONTEND_URL` / `CORS_ORIGINS` correctos (si hay multiples, separados por coma).
- [ ] `TRUST_PROXY=1` si hay reverse proxy o load balancer.
- [ ] `TZ=America/Argentina/Buenos_Aires` (o zona definida por negocio).
- [ ] `ANDROID_PACKAGE_NAME=com.turnariopro.app`.
- [ ] `GOOGLE_PLAY_SUBSCRIPTION_SKUS` coincide con Play Console.
- [ ] Sin flags de desarrollo habilitados (`ALLOW_PLAY_SUBSCRIPTION_DEV_BYPASS`, etc.).

## 2) Pre-Deploy (App / EAS)

- [ ] Variables de EAS configuradas para `production`:
- [ ] `EXPO_PUBLIC_BACKEND_URL=https://...` (sin IP LAN).
- [ ] `EXPO_PUBLIC_WEBSOCKET_URL=wss://...` (si aplica).
- [ ] `EXPO_PUBLIC_APP_ENVIRONMENT=production`.
- [ ] Google OAuth IDs (Web / Android / iOS) de produccion.
- [ ] `EXPO_PUBLIC_MERCADOPAGO_PUBLIC_KEY` LIVE.
- [ ] `app.json` con package/bundle final correcto.
- [ ] Versionado listo (build number / version code).

## 3) Build de Release

- [ ] `eas build --platform android --profile production` finaliza OK.
- [ ] `eas build --platform ios --profile production` finaliza OK.
- [ ] Instalar build release en dispositivo real (no Expo Go).
- [ ] La app arranca sin errores de `Failed to download remote update`.
- [ ] Login normal funciona (email + Google/Apple segun plataforma).

## 4) Smoke Test Funcional (Release)

- [ ] Cliente puede reservar cita.
- [ ] Profesionales visibles y filtros correctos (servicio/consultorio).
- [ ] Si profesional **admite sena**: UI muestra sena y flujo de pago.
- [ ] Si profesional **no admite sena**: UI no muestra sena y crea solicitud normal.
- [ ] Profesional recibe solicitud y puede confirmar/rechazar.
- [ ] Reprogramar/cancelar cita funciona para ambos roles.
- [ ] Notificaciones in-app aparecen y se pueden marcar como leidas.
- [ ] Chat (si aplica) envia y recibe mensajes.
- [ ] Suscripcion Pro: compra/validacion y bloqueo/desbloqueo correcto.

## 5) Validacion de Recordatorio 24h

- [ ] Backend inicia y loguea: job de recordatorio activo.
- [ ] Solo una instancia ejecuta el job (o resto con `DISABLE_APPOINTMENT_REMINDER_JOB=1`).
- [ ] Dispositivo tiene permisos de notificaciones otorgados.
- [ ] Endpoint `/api/users/push-token` registra token sin error.
- [ ] Cita de prueba en ventana de recordatorio (~24h) genera `ExpoNotification` tipo `reminder`.
- [ ] La cita queda marcada con `reminder24hSentAt` (idempotencia).
- [ ] Push llega al cliente (si push habilitado en preferencias).
- [ ] Reprogramar cita resetea recordatorio (`reminder24hSentAt` vuelve a null).

## 6) Observabilidad y Seguridad

- [ ] Logs del backend accesibles (errores, pagos, reminders).
- [ ] Alertas minimas activas (caida API, 5xx, DB desconectada).
- [ ] Rate limit activo en produccion.
- [ ] HTTPS estricto end-to-end (API + WS seguro si aplica).
- [ ] Backup de base de datos validado.

## 7) Go-Live y Post-Deploy

- [ ] Deploy backend ejecutado sin downtime critico.
- [ ] Build movil subida a track correcto (internal/closed/production).
- [ ] Checklist smoke re-ejecutado tras deploy real.
- [ ] Monitoreo intensivo primeras 24-48h.
- [ ] Sin errores bloqueantes en login, reserva, pago, notificaciones, reminders.
- [ ] Rollback plan documentado y probado.

---

## Registro de Ejecucion

### Release

- Fecha:
- Responsable:
- Version App:
- Version Backend/Commit:
- Entorno:

### Resultado

- Estado final: [ ] Aprobado [ ] Rechazado [ ] Aprobado con observaciones
- Incidencias detectadas:
- Acciones pendientes:

