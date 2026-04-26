const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const app = express();
const port = 3000;

// Configurar middleware básico
app.use(cors({
  origin: ['http://localhost:19006', 'http://localhost:3000', 'http://192.168.0.4:3000', 'http://192.168.0.4:19006'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Turnario API está funcionando correctamente',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: 'development',
    version: '1.0.0'
  });
});

// API routes
const apiPrefix = '/api/v1';

// ===== AUTENTICACIÓN =====
app.post(`${apiPrefix}/auth/login`, (req, res) => {
  const { email, password } = req.body;
  
  // Simular validación de credenciales
  if (email === 'test@example.com' && password === 'password') {
    res.status(200).json({
      success: true,
      message: 'Login exitoso',
      user: {
        id: 'user-123',
        email: email,
        name: 'Usuario de Prueba',
        userType: 'client',
        avatar: null
      },
      token: 'mock-jwt-token-12345'
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Credenciales inválidas'
    });
  }
});

app.post(`${apiPrefix}/auth/register`, (req, res) => {
  const { email, password, name, userType } = req.body;
  
  // Simular registro
  res.status(201).json({
    success: true,
    message: 'Usuario registrado exitosamente',
    user: {
      id: 'user-' + Date.now(),
      email: email,
      name: name || 'Usuario Nuevo',
      userType: userType || 'client',
      avatar: null
    },
    token: 'mock-jwt-token-' + Date.now()
  });
});

app.post(`${apiPrefix}/auth/logout`, (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Logout exitoso'
  });
});

// ===== CITAS =====
let mockAppointments = [
  {
    id: 'apt-1',
    userId: 'user-123',
    professionalId: 'prof-1',
    serviceId: 'service-1',
    date: '2024-12-25',
    time: '10:00',
    status: 'confirmed',
    notes: 'Cita de prueba',
    createdAt: new Date().toISOString()
  }
];

app.get(`${apiPrefix}/appointments`, (req, res) => {
  const { userId, professionalId, status, date } = req.query;
  
  let filteredAppointments = [...mockAppointments];
  
  if (userId) {
    filteredAppointments = filteredAppointments.filter(apt => apt.userId === userId);
  }
  if (professionalId) {
    filteredAppointments = filteredAppointments.filter(apt => apt.professionalId === professionalId);
  }
  if (status) {
    filteredAppointments = filteredAppointments.filter(apt => apt.status === status);
  }
  if (date) {
    filteredAppointments = filteredAppointments.filter(apt => apt.date === date);
  }
  
  res.status(200).json({
    appointments: filteredAppointments,
    total: filteredAppointments.length,
    page: 1,
    totalPages: 1,
    message: 'Citas obtenidas exitosamente'
  });
});

app.post(`${apiPrefix}/appointments`, (req, res) => {
  const appointmentData = req.body;
  
  const newAppointment = {
    id: 'apt-' + Date.now(),
    ...appointmentData,
    status: appointmentData.status || 'pending',
    createdAt: new Date().toISOString()
  };
  
  mockAppointments.push(newAppointment);
  
  res.status(201).json({
    success: true,
    message: 'Cita creada exitosamente',
    appointment: newAppointment
  });
});

app.put(`${apiPrefix}/appointments/:id`, (req, res) => {
  const { id } = req.params;
  const updateData = req.body;
  
  const appointmentIndex = mockAppointments.findIndex(apt => apt.id === id);
  
  if (appointmentIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Cita no encontrada'
    });
  }
  
  mockAppointments[appointmentIndex] = {
    ...mockAppointments[appointmentIndex],
    ...updateData,
    updatedAt: new Date().toISOString()
  };
  
  res.status(200).json({
    success: true,
    message: 'Cita actualizada exitosamente',
    appointment: mockAppointments[appointmentIndex]
  });
});

