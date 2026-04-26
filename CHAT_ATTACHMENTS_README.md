# 📎 Funcionalidades de Adjuntos del Chat

## 🎯 Descripción General

El sistema de chat ahora incluye funcionalidades completas para adjuntar diferentes tipos de contenido a los mensajes:

- **📸 Imágenes** - Selección desde galería con edición
- **📄 Archivos** - Documentos de cualquier tipo
- **📍 Ubicación** - Compartir ubicación actual con dirección
- **👤 Contactos** - Selección y compartición de contactos

## 🚀 Funcionalidades Implementadas

### 1. 📸 Adjuntar Imágenes

**Características:**
- Selección desde galería de fotos
- Edición de imagen (recorte cuadrado 1:1)
- Compresión automática (80% calidad)
- Preview en tiempo real
- Validación de permisos

**Flujo de uso:**
1. Tocar botón de adjuntar (➕)
2. Seleccionar "Foto"
3. Conceder permisos de galería
4. Seleccionar imagen
5. Editar si es necesario
6. Confirmar selección

### 2. 📄 Adjuntar Archivos

**Características:**
- Soporte para cualquier tipo de archivo
- Selector nativo de documentos
- Información de tamaño y tipo MIME
- Preview del nombre del archivo
- Botón de descarga

**Flujo de uso:**
1. Tocar botón de adjuntar (➕)
2. Seleccionar "Archivo"
3. Conceder permisos de archivos
4. Seleccionar documento
5. Ver preview del archivo
6. Enviar mensaje

### 3. 📍 Compartir Ubicación

**Características:**
- Obtención de ubicación GPS actual
- Alta precisión de ubicación
- Geocodificación inversa (coordenadas → dirección)
- Formato legible de dirección
- Timestamp de la ubicación

**Flujo de uso:**
1. Tocar botón de adjuntar (➕)
2. Seleccionar "Ubicación"
3. Conceder permisos de ubicación
4. Esperar obtención de coordenadas
5. Ver dirección generada
6. Enviar ubicación

### 4. 👤 Compartir Contactos

**Características:**
- Selector nativo de contactos
- Información completa del contacto
- Números de teléfono y emails
- Información de empresa y cargo
- Formato estructurado

**Flujo de uso:**
1. Tocar botón de adjuntar (➕)
2. Seleccionar "Contacto"
3. Conceder permisos de contactos
4. Seleccionar contacto
5. Ver información del contacto
6. Enviar contacto

## 🛠️ Implementación Técnica

### Dependencias Instaladas

```bash
npm install expo-image-picker expo-document-picker expo-location expo-contacts
```

### Componentes Principales

#### ChatInput.tsx
- Manejo de selección de adjuntos
- Preview de adjuntos seleccionados
- Validación de permisos
- Gestión de estado de adjuntos

#### ChatMessage.tsx
- Renderizado de diferentes tipos de mensajes
- Soporte para imágenes, archivos y texto
- Manejo de errores de carga
- Indicadores de estado

### Estructura de Datos

#### ChatAttachment Interface
```typescript
interface ChatAttachment {
  type: 'image' | 'file' | 'location' | 'contact';
  data: any;
  preview?: string;
  name?: string;
  size?: number;
}
```

#### Tipos de Adjuntos

**Imagen:**
```typescript
{
  type: 'image',
  data: {
    uri: string,
    width: number,
    height: number,
    type: string
  },
  preview: string,
  name: string,
  size: number
}
```

**Archivo:**
```typescript
{
  type: 'file',
  data: {
    uri: string,
    name: string,
    size: number,
    mimeType: string
  },
  name: string,
  size: number
}
```

**Ubicación:**
```typescript
{
  type: 'location',
  data: {
    latitude: number,
    longitude: number,
    address: string,
    timestamp: string
  },
  preview: string,
  name: string
}
```

**Contacto:**
```typescript
{
  type: 'contact',
  data: {
    id: string,
    name: string,
    phoneNumbers: Array,
    emails: Array,
    company: string,
    jobTitle: string
  },
  preview: string,
  name: string
}
```

## 🔐 Permisos Requeridos

