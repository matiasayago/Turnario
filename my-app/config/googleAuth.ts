// Configuración para Google Sign-In
export const googleAuthConfig = {
  // Configuración para desarrollo web
  webClientId: 'TU_WEB_CLIENT_ID_AQUI', // Reemplazar con tu Web Client ID de Google Cloud Console
  
  // Configuración para iOS
  iosClientId: 'TU_IOS_CLIENT_ID_AQUI', // Reemplazar con tu iOS Client ID
  
  // Configuración para Android
  androidClientId: 'TU_ANDROID_CLIENT_ID_AQUI', // Reemplazar con tu Android Client ID
  
  // Scopes solicitados
  scopes: [
    'profile',
    'email'
  ],
  
  // Configuración adicional
  offlineAccess: true,
  hostedDomain: '',
  loginHint: '',
  
  // URLs de redirección (para web)
  redirectUrls: [
    'https://auth.expo.io/@tu-usuario/tu-app',
    'http://localhost:8081',
    'http://localhost:8082'
  ]
};

// Función para obtener la configuración según la plataforma
export const getGoogleAuthConfig = () => {
  // Aquí puedes agregar lógica para diferentes entornos
  return googleAuthConfig;
};

// Función para inicializar Google Sign-In
export const initializeGoogleSignIn = async () => {
  try {
    // Aquí iría la inicialización real de Google Sign-In
    console.log('🔧 Google Sign-In inicializado');
    return true;
  } catch (error) {
    console.error('❌ Error inicializando Google Sign-In:', error);
    return false;
  }
};

// Función para obtener información del usuario de Google
export const getGoogleUserInfo = async (accessToken: string) => {
  try {
    // Aquí harías una llamada a la API de Google para obtener información del usuario
    const response = await fetch(`https://www.googleapis.com/oauth2/v2/userinfo?access_token=${accessToken}`);
    const userInfo = await response.json();
    
    return {
      id: userInfo.id,
      email: userInfo.email,
      fullName: userInfo.name,
      firstName: userInfo.given_name,
      lastName: userInfo.family_name,
      picture: userInfo.picture,
      locale: userInfo.locale
    };
  } catch (error) {
    console.error('❌ Error obteniendo información del usuario de Google:', error);
    throw error;
  }
};

