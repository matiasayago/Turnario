# Build environments checklist

## Profiles

- `preview`: internal APK for QA on local network (LAN).
- `production`: store build with public HTTPS backend.

## Before `preview` build

- Confirm backend running on PC (`http://<LAN_IP>:3001`).
- Confirm phone and PC are on same Wi-Fi.
- Update `preview.env` in `eas.json` with current LAN IP if it changed.
- Build command:
  - `npx eas-cli@latest build --platform android --profile preview --clear-cache`

## Before `production` build

- Replace `https://api.tudominio.com` / `wss://api.tudominio.com` in `production.env`.
- Verify backend has valid SSL certificate.
- Ensure API and WebSocket routes are reachable from internet.
- Build command:
  - `npx eas-cli@latest build --platform android --profile production --clear-cache`

## Quick validation after install

- Login works.
- No error mentions `localhost`.
- Push/WebSocket features connect correctly.