app.delete(`${apiPrefix}/appointments/:id`, (req, res) => {
  const { id } = req.params;
  
  const appointmentIndex = mockAppointments.findIndex(apt => apt.id === id);
  
  if (appointmentIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Cita no encontrada'
    });
  }
  
  mockAppointments.splice(appointmentIndex, 1);
  
  res.status(200).json({
    success: true,
    message: 'Cita eliminada exitosamente'
  });
});

// ===== USUARIOS =====
let mockUsers = [
  {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Usuario de Prueba',
    userType: 'client',
    avatar: null,
    createdAt: new Date().toISOString()
  }
];

app.get(`${apiPrefix}/users`, (req, res) => {
  res.status(200).json({
    users: mockUsers,
    total: mockUsers.length,
    message: 'Usuarios obtenidos exitosamente'
  });
});

app.get(`${apiPrefix}/users/:id`, (req, res) => {
  const { id } = req.params;
  const user = mockUsers.find(u => u.id === id);
  
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'Usuario no encontrado'
    });
  }
  
  res.status(200).json({
    success: true,
    user: user
  });
});

// ===== SERVICIOS =====
let mockServices = [
  {
    id: 'service-1',
    name: 'Consulta General',
    description: 'Consulta médica general',
    duration: 30,
    price: 50,
    category: 'medical'
  },
  {
    id: 'service-2',
    name: 'Terapia',
    description: 'Sesión de terapia',
    duration: 60,
    price: 80,
    category: 'therapy'
  }
];

app.get(`${apiPrefix}/services`, (req, res) => {
  res.status(200).json({
    services: mockServices,
    total: mockServices.length,
    message: 'Servicios obtenidos exitosamente'
  });
});

// ===== CLÍNICAS =====
let mockClinics = [
  {
    id: 'clinic-1',
    name: 'Clínica Central',
    address: 'Av. Principal 123',
    phone: '+1234567890',
    email: 'info@clinicacentral.com'
  }
];

app.get(`${apiPrefix}/clinics`, (req, res) => {
  res.status(200).json({
    clinics: mockClinics,
    total: mockClinics.length,
    message: 'Clínicas obtenidas exitosamente'
  });
});

// ===== NOTIFICACIONES =====
let mockNotifications = [
  {
    id: 'notif-1',
    userId: 'user-123',
    title: 'Cita confirmada',
    message: 'Su cita ha sido confirmada para el 25 de diciembre',
    type: 'appointment',
    read: false,
    createdAt: new Date().toISOString()
  }
];

app.get(`${apiPrefix}/notifications`, (req, res) => {
  const { userId } = req.query;
  
  let filteredNotifications = [...mockNotifications];
  
  if (userId) {
    filteredNotifications = filteredNotifications.filter(notif => notif.userId === userId);
  }
  
  res.status(200).json({
    notifications: filteredNotifications,
    total: filteredNotifications.length,
    message: 'Notificaciones obtenidas exitosamente'
  });
});

// ===== DISPONIBILIDAD =====
app.get(`${apiPrefix}/availability`, (req, res) => {
  const { professionalId, date } = req.query;
  
  // Simular horarios disponibles
  const availableSlots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'
  ];
  
  res.status(200).json({
    professionalId: professionalId || 'prof-1',
    date: date || new Date().toISOString().split('T')[0],
    availableSlots: availableSlots,
    message: 'Disponibilidad obtenida exitosamente'
  });
});

// ===== MANEJO DE ERRORES =====
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint no encontrado',
    path: req.originalUrl,
    method: req.method
  });
});

// ===== MANEJO DE ERRORES GLOBAL =====
app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
  });
});

// Iniciar servidor
app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Servidor Turnario ejecutándose en http://0.0.0.0:${port}`);
  console.log(`📱 Accesible desde dispositivos móviles en http://192.168.0.4:${port}`);
  console.log(`🌐 Health check: http://192.168.0.4:${port}/health`);
  console.log(`📊 API Base: http://192.168.0.4:${port}/api/v1`);
  console.log('✅ Servidor listo para recibir conexiones');
});
