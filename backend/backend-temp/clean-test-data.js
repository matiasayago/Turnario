const mongoose = require('mongoose');
const ProfessionalAvailability = require('./models/ProfessionalAvailability');

// Configuración de conexión
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/turnario';

async function cleanTestData() {
  try {
    console.log('🔄 Limpiando datos de prueba...');
    
    // Conectar a MongoDB
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Conexión a MongoDB exitosa');
    
    // Limpiar horarios bloqueados de todas las disponibilidades
    const availabilities = await ProfessionalAvailability.find({});
    
    for (const availability of availabilities) {
      if (availability.blockedTimeSlots && availability.blockedTimeSlots.length > 0) {
        availability.blockedTimeSlots = [];
        await availability.save();
        console.log(`✅ Limpiados horarios bloqueados de ${availability.professionalName}`);
      }
    }
    
    console.log('🎉 Datos de prueba limpiados exitosamente');
    
  } catch (error) {
    console.error('❌ Error limpiando datos:', error);
  } finally {
    // Cerrar conexión
    await mongoose.connection.close();
    console.log('🔌 Conexión a MongoDB cerrada');
  }
}

// Ejecutar limpieza
cleanTestData();
