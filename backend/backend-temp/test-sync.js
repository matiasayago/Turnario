const mongoose = require('mongoose');
const ProfessionalAvailability = require('./models/ProfessionalAvailability');

// Configuración de conexión
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/turnario';

async function testDatabaseConnection() {
  try {
    console.log('🔄 Probando conexión a la base de datos...');
    
    // Conectar a MongoDB
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Conexión a MongoDB exitosa');
    
    // Probar el modelo ProfessionalAvailability
    console.log('🔄 Probando modelo ProfessionalAvailability...');
    
    // Crear un documento de prueba
    const testAvailability = new ProfessionalAvailability({
      professionalId: new mongoose.Types.ObjectId(),
      professionalName: 'Dr. Test',
      daysOfWeek: {
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        friday: true,
        saturday: false,
        sunday: false
      },
      timeSlots: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'],
      workingHours: {
        start: '09:00',
        end: '17:00'
      },
      isActive: true
    });
    
    // Guardar en la base de datos
    await testAvailability.save();
    console.log('✅ Modelo ProfessionalAvailability funcionando correctamente');
    
    // Probar bloqueo de horario
    console.log('🔄 Probando bloqueo de horario...');
    await testAvailability.blockTimeSlot(
      new Date('2024-01-15'),
      '10:00',
      new mongoose.Types.ObjectId(),
      'Cita de prueba'
    );
    console.log('✅ Bloqueo de horario funcionando correctamente');
    
    // Probar obtención de horarios disponibles
    console.log('🔄 Probando obtención de horarios disponibles...');
    const availableSlots = testAvailability.getAvailableTimeSlots(new Date('2024-01-15'));
    console.log('✅ Horarios disponibles:', availableSlots);
    
    // Limpiar datos de prueba
    await ProfessionalAvailability.deleteOne({ _id: testAvailability._id });
    console.log('✅ Datos de prueba eliminados');
    
    console.log('🎉 Todas las pruebas de sincronización pasaron exitosamente');
    
  } catch (error) {
    console.error('❌ Error en las pruebas:', error);
  } finally {
    // Cerrar conexión
    await mongoose.connection.close();
    console.log('🔌 Conexión cerrada');
  }
}

// Ejecutar pruebas
testDatabaseConnection();
