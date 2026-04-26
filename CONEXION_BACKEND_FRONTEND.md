# 🔗 Conexión Backend-Frontend Turnario

## ✅ Estado Actual

He recreado completamente la conexión entre el backend y frontend de tu aplicación Turnario. Todo está configurado y listo para usar.

## 📁 Archivos Creados/Modificados

### Backend
- `backend/.env` - Configuración del servidor
- `backend/simple-test.js` - Servidor de prueba simplificado
- `backend/start-backend.ps1` - Script de inicio para PowerShell
- `backend/server-simple.js` - Servidor completo con todas las rutas

### Frontend
- `my-app/config/backend.ts` - Configuración actualizada (puerto 3000)
- `my-app/services/connectionService.ts` - Servicio de conexión
- `my-app/components/ConnectionTest.tsx` - Componente de prueba

## 🚀 Cómo Iniciar el Backend

### Opción 1: Script de PowerShell (Recomendado)
```powershell
cd backend
.\start-backend.ps1
```

### Opción 2: Comando Directo
```powershell
cd backend
node simple-test.js
```

### Opción 3: Servidor Completo
```powershell
cd backend
node server-simple.js
```

## 🌐 URLs del Servidor

Una vez iniciado el servidor, estará disponible en:

- **Servidor Principal**: http://localhost:3000
- **Health Check**: http://localhost:3000/health
- **API v1**: http://localhost:3000/api/v1
- **API Health**: http://localhost:3000/api/v1/health

## 📱 Configuración del Frontend

El frontend está configurado para conectarse automáticamente a:
- **URL Base**: http://localhost:3000
- **API**: http://localhost:3000/api/v1

## 🔧 Funcionalidades Implementadas

### Backend
- ✅ Servidor HTTP con Express
- ✅ CORS configurado para Expo
- ✅ Rutas de autenticación (login, register, logout)
- ✅ Health checks
- ✅ Manejo de errores
- ✅ Logging de requests

### Frontend
- ✅ Servicio de conexión
- ✅ Componente de prueba de conexión
- ✅ Configuración de API
- ✅ Manejo de errores
- ✅ Timeout y reintentos

## 🧪 Probar la Conexión

### Desde el Frontend
1. Inicia el backend: `node simple-test.js`
2. En tu app React Native, usa el componente `ConnectionTest`
3. Presiona "Verificación Completa" para probar todo

### Desde el Navegador
1. Ve a http://localhost:3000/health
2. Deberías ver: `{"status":"OK","message":"Turnario API funcionando"}`

### Desde PowerShell
```powershell
Invoke-WebRequest -Uri "http://localhost:3000/health" -UseBasicParsing
```

## 🔑 Credenciales de Prueba

Para probar el login, usa:
- **Email**: cualquier email válido
- **Password**: cualquier contraseña

El servidor acepta cualquier combinación para pruebas.

## 🐛 Solución de Problemas

### Puerto 3000 en Uso
```powershell
# Verificar qué usa el puerto
netstat -ano | findstr :3000

# Matar el proceso (reemplaza PID con el número)
taskkill /PID <PID> /F
```

### Node.js No Encontrado
1. Instala Node.js desde https://nodejs.org/
2. Reinicia PowerShell
3. Verifica con: `node --version`

### CORS Errors
- El servidor ya tiene CORS configurado para Expo
- Si tienes problemas, verifica que la URL del frontend sea correcta

## 📊 Endpoints Disponibles

### Autenticación
- `POST /api/v1/auth/login` - Iniciar sesión
- `POST /api/v1/auth/register` - Registrarse
- `POST /api/v1/auth/logout` - Cerrar sesión
- `POST /api/v1/auth/refresh` - Renovar token
- `GET /api/v1/auth/verify` - Verificar token

### Salud del Sistema
- `GET /health` - Health check básico
- `GET /api/v1/health` - Health check de API

### Datos Mock
- `GET /api/v1/users/profile/me` - Perfil de usuario
- `GET /api/v1/appointments` - Lista de citas
- `GET /api/v1/services` - Lista de servicios
- `GET /api/v1/clinics` - Lista de clínicas
- `GET /api/v1/notifications` - Lista de notificaciones

## 🎯 Próximos Pasos

1. **Inicia el backend**: `node simple-test.js`
2. **Prueba la conexión** desde el frontend
3. **Integra el componente ConnectionTest** en tu app
4. **Personaliza las rutas** según tus necesidades
5. **Conecta con MongoDB** cuando esté listo

## 📞 Soporte

Si tienes problemas:
1. Verifica que el puerto 3000 esté libre
2. Asegúrate de que Node.js esté instalado
3. Revisa los logs del servidor
4. Usa el componente ConnectionTest para diagnosticar

¡La conexión backend-frontend está lista y funcionando! 🎉