### Android (AndroidManifest.xml)
```xml
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.READ_CONTACTS" />
```

### iOS (Info.plist)
```xml
<key>NSPhotoLibraryUsageDescription</key>
<string>Necesitamos acceso a tu galería para seleccionar imágenes</string>
<key>NSCameraUsageDescription</key>
<string>Necesitamos acceso a tu cámara para tomar fotos</string>
<key>NSLocationWhenInUseUsageDescription</key>
<string>Necesitamos acceso a tu ubicación para compartirla</string>
<key>NSContactsUsageDescription</key>
<string>Necesitamos acceso a tus contactos para compartirlos</string>
```

## 🎨 Características de UI/UX

### Preview de Adjuntos
- Visualización en tiempo real del adjunto seleccionado
- Información del archivo (nombre, tamaño)
- Botón para remover adjunto
- Placeholder personalizado en el input

### Estados del Botón de Envío
- Habilitado cuando hay texto o adjunto
- Deshabilitado cuando no hay contenido
- Cambio de color según estado

### Feedback Visual
- Alertas de confirmación para cada tipo de adjunto
- Indicadores de progreso durante la selección
- Manejo de errores con mensajes claros

## 🔄 Flujo de Mensajes

### 1. Selección de Adjunto
```
Usuario → Selecciona adjunto → Permisos → Preview → Confirmación
```

### 2. Envío de Mensaje
```
Adjunto + Texto → Validación → Envío → Limpieza de estado
```

### 3. Recepción y Visualización
```
Mensaje recibido → Parseo de tipo → Renderizado específico → UI
```

## 🚧 Funcionalidades Futuras

### Implementaciones Pendientes
- [ ] Subida de archivos al servidor
- [ ] Compresión de imágenes en el servidor
- [ ] Cache de adjuntos
- [ ] Búsqueda en mensajes con adjuntos
- [ ] Filtros por tipo de adjunto
- [ ] Vista previa de archivos PDF
- [ ] Reproducción de audio/video
- [ ] Compartir desde otras apps

### Mejoras de UX
- [ ] Drag & drop de archivos
- [ ] Selección múltiple de imágenes
- [ ] Grabación de audio in-app
- [ ] Captura de foto directa
- [ ] Escaneo de documentos

## 🐛 Solución de Problemas

### Errores Comunes

**Permisos denegados:**
- Verificar configuración de permisos en el dispositivo
- Revisar configuración de la app
- Solicitar permisos manualmente

**Imágenes no se cargan:**
- Verificar formato de imagen
- Comprobar permisos de almacenamiento
- Revisar URI de la imagen

**Ubicación no disponible:**
- Verificar GPS activado
- Comprobar permisos de ubicación
- Verificar conexión a internet para geocodificación

**Contactos no se cargan:**
- Verificar permisos de contactos
- Comprobar sincronización de contactos
- Revisar configuración de la app

## 📱 Compatibilidad

### Versiones Mínimas
- **Android:** API 21 (Android 5.0)
- **iOS:** iOS 13.0
- **Expo:** SDK 48+

### Dispositivos Soportados
- ✅ Smartphones Android
- ✅ iPhones
- ✅ Tablets Android
- ✅ iPads
- ⚠️ Emuladores (limitado)

## 📚 Recursos Adicionales

### Documentación Oficial
- [Expo Image Picker](https://docs.expo.dev/versions/latest/sdk/image-picker/)
- [Expo Document Picker](https://docs.expo.dev/versions/latest/sdk/document-picker/)
- [Expo Location](https://docs.expo.dev/versions/latest/sdk/location/)
- [Expo Contacts](https://docs.expo.dev/versions/latest/sdk/contacts/)

### Ejemplos de Código
- Ver `ChatInput.tsx` para implementación completa
- Ver `ChatMessage.tsx` para renderizado de adjuntos
- Ver `ChatContext.tsx` para manejo de estado

---

**Nota:** Esta implementación está optimizada para desarrollo y testing. Para producción, se recomienda implementar validaciones adicionales, manejo de errores robusto y integración con servicios de almacenamiento en la nube.
