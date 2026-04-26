const mongoose = require('mongoose');
const ProfessionalAvailability = require('../models/ProfessionalAvailability');
const User = require('../models/User');
require('dotenv').config();

// Configuración de la base de datos
const MONGODB_URI = process.env.MONGODB_URI || '
mongodb://localhost:27017/turnario';

// Datos de ejemplo para disponibilidad
const sampleAvailabilities = [
  {
    professionalId: null, // Se asignará dinámicamente
    professionalName: 'Dr. Carlos Mendoza',
    daysOfWeek: {
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: false,
      sunday: false
    },
            timeSlots: ['08:00', '09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00', '18:00'],
    workingHours: {
      start: '08:00',
      end: '18:00'
    },
    breakTime: {
      start: '13:00',
      end: '14:00'
    },
    isActive: true,
    timezone: 'America/Argentina/Buenos_Aires',
    specialDates: [
      {
        date: new Date('2024-12-25'),
        isAvailable: false,
        reason: 'Navidad'
      },
      {
        date: new Date('2024-12-31'),
        isAvailable: false,
        reason: 'Año Nuevo'
      }
    ],
    recurringExceptions: []
  },
  {
    professionalId: null, // Se asignará dinámicamente
    professionalName: 'Dra. María González',
    daysOfWeek: {
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: true,
      sunday: false
    },
    timeSlots: ['08:00', '09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00', '18:00'],
    workingHours: {
      start: '08:00',
      end: '19:00'
    },
    breakTime: {
      start: '13:00',
      end: '14:00'
    },
    isActive: true,
    timezone: 'America/Argentina/Buenos_Aires',
    specialDates: [
      {
        date: new Date('2024-12-25'),
        isAvailable: false,
        reason: 'Navidad'
      }
    ],
    recurringExceptions: [
      {
        dayOfWeek: 6, // Sábado
        startDate: new Date('2024-12-01'),
        endDate: new Date('2024-12-31'),
        isAvailable: false,
        reason: 'Vacaciones de verano'
      }
    ]
  },
  {
    professionalId: null, // Se asignará dinámicamente
    professionalName: 'Lic. Juan Pérez',
    daysOfWeek: {
      monday: true,
      tuesday: true,
      wednesday: false,
      thursday: true,
      friday: true,
      saturday: true,
      sunday: false
    },
    timeSlots: ['10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'],
    workingHours: {
      start: '10:00',
      end: '18:00'
    },
    breakTime: {
      start: '13:00',
      end: '14:00'
    },
    isActive: true,
    timezone: 'America/Argentina/Buenos_Aires',
    specialDates: [],
    recurringExceptions: []
  }
];

async function seedAvailability() {
  try {
    console.log('🌱 Iniciando seed de disponibilidad...');
    
    // Conectar a MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB');
    
    // Limpiar disponibilidades existentes
    await ProfessionalAvailability.deleteMany({});
    console.log('🗑️ Disponibilidades existentes eliminadas');
    
    // Obtener profesionales existentes
    const professionals = await User.find({ userType: 'professional' });
    console.log(`👥 Encontrados ${professionals.length} profesionales`);
    
    if (professionals.length === 0) {
      console.log('⚠️ No hay profesionales en la base de datos. Creando profesionales de ejemplo...');
      
      // Crear profesionales de ejemplo
      const sampleProfessionals = [
        {
          fullName: 'Dr. Carlos Mendoza',
          email: 'carlos.mendoza@turnario.com',
          password: 'password123',
          userType: 'professional',
          phone: '+54 11 1234-5678',
          service: 'Medicina General',
          isActive: true,
          isEmailVerified: true
        },
        {
          fullName: 'Dra. María González',
          email: 'maria.gonzalez@turnario.com',
          password: 'password123',
          userType: 'professional',
          phone: '+54 11 2345-6789',
          service: 'Cardiología',
          isActive: true,
          isEmailVerified: true
        },
        {
          fullName: 'Lic. Juan Pérez',
          email: 'juan.perez@turnario.com',
          password: 'password123',
          userType: 'professional',
          phone: '+54 11 3456-7890',
          service: 'Psicología',
          isActive: true,
          isEmailVerified: true
        }
      ];
      
      const createdProfessionals = await User.insertMany(sampleProfessionals);
      console.log(`✅ Creados ${createdProfessionals.length} profesionales de ejemplo`);
      
      // Asignar IDs de profesionales a las disponibilidades
      for (let i = 0; i < sampleAvailabilities.length && i < createdProfessionals.length; i++) {
        sampleAvailabilities[i].professionalId = createdProfessionals[i]._id;
      }
    } else {
      // Asignar IDs de profesionales existentes
      for (let i = 0; i < sampleAvailabilities.length && i < professionals.length; i++) {
        sampleAvailabilities[i].professionalId = professionals[i]._id;
        sampleAvailabilities[i].professionalName = professionals[i].fullName;
      }
    }
    
    // Crear disponibilidades
    const availabilities = await ProfessionalAvailability.insertMany(sampleAvailabilities);
    console.log(`✅ Creadas ${availabilities.length} disponibilidades`);
    
    // Mostrar resumen
    console.log('\n📊 Resumen de disponibilidades creadas:');
    for (const availability of availabilities) {
      console.log(`- ${availability.professionalName}: ${Object.values(availability.daysOfWeek).filter(Boolean).length} días/semana, ${availability.timeSlots.length} horarios`);
    }
    
    console.log('\n🎉 Seed de disponibilidad completado exitosamente');
    
  } catch (error) {
    console.error('❌ Error en seed de disponibilidad:', error);
  } finally {
    // Cerrar conexión
    await mongoose.connection.close();
    console.log('🔌 Conexión a MongoDB cerrada');
    process.exit(0);
  }
}

// Ejecutar seed si se llama directamente
if (require.main === module) {
  seedAvailability();
}

module.exports = { seedAvailability };
