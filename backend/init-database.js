const mongoose = require('mongoose');
require('dotenv').config();

// Importar modelos
const User = require('./src/models/User');
const Service = require('./src/models/Service');
const Clinic = require('./src/models/Clinic');
const Appointment = require('./src/models/Appointment');

// Datos de prueba para servicios
const servicesData = [
  {
    name: 'Consulta Psicológica',
    description: 'Sesión de terapia individual para adultos',
    duration: 50,
    price: {
      amount: 15000,
      currency: 'ARS'
    },
    category: 'Psicología',
    isActive: true
  },
  {
    name: 'Terapia Cognitivo-Conductual',
    description: 'Terapia especializada en modificación de pensamientos y comportamientos',
    duration: 60,
    price: {
      amount: 18000,
      currency: 'ARS'
    },
    category: 'Psicología',
    isActive: true
  },
  {
    name: 'Terapia Familiar',
    description: 'Sesión de terapia para familias',
    duration: 90,
    price: {
      amount: 22000,
      currency: 'ARS'
    },
    category: 'Psicología',
    isActive: true
  },
  {
    name: 'Psicología Infantil',
    description: 'Terapia especializada para niños y adolescentes',
    duration: 45,
    price: {
      amount: 12000,
      currency: 'ARS'
    },
    category: 'Psicología',
    isActive: true
  },
  {
    name: 'Terapia de Pareja',
    description: 'Sesión de terapia para parejas',
    duration: 90,
    price: {
      amount: 25000,
      currency: 'ARS'
    },
    category: 'Psicología',
    isActive: true
  }
];

// Datos de prueba para clínicas
const clinicsData = [
  {
    name: 'Centro Médico Palermo',
    address: {
      street: 'Av. Santa Fe 1234',
      city: 'Buenos Aires',
      state: 'CABA',
      zipCode: '1414',
      country: 'Argentina'
    },
    contact: {
      phone: '+541112345678',
      email: 'info@centropalermo.com'
    },
    type: 'centro_médico',
    specialties: ['Psicología', 'Psiquiatría'],
    isActive: true
  },
  {
    name: 'Consultorio Belgrano',
    address: {
      street: 'Av. Cabildo 567',
      city: 'Buenos Aires',
      state: 'CABA',
      zipCode: '1428',
      country: 'Argentina'
    },
    contact: {
      phone: '+54987654321',
      email: 'info@consultoriobelgrano.com'
    },
    type: 'consultorio',
    specialties: ['Psicología'],
    isActive: true
  }
];

// Datos de prueba para usuarios profesionales
const professionalsData = [
  {
    email: 'dr.carlos.mendoza@turnario.com',
    password: 'password123',
    fullName: 'Dr. Carlos Mendoza',
    userType: 'professional',
    phone: '+541112345678',
    professionalInfo: {
      license: 'MP-12345',
      specialization: 'Psicología Clínica',
      experience: 15,
      education: [
        {
          degree: 'Licenciado en Psicología',
          institution: 'Universidad de Buenos Aires',
          year: 2005
        }
      ],
      consultationFee: 15000,
      rating: {
        average: 4.8,
        totalReviews: 127
      }
    },
    isActive: true
  },
  {
    email: 'dra.ana.martinez@turnario.com',
    password: 'password123',
    fullName: 'Dra. Ana Martínez',
    userType: 'professional',
    phone: '+54987654321',
    professionalInfo: {
      license: 'MP-67890',
      specialization: 'Psicología Infantil',
      experience: 8,
      education: [
        {
          degree: 'Licenciada en Psicología',
          institution: 'Universidad de Belgrano',
          year: 2012
        }
      ],
      consultationFee: 12000,
      rating: {
        average: 4.9,
        totalReviews: 89
      }
    },
    isActive: true
  }
];

