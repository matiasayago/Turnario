const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Conectar a MongoDB
mongoose.connect('mongodb://localhost:27017/turnario', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ MongoDB conectado');
})
.catch(err => {
  console.error('❌ Error MongoDB:', err.message);
});

// Esquema de Usuario simplificado
const userSchema = new mongoose.Schema({
  fullName: String,
  email: String,
  phone: String,
  service: String,
  userType: String,
  isActive: Boolean,
  isEmailVerified: Boolean,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Endpoint de prueba
app.get('/api/v1/test', (req, res) => {
  res.json({ message: 'Servidor funcionando correctamente' });
});

// Endpoint de login simplificado
app.post('/api/v1/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Buscar usuario en la base de datos
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }
    
    // Simular token JWT
    const token = `simple_token_${user._id}_${Date.now()}`;
    
    res.json({
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        service: user.service,
        userType: user.userType,
        isActive: user.isActive,
        isEmailVerified: user.isEmailVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      },
      token,
      message: 'Login exitoso'
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Middleware de autenticación simplificado
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No hay token de autenticación' });
  }

  // Simular verificación de token
  req.user = { userId: '3' }; // Usuario fijo para pruebas
  next();
};

// Endpoint de actualización de perfil
app.put('/api/v1/users/profile', authenticateToken, async (req, res) => {
  try {
    console.log('📝 Actualizando perfil del usuario:', req.user.userId);
    console.log('📝 Datos recibidos:', req.body);
    
    const { fullName, phone, service, address, preferences } = req.body;
    
    // Validar que al menos un campo esté presente
    if (!fullName && !phone && !service && !address && !preferences) {
      return res.status(400).json({ error: 'Al menos un campo debe ser proporcionado para actualizar' });
    }
    
    // Buscar el usuario
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    // Actualizar solo los campos proporcionados
    const updateData = {};
    if (fullName !== undefined) updateData.fullName = fullName;
    if (phone !== undefined) updateData.phone = phone;
    if (service !== undefined) updateData.service = service;
    if (address !== undefined) updateData.address = address;
    if (preferences !== undefined) updateData.preferences = preferences;
    
    updateData.updatedAt = new Date();
    
    // Actualizar en la base de datos
    const updatedUser = await User.findByIdAndUpdate(
      req.user.userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');
    
    console.log('✅ Perfil actualizado en la base de datos:', updatedUser);
    
    res.json({
      message: 'Perfil actualizado exitosamente',
      user: updatedUser
    });
  } catch (error) {
    console.error('❌ Error actualizando perfil:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Crear usuario de prueba si no existe
app.post('/api/v1/setup-test-user', async (req, res) => {
  try {
    const testUser = await User.findOneAndUpdate(
      { email: 'carlos.mendoza@turnario.com' },
      {
        fullName: 'Dr. Carlos Mendoza',
        email: 'carlos.mendoza@turnario.com',
        phone: '+54 11 1234-5678',
        service: 'Medicina General',
        userType: 'professional',
        isActive: true,
        isEmailVerified: true,
        updatedAt: new Date()
      },
      { upsert: true, new: true }
    );
    
    console.log('✅ Usuario de prueba creado/actualizado:', testUser);
    res.json({ message: 'Usuario de prueba configurado', user: testUser });
  } catch (error) {
    console.error('❌ Error configurando usuario de prueba:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor simplificado iniciado en puerto ${PORT}`);
  console.log(`📡 Endpoints disponibles:`);
  console.log(`   GET  http://localhost:${PORT}/api/v1/test`);
  console.log(`   POST http://localhost:${PORT}/api/v1/auth/login`);
  console.log(`   PUT  http://localhost:${PORT}/api/v1/users/profile`);
  console.log(`   POST http://localhost:${PORT}/api/v1/setup-test-user`);
});
