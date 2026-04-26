const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Conectar a MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/turnario';

mongoose.connect(MONGODB_URI, {
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
  professionalName: { type: String, required: true },
  daysOfWeek: {
    monday: { type: Boolean, default: false },
    tuesday: { type: Boolean, default: false },
    wednesday: { type: Boolean, default: false },
    thursday: { type: Boolean, default: false },
    friday: { type: Boolean, default: false },
    saturday: { type: Boolean, default: false },
    sunday: { type: Boolean, default: false }
  },
  timeSlots: [{ type: String }],
  workingHours: {
    start: { type: String, required: true },
    end: { type: String, required: true }
  },
  breakTime: {
    start: { type: String },
    end: { type: String }
  },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const ProfessionalAvailability = mongoose.model('ProfessionalAvailability', ProfessionalAvailabilitySchema);

// Endpoint para obtener disponibilidad
app.get('/api/v1/availability/:professionalId', async (req, res) => {
  try {
    console.log('📅 GET disponibilidad para profesional:', req.params.professionalId);
    
    const availability = await ProfessionalAvailability.findOne({ 
      professionalId: req.params.professionalId,
      isActive: true 
    });
    
    if (availability) {
      console.log('✅ Disponibilidad encontrada:', availability.professionalName);
      res.json(availability);
    } else {
      console.log('⚠️ No se encontró disponibilidad para:', req.params.professionalId);
      res.json(null);
    }
  } catch (error) {
    console.error('❌ Error obteniendo disponibilidad:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Endpoint para guardar/actualizar disponibilidad
app.post('/api/v1/availability/:professionalId', async (req, res) => {
  try {
    console.log('💾 POST guardando disponibilidad para profesional:', req.params.professionalId);
    console.log('📝 Datos recibidos:', JSON.stringify(req.body, null, 2));
    
    const { professionalName, daysOfWeek, timeSlots, workingHours, breakTime } = req.body;
    
    // Buscar si ya existe disponibilidad
    let availability = await ProfessionalAvailability.findOne({
      professionalId: req.params.professionalId
    });
    
    if (availability) {
      // Actualizar existente
      availability.professionalName = professionalName;
      availability.daysOfWeek = daysOfWeek;
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
        professionalName,
        daysOfWeek,
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
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'Conectado' : 'Desconectado'
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor de disponibilidad ejecutándose en puerto ${PORT}`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log(`📊 MongoDB: ${mongoose.connection.readyState === 1 ? '✅ Conectado' : '❌ Desconectado'}`);
});

console.log('📋 Servidor configurado, iniciando...');
