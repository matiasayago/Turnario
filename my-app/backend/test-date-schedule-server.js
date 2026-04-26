const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Almacenamiento en memoria para horarios por fecha específica
let dateSchedulesData = {};

// Endpoint de salud
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Servidor de horarios por fecha funcionando',
    timestamp: new Date().toISOString(),
    dataStored: Object.keys(dateSchedulesData).length
  });
});

// Obtener horarios de una fecha específica
app.get('/api/v1/date-schedules/:professionalId/:date', (req, res) => {
  try {
    const { professionalId, date } = req.params;
    
    console.log('📅 GET - Obteniendo horarios para fecha específica:', { professionalId, date });
    
    const key = `${professionalId}_${date}`;
    const schedule = dateSchedulesData[key];
    
    if (!schedule) {
      return res.json({
        success: true,
        data: null,
        message: 'No hay horarios configurados para esta fecha'
      });
    }
    
    console.log('✅ Horarios encontrados para fecha:', date);
    
    res.json({
      success: true,
      data: schedule
    });
    
  } catch (error) {
    console.error('❌ Error obteniendo horarios de fecha específica:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: error.message
    });
  }
});

// Crear o actualizar horarios de una fecha específica
app.post('/api/v1/date-schedules/:professionalId', (req, res) => {
  try {
    const { professionalId } = req.params;
    const { date, timeSlots, isAvailable, notes } = req.body;
    
    console.log('📅 POST - Creando/actualizando horarios para fecha específica:', { professionalId, date });
    
    if (!date) {
      return res.status(400).json({
        success: false,
        error: 'date es requerido'
      });
    }
    
    // Validar formato de fecha
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        success: false,
        error: 'Formato de fecha inválido. Use YYYY-MM-DD'
      });
    }
    
    // Validar que si isAvailable es true, debe haber timeSlots
    if (isAvailable && (!timeSlots || timeSlots.length === 0)) {
      return res.status(400).json({
        success: false,
        error: 'Debe haber al menos un horario si la fecha está disponible'
      });
    }
    
    const key = `${professionalId}_${date}`;
    const existingSchedule = dateSchedulesData[key];
    
    const scheduleData = {
      _id: existingSchedule ? existingSchedule._id : `schedule_${Date.now()}`,
      professionalId,
      professionalName: `Profesional ${professionalId}`,
      date,
      timeSlots: timeSlots || [],
      isAvailable: isAvailable !== undefined ? isAvailable : true,
      notes: notes || '',
      createdAt: existingSchedule ? existingSchedule.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    dateSchedulesData[key] = scheduleData;
    
    console.log('✅ Horarios guardados exitosamente para fecha:', date);
    
    res.json({
      success: true,
      data: scheduleData,
      message: existingSchedule ? 'Horarios actualizados exitosamente' : 'Horarios creados exitosamente'
    });
    
  } catch (error) {
    console.error('❌ Error guardando horarios de fecha específica:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: error.message
    });
  }
});

// Obtener horarios de un mes completo
app.get('/api/v1/date-schedules/:professionalId/month/:year/:month', (req, res) => {
  try {
    const { professionalId, year, month } = req.params;
    
    console.log('📅 GET - Obteniendo horarios del mes:', { professionalId, year, month });
    
    const yearNum = parseInt(year);
    const monthNum = parseInt(month);
    
    if (isNaN(yearNum) || yearNum < 2020 || yearNum > 2030) {
      return res.status(400).json({
        success: false,
        error: 'Año inválido'
      });
    }
    
    if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return res.status(400).json({
        success: false,
        error: 'Mes inválido'
      });
    }
    
    // Filtrar horarios del mes específico
    const schedules = Object.values(dateSchedulesData).filter(schedule => {
      if (schedule.professionalId !== professionalId) return false;
      
      const scheduleDate = new Date(schedule.date);
      return scheduleDate.getFullYear() === yearNum && 
             scheduleDate.getMonth() + 1 === monthNum;
    });
    
    console.log(`✅ Encontrados ${schedules.length} horarios para el mes ${month}/${year}`);
    
    res.json({
      success: true,
      data: schedules,
      count: schedules.length
    });
    
  } catch (error) {
    console.error('❌ Error obteniendo horarios del mes:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: error.message
    });
  }
});

// Obtener horarios de un rango de fechas
app.get('/api/v1/date-schedules/:professionalId/range', (req, res) => {
  try {
    const { professionalId } = req.params;
    const { startDate, endDate } = req.query;
    
    console.log('📅 GET - Obteniendo horarios del rango:', { professionalId, startDate, endDate });
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'startDate y endDate son requeridos'
      });
    }
    
    // Validar formato de fechas
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      return res.status(400).json({
        success: false,
        error: 'Formato de fecha inválido. Use YYYY-MM-DD'
      });
    }
    
    // Filtrar horarios del rango específico
    const schedules = Object.values(dateSchedulesData).filter(schedule => {
      if (schedule.professionalId !== professionalId) return false;
      
      return schedule.date >= startDate && schedule.date <= endDate;
    });
    
    console.log(`✅ Encontrados ${schedules.length} horarios en el rango ${startDate} - ${endDate}`);
    
    res.json({
      success: true,
      data: schedules,
      count: schedules.length
    });
    
  } catch (error) {
    console.error('❌ Error obteniendo horarios del rango:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: error.message
    });
  }
});

// Eliminar horarios de una fecha específica
app.delete('/api/v1/date-schedules/:professionalId/:date', (req, res) => {
  try {
    const { professionalId, date } = req.params;
    
    console.log('🗑️ DELETE - Eliminando horarios para fecha:', { professionalId, date });
    
    // Validar formato de fecha
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        success: false,
        error: 'Formato de fecha inválido. Use YYYY-MM-DD'
      });
    }
    
    const key = `${professionalId}_${date}`;
    const schedule = dateSchedulesData[key];
    
    if (!schedule) {
      return res.status(404).json({
        success: false,
        error: 'No se encontraron horarios para esta fecha'
      });
    }
    
    delete dateSchedulesData[key];
    
    console.log('✅ Horarios eliminados exitosamente para fecha:', date);
    
    res.json({
      success: true,
      message: 'Horarios eliminados exitosamente',
      data: schedule
    });
    
  } catch (error) {
    console.error('❌ Error eliminando horarios de fecha específica:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: error.message
    });
  }
});

// Endpoint para ver todos los datos almacenados (debug)
app.get('/api/debug/date-schedules', (req, res) => {
  res.json({
    success: true,
    data: dateSchedulesData,
    count: Object.keys(dateSchedulesData).length
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor de horarios por fecha ejecutándose en puerto ${PORT}`);
  console.log(`📅 Endpoints disponibles:`);
  console.log(`   GET  /api/health`);
  console.log(`   GET  /api/v1/date-schedules/:professionalId/:date`);
  console.log(`   POST /api/v1/date-schedules/:professionalId`);
  console.log(`   GET  /api/v1/date-schedules/:professionalId/month/:year/:month`);
  console.log(`   GET  /api/v1/date-schedules/:professionalId/range?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`);
  console.log(`   DELETE /api/v1/date-schedules/:professionalId/:date`);
  console.log(`   GET  /api/debug/date-schedules`);
});

module.exports = app;
