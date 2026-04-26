const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Almacenamiento en memoria (simulando base de datos)
let availabilityData = {};

// Endpoint para obtener disponibilidad
app.get('/api/v1/availability/:professionalId', (req, res) => {
  try {
    console.log('📅 GET disponibilidad para profesional:', req.params.professionalId);
    
    const availability = availabilityData[req.params.professionalId];
    
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
app.post('/api/v1/availability/:professionalId', (req, res) => {
  try {
    console.log('💾 POST guardando disponibilidad para profesional:', req.params.professionalId);
    console.log('📝 Datos recibidos:', JSON.stringify(req.body, null, 2));
    
    const { professionalName, daysOfWeek, timeSlots, workingHours, breakTime } = req.body;
    
    // Guardar en memoria
    availabilityData[req.params.professionalId] = {
      professionalId: req.params.professionalId,
      professionalName,
      daysOfWeek,
      timeSlots,
      workingHours,
      breakTime,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    console.log('✅ Disponibilidad guardada en memoria');
    
    res.json({
      success: true,
      message: 'Disponibilidad guardada exitosamente',
      data: availabilityData[req.params.professionalId]
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
    message: 'Servidor mock de disponibilidad funcionando',
    timestamp: new Date().toISOString(),
    dataStored: Object.keys(availabilityData).length
  });
});

// Endpoint para ver todos los datos almacenados
app.get('/api/debug/data', (req, res) => {
  res.json({
    availabilityData,
    count: Object.keys(availabilityData).length
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor mock de disponibilidad ejecutándose en puerto ${PORT}`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log(`📊 Almacenamiento: En memoria`);
});

console.log('📋 Servidor mock configurado, iniciando...');
