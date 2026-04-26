const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const WebSocket = require('ws');
require('dotenv').config();

// Importar configuración de base de datos
const connectDB = require('./config/database');

// Importar modelos
const User = require('./models/User');
const Appointment = require('./models/Appointment');
const Service = require('./models/Service');
const Clinic = require('./models/Clinic');
const Notification = require('./models/Notification');
const Review = require('./models/Review');
const ProfessionalAvailability = require('./models/ProfessionalAvailability');
const ProfessionalDateSchedule = require('./models/ProfessionalDateSchedule');

const app = express();
const PORT = process.env.PORT || 3001;

// Conectar a MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Los datos ahora se obtienen de MongoDB

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware de autenticación
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No hay token de autenticación' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido' });
    }
    req.user = user;
    next();
  });
};

// Rutas de autenticación
app.post('/api/v1/auth/login', async (req, res) => {
  try {
    console.log('📨 Login request received:', {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.body
    });
    
    const { email, password } = req.body;
    
    console.log('🔍 Login attempt:', { email, passwordLength: password?.length });
    
    // Buscar usuario en MongoDB
    const user = await User.findOne({ email: email.toLowerCase() });
    console.log('👤 User found:', user ? 'Yes' : 'No', user ? { id: user._id, email: user.email } : '');
    
    if (!user) {
      console.log('❌ User not found');
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Verificar contraseña
    console.log('🔐 Comparing password...');
    const validPassword = await bcrypt.compare(password, user.password);
    console.log('🔐 Password valid:', validPassword);
    
    if (!validPassword) {
      console.log('❌ Invalid password');
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Verificar si el usuario está activo
    if (!user.isActive) {
      return res.status(401).json({ error: 'Cuenta desactivada' });
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email, userType: user.userType },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        service: user.service,
        userType: user.userType,
        isActive: user.isActive,
        isEmailVerified: user.isEmailVerified,
        address: user.address,
        preferences: user.preferences,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      },
      token,
      refreshToken: token,
      expiresIn: 86400
    });
  } catch (error) {
    console.error('❌ Error en login:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.post('/api/v1/auth/register', async (req, res) => {
  try {
    const { fullName, email, password, userType, phone } = req.body;
    
    // Verificar si el usuario ya existe
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: 'El usuario ya existe' });
    }

    // Hashear contraseña
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Crear nuevo usuario en MongoDB
    const newUser = new User({
      fullName,
      email: email.toLowerCase(),
      password: hashedPassword,
      userType: userType || 'client',
      phone: phone || '',
      isActive: true,
      isEmailVerified: false
    });

    await newUser.save();

    const token = jwt.sign(
      { userId: newUser._id, email: newUser.email, userType: newUser.userType },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      user: {
        _id: newUser._id,
        fullName: newUser.fullName,
        email: newUser.email,
        userType: newUser.userType,
        isActive: newUser.isActive,
        isEmailVerified: newUser.isEmailVerified
      },
      token,
      refreshToken: token,
      expiresIn: 86400
    });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Rutas de usuarios
