const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Importar modelos
const User = require('./models/User');
const Service = require('./models/Service');
const Clinic = require('./models/Clinic');
const Appointment = require('./models/Appointment');
const Notification = require('./models/Notification');
const Review = require('./models/Review');
const ProfessionalAvailability = require('./models/ProfessionalAvailability');

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

// Datos de prueba
const seedData = async () => {
  try {
    console.log('🌱 Iniciando inserción de datos de prueba...');

    // Limpiar datos existentes
    await User.deleteMany({});
    await Service.deleteMany({});
    await Clinic.deleteMany({});
    await Appointment.deleteMany({});
    await Notification.deleteMany({});
    await Review.deleteMany({});
    await ProfessionalAvailability.deleteMany({});

    console.log('🧹 Datos existentes eliminados');

    // Crear usuarios
    const users = [
      {
        fullName: 'Dr. Carlos Mendoza',
        email: 'carlos.mendoza@turnario.com',
        password: 'password123',
        phone: '+54 11 1234-5678',
        userType: 'professional',
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

    const createdUsers = await User.insertMany(users);
    console.log(`👥 ${createdUsers.length} usuarios creados`);

    // Crear servicios
    const services = [
      {
        name: 'Consulta Psicológica',
        description: 'Sesión de terapia psicológica individual',
        category: 'Psicología',
        subcategory: 'Terapia Individual',
        price: 10000,
        currency: 'ARS',
        duration: 50,
        isActive: true,
        requiresDeposit: true,
        depositAmount: 2000,
        depositPercentage: 20,
        maxAdvanceBooking: 30,
        cancellationPolicy: 'moderate',
        cancellationHours: 24,
        requirements: ['Documento de identidad', 'Historia clínica previa'],
        contraindications: ['Crisis aguda de salud mental'],
        preparation: ['Llegar 10 minutos antes', 'Traer documentación médica'],
        aftercare: ['Seguir recomendaciones del terapeuta', 'Tomar medicación si fue prescrita'],
        tags: ['psicología', 'terapia', 'salud mental']
      },
      {
        name: 'Consulta Psiquiátrica',
        description: 'Evaluación y tratamiento psiquiátrico',
        category: 'Psiquiatría',
        subcategory: 'Consulta General',
        price: 15000,
        currency: 'ARS',
        duration: 40,
        isActive: true,
        requiresDeposit: true,
        depositAmount: 3000,
        depositPercentage: 20,
        maxAdvanceBooking: 30,
        cancellationPolicy: 'moderate',
        cancellationHours: 24,
        requirements: ['Documento de identidad', 'Historia clínica', 'Estudios previos'],
        contraindications: ['Alergias medicamentosas conocidas'],
        preparation: ['Ayuno de 8 horas si se requiere análisis', 'Traer estudios previos'],
        aftercare: ['Seguir tratamiento prescrito', 'Control en 30 días'],
        tags: ['psiquiatría', 'medicina', 'tratamiento']
      },
      {
        name: 'Terapia de Pareja',
        description: 'Sesión de terapia de pareja',
        category: 'Psicología',
        subcategory: 'Terapia de Pareja',
        price: 12000,
        currency: 'ARS',
        duration: 60,
        isActive: true,
        requiresDeposit: true,
        depositAmount: 2400,
        depositPercentage: 20,
        maxAdvanceBooking: 30,
        cancellationPolicy: 'moderate',
        cancellationHours: 24,
        requirements: ['Ambos miembros de la pareja', 'Documentos de identidad'],
        contraindications: ['Violencia doméstica activa'],
        preparation: ['Llegar juntos', 'Preparar temas a tratar'],
        aftercare: ['Ejercicios de comunicación', 'Seguimiento semanal'],
        tags: ['psicología', 'pareja', 'relaciones']
      }
    ];

    const createdServices = await Service.insertMany(services);
    console.log(`🩺 ${createdServices.length} servicios creados`);

    // Crear clínicas
    const clinics = [
      {
        name: 'Centro de Salud Mental Buenos Aires',
        description: 'Centro especializado en salud mental y bienestar emocional',
        address: {
          street: 'Av. Corrientes 1234',
          city: 'Buenos Aires',
          state: 'CABA',
          zipCode: '1043',
          country: 'Argentina',
          coordinates: {
            latitude: -34.6037,
            longitude: -58.3816
          }
        },
        phone: '+54 11 1234-5678',
        email: 'info@centrosaludmental.com',
        website: 'https://centrosaludmental.com',
        type: 'specialized_center',
        specialties: ['Psicología', 'Psiquiatría', 'Terapia Ocupacional'],
        services: ['Consultas', 'Terapias', 'Evaluaciones', 'Tratamientos'],
        operatingHours: {
          monday: { open: '08:00', close: '20:00', closed: false },
          tuesday: { open: '08:00', close: '20:00', closed: false },
          wednesday: { open: '08:00', close: '20:00', closed: false },
          thursday: { open: '08:00', close: '20:00', closed: false },
          friday: { open: '08:00', close: '18:00', closed: false },
          saturday: { open: '09:00', close: '13:00', closed: false },
          sunday: { open: '09:00', close: '13:00', closed: true }
        },
        amenities: ['Estacionamiento', 'WiFi', 'Sala de espera', 'Accesibilidad'],
        insurance: ['OSDE', 'Swiss Medical', 'Galeno', 'Particular'],
        isActive: true
      }
    ];

    const createdClinics = await Clinic.insertMany(clinics);
    console.log(`🏥 ${createdClinics.length} clínicas creadas`);

    // Crear disponibilidad de profesionales
    const professionalAvailability = [
      {
        professionalId: createdUsers[0]._id, // Dr. Carlos Mendoza
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
        timeSlots: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'],
        workingHours: {
          start: '09:00',
          end: '18:00'
        },
        breakTime: {
          start: '12:00',
          end: '14:00'
        },
        isActive: true
      },
      {
        professionalId: createdUsers[1]._id, // Dra. María González
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
        timeSlots: ['08:00', '09:00', '10:00', '11:00', '15:00', '16:00', '17:00', '18:00'],
        workingHours: {
          start: '08:00',
          end: '19:00'
        },
        breakTime: {
          start: '12:00',
          end: '15:00'
        },
        isActive: true
      }
    ];

    const createdAvailability = await ProfessionalAvailability.insertMany(professionalAvailability);
    console.log(`📅 ${createdAvailability.length} disponibilidades creadas`);

    // Crear citas de ejemplo
    const appointments = [
      {
        clientId: createdUsers[2]._id, // Ana Martínez
        professionalId: createdUsers[0]._id, // Dr. Carlos Mendoza
        serviceId: createdServices[0]._id, // Consulta Psicológica
        clinicId: createdClinics[0]._id,
        date: '2024-09-20',
        time: '10:00',
        duration: 50,
        status: 'confirmed',
        notes: 'Primera consulta',
        price: 10000,
        paymentStatus: 'paid'
      },
      {
        clientId: createdUsers[3]._id, // Juan Pérez
        professionalId: createdUsers[1]._id, // Dra. María González
        serviceId: createdServices[1]._id, // Consulta Psiquiátrica
        clinicId: createdClinics[0]._id,
        date: '2024-09-21',
        time: '15:00',
        duration: 40,
        status: 'pending',
        notes: 'Seguimiento',
        price: 15000,
        paymentStatus: 'pending'
      }
    ];

    const createdAppointments = await Appointment.insertMany(appointments);
    console.log(`📋 ${createdAppointments.length} citas creadas`);

    // Crear notificaciones
    const notifications = [
      {
        type: 'appointment_confirmed',
        title: 'Cita Confirmada',
        message: 'Tu cita con Dr. Carlos Mendoza ha sido confirmada para el 20 de septiembre a las 10:00',
        recipientId: createdUsers[2]._id, // Ana Martínez
        senderId: createdUsers[0]._id, // Dr. Carlos Mendoza
        senderName: 'Dr. Carlos Mendoza',
        appointmentData: {
          service: 'Consulta Psicológica',
          date: '2024-09-20',
          time: '10:00',
          professional: 'Dr. Carlos Mendoza',
          professionalId: createdUsers[0]._id,
          depositAmount: 2000,
          totalAmount: 10000
        },
        isRead: false,
        priority: 'medium'
      },
      {
        type: 'appointment_request',
        title: 'Nueva Solicitud de Cita',
        message: 'Juan Pérez ha solicitado una cita para el 21 de septiembre a las 15:00',
        recipientId: createdUsers[1]._id, // Dra. María González
        senderId: createdUsers[3]._id, // Juan Pérez
        senderName: 'Juan Pérez',
        appointmentData: {
          service: 'Consulta Psiquiátrica',
          date: '2024-09-21',
          time: '15:00',
          professional: 'Dra. María González',
          professionalId: createdUsers[1]._id,
          depositAmount: 3000,
          totalAmount: 15000
        },
        isRead: false,
        priority: 'high'
      }
    ];

    const createdNotifications = await Notification.insertMany(notifications);
    console.log(`🔔 ${createdNotifications.length} notificaciones creadas`);

    // Crear reseñas
    const reviews = [
      {
        userId: createdUsers[2]._id, // Ana Martínez
        userName: 'Ana Martínez',
        userType: 'client',
        targetId: createdUsers[0]._id, // Dr. Carlos Mendoza
        targetType: 'professional',
        rating: 5,
        comment: 'Excelente profesional, muy atento y comprensivo. Recomiendo totalmente.',
        isVerified: true,
        helpfulCount: 3
      },
      {
        userId: createdUsers[3]._id, // Juan Pérez
        userName: 'Juan Pérez',
        userType: 'client',
        targetId: createdUsers[1]._id, // Dra. María González
        targetType: 'professional',
        rating: 4,
        comment: 'Muy buena atención, profesional y empática.',
        isVerified: true,
        helpfulCount: 1
      }
    ];

    const createdReviews = await Review.insertMany(reviews);
    console.log(`⭐ ${createdReviews.length} reseñas creadas`);

    console.log('✅ Datos de prueba insertados exitosamente!');
    console.log('\n📊 Resumen:');
    console.log(`👥 Usuarios: ${createdUsers.length}`);
    console.log(`🩺 Servicios: ${createdServices.length}`);
    console.log(`🏥 Clínicas: ${createdClinics.length}`);
    console.log(`📅 Disponibilidades: ${createdAvailability.length}`);
    console.log(`📋 Citas: ${createdAppointments.length}`);
    console.log(`🔔 Notificaciones: ${createdNotifications.length}`);
    console.log(`⭐ Reseñas: ${createdReviews.length}`);

    console.log('\n🔑 Credenciales de prueba:');
    console.log('👨‍⚕️ Profesional: carlos.mendoza@turnario.com / password123');
    console.log('👩‍⚕️ Profesional: maria.gonzalez@turnario.com / password123');
    console.log('👤 Cliente: ana.martinez@email.com / password123');
    console.log('👤 Cliente: juan.perez@email.com / password123');

  } catch (error) {
    console.error('❌ Error insertando datos:', error);
  } finally {
    mongoose.connection.close();
  }
};

// Ejecutar
connectDB().then(() => {
  seedData();
});
