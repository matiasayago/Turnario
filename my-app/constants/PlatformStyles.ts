import { Platform, Dimensions } from 'react-native';

// Obtener dimensiones de la pantalla
const { width, height } = Dimensions.get('window');

// Detectar si es web
export const isWeb = Platform.OS === 'web';

// Detectar si es móvil
export const isMobile = Platform.OS === 'ios' || Platform.OS === 'android';

// Detectar si es tablet (ancho > 768px)
export const isTablet = width > 768;

// Detectar si es desktop (ancho > 1024px)
export const isDesktop = width > 1024;

// Estilos base para todas las plataformas
export const baseStyles = {
  // Espaciado
  spacing: {
    xs: isWeb ? 4 : 3,
    sm: isWeb ? 8 : 6,
    md: isWeb ? 16 : 12,
    lg: isWeb ? 24 : 18,
    xl: isWeb ? 32 : 24,
    xxl: isWeb ? 48 : 36,
  },
  
  // Tamaños de fuente
  fontSize: {
    xs: isWeb ? 10 : 9,
    sm: isWeb ? 12 : 11,
    md: isWeb ? 14 : 13,
    lg: isWeb ? 16 : 14,
    xl: isWeb ? 18 : 16,
    xxl: isWeb ? 24 : 22,
    xxxl: isWeb ? 32 : 28,
  },
  
  // Bordes
  borderRadius: {
    sm: isWeb ? 4 : 3,
    md: isWeb ? 8 : 6,
    lg: isWeb ? 12 : 8,
    xl: isWeb ? 16 : 12,
    round: isWeb ? 50 : 25,
  },
  
  // Sombras (web vs móvil)
  shadow: isWeb ? {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  } : {
    elevation: 3,
  },
  
  // Layout responsivo
  layout: {
    maxWidth: isTablet ? '80%' : '100%',
    containerPadding: isTablet ? 30 : 20,
    sectionPadding: isTablet ? 24 : 16,
  },
  
  // Colores adaptativos
  colors: {
    primary: '#667eea',
    secondary: '#764ba2',
    success: '#28a745',
    warning: '#ffc107',
    danger: '#dc3545',
    info: '#17a2b8',
    light: '#f8f9fa',
    dark: '#343a40',
    white: '#ffffff',
    black: '#000000',
    gray: {
      100: '#f8f9fa',
      200: '#e9ecef',
      300: '#dee2e6',
      400: '#ced4da',
      500: '#adb5bd',
      600: '#6c757d',
      700: '#495057',
      800: '#343a40',
      900: '#212529',
    },
  },
};

// Función para obtener estilos condicionales
export const getPlatformStyle = (webStyle: any, mobileStyle: any) => {
  return isWeb ? webStyle : mobileStyle;
};

// Función para obtener estilos responsivos
export const getResponsiveStyle = (mobile: any, tablet: any, desktop: any) => {
  if (isDesktop) return desktop;
  if (isTablet) return tablet;
  return mobile;
};

// Función para obtener padding adaptativo
export const getAdaptivePadding = (size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl') => {
  return baseStyles.spacing[size];
};

// Función para obtener tamaño de fuente adaptativo
export const getAdaptiveFontSize = (size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | 'xxxl') => {
  return baseStyles.fontSize[size];
};

// Función para obtener borde adaptativo
export const getAdaptiveBorderRadius = (size: 'sm' | 'md' | 'lg' | 'xl' | 'round') => {
  return baseStyles.borderRadius[size];
};

export default baseStyles;
