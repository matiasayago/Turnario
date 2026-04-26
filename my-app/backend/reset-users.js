const mongoose = require('mongoose');
const User = require('./models/User');

// Conectar a MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/turnario');
    console.log(`MongoDB Conectado: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

const resetUsers = async () => {
  try {
    await connectDB();
    
    console.log('🧹 Eliminando usuarios existentes...');
    await User.deleteMany({});
    
    console.log('👥 Creando usuarios con contraseñas hasheadas...');
    
    const users = [
      {
        fullName: 'Dr. Carlos Mendoza',
        email: 'carlos.mendoza@turnario.com',
        password: 'password123',
        phone: '+54 11 1234-5678',
        userType: 'professional',
        service: 'Medicina General',
        isEmailVerified: true,
        isActive: true,
        address: {
          street: 'Av. Corrientes 1234',
          city: 'Buenos Aires',
          state: 'CABA',
          country: 'Argentina',
          postalCode: '1043'
        }
      },
      {
        fullName: 'Dra. María González',
        email: 'maria.gonzalez@turnario.com',
        password: 'password123',
        phone: '+54 11 2345-6789',
        userType: 'professional',
        service: 'Cardiología',
        isEmailVerified: true,
        isActive: true,
        address: {
          street: 'Av. Santa Fe 5678',
          city: 'Buenos Aires',
          state: 'CABA',
          country: 'Argentina',
          postalCode: '1060'
        }
      },
      {
        fullName: 'Ana Martínez',
        email: 'ana.martinez@email.com',
        password: 'password123',
        phone: '+54 11 3456-7890',
        userType: 'client',
        isEmailVerified: true,
        isActive: true,
        address: {
          street: 'Av. Rivadavia 9012',
          city: 'Buenos Aires',
          state: 'CABA',
          country: 'Argentina',
          postalCode: '1033'
        }
      },
      {
        fullName: 'Juan Pérez',
        email: 'juan.perez@email.com',
        password: 'password123',
        phone: '+54 11 4567-8901',
        userType: 'client',
        isEmailVerified: true,
        isActive: true,
        address: {
          street: 'Av. Callao 3456',
          city: 'Buenos Aires',
          state: 'CABA',
          country: 'Argentina',
          postalCode: '1023'
        }
      }
    ];

    // Crear usuarios uno por uno para que se ejecute el middleware de hashing
    const createdUsers = [];
    for (const userData of users) {
      const user = new User(userData);
      await user.save();
      createdUsers.push(user);
    }
    console.log(`✅ ${createdUsers.length} usuarios creados con contraseñas hasheadas`);
    
    console.log('\n🔑 Credenciales de prueba:');
    console.log('👨‍⚕️ Profesional: carlos.mendoza@turnario.com / password123');
    console.log('👩‍⚕️ Profesional: maria.gonzalez@turnario.com / password123');
    console.log('👤 Cliente: ana.martinez@email.com / password123');
    console.log('👤 Cliente: juan.perez@email.com / password123');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    mongoose.connection.close();
  }
};

resetUsers();
