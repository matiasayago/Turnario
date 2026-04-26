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

const testLogin = async () => {
  try {
    await connectDB();
    
    console.log('🔍 Probando login...');
    
    const email = 'carlos.mendoza@turnario.com';
    const password = 'password123';
    
    // Buscar usuario
    const user = await User.findOne({ email: email.toLowerCase() });
    console.log('👤 Usuario encontrado:', user ? 'Sí' : 'No');
    
    if (user) {
      console.log('👤 Datos del usuario:', {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        userType: user.userType,
        isActive: user.isActive,
        passwordHash: user.password.substring(0, 20) + '...'
      });
      
      // Probar comparación de contraseña
      console.log('🔐 Comparando contraseña...');
      const validPassword = await user.comparePassword(password);
      console.log('🔐 Contraseña válida:', validPassword);
      
      if (validPassword) {
        console.log('✅ Login exitoso!');
      } else {
        console.log('❌ Contraseña incorrecta');
      }
    } else {
      console.log('❌ Usuario no encontrado');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    mongoose.connection.close();
  }
};

testLogin();
