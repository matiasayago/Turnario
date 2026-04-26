require('dotenv').config();
const mongoose = require('mongoose');

// Importar modelos
const User = require('../models/User');
const Service = require('../models/Service');
const Category = require('../models/Category');
const Clinic = require('../models/Clinic');

async function seedServices() {
  try {
    console.log('🔄 Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/turnario');
    console.log('✅ Conectado a MongoDB');

    console.log('🌱 Poblando servicios...');
    
    // Obtener categorías y profesionales
    const categories = await Category.find({ status: 'active' });
    const professionals = await User.find({ userType: 'professional', isActive: true });
    const clinics = await Clinic.find({ status: 'active' });

    console.log(`📊 Encontrados: ${categories.length} categorías, ${professionals.length} profesionales, ${clinics.length} clínicas`);

    if (categories.length === 0 || professionals.length === 0) {
      console.log('⚠️ No hay categorías o profesionales para crear servicios');
      return;
    }

    const services = [
      {
        name: 'Consulta Psicológica Individual',
        description: 'Sesión individual de psicoterapia con enfoque cognitivo-conductual',
        duration: 60,
        basePrice: 8000,
        category: 'psychology',
        businessType: 'medical',
        professional: professionals.find(p => p.fullName.includes('Carlos'))?._id,
        clinic: clinics[0]?._id,
        createdBy: professionals.find(p => p.fullName.includes('Carlos'))?._id,
        isActive: true,
        maxBookingsPerDay: 8
      },
      {
        name: 'Consulta Médica General',
        description: 'Consulta médica general para adultos',
        duration: 30,
        basePrice: 5000,
        category: 'medical_consultation',
        businessType: 'medical',
        professional: professionals.find(p => p.fullName.includes('María'))?._id,
        clinic: clinics[0]?._id,
        createdBy: professionals.find(p => p.fullName.includes('María'))?._id,
        isActive: true,
        maxBookingsPerDay: 12
      },
      {
        name: 'Terapia de Pareja',
        description: 'Sesión de terapia para parejas',
        duration: 90,
        basePrice: 12000,
        category: 'psychology',
        businessType: 'medical',
        professional: professionals.find(p => p.fullName.includes('Carlos'))?._id,
        clinic: clinics[1]?._id,
        createdBy: professionals.find(p => p.fullName.includes('Carlos'))?._id,
        isActive: true,
        maxBookingsPerDay: 4
      }
    ];

    for (const serviceData of services) {
      if (serviceData.category && serviceData.professional && serviceData.clinic && serviceData.createdBy) {
        const existingService = await Service.findOne({ 
          name: serviceData.name, 
          professional: serviceData.professional 
        });
        
        if (!existingService) {
          await Service.create(serviceData);
          console.log(`✅ Servicio creado: ${serviceData.name}`);
        } else {
          console.log(`ℹ️ Servicio ya existe: ${serviceData.name}`);
        }
      } else {
        console.log(`⚠️ No se pudo crear servicio: ${serviceData.name} - faltan referencias`);
        console.log(`   - category: ${serviceData.category}`);
        console.log(`   - professional: ${serviceData.professional}`);
        console.log(`   - clinic: ${serviceData.clinic}`);
        console.log(`   - createdBy: ${serviceData.createdBy}`);
      }
    }

    console.log('✅ Servicios poblados exitosamente');
    console.log(`📊 Total de servicios: ${await Service.countDocuments()}`);

  } catch (error) {
    console.error('❌ Error poblando servicios:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Conexión cerrada');
  }
}

seedServices();
