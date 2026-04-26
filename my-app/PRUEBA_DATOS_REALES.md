# 🧪 Prueba de la App con Datos Reales

## ✅ Estado Actual
- ✅ Backend conectado a MongoDB "turnario"
- ✅ Datos de prueba insertados en la base de datos
- ✅ Frontend configurado para usar backend real
- ✅ Servicios de autenticación y citas funcionando

## 🔑 Credenciales de Prueba

### Profesionales
- **Dr. Carlos Mendoza**
  - Email: `carlos.mendoza@turnario.com`
  - Password: `password123`
  - Especialidad: Psicología

- **Dra. María González**
  - Email: `maria.gonzalez@turnario.com`
  - Password: `password123`
  - Especialidad: Psiquiatría

### Clientes
- **Ana Martínez**
  - Email: `ana.martinez@email.com`
  - Password: `password123`

- **Juan Pérez**
  - Email: `juan.perez@email.com`
  - Password: `password123`

## 📊 Datos Disponibles en la Base de Datos

### Servicios
1. **Consulta Psicológica** - $10,000 ARS (50 min)
2. **Consulta Psiquiátrica** - $15,000 ARS (40 min)
3. **Terapia de Pareja** - $12,000 ARS (60 min)

### Clínicas
- **Centro de Salud Mental Buenos Aires**
  - Dirección: Av. Corrientes 1234, CABA
  - Teléfono: +54 11 1234-5678

### Citas Existentes
- Ana Martínez → Dr. Carlos Mendoza (20/09/2024, 10:00) - Confirmada
- Juan Pérez → Dra. María González (21/09/2024, 15:00) - Pendiente

### Notificaciones
- Cita confirmada para Ana Martínez
- Nueva solicitud de cita para Dra. María González

## 🚀 Cómo Probar la App

### 1. Iniciar la Aplicación
```bash
# En la terminal principal
npm start
```

### 2. Probar Login
1. Abre la app en Expo Go
2. Usa cualquiera de las credenciales de prueba
3. Verifica que el login funcione correctamente

### 3. Probar Funcionalidades

#### Como Cliente (Ana Martínez o Juan Pérez):
- ✅ Ver citas existentes
- ✅ Crear nuevas citas
- ✅ Ver notificaciones
- ✅ Ver historial médico
- ✅ Ver reseñas

#### Como Profesional (Dr. Carlos Mendoza o Dra. María González):
- ✅ Ver citas asignadas
- ✅ Confirmar/rechazar citas
- ✅ Ver notificaciones
- ✅ Configurar disponibilidad
- ✅ Ver estadísticas

### 4. Verificar Datos Reales
- Las citas se guardan en MongoDB
- Las notificaciones se crean automáticamente
- Los usuarios se autentican contra la base de datos
- Los servicios y clínicas se cargan desde MongoDB

## 🔍 Verificar Conexión a Base de Datos

### Backend Health Check
```bash
curl http://localhost:3001/api/v1/health
```

### Verificar Datos en MongoDB
```bash
# Conectar a MongoDB
mongosh

# Usar base de datos turnario
use turnario

# Ver colecciones
show collections

# Ver usuarios
db.users.find().pretty()

# Ver citas
db.appointments.find().pretty()

# Ver servicios
db.services.find().pretty()
```

## 🐛 Solución de Problemas

### Si el backend no responde:
1. Verificar que esté ejecutándose:
   ```bash
   Get-Process | Where-Object {$_.ProcessName -like "*node*"}
   ```

2. Reiniciar el backend:
   ```bash
   cd backend
   Start-Process -FilePath "node" -ArgumentList "server.js" -WindowStyle Hidden
   ```

### Si hay errores de conexión:
1. Verificar que MongoDB esté ejecutándose
2. Verificar la URL de conexión en `backend/.env`
3. Revisar los logs del backend

### Si los datos no aparecen:
1. Verificar que el script de datos se ejecutó correctamente
2. Revisar la conexión a la base de datos
3. Verificar que el frontend esté usando el backend real

## 📱 Funcionalidades a Probar

### ✅ Autenticación
- [ ] Login con credenciales reales
- [ ] Logout
- [ ] Registro de nuevos usuarios

### ✅ Gestión de Citas
- [ ] Ver citas existentes
- [ ] Crear nueva cita
- [ ] Confirmar cita (como profesional)
- [ ] Cancelar cita

### ✅ Notificaciones
- [ ] Ver notificaciones recibidas
- [ ] Marcar como leída
- [ ] Crear notificaciones automáticas

### ✅ Perfil de Usuario
- [ ] Ver información del perfil
- [ ] Actualizar datos personales
- [ ] Cambiar tipo de usuario

### ✅ Servicios y Clínicas
- [ ] Ver lista de servicios
- [ ] Ver información de clínicas
- [ ] Filtrar por especialidad

## 🎯 Próximos Pasos

1. **Probar todas las funcionalidades** con los datos reales
2. **Verificar que los datos se persistan** correctamente
3. **Probar el flujo completo** de creación de citas
4. **Verificar notificaciones** en tiempo real
5. **Probar pagos** con MercadoPago (modo sandbox)

---

**¡La app ahora está completamente conectada a datos reales de MongoDB!** 🎉
