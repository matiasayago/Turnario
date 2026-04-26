#!/usr/bin/env node

const mongoose = require('mongoose');
const ProfessionalAvailability = require('./models/ProfessionalAvailability');
const User = require('./models/User');
require('dotenv').config();

// Configuración de la base de datos
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/turnario';

async function testAvailability() {
  try {
    console.log('🧪 Iniciando pruebas de disponibilidad...');
    
    // Conectar a MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB');
    
    // Obtener un profesional de prueba
    const professional = await User.findOne({ userType: 'professional' });
    if (!professional) {
      console.log('❌ No se encontró ningún profesional en la base de datos');
      return;
    }
    
    console.log(`👤 Profesional encontrado: ${professional.fullName}`);
    
    // Obtener disponibilidad
    const availability = await ProfessionalAvailability.findByProfessional(professional._id);
    if (!availability) {
      console.log('❌ No se encontró disponibilidad para este profesional');
      return;
    }
    
    console.log('📅 Disponibilidad encontrada:');
    console.log(`- Días de semana: ${Object.entries(availability.daysOfWeek).filter(([_, available]) => available).map(([day, _]) => day).join(', ')}`);
    console.log(`- Horarios: ${availability.timeSlots.join(', ')}`);
    console.log(`- Horario de trabajo: ${availability.workingHours.start} - ${availability.workingHours.end}`);
    
    // Probar verificación de fecha
    const testDate = new Date('2024-01-15'); // Lunes
    const isAvailable = availability.isDateAvailable(testDate);
    console.log(`📆 ¿Disponible el ${testDate.toDateString()}? ${isAvailable ? 'Sí' : 'No'}`);
    
    // Probar horarios disponibles
    const timeSlots = availability.getAvailableTimeSlots(testDate);
    console.log(`⏰ Horarios disponibles: ${timeSlots.join(', ')}`);
    
    // Probar verificación de horario específico
    const testTimeSlot = '10:00';
    const isTimeAvailable = availability.isTimeSlotAvailable(testDate, testTimeSlot);
    console.log(`🕙 ¿Disponible ${testTimeSlot}? ${isTimeAvailable ? 'Sí' : 'No'}`);
    
    // Probar profesionales disponibles
    const availableProfessionals = await ProfessionalAvailability.findAvailableProfessionals(testDate);
    console.log(`👥 Profesionales disponibles el ${testDate.toDateString()}: ${availableProfessionals.length}`);
    
    console.log('\n✅ Todas las pruebas completadas exitosamente');
    
  } catch (error) {
    console.error('❌ Error en las pruebas:', error);
  } finally {
    // Cerrar conexión
    await mongoose.connection.close();
    console.log('🔌 Conexión a MongoDB cerrada');
    process.exit(0);
  }
}

// Ejecutar pruebas
testAvailability();
