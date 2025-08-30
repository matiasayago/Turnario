const mongoose = require('mongoose');
require('dotenv').config();

async function testConnection() {
  try {
    console.log('🔌 Probando conexión a MongoDB...');
    
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/turnario';
    await mongoose.connect(mongoURI);
    
    console.log('✅ Conectado a MongoDB');
    
    // Verificar colecciones
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('📚 Colecciones disponibles:', collections.map(c => c.name));
    
    // Verificar datos en cada colección
    const Service = require('./src/models/Service');
    const Clinic = require('./src/models/Clinic');
    const User = require('./src/models/User');
    
    const services = await Service.find({});
    console.log(`🔧 Servicios: ${services.length}`);
    
    const clinics = await Clinic.find({});
    console.log(`🏥 Clínicas: ${clinics.length}`);
    
    const users = await User.find({});
    console.log(`👥 Usuarios: ${users.length}`);
    
    // Mostrar algunos ejemplos
    if (services.length > 0) {
      console.log('📋 Primer servicio:', services[0].name);
    }
    
    if (clinics.length > 0) {
      console.log('🏥 Primera clínica:', clinics[0].name);
    }
    
    if (users.length > 0) {
      console.log('👤 Primer usuario:', users[0].fullName);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Conexión cerrada');
  }
}

testConnection();