app.get('/api/v1/users', authenticateToken, async (req, res) => {
  try {
    const users = await User.find({ isActive: true }).select('-password');
    res.json({ users });
  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Endpoint sin autenticación para listar usuarios (modo desarrollo)
app.get('/api/v1/users/all', async (req, res) => {
  try {
    const users = await User.find().select('-password');
    console.log(`👥 Encontrados ${users.length} usuarios`);
    res.json({ 
      success: true,
      count: users.length,
      data: users 
    });
  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error interno del servidor' 
    });
  }
});

app.get('/api/v1/users/:id', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json(user);
  } catch (error) {
    console.error('Error obteniendo usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Actualizar perfil del usuario
app.put('/api/v1/users/profile', authenticateToken, async (req, res) => {
  try {
    console.log('📝 Actualizando perfil del usuario:', req.user.userId);
    console.log('📝 Datos recibidos:', req.body);
    
    const { fullName, phone, service, address, preferences } = req.body;
    
    // Validar que al menos un campo esté presente
    if (!fullName && !phone && !service && !address && !preferences) {
      return res.status(400).json({ error: 'Al menos un campo debe ser proporcionado para actualizar' });
    }
    
    // Buscar el usuario
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    // Actualizar solo los campos proporcionados
    const updateData = {};
    if (fullName !== undefined) updateData.fullName = fullName;
    if (phone !== undefined) updateData.phone = phone;
    if (service !== undefined) updateData.service = service;
    if (address !== undefined) updateData.address = address;
    if (preferences !== undefined) updateData.preferences = preferences;
    
    updateData.updatedAt = new Date();
    
    // Actualizar en la base de datos
    const updatedUser = await User.findByIdAndUpdate(
      req.user.userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');
    
    console.log('✅ Perfil actualizado en la base de datos:', updatedUser);
    
    res.json({
      message: 'Perfil actualizado exitosamente',
      user: updatedUser
    });
  } catch (error) {
    console.error('❌ Error actualizando perfil:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Rutas de citas
app.get('/api/v1/appointments', authenticateToken, async (req, res) => {
  try {
    const appointments = await Appointment.find()
      .populate('clientId', 'fullName email phone')
      .populate('professionalId', 'fullName email phone service')
      .populate('serviceId', 'name description price duration')
      .populate('clinicId', 'name address phone')
      .sort({ createdAt: -1 });
    
    res.json({ appointments });
  } catch (error) {
    console.error('Error obteniendo citas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.post('/api/v1/appointments', authenticateToken, async (req, res) => {
  try {
    console.log('📅 Creando cita:', req.body);
    console.log('👤 Usuario autenticado:', req.user);
    
    // Convertir strings a ObjectIds si es necesario
    const appointmentData = {
      ...req.body,
      clientId: req.user.userId,
      professionalId: req.body.professionalId ? new mongoose.Types.ObjectId(req.body.professionalId) : undefined,
      serviceId: req.body.serviceId ? new mongoose.Types.ObjectId(req.body.serviceId) : undefined,
      clinicId: req.body.clinicId ? new mongoose.Types.ObjectId(req.body.clinicId) : undefined
    };
    
    const newAppointment = new Appointment(appointmentData);

    console.log('📅 Objeto de cita creado:', newAppointment);
    await newAppointment.save();
    console.log('✅ Cita guardada en la base de datos');
    
    // Poblar los datos relacionados
    await newAppointment.populate([
      { path: 'clientId', select: 'fullName email phone' },
      { path: 'professionalId', select: 'fullName email phone service' },
      { path: 'serviceId', select: 'name description price duration' },
      { path: 'clinicId', select: 'name address phone' }
    ]);

    res.status(201).json(newAppointment);
  } catch (error) {
    console.error('Error creando cita:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Endpoint para listar todas las citas (sin autenticación - modo desarrollo)
app.get('/api/v1/appointments/all', async (req, res) => {
  try {
    const appointments = await Appointment.find()
      .sort({ createdAt: -1 });
    
    console.log(`📋 Encontradas ${appointments.length} citas en la base de datos`);
    
    res.json({ 
      success: true,
      count: appointments.length,
      data: appointments 
    });
  } catch (error) {
    console.error('Error obteniendo citas:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error interno del servidor' 
    });
  }
});

// Endpoint para obtener citas de un profesional específico (sin autenticación - modo desarrollo)
app.get('/api/v1/appointments/professional/:professionalId', async (req, res) => {
  try {
    const { professionalId } = req.params;
    console.log(`📋 Buscando citas del profesional: ${professionalId}`);
    
    let professionalObjectId;
    
    // Si professionalId es un número o string simple como "3", buscar por email
    if (professionalId === '3' || professionalId === 'prof_unknown') {
      console.log('🔍 Buscando profesional por email (carlos.mendoza@turnario.com)...');
      const professional = await User.findOne({ 
        email: 'carlos.mendoza@turnario.com',
        userType: 'professional'
      });
      
      if (professional) {
        professionalObjectId = professional._id;
        console.log(`✅ Profesional encontrado por email: ${professionalObjectId}`);
      }
    } else if (mongoose.Types.ObjectId.isValid(professionalId)) {
      // Si es un ObjectId válido, usarlo directamente
      professionalObjectId = new mongoose.Types.ObjectId(professionalId);
      console.log(`✅ Usando ObjectId directamente: ${professionalObjectId}`);
    } else {
      // Buscar por email o userId
      const professional = await User.findOne({
        $or: [
          { email: professionalId },
          { userId: professionalId }
        ],
        userType: 'professional'
      });
      
      if (professional) {
        professionalObjectId = professional._id;
        console.log(`✅ Profesional encontrado: ${professionalObjectId}`);
      }
    }
    
    if (!professionalObjectId) {
      console.log(`⚠️ Profesional no encontrado: ${professionalId}`);
      return res.json({ 
        success: true,
        count: 0,
        data: [] 
      });
    }
    
    const appointments = await Appointment.find({
      professionalId: professionalObjectId
    })
      .populate('clientId', 'fullName email phone')
      .sort({ date: 1, time: 1 });
    
    console.log(`📋 Encontradas ${appointments.length} citas para el profesional ${professionalObjectId}`);
    
    res.json({ 
      success: true,
      count: appointments.length,
      data: appointments 
    });
  } catch (error) {
    console.error('Error obteniendo citas del profesional:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error interno del servidor' 
    });
  }
});

// Endpoint sin autenticación para crear citas (modo desarrollo/profesionales)
app.post('/api/v1/appointments/create', async (req, res) => {
  try {
    console.log('📅 Creando cita (sin autenticación):', req.body);
    
    // 1. Buscar o crear usuario cliente
    let clientId = req.body.clientId;
    if (!clientId) {
      if (req.body.patientEmail) {
        // Buscar cliente por email
        const existingClient = await User.findOne({ email: req.body.patientEmail });
        if (existingClient) {
          clientId = existingClient._id;
          console.log('✅ Cliente encontrado por email:', clientId);
        } else {
          // Crear cliente temporal
          const tempClient = new User({
            fullName: req.body.patientName || 'Cliente Temporal',
            email: req.body.patientEmail,
            phone: req.body.patientPhone || '',
            userType: 'client',
            password: 'temp123' // Password temporal
          });
          await tempClient.save();
          clientId = tempClient._id;
          console.log('✅ Cliente temporal creado:', clientId);
        }
      } else {
        // Si no hay email, buscar un cliente genérico
        const genericClient = await User.findOne({ userType: 'client' });
        clientId = genericClient ? genericClient._id : null;
        console.log('⚠️ Usando cliente genérico:', clientId);
      }
    }
    
    // 2. Obtener professionalId
    let professionalId = req.body.professionalId;
    if (!professionalId || !mongoose.Types.ObjectId.isValid(professionalId)) {
      // Buscar el primer profesional disponible
      const professional = await User.findOne({ userType: 'professional' });
      professionalId = professional ? professional._id : null;
      console.log('⚠️ Usando profesional por defecto:', professionalId);
    }
    
    // 3. Obtener serviceId
    let serviceId = req.body.serviceId;
    if (!serviceId || !mongoose.Types.ObjectId.isValid(serviceId)) {
      // Buscar el primer servicio disponible
      const Service = require('./models/Service');
      const service = await Service.findOne();
      serviceId = service ? service._id : null;
      console.log('⚠️ Usando servicio por defecto:', serviceId);
    }
    
    // Validar que tengamos los IDs necesarios
    if (!clientId || !professionalId || !serviceId) {
      return res.status(400).json({
        success: false,
        error: 'Faltan IDs requeridos (clientId, professionalId, serviceId)',
        details: { clientId, professionalId, serviceId}
      });
    }
    
    const appointmentData = {
      clientId: new mongoose.Types.ObjectId(clientId),
      professionalId: new mongoose.Types.ObjectId(professionalId),
      serviceId: new mongoose.Types.ObjectId(serviceId),
      clinicId: req.body.clinicId ? new mongoose.Types.ObjectId(req.body.clinicId) : null,
      date: req.body.date,
      time: req.body.time,
      duration: req.body.duration || 30,
      status: req.body.status || 'confirmed',
      notes: req.body.notes || '',
      price: req.body.totalAmount || 10000,
      paymentStatus: req.body.paymentStatus || 'pending',
    };
    
    console.log('📅 Datos de cita preparados:', appointmentData);
    const newAppointment = new Appointment(appointmentData);
    await newAppointment.save();
    console.log('✅ Cita guardada en la base de datos con ID:', newAppointment._id);

    res.status(201).json({
      success: true,
      data: newAppointment,
      message: 'Cita creada exitosamente'
    });
  } catch (error) {
    console.error('❌ Error creando cita:', error);
    console.error('❌ Stack:', error.stack);
    res.status(500).json({ 
      success: false,
      error: 'Error interno del servidor',
      details: error.message
    });
  }
});

// Obtener horarios disponibles para un profesional en una fecha específica
app.get('/api/v1/appointments/available-slots', async (req, res) => {
  try {
    const { professionalId, date, clinicId, serviceId } = req.query;

    if (!professionalId || !date) {
      return res.status(400).json({ 
        success: false, 
        error: 'professionalId y date son requeridos' 
      });
    }

    // Buscar disponibilidad del profesional
    const availability = await ProfessionalAvailability.findOne({ 
      professionalId: professionalId 
    });

    if (!availability || !availability.isActive) {
      return res.json({ 
        success: true, 
        data: { availableSlots: [] } 
      });
    }

    // Obtener citas existentes para esa fecha
    const existingAppointments = await Appointment.find({
      professionalId: professionalId,
      date: date,
      status: { $in: ['confirmed', 'pending'] }
    });

    // Obtener horarios ocupados
    const occupiedSlots = existingAppointments.map(apt => apt.time);

    // Generar horarios disponibles basados en la configuración del profesional
    const availableSlots = [];
    const timeSlots = availability.timeSlots || [];
    const workingHours = availability.workingHours || { start: '09:00', end: '17:00' };

    // Si no hay timeSlots configurados, generar horarios por defecto
    if (timeSlots.length === 0) {
      const startHour = parseInt(workingHours.start.split(':')[0]);
      const endHour = parseInt(workingHours.end.split(':')[0]);
      
      for (let hour = startHour; hour < endHour; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
          const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
          if (!occupiedSlots.includes(time)) {
            availableSlots.push(time);
          }
        }
      }
    } else {
      // Usar horarios configurados
      timeSlots.forEach(time => {
        if (!occupiedSlots.includes(time)) {
          availableSlots.push(time);
        }
      });
    }

    res.json({ 
      success: true, 
      data: { 
        availableSlots: availableSlots.sort(),
        totalSlots: availableSlots.length,
        occupiedSlots: occupiedSlots
      } 
    });

  } catch (error) {
    console.error('Error obteniendo horarios disponibles:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
});

// Endpoint de prueba simple
app.get('/api/v1/test-availability', async (req, res) => {
  try {
    console.log('🧪 Endpoint de prueba ejecutándose...');
    
    // Probar conexión a MongoDB
    const count = await ProfessionalAvailability.countDocuments();
    console.log('📊 Total de documentos en la colección:', count);
    
    // Probar búsqueda simple
    const availability = await ProfessionalAvailability.findOne({ 
      professionalId: '1' 
    });
    
    console.log('📊 Disponibilidad encontrada:', availability ? 'Sí' : 'No');
    
    res.json({
      success: true,
      message: 'Endpoint de prueba funcionando',
      count: count,
      hasAvailability: !!availability,
      availability: availability
    });

  } catch (error) {
    console.error('❌ Error en endpoint de prueba:', error);
    console.error('❌ Stack trace:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Error en endpoint de prueba',
      details: error.message,
      stack: error.stack
    });
  }
});

// Endpoint para obtener configuración de disponibilidad de un profesional
app.get('/api/v1/availability/:professionalId', async (req, res) => {
  try {
    const { professionalId } = req.params;

    if (!professionalId) {
      return res.status(400).json({
        success: false,
        error: 'professionalId es requerido'
      });
    }

    console.log('🔍 Buscando disponibilidad para professionalId:', professionalId);

    // Buscar configuración de disponibilidad del profesional
    let availability = await ProfessionalAvailability.findOne({ 
      professionalId: professionalId 
    });

    console.log('📊 Disponibilidad encontrada:', availability ? 'Sí' : 'No');

    if (!availability) {
      return res.status(404).json({
        success: false,
        error: 'No se encontró configuración de disponibilidad para este profesional'
      });
    }

    res.json({
      success: true,
      data: availability
    });

  } catch (error) {
    console.error('❌ Error obteniendo configuración de disponibilidad:', error);
    console.error('❌ Stack trace:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: error.message
    });
  }
});

// Endpoint para crear o actualizar configuración de disponibilidad
app.post('/api/v1/availability/:professionalId', async (req, res) => {
  try {
    const { professionalId } = req.params;
    const availabilityData = req.body;

    if (!professionalId) {
      return res.status(400).json({
        success: false,
        error: 'professionalId es requerido'
      });
    }

    console.log('💾 Guardando disponibilidad para professionalId:', professionalId);
    console.log('📊 Datos recibidos:', JSON.stringify(availabilityData, null, 2));

    // Buscar si ya existe configuración
    let availability = await ProfessionalAvailability.findOne({ 
      professionalId: professionalId 
    });

    if (availability) {
      console.log('🔄 Actualizando configuración existente');
      // Actualizar configuración existente
      availability = await ProfessionalAvailability.findOneAndUpdate(
        { professionalId: professionalId },
        { 
          ...availabilityData,
          updatedAt: new Date()
        },
        { new: true }
      );
    } else {
      console.log('➕ Creando nueva configuración');
      // Crear nueva configuración
      availability = new ProfessionalAvailability({
        professionalId: professionalId,
        ...availabilityData
      });
      await availability.save();
    }

    console.log('✅ Disponibilidad guardada exitosamente:', availability);

    res.json({
      success: true,
      data: availability
    });

  } catch (error) {
    console.error('❌ Error guardando configuración de disponibilidad:', error);
    console.error('❌ Stack trace:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: error.message
    });
  }
});

// Importar rutas
const dateScheduleRoutes = require('./src/routes/dateSchedule');
const medicalAuthorizationsRoutes = require('./routes/medicalAuthorizations');

// Registrar rutas
app.use('/api/v1/date-schedules', dateScheduleRoutes);
// Misma ruta que TurnarioApp/backend/src/server.js (servicio Expo medicalAuthorizationService)
app.use('/api/medical-authorizations', authenticateToken, medicalAuthorizationsRoutes);

// Rutas de servicios
app.get('/api/v1/services', async (req, res) => {
  try {
    const services = await Service.find({ isActive: true }).sort({ name: 1 });
    res.json({ services });
  } catch (error) {
    console.error('Error obteniendo servicios:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Rutas de clínicas
app.get('/api/v1/clinics', async (req, res) => {
  try {
    const clinics = await Clinic.find({ isActive: true }).sort({ name: 1 });
    res.json({ clinics });
  } catch (error) {
    console.error('Error obteniendo clínicas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Rutas de notificaciones
app.get('/api/v1/notifications', authenticateToken, async (req, res) => {
  try {
    const notifications = await Notification.find({ recipientId: req.user.userId })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ notifications });
  } catch (error) {
    console.error('Error obteniendo notificaciones:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Health check
app.get('/api/v1/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Backend funcionando correctamente con MongoDB',
    timestamp: new Date().toISOString(),
    database: 'MongoDB - turnario'
  });
});

// Iniciar servidor
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor backend ejecutándose en puerto ${PORT}`);
  console.log(`📡 Local: http://localhost:${PORT}`);
  console.log(`📡 Red local: http://192.168.0.14:${PORT}`);
  console.log(`📡 Health check: http://192.168.0.14:${PORT}/api/v1/health`);
  console.log(`🔗 WebSocket: ws://192.168.0.14:${PORT}`);
  console.warn(
    '⚠️  Este server (my-app/backend) no incluye /api/v1/expo-payments (Mercado Pago). Para pagos MP usá: TurnarioApp/backend → npm start'
  );
  console.log('📋 Autorizaciones médicas: GET/POST /api/medical-authorizations');
});

// WebSocket para notificaciones en tiempo real
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('🔌 Cliente WebSocket conectado');
  
  ws.on('message', (message) => {
    console.log('📨 Mensaje recibido:', message.toString());
  });
  
  ws.on('close', () => {
    console.log('🔌 Cliente WebSocket desconectado');
  });
});

module.exports = app;