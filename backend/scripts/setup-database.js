require('dotenv').config();
const mongoose = require('mongoose');
const logger = require('../config/logger');

// Importar todos los modelos
const User = require('../models/User');
const Service = require('../models/Service');
const Category = require('../models/Category');
const Clinic = require('../models/Clinic');
const Appointment = require('../models/Appointment');
const Booking = require('../models/Booking');
const Notification = require('../models/Notification');
const Payment = require('../models/Payment');
const Review = require('../models/Review');

class DatabaseSetup {
  constructor() {
    this.mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/turnario';
  }

  async connect() {
    try {
      console.log('🔄 Conectando a MongoDB...');
      console.log('📍 URI:', this.mongoUri);
      
      await mongoose.connect(this.mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });

      console.log('✅ Conectado a MongoDB exitosamente');
      return true;
    } catch (error) {
      console.error('❌ Error conectando a MongoDB:', error.message);
      return false;
    }
  }

  async createIndexes() {
    try {
      console.log('🔄 Creando índices de base de datos...');

      // Función auxiliar para crear índices de forma segura
      const createIndexSafely = async (collection, indexSpec, options = {}) => {
        try {
          await collection.createIndex(indexSpec, options);
          return true;
        } catch (error) {
          if (error.message.includes('already exists') || error.message.includes('duplicate key')) {
            console.log(`ℹ️ Índice ya existe: ${options.name || JSON.stringify(indexSpec)}`);
            return false;
          }
          throw error;
        }
      };

      // Índices para Users
      await createIndexSafely(User.collection, { email: 1 }, { unique: true, sparse: true, name: 'email_unique' });
      await createIndexSafely(User.collection, { phone: 1 }, { sparse: true, name: 'phone_sparse' });
      await createIndexSafely(User.collection, { userType: 1, isActive: 1 }, { name: 'userType_isActive' });
      await createIndexSafely(User.collection, { isDeleted: 1 }, { name: 'isDeleted' });
      await createIndexSafely(User.collection, { 'address.coordinates': '2dsphere' }, { name: 'address_2dsphere' });
      await createIndexSafely(User.collection, { createdAt: -1 }, { name: 'createdAt_desc' });
      console.log('✅ Índices de Users procesados');

      // Índices para Categories
      await createIndexSafely(Category.collection, { name: 1 }, { unique: true, name: 'category_name_unique' });
      await createIndexSafely(Category.collection, { isActive: 1 }, { name: 'category_isActive' });
      await createIndexSafely(Category.collection, { businessType: 1 }, { name: 'category_businessType' });
      console.log('✅ Índices de Categories procesados');

      // Índices para Services
      await createIndexSafely(Service.collection, { name: 1, clinicId: 1 }, { name: 'service_name_clinic' });
      await createIndexSafely(Service.collection, { category: 1, isActive: 1 }, { name: 'service_category_isActive' });
      await createIndexSafely(Service.collection, { professionalId: 1, isActive: 1 }, { name: 'service_professional_isActive' });
      await createIndexSafely(Service.collection, { clinicId: 1, isActive: 1 }, { name: 'service_clinic_isActive' });
      await createIndexSafely(Service.collection, { price: 1 }, { name: 'service_price' });
      console.log('✅ Índices de Services procesados');

      // Índices para Clinics
      await createIndexSafely(Clinic.collection, { name: 1 }, { name: 'clinic_name' });
      await createIndexSafely(Clinic.collection, { businessType: 1, isActive: 1 }, { name: 'clinic_businessType_isActive' });
      await createIndexSafely(Clinic.collection, { location: '2dsphere' }, { name: 'clinic_location_2dsphere' });
      await createIndexSafely(Clinic.collection, { address: 'text' }, { name: 'clinic_address_text' });
      await createIndexSafely(Clinic.collection, { isActive: 1 }, { name: 'clinic_isActive' });
      console.log('✅ Índices de Clinics procesados');

      // Índices para Appointments
      await createIndexSafely(Appointment.collection, { professionalId: 1, date: 1, status: 1 }, { name: 'appointment_professional_date_status' });
      await createIndexSafely(Appointment.collection, { clientId: 1, date: 1 }, { name: 'appointment_client_date' });
      await createIndexSafely(Appointment.collection, { status: 1, date: 1 }, { name: 'appointment_status_date' });
      await createIndexSafely(Appointment.collection, { serviceId: 1, date: 1 }, { name: 'appointment_service_date' });
      await createIndexSafely(Appointment.collection, { clinicId: 1, date: 1 }, { name: 'appointment_clinic_date' });
      await createIndexSafely(Appointment.collection, { createdAt: -1 }, { name: 'appointment_createdAt_desc' });
      console.log('✅ Índices de Appointments procesados');

      // Índices para Bookings
      await createIndexSafely(Booking.collection, { appointmentId: 1 }, { unique: true, name: 'booking_appointment_unique' });
      await createIndexSafely(Booking.collection, { clientId: 1, status: 1 }, { name: 'booking_client_status' });
      await createIndexSafely(Booking.collection, { professionalId: 1, status: 1 }, { name: 'booking_professional_status' });
      await createIndexSafely(Booking.collection, { status: 1, createdAt: 1 }, { name: 'booking_status_createdAt' });
      await createIndexSafely(Booking.collection, { createdAt: -1 }, { name: 'booking_createdAt_desc' });
      console.log('✅ Índices de Bookings procesados');

      // Índices para Notifications
      await createIndexSafely(Notification.collection, { recipientId: 1, isRead: 1, createdAt: -1 }, { name: 'notification_recipient_isRead_createdAt' });
      await createIndexSafely(Notification.collection, { type: 1, createdAt: 1 }, { name: 'notification_type_createdAt' });
      await createIndexSafely(Notification.collection, { createdAt: 1 }, { expireAfterSeconds: 7776000, name: 'notification_ttl' }); // 90 días TTL
      console.log('✅ Índices de Notifications procesados');

      // Índices para Payments
      await createIndexSafely(Payment.collection, { appointmentId: 1 }, { unique: true, sparse: true, name: 'payment_appointment_unique' });
      await createIndexSafely(Payment.collection, { clientId: 1, status: 1 }, { name: 'payment_client_status' });
      await createIndexSafely(Payment.collection, { status: 1, createdAt: 1 }, { name: 'payment_status_createdAt' });
      await createIndexSafely(Payment.collection, { paymentMethod: 1 }, { name: 'payment_method' });
      await createIndexSafely(Payment.collection, { createdAt: -1 }, { name: 'payment_createdAt_desc' });
      console.log('✅ Índices de Payments procesados');

      // Índices para Reviews
      await createIndexSafely(Review.collection, { appointmentId: 1 }, { unique: true, name: 'review_appointment_unique' });
      await createIndexSafely(Review.collection, { professionalId: 1, rating: 1 }, { name: 'review_professional_rating' });
      await createIndexSafely(Review.collection, { clientId: 1, createdAt: 1 }, { name: 'review_client_createdAt' });
      await createIndexSafely(Review.collection, { rating: 1, createdAt: 1 }, { name: 'review_rating_createdAt' });
      await createIndexSafely(Review.collection, { createdAt: -1 }, { name: 'review_createdAt_desc' });
      console.log('✅ Índices de Reviews procesados');

      console.log('✅ Todos los índices creados exitosamente');
    } catch (error) {
      console.error('❌ Error creando índices:', error.message);
      throw error;
    }
  }

  async seedCategories() {
    try {
      console.log('🌱 Poblando categorías...');
      
      const categories = [
        {
          name: 'Psicología',
          description: 'Servicios de salud mental y bienestar psicológico',
          slug: 'psicologia',
          icon: 'psychology',
          color: '#4CAF50',
          status: 'active',
          order: 1
        },
        {
          name: 'Medicina General',
          description: 'Consultas médicas generales y atención primaria',
          slug: 'medicina-general',
          icon: 'medical',
          color: '#2196F3',
          status: 'active',
          order: 2
        },
        {
          name: 'Odontología',
          description: 'Servicios dentales y de salud bucal',
          slug: 'odontologia',
          icon: 'dental',
          color: '#FF9800',
          status: 'active',
          order: 3
        },
        {
          name: 'Fisioterapia',
          description: 'Terapias físicas y rehabilitación',
          slug: 'fisioterapia',
          icon: 'fitness',
          color: '#9C27B0',
          status: 'active',
          order: 4
        },
        {
          name: 'Nutrición',
          description: 'Consultas nutricionales y planes alimentarios',
          slug: 'nutricion',
          icon: 'restaurant',
          color: '#795548',
          status: 'active',
          order: 5
        },
        {
          name: 'Dermatología',
          description: 'Tratamientos de la piel y estética',
          slug: 'dermatologia',
          icon: 'face',
          color: '#E91E63',
          status: 'active',
          order: 6
        },
        {
          name: 'Ginecología',
          description: 'Salud femenina y obstetricia',
          slug: 'ginecologia',
          icon: 'pregnant_woman',
          color: '#FF5722',
          status: 'active',
          order: 7
        },
        {
          name: 'Pediatría',
          description: 'Atención médica infantil',
          slug: 'pediatria',
          icon: 'child_care',
          color: '#00BCD4',
          status: 'active',
          order: 8
        }
      ];

      for (const categoryData of categories) {
        const existingCategory = await Category.findOne({ name: categoryData.name });
        if (!existingCategory) {
          await Category.create(categoryData);
          console.log(`✅ Categoría creada: ${categoryData.name}`);
        } else {
          console.log(`ℹ️ Categoría ya existe: ${categoryData.name}`);
        }
      }

      console.log('✅ Categorías pobladas exitosamente');
    } catch (error) {
      console.error('❌ Error poblando categorías:', error.message);
    }
  }

  async seedUsers() {
    try {
      console.log('🌱 Poblando usuarios...');
      
      const users = [
        {
          fullName: 'Dr. Carlos Mendoza',
          email: 'carlos.mendoza@turnario.com',
          password: 'password123',
          userType: 'professional',
          phone: '+54911234567',
          isEmailVerified: true,
          isActive: true,
          professional: {
            license: 'MP-12345',
            specialties: ['Psicología', 'Terapia Cognitivo-Conductual'],
            experience: {
              years: 8,
              description: 'Especialista en salud mental con más de 8 años de experiencia'
            },
            education: [
              {
                degree: 'Licenciado en Psicología',
                institution: 'Universidad de Buenos Aires',
                year: 2015,
                description: 'Psicología Clínica'
              }
            ],
            availability: {
              workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
              workingHours: {
                start: '09:00',
                end: '18:00'
              },
              breakTime: {
                start: '12:00',
                end: '13:00'
              }
            }
          }
        },
        {
          fullName: 'Dra. María González',
          email: 'maria.gonzalez@turnario.com',
          password: 'password123',
          userType: 'professional',
          phone: '+54911234568',
          isEmailVerified: true,
          isActive: true,
          professional: {
            license: 'MP-12346',
            specialties: ['Medicina General', 'Medicina Familiar'],
            experience: {
              years: 12,
              description: 'Médica general con amplia experiencia en atención primaria'
            },
            availability: {
              workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
              workingHours: {
                start: '08:00',
                end: '17:00'
              },
              breakTime: {
                start: '12:00',
                end: '13:00'
              }
            }
          }
        },
        {
          fullName: 'Ana Martínez',
          email: 'ana.martinez@example.com',
          password: 'password123',
          userType: 'client',
          phone: '+54911234569',
          isEmailVerified: true,
          isActive: true,
          client: {
            emergencyContact: {
              name: 'Juan Martínez',
              phone: '+54911234570',
              relationship: 'Padre'
            },
            medicalInfo: {
              allergies: ['Penicilina'],
              medications: [],
              conditions: [],
              bloodType: 'O+'
            }
          }
        },
        {
          fullName: 'Luis Rodríguez',
          email: 'luis.rodriguez@example.com',
          password: 'password123',
          userType: 'client',
          phone: '+54911234571',
          isEmailVerified: true,
          isActive: true,
          client: {
            emergencyContact: {
              name: 'María Rodríguez',
              phone: '+54911234572',
              relationship: 'Esposa'
            },
            medicalInfo: {
              allergies: [],
              medications: ['Ibuprofeno'],
              conditions: ['Hipertensión'],
              bloodType: 'A+'
            }
          }
        },
        {
          fullName: 'Admin Turnario',
          email: 'admin@turnario.com',
          password: 'admin123',
          userType: 'admin',
          phone: '+54911234573',
          isEmailVerified: true,
          isActive: true,
          permissions: [
            'manage_users',
            'manage_services',
            'manage_clinics',
            'access_analytics',
            'access_all_resources'
          ]
        }
      ];

      for (const userData of users) {
        const existingUser = await User.findOne({ email: userData.email });
        if (!existingUser) {
          await User.create(userData);
          console.log(`✅ Usuario creado: ${userData.fullName} (${userData.userType})`);
        } else {
          console.log(`ℹ️ Usuario ya existe: ${userData.fullName}`);
        }
      }

      console.log('✅ Usuarios poblados exitosamente');
    } catch (error) {
      console.error('❌ Error poblando usuarios:', error.message);
    }
  }

  async seedClinics() {
    try {
      console.log('🌱 Poblando clínicas...');
      
      // Obtener un usuario profesional para ser el propietario
      const professional = await User.findOne({ userType: 'professional', isActive: true });
      if (!professional) {
        console.log('⚠️ No hay profesionales disponibles para crear clínicas');
        return;
      }

      const clinics = [
        {
          name: 'Centro Médico Turnario',
          description: 'Centro médico integral con múltiples especialidades',
          businessType: 'medical',
          category: 'general_medicine',
          contact: {
            email: 'info@centromedicoturnario.com',
            phone: '+54911234567',
            website: 'https://centromedicoturnario.com'
          },
          location: {
            type: 'Point',
            coordinates: [-58.3816, -34.6037],
            address: {
              street: 'Av. Corrientes 1234',
              city: 'Buenos Aires',
              state: 'Buenos Aires',
              country: 'Argentina',
              postalCode: '1043'
            }
          },
          owner: professional._id,
          createdBy: professional._id,
          status: 'active',
          isVerified: true,
          rating: {
            average: 4.8,
            count: 156
          }
        },
        {
          name: 'Clínica Psicológica Buenos Aires',
          description: 'Especialistas en salud mental y bienestar psicológico',
          businessType: 'medical',
          category: 'psychology',
          contact: {
            email: 'info@clinicapsicologica.com',
            phone: '+54911234568',
            website: 'https://clinicapsicologica.com'
          },
          location: {
            type: 'Point',
            coordinates: [-58.3750, -34.6080],
            address: {
              street: 'Calle Florida 567',
              city: 'Buenos Aires',
              state: 'Buenos Aires',
              country: 'Argentina',
              postalCode: '1005'
            }
          },
          owner: professional._id,
          createdBy: professional._id,
          status: 'active',
          isVerified: true,
          rating: {
            average: 4.9,
            count: 89
          }
        }
      ];

      for (const clinicData of clinics) {
        const existingClinic = await Clinic.findOne({ name: clinicData.name });
        if (!existingClinic) {
          await Clinic.create(clinicData);
          console.log(`✅ Clínica creada: ${clinicData.name}`);
        } else {
          console.log(`ℹ️ Clínica ya existe: ${clinicData.name}`);
        }
      }

      console.log('✅ Clínicas pobladas exitosamente');
    } catch (error) {
      console.error('❌ Error poblando clínicas:', error.message);
    }
  }

  async seedServices() {
    try {
      console.log('🌱 Poblando servicios...');
      
      // Obtener categorías y profesionales
      const categories = await Category.find({ status: 'active' });
      const professionals = await User.find({ userType: 'professional', isActive: true });
      const clinics = await Clinic.find({ status: 'active' });

      if (categories.length === 0 || professionals.length === 0) {
        console.log('⚠️ No hay categorías o profesionales para crear servicios');
        return;
      }

      const services = [
        {
          name: 'Consulta Psicológica Individual',
          description: 'Sesión individual de psicoterapia con enfoque cognitivo-conductual',
          duration: 60,
          price: 8000,
          category: categories.find(c => c.name === 'Psicología')?._id,
          professionalId: professionals.find(p => p.fullName.includes('Carlos'))?._id,
          clinicId: clinics[0]?._id,
          isActive: true,
          features: ['online', 'presencial'],
          maxBookingsPerDay: 8
        },
        {
          name: 'Consulta Médica General',
          description: 'Consulta médica general para adultos',
          duration: 30,
          price: 5000,
          category: categories.find(c => c.name === 'Medicina General')?._id,
          professionalId: professionals.find(p => p.fullName.includes('María'))?._id,
          clinicId: clinics[0]?._id,
          isActive: true,
          features: ['online', 'presencial'],
          maxBookingsPerDay: 12
        },
        {
          name: 'Terapia de Pareja',
          description: 'Sesión de terapia para parejas',
          duration: 90,
          price: 12000,
          category: categories.find(c => c.name === 'Psicología')?._id,
          professionalId: professionals.find(p => p.fullName.includes('Carlos'))?._id,
          clinicId: clinics[1]?._id,
          isActive: true,
          features: ['presencial'],
          maxBookingsPerDay: 4
        }
      ];

      for (const serviceData of services) {
        if (serviceData.category && serviceData.professionalId) {
          const existingService = await Service.findOne({ 
            name: serviceData.name, 
            professionalId: serviceData.professionalId 
          });
          
          if (!existingService) {
            await Service.create(serviceData);
            console.log(`✅ Servicio creado: ${serviceData.name}`);
          } else {
            console.log(`ℹ️ Servicio ya existe: ${serviceData.name}`);
          }
        }
      }

      console.log('✅ Servicios poblados exitosamente');
    } catch (error) {
      console.error('❌ Error poblando servicios:', error.message);
    }
  }

  async run() {
    try {
      console.log('🚀 Iniciando configuración de base de datos...');
      
      // Conectar a MongoDB
      const connected = await this.connect();
      if (!connected) {
        console.error('❌ No se pudo conectar a MongoDB');
        process.exit(1);
      }

      // Crear índices
      await this.createIndexes();

      // Poblar datos
      await this.seedCategories();
      await this.seedUsers();
      await this.seedClinics();
      await this.seedServices();

      console.log('🎉 Configuración de base de datos completada exitosamente');
      console.log('📊 Resumen:');
      console.log(`   - Categorías: ${await Category.countDocuments()}`);
      console.log(`   - Usuarios: ${await User.countDocuments()}`);
      console.log(`   - Clínicas: ${await Clinic.countDocuments()}`);
      console.log(`   - Servicios: ${await Service.countDocuments()}`);

    } catch (error) {
      console.error('❌ Error en la configuración:', error.message);
      process.exit(1);
    } finally {
      await mongoose.disconnect();
      console.log('✅ Conexión cerrada');
    }
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  const setup = new DatabaseSetup();
  setup.run();
}

module.exports = DatabaseSetup;
