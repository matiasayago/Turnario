# Registro del dominio turnarioapp.com.ar

Guía para registrar el dominio y dejarlo listo para producción con Turnario (API, app móvil y panel web).

**Dominio objetivo:** `turnarioapp.com.ar`  
**Registro oficial en Argentina:** [NIC Argentina](https://nic.ar) (dominios `.com.ar`)

---

## 1. Datos del titular (completar antes de registrar)

Copiá esta tabla y tenela a mano al iniciar el trámite en el registrador.

| Campo | Valor |
|-------|--------|
| Dominio a registrar | `turnarioapp.com.ar` |
| Tipo de titular | ☐ Persona física &nbsp; ☐ Persona jurídica (empresa) |
| Nombre y apellido / Razón social | |
| CUIT / CUIL | |
| DNI (persona física) | |
| Domicilio legal (calle, ciudad, CP, provincia) | |
| Teléfono de contacto | |
| Correo del titular (administración del dominio) | |
| Registrador elegido | ☐ NIC directo &nbsp; ☐ DonWeb &nbsp; ☐ otro: _________ |
| Usuario en el registrador | |
| Fecha de registro | |
| Fecha de vencimiento / renovación | |
| Costo anual (ARS) | |

**Sugerencia de correos institucionales** (crear después de tener el dominio):

| Uso | Dirección sugerida |
|-----|-------------------|
| Soporte general | `soporte@turnarioapp.com.ar` |
| Privacidad (política en la app) | `privacidad@turnarioapp.com.ar` |
| Notificaciones del sistema | `noreply@turnarioapp.com.ar` |

---

## 2. Requisitos para dominios .com.ar

- Titular con **CUIT/CUIL** argentino (persona física o jurídica).
- Datos de contacto **verificables** (el registrador puede pedir validación por email).
- El nombre `turnarioapp` debe estar **disponible** (consultá en el buscador del registrador antes de pagar).
- Renovación **anual**; anotá la fecha en el calendario para no perder el dominio.

### Si NIC pide documentación (pantalla «Registro de dominio — especiales»)

A veces, al registrar un `.com.ar`, NIC exige adjuntar **documentación que demuestre la relación del nombre de dominio elegido** con el titular (CUIT/CUIL).

Para **turnarioapp.com.ar** el vínculo es: dominio = marca **Turnario** + sufijo **app**, alineado con la app móvil (`Turnario`, paquete `com.turnariopro.app`).

**Qué hacer:** armá **un PDF** con la nota de solicitud, constancia de CUIT (AFIP) y capturas de la app. Plantilla y texto listos para copiar:

→ **[NIC_ADJUNTO_RELACION_DOMINIO.md](./NIC_ADJUNTO_RELACION_DOMINIO.md)**

Luego **ADJUNTAR** en NIC y **CONFIRMAR TRÁMITE**. El estado suele quedar *Pendiente validación* unos días.

---

## 3. Pasos para registrar el dominio

### Paso A — Verificar disponibilidad

1. Entrá a [https://nic.ar](https://nic.ar) o al registrador que elijas (DonWeb, etc.).
2. Buscá: `turnarioapp.com.ar`.
3. Si está libre, agregalo al carrito. Si está tomado, probá variantes (`turnario.app.ar` no existe; alternativas: `turnario.com.ar`, `app-turnario.com.ar`) solo si cambiás la marca.

### Paso B — Crear cuenta en el registrador

1. Registrate con el email que usarás como contacto administrativo.
2. Completá datos del titular (tabla de la sección 1).

### Paso C — Comprar y activar

1. Pagá el registro (transferencia, tarjeta, según el registrador).
2. Confirmá el email de activación del dominio.
3. En el panel del registrador, anotá:
   - **Servidores DNS** (nameservers) del registrador, **o**
   - DNS personalizados si vas a usar Cloudflare / otro proveedor.

### Paso D — Configurar DNS (cuando tengas servidor con IP pública)

Reemplazá `TU_IP_SERVIDOR` por la IP de tu VPS/hosting cuando la tengas.

| Subdominio | Tipo | Destino | Uso en Turnario |
|------------|------|---------|-----------------|
| `@` | A | `TU_IP_SERVIDOR` | Sitio principal / landing |
| `www` | CNAME | `turnarioapp.com.ar` | Redirección web |
| `api` | A | `TU_IP_SERVIDOR` | Backend Express (puerto 3001 detrás de proxy) |
| `app` | A o CNAME | `TU_IP_SERVIDOR` o hosting estático | Panel / web app (CORS) |

**HTTPS (obligatorio en producción):**

- Usá **Let's Encrypt** (Certbot en el servidor) o **Cloudflare** (proxy naranja + SSL).
- La app Android en EAS necesita `https://api...` y `wss://api...` (ver `eas.json` perfil `production`).

**Ejemplo de URLs finales:**

```
https://turnarioapp.com.ar          → landing / marketing
https://app.turnarioapp.com.ar      → frontend web (admin si aplica)
https://api.turnarioapp.com.ar      → API + WebSockets (mismo host, wss)
```

Propagación DNS: puede tardar **15 minutos a 48 horas**.

---

## 4. Después del registro: actualizar el proyecto Turnario

Cuando `api.turnarioapp.com.ar` responda por HTTPS, actualizá:

### Backend (`TurnarioApp/backend/.env`)

```env
NODE_ENV=production
FRONTEND_URL=https://app.turnarioapp.com.ar
# Si tenés panel admin en otro host, separá con coma:
# FRONTEND_URL=https://app.turnarioapp.com.ar,https://admin.turnarioapp.com.ar
TRUST_PROXY=1
```

### App móvil — EAS (`my-app/eas.json`, perfil `production`)

```json
"EXPO_PUBLIC_BACKEND_URL": "https://api.turnarioapp.com.ar",
"EXPO_PUBLIC_WEBSOCKET_URL": "wss://api.turnarioapp.com.ar"
```

### Mercado Pago

- Webhook de notificaciones: URL pública HTTPS del backend (ej. `https://api.turnarioapp.com.ar/...` según la ruta configurada en el servidor).

### Documentación legal

- Reemplazá placeholders en `docs/POLITICA_DE_PRIVACIDAD.md` (email de contacto → `privacidad@turnarioapp.com.ar`).

### Checklist de despliegue

- Ver también: `BUILD_ENV_CHECKLIST.md` y `DEPLOY_QA_CHECKLIST.md`.

---

## 5. Checklist de registro y puesta en marcha

### Registro del dominio

- [ ] Disponibilidad de `turnarioapp.com.ar` confirmada
- [ ] Titular y CUIT/CUIL cargados en el registrador
- [ ] Pago realizado y dominio activo en el panel
- [ ] Fecha de renovación anotada

### DNS y servidor

- [ ] Registros A/CNAME creados (`api`, `app`, `www`, `@`)
- [ ] Certificado SSL válido en `api.turnarioapp.com.ar`
- [ ] `GET https://api.turnarioapp.com.ar/api/health` responde OK
- [ ] WebSocket `wss://` accesible desde internet

### Proyecto

- [ ] `backend/.env` con `FRONTEND_URL` de producción
- [ ] `eas.json` production con URLs del dominio
- [ ] Build EAS production generado y probado en dispositivo real
- [ ] Emails institucionales creados (soporte / privacidad)

---

## 6. Notas útiles

- **No subas** al repositorio contraseñas del registrador ni claves del panel DNS.
- Si usás **Cloudflare**, activá proxy solo cuando entiendas el impacto en WebSockets (a veces conviene `api` en modo DNS only o reglas específicas).
- El dominio `.com.ar` es independiente de publicar la app en **Google Play**; para la tienda necesitás cuenta de desarrollador y política de privacidad con URL pública (podés usar `https://turnarioapp.com.ar/privacidad` cuando exista la página).

---

## 7. Registro de seguimiento (bitácora)

| Fecha | Acción | Responsable | Notas |
|-------|--------|-------------|-------|
| | Consulta disponibilidad | | |
| | Compra / registro | | |
| | DNS configurado | | |
| | SSL activo | | |
| | Variables de producción actualizadas | | |
| | Build EAS production probado | | |

---

*Última actualización del documento: mayo 2026 — Turnario*
