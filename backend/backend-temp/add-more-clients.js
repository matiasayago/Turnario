const mongoose = require('mongoose');
require('dotenv').config();

// Importar modelo de usuario
const User = require('./src/models/User');

// Datos adicionales de usuarios cliente
const additionalClientsData = [
  {
    email: 'ana.martinez@email.com',
    password: 'password123',
    fullName: 'Ana Martínez',
    userType: 'client',
    phone: '+5491134567890',
    dateOfBirth: new Date('1992-11-08'),
    address: {
      street: 'Palermo 890',
      city: 'Buenos Aires',
      state: 'CABA',
      zipCode: '1414',
      country: 'Argentina'
    },
    medicalHistory: {
      allergies: ['Polvo', 'Ácaros'],
      chronicConditions: ['Asma leve'],
      bloodType: 'B+',
      emergencyContact: {
        name: 'Roberto Martínez',
        relationship: 'Padre',
        phone: '+5491176543210'
      }
    },
    isActive: true
  },
  {
    email: 'luis.fernandez@email.com',
    password: 'password123',
    fullName: 'Luis Fernández',
    userType: 'client',
    phone: '+5491145678901',
    dateOfBirth: new Date('1980-05-12'),
    address: {
      street: 'Recoleta 234',
      city: 'Buenos Aires',
      state: 'CABA',
      zipCode: '1120',
      country: 'Argentina'
    },
    medicalHistory: {
      allergies: ['Sulfamidas'],
      chronicConditions: ['Problemas cardíacos'],
      bloodType: 'AB+',
      emergencyContact: {
        name: 'Elena Fernández',
        relationship: 'Esposa',
        phone: '+5491165432109'
      }
    },
    isActive: true
  },
  {
    email: 'elena.silva@email.com',
    password: 'password123',
    fullName: 'Elena Silva',
    userType: 'client',
    phone: '+5491156789012',
    dateOfBirth: new Date('1987-09-30'),
    address: {
      street: 'Villa Crespo 456',
      city: 'Buenos Aires',
      state: 'CABA',
      zipCode: '1414',
      country: 'Argentina'
    },
    medicalHistory: {
      allergies: ['Lactosa'],
      chronicConditions: ['Migrañas'],
      bloodType: 'O-',
      emergencyContact: {
        name: 'Miguel Silva',
        relationship: 'Hermano',
        phone: '+5491154321098'
      }
    },
    isActive: true
  },
  {
    email: 'roberto.fernandez@email.com',
    password: 'password123',
    fullName: 'Roberto Fernández',
    userType: 'client',
    phone: '+5491167890123',
    dateOfBirth: new Date('1975-12-03'),
    address: {
      street: 'San Telmo 789',
      city: 'Buenos Aires',
      state: 'CABA',
      zipCode: '1103',
      country: 'Argentina'
    },
    medicalHistory: {
      allergies: [],
      chronicConditions: ['Hipertensión', 'Diabetes'],
      bloodType: 'A-',
      emergencyContact: {
        name: 'Carmen Fernández',
        relationship: 'Hija',
        phone: '+5491143210987'
      }
    },
    isActive: true
  },
  {
    email: 'carmen.ruiz@email.com',
    password: 'password123',
    fullName: 'Carmen Ruiz',
    userType: 'client',
    phone: '+5491178901234',
    dateOfBirth: new Date('1983-06-18'),
    address: {
      street: 'La Boca 321',
      city: 'Buenos Aires',
      state: 'CABA',
      zipCode: '1160',
      country: 'Argentina'
    },
    medicalHistory: {
      allergies: ['Mariscos'],
      chronicConditions: ['Artritis'],
      bloodType: 'B-',
      emergencyContact: {
        name: 'Diego Ruiz',
        relationship: 'Esposo',
        phone: '+5491132109876'
      }
    },
    isActive: true
  },
  {
    email: 'diego.morales@email.com',
    password: 'password123',
    fullName: 'Diego Morales',
    userType: 'client',
    phone: '+5491189012345',
    dateOfBirth: new Date('1990-03-25'),
    address: {
      street: 'Colegiales 654',
      city: 'Buenos Aires',
      state: 'CABA',
      zipCode: '1426',
      country: 'Argentina'
    },
    medicalHistory: {
      allergies: ['Polen'],
      chronicConditions: ['Rinitis alérgica'],
      bloodType: 'O+',
      emergencyContact: {
        name: 'Sofía Morales',
        relationship: 'Hermana',
        phone: '+5491121098765'
      }
    },
    isActive: true
  },
  {
    email: 'sofia.herrera@email.com',
    password: 'password123',
    fullName: 'Sofía Herrera',
    userType: 'client',
    phone: '+5491190123456',
    dateOfBirth: new Date('1988-07-14'),
    address: {
      street: 'Chacarita 987',
      city: 'Buenos Aires',
      state: 'CABA',
      zipCode: '1427',
      country: 'Argentina'
    },
    medicalHistory: {
      allergies: ['Nueces'],
      chronicConditions: ['Ansiedad'],
      bloodType: 'AB-',
      emergencyContact: {
        name: 'Javier Herrera',
        relationship: 'Padre',
        phone: '+5491109876543'
      }
    },
    isActive: true
  },
  {
    email: 'javier.castro@email.com',
    password: 'password123',
    fullName: 'Javier Castro',
    userType: 'client',
    phone: '+5491101234567',
    dateOfBirth: new Date('1982-11-30'),
    address: {
      street: 'Villa Urquiza 147',
      city: 'Buenos Aires',
      state: 'CABA',
      zipCode: '1431',
      country: 'Argentina'
    },
    medicalHistory: {
      allergies: ['Látex'],
      chronicConditions: ['Depresión'],
      bloodType: 'A+',
      emergencyContact: {
        name: 'María Castro',
        relationship: 'Madre',
        phone: '+5491098765432'
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

// Función para agregar usuarios cliente
async function addClients() {
  try {
    const clients = await User.insertMany(additionalClientsData);
    console.log(`✅ ${clients.length} usuarios cliente adicionales creados`);
    
    // Mostrar información de los usuarios creados
    console.log('\n👥 Usuarios cliente creados:');
    clients.forEach(client => {
      console.log(`   • ${client.fullName} - ${client.email} (password: password123)`);
    });
    
    return clients;
  } catch (error) {
    console.error('❌ Error creando usuarios cliente:', error);
    return [];
  }
}

// Función principal
async function addMoreClients() {
  try {
    console.log('🚀 Agregando usuarios cliente adicionales...');
    
    // Conectar a la base de datos
    await connectDB();
    
    // Agregar usuarios cliente
    const clients = await addClients();
    
    console.log('\n🎉 Usuarios cliente agregados exitosamente!');
    console.log(`📊 Total de usuarios cliente en la base de datos: ${clients.length + 2}`); // +2 por los originales
    
  } catch (error) {
    console.error('❌ Error agregando usuarios cliente:', error);
  } finally {
    // Cerrar conexión
    await mongoose.connection.close();
    console.log('\n🔌 Conexión a MongoDB cerrada');
    process.exit(0);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  addMoreClients();
}

module.exports = { addMoreClients };
