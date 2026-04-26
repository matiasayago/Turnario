# 🗄️ Configuración de Base de Datos MongoDB

Este documento te guía a través de la configuración completa de la base de datos MongoDB para el proyecto Turnario.

## 📋 Opciones de Configuración

### 1. 🚀 MongoDB Atlas (Recomendado - En la nube)

**Ventajas:**
- ✅ No requiere instalación local
- ✅ Acceso desde cualquier lugar
- ✅ Backup automático
- ✅ Escalable
- ✅ Gratuito hasta 512MB

**Pasos:**

1. **Crear cuenta en MongoDB Atlas:**
   ```bash
   # Ejecutar el script interactivo
   npm run setup-atlas
   ```

2. **Seguir las instrucciones en pantalla:**
   - Ve a https://www.mongodb.com/atlas
   - Crea una cuenta gratuita
   - Crea un cluster gratuito
   - Configura acceso de red (0.0.0.0/0 para desarrollo)
   - Crea un usuario de base de datos
   - Copia la cadena de conexión

3. **El script automáticamente:**
   - Actualiza el archivo `.env`
   - Prueba la conexión
   - Crea todas las tablas e índices
   - Pobla con datos de prueba

### 2. 💻 MongoDB Local

**Requisitos:**
- MongoDB instalado localmente
- Servicio MongoDB ejecutándose

**Pasos:**

1. **Instalar MongoDB:**
   - **Windows:** Descargar desde https://www.mongodb.com/try/download/community
   - **macOS:** `brew install mongodb-community`
   - **Linux:** `sudo apt install mongodb`

2. **Iniciar MongoDB:**
   ```bash
   # Windows (como servicio)
   net start MongoDB
   
   # macOS/Linux
   sudo systemctl start mongod
   ```

3. **Configurar la base de datos:**
   ```bash
   npm run setup-db
   ```

### 3. 🐳 MongoDB con Docker

**Pasos:**

1. **Crear archivo docker-compose.yml:**
   ```yaml
   version: '3.8'
   services:
     mongodb:
       image: mongo:latest
       container_name: turnario-mongodb
       restart: always
       environment:
         MONGO_INITDB_ROOT_USERNAME: admin
         MONGO_INITDB_ROOT_PASSWORD: password123
         MONGO_INITDB_DATABASE: turnario
       ports:
         - "27017:27017"
       volumes:
         - mongodb_data:/data/db
   
   volumes:
     mongodb_data:
   ```

2. **Iniciar MongoDB:**
   ```bash
   docker-compose up -d
   ```

3. **Configurar la base de datos:**
   ```bash
   npm run setup-db
   ```

## 🛠️ Scripts Disponibles

### Configuración Inicial
```bash
# Configuración interactiva con MongoDB Atlas
npm run setup-atlas

# Configuración con MongoDB local
npm run setup-db

# Configuración para desarrollo
npm run setup-db:dev
```

### Mantenimiento
```bash
# Resetear base de datos (elimina todos los datos)
npm run reset-db

# Solo poblar datos (sin crear índices)
npm run seed
```

## 📊 Estructura de la Base de Datos

### Colecciones Creadas

1. **users** - Usuarios del sistema
   - Clientes, profesionales, administradores
   - Información de perfil y autenticación

2. **categories** - Categorías de servicios
   - Psicología, Medicina General, Odontología, etc.
   - Configuración de características

3. **services** - Servicios ofrecidos
   - Consultas, terapias, tratamientos
   - Precios, duración, disponibilidad

4. **clinics** - Clínicas y centros médicos
   - Información de contacto y ubicación
   - Servicios disponibles

5. **appointments** - Citas programadas
   - Fechas, horarios, estados
   - Relaciones con usuarios y servicios

6. **bookings** - Reservas de citas
   - Confirmaciones y pagos
   - Estados de reserva

7. **notifications** - Notificaciones del sistema
   - Recordatorios, confirmaciones
   - TTL de 90 días

8. **payments** - Pagos y transacciones
   - Estados de pago
   - Métodos de pago

9. **reviews** - Reseñas y calificaciones
   - Comentarios de usuarios
   - Calificaciones de servicios

### Índices Creados

- **Búsqueda por email y teléfono** (usuarios)
- **Búsqueda geográfica** (clínicas, usuarios)
- **Búsqueda por fecha** (citas, reservas)
- **Búsqueda por estado** (citas, pagos, notificaciones)
- **Índices de texto** (búsqueda en direcciones)
- **TTL para notificaciones** (limpieza automática)

## 🌱 Datos de Prueba Incluidos

### Usuarios
- **Dr. Carlos Mendoza** (Psicólogo)
- **Dra. María González** (Médica General)
- **Ana Martínez** (Cliente)
- **Luis Rodríguez** (Cliente)
- **Admin Turnario** (Administrador)

### Categorías
- Psicología
- Medicina General
- Odontología
- Fisioterapia
- Nutrición
- Dermatología
- Ginecología
- Pediatría

### Clínicas
- Centro Médico Turnario
- Clínica Psicológica Buenos Aires

### Servicios
- Consulta Psicológica Individual
- Consulta Médica General
- Terapia de Pareja

## 🔧 Variables de Entorno

### Requeridas
```env
MONGODB_URI=mongodb://localhost:27017/turnario
```

### Opcionales
```env
NODE_ENV=development
PORT=3001
JWT_SECRET=tu_jwt_secret_aqui
JWT_REFRESH_SECRET=tu_refresh_secret_aqui
```

## 🚨 Solución de Problemas

### Error de Conexión
```bash
# Verificar que MongoDB esté ejecutándose
mongosh --eval "db.runCommand('ping')"

# Verificar la cadena de conexión
echo $MONGODB_URI
```

### Error de Permisos
```bash
# En MongoDB Atlas, verificar:
# 1. IP en lista blanca
# 2. Usuario y contraseña correctos
# 3. Cluster activo
```

### Error de Índices
```bash
# Recrear índices
npm run setup-db
```

## 📈 Monitoreo

### Verificar Estado
```bash
# Conectar a MongoDB
mongosh "mongodb://localhost:27017/turnario"

# Ver colecciones
show collections

# Ver estadísticas
db.stats()

# Ver índices
db.users.getIndexes()
```

### Logs
```bash
# Ver logs de MongoDB
tail -f /var/log/mongodb/mongod.log

# Ver logs de la aplicación
npm run dev
```

## 🔄 Backup y Restauración

### Backup
```bash
# Backup completo
mongodump --uri="mongodb://localhost:27017/turnario" --out=./backup

# Backup de colección específica
mongoexport --uri="mongodb://localhost:27017/turnario" --collection=users --out=users.json
```

### Restauración
```bash
# Restaurar backup completo
mongorestore --uri="mongodb://localhost:27017/turnario" ./backup

# Restaurar colección específica
mongoimport --uri="mongodb://localhost:27017/turnario" --collection=users --file=users.json
```

## ✅ Verificación

Después de la configuración, verifica que todo funcione:

```bash
# 1. Probar conexión
npm run setup-db

# 2. Verificar datos
mongosh "mongodb://localhost:27017/turnario" --eval "db.users.countDocuments()"

# 3. Iniciar servidor
npm start

# 4. Probar API
curl http://localhost:3001/api/health
```

## 🎯 Próximos Pasos

1. ✅ Configurar base de datos
2. 🔄 Conectar frontend con backend
3. 🔄 Implementar autenticación
4. 🔄 Funcionalidades core
5. 🔄 Testing y pulido

---

**¿Necesitas ayuda?** Revisa los logs o ejecuta `npm run setup-atlas` para configuración interactiva.

