const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Conectar a MongoDB
mongoose.connect('mongodb://localhost:27017/turnario', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('✅ Conectado a MongoDB');
}).catch(err => {
  console.log('⚠️ Error conectando a MongoDB:', err.message);
  console.log('📱 Continuando en modo sin base de datos...');
});

// Importar modelo
const ProfessionalDateSchedule = require('./models/ProfessionalDateSchedule');

// Almacenamiento en memoria como fallback
let memoryStorage = {};

// Endpoint de salud
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Servidor de prueba funcionando',
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    memoryData: Object.keys(memoryStorage).length
  });
});

// Crear datos de prueba
app.post('/api/v1/date-schedules/:professionalId', async (req, res) => {
  try {
    const { professionalId } = req.params;
    const { date, timeSlots, isAvailable, notes, professionalName } = req.body;
    
    console.log('📅 Creando horarios para:', { professionalId, date, timeSlots });
    
    const scheduleData = {
      professionalId,
      professionalName: professionalName || `Profesional ${professionalId}`,
      date,
      timeSlots: timeSlots || [],
      isAvailable: isAvailable !== undefined ? isAvailable : true,
      notes: notes || ''
    };
    
    // Intentar guardar en MongoDB
    try {
      if (mongoose.connection.readyState === 1) {
        console.log('💾 Guardando en MongoDB...');
        
        const schedule = await ProfessionalDateSchedule.findOneAndUpdate(
          { professionalId, date },
          scheduleData,
          { new: true, upsert: true, runValidators: true }
        );
        
        console.log('✅ Guardado en MongoDB exitosamente');
        
        res.json({
          success: true,
          data: schedule,
          message: 'Horarios guardados en MongoDB',
          source: 'mongodb'
        });
        return;
      }
    } catch (mongoError) {
      console.log('⚠️ Error en MongoDB:', mongoError.message);
    }
    
    // Fallback a memoria
    console.log('📱 Guardando en memoria...');
    const key = `${professionalId}_${date}`;
    scheduleData._id = `mem_${Date.now()}`;
    scheduleData.createdAt = new Date().toISOString();
    scheduleData.updatedAt = new Date().toISOString();
    
    memoryStorage[key] = scheduleData;
    
    res.json({
      success: true,
      data: scheduleData,
      message: 'Horarios guardados en memoria',
      source: 'memory'
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: error.message
    });
  }
});

// Obtener horarios de una fecha
app.get('/api/v1/date-schedules/:professionalId/:date', async (req, res) => {
  try {
    const { professionalId, date } = req.params;
    
    console.log('🔍 Buscando horarios para:', { professionalId, date });
    
    // Intentar buscar en MongoDB
    try {
      if (mongoose.connection.readyState === 1) {
        console.log('🔍 Buscando en MongoDB...');
        
        const schedule = await ProfessionalDateSchedule.findOne({
          professionalId,
          date
        });
        
        if (schedule) {
          console.log('✅ Encontrado en MongoDB');
          return res.json({
            success: true,
            data: schedule,
            source: 'mongodb'
          });
        }
      }
    } catch (mongoError) {
      console.log('⚠️ Error buscando en MongoDB:', mongoError.message);
    }
    
    // Buscar en memoria
    console.log('🔍 Buscando en memoria...');
    const key = `${professionalId}_${date}`;
    const schedule = memoryStorage[key];
    
    if (schedule) {
      console.log('✅ Encontrado en memoria');
      return res.json({
        success: true,
        data: schedule,
        source: 'memory'
      });
    }
    
    res.json({
      success: true,
      data: null,
      message: 'No hay horarios para esta fecha'
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: error.message
    });
  }
});

// Obtener horarios de un mes
app.get('/api/v1/date-schedules/:professionalId/month/:year/:month', async (req, res) => {
  try {
    const { professionalId, year, month } = req.params;
    
    console.log('📅 Obteniendo horarios del mes:', { professionalId, year, month });
    
    // Intentar buscar en MongoDB
    try {
      if (mongoose.connection.readyState === 1) {
        console.log('🔍 Buscando en MongoDB...');
        
        const schedules = await ProfessionalDateSchedule.getMonthlySchedules(
          professionalId, 
          parseInt(year), 
          parseInt(month)
        );
        
        console.log(`✅ Encontrados ${schedules.length} horarios en MongoDB`);
        
        return res.json({
          success: true,
          data: schedules,
          count: schedules.length,
          source: 'mongodb'
        });
      }
    } catch (mongoError) {
      console.log('⚠️ Error buscando en MongoDB:', mongoError.message);
    }
    
    // Buscar en memoria
    console.log('🔍 Buscando en memoria...');
    const schedules = Object.values(memoryStorage).filter(schedule => {
      if (schedule.professionalId !== professionalId) return false;
      
      const scheduleDate = new Date(schedule.date);
      return scheduleDate.getFullYear() === parseInt(year) && 
             scheduleDate.getMonth() + 1 === parseInt(month);
    });
    
    console.log(`✅ Encontrados ${schedules.length} horarios en memoria`);
    
    res.json({
      success: true,
      data: schedules,
      count: schedules.length,
      source: 'memory'
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: error.message
    });
  }
});

// Ver todos los datos almacenados (debug)
app.get('/api/debug/data', async (req, res) => {
  try {
    let mongoData = [];
    let memoryData = Object.values(memoryStorage);
    
    // Obtener datos de MongoDB
    try {
      if (mongoose.connection.readyState === 1) {
        mongoData = await ProfessionalDateSchedule.find({}).sort({ date: 1 });
      }
    } catch (mongoError) {
      console.log('⚠️ Error obteniendo datos de MongoDB:', mongoError.message);
    }
    
    res.json({
      success: true,
      mongodb: {
        connected: mongoose.connection.readyState === 1,
        data: mongoData,
        count: mongoData.length
      },
      memory: {
        data: memoryData,
        count: memoryData.length
      },
      total: mongoData.length + memoryData.length
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: error.message
    });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor de prueba ejecutándose en puerto ${PORT}`);
  console.log(`📅 Endpoints disponibles:`);
  console.log(`   GET  /api/health`);
  console.log(`   POST /api/v1/date-schedules/:professionalId`);
  console.log(`   GET  /api/v1/date-schedules/:professionalId/:date`);
  console.log(`   GET  /api/v1/date-schedules/:professionalId/month/:year/:month`);
  console.log(`   GET  /api/debug/data`);
  console.log(`\n📋 Para probar:`);
  console.log(`   curl http://localhost:${PORT}/api/health`);
});

module.exports = app;
