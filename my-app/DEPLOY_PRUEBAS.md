# Pruebas reales y compilación Android (APK / AAB)

## 1. Backend en esta PC

1. En **`TurnarioApp/backend`**, tené MongoDB y `.env` listos; el servidor debe escuchar en el puerto **3001** (`npm start`).
2. Anotá la **IPv4 de la misma red Wi-Fi** que usará el celular (`ipcontrig` en PowerShell → Adaptador Wi-Fi).
3. **Firewall de Windows**: permitir entrada **TCP 3001** para Node o para el ejecutable del backend, si el dispositivo no conecta.
4. **CORS** no aplica al `fetch` nativo de React Native; no hace falta cambiar el backend solo por el APK.

## 2. URL embebida en la app

Las variables `EXPO_PUBLIC_*` se resuelven **al compilar**. Copiá `env.example` a **`.env`** y definí, como mínimo:

```env
EXPO_PUBLIC_BACKEND_URL=http://TU_IP_LAN:3001
```

Opcional: `EXPO_PUBLIC_API_URL` si usás rutas bacia `/api/v1` distintas; si no, la app arma la base desde `EXPO_PUBLIC_BACKEND_URL`.

En **`app.json`** está `android.usesCleartextTraffic: true` para poder usar **http://** en LAN. Para Play Store con HTTPS podés volver a `false` y usar solo `https://`.

## 3. Cuenta Expo y proyecto EAS

```bash
cd my-app
npx expo login
npx eas-cli@latest init
```

Seguí el asistente: crea el proyecto en [expo.dev](https://expo.dev) y enlaza `app.json` (aparecerá `extra.eas.projectId`).

## 4. Generar APK (instalación directa en otro celular)

Con la URL ya en `.env` (o exportada en la misma terminal):

```bash
cd my-app
npx eas-cli@latest build --platform android --profile preview
```

- Perfil **`preview`** en `eas.json` → **APK** (`internal` distribution).
- Descargá el artefacto desde el enlace que muestra la CLI o desde el dashboard de Expo.
- En el teléfono: permitir “orígenes desconocidos” e instalar el APK.

Para inyectar la URL solo en ese comando (sin tocar `.env`):

```bash
set EXPO_PUBLIC_BACKEND_URL=http://192.168.0.11:3001
npx eas-cli@latest build --platform android --profile preview
```

(PowerShell: `$env:EXPO_PUBLIC_BACKEND_URL="http://..."`)

## 5. Generar AAB (Google Play)

```bash
npx eas-cli@latest build --platform android --profile production
```

- **`production`** → **AAB** (Android App Bundle).
- Necesitás **Keystore**: la primera vez EAS puede generarla y guardarla en la nube (recomendado).
- En Play Console, subís el AAB y completás ficha de la app (package **`com.turnario.app`**).

Subí **`version`** en `app.json` y **`android.versionCode`** en cada release nueva.

## 6. Build Android local (sin EAS), en esta PC

Requiere Android Studio y SDK instalados.

```bash
cd my-app
npx expo prebuild --platform android
npx expo run:android --variant release
```

El APK suele quedar en `android/app/build/outputs/apk/release/`. Volvé a generar el proyecto nativo si cambiás `app.json` (plugins, package, etc.).

## 7. Scripts npm útiles

| Script | Uso |
|--------|-----|
| `npm run eas:configure` | Primer enlace con EAS (`eas init`) |
| `npm run build:android:apk` | APK vía EAS (preview) |
| `npm run build:android:aab` | AAB vía EAS (production) |
| `npm run prebuild:android` | Carpeta `android/` para build local |

## 8. Checklist rápido

- [ ] Backend accesible desde el celular: `http://TU_IP:3001` (probar en el navegador del teléfono si hay ruta de health).
- [ ] `.env` con `EXPO_PUBLIC_BACKEND_URL` **antes** del `eas build`.
- [ ] Misma red Wi-Fi PC ↔ móvil (o VPN si aplica).
- [ ] Primera vez: `eas init` + cuenta Expo.
- [ ] Subir `versionCode` en cada build que subas a Play Store.
