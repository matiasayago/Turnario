# 🗄️ Configuración de Base de Datos Turnario

## **📋 Requisitos Previos**

### **1. MongoDB Instalado**
- **Opción A**: MongoDB Community Server (local)
- **Opción B**: MongoDB Atlas (nube gratuita)

### **2. Node.js y npm**
- Versión 18.0.0 o superior
- npm instalado

## **🚀 Pasos para Configurar la Base de Datos**

### **Paso 1: Crear Archivo de Configuración**

Crea el archivo `.env` en la carpeta `backend/` con este contenido:

```env
# Configuración del Servidor
PORT=3001
NODE_ENV=development

# Base de Datos MongoDB
MONGODB_URI=mongodb://localhost:27017/turnario_dev
MONGODB_URI_PROD=mongodb+srv://username:password@cluster.mongodb.net/turnario

# JWT (JSON Web Token)
JWT_SECRET=turnario_jwt_secret_super_seguro_2024
JWT_EXPIRES_IN=7d

# Google OAuth (configurar después)
GOOGLE_CLIENT_ID=tu_google_client_id
GOOGLE_CLIENT_SECRET=tu_google_client_secret

# Email (configurar después)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=tu_email@gmail.com
EMAIL_PASS=tu_app_password
EMAIL_FROM=noreply@turnario.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS
CORS_ORIGIN=http://localhost:3000,http://localhost:8081,http://localhost:8082

# Logs
LOG_LEVEL=info
```

### **Paso 2: Instalar Dependencias**

```bash
cd backend
npm install
```

### **Paso 3: Configurar MongoDB**

#### **Opción A: MongoDB Local**
1. Descargar MongoDB Community Server
2. Instalar y configurar como servicio
3. Crear base de datos `turnario_dev`

#### **Opción B: MongoDB Atlas**
1. Ir a https://www.mongodb.com/atlas
2. Crear cuenta gratuita
3. Crear cluster gratuito
4. Obtener URI de conexión
5. Actualizar `MONGODB_URI` en `.env`

### **Paso 4: Inicializar Base de Datos**

```bash
cd backend
node init-database.js
```

**Resultado esperado:**
```
🚀 Inicializando base de datos Turnario...
✅ Conectado a MongoDB
🧹 Base de datos limpiada
✅ 5 servicios creados
✅ 2 clínicas creadas
✅ 4 usuarios creados

🎉 Base de datos inicializada exitosamente!
📊 Resumen:
   • 5 servicios
   • 2 clínicas
   • 4 usuarios

🔑 Usuarios de prueba creados:
   • Profesionales:
     - dr.carlos.mendoza@turnario.com (password: password123)
     - dra.ana.martinez@turnario.com (password: password123)
   • Clientes:
     - maria.gonzalez@email.com (password: password123)
     - carlos.rodriguez@email.com (password: password123)
```

### **Paso 5: Agregar Usuarios Cliente Adicionales (Opcional)**

```bash
cd backend
node add-more-clients.js
```

**Resultado esperado:**
```
🚀 Agregando usuarios cliente adicionales...
✅ Conectado a MongoDB
✅ 8 usuarios cliente adicionales creados

👥 Usuarios cliente creados:
   • Ana Martínez - ana.martinez@email.com (password: password123)
   • Luis Fernández - luis.fernandez@email.com (password: password123)
   • Elena Silva - elena.silva@email.com (password: password123)
   • Roberto Fernández - roberto.fernandez@email.com (password: password123)
   • Carmen Ruiz - carmen.ruiz@email.com (password: password123)
   • Diego Morales - diego.morales@email.com (password: password123)
   • Sofía Herrera - sofia.herrera@email.com (password: password123)
   • Javier Castro - javier.castro@email.com (password: password123)

🎉 Usuarios cliente agregados exitosamente!
📊 Total de usuarios cliente en la base de datos: 10
```

### **Paso 6: Iniciar el Servidor**

```bash
cd backend
npm run dev
```

**Resultado esperado:**
```
🚀 Servidor Turnario ejecutándose en puerto 3001
📱 API disponible en: http://localhost:3001
🔍 Health check: http://localhost:3001/health
🌍 Entorno: development
```

## **🔍 Verificar la Configuración**

### **1. Health Check**
```bash
curl http://localhost:3001/health
```

**Respuesta esperada:**
```json
{
  "status": "OK",
  "message": "Turnario API funcionando correctamente",
  "timestamp": "2024-01-XX...",
  "environment": "development",
  "version": "1.0.0"
}
```

### **2. Verificar Base de Datos**
- Conectar a MongoDB
- Verificar que existe la base de datos `turnario_dev`
- Verificar que existen las colecciones: `users`, `services`, `clinics`, `appointments`

## **📊 Estructura de la Base de Datos**

### **Colección: users**
- **Profesionales**: 2 usuarios
- **Clientes**: 10 usuarios
- **Admin**: 0 usuarios (crear manualmente si es necesario)

### **Colección: services**
- **Consulta Psicológica**: $15,000 - 50 min
- **Terapia Cognitivo-Conductual**: $18,000 - 60 min
- **Terapia Familiar**: $22,000 - 90 min
- **Psicología Infantil**: $12,000 - 45 min
- **Terapia de Pareja**: $25,000 - 90 min

### **Colección: clinics**
- **Centro Médico Palermo**: Av. Santa Fe 1234
- **Consultorio Belgrano**: Av. Cabildo 567

## **🚨 Solución de Problemas**

### **Error: "MongoDB connection failed"**
- Verificar que MongoDB esté ejecutándose
- Verificar la URI de conexión en `.env`
- Verificar que la base de datos exista

### **Error: "Module not found"**
- Ejecutar `npm install` en la carpeta `backend`
- Verificar que todos los modelos estén en `src/models/`

### **Error: "Port already in use"**
- Cambiar el puerto en `.env` (ej: `PORT=3002`)
- O terminar el proceso que esté usando el puerto 3001

## **🔗 Próximos Pasos**

1. **Integrar con Frontend**: Crear servicios API en React Native
2. **Implementar Autenticación**: JWT y Google OAuth
3. **Configurar Email**: Nodemailer para notificaciones
4. **Implementar MercadoPago**: Integración real de pagos

## **📞 Soporte**

Si tienes problemas durante la configuración:
1. Verificar logs del servidor
2. Verificar conexión a MongoDB
3. Verificar archivo `.env`
4. Revisar este documento paso a paso

