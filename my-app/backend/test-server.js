// Script de prueba simple para diagnosticar el servidor
console.log('🔍 Iniciando diagnóstico del servidor...');

try {
  console.log('1. Cargando dependencias...');
  const express = require('express');
  const cors = require('cors');
  const mongoose = require('mongoose');
  
  console.log('✅ Dependencias cargadas correctamente');
  
  console.log('2. Creando aplicación Express...');
  const app = express();
  
  console.log('✅ Aplicación Express creada');
  
  console.log('3. Configurando middleware...');
  app.use(cors());
  app.use(express.json());
  
  console.log('✅ Middleware configurado');
  
  console.log('4. Intentando conectar a MongoDB...');
  mongoose.connect('mongodb://localhost:27017/turnario', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }).then(() => {
    console.log('✅ MongoDB conectado correctamente');
    
    console.log('5. Iniciando servidor...');
    const PORT = 3001;
    app.listen(PORT, () => {
      console.log(`✅ Servidor iniciado en puerto ${PORT}`);
      console.log('🎉 Diagnóstico completado exitosamente');
      process.exit(0);
    });
  }).catch(err => {
    console.error('❌ Error conectando a MongoDB:', err.message);
    process.exit(1);
  });
  
} catch (error) {
  console.error('❌ Error en el diagnóstico:', error.message);
  process.exit(1);
}
