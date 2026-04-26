# 🗄️ Configuración de MongoDB para Turnario

Esta guía te ayudará a configurar MongoDB para tu aplicación Turnario, tanto para desarrollo local como para producción con MongoDB Atlas.

## 📋 Tabla de Contenidos

- [Instalación Rápida](#-instalación-rápida)
- [Configuración Local](#-configuración-local)
- [Configuración con MongoDB Atlas](#-configuración-con-mongodb-atlas)
- [Scripts Disponibles](#-scripts-disponibles)
- [Verificación](#-verificación)
- [Solución de Problemas](#-solución-de-problemas)

## 🚀 Instalación Rápida

### Opción 1: Configuración Automática (Recomendado)

```bash
# Navegar al directorio backend
cd backend

# Ejecutar el configurador automático
npm run configure-mongodb
```

Este script te guiará paso a paso para configurar MongoDB local o Atlas.

### Opción 2: Instalación Manual

#### Windows
```bash
# Instalar MongoDB localmente
npm run install-mongodb

# O ejecutar el script directamente
powershell -ExecutionPolicy Bypass -File scripts/install-mongodb-windows.ps1
```

#### macOS/Linux
```bash
# Instalar MongoDB localmente
npm run install-mongodb:unix

# O ejecutar el script directamente
bash scripts/install-mongodb-unix.sh
```

## 🏠 Configuración Local

### Requisitos Previos

- **Windows**: PowerShell con permisos de administrador
- **macOS**: Homebrew instalado
- **Linux**: Ubuntu/Debian con apt-get

### Pasos de Instalación

1. **Instalar MongoDB**:
   ```bash
   # Windows
   npm run install-mongodb
   
   # macOS/Linux
   npm run install-mongodb:unix
   ```

2. **Configurar la aplicación**:
   ```bash
   npm run configure-mongodb
   ```

3. **Inicializar la base de datos**:
   ```bash
   npm run setup-db
   ```

### Verificar Instalación Local

```bash
# Verificar que MongoDB esté ejecutándose
# Windows
net start | findstr MongoDB

# macOS
brew services list | grep mongodb

# Linux
sudo systemctl status mongod

# Conectar a MongoDB
mongosh
```

## ☁️ Configuración con MongoDB Atlas

### 1. Crear Cuenta en Atlas

1. Ve a [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Crea una cuenta gratuita
3. Selecciona el plan gratuito (M0)

### 2. Crear Cluster

1. Haz clic en "Build a Database"
2. Selecciona "FREE" (M0 Sandbox)
3. Elige una región cercana
4. Nombra tu cluster (ej: "turnario-cluster")
5. Haz clic en "Create"

### 3. Configurar Acceso

#### Usuario de Base de Datos
1. Ve a "Security" > "Database Access"
2. Haz clic en "Add New Database User"
3. Crea un usuario con:
   - Username: `turnario-user`
   - Password: (genera una segura)
   - Database User Privileges: "Read and write to any database"

#### Acceso de Red
1. Ve a "Security" > "Network Access"
2. Haz clic en "Add IP Address"
3. Para desarrollo: "Allow access from anywhere" (0.0.0.0/0)
4. Para producción: Agrega solo las IPs necesarias

### 4. Obtener Cadena de Conexión

1. Haz clic en "Connect" en tu cluster
2. Selecciona "Connect your application"
3. Copia la cadena de conexión
4. Reemplaza `<password>` con la contraseña del usuario

### 5. Configurar en la Aplicación

```bash
# Ejecutar el configurador
npm run configure-mongodb

# Seleccionar opción 2 (MongoDB Atlas)
# Pegar la cadena de conexión cuando se solicite
```

## 🛠️ Scripts Disponibles

| Script | Descripción |
|--------|-------------|
| `npm run configure-mongodb` | Configurador interactivo de MongoDB |
| `npm run install-mongodb` | Instalar MongoDB en Windows |
| `npm run install-mongodb:unix` | Instalar MongoDB en macOS/Linux |
| `npm run setup-db` | Configurar base de datos y crear datos de prueba |
| `npm run setup-atlas` | Configurar específicamente para Atlas |
| `npm run test-connection` | Probar conexión a MongoDB |
| `npm run reset-db` | Resetear base de datos |
| `npm run seed` | Poblar solo con datos de prueba |

## ✅ Verificación

### 1. Probar Conexión

```bash
npm run test-connection
```

### 2. Verificar Datos

```bash
# Conectar a MongoDB
mongosh

# Cambiar a la base de datos
use turnario

# Ver colecciones
show collections

# Contar documentos
db.users.countDocuments()
db.categories.countDocuments()
db.services.countDocuments()
```

### 3. Probar API

```bash
# Iniciar el servidor
npm run dev

# En otra terminal, probar endpoints
curl http://localhost:3001/api/v1/health
curl http://localhost:3001/api/v1/categories
```

## 🔧 Solución de Problemas

### Error: "MongoDB no está ejecutándose"

**Windows:**
```bash
net start MongoDB
```

**macOS:**
```bash
brew services start mongodb-community
```

**Linux:**
```bash
sudo systemctl start mongod
```

### Error: "Connection refused"

1. Verifica que MongoDB esté ejecutándose
2. Verifica el puerto (por defecto: 27017)
3. Verifica la cadena de conexión en `.env`

### Error: "Authentication failed" (Atlas)

1. Verifica el usuario y contraseña
2. Verifica que tu IP esté en la lista blanca
3. Verifica que el usuario tenga permisos correctos

### Error: "Network timeout" (Atlas)

1. Verifica tu conexión a internet
2. Verifica que el cluster esté activo
3. Verifica la región del cluster

### Limpiar Instalación

**Windows:**
```bash
# Detener servicio
net stop MongoDB

# Desinstalar servicio
sc delete MongoDB

# Eliminar archivos
rmdir /s "C:\Program Files\MongoDB"
rmdir /s "C:\data"
```

**macOS:**
```bash
# Detener servicio
brew services stop mongodb-community

# Desinstalar
brew uninstall mongodb-community

# Limpiar archivos
rm -rf /usr/local/var/mongodb
rm -rf /usr/local/var/log/mongodb
```

**Linux:**
```bash
# Detener servicio
sudo systemctl stop mongod

# Desinstalar
sudo apt-get remove mongodb-org

# Limpiar archivos
sudo rm -rf /var/lib/mongodb
sudo rm -rf /var/log/mongodb
```

## 📊 Estructura de la Base de Datos

Después de ejecutar `npm run setup-db`, tendrás las siguientes colecciones:

- **users**: Usuarios del sistema (clientes, profesionales, admins)
- **categories**: Categorías de servicios
- **services**: Servicios ofrecidos
- **clinics**: Clínicas y centros médicos
- **appointments**: Citas programadas
- **bookings**: Reservas de citas
- **notifications**: Notificaciones del sistema
- **payments**: Pagos procesados
- **reviews**: Reseñas de servicios

## 🔐 Seguridad

### Variables de Entorno Importantes

```env
# Base de datos
MONGODB_URI=mongodb://localhost:27017/turnario

# JWT
JWT_SECRET=tu_secret_super_seguro
JWT_REFRESH_SECRET=tu_refresh_secret_super_seguro

# Criptografía
BCRYPT_ROUNDS=12
ENCRYPTION_KEY=tu_clave_de_32_caracteres
```

### Recomendaciones de Producción

1. **Nunca** uses las credenciales por defecto
2. **Cambia** todos los secrets en producción
3. **Usa** MongoDB Atlas para producción
4. **Configura** IP whitelist en Atlas
5. **Habilita** autenticación y autorización
6. **Usa** SSL/TLS para conexiones

## 📞 Soporte

Si tienes problemas con la configuración:

1. Revisa los logs en `backend/logs/`
2. Verifica la configuración en `.env`
3. Ejecuta `npm run test-connection`
4. Consulta la documentación de MongoDB

---

¡Listo! Tu MongoDB está configurado y listo para usar con Turnario. 🎉
