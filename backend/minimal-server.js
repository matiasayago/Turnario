const express = require('express');
const app = express();
const PORT = 3001;

// Middleware básico
app.use(express.json());

// Endpoint de prueba
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Servidor funcionando',
    timestamp: new Date().toISOString()
  });
});

// Endpoint de disponibilidad mock
app.get('/api/v1/availability/:professionalId', (req, res) => {
  console.log('📅 GET disponibilidad para:', req.params.professionalId);
  res.json([]);
});

// Endpoint para guardar disponibilidad mock
app.post('/api/v1/availability/:professionalId', (req, res) => {
  console.log('💾 POST guardando disponibilidad para:', req.params.professionalId);
  console.log('📝 Datos:', req.body);
  res.json({
    success: true,
    message: 'Disponibilidad guardada exitosamente',
    data: req.body
  });
});

// Evitar 404 silencioso: la app Expo llama al API de pagos del servidor completo
const paymentsNotHere = (req, res) => {
  res.status(503).json({
    success: false,
    message:
      'Este servidor mínimo no tiene Mercado Pago ni citas Mongo. En backend ejecutá: npm start (src/server.js).',
  });
};
app.post('/api/v1/expo-payments/create-preference', paymentsNotHere);
app.get('/api/v1/expo-payments/status/:appointmentId', paymentsNotHere);

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor mínimo ejecutándose en puerto ${PORT}`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
});

console.log('📋 Servidor configurado, iniciando...');
