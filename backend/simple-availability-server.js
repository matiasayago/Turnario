const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Conectar a MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/turnario', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

mongoose.connection.on('connected', () => {
  console.log('✅ Conectado a MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Error de MongoDB:', err);
});

// Modelo de disponibilidad profesional
const ProfessionalAvailabilitySchema = new mongoose.Schema({
  professionalId: { type: String, required: true },
  dayOfWeek: { type: String, required: true },
  timeSlots: [{
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    isAvailable: { type: Boolean, default: true }
  }],
  workingHours: {
    startTime: { type: String, required: true },
    endTime: { type: String, required: true }
  },
  breakTime: {
    startTime: { type: String },
    endTime: { type: String }
  },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const ProfessionalAvailability = mongoose.model('ProfessionalAvailability', ProfessionalAvailabilitySchema);

// Endpoint para obtener disponibilidad
app.get('/api/v1/availability/:professionalId', async (req, res) => {
  try {
    console.log('📅 Obteniendo disponibilidad para profesional:', req.params.professionalId);
    
    const availability = await ProfessionalAvailability.find({ 
      professionalId: req.params.professionalId,
      isActive: true 
    });
    
    console.log('✅ Disponibilidad encontrada:', availability.length, 'registros');
    res.json(availability);
  } catch (error) {
    console.error('❌ Error obteniendo disponibilidad:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Endpoint para guardar/actualizar disponibilidad
app.post('/api/v1/availability/:professionalId', async (req, res) => {
  try {
    console.log('💾 Guardando disponibilidad para profesional:', req.params.professionalId);
    console.log('📝 Datos recibidos:', req.body);
    
    const { dayOfWeek, timeSlots, workingHours, breakTime } = req.body;
    
    // Buscar si ya existe disponibilidad para este día
    let availability = await ProfessionalAvailability.findOne({
      professionalId: req.params.professionalId,
      dayOfWeek: dayOfWeek
    });
    
    if (availability) {
      // Actualizar existente
      availability.timeSlots = timeSlots;
      availability.workingHours = workingHours;
      availability.breakTime = breakTime;
      availability.updatedAt = new Date();
      await availability.save();
      console.log('✅ Disponibilidad actualizada');
    } else {
      // Crear nuevo
      availability = new ProfessionalAvailability({
        professionalId: req.params.professionalId,
        dayOfWeek,
        timeSlots,
        workingHours,
        breakTime
      });
      await availability.save();
      console.log('✅ Nueva disponibilidad creada');
    }
    
    res.json({
      success: true,
      message: 'Disponibilidad guardada exitosamente',
      data: availability
    });
  } catch (error) {
    console.error('❌ Error guardando disponibilidad:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Endpoint de salud
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Servidor de disponibilidad funcionando',
    timestamp: new Date().toISOString()
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor de disponibilidad ejecutándose en puerto ${PORT}`);
  console.log(`📊 Base de datos: ${mongoose.connection.readyState === 1 ? '✅ Conectada' : '❌ Desconectada'}`);
});

module.exports = app;
