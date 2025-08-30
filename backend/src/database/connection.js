const mongoose = require('mongoose');

const config = require('../config.js');

const connectDB = async () => {
  try {
    const mongoURI = config.MONGODB_URI;

    const options = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    await mongoose.connect(mongoURI, options);

    // Eventos de conexión
    mongoose.connection.on('connected', () => {
      console.log('🔗 Mongoose conectado a MongoDB');
    });

    mongoose.connection.on('error', (err) => {
      console.error('❌ Error de conexión MongoDB:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('🔌 Mongoose desconectado de MongoDB');
    });

    // Manejo de señales de terminación
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('🛑 Conexión MongoDB cerrada por terminación de la aplicación');
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await mongoose.connection.close();
      console.log('🛑 Conexión MongoDB cerrada por terminación de la aplicación');
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Error al conectar a MongoDB:', error);
    throw error;
  }
};

module.exports = { connectDB };

