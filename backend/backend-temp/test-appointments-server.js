const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Middleware de autenticación simple
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token de acceso requerido' });
  }

  // Para testing, aceptar cualquier token
  if (token === 'test-token' || token === 'mock-token') {
    req.user = { id: 'test-user-1', userType: 'client' };
    next();
  } else {
    return res.status(403).json({ error: 'Token inválido' });
  }
};

// Datos de prueba para citas
const mockAppointments = [
  {
    _id: 'appointment_1',
    client: {
      _id: 'client_1',
      fullName: 'Juan Pérez',
      email: 'juan.perez@email.com'
    },
    professional: {
      _id: 'professional_1',
      fullName: 'Dr. Carlos Mendoza',
      email: 'carlos.mendoza@turnario.com'
    },
    service: {
      _id: 'service_1',
      name: 'Consulta General',
      duration: 30,
      price: 5000
    },
    clinic: {
      _id: 'clinic_1',
      name: 'Clínica Central',
      address: 'Av. Corrientes 1234'
    },
    date: '2024-01-15',
    time: '10:00',
    startTime: '10:00',
    endTime: '10:30',
    status: 'confirmed',
    paymentStatus: 'paid',
    amount: 5000,
    notes: 'Primera consulta',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    _id: 'appointment_2',
    client: {
      _id: 'client_2',
      fullName: 'Ana García',
      email: 'ana.garcia@email.com'
    },
    professional: {
      _id: 'professional_2',
      fullName: 'Dra. María González',
      email: 'maria.gonzalez@turnario.com'
    },
    service: {
      _id: 'service_2',
      name: 'Consulta Especializada',
      duration: 45,
      price: 7500
    },
    clinic: {
      _id: 'clinic_1',
      name: 'Clínica Central',
      address: 'Av. Corrientes 1234'
    },
    date: '2024-01-16',
    time: '14:00',
    startTime: '14:00',
    endTime: '14:45',
    status: 'pending',
    paymentStatus: 'pending',
    amount: 7500,
    notes: 'Seguimiento médico',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    _id: 'appointment_3',
    client: {
      _id: 'client_1',
      fullName: 'Juan Pérez',
      email: 'juan.perez@email.com'
    },
    professional: {
      _id: 'professional_1',
      fullName: 'Dr. Carlos Mendoza',
      email: 'carlos.mendoza@turnario.com'
    },
    service: {
      _id: 'service_3',
      name: 'Control de Presión',
      duration: 20,
      price: 3000
    },
    clinic: {
      _id: 'clinic_1',
      name: 'Clínica Central',
      address: 'Av. Corrientes 1234'
    },
    date: '2024-01-17',
    time: '09:00',
    startTime: '09:00',
    endTime: '09:20',
    status: 'completed',
    paymentStatus: 'paid',
    amount: 3000,
    notes: 'Control rutinario',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// Rutas de la API

// GET /api/v1/appointments - Obtener citas
app.get('/api/v1/appointments', authenticateToken, (req, res) => {
  console.log('📅 GET /api/v1/appointments - Obteniendo citas...');
  
  try {
    const { status, dateFrom, dateTo, professional, client, page = 1, limit = 10 } = req.query;
    
    let filteredAppointments = [...mockAppointments];
    
    // Filtrar por estado
    if (status) {
      filteredAppointments = filteredAppointments.filter(apt => apt.status === status);
    }
    
    // Filtrar por fecha
    if (dateFrom) {
      filteredAppointments = filteredAppointments.filter(apt => apt.date >= dateFrom);
    }
    
    if (dateTo) {
      filteredAppointments = filteredAppointments.filter(apt => apt.date <= dateTo);
    }
    
    // Filtrar por profesional
    if (professional) {
      filteredAppointments = filteredAppointments.filter(apt => apt.professional._id === professional);
    }
    
    // Filtrar por cliente
    if (client) {
      filteredAppointments = filteredAppointments.filter(apt => apt.client._id === client);
    }
    
    // Paginación
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedAppointments = filteredAppointments.slice(startIndex, endIndex);
    
    const response = {
      success: true,
      appointments: paginatedAppointments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: filteredAppointments.length,
        pages: Math.ceil(filteredAppointments.length / limit)
      }
    };
    
    console.log(`✅ Citas obtenidas: ${paginatedAppointments.length} de ${filteredAppointments.length} total`);
    res.json(response);
    
  } catch (error) {
    console.error('❌ Error obteniendo citas:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// GET /api/v1/appointments/:id - Obtener cita por ID
app.get('/api/v1/appointments/:id', authenticateToken, (req, res) => {
  console.log(`📅 GET /api/v1/appointments/${req.params.id} - Obteniendo cita...`);
  
  try {
    const appointment = mockAppointments.find(apt => apt._id === req.params.id);
    
    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Cita no encontrada'
      });
    }
    
    console.log(`✅ Cita encontrada: ${appointment._id}`);
    res.json({
      success: true,
      appointment
    });
    
  } catch (error) {
    console.error('❌ Error obteniendo cita:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// POST /api/v1/appointments - Crear nueva cita
app.post('/api/v1/appointments', authenticateToken, (req, res) => {
  console.log('📅 POST /api/v1/appointments - Creando nueva cita...');
  
  try {
    const { client, professional, service, clinic, date, startTime, endTime, notes, amount } = req.body;
    
    // Validaciones básicas
    if (!client || !professional || !service || !date || !startTime) {
      return res.status(400).json({
        success: false,
        error: 'Datos requeridos faltantes'
      });
    }
    
    const newAppointment = {
      _id: `appointment_${Date.now()}`,
      client: {
        _id: client,
        fullName: 'Cliente Nuevo',
        email: 'cliente@email.com'
      },
      professional: {
        _id: professional,
        fullName: 'Profesional Nuevo',
        email: 'profesional@turnario.com'
      },
      service: {
        _id: service,
        name: 'Servicio Nuevo',
        duration: 30,
        price: amount || 5000
      },
      clinic: {
        _id: clinic || 'clinic_1',
        name: 'Clínica Central',
        address: 'Av. Corrientes 1234'
      },
      date,
      time: startTime,
      startTime,
      endTime: endTime || startTime,
      status: 'pending',
      paymentStatus: 'pending',
      amount: amount || 5000,
      notes: notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    mockAppointments.push(newAppointment);
    
    console.log(`✅ Cita creada: ${newAppointment._id}`);
    res.status(201).json({
      success: true,
      appointment: newAppointment
    });
    
  } catch (error) {
    console.error('❌ Error creando cita:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// PUT /api/v1/appointments/:id - Actualizar cita
app.put('/api/v1/appointments/:id', authenticateToken, (req, res) => {
  console.log(`📅 PUT /api/v1/appointments/${req.params.id} - Actualizando cita...`);
  
  try {
    const appointmentIndex = mockAppointments.findIndex(apt => apt._id === req.params.id);
    
    if (appointmentIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Cita no encontrada'
      });
    }
    
    const updatedAppointment = {
      ...mockAppointments[appointmentIndex],
      ...req.body,
      updatedAt: new Date().toISOString()
    };
    
    mockAppointments[appointmentIndex] = updatedAppointment;
    
    console.log(`✅ Cita actualizada: ${req.params.id}`);
    res.json({
      success: true,
      appointment: updatedAppointment
    });
    
  } catch (error) {
    console.error('❌ Error actualizando cita:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// DELETE /api/v1/appointments/:id - Eliminar cita
app.delete('/api/v1/appointments/:id', authenticateToken, (req, res) => {
  console.log(`📅 DELETE /api/v1/appointments/${req.params.id} - Eliminando cita...`);
  
  try {
    const appointmentIndex = mockAppointments.findIndex(apt => apt._id === req.params.id);
    
    if (appointmentIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Cita no encontrada'
      });
    }
    
    const deletedAppointment = mockAppointments.splice(appointmentIndex, 1)[0];
    
    console.log(`✅ Cita eliminada: ${req.params.id}`);
    res.json({
      success: true,
      message: 'Cita eliminada correctamente',
      appointment: deletedAppointment
    });
    
  } catch (error) {
    console.error('❌ Error eliminando cita:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// Ruta de salud
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Servidor de citas funcionando',
    timestamp: new Date().toISOString(),
    appointments: mockAppointments.length
  });
});

// Middleware de manejo de errores
app.use((err, req, res, next) => {
  console.error('❌ Error no manejado:', err);
  res.status(500).json({
    success: false,
    error: 'Error interno del servidor',
    message: err.message
  });
});

// Middleware para rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Ruta no encontrada',
    message: `La ruta ${req.originalUrl} no existe`
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log('🚀 Servidor de citas iniciado');
  console.log(`📍 Puerto: ${PORT}`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log(`📅 Endpoint de citas: http://localhost:${PORT}/api/v1/appointments`);
  console.log(`❤️  Salud: http://localhost:${PORT}/health`);
  console.log('');
  console.log('📊 Datos de prueba disponibles:');
  console.log(`   - ${mockAppointments.length} citas de ejemplo`);
  console.log('   - Autenticación: Bearer test-token o Bearer mock-token');
  console.log('');
  console.log('🔧 Comandos de prueba:');
  console.log('   curl -H "Authorization: Bearer test-token" http://localhost:3001/api/v1/appointments');
  console.log('   curl -H "Authorization: Bearer test-token" http://localhost:3001/health');
});

module.exports = app;
