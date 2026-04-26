const mongoose = require('mongoose');
const ProfessionalDateSchedule = require('./models/ProfessionalDateSchedule');

mongoose.connect('mongodb://localhost:27017/turnario')
  .then(async () => {
    console.log('✅ Conectado a MongoDB');
    
    const schedules = await ProfessionalDateSchedule.find({}).sort({ date: 1 });
    console.log('📅 Horarios encontrados:', schedules.length);
    
    schedules.forEach(schedule => {
      console.log(`📅 ${schedule.date} - Profesional: ${schedule.professionalId} - Horarios: ${schedule.timeSlots.length}`);
    });
    
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
