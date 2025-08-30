# 🔐 Configuración de Google Sign-In para Turnario

## 📋 Requisitos Previos

1. **Cuenta de Google Cloud Console**
2. **Proyecto de Expo configurado**
3. **Dependencias instaladas** (ya completado)

## 🚀 Pasos para Configurar Google Sign-In

### 1. Configurar Google Cloud Console

#### 1.1 Crear Proyecto
- Ve a [Google Cloud Console](https://console.cloud.google.com/)
- Crea un nuevo proyecto o selecciona uno existente
- Habilita la API de Google+ API

#### 1.2 Configurar OAuth 2.0
- Ve a "APIs & Services" > "Credentials"
- Haz clic en "Create Credentials" > "OAuth 2.0 Client IDs"
- Selecciona "Web application" para desarrollo web
- Agrega las URLs de redirección autorizadas:
  ```
  http://localhost:8081
  http://localhost:8082
  https://auth.expo.io/@tu-usuario/tu-app
  ```

#### 1.3 Obtener Client IDs
- **Web Client ID**: Para desarrollo web
- **Android Client ID**: Para aplicación Android
- **iOS Client ID**: Para aplicación iOS

### 2. Actualizar Configuración

#### 2.1 Archivo de Configuración
Edita `my-app/config/googleAuth.ts` y reemplaza los placeholders:

```typescript
export const googleAuthConfig = {
  webClientId: 'TU_WEB_CLIENT_ID_REAL_AQUI',
  iosClientId: 'TU_IOS_CLIENT_ID_REAL_AQUI',
  androidClientId: 'TU_ANDROID_CLIENT_ID_REAL_AQUI',
  // ... resto de configuración
};
```

#### 2.2 Variables de Entorno (Opcional)
Crea un archivo `.env` en la raíz del proyecto:

```env
GOOGLE_WEB_CLIENT_ID=tu_web_client_id_aqui
GOOGLE_IOS_CLIENT_ID=tu_ios_client_id_aqui
GOOGLE_ANDROID_CLIENT_ID=tu_android_client_id_aqui
```

### 3. Configuración por Plataforma

#### 3.1 Web (Expo Web)
- No requiere configuración adicional
- Funciona con el Web Client ID

#### 3.2 Android
- Agregar SHA-1 fingerprint a Google Cloud Console
- Configurar `google-services.json` en el proyecto

#### 3.3 iOS
- Agregar Bundle ID a Google Cloud Console
- Configurar `GoogleService-Info.plist` en el proyecto

### 4. Implementación Real

#### 4.1 Reemplazar Simulación
En `my-app/contexts/AuthContext.tsx`, reemplaza la simulación:

```typescript
import { GoogleSignin } from '@react-native-google-signin/google-signin';

const loginWithGoogle = async (): Promise<boolean> => {
  try {
    setLoading(true);
    
    // Inicializar Google Sign-In
    await GoogleSignin.hasPlayServices();
    
    // Obtener usuario de Google
    const userInfo = await GoogleSignin.signIn();
    
    // Crear usuario de Turnario
    const turnarioUser: User = {
      id: userInfo.user.id,
      email: userInfo.user.email,
      fullName: userInfo.user.name,
      userType: 'client',
      phone: '+1234567890', // Por defecto
    };
    
    // Guardar y establecer usuario
    await AsyncStorage.setItem('user_data', JSON.stringify(turnarioUser));
    setUser(turnarioUser);
    
    return true;
  } catch (error) {
    console.error('Error en Google Sign-In:', error);
    return false;
  } finally {
    setLoading(false);
  }
};
```

#### 4.2 Configurar Google Sign-In
En tu componente principal o App.tsx:

```typescript
import { GoogleSignin } from '@react-native-google-signin/google-signin';

useEffect(() => {
  GoogleSignin.configure({
    webClientId: 'TU_WEB_CLIENT_ID_AQUI',
    iosClientId: 'TU_IOS_CLIENT_ID_AQUI',
    offlineAccess: true,
  });
}, []);
```

### 5. Pruebas

#### 5.1 Desarrollo
- El botón "Continuar con Google" ya está implementado
- Funciona con simulación para pruebas
- Verifica en la consola los logs de autenticación

#### 5.2 Producción
- Reemplaza la simulación con la implementación real
- Prueba en dispositivos reales
- Verifica el flujo completo de autenticación

## 🔧 Solución de Problemas

### Error: "Google Sign-In no está inicializado"
- Verifica que `initializeGoogleSignIn()` se ejecute correctamente
- Revisa la consola para errores de inicialización

### Error: "Client ID no válido"
- Verifica que el Client ID esté correctamente configurado
- Asegúrate de que las URLs de redirección estén autorizadas

### Error: "Play Services no disponibles" (Android)
- Verifica que Google Play Services esté actualizado
- Prueba en un dispositivo/emulador diferente

## 📱 Características Implementadas

✅ **Botón de Google Sign-In** en la pantalla de login
✅ **Estados de carga** para el botón de Google
✅ **Manejo de errores** y feedback al usuario
✅ **Integración con AuthContext** existente
✅ **Simulación funcional** para desarrollo
✅ **Configuración preparada** para implementación real
✅ **Estilos consistentes** con el diseño de la app

## 🎯 Próximos Pasos

1. **Configurar Google Cloud Console** con tus credenciales
2. **Reemplazar Client IDs** en la configuración
3. **Implementar autenticación real** reemplazando la simulación
4. **Probar en dispositivos reales** (Android/iOS)
5. **Configurar manejo de errores** específicos de Google

## 📚 Recursos Adicionales

- [Documentación oficial de Google Sign-In](https://developers.google.com/identity/sign-in/android)
- [Expo Auth Session](https://docs.expo.dev/versions/latest/sdk/auth-session/)
- [React Native Google Sign-In](https://github.com/react-native-google-signin/google-signin)

---

**Nota**: Esta implementación incluye una simulación funcional para desarrollo. Para producción, reemplaza la simulación con la implementación real de Google Sign-In.

