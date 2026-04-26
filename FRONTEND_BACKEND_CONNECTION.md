# 🔗 Conexión Frontend-Backend - Turnario

Esta guía te ayudará a conectar completamente el frontend (React Native/Expo) con el backend (Node.js/Express) de tu aplicación Turnario.

## 📋 Tabla de Contenidos

- [Configuración Inicial](#-configuración-inicial)
- [Variables de Entorno](#-variables-de-entorno)
- [Servicios de API](#-servicios-de-api)
- [Autenticación](#-autenticación)
- [Pruebas de Conexión](#-pruebas-de-conexión)
- [Solución de Problemas](#-solución-de-problemas)

## 🚀 Configuración Inicial

### 1. Configurar el Backend

```bash
# Navegar al directorio backend
cd backend

# Instalar dependencias
npm install

# Configurar MongoDB
npm run configure-mongodb

# Inicializar la base de datos
npm run setup-db

# Iniciar el servidor
npm run dev
```

### 2. Configurar el Frontend

```bash
# Navegar al directorio frontend
cd my-app

# Instalar dependencias
npm install

# Crear archivo de variables de entorno
cp env.example .env

# Editar variables de entorno
# Asegúrate de que EXPO_PUBLIC_BACKEND_URL=http://localhost:3001
```

## 🔧 Variables de Entorno

### Backend (.env)

```env
# Configuración del Servidor
NODE_ENV=development
PORT=3001

# Base de Datos
MONGODB_URI=mongodb://localhost:27017/turnario

# JWT
JWT_SECRET=dev_jwt_secret_turnario_2024_super_seguro
JWT_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=http://localhost:3000,http://localhost:8081,http://localhost:8082,http://localhost:19006,http://localhost:19000,exp://localhost:19000
```

### Frontend (.env)

```env
# Configuración del Backend
EXPO_PUBLIC_BACKEND_URL=http://localhost:3001
EXPO_PUBLIC_WEBSOCKET_URL=ws://localhost:3001

# Configuración de la Aplicación
EXPO_PUBLIC_APP_NAME=Turnario
EXPO_PUBLIC_APP_VERSION=1.0.0
EXPO_PUBLIC_APP_ENVIRONMENT=development
```

## 🌐 Servicios de API

### Configuración Base

El frontend está configurado con servicios modulares para cada endpoint:

- **authService**: Manejo de autenticación y tokens
- **userService**: Gestión de perfiles de usuario
- **appointmentService**: Gestión de citas
- **notificationService**: Sistema de notificaciones

### Ejemplo de Uso

```typescript
import { authService } from './services/authService';
import { userService } from './services/userService';

// Iniciar sesión
const login = async () => {
  try {
    const response = await authService.login({
      email: 'usuario@ejemplo.com',
      password: 'password123'
    });
    console.log('Usuario autenticado:', response.user);
  } catch (error) {
    console.error('Error de login:', error);
  }
};

// Obtener perfil
const getProfile = async () => {
  try {
    const profile = await userService.getProfile();
    console.log('Perfil:', profile);
  } catch (error) {
    console.error('Error obteniendo perfil:', error);
  }
};
```

## 🔐 Autenticación

### Contexto de Autenticación

El frontend usa un contexto de React para manejar el estado de autenticación:

```typescript
import { useAuth } from './contexts/AuthContext';

const MyComponent = () => {
  const { user, isAuthenticated, login, logout } = useAuth();

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return <DashboardScreen user={user} />;
};
```

### Manejo de Tokens

Los tokens se almacenan automáticamente en AsyncStorage y se renuevan automáticamente:

```typescript
// El servicio maneja automáticamente:
// - Almacenamiento de tokens
// - Renovación automática
// - Headers de autorización
// - Limpieza al cerrar sesión
```

## 🧪 Pruebas de Conexión

### 1. Probar Backend

```bash
# En el directorio backend
npm run test-frontend
```

Esto iniciará un servidor de prueba con endpoints específicos para verificar la conexión.

### 2. Probar Frontend

```typescript
// En el frontend, ejecutar:
import { testBackendConnection } from './test-backend-connection';

testBackendConnection();
```

### 3. Pruebas Manuales

```bash
# Probar endpoint de salud
curl http://localhost:3001/api/v1/health

# Probar endpoint de conexión
curl http://localhost:3001/api/v1/test-connection

# Probar CORS
curl -H "Origin: http://localhost:19006" http://localhost:3001/api/v1/test-cors
```

## 🔧 Solución de Problemas

### Error: "Network request failed"

**Causa**: El backend no está ejecutándose o la URL es incorrecta.

**Solución**:
1. Verifica que el backend esté ejecutándose: `npm run dev`
2. Verifica la URL en `.env`: `EXPO_PUBLIC_BACKEND_URL=http://localhost:3001`
3. Verifica que no haya firewall bloqueando el puerto 3001

### Error: "CORS policy"

**Causa**: Configuración de CORS incorrecta.

**Solución**:
1. Verifica que el origen del frontend esté en `CORS_ORIGIN`
2. Reinicia el servidor backend después de cambiar CORS
3. Verifica que el frontend use la URL correcta

### Error: "401 Unauthorized"

**Causa**: Token de autenticación inválido o expirado.

**Solución**:
1. Verifica que el usuario esté autenticado
2. Intenta hacer login nuevamente
3. Verifica que el token no haya expirado

### Error: "Connection refused"

**Causa**: El backend no está ejecutándose o hay problemas de red.

**Solución**:
1. Inicia el backend: `cd backend && npm run dev`
2. Verifica que el puerto 3001 esté disponible
3. Verifica la configuración de red

## 📱 Configuración para Diferentes Entornos

### Desarrollo Local

```env
# Backend
NODE_ENV=development
PORT=3001
MONGODB_URI=mongodb://localhost:27017/turnario

# Frontend
EXPO_PUBLIC_BACKEND_URL=http://localhost:3001
```

### Red Local (para probar en dispositivo físico)

```env
# Backend
NODE_ENV=development
PORT=3001
CORS_ORIGIN=http://192.168.1.100:19006,exp://192.168.1.100:19000

# Frontend
EXPO_PUBLIC_BACKEND_URL=http://192.168.1.100:3001
```

### Producción

```env
# Backend
NODE_ENV=production
PORT=3001
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/turnario

# Frontend
EXPO_PUBLIC_BACKEND_URL=https://api.turnario.com
```

## 🚀 Comandos Útiles

### Backend

```bash
# Iniciar servidor de desarrollo
npm run dev

# Probar conexión con frontend
npm run test-frontend

# Configurar MongoDB
npm run configure-mongodb

# Inicializar base de datos
npm run setup-db
```

### Frontend

```bash
# Iniciar Expo
npm start

# Ejecutar en Android
npm run android

# Ejecutar en iOS
npm run ios

# Ejecutar en web
npm run web
```

## 📊 Monitoreo y Logs

### Backend

Los logs se guardan en `backend/logs/`:
- `app.log`: Logs generales
- `error.log`: Errores
- `warn.log`: Advertencias

### Frontend

Los logs se muestran en la consola de Expo y en el dispositivo.

## 🔄 Flujo de Datos

1. **Frontend** hace petición a través de `api.ts`
2. **Servicio específico** (authService, userService, etc.) maneja la lógica
3. **Headers de autorización** se agregan automáticamente
4. **Backend** recibe la petición y la procesa
5. **Respuesta** se envía de vuelta al frontend
6. **Manejo de errores** se realiza de forma centralizada

## 🎯 Próximos Pasos

1. **Implementar WebSocket** para notificaciones en tiempo real
2. **Agregar caché** para mejorar el rendimiento
3. **Implementar offline support** con sincronización
4. **Agregar analytics** para monitoreo
5. **Configurar CI/CD** para despliegue automático

---

¡Listo! Tu frontend y backend están completamente conectados y funcionando. 🎉
