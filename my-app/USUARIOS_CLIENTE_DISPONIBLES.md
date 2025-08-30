# 📋 Usuarios Cliente Disponibles para Testing

## 🔐 Credenciales de Acceso

### Usuarios Cliente Existentes:
1. **cliente@turnario.com** - Juan Pérez
2. **ana.martinez@email.com** - Ana Martínez
3. **demo@turnario.com** - Usuario Demo

### 🆕 Nuevos Usuarios Cliente Agregados:

#### Cliente 003-010:
- **maria.gonzalez@email.com** - María González
- **carlos.ruiz@email.com** - Carlos Ruiz
- **luis.rodriguez@email.com** - Luis Rodríguez
- **patricia.lopez@email.com** - Patricia López
- **roberto.silva@email.com** - Roberto Silva
- **carmen.herrera@email.com** - Carmen Herrera
- **fernando.vargas@email.com** - Fernando Vargas
- **sofia.morales@email.com** - Sofía Morales

#### Cliente 011-020:
- **diego.torres@email.com** - Diego Torres
- **valentina.castro@email.com** - Valentina Castro
- **gabriel.herrera@email.com** - Gabriel Herrera
- **camila.ruiz@email.com** - Camila Ruiz
- **mateo.silva@email.com** - Mateo Silva
- **isabella.mendoza@email.com** - Isabella Mendoza
- **santiago.lopez@email.com** - Santiago López
- **lucia.fernandez@email.com** - Lucía Fernández
- **julian.gonzalez@email.com** - Julián González
- **emma.martinez@email.com** - Emma Martínez

## 📱 Información de Contacto

Todos los usuarios cliente tienen:
- **Teléfonos argentinos** con formato +54911XXXXXXXX
- **IDs únicos** del formato `cliente_XXX`
- **Tipo de usuario**: `client`

## 🧪 Cómo Usar para Testing

### 1. Login Directo:
```
Email: maria.gonzalez@email.com
Password: (cualquier contraseña funciona en modo demo)
```

### 2. Registro de Nuevos Usuarios:
```
Email: nuevo.cliente@email.com
Full Name: Nuevo Cliente
Phone: +5491100000000
User Type: client
```

### 3. Cambio de Usuario:
- Usar la función `toggleUserType()` para cambiar entre cliente y profesional
- Los usuarios profesionales mantienen su tipo original

## 🔄 Funcionalidades Disponibles

### Como Cliente:
- ✅ Reservar citas con seña
- ✅ Seleccionar servicios
- ✅ Elegir profesionales
- ✅ Pagar con MercadoPago
- ✅ Ver historial de citas
- ✅ Recibir notificaciones

### Como Profesional:
- ✅ Ver agenda de citas
- ✅ Gestionar pacientes
- ✅ Configurar horarios
- ✅ Recibir notificaciones de citas

## 📝 Notas Importantes

- **Modo Demo**: La app funciona en modo demo, por lo que cualquier contraseña es válida
- **Persistencia**: Los datos se guardan en AsyncStorage local
- **Sin Backend**: Todas las operaciones son simuladas localmente
- **Testing**: Ideal para probar todas las funcionalidades de la app

## 🚀 Próximos Pasos

1. **Probar login** con diferentes usuarios cliente
2. **Verificar funcionalidades** del modal de reserva con seña
3. **Testear integración** con MercadoPago
4. **Validar notificaciones** y flujo completo de citas

---

**Total de Usuarios Cliente Disponibles: 20** 🎯

