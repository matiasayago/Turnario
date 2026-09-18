# Guía paso a paso — Subir Turnario a producción (web / internet)

Hoy Turnario es una **app móvil** + un **backend**. “Subirlo a la web” significa:

1. Base de datos en la nube (MongoDB Atlas)
2. Backend público con HTTPS (Railway)
3. Dominio `api.turnarioapp.com.ar` apuntando al backend
4. App instalada con build **production** (ya no usa la IP de tu casa)

Opcional después: landing en `turnarioapp.com.ar` y/o versión web de Expo.

---

## Antes de empezar — checklist de cuentas

Necesitás:

- [ ] Cuenta [GitHub](https://github.com) con el repo subido (`matiasayago/Turnario` o el tuyo)
- [ ] Cuenta [MongoDB Atlas](https://cloud.mongodb.com) (gratis)
- [ ] Cuenta [Railway](https://railway.app) (o Render)
- [ ] Dominio [NIC.ar](https://nic.ar) `turnarioapp.com.ar` (ver también `docs/REGISTRO_DOMINIO_TURNARIOAPP_COM_AR.md`)
- [ ] Credenciales Mercado Pago de **producción** (si usás señas)
- [ ] Email SMTP / Gmail App Password / Resend (recuperar contraseña)

---

## PASO 1 — MongoDB Atlas (base de datos)

1. Entrá a [cloud.mongodb.com](https://cloud.mongodb.com) → **Sign up / Log in**.
2. **Create** → Cluster gratis (M0) → región cercana (ej. São Paulo).
3. **Database Access** → **Add New Database User**  
   - Usuario + contraseña (guardalas).  
   - Rol: **Atlas admin** o **Read and write to any database**.
4. **Network Access** → **Add IP Address** → **Allow Access from Anywhere** (`0.0.0.0/0`).  
   (Así Railway puede conectar.)
5. **Database** → **Connect** → **Drivers** → copiá el URI, algo así:

```text
mongodb+srv://USER:PASS@cluster0.xxxxx.mongodb.net/turnario?retryWrites=true&w=majority
```

Reemplazá `USER` y `PASS`. Si la contraseña tiene caracteres especiales (`@`, `#`, etc.), codificalos en la URL.

**Listo el Paso 1** cuando tengas el `MONGODB_URI` copiado.

---

## PASO 2 — Subir el backend a Railway

### 2.1 Crear el proyecto

1. Entrá a [railway.app](https://railway.app) → login con GitHub.
2. **New Project** → **Deploy from GitHub Repo**.
3. Elegí el repo **Turnario**.
4. Si pide root directory / monorepo:  
   **Root Directory = `my-app/backend`**  
   (ahí está el `package.json` con `npm start` → `node server.js`).

### 2.2 Variables de entorno

En el servicio → **Variables** → agregá:

| Variable | Valor |
|----------|--------|
| `NODE_ENV` | `production` |
| `TRUST_PROXY` | `1` |
| `MONGODB_URI` | el URI de Atlas del Paso 1 |
| `JWT_SECRET` | string largo aleatorio (nuevo, no el de tu PC) |
| `FRONTEND_URL` | `https://app.turnarioapp.com.ar,https://turnarioapp.com.ar` |
| `EXPO_APP_SCHEME` | `myapp` |
| `APPLE_BUNDLE_ID` | `com.turnariopro.app` |
| `BACKEND_URL` | `https://api.turnarioapp.com.ar` *(después de DNS; mientras usá la URL de Railway)* |
| `EMAIL_USER` | tu Gmail (si usás Gmail) |
| `EMAIL_APP_PASSWORD` | App Password de Google |
| `EMAIL_FROM` | mismo email o `noreply@...` |
| `EMAIL_FROM_NAME` | `Turnario` |
| `MERCADOPAGO_ACCESS_TOKEN` | token producción `APP_USR-...` |
| `MERCADOPAGO_PUBLIC_KEY` | public key producción |

`PORT` lo asigna Railway solo: **no lo fuerces a 3001**.

### 2.3 Deploy y prueba temporal

1. Esperá que el deploy pase a **Success**.
2. **Settings → Networking → Generate Domain** (si no hay dominio).
3. Abrí en el navegador:

```text
https://TU-PROYECTO.up.railway.app/api/v1/health
```

Tenés que ver algo como `"status":"OK"` y Mongo conectado.

**Listo el Paso 2** cuando el health responda OK en la URL de Railway.

---

## PASO 3 — Dominio `api.turnarioapp.com.ar`

1. En Railway → **Settings → Networking → Custom Domain**.
2. Agregá: `api.turnarioapp.com.ar`.
3. Railway te muestra un registro DNS (casi siempre **CNAME**).
4. En el panel DNS de tu dominio (NIC.ar / Cloudflare / el que uses):

| Tipo | Nombre | Valor |
|------|--------|--------|
| CNAME | `api` | el host que diga Railway (ej. `xxxx.up.railway.app`) |

5. Esperá propagación (minutos a unas horas).
6. Probá:

```text
https://api.turnarioapp.com.ar/api/v1/health
```

7. Actualizá en Railway la variable:

```text
BACKEND_URL=https://api.turnarioapp.com.ar
```

Redeploy si hace falta (para webhooks de Mercado Pago).

**Listo el Paso 3** cuando el health responda en `api.turnarioapp.com.ar` con candado HTTPS.

---

## PASO 4 — App móvil apuntando a producción

El perfil **preview** sigue usando tu IP local. Para internet necesitás el perfil **production** (ya configurado en `eas.json`):

```text
EXPO_PUBLIC_BACKEND_URL=https://api.turnarioapp.com.ar
EXPO_PUBLIC_WEBSOCKET_URL=wss://api.turnarioapp.com.ar
```

### Build Android (AAB para Play Store, o APK interno)

En la PC:

```bash
cd c:\Turnario\TurnarioApp\my-app
npx eas-cli build --platform android --profile production
```

- **production** genera **AAB** (Play Store).
- Si querés APK de prueba con URL de producción, se puede agregar un perfil aparte; avisame y lo armamos.

### iOS (cuando tengas Apple Developer)

```bash
npx eas-cli build --platform ios --profile production
```

Instalá el build nuevo en los celulares. Los APK “preview” viejos **no** van a usar la API pública.

---

## PASO 5 — Mercado Pago en producción

1. En el panel de MP usá credenciales **producción** (`APP_USR-...`).
2. En Railway: `MERCADOPAGO_ACCESS_TOKEN` + `MERCADOPAGO_PUBLIC_KEY`.
3. `BACKEND_URL=https://api.turnarioapp.com.ar` (HTTPS público).
4. Probá una seña real chica: debe abrir Checkout y, al pagar, confirmar (webhook o “Verificar pago”).

---

## PASO 6 — (Opcional) Sitio web / landing

| Qué | Dónde |
|-----|--------|
| Landing marketing | `turnarioapp.com.ar` (Vercel / Netlify / hosting estático) |
| App web Expo | más adelante: `npx expo export --platform web` + hosting; hoy el foco es la API + móvil |

DNS ejemplo:

| Nombre | Tipo | Destino |
|--------|------|---------|
| `@` / `www` | A/CNAME | hosting de la landing |
| `api` | CNAME | Railway |
| `app` | CNAME | (si publicás la app web) |

---

## Checklist final

- [ ] Atlas conectado
- [ ] Railway deploy OK
- [ ] `https://api.turnarioapp.com.ar/api/v1/health` → OK
- [ ] Login email / Google contra la API pública
- [ ] Seña Mercado Pago con webhook HTTPS
- [ ] Reset de contraseña por email
- [ ] Build **production** instalado en al menos un celular
- [ ] Solicitud de cita + notificaciones
- [ ] Cancelar / reprogramar (cliente → profesional confirma)

---

## Problemas frecuentes

| Síntoma | Qué revisar |
|---------|-------------|
| Health falla | Deploy caído, root directory mal (`my-app/backend`), Mongo URI |
| App no conecta | Todavía tenés APK **preview** (IP local) |
| Login OK en PC, falla en cel | Celular no usa el build production |
| Seña sin webhook | `BACKEND_URL` no es HTTPS público |
| Email no llega | Faltan `EMAIL_*` / Resend en Railway |
| DNS no resuelve | Esperá propagación; revisá CNAME `api` |

---

## Orden corto (resumen)

1. Atlas → copiar `MONGODB_URI`  
2. Railway → root `my-app/backend` → variables → deploy  
3. Probar `…up.railway.app/api/v1/health`  
4. DNS `api.turnarioapp.com.ar` → Railway  
5. Probar `https://api.turnarioapp.com.ar/api/v1/health`  
6. `eas build --profile production`  
7. Probar login + seña + citas  

Cuando termines el Paso 2 o 3, pasame la URL de health y seguimos juntos con DNS o el build production.
