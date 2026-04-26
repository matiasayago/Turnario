const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Turnario API',
      version: '1.0.0',
      description: 'API completa para el sistema de gestión de turnos multirubro Turnario',
      contact: {
        name: 'Soporte Turnario',
        email: 'soporte@turnario.com',
        url: 'https://turnario.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Servidor de desarrollo'
      },
      {
        url: 'https://api.turnario.com',
        description: 'Servidor de producción'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Token JWT para autenticación'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string', description: 'ID único del usuario' },
            email: { type: 'string', format: 'email', description: 'Email del usuario' },
            fullName: { type: 'string', description: 'Nombre completo' },
            phone: { type: 'string', description: 'Número de teléfono' },
            userType: { 
              type: 'string', 
              enum: ['client', 'professional', 'admin'],
              description: 'Tipo de usuario'
            },
            isActive: { type: 'boolean', description: 'Estado activo del usuario' },
            isEmailVerified: { type: 'boolean', description: 'Email verificado' },
            isPhoneVerified: { type: 'boolean', description: 'Teléfono verificado' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Appointment: {
          type: 'object',
          properties: {
            _id: { type: 'string', description: 'ID único de la cita' },
            clientId: { type: 'string', description: 'ID del cliente' },
            professionalId: { type: 'string', description: 'ID del profesional' },
            serviceId: { type: 'string', description: 'ID del servicio' },
            clinicId: { type: 'string', description: 'ID de la clínica' },
            date: { type: 'string', format: 'date', description: 'Fecha de la cita' },
            time: { type: 'string', description: 'Hora de la cita' },
            duration: { type: 'number', description: 'Duración en minutos' },
            status: { 
              type: 'string', 
              enum: ['pending', 'confirmed', 'completed', 'cancelled'],
              description: 'Estado de la cita'
            },
            notes: { type: 'string', description: 'Notas adicionales' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Service: {
          type: 'object',
          properties: {
            _id: { type: 'string', description: 'ID único del servicio' },
            name: { type: 'string', description: 'Nombre del servicio' },
            description: { type: 'string', description: 'Descripción del servicio' },
            price: { type: 'number', description: 'Precio del servicio' },
            duration: { type: 'number', description: 'Duración en minutos' },
            category: { type: 'string', description: 'Categoría del servicio' },
            isActive: { type: 'boolean', description: 'Estado activo del servicio' },
            clinicId: { type: 'string', description: 'ID de la clínica' },
            professionalId: { type: 'string', description: 'ID del profesional' }
          }
        },
        Clinic: {
          type: 'object',
          properties: {
            _id: { type: 'string', description: 'ID único de la clínica' },
            name: { type: 'string', description: 'Nombre de la clínica' },
            description: { type: 'string', description: 'Descripción de la clínica' },
            businessType: { type: 'string', description: 'Tipo de negocio' },
            address: {
              type: 'object',
              properties: {
                street: { type: 'string' },
                city: { type: 'string' },
                state: { type: 'string' },
                country: { type: 'string' },
                postalCode: { type: 'string' },
                coordinates: {
                  type: 'object',
                  properties: {
                    type: { type: 'string', enum: ['Point'] },
                    coordinates: { type: 'array', items: { type: 'number' } }
                  }
                }
              }
            },
            isActive: { type: 'boolean', description: 'Estado activo de la clínica' }
          }
        },
        Payment: {
          type: 'object',
          properties: {
            _id: { type: 'string', description: 'ID único del pago' },
            appointmentId: { type: 'string', description: 'ID de la cita' },
            amount: { type: 'number', description: 'Monto del pago' },
            currency: { type: 'string', default: 'ARS', description: 'Moneda' },
            status: { 
              type: 'string', 
              enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
              description: 'Estado del pago'
            },
            paymentMethod: { type: 'string', description: 'Método de pago' },
            transactionId: { type: 'string', description: 'ID de transacción externo' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        MedicalHistory: {
          type: 'object',
          properties: {
            _id: { type: 'string', description: 'ID único del historial' },
            patientId: { type: 'string', description: 'ID del paciente' },
            professionalId: { type: 'string', description: 'ID del profesional' },
            type: { 
              type: 'string', 
              enum: ['consultation', 'document', 'prescription', 'treatment'],
              description: 'Tipo de entrada'
            },
            title: { type: 'string', description: 'Título de la entrada' },
            description: { type: 'string', description: 'Descripción detallada' },
            date: { type: 'string', format: 'date', description: 'Fecha de la entrada' },
            attachments: { 
              type: 'array', 
              items: { type: 'string' },
              description: 'Archivos adjuntos'
            }
          }
        },
        MedicalAuthorization: {
          type: 'object',
          properties: {
            _id: { type: 'string', description: 'ID único de la autorización' },
            patientId: { type: 'string', description: 'ID del paciente' },
            professionalId: { type: 'string', description: 'ID del profesional' },
            authorizationType: { 
              type: 'string', 
              enum: ['full_access', 'limited_access', 'consultation_only'],
              description: 'Tipo de autorización'
            },
            status: { 
              type: 'string', 
              enum: ['pending', 'granted', 'revoked'],
              description: 'Estado de la autorización'
            },
            scope: {
              type: 'object',
              properties: {
                consultations: { type: 'boolean' },
                documents: { type: 'boolean' },
                prescriptions: { type: 'boolean' },
                treatments: { type: 'boolean' }
              }
            },
            expiresAt: { type: 'string', format: 'date-time' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        Review: {
          type: 'object',
          properties: {
            _id: { type: 'string', description: 'ID único de la reseña' },
            clientId: { type: 'string', description: 'ID del cliente' },
            professionalId: { type: 'string', description: 'ID del profesional' },
            serviceId: { type: 'string', description: 'ID del servicio' },
            rating: { type: 'number', minimum: 1, maximum: 5, description: 'Calificación' },
            comment: { type: 'string', description: 'Comentario de la reseña' },
            isVerified: { type: 'boolean', description: 'Reseña verificada' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        ChatMessage: {
          type: 'object',
          properties: {
            _id: { type: 'string', description: 'ID único del mensaje' },
            conversationId: { type: 'string', description: 'ID de la conversación' },
            senderId: { type: 'string', description: 'ID del remitente' },
            content: { type: 'string', description: 'Contenido del mensaje' },
            messageType: { 
              type: 'string', 
              enum: ['text', 'image', 'file', 'location', 'contact'],
              description: 'Tipo de mensaje'
            },
            attachments: { 
              type: 'array', 
              items: { type: 'string' },
              description: 'Archivos adjuntos'
            },
            isRead: { type: 'boolean', description: 'Mensaje leído' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string', description: 'Tipo de error' },
            message: { type: 'string', description: 'Mensaje de error' },
            timestamp: { type: 'string', format: 'date-time' },
            requestId: { type: 'string', description: 'ID de la solicitud' },
            path: { type: 'string', description: 'Ruta de la solicitud' },
            method: { type: 'string', description: 'Método HTTP' }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ],
    tags: [
      {
        name: 'Autenticación',
        description: 'Endpoints para autenticación y autorización'
      },
      {
        name: 'Usuarios',
        description: 'Gestión de usuarios del sistema'
      },
      {
        name: 'Citas',
        description: 'Gestión de citas y reservas'
      },
      {
        name: 'Servicios',
        description: 'Gestión de servicios ofrecidos'
      },
      {
        name: 'Clínicas',
        description: 'Gestión de clínicas y establecimientos'
      },
      {
        name: 'Pagos',
        description: 'Procesamiento de pagos y transacciones'
      },
      {
        name: 'Historial Médico',
        description: 'Gestión de historial médico y registros'
      },
      {
        name: 'Autorizaciones Médicas',
        description: 'Sistema de autorizaciones para acceso médico'
      },
      {
        name: 'Chat',
        description: 'Sistema de mensajería en tiempo real'
      },
      {
        name: 'Reseñas',
        description: 'Sistema de calificaciones y reseñas'
      },
      {
        name: 'Archivos',
        description: 'Gestión de archivos y uploads'
      }
    ]
  },
  apis: [
    './routes/*.js',
    './models/*.js',
    './middleware/*.js'
  ]
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