// Datos de prueba para usuarios cliente
const clientsData = [
  {
    email: 'maria.gonzalez@email.com',
    password: 'password123',
    fullName: 'María González',
    userType: 'client',
    phone: '+5491112345678',
    dateOfBirth: new Date('1985-03-15'),
    address: {
      street: 'Av. Corrientes 1234',
      city: 'Buenos Aires',
      state: 'CABA',
      zipCode: '1414',
      country: 'Argentina'
    },
    medicalHistory: {
      allergies: ['Penicilina'],
      chronicConditions: ['Hipertensión'],
      bloodType: 'A+',
      emergencyContact: {
        name: 'Carlos González',
        relationship: 'Esposo',
        phone: '+5491198765432'
      }
    },
    isActive: true
  },
  {
    email: 'carlos.rodriguez@email.com',
    password: 'password123',
    fullName: 'Carlos Rodríguez',
    userType: 'client',
    phone: '+5491123456789',
    dateOfBirth: new Date('1978-07-22'),
    address: {
      street: 'Belgrano 567',
      city: 'Buenos Aires',
      state: 'CABA',
      zipCode: '1428',
      country: 'Argentina'
    },
    medicalHistory: {
      allergies: [],
      chronicConditions: ['Diabetes tipo 2'],
      bloodType: 'O+',
      emergencyContact: {
        name: 'Laura Rodríguez',
        relationship: 'Hija',
        phone: '+5491187654321'
      }
    },
    isActive: true
  }
];

// Función para conectar a la base de datos
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');
  } catch (error) {
    console.error('❌ Error conectando a MongoDB:', error);
    process.exit(1);
  }
}

// Función para limpiar la base de datos
async function clearDatabase() {
  try {
    await User.deleteMany({});
    await Service.deleteMany({});
    await Clinic.deleteMany({});
    await Appointment.deleteMany({});
    console.log('🧹 Base de datos limpiada');
  } catch (error) {
    console.error('❌ Error limpiando base de datos:', error);
  }
}

// Función para crear servicios
async function createServices() {
  try {
    const services = await Service.insertMany(servicesData);
    console.log(`✅ ${services.length} servicios creados`);
    return services;
  } catch (error) {
    console.error('❌ Error creando servicios:', error);
    return [];
  }
}

// Función para crear clínicas
async function createClinics() {
  try {
    const clinics = await Clinic.insertMany(clinicsData);
    console.log(`✅ ${clinics.length} clínicas creadas`);
    return clinics;
  } catch (error) {
    console.error('❌ Error creando clínicas:', error);
    return [];
  }
}

// Función para crear usuarios
async function createUsers() {
  try {
    const users = await User.insertMany([...professionalsData, ...clientsData]);
    console.log(`✅ ${users.length} usuarios creados`);
    return users;
  } catch (error) {
    console.error('❌ Error creando usuarios:', error);
    return [];
  }
}

// Función principal
async function initializeDatabase() {
  try {
    console.log('🚀 Inicializando base de datos Turnario...');
    
    // Conectar a la base de datos
    await connectDB();
    
    // Limpiar base de datos existente
    await clearDatabase();
    
    // Crear datos de prueba
    const services = await createServices();
    const clinics = await createClinics();
    const users = await createUsers();
    
    console.log('\n🎉 Base de datos inicializada exitosamente!');
    console.log(`📊 Resumen:`);
    console.log(`   • ${services.length} servicios`);
    console.log(`   • ${clinics.length} clínicas`);
    console.log(`   • ${users.length} usuarios`);
    
    // Mostrar información de acceso
    console.log('\n🔑 Usuarios de prueba creados:');
    console.log('   • Profesionales:');
    professionalsData.forEach(prof => {
      console.log(`     - ${prof.email} (password: password123)`);
    });
    console.log('   • Clientes:');
    clientsData.forEach(client => {
      console.log(`     - ${client.email} (password: password123)`);
    });
    
  } catch (error) {
    console.error('❌ Error inicializando base de datos:', error);
  } finally {
    // Cerrar conexión
    await mongoose.connection.close();
    console.log('\n🔌 Conexión a MongoDB cerrada');
    process.exit(0);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  initializeDatabase();
}

module.exports = { initializeDatabase };
